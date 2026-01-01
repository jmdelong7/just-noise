import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { BrownNoiseGenerator } from '../utils/brownNoise';

const SAMPLE_RATE = 44100;
const WEB_BUFFER_SIZE = 4096;
// Native: 2 second buffers
const NATIVE_BUFFER_DURATION = 2;
const NATIVE_BUFFER_SIZE = SAMPLE_RATE * NATIVE_BUFFER_DURATION;
// Minimum number of buffers to keep queued (6 seconds total)
const MIN_QUEUED_BUFFERS = 3;
// Fade in duration in seconds
const FADE_IN_DURATION = 3;

export function useBrownNoise() {
  const [isPlaying, setIsPlaying] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const audioContextRef = useRef<any>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const generatorRef = useRef<BrownNoiseGenerator | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const queueSourceRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const gainNodeRef = useRef<any>(null);
  const queuedBufferCountRef = useRef<number>(0);
  const isRunningRef = useRef<boolean>(false);
  const wasPlayingBeforeInterruptionRef = useRef<boolean>(false);
  // Track playing state for interruption callback (can't use state in callback)
  const isPlayingRef = useRef<boolean>(false);
  // Ref to access stopInternal from the interruption callback without re-subscribing
  const stopInternalRef = useRef<(() => void) | null>(null);

  const playWeb = useCallback(() => {
    const WebAudioContext = window.AudioContext || (window as any).webkitAudioContext;
    const ctx = new WebAudioContext();
    audioContextRef.current = ctx;
    generatorRef.current = new BrownNoiseGenerator();

    // Create gain node for fade in
    const gainNode = ctx.createGain();
    gainNodeRef.current = gainNode;
    gainNode.gain.setValueAtTime(0, ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(1, ctx.currentTime + FADE_IN_DURATION);
    gainNode.connect(ctx.destination);

    const processor = ctx.createScriptProcessor(WEB_BUFFER_SIZE, 1, 1);
    processorRef.current = processor;

    processor.onaudioprocess = (event) => {
      const output = event.outputBuffer.getChannelData(0);
      const generator = generatorRef.current;
      if (generator) {
        generator.fillBuffer(output);
      }
    };

    processor.connect(gainNode);
  }, []);

  const enqueueBuffer = useCallback(() => {
    const ctx = audioContextRef.current;
    const queueSource = queueSourceRef.current;
    const generator = generatorRef.current;

    if (!ctx || !queueSource || !generator || !isRunningRef.current) return;

    const buffer = ctx.createBuffer(1, NATIVE_BUFFER_SIZE, SAMPLE_RATE);
    const channelData = buffer.getChannelData(0);
    generator.fillBuffer(channelData);

    queueSource.enqueueBuffer(buffer);
    queuedBufferCountRef.current++;
  }, []);

  const stopInternal = useCallback(() => {
    isRunningRef.current = false;
    isPlayingRef.current = false;

    if (queueSourceRef.current) {
      queueSourceRef.current.stop();
      queueSourceRef.current = null;
    }

    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }

    if (gainNodeRef.current) {
      gainNodeRef.current.disconnect();
      gainNodeRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    if (generatorRef.current) {
      generatorRef.current.reset();
      generatorRef.current = null;
    }

    // Abandon audio focus when we stop (Android only)
    if (Platform.OS !== 'web') {
      const { AudioManager } = require('react-native-audio-api');
      AudioManager.observeAudioInterruptions(false);
    }

    queuedBufferCountRef.current = 0;
    setIsPlaying(false);
  }, []);

  // Keep ref updated so interruption callback can access latest stopInternal
  stopInternalRef.current = stopInternal;

  const playNative = useCallback(() => {
    const { AudioContext, AudioManager } = require('react-native-audio-api');

    // Request audio focus each time we start playing
    AudioManager.observeAudioInterruptions(true);

    const ctx = new AudioContext();
    audioContextRef.current = ctx;
    generatorRef.current = new BrownNoiseGenerator();
    isRunningRef.current = true;
    queuedBufferCountRef.current = 0;

    // Create gain node for fade in
    const gainNode = ctx.createGain();
    gainNodeRef.current = gainNode;
    gainNode.gain.setValueAtTime(0, ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(1, ctx.currentTime + FADE_IN_DURATION);
    gainNode.connect(ctx.destination);

    // Create queue source node for gapless playback
    const queueSource = ctx.createBufferQueueSource();
    queueSourceRef.current = queueSource;
    queueSource.connect(gainNode);

    // Replenish buffers when one completes
    queueSource.onEnded = () => {
      queuedBufferCountRef.current--;
      // Keep the queue filled
      while (isRunningRef.current && queuedBufferCountRef.current < MIN_QUEUED_BUFFERS) {
        enqueueBuffer();
      }
    };

    // Pre-fill the queue with initial buffers
    for (let i = 0; i < MIN_QUEUED_BUFFERS; i++) {
      enqueueBuffer();
    }

    // Start playback
    queueSource.start();
  }, [enqueueBuffer]);

  // Set up audio interruption listener for Android (runs once on mount)
  useEffect(() => {
    if (Platform.OS === 'web') return;

    const { AudioManager } = require('react-native-audio-api');

    // Listen for audio interruptions (other apps playing audio, phone calls, etc.)
    // Note: Audio focus is requested/abandoned in playNative/stopInternal
    const subscription = AudioManager.addSystemEventListener(
      'interruption',
      (event: { type: 'began' | 'ended'; shouldResume: boolean }) => {
        console.log('[AudioInterruption]', event.type, 'shouldResume:', event.shouldResume, 'isPlaying:', isPlayingRef.current);

        if (event.type === 'began') {
          // Another app started playing audio - stop our playback
          if (isPlayingRef.current) {
            wasPlayingBeforeInterruptionRef.current = true;
            stopInternalRef.current?.();
          }
        } else if (event.type === 'ended' && event.shouldResume) {
          // Interruption ended and system says we should resume
          // Note: We don't auto-resume for this app - user can tap play again
        }
      }
    );

    return () => {
      subscription?.remove();
    };
  }, []);

  const play = useCallback(() => {
    if (isPlayingRef.current) return;

    if (Platform.OS === 'web') {
      playWeb();
    } else {
      playNative();
    }

    isPlayingRef.current = true;
    setIsPlaying(true);
  }, [playWeb, playNative]);

  const stop = useCallback(() => {
    stopInternal();
  }, [stopInternal]);

  const toggle = useCallback(() => {
    if (isPlaying) {
      stop();
    } else {
      play();
    }
  }, [isPlaying, play, stop]);

  return {
    isPlaying,
    play,
    stop,
    toggle,
  };
}

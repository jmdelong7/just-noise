import { useCallback, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { BrownNoiseGenerator } from '../utils/brownNoise';

const SAMPLE_RATE = 44100;
const WEB_BUFFER_SIZE = 4096;
// Native: 2 second buffers
const NATIVE_BUFFER_DURATION = 2;
const NATIVE_BUFFER_SIZE = SAMPLE_RATE * NATIVE_BUFFER_DURATION;
// Minimum number of buffers to keep queued (6 seconds total)
const MIN_QUEUED_BUFFERS = 3;

export function useBrownNoise() {
  const [isPlaying, setIsPlaying] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const audioContextRef = useRef<any>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const generatorRef = useRef<BrownNoiseGenerator | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const queueSourceRef = useRef<any>(null);
  const queuedBufferCountRef = useRef<number>(0);
  const isRunningRef = useRef<boolean>(false);

  const playWeb = useCallback(() => {
    const WebAudioContext = window.AudioContext || (window as any).webkitAudioContext;
    const ctx = new WebAudioContext();
    audioContextRef.current = ctx;
    generatorRef.current = new BrownNoiseGenerator();

    const processor = ctx.createScriptProcessor(WEB_BUFFER_SIZE, 1, 1);
    processorRef.current = processor;

    processor.onaudioprocess = (event) => {
      const output = event.outputBuffer.getChannelData(0);
      const generator = generatorRef.current;
      if (generator) {
        generator.fillBuffer(output);
      }
    };

    processor.connect(ctx.destination);
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

  const playNative = useCallback(() => {
    const { AudioContext } = require('react-native-audio-api');
    const ctx = new AudioContext();
    audioContextRef.current = ctx;
    generatorRef.current = new BrownNoiseGenerator();
    isRunningRef.current = true;
    queuedBufferCountRef.current = 0;

    // Create queue source node for gapless playback
    const queueSource = ctx.createBufferQueueSource();
    queueSourceRef.current = queueSource;
    queueSource.connect(ctx.destination);

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

  const play = useCallback(() => {
    if (isPlaying) return;

    if (Platform.OS === 'web') {
      playWeb();
    } else {
      playNative();
    }

    setIsPlaying(true);
  }, [isPlaying, playWeb, playNative]);

  const stop = useCallback(() => {
    isRunningRef.current = false;

    if (queueSourceRef.current) {
      queueSourceRef.current.stop();
      queueSourceRef.current = null;
    }

    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    if (generatorRef.current) {
      generatorRef.current.reset();
      generatorRef.current = null;
    }

    queuedBufferCountRef.current = 0;
    setIsPlaying(false);
  }, []);

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

import { useCallback, useRef, useState } from 'react';
import { AudioContext } from 'react-native-audio-api';
import { BrownNoiseGenerator } from '../utils/brownNoise';

const SAMPLE_RATE = 44100;
const BUFFER_SIZE = 4096;

export function useBrownNoise() {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const generatorRef = useRef<BrownNoiseGenerator | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const isSchedulingRef = useRef(false);

  const scheduleBuffer = useCallback(() => {
    const ctx = audioContextRef.current;
    const generator = generatorRef.current;

    if (!ctx || !generator || !isSchedulingRef.current) return;

    // Create a buffer with brown noise
    const buffer = ctx.createBuffer(1, BUFFER_SIZE, SAMPLE_RATE);
    const channelData = buffer.getChannelData(0);
    generator.fillBuffer(channelData);

    // Create source and connect to output
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);

    // Schedule playback
    source.start(ctx.currentTime);

    // Schedule next buffer before this one ends
    const bufferDuration = BUFFER_SIZE / SAMPLE_RATE;
    setTimeout(() => {
      if (isSchedulingRef.current) {
        scheduleBuffer();
      }
    }, bufferDuration * 900); // Schedule slightly before buffer ends
  }, []);

  const play = useCallback(() => {
    if (isPlaying) return;

    // Create audio context
    const ctx = new AudioContext();
    audioContextRef.current = ctx;
    generatorRef.current = new BrownNoiseGenerator();
    isSchedulingRef.current = true;

    // Start scheduling buffers
    scheduleBuffer();
    setIsPlaying(true);
  }, [isPlaying, scheduleBuffer]);

  const stop = useCallback(() => {
    isSchedulingRef.current = false;

    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    if (generatorRef.current) {
      generatorRef.current.reset();
    }

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

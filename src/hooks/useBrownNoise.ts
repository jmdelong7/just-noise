import { useCallback, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { BrownNoiseGenerator } from '../utils/brownNoise';

const BUFFER_SIZE = 4096;

// Use native AudioContext on web, react-native-audio-api on native
const getAudioContext = (): AudioContext => {
  if (Platform.OS === 'web') {
    const WebAudioContext = window.AudioContext || (window as any).webkitAudioContext;
    return new WebAudioContext();
  } else {
    const { AudioContext } = require('react-native-audio-api');
    return new AudioContext();
  }
};

export function useBrownNoise() {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const generatorRef = useRef<BrownNoiseGenerator | null>(null);

  const play = useCallback(() => {
    if (isPlaying) return;

    // Create audio context and generator
    const ctx = getAudioContext();
    audioContextRef.current = ctx;
    generatorRef.current = new BrownNoiseGenerator();

    // Create a ScriptProcessorNode for continuous audio generation
    // This avoids clicking by providing seamless audio processing
    const processor = ctx.createScriptProcessor(BUFFER_SIZE, 1, 1);
    processorRef.current = processor;

    processor.onaudioprocess = (event) => {
      const output = event.outputBuffer.getChannelData(0);
      const generator = generatorRef.current;

      if (generator) {
        generator.fillBuffer(output);
      }
    };

    // Connect processor to output
    processor.connect(ctx.destination);

    setIsPlaying(true);
  }, [isPlaying]);

  const stop = useCallback(() => {
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

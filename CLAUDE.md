# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Just Noise is a React Native/Expo app that plays continuous brown noise. It supports Android and web platforms.

## Development Commands

```bash
npm start         # Start Expo dev server
npm run android   # Run on Android emulator
npm run web       # Run in web browser
```

### Building with EAS

```bash
eas build --profile development --platform android  # Development build with dev client
eas build --profile preview --platform android      # Internal distribution build
eas build --profile production --platform android   # Production build (auto-increments version)
```

## Architecture

### Audio Generation

The app generates brown noise using Brownian motion algorithm in `src/utils/brownNoise.ts`. The `BrownNoiseGenerator` class produces samples by integrating white noise with leaky integration to prevent DC offset.

### Platform-Specific Audio Playback

The `useBrownNoise` hook in `src/hooks/useBrownNoise.ts` handles audio playback differently by platform:

- **Web**: Uses Web Audio API's `ScriptProcessorNode` with small buffers (4096 samples)
- **Android**: Uses `react-native-audio-api` with `AudioBufferQueueSourceNode` for gapless playback. Pre-fills a queue with 3 buffers (2 seconds each) and replenishes via `onEnded` callback.

Both platforms implement a 3-second fade-in via `GainNode`.

### Android Audio Focus

On Android, the app uses `AudioManager` from `react-native-audio-api` to:
- Request audio focus when starting playback
- Listen for audio interruptions (other apps, phone calls)
- Abandon focus when stopping

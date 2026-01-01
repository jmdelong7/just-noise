import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

interface PlayButtonProps {
  isPlaying: boolean;
  onPress: () => void;
}

export function PlayButton({ isPlaying, onPress }: PlayButtonProps) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.button,
        pressed && styles.buttonPressed,
      ]}
      onPress={onPress}
    >
      <View style={styles.iconContainer}>
        {isPlaying ? (
          // Pause icon (two vertical bars)
          <View style={styles.pauseIcon}>
            <View style={styles.pauseBar} />
            <View style={styles.pauseBar} />
          </View>
        ) : (
          // Play icon (triangle)
          <View style={styles.playIcon} />
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  buttonPressed: {
    transform: [{ scale: 0.95 }],
    opacity: 0.9,
  },
  iconContainer: {
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playIcon: {
    width: 0,
    height: 0,
    borderLeftWidth: 35,
    borderTopWidth: 22,
    borderBottomWidth: 22,
    borderLeftColor: '#FFFFFF',
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    marginLeft: 8,
  },
  pauseIcon: {
    flexDirection: 'row',
    gap: 10,
  },
  pauseBar: {
    width: 12,
    height: 40,
    backgroundColor: '#FFFFFF',
    borderRadius: 3,
  },
});

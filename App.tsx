import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';
import { PlayButton } from './src/components/PlayButton';
import { useBrownNoise } from './src/hooks/useBrownNoise';

export default function App() {
  const { isPlaying, toggle } = useBrownNoise();

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <Text style={styles.title}>Just Noise</Text>
      <Text style={styles.subtitle}>Brown noise for focus</Text>
      <View style={styles.buttonContainer}>
        <PlayButton isPlaying={isPlaying} onPress={toggle} />
      </View>
      <Text style={styles.status}>
        {isPlaying ? 'Playing' : 'Tap to play'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1F2937',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#9CA3AF',
    marginBottom: 60,
  },
  buttonContainer: {
    marginBottom: 40,
  },
  status: {
    fontSize: 14,
    color: '#6B7280',
  },
});

import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { PlayButton } from './src/components/PlayButton';
import { useBrownNoise } from './src/hooks/useBrownNoise';

export default function App() {
  const { isPlaying, toggle } = useBrownNoise();

  return (
    <LinearGradient
      colors={['#6B1B1B', '#8B3A3A', '#C4654A', '#D4845C']}
      locations={[0, 0.3, 0.7, 1]}
      style={styles.container}
    >
      <StatusBar style="light" />
      <View style={styles.buttonContainer}>
        <PlayButton isPlaying={isPlaying} onPress={toggle} />
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 60,
  },
  buttonContainer: {
    marginBottom: 40,
  },
});

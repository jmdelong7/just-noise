/**
 * Brown noise generator using the Brownian motion algorithm.
 * Brown noise has a power spectral density that falls off at 6 dB per octave.
 */

export class BrownNoiseGenerator {
  private lastValue = 0;
  private readonly brownCoefficient = 0.02;

  /**
   * Generate a single brown noise sample
   * @returns A value between -1 and 1
   */
  nextSample(): number {
    // Generate white noise (-1 to 1)
    const white = Math.random() * 2 - 1;

    // Integrate (accumulate) to create brown noise
    this.lastValue += white * this.brownCoefficient;

    // Clamp to prevent runaway values
    if (this.lastValue > 1) this.lastValue = 1;
    if (this.lastValue < -1) this.lastValue = -1;

    // Leaky integration to prevent DC offset buildup
    this.lastValue *= 0.998;

    return this.lastValue;
  }

  /**
   * Fill an audio buffer with brown noise samples
   */
  fillBuffer(buffer: Float32Array): void {
    for (let i = 0; i < buffer.length; i++) {
      buffer[i] = this.nextSample();
    }
  }

  /**
   * Reset the generator state
   */
  reset(): void {
    this.lastValue = 0;
  }
}

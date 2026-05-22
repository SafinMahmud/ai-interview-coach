/** Peak RMS of mono audio — 0 = silence, typical speech ~0.02–0.2 */
export function measurePeakRms(samples: Float32Array): number {
  if (samples.length === 0) return 0;
  let peak = 0;
  for (let i = 0; i < samples.length; i++) {
    const v = Math.abs(samples[i]);
    if (v > peak) peak = v;
  }
  return peak;
}

/** ~-40 dBFS; reject obviously silent clips before Whisper */
export const MIN_SPEECH_RMS = 0.008;

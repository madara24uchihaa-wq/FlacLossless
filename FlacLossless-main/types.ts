export interface AudioState {
  isPlaying: boolean;
  duration: number;
  currentTime: number;
  volume: number;
  playbackRate: number;
}

export interface EqualizerBand {
  frequency: number;
  gain: number; // -12 to 12 dB
  type: BiquadFilterType;
  label: string;
}

export interface Track {
  id: string;
  title: string;
  artist: string;
  url: string; // Blob URL or remote URL
  cover?: string;
}

export type PresetName = 'Flat' | 'Bass Boost' | 'Vocal Boost' | 'Treble Boost' | 'Electronic' | 'Rock' | 'Custom' | 'AI Generated';

export interface EqualizerPreset {
  name: PresetName | string;
  gains: number[]; // Array of 10 gain values corresponding to the bands
}

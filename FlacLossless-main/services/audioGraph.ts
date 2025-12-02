import { EQ_FREQUENCIES } from '../constants';

class AudioGraph {
  private context: AudioContext | null = null;
  private sourceNode: MediaElementAudioSourceNode | null = null;
  private preAmpNode: GainNode | null = null;
  private gainNode: GainNode | null = null;
  private analyserNode: AnalyserNode | null = null;
  private eqFilters: BiquadFilterNode[] = [];
  private vocalFilter: BiquadFilterNode | null = null;
  private pannerNode: StereoPannerNode | null = null;
  private reverbNode: ConvolverNode | null = null;
  private reverbGainNode: GainNode | null = null;
  private dryGainNode: GainNode | null = null;
  private compressorNode: DynamicsCompressorNode | null = null;
  private audioElement: HTMLAudioElement | null = null;

  constructor() {
    // Lazy initialization
  }

  init(audioElement: HTMLAudioElement) {
    if (this.context) return;

    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    // Allow native sample rate for best quality (bit-perfect where possible)
    this.context = new AudioContextClass({ latencyHint: 'playback' }); 
    this.audioElement = audioElement;

    this.sourceNode = this.context.createMediaElementSource(audioElement);
    this.preAmpNode = this.context.createGain(); // Input Gain
    this.gainNode = this.context.createGain(); // Output Gain
    this.analyserNode = this.context.createAnalyser();

    // Configure Analyser
    this.analyserNode.fftSize = 4096; // High resolution
    this.analyserNode.smoothingTimeConstant = 0.85;

    // Create Master Limiter (Compressor) to prevent clipping
    this.compressorNode = this.context.createDynamicsCompressor();
    this.compressorNode.threshold.value = -0.5; // Catch peaks just before clipping
    this.compressorNode.knee.value = 10; // Soft knee
    this.compressorNode.ratio.value = 20; // Hard limit
    this.compressorNode.attack.value = 0.005; // Fast attack
    this.compressorNode.release.value = 0.1; // Fast release

    // Create Effects Nodes
    this.pannerNode = this.context.createStereoPanner();
    this.reverbNode = this.context.createConvolver();
    this.reverbNode.buffer = this.createReverbImpulse(2.5); // 2.5s tail
    this.reverbGainNode = this.context.createGain();
    this.reverbGainNode.gain.value = 0;
    this.dryGainNode = this.context.createGain();
    this.dryGainNode.gain.value = 1;

    // Create EQ Filters
    this.eqFilters = EQ_FREQUENCIES.map((freq) => {
      const filter = this.context!.createBiquadFilter();
      filter.type = 'peaking';
      filter.frequency.value = freq;
      filter.Q.value = 1.4;
      filter.gain.value = 0;
      return filter;
    });

    // Vocal Filter
    this.vocalFilter = this.context.createBiquadFilter();
    this.vocalFilter.type = 'peaking';
    this.vocalFilter.frequency.value = 1500;
    this.vocalFilter.Q.value = 0.5;
    this.vocalFilter.gain.value = 0;

    // Connect Graph
    // Source -> PreAmp -> EQ Chain -> Vocal -> Panner -> Split(Dry/Reverb) -> Analyser -> MasterGain -> Compressor -> Dest
    let previousNode: AudioNode = this.sourceNode;

    // Connect PreAmp
    previousNode.connect(this.preAmpNode);
    previousNode = this.preAmpNode;

    // Connect EQ
    this.eqFilters.forEach((filter) => {
      previousNode.connect(filter);
      previousNode = filter;
    });

    previousNode.connect(this.vocalFilter);
    this.vocalFilter.connect(this.pannerNode);

    // Split logic
    this.pannerNode.connect(this.dryGainNode);
    this.pannerNode.connect(this.reverbNode);
    this.reverbNode.connect(this.reverbGainNode);

    // Merge logic
    this.dryGainNode.connect(this.analyserNode);
    this.reverbGainNode.connect(this.analyserNode);

    this.analyserNode.connect(this.gainNode);
    this.gainNode.connect(this.compressorNode);
    this.compressorNode.connect(this.context.destination);
  }

  // Generate a synthetic reverb impulse response
  private createReverbImpulse(duration: number): AudioBuffer {
    const rate = this.context!.sampleRate;
    const length = rate * duration;
    const impulse = this.context!.createBuffer(2, length, rate);
    const left = impulse.getChannelData(0);
    const right = impulse.getChannelData(1);

    for (let i = 0; i < length; i++) {
        const n = i / length;
        // Exponential decay function for natural sound
        const gain = Math.pow(1 - n, 2); 
        // White noise generation
        left[i] = (Math.random() * 2 - 1) * gain;
        right[i] = (Math.random() * 2 - 1) * gain;
    }
    return impulse;
  }

  resumeContext() {
    if (this.context && this.context.state === 'suspended') {
      this.context.resume();
    }
  }

  setPreAmpGain(db: number) {
    if (this.preAmpNode && this.context) {
        // Convert dB to linear gain
        const gain = Math.pow(10, db / 20);
        this.preAmpNode.gain.setTargetAtTime(gain, this.context.currentTime, 0.1);
    }
  }

  setVolume(value: number) {
    if (this.gainNode) {
      this.gainNode.gain.setTargetAtTime(value, this.context!.currentTime, 0.01);
    }
  }

  setLimiter(enabled: boolean) {
    if (this.compressorNode) {
        // If disabled, we raise threshold to 0 (effectively off) or bypass. 
        // Changing threshold is smoother.
        this.compressorNode.threshold.value = enabled ? -0.5 : 0;
        this.compressorNode.ratio.value = enabled ? 20 : 1;
    }
  }

  setEQGain(index: number, gainDb: number) {
    if (this.eqFilters[index]) {
      this.eqFilters[index].gain.setTargetAtTime(gainDb, this.context!.currentTime, 0.1);
    }
  }

  setVocalPresence(gainDb: number) {
    if (this.vocalFilter) {
       this.vocalFilter.gain.setTargetAtTime(gainDb, this.context!.currentTime, 0.1);
    }
  }

  setStereoWidth(pan: number) {
     if (this.pannerNode) {
         // Clamp between -1 and 1
         this.pannerNode.pan.setTargetAtTime(Math.max(-1, Math.min(1, pan)), this.context!.currentTime, 0.1);
     }
  }

  setReverbLevel(level: number) {
     if (this.reverbGainNode) {
         this.reverbGainNode.gain.setTargetAtTime(level, this.context!.currentTime, 0.1);
     }
  }

  setPlaybackRate(rate: number) {
      if (this.audioElement) {
          this.audioElement.playbackRate = rate;
      }
  }

  getAnalyser() {
    return this.analyserNode;
  }
  
  getContext() {
    return this.context;
  }

  // Analyze current audio frame for AI
  getAudioAnalysis() {
      if (!this.analyserNode) return null;

      const bufferLength = this.analyserNode.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      this.analyserNode.getByteFrequencyData(dataArray);

      // Calculate energy in 3 bands
      const bassCutoff = Math.floor(bufferLength * 0.05); // ~0-500Hz
      const midCutoff = Math.floor(bufferLength * 0.4);   // ~500Hz-8kHz

      let bassEnergy = 0;
      let midEnergy = 0;
      let highEnergy = 0;

      for (let i = 0; i < bufferLength; i++) {
          if (i < bassCutoff) bassEnergy += dataArray[i];
          else if (i < midCutoff) midEnergy += dataArray[i];
          else highEnergy += dataArray[i];
      }

      return {
          bass: bassEnergy / bassCutoff,
          mid: midEnergy / (midCutoff - bassCutoff),
          treble: highEnergy / (bufferLength - midCutoff)
      };
  }
}

export const audioGraph = new AudioGraph();
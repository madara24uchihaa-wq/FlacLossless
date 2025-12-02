import { GoogleGenAI, FunctionDeclaration, Type, Modality } from "@google/genai";

// 1. Define Tools
const updateEQTool: FunctionDeclaration = {
  name: "updateEQ",
  description: "Updates the 10-band equalizer settings based on a description (e.g., 'Bass Boost', 'Vocal Clarity').",
  parameters: {
    type: Type.OBJECT,
    properties: {
      presetName: { type: Type.STRING, description: "Name of the preset being applied" },
      gains: {
        type: Type.ARRAY,
        items: { type: Type.NUMBER },
        description: "Array of 10 gain values (dB) from -12 to 12."
      }
    },
    required: ["gains"]
  }
};

const controlPlaybackTool: FunctionDeclaration = {
  name: "controlPlayback",
  description: "Controls the music playback (play, pause, volume, speed).",
  parameters: {
    type: Type.OBJECT,
    properties: {
      action: { type: Type.STRING, enum: ["play", "pause", "resume"], description: "The playback action" },
      playbackRate: { type: Type.NUMBER, description: "Playback speed/pitch multiplier (0.5 to 2.0)" }
    }
  }
};

class LiveService {
  private session: any | null = null;
  private inputProcessor: ScriptProcessorNode | null = null;
  private inputStream: MediaStream | null = null;
  
  // Audio Contexts
  private inputContext: AudioContext | null = null;
  private outputContext: AudioContext | null = null;
  
  // Audio Playback Queue
  private nextStartTime = 0;
  private sourceNodes = new Set<AudioBufferSourceNode>();

  private onEQUpdate: ((gains: number[]) => void) | null = null;
  private onPlaybackUpdate: ((action: string, val?: number) => void) | null = null;
  private onStatusChange: ((status: string) => void) | null = null;

  async connect(
    onEQUpdate: (gains: number[]) => void, 
    onPlaybackUpdate: (action: string, val?: number) => void,
    onStatusChange?: (status: string) => void
  ) {
    this.onEQUpdate = onEQUpdate;
    this.onPlaybackUpdate = onPlaybackUpdate;
    if (onStatusChange) this.onStatusChange = onStatusChange;

    this.notifyStatus("Initializing Audio...");

    // 1. Initialize Audio Contexts
    // Input at 16kHz (Standard for Speech Rec)
    this.inputContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
    // Output at 24kHz (Gemini Standard Output)
    this.outputContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });

    // Resume contexts in case they were auto-suspended
    await this.inputContext.resume();
    await this.outputContext.resume();

    this.notifyStatus("Connecting to Gemini...");

    // 2. Get Microphone
    try {
        this.inputStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (e) {
        console.error("Microphone access denied", e);
        this.notifyStatus("Mic Access Denied");
        throw e;
    }

    // 3. Connect to Live API
    // Initialize AI here to grab the latest key
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
    
    const sessionPromise = ai.live.connect({
      model: 'gemini-2.5-flash-native-audio-preview-09-2025',
      config: {
        responseModalities: [Modality.AUDIO], // CRITICAL: Must be AUDIO
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } }
        },
        tools: [{ functionDeclarations: [updateEQTool, controlPlaybackTool] }],
        systemInstruction: "You are SonicPulse, a futuristic music player AI. Confirm actions briefly with a robotic personality. Use the tools provided to change EQ or Playback.",
      },
      callbacks: {
        onopen: () => {
          console.log("Live Socket Connected");
          this.notifyStatus("Listening");
          this.startAudioInput(sessionPromise);
        },
        onmessage: (msg) => {
          this.handleMessage(msg, sessionPromise);
        },
        onclose: () => {
            console.log("Live Socket Closed");
            this.notifyStatus("Disconnected");
        },
        onerror: (err) => {
            console.error("Live Socket Error", err);
            this.notifyStatus("Error");
        }
      }
    });

    this.session = await sessionPromise;
  }

  // Handle Incoming Data (Audio + Tool Calls)
  private async handleMessage(msg: any, sessionPromise: Promise<any>) {
      // 1. Play Audio Response
      const audioData = msg.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
      if (audioData) {
          this.playAudioChunk(audioData);
      }

      // 2. Handle Tool Calls
      if (msg.toolCall) {
          for (const fc of msg.toolCall.functionCalls) {
              let result = { status: "ok" };

              if (fc.name === "updateEQ" && this.onEQUpdate) {
                  this.onEQUpdate(fc.args.gains);
                  result = { status: "EQ Updated" };
              } else if (fc.name === "controlPlayback" && this.onPlaybackUpdate) {
                  if (fc.args.action) this.onPlaybackUpdate(fc.args.action);
                  if (fc.args.playbackRate) this.onPlaybackUpdate("rate", fc.args.playbackRate);
                  result = { status: "Playback Updated" };
              }

              const session = await sessionPromise;
              session.sendToolResponse({
                  functionResponses: {
                      id: fc.id,
                      name: fc.name,
                      response: { result }
                  }
              });
          }
      }
  }

  // Stream Mic to Gemini
  private startAudioInput(sessionPromise: Promise<any>) {
    if (!this.inputStream || !this.inputContext) return;

    const source = this.inputContext.createMediaStreamSource(this.inputStream);
    this.inputProcessor = this.inputContext.createScriptProcessor(4096, 1, 1);
    
    this.inputProcessor.onaudioprocess = (e) => {
      const inputData = e.inputBuffer.getChannelData(0);
      
      // Float32 -> Int16 PCM
      const pcmData = new Int16Array(inputData.length);
      for (let i = 0; i < inputData.length; i++) {
        const s = Math.max(-1, Math.min(1, inputData[i]));
        pcmData[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
      }
      
      // Base64 Encode
      let binary = '';
      const bytes = new Uint8Array(pcmData.buffer);
      const len = bytes.byteLength;
      for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      const base64 = btoa(binary);

      sessionPromise.then(session => {
          session.sendRealtimeInput({
             media: {
                 mimeType: 'audio/pcm;rate=16000',
                 data: base64
             }
          });
      });
    };

    source.connect(this.inputProcessor);
    this.inputProcessor.connect(this.inputContext.destination);
  }

  // Play Audio Chunks from Gemini
  private async playAudioChunk(base64Data: string) {
      if (!this.outputContext) return;

      const binaryString = atob(base64Data);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      const int16 = new Int16Array(bytes.buffer);
      const float32 = new Float32Array(int16.length);
      for (let i = 0; i < int16.length; i++) {
          float32[i] = int16[i] / 32768.0;
      }

      const buffer = this.outputContext.createBuffer(1, float32.length, 24000);
      buffer.getChannelData(0).set(float32);

      const source = this.outputContext.createBufferSource();
      source.buffer = buffer;
      source.connect(this.outputContext.destination);
      
      // Audio Scheduling Logic
      const now = this.outputContext.currentTime;
      // Start at the end of the last chunk or now, whichever is later
      const startTime = Math.max(now, this.nextStartTime);
      
      source.start(startTime);
      
      // Update cursor
      this.nextStartTime = startTime + buffer.duration;
      
      this.sourceNodes.add(source);
      source.onended = () => {
          this.sourceNodes.delete(source);
      };
  }

  private notifyStatus(status: string) {
      if (this.onStatusChange) this.onStatusChange(status);
  }

  disconnect() {
      if (this.session) {
          // No direct close method on sessionPromise usually, but we can close stream
          this.session = null;
      }
      if (this.inputStream) {
          this.inputStream.getTracks().forEach(t => t.stop());
          this.inputStream = null;
      }
      if (this.inputProcessor) {
          this.inputProcessor.disconnect();
          this.inputProcessor = null;
      }
      if (this.inputContext) {
          this.inputContext.close();
          this.inputContext = null;
      }
      if (this.outputContext) {
          this.outputContext.close();
          this.outputContext = null;
      }
      this.notifyStatus("Disconnected");
  }
}

export const liveService = new LiveService();
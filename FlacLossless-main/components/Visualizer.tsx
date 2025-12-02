import React, { useEffect, useRef } from 'react';
import { audioGraph } from '../services/audioGraph';

interface VisualizerProps {
  isPlaying: boolean;
  colorMode: 'neon' | 'sunset' | 'ocean';
  onBeat?: (strength: number) => void;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  size: number;
  color: string;
}

interface Shockwave {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  alpha: number;
  width: number;
}

const Visualizer: React.FC<VisualizerProps> = ({ isPlaying, colorMode, onBeat }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const frameSkipRef = useRef(0);
  
  // Mutable state for the animation loop to avoid React state overhead
  const particlesRef = useRef<Particle[]>([]);
  const shockwavesRef = useRef<Shockwave[]>([]);
  const audioDataRef = useRef<{
    energyHistory: number[];
    lastBeatTime: number;
    smoothedBass: number;
  }>({
    energyHistory: new Array(30).fill(0),
    lastBeatTime: 0,
    smoothedBass: 0
  });

  // Keep callback fresh without triggering effect re-runs
  const onBeatRef = useRef(onBeat);
  useEffect(() => {
    onBeatRef.current = onBeat;
  }, [onBeat]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: false }); // Disable alpha for better performance
    if (!ctx) return;

    // Pre-create gradient for background
    const bgGradient = ctx.createRadialGradient(canvas.width / 2, canvas.height / 2, 0, canvas.width / 2, canvas.height / 2, Math.max(canvas.width, canvas.height));
    bgGradient.addColorStop(0, 'rgba(15, 5, 30, 0.9)');
    bgGradient.addColorStop(1, 'rgba(5, 5, 5, 0.95)');

    // Helper to get color based on mode
    const getThemeColor = (ratio: number, brightness = 1) => {
      let r, g, b;
      if (colorMode === 'neon') {
        r = 20 + ratio * 200;
        g = 255 - ratio * 150;
        b = 255;
      } else if (colorMode === 'sunset') {
        r = 255;
        g = 200 * (1 - ratio);
        b = 50 + ratio * 150;
      } else {
        r = 20;
        g = 100 + ratio * 155;
        b = 255;
      }
      return `rgba(${Math.floor(r * brightness)}, ${Math.floor(g * brightness)}, ${Math.floor(b * brightness)}`;
    };

    const spawnParticles = (count: number, x: number, y: number, energy: number) => {
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = (Math.random() * 2 + 1) * (1 + energy);
        particlesRef.current.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 1.0,
          size: Math.random() * 2.5 + 0.8,
          color: getThemeColor(Math.random()) + ', 0.8)'
        });
      }
    };

    const renderFrame = () => {
      const analyser = audioGraph.getAnalyser();
      
      // If no analyser or not playing (and no particles left), just clear and wait
      if (!analyser || (!isPlaying && particlesRef.current.length === 0 && shockwavesRef.current.length === 0)) {
        ctx.fillStyle = bgGradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        if (isPlaying) animationRef.current = requestAnimationFrame(renderFrame);
        return;
      }

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      analyser.getByteFrequencyData(dataArray);

      const width = canvas.width;
      const height = canvas.height;
      const cx = width / 2;
      const cy = height / 2;

      // 1. BEAT DETECTION - Bass energy
      let bassEnergy = 0;
      const bassBins = 12;
      for (let i = 1; i < bassBins; i++) {
        bassEnergy += dataArray[i];
      }
      const avgBass = bassEnergy / bassBins;
      const normalizedBass = avgBass / 255;
      
      // Smooth the bass for less jittery animations
      audioDataRef.current.smoothedBass += (normalizedBass - audioDataRef.current.smoothedBass) * 0.2;

      // Update history for dynamic thresholding
      audioDataRef.current.energyHistory.push(avgBass);
      audioDataRef.current.energyHistory.shift();
      
      const localAvgEnergy = audioDataRef.current.energyHistory.reduce((a, b) => a + b, 0) / audioDataRef.current.energyHistory.length;
      
      // Detect Beat
      const now = performance.now();
      const isBeat = (avgBass > localAvgEnergy * 1.3) && (avgBass > 100) && (now - audioDataRef.current.lastBeatTime > 250);

      if (isBeat) {
        audioDataRef.current.lastBeatTime = now;
        
        // Spawn fewer, larger shockwaves
        shockwavesRef.current.push({
          x: cx,
          y: cy,
          radius: 15,
          maxRadius: Math.max(width, height) * 0.5,
          alpha: 1,
          width: 3 + normalizedBass * 8
        });

        // Spawn particles from center (reduced count)
        spawnParticles(6, cx, cy, normalizedBass);
      }

      // Notify parent
      if (onBeatRef.current) {
        onBeatRef.current(audioDataRef.current.smoothedBass);
      }

      // 2. DRAW BACKGROUND with gradient
      ctx.fillStyle = bgGradient;
      ctx.fillRect(0, 0, width, height);

      // 3. DRAW CIRCULAR GRADIENT ANIMATION (Behind visualizer)
      const beatScale = 1 + audioDataRef.current.smoothedBass * 0.15;
      const circleGrad = ctx.createRadialGradient(cx, cy, 20, cx, cy, 200 * beatScale);
      
      if (colorMode === 'neon') {
        circleGrad.addColorStop(0, `rgba(0, 255, 200, ${0.15 * audioDataRef.current.smoothedBass})`);
        circleGrad.addColorStop(0.5, `rgba(100, 50, 200, ${0.08 * audioDataRef.current.smoothedBass})`);
        circleGrad.addColorStop(1, 'rgba(50, 10, 100, 0)');
      } else if (colorMode === 'sunset') {
        circleGrad.addColorStop(0, `rgba(255, 100, 50, ${0.15 * audioDataRef.current.smoothedBass})`);
        circleGrad.addColorStop(0.5, `rgba(200, 50, 100, ${0.08 * audioDataRef.current.smoothedBass})`);
        circleGrad.addColorStop(1, 'rgba(100, 10, 50, 0)');
      } else {
        circleGrad.addColorStop(0, `rgba(0, 200, 255, ${0.15 * audioDataRef.current.smoothedBass})`);
        circleGrad.addColorStop(0.5, `rgba(50, 100, 200, ${0.08 * audioDataRef.current.smoothedBass})`);
        circleGrad.addColorStop(1, 'rgba(10, 50, 100, 0)');
      }
      
      ctx.fillStyle = circleGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, 200 * beatScale, 0, Math.PI * 2);
      ctx.fill();

      // 4. DRAW SHOCKWAVES
      shockwavesRef.current.forEach((wave, idx) => {
        wave.radius += 4 + (wave.radius * 0.03);
        wave.alpha -= 0.025;
        
        if (wave.alpha <= 0) {
          shockwavesRef.current.splice(idx, 1);
          return;
        }

        ctx.beginPath();
        ctx.arc(wave.x, wave.y, wave.radius, 0, Math.PI * 2);
        ctx.lineWidth = wave.width;
        ctx.strokeStyle = getThemeColor(0.5) + `, ${wave.alpha})`;
        ctx.stroke();
      });

      // 5. DRAW FREQUENCY BARS (Optimized - fewer bars, no shadow)
      const barCount = 48; // Reduced from 64
      const step = Math.floor(bufferLength / barCount);
      const barWidth = (width / barCount) * 0.85;
      
      for (let i = 0; i < barCount; i++) {
        const dataIndex = i * step;
        let value = dataArray[dataIndex];
        
        if (i > barCount / 2) value *= 1.2;

        const percent = Math.min(1, value / 255);
        const barHeight = Math.max(2, percent * (height * 0.75));
        
        const xPos = (width / 2) + (i * (barWidth + 1));
        const xNeg = (width / 2) - ((i + 1) * (barWidth + 1));

        const color = getThemeColor(i / barCount);
        ctx.fillStyle = color + ', 1)';
        
        const y = (height - barHeight) / 2;
        ctx.fillRect(xPos, y, barWidth, barHeight);
        ctx.fillRect(xNeg, y, barWidth, barHeight);

        // Spawn particles less frequently
        if (isBeat && percent > 0.75 && Math.random() > 0.85) {
          spawnParticles(1, xPos + barWidth / 2, y, 0.3);
          spawnParticles(1, xNeg + barWidth / 2, y, 0.3);
        }
      }

      // 6. DRAW PARTICLES (with optimized rendering)
      for (let i = particlesRef.current.length - 1; i >= 0; i--) {
        const p = particlesRef.current[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 0.018;
        p.size *= 0.96;

        if (p.life <= 0) {
          particlesRef.current.splice(i, 1);
          continue;
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.fill();
      }

      animationRef.current = requestAnimationFrame(renderFrame);
    };

    renderFrame();

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [isPlaying, colorMode]);

  return (
    <canvas
      ref={canvasRef}
      width={1000}
      height={400}
      className="w-full h-full object-cover rounded-xl opacity-90"
    />
  );
};

export default Visualizer;
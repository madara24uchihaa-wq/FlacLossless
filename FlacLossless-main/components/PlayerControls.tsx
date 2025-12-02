import React from 'react';
import { Play, Pause, SkipForward, SkipBack, Volume2, Upload, Sparkles, MonitorSpeaker } from 'lucide-react';

interface PlayerControlsProps {
  isPlaying: boolean;
  onPlayPause: () => void;
  currentTime: number;
  duration: number;
  onSeek: (time: number) => void;
  onFileChange: (file: File) => void;
  onOpenAI: () => void;
}

const formatTime = (seconds: number) => {
  if (isNaN(seconds)) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const PlayerControls: React.FC<PlayerControlsProps> = ({
  isPlaying,
  onPlayPause,
  currentTime,
  duration,
  onSeek,
  onFileChange,
  onOpenAI
}) => {
  return (
    <div className="w-full flex flex-col gap-6">
      {/* Progress Bar */}
      <div className="w-full group relative">
        <input
          type="range"
          min="0"
          max={duration || 100}
          value={currentTime}
          onChange={(e) => onSeek(parseFloat(e.target.value))}
          className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-cyan-400 hover:h-2 transition-all duration-300 relative z-10"
        />
        <div className="flex justify-between text-xs text-gray-400 mt-1 font-mono">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {/* Main Buttons */}
      <div className="flex items-center justify-between">
        
        {/* Left Actions */}
        <div className="flex items-center gap-3">
             <label className="cursor-pointer p-2 rounded-full hover:bg-white/10 transition-colors text-gray-400 hover:text-white group relative" title="Upload FLAC/MP3">
                <Upload size={20} />
                <span className="absolute -top-8 left-0 text-[10px] bg-white text-black px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity w-24 text-center pointer-events-none">
                    Supports FLAC
                </span>
                <input type="file" accept="audio/*,.flac" className="hidden" onChange={(e) => e.target.files && onFileChange(e.target.files[0])} />
             </label>
             <button 
                onClick={onOpenAI} 
                className="p-2 px-3 rounded-full bg-gradient-to-r from-purple-900/50 to-purple-600/50 hover:from-purple-800 hover:to-purple-500 text-purple-200 transition-all flex items-center gap-2 border border-purple-500/30 shadow-[0_0_15px_rgba(168,85,247,0.3)]"
             >
                <Sparkles size={16} />
                <span className="text-xs font-bold">Smart AI</span>
             </button>
        </div>

        {/* Center Controls */}
        <div className="flex items-center gap-6">
          <button className="text-gray-400 hover:text-white transition-colors hover:scale-110">
            <SkipBack size={24} />
          </button>
          
          <button
            onClick={onPlayPause}
            className="w-16 h-16 bg-white rounded-full flex items-center justify-center text-black hover:scale-105 active:scale-95 transition-all shadow-[0_0_25px_rgba(255,255,255,0.4)]"
          >
            {isPlaying ? <Pause size={28} fill="black" /> : <Play size={28} fill="black" className="ml-1"/>}
          </button>

          <button className="text-gray-400 hover:text-white transition-colors hover:scale-110">
            <SkipForward size={24} />
          </button>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-4 text-gray-400">
           <Volume2 size={20} />
        </div>

      </div>
    </div>
  );
};

export default PlayerControls;
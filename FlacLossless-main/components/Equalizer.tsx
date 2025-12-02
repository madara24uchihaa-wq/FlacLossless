import React from 'react';
import { EQ_FREQUENCIES } from '../constants';
import { Mic2, MoveHorizontal, Wind, Gauge, Activity, ShieldCheck } from 'lucide-react';

interface EqualizerProps {
  gains: number[];
  onChange: (index: number, val: number) => void;
  vocalPresence: number;
  onVocalChange: (val: number) => void;
  // New Controls
  reverbLevel: number;
  onReverbChange: (val: number) => void;
  stereoWidth: number;
  onWidthChange: (val: number) => void;
  playbackRate: number;
  onRateChange: (val: number) => void;
  // Audiophile Controls
  preAmp: number;
  onPreAmpChange: (val: number) => void;
  limiterEnabled: boolean;
  onLimiterChange: (enabled: boolean) => void;
}

const Equalizer: React.FC<EqualizerProps> = ({ 
    gains, onChange, 
    vocalPresence, onVocalChange,
    reverbLevel, onReverbChange,
    stereoWidth, onWidthChange,
    playbackRate, onRateChange,
    preAmp, onPreAmpChange,
    limiterEnabled, onLimiterChange
}) => {
  return (
    <div className="flex flex-col h-full overflow-hidden">
      
      {/* 10-Band EQ Section with PreAmp */}
      <div className="flex-none bg-black/40 backdrop-blur-md rounded-2xl border border-white/10 p-4 mb-4">
        <div className="flex justify-between items-center mb-4">
            <h3 className="text-white/80 text-xs font-bold tracking-widest uppercase">Parametric EQ</h3>
            <div className="flex items-center gap-2">
                 <button 
                    onClick={() => onLimiterChange(!limiterEnabled)}
                    className={`flex items-center gap-1 text-[9px] px-2 py-1 rounded border transition-colors uppercase font-bold tracking-wider ${limiterEnabled ? 'bg-red-500/20 text-red-400 border-red-500/30' : 'bg-white/5 text-gray-500 border-white/5'}`}
                    title="Safety Limiter prevents distortion/clipping"
                 >
                    <ShieldCheck size={10} /> Limiter {limiterEnabled ? 'ON' : 'OFF'}
                 </button>
            </div>
        </div>
        
        <div className="flex items-end gap-2 sm:gap-3 h-32">
            
            {/* Pre-Amp Slider */}
            <div className="flex flex-col items-center gap-2 border-r border-white/10 pr-3 mr-1">
                 <div className="relative w-4 h-24 bg-gray-800/50 rounded-full overflow-hidden">
                    <div 
                        className="absolute bottom-0 w-full bg-yellow-500/80 transition-colors"
                        style={{ height: `${((preAmp + 12) / 24) * 100}%` }}
                    />
                    <input
                        type="range" min="-12" max="12" step="0.5"
                        value={preAmp}
                        onChange={(e) => onPreAmpChange(parseFloat(e.target.value))}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                        style={{ writingMode: 'vertical-lr', direction: 'rtl' } as any}
                    />
                 </div>
                 <span className="text-[9px] text-yellow-500 font-bold">PRE</span>
            </div>

            {/* EQ Bands */}
            <div className="flex-1 flex justify-between items-end gap-1">
                {EQ_FREQUENCIES.map((freq, index) => (
                <div key={freq} className="flex flex-col items-center group w-full">
                    {/* Slider Track */}
                    <div className="relative w-full max-w-[16px] h-24 bg-gray-800/50 rounded-full overflow-hidden">
                    {/* Fill */}
                    <div 
                        className="absolute bottom-0 w-full bg-cyan-500/80 group-hover:bg-cyan-400 transition-colors"
                        style={{ 
                            height: `${((gains[index] + 12) / 24) * 100}%` 
                        }}
                    />
                    {/* Input */}
                    <input
                        type="range"
                        min="-12"
                        max="12"
                        step="0.5"
                        value={gains[index]}
                        onChange={(e) => onChange(index, parseFloat(e.target.value))}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                        style={{ writingMode: 'vertical-lr', direction: 'rtl' } as any}
                    />
                    </div>
                </div>
                ))}
            </div>
        </div>
        
        {/* Frequencies Labels */}
        <div className="flex justify-between mt-2 pl-10 pr-1">
             <span className="text-[9px] text-gray-600">32</span>
             <span className="text-[9px] text-gray-600">1k</span>
             <span className="text-[9px] text-gray-600">16k</span>
        </div>
      </div>

      {/* Studio Mastering Rack */}
      <div className="flex-1 bg-black/40 backdrop-blur-md rounded-2xl border border-white/10 p-5 overflow-y-auto custom-scrollbar">
          <h3 className="text-white/80 text-xs font-bold tracking-widest uppercase mb-4 flex items-center gap-2">
            <span className="w-1 h-1 rounded-full bg-purple-500"></span> Studio Rack
          </h3>

          <div className="grid grid-cols-2 gap-x-6 gap-y-6">
              
              {/* Vocal Control */}
              <div className="col-span-2">
                  <div className="flex justify-between text-xs mb-2">
                      <span className="text-gray-400 flex items-center gap-2"><Mic2 size={12}/> Vocals</span>
                      <span className="text-purple-400 font-mono">{vocalPresence > 0 ? '+' : ''}{vocalPresence}dB</span>
                  </div>
                  <input
                    type="range" min="-12" max="12" step="0.5"
                    value={vocalPresence}
                    onChange={(e) => onVocalChange(parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
                  />
              </div>

              {/* Stereo Width */}
              <div>
                  <div className="flex justify-between text-xs mb-2">
                      <span className="text-gray-400 flex items-center gap-2"><MoveHorizontal size={12}/> Width</span>
                      <span className="text-cyan-400 font-mono">{Math.round(stereoWidth * 100)}%</span>
                  </div>
                  <input
                    type="range" min="-1" max="1" step="0.1"
                    value={stereoWidth}
                    onChange={(e) => onWidthChange(parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                  />
              </div>

              {/* Atmosphere (Reverb) */}
              <div>
                  <div className="flex justify-between text-xs mb-2">
                      <span className="text-gray-400 flex items-center gap-2"><Wind size={12}/> Space</span>
                      <span className="text-pink-400 font-mono">{Math.round(reverbLevel * 100)}%</span>
                  </div>
                  <input
                    type="range" min="0" max="0.5" step="0.01"
                    value={reverbLevel}
                    onChange={(e) => onReverbChange(parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-pink-500"
                  />
              </div>

               {/* Playback Rate */}
               <div className="col-span-2 border-t border-white/5 pt-4">
                  <div className="flex justify-between text-xs mb-2">
                      <span className="text-gray-400 flex items-center gap-2"><Gauge size={12}/> Speed / Pitch</span>
                      <span className="text-green-400 font-mono">x{playbackRate.toFixed(2)}</span>
                  </div>
                  <input
                    type="range" min="0.5" max="2" step="0.05"
                    value={playbackRate}
                    onChange={(e) => onRateChange(parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-green-500"
                  />
                  <div className="flex justify-between text-[9px] text-gray-600 mt-1">
                      <span>Slowed</span>
                      <span className="cursor-pointer hover:text-white" onClick={() => onRateChange(1)}>Reset</span>
                      <span>Nightcore</span>
                  </div>
              </div>

          </div>
      </div>
    </div>
  );
};

export default Equalizer;
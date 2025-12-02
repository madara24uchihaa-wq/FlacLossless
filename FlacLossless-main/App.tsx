import React, { useState, useEffect, useRef } from 'react';
import { audioGraph } from './services/audioGraph';
import { DEMO_TRACK_URL, PRESETS } from './constants';
import { generateEQPreset } from './services/geminiService';
import { liveService } from './services/liveService';
import { backendService } from './services/backendService';
import { downloadJobService } from './services/downloadJobService';
import Visualizer from './components/Visualizer';
import Equalizer from './components/Equalizer';
import PlayerControls from './components/PlayerControls';
import Playlist from './components/Playlist';
import StreamingSource from './components/StreamingSource';
import YouTubePlayer from './components/YouTubePlayer';
import { Track } from './types';
import { X, Mic2, Disc, Sliders, Sparkles, Activity, Download, Zap, Key, List, Music, Wifi } from 'lucide-react';

const App: React.FC = () => {
  // State
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTrack, setCurrentTrack] = useState<Track>({
    id: 'demo',
    title: 'Tech House Vibes',
    artist: 'Mixkit Demo',
    url: DEMO_TRACK_URL
  });
  
  // Playlist State
  const [playlist, setPlaylist] = useState<Track[]>([]);
  const [showPlaylist, setShowPlaylist] = useState(false);
  const [showStreamingSource, setShowStreamingSource] = useState(false);
  
  // YouTube Player State
  const [youtubeVideoId, setYoutubeVideoId] = useState<string | null>(null);
  const [youtubeVideoTitle, setYoutubeVideoTitle] = useState<string>('');
  
  // Audio FX State
  const [eqGains, setEqGains] = useState<number[]>(PRESETS.flat.gains);
  const [vocalPresence, setVocalPresence] = useState(0);
  const [reverbLevel, setReverbLevel] = useState(0);
  const [stereoWidth, setStereoWidth] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [preAmp, setPreAmp] = useState(0);
  const [limiterEnabled, setLimiterEnabled] = useState(true);

  const [showEQ, setShowEQ] = useState(false);
  const [showAI, setShowAI] = useState(false);
  
  // AI Prompt State
  const [aiPrompt, setAiPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [beatEnergy, setBeatEnergy] = useState(0);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  // Live Voice State
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [hasApiKey, setHasApiKey] = useState(false);

  // Stats
  const [sampleRate, setSampleRate] = useState(0);
  const [installPrompt, setInstallPrompt] = useState<any>(null);

  // Refs
  const audioRef = useRef<HTMLAudioElement>(null);

  // PWA Install Event Listener
  useEffect(() => {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      setInstallPrompt(e);
    });
    
    // Check for API Key validity on mount
    const checkKey = async () => {
        if ((window as any).aistudio && (window as any).aistudio.hasSelectedApiKey) {
            const hasKey = await (window as any).aistudio.hasSelectedApiKey();
            setHasApiKey(hasKey);
        } else {
            // Fallback for environment variable existence (local dev)
            setHasApiKey(!!process.env.API_KEY);
        }
    };
    checkKey();
  }, []);

  // Initialization
  useEffect(() => {
    if (audioRef.current) {
      audioGraph.init(audioRef.current);
      
      const audio = audioRef.current;
      
      const updateTime = () => setCurrentTime(audio.currentTime);
      const updateDuration = () => setDuration(audio.duration);
      const onEnd = () => {
        setIsPlaying(false);
        // Auto-play next track in playlist
        const currentIndex = playlist.findIndex(t => t.id === currentTrack.id);
        if (currentIndex !== -1 && currentIndex < playlist.length - 1) {
          handlePlaylistTrackSelect(playlist[currentIndex + 1]);
        }
      };

      audio.addEventListener('timeupdate', updateTime);
      audio.addEventListener('loadedmetadata', updateDuration);
      audio.addEventListener('ended', onEnd);

      const ctx = audioGraph.getContext();
      if (ctx) setSampleRate(ctx.sampleRate);

      return () => {
        audio.removeEventListener('timeupdate', updateTime);
        audio.removeEventListener('loadedmetadata', updateDuration);
        audio.removeEventListener('ended', onEnd);
      };
    }
  }, [playlist, currentTrack.id]);

  // Update Audio Graph when State changes
  useEffect(() => {
    eqGains.forEach((gain, index) => {
      audioGraph.setEQGain(index, gain);
    });
  }, [eqGains]);

  useEffect(() => {
    audioGraph.setVocalPresence(vocalPresence);
  }, [vocalPresence]);

  useEffect(() => {
      audioGraph.setReverbLevel(reverbLevel);
  }, [reverbLevel]);

  useEffect(() => {
      audioGraph.setStereoWidth(stereoWidth);
  }, [stereoWidth]);

  useEffect(() => {
      audioGraph.setPlaybackRate(playbackRate);
  }, [playbackRate]);

  useEffect(() => {
    audioGraph.setPreAmpGain(preAmp);
  }, [preAmp]);

  useEffect(() => {
    audioGraph.setLimiter(limiterEnabled);
  }, [limiterEnabled]);

  // Handlers
  const handlePlayPause = () => {
    if (!audioRef.current) return;
    audioGraph.resumeContext();
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const handleFileChange = (file: File) => {
    const url = URL.createObjectURL(file);
    const newTrack: Track = {
      id: file.name + Date.now(),
      title: file.name.replace(/\.[^/.]+$/, ""),
      artist: 'Local Track',
      url: url
    };
    setCurrentTrack(newTrack);
    if (audioRef.current) {
        audioRef.current.src = url;
        audioRef.current.load();
        setIsPlaying(false);
        setPlaybackRate(1);
    }
  };

  const handleAddPlaylistTracks = (files: File[]) => {
    const newTracks: Track[] = files.map(file => ({
      id: file.name + Date.now() + Math.random(),
      title: file.name.replace(/\.[^/.]+$/, ""),
      artist: 'Local Track',
      url: URL.createObjectURL(file)
    }));
    setPlaylist(prev => [...prev, ...newTracks]);
  };

  const handlePlaylistTrackSelect = async (track: Track) => {
    // YouTube videos - download via backend job system and play as MP3
    if (track.id.startsWith('youtube-')) {
      console.log('[Play] YouTube track selected:', track.title);
      
      try {
        console.log('[Play] Creating download job for:', track.url);
        
        await downloadJobService.createJob(
          track.url,
          track.title,
          (job) => {
            console.log('[Play] Download progress:', job.progress + '%', job.stage);
          },
          (job) => {
            console.log('[Play] Download completed!');
            if (job.stream_url) {
              const fullStreamUrl = downloadJobService.getStreamUrl(job.stream_url);
              console.log('[Play] Playing stream URL:', fullStreamUrl);
              
              const updatedTrack: Track = {
                ...track,
                url: fullStreamUrl
              };
              setCurrentTrack(updatedTrack);
              
              setYoutubeVideoId(null);
              setYoutubeVideoTitle('');
              
              if (audioRef.current) {
                audioRef.current.src = fullStreamUrl;
                audioRef.current.crossOrigin = 'anonymous';
                audioRef.current.load();
                audioGraph.resumeContext();
                audioRef.current.play().then(() => {
                  setIsPlaying(true);
                }).catch(e => {
                  console.error('[Play] Playback error:', e);
                });
              }
            }
          },
          (error) => {
            console.error('[Play] Download failed:', error);
            const videoId = track.url.match(/v=([^&]+)/)?.[1];
            if (videoId) {
              setYoutubeVideoId(videoId);
              setYoutubeVideoTitle(track.title);
            }
          }
        );
      } catch (error) {
        console.error('[Play] Failed to create download job:', error);
        const videoId = track.url.match(/v=([^&]+)/)?.[1];
        if (videoId) {
          setYoutubeVideoId(videoId);
          setYoutubeVideoTitle(track.title);
        }
      }
      return;
    }

    // Close YouTube player if open (switching to non-YouTube track)
    if (youtubeVideoId) {
      setYoutubeVideoId(null);
      setYoutubeVideoTitle('');
    }

    // Spotify preview URLs play in app
    if (track.id.startsWith('spotify-') && track.url && track.url.includes('d.scdn.co')) {
      setCurrentTrack(track);
      setShowPlaylist(true);
      if (audioRef.current) {
        audioRef.current.src = track.url;
        audioRef.current.crossOrigin = 'anonymous';
        audioRef.current.load();
        audioRef.current.play().catch(e => {
          console.error('Playback error:', e);
        });
        setIsPlaying(true);
      }
      return;
    }

    // Spotify songs without previews - open in Spotify
    if (track.id.startsWith('spotify-')) {
      if (track.url) {
        window.open(track.url, '_blank');
      }
      return;
    }

    // Local tracks can be played directly
    if (!track.url) {
      alert('⚠️ No playable URL for this track');
      return;
    }
    
    setCurrentTrack(track);
    setShowPlaylist(true);
    if (audioRef.current) {
      audioRef.current.src = track.url;
      audioRef.current.load();
      audioRef.current.play().catch(e => {
        console.error('Playback error:', e);
        alert('Playback failed');
      });
      setIsPlaying(true);
    }
  };

  const handleRemovePlaylistTrack = (trackId: string) => {
    setPlaylist(prev => prev.filter(t => t.id !== trackId));
    if (currentTrack.id === trackId && playlist.length > 1) {
      const nextTrack = playlist.find(t => t.id !== trackId);
      if (nextTrack) handlePlaylistTrackSelect(nextTrack);
    }
  };

  const handleReorderPlaylist = (fromIndex: number, toIndex: number) => {
    const newPlaylist = [...playlist];
    const [movedTrack] = newPlaylist.splice(fromIndex, 1);
    newPlaylist.splice(toIndex, 0, movedTrack);
    setPlaylist(newPlaylist);
  };

  const handleInstallClick = () => {
    if (installPrompt) {
      installPrompt.prompt();
      installPrompt.userChoice.then((choiceResult: any) => {
        if (choiceResult.outcome === 'accepted') {
          setInstallPrompt(null);
        }
      });
    }
  };

  // Wrapper to handle API Key prompt
  const ensureApiKey = async () => {
      if (hasApiKey) return true;
      if ((window as any).aistudio && (window as any).aistudio.openSelectKey) {
          const success = await (window as any).aistudio.openSelectKey();
          if (success) {
              setHasApiKey(true);
              return true;
          }
      }
      return false;
  }

  // Toggle Live Voice Socket
  const toggleVoiceControl = async () => {
    if (isVoiceActive) {
        liveService.disconnect();
        setIsVoiceActive(false);
    } else {
        const keyOk = await ensureApiKey();
        if (!keyOk) return;

        setIsVoiceActive(true);
        try {
            await liveService.connect(
                // Callback for EQ
                (newGains) => {
                    setEqGains(newGains);
                    setShowEQ(true);
                },
                // Callback for Playback
                (action, val) => {
                    if (action === 'play' && audioRef.current) { audioRef.current.play(); setIsPlaying(true); }
                    if (action === 'pause' && audioRef.current) { audioRef.current.pause(); setIsPlaying(false); }
                    if (action === 'rate' && val) setPlaybackRate(val);
                }
            );
        } catch (e) {
            console.error(e);
            setIsVoiceActive(false);
            // Check if error is related to key
            if (e.toString().includes("Requested entity was not found") && (window as any).aistudio) {
                setHasApiKey(false);
                await (window as any).aistudio.openSelectKey();
            } else {
                alert("Failed to connect to Live API: " + e);
            }
        }
    }
  };

  const handleAIGenerate = async (useAudioAnalysis = false) => {
    const keyOk = await ensureApiKey();
    if (!keyOk) return;

    setIsGenerating(true);
    if (useAudioAnalysis) setIsAnalyzing(true);

    let analysisData = null;
    
    // Deep Analysis Simulation
    if (useAudioAnalysis && isPlaying) {
        analysisData = audioGraph.getAudioAnalysis();
        await new Promise(r => setTimeout(r, 1500));
    }

    const result = await generateEQPreset(
        aiPrompt, 
        { title: currentTrack.title, artist: currentTrack.artist },
        analysisData || undefined
    );

    if (result) {
        setEqGains(result.gains);
        setShowAI(false);
        setShowEQ(true);
    }
    setIsGenerating(false);
    setIsAnalyzing(false);
  };

  const bgStyle = {
    background: `radial-gradient(circle at 50% 50%, 
        rgba(30, 0, 60, ${0.4 + (beatEnergy * 0.2)}) 0%, 
        rgba(5, 5, 5, 1) 70%)`
  };

  return (
    <div className="relative w-full h-screen overflow-hidden flex flex-col items-center justify-center transition-all duration-100" style={bgStyle}>
      <audio ref={audioRef} src={currentTrack.url} crossOrigin="anonymous" />

      {/* Background Visualizer Layer */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-40 blur-3xl scale-125">
         <div className={`w-96 h-96 bg-cyan-500 rounded-full absolute top-1/4 left-1/4 mix-blend-screen transition-transform duration-100 ease-out`} style={{ transform: `scale(${1 + beatEnergy}) translate(-50%, -50%)`}}></div>
         <div className={`w-96 h-96 bg-purple-600 rounded-full absolute bottom-1/4 right-1/4 mix-blend-screen transition-transform duration-100 ease-out delay-75`} style={{ transform: `scale(${1 + beatEnergy * 0.8}) translate(50%, 50%)`}}></div>
      </div>

      {/* Main Glass Panel */}
      <div className="relative z-10 w-full max-w-6xl h-full md:h-[90vh] md:rounded-[3rem] bg-black/30 backdrop-blur-2xl border border-white/5 shadow-2xl overflow-hidden flex flex-col md:flex-row">
        
        {/* Left: Visuals & Info */}
        <div className="flex-[1.5] p-8 flex flex-col relative border-r border-white/5">
           {/* Header */}
           <div className="flex justify-between items-center mb-8 relative z-20">
              <div className="flex items-center gap-2">
                 <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse"></div>
                 <h1 className="font-bold text-xl tracking-tighter brand-font">SONICPULSE <span className="text-purple-400">ULTRA</span></h1>
              </div>
              <div className="flex gap-2 items-center">
                 {!hasApiKey && (
                     <button onClick={() => ensureApiKey()} className="p-1 px-2 rounded-full border border-yellow-500/30 text-[10px] bg-yellow-900/20 text-yellow-400 flex items-center gap-1 hover:bg-yellow-900/40 transition-colors">
                        <Key size={10} /> CONNECT KEY
                     </button>
                 )}
                 <button 
                    onClick={() => setShowStreamingSource(true)}
                    className="p-1 px-2 rounded-full border border-orange-500/30 text-[10px] bg-orange-900/20 text-orange-400 flex items-center gap-1 hover:bg-orange-900/40 transition-colors"
                    title="Import from Spotify or YouTube"
                 >
                    <Wifi size={10} /> STREAM
                 </button>
                 <button 
                    onClick={() => setShowPlaylist(!showPlaylist)}
                    className={`p-1 px-2 rounded-full text-[10px] flex items-center gap-1 transition-colors border ${showPlaylist ? 'bg-cyan-500/20 border-cyan-500 text-cyan-400' : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'}`}
                    title="Toggle Playlist"
                 >
                    <List size={10} /> PLAYLIST
                 </button>
                 {installPrompt && (
                     <button onClick={handleInstallClick} className="p-1 px-2 rounded-full border border-cyan-500/30 text-[10px] bg-cyan-900/20 text-cyan-400 flex items-center gap-1 hover:bg-cyan-900/40 transition-colors">
                        <Download size={10} /> INSTALL APP
                     </button>
                 )}
                 <div className="px-3 py-1 rounded-full border border-white/10 text-[10px] bg-white/5 uppercase tracking-widest text-purple-400">
                    AI ENGINE
                 </div>
              </div>
           </div>

           {/* Vinyl / Cover Art */}
           <div className="flex-1 flex items-center justify-center relative my-4">
                <div className="absolute inset-0 flex items-center justify-center">
                   <Visualizer isPlaying={isPlaying} colorMode="neon" onBeat={setBeatEnergy} />
                </div>
                
                {/* Center Disk */}
                <div className={`w-64 h-64 md:w-96 md:h-96 rounded-full bg-gradient-to-tr from-gray-900 to-gray-800 border-4 border-gray-950 shadow-2xl flex items-center justify-center relative z-20 ${isPlaying ? 'animate-[spin_6s_linear_infinite]' : 'transition-transform duration-700'}`}>
                    <div className="w-32 h-32 rounded-full bg-gradient-to-br from-cyan-400 to-purple-500 flex items-center justify-center overflow-hidden shadow-inner">
                       <Disc size={48} className="text-white/80" />
                    </div>
                    <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-white/10 to-transparent pointer-events-none"></div>
                </div>
           </div>

           {/* Track Info & Voice Toggle */}
           <div className="z-20 mt-4 flex justify-between items-end">
              <div>
                <h2 className="text-4xl font-bold text-white mb-2 truncate max-w-md">{currentTrack.title}</h2>
                <p className="text-gray-400 text-xl">{currentTrack.artist}</p>
              </div>
              
              <button 
                onClick={toggleVoiceControl}
                className={`p-4 rounded-full transition-all border ${isVoiceActive ? 'bg-red-500/20 border-red-500 text-red-400 animate-pulse' : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'}`}
                title={isVoiceActive ? "Listening (Click to Stop)" : "Start Voice Control"}
              >
                 <Mic2 size={24} />
              </button>
           </div>
        </div>

        {/* Right: Controls & EQ or Playlist */}
        <div className={`w-full md:w-[420px] bg-black/40 flex flex-col overflow-hidden transition-all ${showPlaylist ? 'md:w-[480px]' : ''}`}>
             
             {/* Tab Switcher */}
             <div className="p-6 pb-2">
                <div className="flex p-1 bg-white/5 rounded-xl">
                    <button 
                    onClick={() => setShowPlaylist(false)}
                    className={`flex-1 py-3 text-xs uppercase tracking-widest rounded-lg transition-all ${!showPlaylist ? 'bg-white text-black font-bold shadow-lg' : 'text-gray-400 hover:text-white'}`}
                    >
                        Controls
                    </button>
                    <button 
                    onClick={() => setShowEQ(true)}
                    className={`flex-1 py-3 text-xs uppercase tracking-widest rounded-lg transition-all flex items-center justify-center gap-2 ${showEQ && !showPlaylist ? 'bg-cyan-400 text-black font-bold shadow-lg' : 'text-gray-400 hover:text-white'}`}
                    >
                        Studio Rack
                    </button>
                    <button 
                    onClick={() => setShowPlaylist(true)}
                    className={`flex-1 py-3 text-xs uppercase tracking-widest rounded-lg transition-all flex items-center justify-center gap-2 ${showPlaylist ? 'bg-purple-400 text-black font-bold shadow-lg' : 'text-gray-400 hover:text-white'}`}
                    >
                        <Music size={12} /> Playlist
                    </button>
                </div>
             </div>

             {/* Content Area */}
             <div className="flex-1 p-6 pt-2 overflow-hidden flex flex-col">
                 {showPlaylist ? (
                    <Playlist
                        tracks={playlist}
                        currentTrackId={currentTrack.id}
                        onTrackSelect={handlePlaylistTrackSelect}
                        onTracksAdd={handleAddPlaylistTracks}
                        onTrackRemove={handleRemovePlaylistTrack}
                        onReorder={handleReorderPlaylist}
                        isPlaying={isPlaying}
                    />
                 ) : !showEQ ? (
                     <div className="flex flex-col h-full justify-center space-y-4">
                         <div className="p-6 rounded-3xl bg-gradient-to-br from-purple-900/20 to-black border border-white/5 flex flex-col items-center justify-center text-center space-y-2 h-64">
                             {isVoiceActive ? <Zap size={32} className="text-red-400 mb-2 animate-bounce" /> : <Activity size={32} className="text-purple-400 mb-2" />}
                             <div className="text-xs text-gray-500 uppercase tracking-widest">System Status</div>
                             <div className="text-lg text-white font-mono">
                                 {isVoiceActive ? "VOICE SOCKET CONNECTED" : (isPlaying ? "AUDIO ENGINE ACTIVE" : "READY")}
                             </div>
                             <div className="text-xs text-gray-600">
                                Output: {sampleRate ? `${sampleRate}Hz` : 'Detecting...'} / 32-bit Float
                             </div>
                         </div>
                     </div>
                 ) : (
                    <div className="h-full animate-in fade-in slide-in-from-right-4 duration-300 flex flex-col">
                        <div className="flex-1 min-h-0">
                            <Equalizer 
                                gains={eqGains} 
                                onChange={(idx, val) => {
                                    const newGains = [...eqGains];
                                    newGains[idx] = val;
                                    setEqGains(newGains);
                                }}
                                vocalPresence={vocalPresence}
                                onVocalChange={setVocalPresence}
                                reverbLevel={reverbLevel}
                                onReverbChange={setReverbLevel}
                                stereoWidth={stereoWidth}
                                onWidthChange={setStereoWidth}
                                playbackRate={playbackRate}
                                onRateChange={setPlaybackRate}
                                preAmp={preAmp}
                                onPreAmpChange={setPreAmp}
                                limiterEnabled={limiterEnabled}
                                onLimiterChange={setLimiterEnabled}
                            />
                        </div>
                        <div className="mt-4 pt-4 border-t border-white/10">
                             <div className="text-[10px] uppercase text-gray-500 mb-2">Instant Presets</div>
                             <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                                 {Object.values(PRESETS).map(preset => (
                                     <button 
                                        key={preset.name}
                                        onClick={() => setEqGains(preset.gains)}
                                        className="flex-none px-4 py-2 rounded-full bg-white/5 hover:bg-white/10 text-xs text-gray-300 border border-white/5 transition-colors whitespace-nowrap"
                                     >
                                         {preset.name}
                                     </button>
                                 ))}
                             </div>
                        </div>
                    </div>
                 )}
             </div>

             {/* Footer Controls */}
             <div className="p-6 bg-black/60 border-t border-white/5 backdrop-blur-xl">
                 <PlayerControls 
                    isPlaying={isPlaying} 
                    onPlayPause={handlePlayPause} 
                    currentTime={currentTime}
                    duration={duration}
                    onSeek={handleSeek}
                    onFileChange={handleFileChange}
                    onOpenAI={() => setShowAI(true)}
                 />
             </div>
        </div>
      </div>

      {/* AI Modal */}
      {showAI && (
        <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="w-full max-w-lg bg-[#0a0a0a] border border-purple-500/30 rounded-3xl p-8 shadow-[0_0_100px_rgba(168,85,247,0.15)] relative overflow-hidden">
                <div className="absolute -top-20 -right-20 w-64 h-64 bg-purple-600/20 rounded-full blur-3xl pointer-events-none"></div>

                <div className="flex justify-between items-center mb-8 relative z-10">
                    <h3 className="text-2xl font-bold text-white flex items-center gap-3">
                        <Sparkles className="text-purple-500 fill-purple-500" /> AI Sound Architect
                    </h3>
                    <button onClick={() => setShowAI(false)} className="text-gray-500 hover:text-white p-2 hover:bg-white/10 rounded-full transition-colors"><X size={20}/></button>
                </div>
                
                <div className="mb-8 p-1 rounded-2xl bg-gradient-to-r from-cyan-500 to-purple-600">
                     <button 
                        onClick={() => handleAIGenerate(true)}
                        disabled={isGenerating}
                        className="w-full py-4 px-6 bg-[#0a0a0a] rounded-xl relative overflow-hidden group hover:bg-transparent transition-colors"
                     >
                        <div className="relative z-10 flex items-center justify-center gap-3">
                            {isAnalyzing ? (
                                <Activity className="animate-bounce text-white" />
                            ) : (
                                <Activity className="text-cyan-400 group-hover:text-white transition-colors" />
                            )}
                            <div className="text-left">
                                <div className="text-white font-bold text-lg group-hover:scale-105 transition-transform">
                                    {isAnalyzing ? "Listening & Analyzing..." : "Deep Smart Analyze"}
                                </div>
                                <div className="text-xs text-gray-400 group-hover:text-white/80">
                                    {isAnalyzing ? "Scanning frequency spectrum..." : "Listens to current audio to generate perfect EQ"}
                                </div>
                            </div>
                        </div>
                     </button>
                </div>

                <div className="relative z-10 flex items-center gap-4 mb-4">
                    <div className="h-px bg-white/10 flex-1"></div>
                    <span className="text-xs text-gray-500 uppercase tracking-widest">OR MANUAL PROMPT</span>
                    <div className="h-px bg-white/10 flex-1"></div>
                </div>

                <textarea 
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    className="w-full h-24 bg-white/5 border border-white/10 rounded-xl p-4 text-white focus:outline-none focus:border-purple-500 transition-colors mb-4 resize-none text-sm"
                    placeholder="Describe your desired sound (e.g. 'Crisp vocals for podcast', 'Heavy bass for workout')..."
                />

                <button 
                    onClick={() => handleAIGenerate(false)}
                    disabled={isGenerating || !aiPrompt}
                    className="w-full py-3 bg-white/10 rounded-xl font-bold text-white hover:bg-white/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                    {isGenerating && !isAnalyzing ? "Generating..." : "Generate from Text"}
                </button>
                
                <div className="mt-6 text-center">
                    <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noreferrer" className="text-[10px] text-gray-500 hover:text-gray-300 underline">
                        Billing Information
                    </a>
                </div>
            </div>
        </div>
      )}

      {/* Streaming Source Modal */}
      {showStreamingSource && (
        <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="w-full max-w-2xl bg-[#0a0a0a] border border-orange-500/30 rounded-3xl p-8 shadow-[0_0_100px_rgba(249,115,22,0.15)] relative overflow-hidden max-h-[80vh] flex flex-col">
                <div className="absolute -top-20 -right-20 w-64 h-64 bg-orange-600/20 rounded-full blur-3xl pointer-events-none"></div>

                <div className="flex justify-between items-center mb-6 relative z-10">
                    <h3 className="text-2xl font-bold text-white flex items-center gap-3">
                        <Wifi className="text-orange-500" /> Stream Playlists
                    </h3>
                    <button onClick={() => setShowStreamingSource(false)} className="text-gray-500 hover:text-white p-2 hover:bg-white/10 rounded-full transition-colors"><X size={20}/></button>
                </div>

                <div className="flex-1 overflow-hidden min-h-0 relative z-10">
                    <StreamingSource 
                        onTracksImport={(tracks) => {
                            setPlaylist(prev => [...prev, ...tracks]);
                        }}
                        onClose={() => setShowStreamingSource(false)}
                        onPlayTrack={(track, streamUrl) => {
                            console.log('[App] Playing downloaded track:', track.title);
                            const updatedTrack = { ...track, url: streamUrl };
                            setCurrentTrack(updatedTrack);
                            setPlaylist(prev => {
                                const exists = prev.find(t => t.id === track.id);
                                if (!exists) return [...prev, updatedTrack];
                                return prev;
                            });
                            setYoutubeVideoId(null);
                            setYoutubeVideoTitle('');
                            if (audioRef.current) {
                                audioRef.current.src = streamUrl;
                                audioRef.current.crossOrigin = 'anonymous';
                                audioRef.current.load();
                                audioGraph.resumeContext();
                                audioRef.current.play().then(() => {
                                    setIsPlaying(true);
                                    setShowEQ(true);
                                }).catch(err => {
                                    console.error('[App] Playback error:', err);
                                });
                            }
                        }}
                    />
                </div>
            </div>
        </div>
      )}

      {/* YouTube Embedded Player */}
      {youtubeVideoId && (
        <YouTubePlayer
          videoId={youtubeVideoId}
          title={youtubeVideoTitle}
          onClose={() => {
            setYoutubeVideoId(null);
            setYoutubeVideoTitle('');
          }}
        />
      )}
    </div>
  );
};

export default App;
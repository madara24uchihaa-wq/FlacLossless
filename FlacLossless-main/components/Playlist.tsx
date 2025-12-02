import React, { useRef } from 'react';
import { Track } from '../types';
import { Trash2, Music, Upload, Play, GripVertical } from 'lucide-react';

interface PlaylistProps {
  tracks: Track[];
  currentTrackId: string;
  onTrackSelect: (track: Track) => void;
  onTracksAdd: (files: File[]) => void;
  onTrackRemove: (trackId: string) => void;
  onReorder: (fromIndex: number, toIndex: number) => void;
  isPlaying: boolean;
}

const Playlist: React.FC<PlaylistProps> = ({
  tracks,
  currentTrackId,
  onTrackSelect,
  onTracksAdd,
  onTrackRemove,
  onReorder,
  isPlaying
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const draggedIndexRef = useRef<number | null>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      onTracksAdd(files);
      // Reset input
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDragStart = (index: number) => {
    draggedIndexRef.current = index;
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (index: number) => {
    if (draggedIndexRef.current !== null && draggedIndexRef.current !== index) {
      onReorder(draggedIndexRef.current, index);
      draggedIndexRef.current = null;
    }
  };

  const handleDragEnd = () => {
    draggedIndexRef.current = null;
  };

  return (
    <div className="flex flex-col h-full bg-black/40 backdrop-blur-md rounded-2xl border border-white/10 overflow-hidden">
      {/* Header */}
      <div className="flex-none p-4 border-b border-white/5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-white/80 text-sm font-bold tracking-widest uppercase flex items-center gap-2">
            <Music size={14} />
            Playlist
          </h3>
          <span className="text-xs text-gray-500 bg-white/5 px-2 py-1 rounded">
            {tracks.length} tracks
          </span>
        </div>
        
        {/* Upload Button */}
        <label className="w-full cursor-pointer">
          <div className="w-full py-2 px-3 rounded-lg bg-gradient-to-r from-cyan-500/20 to-purple-600/20 hover:from-cyan-500/30 hover:to-purple-600/30 border border-cyan-500/30 flex items-center justify-center gap-2 transition-all group">
            <Upload size={14} className="text-cyan-400 group-hover:text-cyan-300" />
            <span className="text-xs font-bold text-cyan-300 group-hover:text-cyan-200">Add Tracks</span>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="audio/*,.flac"
            onChange={handleFileSelect}
            className="hidden"
          />
        </label>
      </div>

      {/* Tracks List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {tracks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-4 text-center">
            <Music size={24} className="text-gray-600 mb-2" />
            <p className="text-xs text-gray-500">No tracks yet</p>
            <p className="text-[10px] text-gray-600 mt-1">Upload audio files to start</p>
          </div>
        ) : (
          <div className="p-2 space-y-1">
            {tracks.map((track, index) => (
              <div
                key={track.id}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={handleDragOver}
                onDrop={() => handleDrop(index)}
                onDragEnd={handleDragEnd}
                onClick={() => onTrackSelect(track)}
                className={`group p-2 rounded-lg cursor-pointer transition-all flex items-center gap-2 ${
                  currentTrackId === track.id
                    ? 'bg-cyan-500/20 border border-cyan-500/40'
                    : 'bg-white/5 border border-white/5 hover:bg-white/10'
                }`}
              >
                {/* Drag Handle */}
                <div className="flex-none text-gray-600 group-hover:text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity">
                  <GripVertical size={12} />
                </div>

                {/* Play Indicator */}
                <div className="flex-none w-3 h-3 rounded-full flex items-center justify-center">
                  {currentTrackId === track.id && isPlaying ? (
                    <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse" />
                  ) : currentTrackId === track.id ? (
                    <div className="w-2 h-2 bg-cyan-400 rounded-full" />
                  ) : (
                    <Music size={10} className="text-gray-600" />
                  )}
                </div>

                {/* Track Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-white truncate">
                    {track.title}
                  </p>
                  <p className="text-[10px] text-gray-500 truncate">
                    {track.artist}
                  </p>
                  {track.id.startsWith('youtube-') && (
                    <p className="text-[9px] text-amber-500/70">🔗 YouTube Link</p>
                  )}
                </div>

                {/* Delete Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onTrackRemove(track.id);
                  }}
                  className="flex-none text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all p-1 hover:bg-red-500/10 rounded"
                  title="Remove track"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="flex-none p-2 border-t border-white/5 bg-black/60 text-[9px] text-gray-600 text-center">
        Drag to reorder • Click to play
      </div>
    </div>
  );
};

export default Playlist;

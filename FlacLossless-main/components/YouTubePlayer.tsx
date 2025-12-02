import React from 'react';
import { X, ExternalLink } from 'lucide-react';

interface YouTubePlayerProps {
  videoId: string;
  title: string;
  onClose: () => void;
}

const YouTubePlayer: React.FC<YouTubePlayerProps> = ({ videoId, title, onClose }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm">
      <div className="w-full max-w-4xl mx-4">
        <div className="bg-gradient-to-b from-gray-900 to-black rounded-2xl border border-white/10 overflow-hidden shadow-2xl">
          <div className="flex items-center justify-between p-4 border-b border-white/10">
            <div className="flex-1 min-w-0">
              <h3 className="text-white font-bold truncate">{title}</h3>
              <p className="text-xs text-red-400 flex items-center gap-1 mt-1">
                <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                Playing from YouTube
              </p>
            </div>
            <div className="flex items-center gap-2 ml-4">
              <a
                href={`https://www.youtube.com/watch?v=${videoId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 hover:bg-white/10 rounded-lg transition-colors text-gray-400 hover:text-white"
                title="Open in YouTube"
              >
                <ExternalLink size={18} />
              </a>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors text-gray-400 hover:text-white"
                title="Close player"
              >
                <X size={18} />
              </button>
            </div>
          </div>
          
          <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
            <iframe
              className="absolute inset-0 w-full h-full"
              src={`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1`}
              title={title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
          
          <div className="p-3 bg-black/60 text-center">
            <p className="text-xs text-gray-500">
              Use the YouTube player controls above to play, pause, and seek
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default YouTubePlayer;

import React from 'react';
import { Loader, CheckCircle, XCircle, Music, Download } from 'lucide-react';
import { DownloadJob } from '../services/downloadJobService';

interface DownloadProgressProps {
  job: DownloadJob | null;
  onClose: () => void;
}

const DownloadProgress: React.FC<DownloadProgressProps> = ({ job, onClose }) => {
  if (!job) return null;

  const getStatusIcon = () => {
    switch (job.status) {
      case 'queued':
        return <Loader size={24} className="animate-spin text-gray-400" />;
      case 'downloading':
        return <Download size={24} className="text-cyan-400 animate-pulse" />;
      case 'completed':
        return <CheckCircle size={24} className="text-green-400" />;
      case 'failed':
        return <XCircle size={24} className="text-red-400" />;
      default:
        return <Music size={24} className="text-purple-400" />;
    }
  };

  const getProgressColor = () => {
    switch (job.status) {
      case 'completed':
        return 'bg-green-500';
      case 'failed':
        return 'bg-red-500';
      default:
        return 'bg-gradient-to-r from-cyan-500 to-purple-500';
    }
  };

  const getStageText = () => {
    if (job.status === 'completed') {
      return job.stage === 'Loaded from cache' ? 'Loaded from cache!' : 'Ready to play!';
    }
    if (job.status === 'failed') {
      return job.error || 'Download failed';
    }
    return job.stage;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-gray-900/95 border border-white/10 rounded-2xl p-6 w-full max-w-md mx-4 shadow-2xl">
        <div className="flex items-start gap-4 mb-4">
          {job.metadata?.thumbnail ? (
            <img 
              src={job.metadata.thumbnail} 
              alt={job.title}
              className="w-16 h-16 rounded-lg object-cover flex-none"
            />
          ) : (
            <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-purple-500 to-cyan-500 flex items-center justify-center flex-none">
              <Music size={28} className="text-white" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h3 className="text-white font-bold text-lg truncate">{job.title || 'Loading...'}</h3>
            <p className="text-gray-400 text-sm truncate">
              {job.metadata?.uploader || 'YouTube'}
            </p>
          </div>
        </div>

        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              {getStatusIcon()}
              <span className="text-white text-sm font-medium">{getStageText()}</span>
            </div>
            <span className="text-cyan-400 font-mono text-sm font-bold">
              {job.progress}%
            </span>
          </div>
          
          <div className="w-full h-3 bg-gray-800 rounded-full overflow-hidden">
            <div 
              className={`h-full transition-all duration-300 ease-out ${getProgressColor()}`}
              style={{ width: `${job.progress}%` }}
            />
          </div>
        </div>

        {job.status === 'failed' && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 mb-4">
            <p className="text-red-400 text-sm">{job.error}</p>
          </div>
        )}

        {job.status === 'completed' && (
          <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3 mb-4">
            <p className="text-green-400 text-sm flex items-center gap-2">
              <CheckCircle size={16} /> Download complete! Playing now...
            </p>
          </div>
        )}

        {(job.status === 'completed' || job.status === 'failed') && (
          <button
            onClick={onClose}
            className="w-full py-3 bg-white/10 hover:bg-white/20 text-white rounded-lg font-medium transition-colors"
          >
            Close
          </button>
        )}

        {(job.status === 'queued' || job.status === 'downloading') && (
          <div className="flex items-center justify-center gap-2 text-gray-500 text-xs">
            <div className="w-1.5 h-1.5 bg-cyan-500 rounded-full animate-pulse" />
            Processing with yt-dlp...
          </div>
        )}
      </div>
    </div>
  );
};

export default DownloadProgress;

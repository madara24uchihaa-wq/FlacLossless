import React, { useState, useEffect } from 'react';
import { Music, Search, Play, Loader, X, Youtube } from 'lucide-react';
import { spotifyService, type SpotifyPlaylist, type SpotifyTrack } from '../services/spotifyService';
import { youtubeService } from '../services/youtubeService';
import { downloadJobService, type DownloadJob } from '../services/downloadJobService';
import { Track } from '../types';
import DownloadProgress from './DownloadProgress';

interface StreamingSourceProps {
  onTracksImport: (tracks: Track[]) => void;
  onClose: () => void;
  onPlayTrack: (track: Track, streamUrl: string) => void;
}

interface YouTubeVideo {
  id: string;
  title: string;
  channelTitle: string;
  thumbnail: string;
  videoId: string;
  url: string;
  duration?: number;
}

const StreamingSource: React.FC<StreamingSourceProps> = ({ onTracksImport, onClose, onPlayTrack }) => {
  const [activeTab, setActiveTab] = useState<'spotify' | 'youtube'>('youtube');
  const [spotifyAuth, setSpotifyAuth] = useState(spotifyService.isAuthenticated());
  const [searchQuery, setSearchQuery] = useState('');
  const [spotifyPlaylists, setSpotifyPlaylists] = useState<SpotifyPlaylist[]>([]);
  const [youtubeResults, setYoutubeResults] = useState<YouTubeVideo[]>([]);
  const [selectedPlaylist, setSelectedPlaylist] = useState<SpotifyPlaylist | null>(null);
  const [playlistTracks, setPlaylistTracks] = useState<SpotifyTrack[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [currentDownload, setCurrentDownload] = useState<DownloadJob | null>(null);
  const [downloadingVideoId, setDownloadingVideoId] = useState<string | null>(null);

  useEffect(() => {
    spotifyService.handleCallback();
    setSpotifyAuth(true);
  }, []);

  const handleSpotifyLogin = () => {
    spotifyService.login();
  };

  const handleSpotifyLogout = () => {
    spotifyService.logout();
    setSpotifyAuth(false);
    setSpotifyPlaylists([]);
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setLoading(true);
    setError(null);
    setSelectedPlaylist(null);
    setPlaylistTracks([]);
    setYoutubeResults([]);
    
    try {
      if (activeTab === 'spotify' && spotifyAuth) {
        const playlists = await spotifyService.searchPlaylists(searchQuery);
        setSpotifyPlaylists(playlists);
      } else if (activeTab === 'youtube') {
        console.log('[StreamingSource] Searching YouTube for:', searchQuery);
        const songs = await youtubeService.searchSongs(searchQuery);
        console.log('[StreamingSource] Got results:', songs.length);
        setYoutubeResults(songs as YouTubeVideo[]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed');
    } finally {
      setLoading(false);
    }
  };

  const handleYouTubeVideoClick = async (video: YouTubeVideo) => {
    console.log('[StreamingSource] Video clicked:', video.title);
    setDownloadingVideoId(video.videoId);
    setError(null);
    
    try {
      await downloadJobService.createJob(
        video.url,
        video.title,
        (job) => {
          setCurrentDownload(job);
        },
        (job) => {
          console.log('[StreamingSource] Download complete:', job.stream_url);
          setCurrentDownload(job);
          setDownloadingVideoId(null);
          
          if (job.stream_url) {
            const track: Track = {
              id: `youtube-${job.video_id}`,
              title: job.metadata?.title || video.title,
              artist: job.metadata?.uploader || video.channelTitle,
              url: job.stream_url,
              cover: job.metadata?.thumbnail || video.thumbnail
            };
            
            const fullStreamUrl = downloadJobService.getStreamUrl(job.stream_url);
            console.log('[StreamingSource] Playing track:', track.title, 'URL:', fullStreamUrl);
            
            setTimeout(() => {
              onPlayTrack(track, fullStreamUrl);
              setCurrentDownload(null);
              onClose();
            }, 1500);
          }
        },
        (errorMsg) => {
          console.error('[StreamingSource] Download error:', errorMsg);
          setError(errorMsg);
          setDownloadingVideoId(null);
          setCurrentDownload((prev) => prev ? { ...prev, status: 'failed', error: errorMsg } : null);
        }
      );
    } catch (err) {
      console.error('[StreamingSource] Job creation failed:', err);
      setError(err instanceof Error ? err.message : 'Download failed');
      setDownloadingVideoId(null);
    }
  };

  const handlePlaylistSelect = async (playlist: SpotifyPlaylist) => {
    setSelectedPlaylist(playlist);
    setLoading(true);
    try {
      const tracks = await spotifyService.getPlaylistTracks(playlist.id);
      setPlaylistTracks(tracks);
    } finally {
      setLoading(false);
    }
  };

  const handleImportSpotifyPlaylist = () => {
    if (!playlistTracks || playlistTracks.length === 0) {
      alert('No tracks to import');
      return;
    }

    const importedTracks: Track[] = playlistTracks
      .filter((item: any) => item && item.id)
      .map((spotifyTrack: SpotifyTrack) => {
        let url = spotifyTrack.preview_url || '';
        if (!url) {
          url = spotifyTrack.external_urls?.spotify || '';
        }
        
        return {
          id: `spotify-${spotifyTrack.id}`,
          title: spotifyTrack.name || 'Unknown',
          artist: spotifyTrack.artists?.map(a => a.name).join(', ') || 'Unknown',
          url: url,
          cover: spotifyTrack.album?.images[0]?.url || ''
        };
      })
      .filter(track => track.url);

    if (importedTracks.length === 0) {
      alert('No playable tracks found in this playlist.');
      return;
    }

    onTracksImport(importedTracks);
    onClose();
  };

  const formatDuration = (seconds: number): string => {
    if (!seconds) return '';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const closeDownloadProgress = () => {
    setCurrentDownload(null);
    setDownloadingVideoId(null);
  };

  return (
    <>
      <div className="w-full h-full flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-white font-bold text-lg">Stream Music</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X size={20} />
          </button>
        </div>

        <div className="flex gap-2 mb-4 p-1 bg-white/5 rounded-lg">
          <button
            onClick={() => setActiveTab('youtube')}
            className={`flex-1 py-2 px-3 rounded text-sm font-bold transition-all flex items-center justify-center gap-2 ${
              activeTab === 'youtube'
                ? 'bg-red-500 text-white'
                : 'bg-transparent text-gray-400 hover:text-white'
            }`}
          >
            <Youtube size={16} /> YouTube
          </button>
          <button
            onClick={() => setActiveTab('spotify')}
            className={`flex-1 py-2 px-3 rounded text-sm font-bold transition-all ${
              activeTab === 'spotify'
                ? 'bg-green-500 text-white'
                : 'bg-transparent text-gray-400 hover:text-white'
            }`}
          >
            Spotify
          </button>
        </div>

        {activeTab === 'youtube' && (
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-none mb-4 flex gap-2">
              <input
                type="text"
                placeholder="Search for any song..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="flex-1 px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-red-500/50"
              />
              <button
                onClick={handleSearch}
                disabled={loading}
                className="px-4 py-3 bg-red-500 hover:bg-red-600 disabled:bg-gray-600 text-white rounded-lg font-bold transition-colors"
              >
                {loading ? <Loader size={18} className="animate-spin" /> : <Search size={18} />}
              </button>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 mb-4">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-1">
              {youtubeResults.length > 0 ? (
                youtubeResults.map((video) => {
                  const isDownloading = downloadingVideoId === video.videoId;
                  
                  return (
                    <div
                      key={video.videoId}
                      onClick={() => !isDownloading && handleYouTubeVideoClick(video)}
                      className={`p-3 rounded-lg transition-all cursor-pointer group ${
                        isDownloading 
                          ? 'bg-red-500/20 border border-red-500/50' 
                          : 'bg-white/5 hover:bg-white/10 border border-transparent hover:border-red-500/30'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="relative flex-none">
                          {video.thumbnail ? (
                            <img
                              src={video.thumbnail}
                              alt={video.title}
                              className="w-14 h-14 rounded-lg object-cover"
                            />
                          ) : (
                            <div className="w-14 h-14 rounded-lg bg-red-500/20 flex items-center justify-center">
                              <Music size={20} className="text-red-400" />
                            </div>
                          )}
                          <div className={`absolute inset-0 rounded-lg flex items-center justify-center transition-opacity ${
                            isDownloading ? 'opacity-100 bg-black/50' : 'opacity-0 group-hover:opacity-100 bg-black/40'
                          }`}>
                            {isDownloading ? (
                              <Loader size={24} className="text-white animate-spin" />
                            ) : (
                              <Play size={24} className="text-white" fill="white" />
                            )}
                          </div>
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-white truncate text-sm mb-0.5">
                            {video.title}
                          </div>
                          <div className="text-gray-500 truncate text-xs">
                            {video.channelTitle}
                          </div>
                        </div>
                        
                        {video.duration && (
                          <div className="text-gray-500 text-xs font-mono">
                            {formatDuration(video.duration)}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                  <Youtube size={48} className="mb-4 opacity-50" />
                  <p className="text-sm">Search for a song to get started</p>
                  <p className="text-xs mt-1 text-gray-600">Click any result to download and play</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'spotify' && (
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-none mb-4 flex gap-2">
              <input
                type="text"
                placeholder="Search playlists..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="flex-1 px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-green-500/50"
              />
              <button
                onClick={handleSearch}
                disabled={loading}
                className="px-4 py-3 bg-green-500 hover:bg-green-600 disabled:bg-gray-600 text-white rounded-lg font-bold transition-colors"
              >
                {loading ? <Loader size={18} className="animate-spin" /> : <Search size={18} />}
              </button>
            </div>

            {selectedPlaylist ? (
              <div className="flex-1 flex flex-col overflow-hidden">
                <button
                  onClick={() => {
                    setSelectedPlaylist(null);
                    setPlaylistTracks([]);
                  }}
                  className="mb-3 text-xs text-green-400 hover:text-green-300 text-left"
                >
                  ← Back to playlists
                </button>
                <div className="text-sm font-bold mb-3 text-white">
                  {selectedPlaylist.name}
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar space-y-1">
                  {playlistTracks.map((track: any, idx: number) => (
                    <div key={track?.id || `track-${idx}`} className="p-2 bg-white/5 rounded hover:bg-white/10 text-xs">
                      <div className="font-semibold text-white truncate">{track?.name || 'Unknown Track'}</div>
                      <div className="text-gray-500 truncate">
                        {track?.artists?.map((a: any) => a.name).join(', ') || 'Unknown Artist'}
                      </div>
                    </div>
                  ))}
                </div>
                <button
                  onClick={handleImportSpotifyPlaylist}
                  className="mt-4 w-full py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-colors"
                >
                  <Music size={16} /> Import Playlist
                </button>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2">
                {spotifyPlaylists.map((playlist) => (
                  <div
                    key={playlist.id}
                    onClick={() => handlePlaylistSelect(playlist)}
                    className="p-3 bg-white/5 hover:bg-white/10 rounded-lg cursor-pointer transition-colors group"
                  >
                    <div className="flex items-start gap-3">
                      {playlist.images[0] && (
                        <img
                          src={playlist.images[0].url}
                          alt={playlist.name}
                          className="w-12 h-12 rounded object-cover flex-none"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-white truncate text-sm">{playlist.name}</div>
                        <div className="text-gray-500 truncate text-xs">{playlist.description}</div>
                      </div>
                      <Play size={18} className="flex-none text-green-400 opacity-0 group-hover:opacity-100 transition-opacity mt-1" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {currentDownload && (
        <DownloadProgress job={currentDownload} onClose={closeDownloadProgress} />
      )}
    </>
  );
};

export default StreamingSource;

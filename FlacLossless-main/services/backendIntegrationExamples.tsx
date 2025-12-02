/**
 * Example: How to use backend service in React components
 * Copy patterns from here into your components (YouTubePlayer, Playlist, etc.)
 */

import { useState, useEffect } from 'react';
import { backendService, type BackendMetadata } from '../services/backendService';
import { youtubeService } from '../services/youtubeService';

interface Song {
  id: string;
  title: string;
  streamUrl: string;
  metadata: BackendMetadata;
  cached: boolean;
}

/**
 * Example 1: Simple Audio Player with Backend
 */
export function BackendAudioPlayerExample() {
  const [song, setSong] = useState<Song | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [backendOnline, setBackendOnline] = useState(false);

  // Check if backend is running
  useEffect(() => {
    backendService.healthCheck().then(setBackendOnline);
  }, []);

  const playSong = async (youtubeUrl: string) => {
    setLoading(true);
    setError('');

    try {
      if (!backendOnline) throw new Error('Backend not running');

      // Download audio via backend
      const result = await backendService.downloadAudio(youtubeUrl);

      setSong({
        id: result.videoId,
        title: result.metadata.title,
        streamUrl: result.streamUrl,
        metadata: result.metadata,
        cached: result.cached
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to play');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px' }}>
      <h2>Backend Audio Player</h2>

      {!backendOnline && (
        <div style={{ color: 'red', marginBottom: '10px' }}>
          ⚠️ Backend not running. Start with: <code>python backend/server.py</code>
        </div>
      )}

      {error && <div style={{ color: 'red' }}>{error}</div>}

      <input
        type="text"
        placeholder="YouTube URL or Video ID"
        onKeyPress={(e) => {
          if (e.key === 'Enter') {
            const input = (e.target as HTMLInputElement).value;
            const url = input.includes('youtube.com')
              ? input
              : `https://www.youtube.com/watch?v=${input}`;
            playSong(url);
          }
        }}
      />

      {loading && <p>⏳ Downloading and converting...</p>}

      {song && (
        <div style={{ marginTop: '20px' }}>
          <h3>{song.title}</h3>
          {song.metadata.thumbnail && (
            <img src={song.metadata.thumbnail} alt={song.title} width="200" />
          )}
          <p>
            {song.metadata.uploader} • {Math.floor(song.metadata.duration / 60)}:
            {(song.metadata.duration % 60).toString().padStart(2, '0')}
          </p>
          <p>{song.cached ? '✓ Cached' : '✓ Downloaded'}</p>

          <audio controls style={{ width: '100%' }}>
            <source src={song.streamUrl} type="audio/mpeg" />
          </audio>
        </div>
      )}
    </div>
  );
}

/**
 * Example 2: Playlist with Caching
 */
export function BackendPlaylistExample() {
  const [playlist, setPlaylist] = useState<Song[]>([]);
  const [cached, setCached] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Load cached songs
  useEffect(() => {
    backendService.listCache().then(setCached);
  }, []);

  const addToPlaylist = async (youtubeUrl: string) => {
    try {
      const result = await backendService.downloadAudio(youtubeUrl);
      const newSong: Song = {
        id: result.videoId,
        title: result.metadata.title,
        streamUrl: result.streamUrl,
        metadata: result.metadata,
        cached: result.cached
      };
      setPlaylist([...playlist, newSong]);
    } catch (e) {
      console.error('Failed to add:', e);
    }
  };

  const deleteFromCache = async (videoId: string) => {
    const success = await backendService.deleteCached(videoId);
    if (success) {
      setCached(cached.filter((c) => c.video_id !== videoId));
      setPlaylist(playlist.filter((s) => s.id !== videoId));
    }
  };

  return (
    <div>
      <h2>Playlist with Backend Caching</h2>

      <div style={{ marginBottom: '20px' }}>
        <h3>Current Song</h3>
        {playlist[currentIndex] && (
          <div>
            <p>{playlist[currentIndex].title}</p>
            <audio controls src={playlist[currentIndex].streamUrl} autoPlay />
            <button onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}>
              ← Previous
            </button>
            <button onClick={() => setCurrentIndex(Math.min(playlist.length - 1, currentIndex + 1))}>
              Next →
            </button>
          </div>
        )}
      </div>

      <div>
        <h3>Playlist ({playlist.length})</h3>
        <ul>
          {playlist.map((song, idx) => (
            <li key={song.id}>
              {idx + 1}. {song.title} {song.cached && '✓'}
            </li>
          ))}
        </ul>
      </div>

      <div>
        <h3>Cached Songs ({cached.length})</h3>
        <ul>
          {cached.map((item) => (
            <li key={item.video_id}>
              {item.title}
              <button onClick={() => deleteFromCache(item.video_id)}>Delete</button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/**
 * Example 3: YouTube Search + Backend Download
 */
export function SearchAndPlayExample() {
  const [results, setResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);

  const searchAndDownload = async (query: string) => {
    setSearching(true);
    try {
      // Use YouTube search API
      const videos = await youtubeService.searchSongs(query);

      // Pre-download and cache some results
      for (const video of videos.slice(0, 3)) {
        await backendService.downloadAudio(video.url);
      }

      setResults(videos);
    } catch (e) {
      console.error('Search failed:', e);
    } finally {
      setSearching(false);
    }
  };

  return (
    <div>
      <h2>Search YouTube + Backend</h2>
      <input
        type="text"
        placeholder="Search songs..."
        onKeyPress={(e) => {
          if (e.key === 'Enter') {
            searchAndDownload((e.target as HTMLInputElement).value);
          }
        }}
      />

      {searching && <p>Searching and caching...</p>}

      <ul>
        {results.map((video) => (
          <li key={video.videoId}>
            <img src={video.thumbnail} alt={video.title} width="50" />
            {video.title}
            <button
              onClick={async () => {
                const result = await backendService.downloadAudio(video.url);
                // Play it
                const audio = new Audio(result.streamUrl);
                audio.play();
              }}
            >
              Play
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Example 4: Backend Status Display
 */
export function BackendStatusExample() {
  const [status, setStatus] = useState<any>(null);
  const [online, setOnline] = useState(false);

  useEffect(() => {
    const checkStatus = async () => {
      const isOnline = await backendService.healthCheck();
      setOnline(isOnline);

      if (isOnline) {
        const st = await backendService.getStatus();
        setStatus(st);
      }
    };

    checkStatus();
    const interval = setInterval(checkStatus, 5000); // Check every 5 seconds

    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ padding: '10px', border: '1px solid #ccc', borderRadius: '4px' }}>
      <h3>Backend Status</h3>
      {online ? (
        <>
          <p style={{ color: 'green' }}>✓ Online</p>
          {status && (
            <ul>
              <li>Audio Dir: {status.audio_dir}</li>
              <li>Cached Videos: {status.cached_videos}</li>
              <li>Cleanup: {status.cleanup_hours}h</li>
            </ul>
          )}
        </>
      ) : (
        <p style={{ color: 'red' }}>✗ Offline</p>
      )}
    </div>
  );
}

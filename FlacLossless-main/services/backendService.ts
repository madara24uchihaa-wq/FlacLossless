/**
 * Backend Service - Connects to local/remote yt-dlp Flask server
 * Replaces direct YouTube API calls with server-side extraction
 */

// Determine backend URL based on environment
const getBackendBaseUrl = (): string => {
  const envUrl = (import.meta as any).env.VITE_BACKEND_URL;
  if (envUrl) {
    console.log('[Backend] Using env URL:', envUrl);
    return envUrl;
  }
  
  // In browser environment
  if (typeof window !== 'undefined') {
    const protocol = window.location.protocol; // https: or http:
    const hostname = window.location.hostname;  // domain name or localhost
    const port = window.location.port;          // 5000, empty string, etc
    
    console.log('[Backend] Detecting URL - protocol:', protocol, 'hostname:', hostname, 'port:', port);
    
    // GitHub Codespaces: Replace port 5000 with 3001 in the hostname
    // From: miniature-goldfish-97xvpx5vvrjw3x9j5-5000.app.github.dev
    // To:   miniature-goldfish-97xvpx5vvrjw3x9j5-3001.app.github.dev
    if (hostname.includes('-5000')) {
      const backendHostname = hostname.replace('-5000', '-3001');
      const backendUrl = `${protocol}//${backendHostname}`;
      console.log('[Backend] GitHub Codespaces detected, using:', backendUrl);
      return backendUrl;
    }
    
    // For localhost development: use port 3001
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      const backendUrl = `${protocol}//${hostname}:3001`;
      console.log('[Backend] Local dev detected, using:', backendUrl);
      return backendUrl;
    }
  }
  
  // Fallback: use relative URLs for Vite proxy
  console.log('[Backend] Using relative URLs (Vite proxy)');
  return '';
};

const BACKEND_URL = getBackendBaseUrl();
console.log('[Backend] Final BACKEND_URL:', BACKEND_URL);

function getBackendUrl(path: string): string {
  const fullUrl = `${BACKEND_URL}${path}`;
  console.log('[Backend] Request URL:', fullUrl);
  return fullUrl;
}

interface BackendMetadata {
  title: string;
  duration: number;
  thumbnail: string;
  uploader: string;
}

interface DownloadResponse {
  file: string; // e.g., "/stream/uuid.mp3"
  metadata: BackendMetadata;
  cached: boolean;
  video_id: string;
}

interface CacheEntry {
  video_id: string;
  title: string;
  downloaded_at: string;
  file_exists: boolean;
}

interface CacheResponse {
  cached: number;
  items: CacheEntry[];
}

class BackendService {
  /**
   * Download audio from YouTube via backend
   * @param url YouTube URL (e.g., https://www.youtube.com/watch?v=...)
   * @returns Stream URL and metadata
   */
  async downloadAudio(url: string): Promise<{
    streamUrl: string;
    metadata: BackendMetadata;
    videoId: string;
    cached: boolean;
  }> {
    try {
      const response = await fetch(getBackendUrl(`/download?url=${encodeURIComponent(url)}`), {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `Backend error: ${response.status}`);
      }

      const data: DownloadResponse = await response.json();

      return {
        streamUrl: getBackendUrl(data.file),
        metadata: data.metadata,
        videoId: data.video_id,
        cached: data.cached
      };
    } catch (e) {
      console.error('[Backend] Download failed:', e);
      throw e;
    }
  }

  /**
   * Get metadata for a cached video without re-downloading
   */
  async getMetadata(videoId: string): Promise<{
    metadata: BackendMetadata;
    streamUrl: string;
  }> {
    try {
      const response = await fetch(getBackendUrl(`/metadata/${videoId}`), {
        headers: { 'Accept': 'application/json' }
      });

      if (!response.ok) {
        throw new Error('Metadata not found in cache');
      }

      const data = await response.json();

      return {
        metadata: data.metadata,
        streamUrl: getBackendUrl(data.file)
      };
    } catch (e) {
      console.error('[Backend] Metadata fetch failed:', e);
      throw e;
    }
  }

  /**
   * Get all cached videos
   */
  async listCache(): Promise<CacheEntry[]> {
    try {
      const response = await fetch(getBackendUrl('/cache'), {
        headers: { 'Accept': 'application/json' }
      });

      if (!response.ok) throw new Error(`Failed to list cache: ${response.status}`);

      const data: CacheResponse = await response.json();
      return data.items;
    } catch (e) {
      console.error('[Backend] Cache list failed:', e);
      return [];
    }
  }

  /**
   * Delete a cached video
   */
  async deleteCached(videoId: string): Promise<boolean> {
    try {
      const response = await fetch(getBackendUrl(`/cache/${videoId}`), {
        method: 'DELETE',
        headers: { 'Accept': 'application/json' }
      });

      if (!response.ok) throw new Error(`Delete failed: ${response.status}`);

      return true;
    } catch (e) {
      console.error('[Backend] Delete failed:', e);
      return false;
    }
  }

  /**
   * Health check - verify backend is running
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(getBackendUrl('/health'), {
        signal: AbortSignal.timeout(5000)
      });
      return response.ok;
    } catch (e) {
      console.warn('[Backend] Health check failed:', e);
      return false;
    }
  }

  /**
   * Get backend status for UI display
   */
  async getStatus() {
    try {
      const response = await fetch(getBackendUrl('/health'));
      if (response.ok) {
        return await response.json();
      }
    } catch (e) {
      console.warn('[Backend] Status unavailable');
    }
    return null;
  }

  /**
   * Search YouTube for videos via backend (no API key required)
   */
  async searchYouTube(query: string, limit: number = 10): Promise<YouTubeVideo[]> {
    try {
      const response = await fetch(getBackendUrl(`/search?q=${encodeURIComponent(query)}&limit=${limit}`), {
        headers: { 'Accept': 'application/json' }
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `Search failed: ${response.status}`);
      }

      const data = await response.json();
      return data.results || [];
    } catch (e) {
      console.error('[Backend] Search failed:', e);
      return [];
    }
  }
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

export const backendService = new BackendService();
export type { BackendMetadata, DownloadResponse, CacheEntry, CacheResponse, YouTubeVideo };

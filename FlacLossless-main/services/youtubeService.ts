import { backendService, type YouTubeVideo as YouTubeVideoType } from './backendService';

export type YouTubeVideo = YouTubeVideoType;

interface YouTubePlaylist {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
}

class YouTubeService {
  async getPlayableAudioUrl(videoId: string): Promise<string> {
    try {
      try {
        console.log(`[YouTube] Checking backend cache for: ${videoId}`);
        const cached = await backendService.getMetadata(videoId);
        console.log(`[YouTube] Cache hit: ${videoId}`);
        return cached.streamUrl;
      } catch (e) {
      }

      const youtubeUrl = `https://www.youtube.com/watch?v=${videoId}`;
      console.log(`[YouTube] Downloading via backend: ${youtubeUrl}`);

      const result = await backendService.downloadAudio(youtubeUrl);
      
      console.log(`[YouTube] Got audio from backend:`, {
        title: result.metadata.title,
        cached: result.cached,
        streamUrl: result.streamUrl.substring(0, 60)
      });

      return result.streamUrl;
    } catch (e) {
      console.error('[YouTube] Backend audio extraction failed:', e);
      throw e;
    }
  }

  async searchSongs(query: string): Promise<YouTubeVideo[]> {
    try {
      console.log(`[YouTube] Searching for: ${query}`);
      const results = await backendService.searchYouTube(query);
      console.log(`[YouTube] Found ${results.length} results`);
      return results;
    } catch (e) {
      console.error('[YouTube] Search failed:', e);
      return [];
    }
  }

  async searchPlaylists(query: string): Promise<YouTubePlaylist[]> {
    console.log('[YouTube] Playlist search not implemented via backend');
    return [];
  }

  async getPlaylistItems(playlistId: string): Promise<YouTubeVideo[]> {
    console.log('[YouTube] Playlist items not implemented via backend');
    return [];
  }
}

export const youtubeService = new YouTubeService();
export type { YouTubePlaylist };

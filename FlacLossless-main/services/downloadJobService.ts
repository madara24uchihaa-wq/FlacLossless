interface DownloadJob {
  job_id: string;
  video_id: string;
  url: string;
  title: string;
  status: 'queued' | 'downloading' | 'completed' | 'failed';
  progress: number;
  stage: string;
  error: string | null;
  stream_url: string | null;
  metadata: {
    title?: string;
    duration?: number;
    thumbnail?: string;
    uploader?: string;
  };
  created_at: string;
}

type ProgressCallback = (job: DownloadJob) => void;
type CompleteCallback = (job: DownloadJob) => void;
type ErrorCallback = (error: string) => void;

const getBackendUrl = (): string => {
  // Check for environment variable first (for production/Vercel)
  if (import.meta.env.VITE_BACKEND_URL) {
    return import.meta.env.VITE_BACKEND_URL;
  }
  
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    const protocol = window.location.protocol;
    
    if (hostname.includes('-5000')) {
      return `${protocol}//${hostname.replace('-5000', '-3001')}`;
    }
    
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return `${protocol}//${hostname}:3001`;
    }
  }
  return '';
};

class DownloadJobService {
  private baseUrl: string;
  private activeJobs: Map<string, EventSource> = new Map();

  constructor() {
    this.baseUrl = getBackendUrl();
    console.log('[DownloadJob] Backend URL:', this.baseUrl);
  }

  async createJob(
    url: string,
    title: string,
    onProgress: ProgressCallback,
    onComplete: CompleteCallback,
    onError: ErrorCallback
  ): Promise<string> {
    try {
      console.log('[DownloadJob] Creating job for:', title);
      
      const response = await fetch(`${this.baseUrl}/jobs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url, title }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create download job');
      }

      const job: DownloadJob = await response.json();
      console.log('[DownloadJob] Job created:', job.job_id, 'Status:', job.status);

      if (job.status === 'completed') {
        console.log('[DownloadJob] Already cached, completing immediately');
        onComplete(job);
        return job.job_id;
      }

      this.subscribeToJob(job.job_id, onProgress, onComplete, onError);
      return job.job_id;
    } catch (e) {
      console.error('[DownloadJob] Create job failed:', e);
      onError(e instanceof Error ? e.message : 'Unknown error');
      throw e;
    }
  }

  private subscribeToJob(
    jobId: string,
    onProgress: ProgressCallback,
    onComplete: CompleteCallback,
    onError: ErrorCallback
  ): void {
    if (this.activeJobs.has(jobId)) {
      console.log('[DownloadJob] Already subscribed to job:', jobId);
      return;
    }

    const eventSource = new EventSource(`${this.baseUrl}/jobs/${jobId}/events`);
    this.activeJobs.set(jobId, eventSource);

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.type === 'heartbeat') {
          return;
        }

        const job = data as DownloadJob;
        console.log('[DownloadJob] Progress update:', job.progress + '%', job.stage);
        
        onProgress(job);

        if (job.status === 'completed') {
          console.log('[DownloadJob] Download completed!');
          onComplete(job);
          this.unsubscribe(jobId);
        } else if (job.status === 'failed') {
          console.error('[DownloadJob] Download failed:', job.error);
          onError(job.error || 'Download failed');
          this.unsubscribe(jobId);
        }
      } catch (e) {
        console.error('[DownloadJob] Error parsing event:', e);
      }
    };

    eventSource.onerror = (error) => {
      console.error('[DownloadJob] SSE connection error:', error);
      this.unsubscribe(jobId);
      
      this.checkJobStatus(jobId).then((job) => {
        if (job) {
          if (job.status === 'completed') {
            onComplete(job);
          } else if (job.status === 'failed') {
            onError(job.error || 'Download failed');
          } else {
            onError('Connection lost during download');
          }
        }
      });
    };
  }

  private async checkJobStatus(jobId: string): Promise<DownloadJob | null> {
    try {
      const response = await fetch(`${this.baseUrl}/jobs/${jobId}`);
      if (response.ok) {
        return await response.json();
      }
    } catch (e) {
      console.error('[DownloadJob] Failed to check job status:', e);
    }
    return null;
  }

  unsubscribe(jobId: string): void {
    const eventSource = this.activeJobs.get(jobId);
    if (eventSource) {
      eventSource.close();
      this.activeJobs.delete(jobId);
      console.log('[DownloadJob] Unsubscribed from job:', jobId);
    }
  }

  getStreamUrl(streamPath: string): string {
    return `${this.baseUrl}${streamPath}`;
  }
}

export const downloadJobService = new DownloadJobService();
export type { DownloadJob };

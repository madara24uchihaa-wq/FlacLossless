"""
FlacLossless Backend: yt-dlp Job Manager with SSE Progress Streaming
Downloads audio from YouTube with real-time progress updates via Server-Sent Events.
"""

from flask import Flask, request, send_file, jsonify, Response
from flask_cors import CORS
import yt_dlp
import os
import uuid
import json
import threading
import time
from pathlib import Path
import shutil
from datetime import datetime, timedelta
import logging
import re
from queue import Queue
from typing import Dict, Optional, Any
import tempfile

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app, origins="*", supports_credentials=True)

AUDIO_DIR = os.path.abspath(os.getenv('AUDIO_DIR', './audio'))
CACHE_FILE = os.getenv('CACHE_FILE', './cache.json')
CLEANUP_HOURS = int(os.getenv('CLEANUP_HOURS', 24))
MAX_CONCURRENT_JOBS = 3

Path(AUDIO_DIR).mkdir(parents=True, exist_ok=True)

def load_cache():
    if os.path.exists(CACHE_FILE):
        try:
            with open(CACHE_FILE, 'r') as f:
                return json.load(f)
        except:
            return {}
    return {}

def save_cache(cache_data):
    with open(CACHE_FILE, 'w') as f:
        json.dump(cache_data, f, indent=2)

cache = load_cache()

def get_youtube_cookies():
    """
    Use yt-dlp's native cookie extraction from browser.
    Returns cookie file path or None if unavailable.
    """
    try:
        # Try to get from environment variable first
        cookie_file = os.getenv('YT_COOKIES_FILE')
        if cookie_file and os.path.exists(cookie_file):
            logger.info(f"Using cookies from file: {cookie_file}")
            return cookie_file
        
        # Try to extract using yt-dlp's native --cookies-from-browser
        try:
            from yt_dlp.utils import extract_basic_auth
            logger.info("yt-dlp cookie extraction available")
            
            # We'll use this in ydl_opts via 'cookies_from_browser'
            return True  # Signal to use cookies-from-browser
        except Exception as e:
            logger.debug(f"yt-dlp cookie extraction not available: {e}")
            return None
            
    except Exception as e:
        logger.warning(f"Cookie extraction failed: {e}")
        return None

class DownloadJob:
    def __init__(self, job_id: str, video_id: str, url: str, title: str = ""):
        self.job_id = job_id
        self.video_id = video_id
        self.url = url
        self.title = title
        self.status = "queued"
        self.progress = 0
        self.stage = "Waiting..."
        self.error: Optional[str] = None
        self.stream_url: Optional[str] = None
        self.metadata: Dict[str, Any] = {}
        self.created_at = datetime.now()
        self.subscribers: list = []
        self.file_path: Optional[str] = None
        
    def to_dict(self):
        return {
            "job_id": self.job_id,
            "video_id": self.video_id,
            "url": self.url,
            "title": self.title,
            "status": self.status,
            "progress": self.progress,
            "stage": self.stage,
            "error": self.error,
            "stream_url": self.stream_url,
            "metadata": self.metadata,
            "created_at": self.created_at.isoformat()
        }
    
    def notify_subscribers(self):
        event_data = json.dumps(self.to_dict())
        for q in self.subscribers:
            try:
                q.put(event_data)
            except:
                pass

class JobManager:
    def __init__(self):
        self.jobs: Dict[str, DownloadJob] = {}
        self.active_count = 0
        self.lock = threading.Lock()
        self.job_queue = Queue()
        for _ in range(MAX_CONCURRENT_JOBS):
            worker = threading.Thread(target=self._worker, daemon=True)
            worker.start()
    
    def create_job(self, video_id: str, url: str, title: str = "") -> DownloadJob:
        with self.lock:
            if video_id in cache:
                cached_entry = cache[video_id]
                file_path = cached_entry.get('file', '')
                if file_path and os.path.exists(file_path) and os.path.getsize(file_path) > 0:
                    job = DownloadJob(str(uuid.uuid4()), video_id, url, title)
                    job.status = "completed"
                    job.progress = 100
                    job.stage = "Loaded from cache"
                    job.stream_url = f"/stream/{os.path.basename(file_path)}"
                    job.metadata = cached_entry.get('metadata', {})
                    job.file_path = file_path
                    self.jobs[job.job_id] = job
                    return job
            
            job = DownloadJob(str(uuid.uuid4()), video_id, url, title)
            self.jobs[job.job_id] = job
            self.job_queue.put(job.job_id)
            return job
    
    def get_job(self, job_id: str) -> Optional[DownloadJob]:
        return self.jobs.get(job_id)
    
    def _worker(self):
        while True:
            try:
                job_id = self.job_queue.get()
                job = self.jobs.get(job_id)
                if job and job.status == "queued":
                    self._process_job(job)
            except Exception as e:
                logger.error(f"Worker error: {e}")
            finally:
                self.job_queue.task_done()
    
    def _process_job(self, job: DownloadJob):
        try:
            job.status = "downloading"
            job.stage = "Starting download..."
            job.progress = 5
            job.notify_subscribers()
            
            file_id = str(uuid.uuid4())
            output_template = os.path.join(AUDIO_DIR, file_id)
            output_path = os.path.join(AUDIO_DIR, f"{file_id}.mp3")
            
            def progress_hook(d):
                if d['status'] == 'downloading':
                    total = d.get('total_bytes') or d.get('total_bytes_estimate', 0)
                    downloaded = d.get('downloaded_bytes', 0)
                    if total > 0:
                        pct = int((downloaded / total) * 60) + 10
                        job.progress = min(pct, 70)
                    else:
                        job.progress = min(job.progress + 1, 70)
                    
                    speed = d.get('speed', 0)
                    if speed:
                        speed_str = f"{speed/1024:.1f} KB/s" if speed < 1024*1024 else f"{speed/1024/1024:.1f} MB/s"
                        job.stage = f"Downloading... ({speed_str})"
                    else:
                        job.stage = "Downloading..."
                    job.notify_subscribers()
                    
                elif d['status'] == 'finished':
                    job.progress = 75
                    job.stage = "Converting to MP3..."
                    job.notify_subscribers()
            
            ydl_opts = {
                'format': 'bestaudio[ext=m4a]/bestaudio[ext=webm]/bestaudio/best',
                'outtmpl': output_template,
                'quiet': True,
                'no_warnings': True,
                'nocheckcertificate': True,
                'geo_bypass': True,
                'no_playlist': True,
                'progress_hooks': [progress_hook],
                'postprocessors': [{
                    'key': 'FFmpegExtractAudio',
                    'preferredcodec': 'mp3',
                    'preferredquality': '192',
                }],
                'http_headers': {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept-Language': 'en-US,en;q=0.9',
                    'Accept-Encoding': 'gzip, deflate',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                    'DNT': '1',
                    'Connection': 'keep-alive',
                    'Upgrade-Insecure-Requests': '1'
                },
                'extractor_args': {
                    'youtube': {
                        'player_client': ['android', 'web', 'mweb', 'tv', 'ios'],
                        'player_skip_download': False,
                    }
                },
                'socket_timeout': 30,
                'retries': {'max_retries': 5, 'backoff_factor': 1.0},
                'fragment_retries': 5,
                'skip_unavailable_fragments': True,
                'quiet': False,
                'verbose': False,
            }
            
            job.stage = "Fetching video info..."
            job.progress = 10
            job.notify_subscribers()
            
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(job.url, download=True)
                job.metadata = {
                    'title': info.get('title', job.title or 'Unknown'),
                    'duration': info.get('duration', 0),
                    'thumbnail': info.get('thumbnail', ''),
                    'uploader': info.get('uploader', info.get('channel', 'Unknown')),
                }
                job.title = job.metadata['title']
            
            job.progress = 85
            job.stage = "Finalizing..."
            job.notify_subscribers()
            
            if not os.path.exists(output_path):
                for ext in ['mp3', 'm4a', 'webm', 'opus', 'ogg']:
                    alt_path = os.path.join(AUDIO_DIR, f"{file_id}.{ext}")
                    if os.path.exists(alt_path) and os.path.getsize(alt_path) > 0:
                        if ext != 'mp3':
                            import subprocess
                            subprocess.run(
                                ['ffmpeg', '-i', alt_path, '-acodec', 'libmp3lame', '-q:a', '2', '-y', output_path],
                                capture_output=True, timeout=120
                            )
                            os.remove(alt_path)
                        else:
                            output_path = alt_path
                        break
            
            if not os.path.exists(output_path) or os.path.getsize(output_path) == 0:
                raise Exception("Download failed - no output file created")
            
            cache[job.video_id] = {
                'file': output_path,
                'metadata': job.metadata,
                'downloaded_at': datetime.now().isoformat(),
                'file_id': file_id
            }
            save_cache(cache)
            
            job.file_path = output_path
            job.stream_url = f"/stream/{os.path.basename(output_path)}"
            job.progress = 100
            job.stage = "Complete!"
            job.status = "completed"
            job.notify_subscribers()
            
            logger.info(f"Job {job.job_id} completed: {job.title}")
            
        except Exception as e:
            logger.error(f"Job {job.job_id} failed: {e}")
            job.status = "failed"
            job.error = str(e)
            job.stage = "Failed"
            job.notify_subscribers()

job_manager = JobManager()

def extract_video_id(url: str) -> Optional[str]:
    patterns = [
        r'(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})',
        r'v=([a-zA-Z0-9_-]{11})',
    ]
    for pattern in patterns:
        match = re.search(pattern, url)
        if match:
            return match.group(1)
    return None


@app.route('/health', methods=['GET'])
def health():
    return jsonify({
        'status': 'ok',
        'audio_dir': AUDIO_DIR,
        'cached_videos': len(cache),
        'active_jobs': len([j for j in job_manager.jobs.values() if j.status in ['queued', 'downloading']]),
        'yt_dlp_version': yt_dlp.version.__version__
    })


@app.route('/search', methods=['GET'])
def search_youtube():
    query = request.args.get('q', '')
    max_results = int(request.args.get('limit', 10))
    
    if not query:
        return jsonify({'error': 'No query provided'}), 400
    
    try:
        logger.info(f"Searching YouTube for: {query}")
        
        ydl_opts = {
            'quiet': False,
            'no_warnings': False,
            'extract_flat': True,
            'default_search': 'ytsearch',
            'nocheckcertificate': True,
            'geo_bypass': True,
            'socket_timeout': 30,
            'http_headers': {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept-Language': 'en-US,en;q=0.9',
                'Accept-Encoding': 'gzip, deflate',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'DNT': '1',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1'
            },
            'extractor_args': {
                'youtube': {
                    'player_client': ['android', 'web', 'mweb'],
                    'skip': ['hls', 'dash'],
                }
            },
            'retries': {'max_retries': 3, 'backoff_factor': 0.5},
        }
        
        logger.info(f"yt-dlp version: {yt_dlp.version.__version__}")
        
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            logger.info(f"Attempting search: ytsearch{max_results}:{query}")
            result = ydl.extract_info(f"ytsearch{max_results}:{query}", download=False)
        
        logger.info(f"Search returned {len(result.get('entries', []))} results")
        
        videos = []
        for entry in result.get('entries', []):
            if entry:
                videos.append({
                    'id': entry.get('id', ''),
                    'title': entry.get('title', 'Unknown'),
                    'channelTitle': entry.get('uploader', entry.get('channel', 'Unknown')),
                    'thumbnail': entry.get('thumbnail', f"https://img.youtube.com/vi/{entry.get('id', '')}/mqdefault.jpg"),
                    'videoId': entry.get('id', ''),
                    'url': f"https://www.youtube.com/watch?v={entry.get('id', '')}",
                    'duration': entry.get('duration', 0),
                })
        
        logger.info(f"Returning {len(videos)} formatted videos")
        return jsonify({'results': videos})
    
    except Exception as e:
        logger.error(f"Search failed: {type(e).__name__}: {e}", exc_info=True)
        return jsonify({'error': str(e), 'results': []}), 500


@app.route('/jobs', methods=['POST'])
def create_download_job():
    data = request.get_json() or {}
    url = data.get('url', '')
    title = data.get('title', '')
    
    if not url:
        return jsonify({'error': 'No URL provided'}), 400
    
    video_id = extract_video_id(url)
    if not video_id:
        return jsonify({'error': 'Invalid YouTube URL'}), 400
    
    job = job_manager.create_job(video_id, url, title)
    
    return jsonify(job.to_dict())


@app.route('/jobs/<job_id>', methods=['GET'])
def get_job_status(job_id: str):
    job = job_manager.get_job(job_id)
    if not job:
        return jsonify({'error': 'Job not found'}), 404
    return jsonify(job.to_dict())


@app.route('/jobs/<job_id>/events', methods=['GET'])
def job_events(job_id: str):
    job = job_manager.get_job(job_id)
    if not job:
        return jsonify({'error': 'Job not found'}), 404
    
    def generate():
        q = Queue()
        job.subscribers.append(q)
        
        try:
            yield f"data: {json.dumps(job.to_dict())}\n\n"
            
            while True:
                try:
                    data = q.get(timeout=30)
                    yield f"data: {data}\n\n"
                    
                    event_data = json.loads(data)
                    if event_data.get('status') in ['completed', 'failed']:
                        break
                except:
                    yield f"data: {json.dumps({'type': 'heartbeat'})}\n\n"
                    
                    if job.status in ['completed', 'failed']:
                        break
        finally:
            if q in job.subscribers:
                job.subscribers.remove(q)
    
    return Response(
        generate(),
        mimetype='text/event-stream',
        headers={
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'X-Accel-Buffering': 'no',
            'Access-Control-Allow-Origin': '*',
        }
    )


@app.route('/download', methods=['GET', 'POST'])
def download_audio():
    url = request.args.get('url')
    if request.method == 'POST':
        data = request.get_json() or {}
        url = url or data.get('url')
    
    if not url:
        return jsonify({'error': 'No URL provided'}), 400
    
    video_id = extract_video_id(url)
    if not video_id:
        return jsonify({'error': 'Invalid YouTube URL'}), 400
    
    if video_id in cache:
        cached_entry = cache[video_id]
        file_path = cached_entry.get('file', '')
        if file_path and os.path.exists(file_path) and os.path.getsize(file_path) > 0:
            return jsonify({
                'file': f"/stream/{os.path.basename(file_path)}",
                'metadata': cached_entry.get('metadata', {}),
                'cached': True,
                'video_id': video_id
            })
    
    job = job_manager.create_job(video_id, url, "")
    
    timeout = 180
    start = time.time()
    while job.status not in ['completed', 'failed'] and (time.time() - start) < timeout:
        time.sleep(0.5)
    
    if job.status == 'completed':
        return jsonify({
            'file': job.stream_url,
            'metadata': job.metadata,
            'cached': False,
            'video_id': video_id
        })
    else:
        return jsonify({'error': job.error or 'Download timed out'}), 500


@app.route('/stream/<filename>')
def stream_audio(filename):
    if '..' in filename or '/' in filename:
        return 'Forbidden', 403
    
    file_path = os.path.join(AUDIO_DIR, filename)
    
    if not os.path.exists(file_path):
        return 'Not Found', 404
    
    file_size = os.path.getsize(file_path)
    
    range_header = request.headers.get('Range')
    if range_header:
        try:
            byte_range = range_header.replace('bytes=', '').split('-')
            start = int(byte_range[0]) if byte_range[0] else 0
            end = int(byte_range[1]) if byte_range[1] else file_size - 1
            
            length = end - start + 1
            
            def generate():
                with open(file_path, 'rb') as f:
                    f.seek(start)
                    remaining = length
                    while remaining > 0:
                        chunk_size = min(8192, remaining)
                        data = f.read(chunk_size)
                        if not data:
                            break
                        remaining -= len(data)
                        yield data
            
            response = Response(
                generate(),
                status=206,
                mimetype='audio/mpeg',
                direct_passthrough=True
            )
            response.headers['Content-Range'] = f'bytes {start}-{end}/{file_size}'
            response.headers['Accept-Ranges'] = 'bytes'
            response.headers['Content-Length'] = length
            response.headers['Cache-Control'] = 'no-cache'
            return response
        except Exception as e:
            logger.warning(f"Range request error: {e}")
    
    response = send_file(file_path, mimetype='audio/mpeg')
    response.headers['Accept-Ranges'] = 'bytes'
    response.headers['Content-Length'] = file_size
    response.headers['Cache-Control'] = 'no-cache'
    return response


@app.route('/metadata/<video_id>')
def get_metadata(video_id):
    if video_id not in cache:
        return jsonify({'error': 'Not in cache'}), 404
    
    entry = cache[video_id]
    return jsonify({
        'video_id': video_id,
        'metadata': entry.get('metadata', {}),
        'file': f"/stream/{os.path.basename(entry['file'])}",
        'downloaded_at': entry.get('downloaded_at')
    })


@app.route('/cache')
def list_cache():
    items = []
    for vid, entry in cache.items():
        items.append({
            'video_id': vid,
            'title': entry.get('metadata', {}).get('title', 'Unknown'),
            'downloaded_at': entry.get('downloaded_at'),
            'file_exists': os.path.exists(entry.get('file', ''))
        })
    return jsonify({'cached': len(items), 'items': items})


@app.route('/cache/<video_id>', methods=['DELETE'])
def delete_cached(video_id):
    if video_id not in cache:
        return jsonify({'error': 'Not found'}), 404
    
    entry = cache[video_id]
    file_path = entry.get('file')
    
    try:
        if file_path and os.path.exists(file_path):
            os.remove(file_path)
        del cache[video_id]
        save_cache(cache)
        return jsonify({'deleted': video_id})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


def cleanup_worker():
    while True:
        try:
            time.sleep(3600)
            
            now = datetime.now()
            cutoff = now - timedelta(hours=CLEANUP_HOURS)
            deleted = 0
            
            for video_id, entry in list(cache.items()):
                try:
                    dl_time_str = entry.get('downloaded_at')
                    if dl_time_str:
                        dl_time = datetime.fromisoformat(dl_time_str)
                        if dl_time < cutoff:
                            file_path = entry.get('file')
                            if file_path and os.path.exists(file_path):
                                os.remove(file_path)
                            del cache[video_id]
                            deleted += 1
                except Exception as e:
                    logger.warning(f"Cleanup error for {video_id}: {e}")
            
            if deleted > 0:
                save_cache(cache)
                logger.info(f"Cleanup: deleted {deleted} old MP3(s)")
        
        except Exception as e:
            logger.error(f"Cleanup worker error: {e}")


cleanup_thread = threading.Thread(target=cleanup_worker, daemon=True)
cleanup_thread.start()

# Note: When using Gunicorn, don't call app.run()
# Gunicorn will handle starting the server
if __name__ == '__main__':
    port = int(os.getenv('PORT', 5000))
    
    logger.info(f"FlacLossless Backend starting on 0.0.0.0:{port}")
    logger.info(f"Audio dir: {AUDIO_DIR}")
    logger.info(f"yt-dlp version: {yt_dlp.version.__version__}")
    
    app.run(host='0.0.0.0', port=port, debug=False, threaded=True)

from fastapi import FastAPI, UploadFile, File, HTTPException, Form
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from vision_agent import VisionAgent
from music_agent import MusicAgent
import shutil
import os
import uuid
from moviepy.editor import VideoFileClip, AudioFileClip
import yt_dlp

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

vision_bot = VisionAgent()
music_bot = MusicAgent()

# --- DATA MODELS ---
class SearchRequest(BaseModel):
    query: str

class RefreshRequest(BaseModel):
    seed_genres: List[str]
    target_energy: float
    target_valence: float
    target_danceability: Optional[float] = None
    description: str

# --- HELPERS ---
def download_audio(query):
    print(f"🎧 Fetching audio for: {query}")
    ydl_opts = {
        'format': 'bestaudio/best',
        'postprocessors': [{'key': 'FFmpegExtractAudio','preferredcodec': 'mp3','preferredquality': '192'}],
        'outtmpl': f'temp_audio_{uuid.uuid4()}',
        'quiet': True
    }
    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        info = ydl.extract_info(f"ytsearch1:{query}", download=True)
        filename = ydl.prepare_filename(info['entries'][0])
        return filename.rsplit('.', 1)[0] + '.mp3'

# --- ENDPOINTS ---

@app.post("/generate-playlist")
async def generate_playlist(file: UploadFile = File(...)):
    video_id = str(uuid.uuid4())
    video_path = f"temp_video_{video_id}.mp4"
    with open(video_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    try:
        vibe_data = vision_bot.analyze_vibe(video_path)
        playlist = music_bot.get_recommendations(vibe_data)
        return {"video_id": video_id, "vibe_analysis": vibe_data, "playlist": playlist}
    except Exception as e:
        if os.path.exists(video_path): os.remove(video_path)
        raise HTTPException(500, str(e))

@app.post("/search-song")
async def search_song(req: SearchRequest):
    return music_bot.search_tracks(req.query)

@app.post("/refresh-playlist")
async def refresh_playlist(vibe: RefreshRequest):
    return music_bot.get_recommendations(vibe.dict())

@app.post("/merge-video")
async def merge_video(
    video_id: str, 
    song_name: str, 
    artist_name: str,
    start_time: float = 0.0 # NEW: Start time in seconds
):
    video_path = f"temp_video_{video_id}.mp4"
    output_path = f"final_{video_id}.mp4"
    audio_path = None

    if not os.path.exists(video_path):
        raise HTTPException(404, "Video expired.")

    try:
        # 1. Download Audio
        audio_path = download_audio(f"{artist_name} - {song_name} official audio")
        
        # 2. Load Clips
        video_clip = VideoFileClip(video_path)
        audio_clip = AudioFileClip(audio_path)

        # 3. Trim Audio (The Precision Feature)
        # Cut the audio starting from user's selection
        if start_time > 0:
            audio_clip = audio_clip.subclip(start_time)

        # 4. Fit to Video Length
        if audio_clip.duration < video_clip.duration:
            final_audio = audio_clip.loop(duration=video_clip.duration)
        else:
            final_audio = audio_clip.subclip(0, video_clip.duration)

        # 5. Merge
        final_clip = video_clip.set_audio(final_audio)
        final_clip.write_videofile(output_path, codec="libx264", audio_codec="aac")

        video_clip.close()
        audio_clip.close()
        final_clip.close()

        return FileResponse(output_path, filename=f"SyncWave_{song_name}.mp4")

    except Exception as e:
        raise HTTPException(500, f"Merge failed: {str(e)}")
    finally:
        if audio_path and os.path.exists(audio_path): os.remove(audio_path)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
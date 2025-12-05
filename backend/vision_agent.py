import cv2
import os
import google.generativeai as genai
from dotenv import load_dotenv
from PIL import Image
import json

load_dotenv()

# Configure Gemini
genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))

class VisionAgent:
    def __init__(self):
        self.model = genai.GenerativeModel('gemini-2.0-flash')

    def extract_frames(self, video_path):
        """
        Extracts 3 frames (Start, Middle, End) from the video
        to give the AI a full picture of the 'vibe'.
        """
        print(f"👁️ Watching video: {video_path}...")
        cam = cv2.VideoCapture(video_path)
        total_frames = int(cam.get(cv2.CAP_PROP_FRAME_COUNT))
        
        # Calculate checkpoints
        points = [0, total_frames // 2, total_frames - 10]
        frames = []

        for point in points:
            cam.set(cv2.CAP_PROP_POS_FRAMES, point)
            ret, frame = cam.read()
            if ret:
                # Convert OpenCV BGR to RGB (Pillow format)
                rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                pil_image = Image.fromarray(rgb_frame)
                frames.append(pil_image)
        
        cam.release()
        return frames

    def analyze_vibe(self, video_path):
        """
        Sends frames to Gemini and asks for Spotify parameters.
        """
        frames = self.extract_frames(video_path)
        
        prompt = """
        You are a Professional DJ and Visual Artist.
        Look at these video frames. Analyze the lighting, color palette, speed (implied), and mood.
        
        Based on this visual aesthetic, recommend the perfect Spotify Audio Features for a background track.
        
        Return ONLY a JSON object with these exact keys:
        {
            "seed_genres": ["genre1"], (Choose from: techno, house, ambient, pop, rock, hip-hop, jazz, classical)
            "target_energy": 0.0 to 1.0, (High energy for fast/bright, Low for slow/dark)
            "target_valence": 0.0 to 1.0, (1.0 is Happy/Bright, 0.0 is Sad/Dark)
            "target_danceability": 0.0 to 1.0,
            "description": "A short sentence describing why you chose this vibe."
        }
        """
        
        try:
            # Send images + text to Gemini 1.5 Flash
            response = self.model.generate_content(frames + [prompt])
            
            # Clean up JSON (sometimes Gemini adds ```json ... ```)
            json_text = response.text.replace("```json", "").replace("```", "").strip()
            return json.loads(json_text)
            
        except Exception as e:
            return {"error": str(e)}

# Test Logic
if __name__ == "__main__":
    # You need a dummy video to test this! 
    # If you don't have one, just create a text file named "test.mp4" (it will fail frame extraction but run the code)
    # OR better: Download a 5 sec clip and put it in backend/
    
    agent = VisionAgent()
    # Check if a test video exists
    if os.path.exists("test_video.mp4"):
        print(agent.analyze_vibe("test_video.mp4"))
    else:
        print("Please put a file named 'test_video.mp4' in the backend folder to test!")
import os
import spotipy
from spotipy.oauth2 import SpotifyClientCredentials
from dotenv import load_dotenv
import random

load_dotenv()

class MusicAgent:
    def __init__(self):
        self.sp = spotipy.Spotify(auth_manager=SpotifyClientCredentials(
            client_id=os.getenv("SPOTIPY_CLIENT_ID"),
            client_secret=os.getenv("SPOTIPY_CLIENT_SECRET")
        ))

    def get_recommendations(self, mood_params):
        """
        PURE VIBE MODE: Returns only genre-specific tracks (No Top Hits).
        """
        print(f"🎵 Searching Spotify for vibes: {mood_params}")
        seed_genre = mood_params.get("seed_genres", ["pop"])[0]
        
        try:
            # Targeted Genre Search with Random Offset
            offset = random.randint(0, 50)
            results = self.sp.search(
                q=f"genre:{seed_genre}", 
                type='track', 
                limit=10, 
                offset=offset
            )
            
            return self._clean_tracks(results['tracks']['items'])[:5]
            
        except Exception as e:
            return {"error": str(e)}

    def search_tracks(self, query):
        """
        Manual Search Mode: User types "Travis Scott" -> We find it.
        """
        print(f"🔎 Manual Search: {query}")
        try:
            results = self.sp.search(q=query, type='track', limit=10)
            return self._clean_tracks(results['tracks']['items'])
        except Exception as e:
            return {"error": str(e)}

    def _clean_tracks(self, items):
        """Helper to format Spotify data"""
        tracks = []
        for track in items:
            if track['album']['images']:
                tracks.append({
                    "name": track['name'],
                    "artist": track['artists'][0]['name'],
                    "url": track['external_urls']['spotify'],
                    "cover_art": track['album']['images'][0]['url'],
                    "preview_url": track['preview_url'],
                    "duration_ms": track['duration_ms'] # Needed for slider
                })
        return tracks

if __name__ == "__main__":
    agent = MusicAgent()
    print(agent.search_tracks("Fein Travis Scott"))
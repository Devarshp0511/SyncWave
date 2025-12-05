"use client";

import { useState, useRef } from "react";
import axios from "axios";
import { Upload, Music, Loader2, Sparkles, Download, Play, Pause, Search, X, Scissors, ExternalLink } from "lucide-react";
import { motion } from "framer-motion";

export default function VibeMatcher() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  // result holds both the vision analysis and the current playlist
  const [result, setResult] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  
  // --- TRIM STATE ---
  const [selectedTrack, setSelectedTrack] = useState<any>(null); // Track selected for trimming
  const [startTime, setStartTime] = useState(0); // Where to start the song (seconds)
  const [merging, setMerging] = useState(false);

  // --- AUDIO PLAYER STATE ---
  const [playingPreview, setPlayingPreview] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    setResult(null);
    stopAudio();
    
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await axios.post("http://localhost:8000/generate-playlist", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setResult(response.data);
    } catch (error) {
      console.error(error);
      alert("Error connecting to backend. Check console.");
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery) return;
    setIsSearching(true);
    stopAudio();
    try {
      const response = await axios.post("http://localhost:8000/search-song", { query: searchQuery });
      // Keep vibe analysis, but replace playlist with search results
      setResult((prev: any) => ({ ...prev, playlist: response.data }));
    } catch (e) {
      alert("Search failed");
    } finally {
      setIsSearching(false);
    }
  };

  const handleMerge = async () => {
    if (!selectedTrack) return;
    setMerging(true);
    stopAudio();
    
    try {
      const response = await axios.post("http://localhost:8000/merge-video", null, {
        params: {
          video_id: result.video_id,
          song_name: selectedTrack.name,
          artist_name: selectedTrack.artist,
          start_time: startTime // Send user's trim time
        },
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `SyncWave_${selectedTrack.name}.mp4`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      setSelectedTrack(null); // Close modal after successful download
      setStartTime(0); // Reset timer
    } catch (error) {
      console.error(error);
      alert("Merge failed. Video session might have expired.");
    } finally {
      setMerging(false);
    }
  };

  const stopAudio = () => {
    if (audioRef.current) {
        audioRef.current.pause();
        setPlayingPreview(null);
    }
  };

  const togglePreview = (previewUrl: string | null) => {
    if (!previewUrl) return;
    if (playingPreview === previewUrl) {
      audioRef.current?.pause();
      setPlayingPreview(null);
    } else {
      if (audioRef.current) audioRef.current.pause();
      audioRef.current = new Audio(previewUrl);
      audioRef.current.volume = 0.5;
      audioRef.current.play();
      setPlayingPreview(previewUrl);
      audioRef.current.onended = () => setPlayingPreview(null);
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto p-6 pb-24 font-sans text-white relative">
      
      {/* UPLOAD BOX (Only visible if no result yet) */}
      {!result && (
        <div className="border-2 border-dashed border-zinc-700 hover:border-purple-500 rounded-2xl p-12 text-center transition-all bg-zinc-900/50 backdrop-blur-sm">
          <input type="file" accept="video/mp4" onChange={(e) => setFile(e.target.files?.[0] || null)} className="hidden" id="video-upload" />
          <label htmlFor="video-upload" className="cursor-pointer flex flex-col items-center gap-4">
            <div className="p-5 bg-zinc-800 rounded-full text-purple-400">
              {file ? <Sparkles className="w-10 h-10" /> : <Upload className="w-10 h-10" />}
            </div>
            <p className="text-xl font-medium">{file ? file.name : "Drop video here"}</p>
            <p className="text-sm text-zinc-500">MP4 supported • AI Vision Analysis</p>
          </label>
          {file && (
            <button onClick={handleUpload} disabled={loading} className="mt-8 bg-purple-600 hover:bg-purple-500 text-white px-10 py-3 rounded-full font-bold mx-auto flex gap-2">
              {loading ? <Loader2 className="animate-spin" /> : "Analyze Vibe"}
            </button>
          )}
        </div>
      )}

      {/* RESULTS AREA (AI Analysis + Search + Playlist) */}
      {result && !selectedTrack && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mt-8 space-y-8">
          
          {/* --- 1. AI VISION ANALYSIS CARD (RESTORED) --- */}
          <div className="bg-zinc-900/80 border border-zinc-800 p-8 rounded-2xl shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl -z-10" />
            <h3 className="text-sm font-bold text-blue-400 uppercase tracking-widest mb-4">
              👁️ AI Vision Analysis
            </h3>
            <p className="text-zinc-100 text-xl leading-relaxed font-light">
              "{result.vibe_analysis.description}"
            </p>
            <div className="flex flex-wrap gap-2 mt-6">
              {result.vibe_analysis.seed_genres.map((g: string) => (
                <span key={g} className="px-4 py-1.5 bg-blue-500/10 text-blue-300 text-sm font-medium rounded-full border border-blue-500/20">
                  #{g}
                </span>
              ))}
            </div>
          </div>

          {/* --- 2. SEARCH BAR --- */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 w-5 h-5 text-zinc-500" />
              <input 
                type="text" 
                placeholder="Search specific song (e.g. 'Fein Travis Scott')" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="w-full bg-zinc-900 border border-zinc-700 rounded-full py-3 pl-10 pr-4 text-white focus:border-purple-500 outline-none"
              />
            </div>
            <button onClick={handleSearch} disabled={isSearching} className="bg-zinc-800 hover:bg-zinc-700 px-6 rounded-full font-medium transition-colors flex items-center justify-center min-w-[100px]">
              {isSearching ? <Loader2 className="animate-spin w-5 h-5" /> : "Search"}
            </button>
          </div>

          {/* --- 3. PLAYLIST ITEMS (Suggested or Searched) --- */}
          <div className="space-y-4">
            <h3 className="text-xl font-bold text-white flex items-center gap-3">
              <Music className="w-5 h-5 text-green-400" /> 
              {searchQuery && !isSearching ? "Search Results" : "Suggested Tracks"}
            </h3>
            {result.playlist.map((track: any, i: number) => (
              <motion.div 
                key={`${track.name}-${i}`}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                className="flex items-center gap-5 bg-zinc-900/60 p-4 rounded-xl border border-zinc-800 hover:border-purple-500/50 transition-all"
              >
                <img src={track.cover_art} className="w-16 h-16 rounded-lg shadow-sm" />
                <div className="flex-1 min-w-0">
                  <p className="text-white font-bold truncate">{track.name}</p>
                  <p className="text-zinc-400 text-sm truncate">{track.artist}</p>
                </div>
                
                <div className="flex gap-2">
                   {/* Play Preview / External Link */}
                  {track.preview_url ? (
                    <button onClick={() => togglePreview(track.preview_url)} className="p-3 bg-zinc-800 rounded-full hover:text-green-400">
                      {playingPreview === track.preview_url ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current" />}
                    </button>
                  ) : (
                    <a href={track.url} target="_blank" className="p-3 bg-zinc-800 rounded-full text-zinc-500 hover:text-white"><ExternalLink className="w-5 h-5" /></a>
                  )}
                  
                  {/* Open Trim Modal */}
                  <button onClick={() => setSelectedTrack(track)} className="px-5 py-2 bg-white text-black font-bold rounded-full flex items-center gap-2 hover:bg-zinc-200">
                    <Scissors className="w-4 h-4" /> Trim & Add
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* --- TRIM & MERGE MODAL --- */}
      {selectedTrack && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <motion.div initial={{scale: 0.9, opacity: 0}} animate={{scale: 1, opacity: 1}} className="bg-zinc-900 border border-zinc-700 p-8 rounded-2xl w-full max-w-lg shadow-2xl relative">
            <button onClick={() => {setSelectedTrack(null); setStartTime(0);}} className="absolute top-4 right-4 text-zinc-500 hover:text-white"><X /></button>
            
            <div className="text-center mb-8">
              <img src={selectedTrack.cover_art} className="w-32 h-32 rounded-lg mx-auto mb-4 shadow-lg" />
              <h2 className="text-2xl font-bold text-white">{selectedTrack.name}</h2>
              <p className="text-zinc-400">{selectedTrack.artist}</p>
            </div>

            {/* TIMING SLIDER */}
            <div className="mb-8">
              <label className="flex justify-between text-sm font-medium mb-2">
                <span className="text-purple-400 font-bold">Start Time: {startTime}s</span>
                <span className="text-zinc-500">Song Duration: {Math.round(selectedTrack.duration_ms / 1000)}s</span>
              </label>
              <input 
                type="range" 
                min="0" 
                max={Math.round(selectedTrack.duration_ms / 1000) - 10 || 180} // Ensure at least 10s play time
                value={startTime}
                onChange={(e) => setStartTime(Number(e.target.value))}
                className="w-full accent-purple-500 h-2 bg-zinc-700 rounded-lg appearance-none cursor-pointer"
              />
              <p className="text-xs text-zinc-500 mt-2 text-center">
                Drag to choose the exact second the song starts in your video.
              </p>
            </div>

            <button 
              onClick={handleMerge}
              disabled={merging}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:opacity-90 text-white py-4 rounded-xl font-bold text-lg flex justify-center items-center gap-2 transition-all disabled:opacity-50"
            >
              {merging ? <Loader2 className="animate-spin w-6 h-6" /> : <><Download className="w-6 h-6" /> Merge & Download</>}
            </button>
          </motion.div>
        </div>
      )}

    </div>
  );
}

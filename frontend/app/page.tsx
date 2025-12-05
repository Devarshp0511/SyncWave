import VibeMatcher from "./components/VibeMatcher";

export default function Home() {
  return (
    <main className="min-h-screen bg-black text-white selection:bg-purple-500/30">
      
      {/* Hero Section */}
      <div className="relative pt-20 pb-10 text-center">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-purple-600/20 blur-[120px] rounded-full -z-10" />
        
        <h1 className="text-7xl font-bold tracking-tighter mb-4">
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600">
            SyncWave
          </span>
        </h1>
        <p className="text-zinc-400 text-xl max-w-md mx-auto">
          AI-Powered Soundtracks for your Life.
          <br />
          <span className="text-sm opacity-50">Powered by Gemini Vision & Spotify</span>
        </p>
      </div>

      {/* The App */}
      <VibeMatcher />
      
    </main>
  );
}
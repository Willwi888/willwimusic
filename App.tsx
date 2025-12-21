
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { LyricLine, VisualSettings, ThemeStyle, AnimationType, ParticleStyle } from './types';
import { detectAndParse, lyricsToString, parseSRT, generateSRT } from './utils/srtParser';
import { analyzeLyricsForTheme, translateLyricsAI, smartTimingAI } from './services/geminiService';
import Visualizer from './components/Visualizer';
import Controls from './components/Controls';

// --- Types & Constants ---

const DEFAULT_SETTINGS: VisualSettings = {
  primaryColor: '#fbbf24', // Noodle Yellow
  secondaryColor: '#ea580c', // Soup Orange
  backgroundColor: '#1c1917', // Dark Stone
  fontFamily: 'Noto Serif TC', // Changed to Serif for the vibe
  fontSize: 60,
  particleCount: 50,
  particleSpeed: 1.0, // Default speed
  beatSensitivity: 1.0,
  style: ThemeStyle.NEON,
  aspectRatio: '16:9', // Default landscape
  
  backgroundMode: 'COLOR',
  backgroundImage: undefined,
  backgroundVideo: undefined,
  backgroundBrightness: 1.0,

  animationType: AnimationType.SLIDE_UP,
  animationSpeed: 1.0,
  transitionDuration: 0.5, // Changed from 0.6 for snappier transitions
  
  particleStyle: ParticleStyle.STANDARD,

  showTranslation: false,
  driveFolderUrl: 'https://drive.google.com/drive/folders/1io5C1RJdw7hzlPpgLOhpBKPJr7DCpfoV?usp=drive_link'
};

const SAMPLE_LYRICS: LyricLine[] = [
  { id: '1', startTime: 0, endTime: 4, text: "歡迎來到 Willwi Music", translation: "Welcome to Willwi Music" },
  { id: '2', startTime: 4.1, endTime: 8, text: "匯入音樂與歌詞，開始創作", translation: "Import music and lyrics to start" },
  { id: '3', startTime: 8.1, endTime: 12, text: "善用手動對時，讓節奏更精準", translation: "Use manual sync for perfect timing" },
];

// --- Main App Logic (Lyric Studio) ---

const App = () => {
  const [lyrics, setLyrics] = useState<LyricLine[]>(SAMPLE_LYRICS);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioSrc, setAudioSrc] = useState<string | null>(null);
  const [settings, setSettings] = useState<VisualSettings>(DEFAULT_SETTINGS);
  const [showEditor, setShowEditor] = useState(false);
  const [showSyncOverlay, setShowSyncOverlay] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  
  // Editor States
  const [showPasteInput, setShowPasteInput] = useState(false);
  const [pasteTextValue, setPasteTextValue] = useState("");

  // AI States
  const [isGeneratingTheme, setIsGeneratingTheme] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [isTiming, setIsTiming] = useState(false);

  // Sync Mode State
  const [currentSyncIndex, setCurrentSyncIndex] = useState(0);

  useEffect(() => {
    let interval: number;
    if (isPlaying && audioRef.current) {
      interval = window.setInterval(() => {
        setCurrentTime(audioRef.current!.currentTime);
      }, 16); // ~60fps update for UI
    }
    return () => clearInterval(interval);
  }, [isPlaying]);

  const handleAudioUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setAudioSrc(url);
      setIsPlaying(false);
      setCurrentTime(0);
    }
  };

  const handleBgUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      if (file.type.startsWith('video/')) {
         updateSettings({ backgroundVideo: url, backgroundMode: 'VIDEO' });
      } else {
         updateSettings({ backgroundImage: url, backgroundMode: 'IMAGE' });
      }
    }
  };

  const handleSrtUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const content = ev.target?.result as string;
        const parsed = parseSRT(content);
        if (parsed.length > 0) {
            setLyrics(parsed);
        } else {
            alert('無法解析 SRT 檔案');
        }
      };
      reader.readAsText(file);
    }
  };

  const handleExportSrt = () => {
    const content = generateSRT(lyrics);
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'lyrics.srt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const updateSettings = (newSettings: Partial<VisualSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  };

  const handleLyricsChange = (newLyrics: LyricLine[]) => {
    setLyrics(newLyrics);
  };

  const processPasteText = () => {
      const duration = audioRef.current?.duration || 180;
      const parsed = detectAndParse(pasteTextValue, duration);
      setLyrics(parsed);
      setShowPasteInput(false);
      setPasteTextValue("");
  };

  // AI Actions
  const handleAutoTheme = async () => {
    const fullText = lyrics.map(l => l.text).join('\n');
    setIsGeneratingTheme(true);
    const theme = await analyzeLyricsForTheme(fullText);
    if (theme) updateSettings(theme);
    setIsGeneratingTheme(false);
  };

  const handleTranslate = async () => {
      setIsTranslating(true);
      const translated = await translateLyricsAI(lyrics);
      setLyrics(translated);
      updateSettings({ showTranslation: true });
      setIsTranslating(false);
  };

  const handleSmartTiming = async () => {
      if (!audioRef.current) {
          alert("請先上傳音樂");
          return;
      }
      setIsTiming(true);
      const fullText = lyrics.map(l => l.text).join('\n');
      const timedLyrics = await smartTimingAI(fullText, audioRef.current.duration);
      if (timedLyrics.length > 0) setLyrics(timedLyrics);
      setIsTiming(false);
  };

  // Sync Mode Handlers
  const startSyncMode = () => {
    if (!audioSrc) {
        alert("請先上傳音樂");
        return;
    }
    setCurrentSyncIndex(0);
    setShowSyncOverlay(true);
    audioRef.current!.currentTime = 0;
    audioRef.current!.play();
    setIsPlaying(true);
  };

  const markCurrentLine = useCallback(() => {
    if (!audioRef.current) return;
    
    const now = audioRef.current.currentTime;
    
    setLyrics(prev => {
        const newLyrics = [...prev];
        // Set start time of current line
        if (currentSyncIndex < newLyrics.length) {
            newLyrics[currentSyncIndex].startTime = now;
            
            // Set end time of previous line to now
            if (currentSyncIndex > 0) {
                newLyrics[currentSyncIndex - 1].endTime = now;
            }
        }
        return newLyrics;
    });

    // Move to next
    if (currentSyncIndex < lyrics.length - 1) {
        setCurrentSyncIndex(prev => prev + 1);
    } else {
        // Finished
        // Set end time of last line to end of song or +5s
        setLyrics(prev => {
             const newLyrics = [...prev];
             newLyrics[newLyrics.length - 1].endTime = now + 5;
             return newLyrics;
        });
        setShowSyncOverlay(false);
    }
  }, [currentSyncIndex, lyrics.length]);

  // Keyboard listener for Sync Mode
  useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
          if (showSyncOverlay && (e.code === 'Space' || e.key === 'Enter')) {
              e.preventDefault();
              markCurrentLine();
          }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showSyncOverlay, markCurrentLine]);

  // Dynamic style for Aspect Ratio Container
  const getContainerStyle = () => {
      let ratio = 16/9;
      switch (settings.aspectRatio) {
          case '9:16': ratio = 9/16; break;
          case '1:1': ratio = 1; break;
          case '4:3': ratio = 4/3; break;
          case '16:9': default: ratio = 16/9; break;
      }
      
      return {
          aspectRatio: `${ratio}`,
          // Logic: Fit within the container without exceeding width or height
          // Using a combination of max dimensions and auto scaling
          maxWidth: '100%',
          maxHeight: '100%',
          width: ratio > 1 ? '100%' : 'auto', // Landscape favors width
          height: ratio < 1 ? '100%' : 'auto', // Portrait favors height
          // Fallback for square or near square to ensure it doesn't overflow
          ...(ratio === 1 ? { height: '80vh', width: 'auto' } : {})
      };
  };

  return (
    <div className="flex h-screen bg-brand-900 text-stone-200 overflow-hidden font-sans">
      <audio 
        ref={audioRef} 
        src={audioSrc || undefined} 
        onEnded={() => setIsPlaying(false)}
        onPause={() => setIsPlaying(false)}
        onPlay={() => setIsPlaying(true)}
      />

      {/* Left: Controls */}
      <Controls 
        settings={settings} 
        updateSettings={updateSettings} 
        onAutoTheme={handleAutoTheme}
        isGeneratingTheme={isGeneratingTheme}
        onOpenLyricEditor={() => setShowEditor(true)}
        onBgUpload={handleBgUpload}
        onSrtUpload={handleSrtUpload}
        onTranslate={handleTranslate}
        isTranslating={isTranslating}
        onSmartTiming={handleSmartTiming}
        isTiming={isTiming}
        onManualSync={startSyncMode}
        onAudioUpload={handleAudioUpload}
      />

      {/* Right: Visualizer Workspace */}
      <div className="flex-1 flex flex-col relative bg-stone-950 min-w-0">
        {/* Top Bar */}
        <div className="h-16 bg-brand-900 border-b border-brand-800 flex items-center justify-between px-6 shadow-sm z-20">
            <h1 className="font-display font-black text-xl tracking-tighter text-white">
              <span className="text-noodle">WILLWI</span> <span className="text-stone-500 font-medium text-sm">MUSIC</span>
            </h1>
        </div>

        {/* Main Canvas Area */}
        <div className="flex-1 p-8 flex items-center justify-center relative overflow-hidden">
             {/* Background Grid Pattern */}
             <div className="absolute inset-0 opacity-10 pointer-events-none" 
                  style={{ backgroundImage: 'radial-gradient(#44403c 1px, transparent 1px)', backgroundSize: '24px 24px' }}>
             </div>

             {/* Dynamic Container */}
             <div 
                className="relative z-10 mx-auto transition-all duration-300 shadow-2xl rounded-xl overflow-hidden flex items-center justify-center bg-black"
                style={getContainerStyle()}
             >
                 {!audioSrc ? (
                     <div className="w-full h-full border-2 border-dashed border-brand-700 rounded-xl flex flex-col items-center justify-center text-stone-500 bg-brand-900/50 backdrop-blur-sm p-4">
                         <div className="text-4xl mb-4">🎵</div>
                         <p className="font-bold">請先於左側「備料」區上傳音樂</p>
                     </div>
                 ) : (
                     <Visualizer 
                        lyrics={lyrics} 
                        currentTime={currentTime} 
                        isPlaying={isPlaying}
                        audioRef={audioRef}
                        settings={settings}
                        onExportProgress={setIsExporting}
                     />
                 )}
             </div>

             {/* Playback Controls (Floating) */}
             {audioSrc && !isExporting && !showSyncOverlay && (
                 <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-brand-800/90 backdrop-blur border border-brand-700 p-2 rounded-full shadow-2xl flex items-center gap-4 px-6 z-20">
                     <button 
                       onClick={() => {
                           if(audioRef.current) {
                               audioRef.current.currentTime = Math.max(0, audioRef.current.currentTime - 5);
                           }
                       }}
                       className="p-2 hover:text-noodle transition-colors"
                     >
                        ⏪
                     </button>

                     <button 
                       onClick={() => {
                           if (isPlaying) audioRef.current?.pause();
                           else audioRef.current?.play();
                       }}
                       className="w-12 h-12 bg-white rounded-full text-black flex items-center justify-center hover:scale-105 transition-transform font-black text-xl"
                     >
                        {isPlaying ? '⏸' : '▶'}
                     </button>

                     <button 
                       onClick={() => {
                           if(audioRef.current) {
                               audioRef.current.currentTime = Math.min(audioRef.current.duration, audioRef.current.currentTime + 5);
                           }
                       }}
                       className="p-2 hover:text-noodle transition-colors"
                     >
                        ⏩
                     </button>
                     
                     <div className="text-xs font-mono text-stone-400 w-24 text-center">
                         {audioRef.current && (
                             `${Math.floor(currentTime/60)}:${Math.floor(currentTime%60).toString().padStart(2,'0')} / ${Math.floor(audioRef.current.duration/60)}:${Math.floor(audioRef.current.duration%60).toString().padStart(2,'0')}`
                         )}
                     </div>
                 </div>
             )}
        </div>
      </div>

      {/* Sync Overlay */}
      {showSyncOverlay && (
          <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-md flex flex-col items-center justify-center text-center p-8">
              <div className="mb-12">
                  <div className="text-stone-400 text-sm mb-2 uppercase tracking-widest font-bold">即將播放 (Next)</div>
                  <div className="text-2xl text-stone-600 font-serif opacity-50 blur-[1px]">
                      {lyrics[currentSyncIndex + 1]?.text || "(結束)"}
                  </div>
              </div>
              
              <div className="mb-12 scale-110">
                  <div className="text-noodle text-sm mb-4 uppercase tracking-widest font-bold animate-pulse">現在 (Current)</div>
                  <div className="text-5xl md:text-7xl font-black text-white font-serif leading-tight">
                      {lyrics[currentSyncIndex]?.text}
                  </div>
              </div>

              <button 
                onClick={markCurrentLine}
                className="w-64 h-64 rounded-full bg-soup hover:bg-orange-500 active:scale-95 transition-all shadow-[0_0_50px_rgba(234,88,12,0.5)] flex items-center justify-center border-4 border-white/20 group"
              >
                  <span className="font-bold text-2xl text-white group-hover:scale-110 transition-transform block">
                      TAP / 空白鍵<br/>
                      <span className="text-sm font-normal opacity-80 mt-2 block">標記開始時間</span>
                  </span>
              </button>
              
              <button 
                onClick={() => setShowSyncOverlay(false)}
                className="mt-12 text-stone-500 hover:text-white underline text-sm"
              >
                  退出對時模式
              </button>
          </div>
      )}
    </div>
  );
};

export default App;

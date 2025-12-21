
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
  transitionDuration: 0.6,
  
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

const LyricStudio = () => {
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

  // Determine container classes based on aspect ratio
  const getContainerClass = () => {
      const base = "relative z-10 mx-auto transition-all duration-300 shadow-2xl rounded-xl overflow-hidden";
      switch (settings.aspectRatio) {
          case '9:16':
              return `${base} h-[80vh] aspect-[9/16]`;
          case '1:1':
              return `${base} h-[80vh] aspect-square`;
          case '4:3':
              return `${base} w-full max-w-4xl aspect-[4/3]`;
          case '16:9':
          default:
              return `${base} w-full max-w-5xl aspect-video`;
      }
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
      <div className="flex-1 flex flex-col relative bg-stone-950">
        {/* Top Bar */}
        <div className="h-16 bg-brand-900 border-b border-brand-800 flex items-center justify-between px-6 shadow-sm z-20">
            <h1 className="font-display font-black text-xl tracking-tighter text-white">
              <span className="text-noodle">WILLWI</span> <span className="text-stone-500 font-medium text-sm">MUSIC</span>
            </h1>
            
            <div className="flex items-center gap-4">
               {/* Mobile Audio Upload if needed, or keeping it clean */}
            </div>
        </div>

        {/* Main Canvas Area */}
        <div className="flex-1 p-8 flex items-center justify-center relative overflow-hidden">
             {/* Background Grid Pattern */}
             <div className="absolute inset-0 opacity-10 pointer-events-none" 
                  style={{ backgroundImage: 'radial-gradient(#44403c 1px, transparent 1px)', backgroundSize: '24px 24px' }}>
             </div>

             {/* Dynamic Container */}
             <div className={getContainerClass()}>
                 {!audioSrc ? (
                     <div className="w-full h-full border-2 border-dashed border-brand-700 rounded-xl flex flex-col items-center justify-center text-stone-500 bg-brand-900/50 backdrop-blur-sm">
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

      {/* Lyric Editor Modal */}
      {showEditor && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-brand-900 w-full max-w-4xl h-[80vh] rounded-2xl shadow-2xl flex flex-col border border-brand-700 overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 border-b border-brand-800 bg-brand-900 flex justify-between items-center z-10">
              <h3 className="font-bold text-xl text-white">歌詞編輯器</h3>
              
              {/* Editor Toolbar */}
              <div className="flex gap-2">
                 <label className="cursor-pointer bg-brand-800 hover:bg-brand-700 text-stone-300 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 border border-brand-700">
                    📂 匯入 SRT
                    <input type="file" accept=".srt" onChange={handleSrtUpload} className="hidden" />
                 </label>

                 <button 
                    onClick={() => setShowPasteInput(!showPasteInput)} 
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors border flex items-center gap-1 ${showPasteInput ? 'bg-noodle text-brand-900 border-noodle' : 'bg-brand-800 hover:bg-brand-700 text-stone-300 border-brand-700'}`}
                 >
                    {showPasteInput ? '🔙 返回列表' : '📋 貼上歌詞 (純文字)'}
                 </button>

                 <button 
                    onClick={handleExportSrt} 
                    className="bg-brand-800 hover:bg-brand-700 text-stone-300 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors border border-brand-700 flex items-center gap-1"
                 >
                    💾 匯出 SRT
                 </button>

                 <div className="w-px h-6 bg-brand-700 mx-2"></div>

                 <button 
                   onClick={() => setShowEditor(false)} 
                   className="bg-noodle text-brand-900 px-4 py-1.5 rounded-lg font-bold hover:bg-yellow-400 transition-colors"
                 >
                   完成
                 </button>
              </div>
            </div>
            
            {/* Modal Body */}
            <div className="flex-1 overflow-auto bg-brand-900 relative">
               {showPasteInput ? (
                  // Plain Text Paste Mode
                  <div className="absolute inset-0 p-6 flex flex-col animate-fadeIn">
                      <div className="text-stone-400 text-xs mb-2 flex justify-between">
                          <span>請在下方貼上歌詞純文字，每行一句。阿嬤會自動幫你平均分配時間。</span>
                          <span className="text-soup font-bold">⚠️ 注意：這會覆蓋目前的歌詞設定</span>
                      </div>
                      <textarea
                          value={pasteTextValue}
                          onChange={(e) => setPasteTextValue(e.target.value)}
                          className="flex-1 bg-brand-800/50 border border-brand-700 rounded-lg p-4 text-stone-200 font-mono text-sm focus:border-noodle outline-none resize-none mb-4 shadow-inner"
                          placeholder="例如：&#10;第一句歌詞&#10;第二句歌詞&#10;..."
                      />
                      <div className="flex justify-end gap-3">
                          <button 
                             onClick={() => {
                                 setPasteTextValue("");
                                 setShowPasteInput(false);
                             }}
                             className="text-stone-500 hover:text-white text-sm"
                          >
                             取消
                          </button>
                          <button 
                             onClick={processPasteText}
                             disabled={!pasteTextValue.trim()}
                             className="bg-soup text-white px-6 py-2 rounded-lg font-bold hover:bg-orange-600 disabled:opacity-50 transition-colors"
                          >
                             確認轉換
                          </button>
                      </div>
                  </div>
               ) : (
                  // List View Mode
                  <div className="w-full p-6 space-y-4">
                      <div className="grid grid-cols-12 gap-4 mb-2 text-xs font-bold text-stone-500 uppercase px-2 sticky top-0 bg-brand-900 z-10 py-2 border-b border-brand-800">
                          <div className="col-span-1">#</div>
                          <div className="col-span-2">開始 (秒)</div>
                          <div className="col-span-2">結束 (秒)</div>
                          <div className="col-span-3">原文 (匯入/編輯)</div>
                          <div className="col-span-3">翻譯 (編輯)</div>
                          <div className="col-span-1"></div>
                      </div>
                      
                      {lyrics.map((line, idx) => (
                          <div key={line.id} className="grid grid-cols-12 gap-4 items-center bg-brand-800/50 p-3 rounded-lg border border-brand-800 hover:border-brand-600 transition-colors group">
                              <div className="col-span-1 text-stone-500 font-mono text-sm">{idx + 1}</div>
                              <div className="col-span-2">
                                  <input 
                                    type="text" 
                                    defaultValue={line.startTime.toFixed(2)}
                                    onBlur={(e) => {
                                        const val = parseFloat(e.target.value);
                                        if(!isNaN(val)) {
                                            const newL = [...lyrics];
                                            newL[idx].startTime = val;
                                            setLyrics(newL);
                                        }
                                    }}
                                    className="w-full bg-brand-900 border border-brand-700 rounded px-2 py-1 text-sm text-stone-300 focus:border-noodle outline-none text-center font-mono"
                                  />
                              </div>
                              <div className="col-span-2">
                                  <input 
                                    type="text" 
                                    defaultValue={line.endTime.toFixed(2)}
                                    onBlur={(e) => {
                                        const val = parseFloat(e.target.value);
                                        if(!isNaN(val)) {
                                            const newL = [...lyrics];
                                            newL[idx].endTime = val;
                                            setLyrics(newL);
                                        }
                                    }}
                                    className="w-full bg-brand-900 border border-brand-700 rounded px-2 py-1 text-sm text-stone-300 focus:border-noodle outline-none text-center font-mono"
                                  />
                              </div>
                              <div className="col-span-3">
                                  <input 
                                    type="text" 
                                    value={line.text}
                                    onChange={(e) => {
                                        const newL = [...lyrics];
                                        newL[idx].text = e.target.value;
                                        setLyrics(newL);
                                    }}
                                    className="w-full bg-brand-900 border border-brand-700 rounded px-2 py-1 text-sm text-white focus:border-noodle outline-none"
                                  />
                              </div>
                              <div className="col-span-3">
                                  <input 
                                    type="text" 
                                    value={line.translation || ''}
                                    placeholder="翻譯..."
                                    onChange={(e) => {
                                        const newL = [...lyrics];
                                        newL[idx].translation = e.target.value;
                                        setLyrics(newL);
                                    }}
                                    className="w-full bg-brand-900 border border-brand-700 rounded px-2 py-1 text-sm text-stone-400 focus:border-noodle outline-none"
                                  />
                              </div>
                              <div className="col-span-1 flex justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button 
                                    onClick={() => {
                                        const newL = lyrics.filter((_, i) => i !== idx);
                                        setLyrics(newL);
                                    }}
                                    className="text-red-500 hover:bg-red-900/50 p-1.5 rounded"
                                  >
                                      ✕
                                  </button>
                              </div>
                          </div>
                      ))}

                      <div className="pt-4 flex justify-center pb-8">
                          <button 
                             onClick={() => {
                                 const lastEnd = lyrics.length > 0 ? lyrics[lyrics.length-1].endTime : 0;
                                 const newId = Date.now().toString();
                                 setLyrics([...lyrics, { id: newId, startTime: lastEnd, endTime: lastEnd + 3, text: "New Line" }]);
                             }}
                             className="text-stone-400 hover:text-noodle text-sm font-bold flex items-center gap-2 px-4 py-2 border border-brand-700 rounded-lg hover:border-noodle transition-colors"
                          >
                              + 新增一行
                          </button>
                      </div>
                  </div>
               )}
            </div>
            
            <div className="p-4 bg-brand-800 border-t border-brand-700 text-xs text-stone-500 flex justify-between">
                <span>提示：支援 SRT 匯入、純文字貼上與手動編輯。匯出功能可保存目前設定。</span>
                <span>共 {lyrics.length} 行</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LyricStudio;
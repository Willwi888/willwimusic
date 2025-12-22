
import React, { useState } from 'react';
import { VisualSettings, ThemeStyle, AnimationType, BackgroundMode, ParticleStyle, AspectRatio } from '../types';
import { generateVideo } from '../services/geminiService';

interface ControlsProps {
  settings: VisualSettings;
  updateSettings: (newSettings: Partial<VisualSettings>) => void;
  onAutoTheme: () => void;
  isGeneratingTheme: boolean;
  onOpenLyricEditor: () => void;
  onBgUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSrtUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onTranslate: () => void;
  isTranslating: boolean;
  onSmartTiming: () => void;
  isTiming: boolean;
  onManualSync: () => void;
  onAudioUpload?: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const FONTS = [
  { name: 'Noto Serif TC', label: 'Noto Serif (文青)' },
  { name: 'Montserrat', label: 'Montserrat (現代)' },
  { name: 'Inter', label: 'Inter (簡約)' },
  { name: 'Times New Roman', label: 'Serif (經典)' },
  { name: 'Courier New', label: 'Mono (代碼)' },
];

const ANIMATION_LABELS: Record<AnimationType, string> = {
  [AnimationType.FADE]: '淡入 (Fade)',
  [AnimationType.SLIDE_UP]: '上滑 (Slide Up)',
  [AnimationType.ZOOM]: '縮放 (Zoom)',
  [AnimationType.BOUNCE]: '彈跳 (Bounce)',
  [AnimationType.TYPEWRITER]: '打字機 (Typewriter)',
  [AnimationType.KINETIC]: '動感單字 (Kinetic)',
  [AnimationType.REVEAL]: '遮罩揭示 (Reveal)',
  [AnimationType.WAVE]: '波浪律動 (Wave)',
};

const THEME_LABELS: Record<ThemeStyle, string> = {
  [ThemeStyle.NEON]: '霓虹 (Neon)',
  [ThemeStyle.MINIMAL]: '極簡 (Minimal)',
  [ThemeStyle.NATURE]: '自然 (Nature)',
  [ThemeStyle.FIERY]: '熾熱 (Fiery)',
};

const BG_MODE_LABELS: Record<BackgroundMode, string> = {
    'COLOR': '純色',
    'IMAGE': '圖片',
    'VIDEO': '影片'
};

const PARTICLE_STYLE_LABELS: Record<ParticleStyle, string> = {
  [ParticleStyle.STANDARD]: '標準 (Standard)',
  [ParticleStyle.COSMOS]: '宇宙 (Cosmos)',
  [ParticleStyle.OCEAN]: '深海 (Ocean)',
  [ParticleStyle.GEOMETRIC]: '幾何 (Geometric)',
  [ParticleStyle.MUSICAL]: '音符 (Musical)',
  [ParticleStyle.SNOW]: '下雪 (Snow)',
};

type Tab = 'ASSETS' | 'DESIGN' | 'TOOLS';

const Controls: React.FC<ControlsProps> = ({ 
  settings, 
  updateSettings, 
  onAutoTheme, 
  isGeneratingTheme, 
  onOpenLyricEditor,
  onBgUpload,
  onSrtUpload,
  onTranslate,
  isTranslating,
  onSmartTiming,
  isTiming,
  onManualSync,
  onAudioUpload
}) => {
  const [activeTab, setActiveTab] = useState<Tab>('ASSETS');
  
  // Veo State
  const [isVeoUnlocked, setIsVeoUnlocked] = useState(false);
  const [veoPassword, setVeoPassword] = useState('');
  const [veoPrompt, setVeoPrompt] = useState('');
  const [veoImage, setVeoImage] = useState<string | undefined>(undefined);
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);

  const handleVeoUnlock = (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      setVeoPassword(val);
      // Simple obfuscation: 8520 -> ODUyMA== (Base64)
      // This prevents the password from being readable in plain text in the source code
      try {
        if (btoa(val) === 'ODUyMA==') {
            setIsVeoUnlocked(true);
        }
      } catch (e) {
        // Ignore invalid characters for btoa
      }
  };

  const handleVeoImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          const reader = new FileReader();
          reader.onloadend = () => {
              // Get base64 string without prefix for API
              const result = reader.result as string;
              const base64 = result.split(',')[1];
              setVeoImage(base64);
          };
          reader.readAsDataURL(file);
      }
  };

  const handleGenerateVideo = async () => {
      setIsGeneratingVideo(true);
      try {
          // Determine aspect ratio based on current settings
          // Veo only supports 16:9 or 9:16. Map 1:1 and 4:3 to 16:9 for now.
          const targetRatio = settings.aspectRatio === '9:16' ? '9:16' : '16:9';
          
          const videoUrl = await generateVideo(veoPrompt, veoImage, targetRatio);
          
          if (videoUrl) {
              updateSettings({
                  backgroundVideo: videoUrl,
                  backgroundMode: 'VIDEO'
              });
              setVeoPrompt('');
              setVeoImage(undefined);
              alert("影片生成成功！已自動套用至背景。");
          } else {
              alert("影片生成失敗，請稍後再試。");
          }
      } catch (e) {
          console.error(e);
          alert("發生錯誤，請檢查網路或 API Key。");
      } finally {
          setIsGeneratingVideo(false);
      }
  };

  return (
    <div className="bg-brand-900 border-l border-brand-800 h-full w-full md:w-80 flex flex-col font-sans shadow-2xl z-30">
      
      {/* Navigation Tabs */}
      <div className="flex border-b border-brand-800">
         <button 
           onClick={() => setActiveTab('ASSETS')}
           className={`flex-1 py-4 text-xs font-bold tracking-wider transition-colors ${activeTab === 'ASSETS' ? 'text-noodle border-b-2 border-noodle bg-brand-800/50' : 'text-stone-500 hover:text-stone-300'}`}
         >
           📦 備料
         </button>
         <button 
           onClick={() => setActiveTab('DESIGN')}
           className={`flex-1 py-4 text-xs font-bold tracking-wider transition-colors ${activeTab === 'DESIGN' ? 'text-noodle border-b-2 border-noodle bg-brand-800/50' : 'text-stone-500 hover:text-stone-300'}`}
         >
           🎨 調味
         </button>
         <button 
           onClick={() => setActiveTab('TOOLS')}
           className={`flex-1 py-4 text-xs font-bold tracking-wider transition-colors ${activeTab === 'TOOLS' ? 'text-noodle border-b-2 border-noodle bg-brand-800/50' : 'text-stone-500 hover:text-stone-300'}`}
         >
           🔥 烹飪
         </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-8">
        
        {/* === ASSETS TAB === */}
        {activeTab === 'ASSETS' && (
          <>
             {/* Audio Upload */}
             <div>
                <label className="block text-xs font-bold text-stone-400 uppercase tracking-wider mb-2">背景音樂</label>
                <label className="flex items-center justify-center w-full p-4 border-2 border-dashed border-brand-700 rounded-lg hover:border-noodle hover:bg-brand-800/30 cursor-pointer transition-all group">
                   <div className="text-center">
                      <div className="text-2xl mb-1 group-hover:scale-110 transition-transform">🎵</div>
                      <span className="text-xs text-stone-300">點擊上傳 MP3 / WAV</span>
                   </div>
                   <input type="file" accept="audio/*" onChange={onAudioUpload} className="hidden" />
                </label>
             </div>

             {/* Veo Video Generation (Locked) */}
             <div className="bg-gradient-to-br from-indigo-900/50 to-purple-900/50 p-4 rounded-lg border border-indigo-500/30">
                <label className="block text-xs font-bold text-indigo-300 uppercase tracking-wider mb-2 flex items-center gap-2">
                    ✨ AI 影片魔法 (Veo)
                    {!isVeoUnlocked && <span className="text-[10px] bg-black/30 px-1 rounded">Locked</span>}
                </label>
                
                {!isVeoUnlocked ? (
                    <input 
                      type="password" 
                      placeholder="輸入密碼解鎖 (****)" 
                      value={veoPassword}
                      onChange={handleVeoUnlock}
                      className="w-full bg-black/50 text-white text-sm rounded-md border border-indigo-700 p-2 outline-none focus:border-indigo-400 text-center"
                    />
                ) : (
                    <div className="space-y-3 animate-fade-in">
                        <textarea 
                           value={veoPrompt}
                           onChange={(e) => setVeoPrompt(e.target.value)}
                           placeholder="描述影片內容 (例如: A neon city drive loop)..."
                           className="w-full bg-black/50 text-stone-200 text-xs rounded-md border border-indigo-700 p-2 outline-none focus:border-indigo-400 h-20 resize-none"
                        />
                        
                        <label className="flex items-center justify-center w-full py-2 bg-indigo-900/50 hover:bg-indigo-800 rounded border border-indigo-700 cursor-pointer transition-colors text-xs text-indigo-200 gap-2">
                            {veoImage ? "🖼️ 已選取圖片 (可更換)" : "📤 上傳參考圖片 (選填)"}
                            <input type="file" accept="image/*" onChange={handleVeoImageUpload} className="hidden" />
                        </label>

                        <button 
                           onClick={handleGenerateVideo}
                           disabled={isGeneratingVideo}
                           className="w-full py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:brightness-110 text-white rounded-md text-xs font-bold transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-wait"
                        >
                           {isGeneratingVideo ? (
                               <>
                                 <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                 生成中 (約 1 分鐘)...
                               </>
                           ) : '🎬 生成影片'}
                        </button>
                        <div className="text-[10px] text-indigo-400 text-center">
                            模式: {settings.aspectRatio === '9:16' ? '9:16 (直式)' : '16:9 (橫式)'}
                        </div>
                    </div>
                )}
             </div>

             {/* Drive Link */}
             <div>
                <label className="block text-xs font-bold text-stone-400 uppercase tracking-wider mb-2">專案資源庫 (Drive)</label>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    value={settings.driveFolderUrl || ''}
                    onChange={(e) => updateSettings({ driveFolderUrl: e.target.value })}
                    placeholder="貼上連結..."
                    className="flex-1 bg-brand-800 text-xs text-white rounded-md border border-brand-700 p-2 outline-none focus:border-noodle focus:ring-1 focus:ring-noodle"
                  />
                  {settings.driveFolderUrl && (
                    <a 
                      href={settings.driveFolderUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 bg-brand-700 hover:bg-noodle hover:text-brand-900 text-stone-300 rounded-md flex items-center justify-center transition-colors"
                      title="開啟資料夾"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg>
                    </a>
                  )}
                </div>
             </div>

             {/* Lyrics & SRT */}
             <div>
               <label className="block text-xs font-bold text-stone-400 uppercase tracking-wider mb-2">歌詞素材</label>
               <div className="grid grid-cols-1 gap-2">
                 <button 
                   onClick={onOpenLyricEditor}
                   className="w-full py-2 border border-brand-600 text-stone-300 hover:bg-brand-800 rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-2"
                 >
                   📝 編輯歌詞 / 翻譯
                 </button>
                 <label className="cursor-pointer w-full py-2 border border-brand-600 text-stone-300 hover:bg-brand-800 rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-2">
                   📄 匯入 SRT 字幕
                   <input type="file" accept=".srt" onChange={onSrtUpload} className="hidden" />
                 </label>
               </div>
             </div>

             {/* Background Settings */}
             <div>
               <div className="text-xs text-stone-500 mb-2 font-bold uppercase tracking-wider">背景畫面</div>
               
               {/* Background Mode Switcher */}
               <div className="flex bg-brand-800 p-1 rounded-md mb-3">
                   {(['COLOR', 'IMAGE', 'VIDEO'] as BackgroundMode[]).map(mode => (
                       <button
                         key={mode}
                         onClick={() => updateSettings({ backgroundMode: mode })}
                         className={`flex-1 text-xs py-1.5 rounded transition-all ${settings.backgroundMode === mode ? 'bg-brand-600 text-white font-bold shadow-sm' : 'text-stone-400 hover:text-stone-200'}`}
                       >
                           {BG_MODE_LABELS[mode]}
                       </button>
                   ))}
               </div>

               <div className="flex flex-col gap-2">
                 {settings.backgroundMode === 'IMAGE' && (
                     <>
                        <label className="cursor-pointer w-full py-3 bg-brand-800 hover:bg-brand-700 rounded-md text-xs text-center text-stone-300 border border-brand-700 transition-colors flex items-center justify-center gap-2">
                            📷 上傳圖片
                            <input type="file" accept="image/*" onChange={onBgUpload} className="hidden" />
                        </label>
                        {settings.backgroundImage && (
                            <div className="text-xs text-stone-400 text-center truncate">已載入: 圖片</div>
                        )}
                        <div className="text-center text-[10px] text-stone-500 mt-1">支援 PNG, JPG, WebP</div>
                     </>
                 )}

                 {settings.backgroundMode === 'VIDEO' && (
                     <>
                        <label className="cursor-pointer w-full py-3 bg-brand-800 hover:bg-brand-700 rounded-md text-xs text-center text-stone-300 border border-brand-700 transition-colors flex items-center justify-center gap-2">
                            🎥 上傳影片
                            <input type="file" accept="video/*" onChange={onBgUpload} className="hidden" />
                        </label>
                        {settings.backgroundVideo && (
                            <div className="text-xs text-stone-400 text-center truncate">已載入: 影片</div>
                        )}
                        <div className="text-center text-[10px] text-stone-500 mt-1">支援 MP4, WebM (建議短循環)</div>
                     </>
                 )}

                 {settings.backgroundMode === 'COLOR' && (
                      <div className="flex items-center justify-between bg-brand-800 p-3 rounded-md border border-brand-700">
                        <span className="text-sm text-stone-300">畫布底色</span>
                        <input 
                            type="color" 
                            value={settings.backgroundColor}
                            onChange={(e) => updateSettings({ backgroundColor: e.target.value })}
                            className="w-6 h-6 rounded cursor-pointer bg-transparent border-none"
                        />
                      </div>
                 )}

                 {(settings.backgroundMode === 'IMAGE' || settings.backgroundMode === 'VIDEO') && (
                     <div className="mt-4 pt-4 border-t border-brand-700/50">
                        <div className="flex justify-between text-xs text-stone-400 mb-1">
                            <span>背景亮度</span>
                            <span>{Math.round((settings.backgroundBrightness ?? 1) * 100)}%</span>
                        </div>
                        <input 
                            type="range" 
                            min="0" 
                            max="2" 
                            step="0.1"
                            value={settings.backgroundBrightness ?? 1}
                            onChange={(e) => updateSettings({ backgroundBrightness: Number(e.target.value) })}
                            className="w-full accent-noodle h-1 bg-brand-700 rounded-lg appearance-none cursor-pointer"
                        />
                     </div>
                 )}
               </div>
             </div>
          </>
        )}

        {/* === DESIGN TAB === */}
        {activeTab === 'DESIGN' && (
          <>
             {/* Aspect Ratio */}
             <div>
                <label className="block text-xs font-bold text-stone-400 uppercase tracking-wider mb-2">影片比例 (1080p)</label>
                <div className="grid grid-cols-2 gap-2 bg-brand-800 p-2 rounded-md mb-2">
                  <button
                    onClick={() => updateSettings({ aspectRatio: '16:9' })}
                    className={`flex items-center justify-center gap-2 py-2 rounded text-xs transition-all ${settings.aspectRatio === '16:9' ? 'bg-noodle text-brand-900 font-bold shadow' : 'text-stone-400 hover:text-stone-200'}`}
                  >
                    16:9 橫式
                  </button>
                  <button
                    onClick={() => updateSettings({ aspectRatio: '9:16' })}
                    className={`flex items-center justify-center gap-2 py-2 rounded text-xs transition-all ${settings.aspectRatio === '9:16' ? 'bg-noodle text-brand-900 font-bold shadow' : 'text-stone-400 hover:text-stone-200'}`}
                  >
                    9:16 直式
                  </button>
                  <button
                    onClick={() => updateSettings({ aspectRatio: '1:1' })}
                    className={`flex items-center justify-center gap-2 py-2 rounded text-xs transition-all ${settings.aspectRatio === '1:1' ? 'bg-noodle text-brand-900 font-bold shadow' : 'text-stone-400 hover:text-stone-200'}`}
                  >
                    1:1 方形
                  </button>
                  <button
                    onClick={() => updateSettings({ aspectRatio: '4:3' })}
                    className={`flex items-center justify-center gap-2 py-2 rounded text-xs transition-all ${settings.aspectRatio === '4:3' ? 'bg-noodle text-brand-900 font-bold shadow' : 'text-stone-400 hover:text-stone-200'}`}
                  >
                    4:3 標準
                  </button>
                </div>
             </div>

            {/* Style Presets */}
            <div>
              <label className="block text-xs font-bold text-stone-400 uppercase tracking-wider mb-2">風格預設</label>
              <div className="grid grid-cols-2 gap-2">
                {Object.values(ThemeStyle).map((style) => (
                  <button
                    key={style}
                    onClick={() => updateSettings({ style })}
                    className={`py-2 px-2 text-xs rounded border transition-all truncate ${
                      settings.style === style 
                        ? 'bg-noodle border-noodle text-brand-900 font-bold' 
                        : 'bg-transparent border-brand-700 text-stone-400 hover:border-brand-500'
                    }`}
                  >
                    {THEME_LABELS[style]}
                  </button>
                ))}
              </div>
            </div>

            {/* Colors */}
            <div>
              <label className="block text-xs font-bold text-stone-400 uppercase tracking-wider mb-2">色調</label>
              <div className="grid grid-cols-1 gap-3 bg-brand-800/50 p-3 rounded-lg border border-brand-700">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-stone-300">主色 (Neon)</span>
                  <input 
                    type="color" 
                    value={settings.primaryColor}
                    onChange={(e) => updateSettings({ primaryColor: e.target.value })}
                    className="w-6 h-6 rounded cursor-pointer bg-transparent border-none"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-stone-300">次色 (Particle)</span>
                  <input 
                    type="color" 
                    value={settings.secondaryColor}
                    onChange={(e) => updateSettings({ secondaryColor: e.target.value })}
                    className="w-6 h-6 rounded cursor-pointer bg-transparent border-none"
                  />
                </div>
              </div>
            </div>

            {/* Particle Style */}
            <div>
               <label className="block text-xs font-bold text-stone-400 uppercase tracking-wider mb-2">粒子風格</label>
               <select
                 value={settings.particleStyle}
                 onChange={(e) => updateSettings({ particleStyle: e.target.value as ParticleStyle })}
                 className="w-full bg-brand-800 text-stone-200 text-sm rounded-md border border-brand-700 p-2 focus:ring-1 focus:ring-noodle outline-none mb-2"
               >
                 {Object.values(ParticleStyle).map(type => (
                   <option key={type} value={type}>{PARTICLE_STYLE_LABELS[type]}</option>
                   ))}
               </select>
               
               <div className="mb-2">
                    <span className="text-xs text-stone-500 block mb-1">粒子數量 ({settings.particleCount})</span>
                    <input 
                      type="range" 
                      min="0" 
                      max="200" 
                      value={settings.particleCount}
                      onChange={(e) => updateSettings({ particleCount: Number(e.target.value) })}
                      className="w-full accent-soup h-1 bg-brand-700 rounded-lg appearance-none cursor-pointer"
                    />
               </div>

               <div className="mb-2">
                    <span className="text-xs text-stone-500 block mb-1">粒子速度 ({settings.particleSpeed}x)</span>
                    <input 
                      type="range" 
                      min="0.1" 
                      max="5.0" 
                      step="0.1"
                      value={settings.particleSpeed}
                      onChange={(e) => updateSettings({ particleSpeed: Number(e.target.value) })}
                      className="w-full accent-soup h-1 bg-brand-700 rounded-lg appearance-none cursor-pointer"
                    />
               </div>
               
               <div>
                    <span className="text-xs text-stone-500 block mb-1">粒子大小 ({settings.particleSize || 1.0}x)</span>
                    <input 
                      type="range" 
                      min="0.1" 
                      max="3.0" 
                      step="0.1"
                      value={settings.particleSize || 1.0}
                      onChange={(e) => updateSettings({ particleSize: Number(e.target.value) })}
                      className="w-full accent-soup h-1 bg-brand-700 rounded-lg appearance-none cursor-pointer"
                    />
               </div>
            </div>

            {/* Typography */}
            <div>
              <label className="block text-xs font-bold text-stone-400 uppercase tracking-wider mb-2">字體設定</label>
              <div className="space-y-3">
                 <select
                   value={settings.fontFamily}
                   onChange={(e) => updateSettings({ fontFamily: e.target.value })}
                   className="w-full bg-brand-800 text-stone-200 text-sm rounded-md border border-brand-700 p-2 focus:ring-1 focus:ring-noodle outline-none"
                 >
                   {FONTS.map(font => (
                     <option key={font.name} value={font.name}>{font.label}</option>
                   ))}
                 </select>

                 <div>
                    <span className="text-xs text-stone-500 block mb-1">字體大小 ({settings.fontSize}px)</span>
                    <input 
                      type="range" 
                      min="20" 
                      max="120" 
                      value={settings.fontSize}
                      onChange={(e) => updateSettings({ fontSize: Number(e.target.value) })}
                      className="w-full accent-noodle h-1 bg-brand-700 rounded-lg appearance-none cursor-pointer"
                    />
                 </div>
                 
                 <div className="flex items-center gap-2 pt-2">
                    <input 
                      type="checkbox" 
                      id="showTranslation"
                      checked={settings.showTranslation}
                      onChange={(e) => updateSettings({ showTranslation: e.target.checked })}
                      className="rounded text-noodle focus:ring-noodle bg-brand-800 border-brand-700"
                    />
                    <label htmlFor="showTranslation" className="text-sm text-stone-300 select-none cursor-pointer">顯示翻譯字幕</label>
                 </div>
              </div>
            </div>

            {/* Animation */}
            <div>
              <label className="block text-xs font-bold text-stone-400 uppercase tracking-wider mb-2">動態效果</label>
              <div className="space-y-3">
                 <select
                   value={settings.animationType}
                   onChange={(e) => updateSettings({ animationType: e.target.value as AnimationType })}
                   className="w-full bg-brand-800 text-stone-200 text-sm rounded-md border border-brand-700 p-2 focus:ring-1 focus:ring-noodle outline-none"
                 >
                   {Object.values(AnimationType).map(type => (
                     <option key={type} value={type}>{ANIMATION_LABELS[type]}</option>
                   ))}
                 </select>
                 
                 <div>
                    <span className="text-xs text-stone-500 block mb-1">動畫速度 ({settings.animationSpeed}x)</span>
                    <input 
                      type="range" 
                      min="0.1" 
                      max="3.0" 
                      step="0.1"
                      value={settings.animationSpeed}
                      onChange={(e) => updateSettings({ animationSpeed: Number(e.target.value) })}
                      className="w-full accent-noodle h-1 bg-brand-700 rounded-lg appearance-none cursor-pointer"
                    />
                 </div>

                 <div>
                    <span className="text-xs text-stone-500 block mb-1">過場時間 ({settings.transitionDuration}s)</span>
                    <input 
                      type="range" 
                      min="0.1" 
                      max="2.0" 
                      step="0.1"
                      value={settings.transitionDuration}
                      onChange={(e) => updateSettings({ transitionDuration: Number(e.target.value) })}
                      className="w-full accent-noodle h-1 bg-brand-700 rounded-lg appearance-none cursor-pointer"
                    />
                 </div>
              </div>
            </div>
          </>
        )}

        {/* === TOOLS TAB === */}
        {activeTab === 'TOOLS' && (
          <div className="space-y-6">
            <div className="p-4 bg-brand-800 rounded-lg border border-brand-700">
              <h3 className="text-sm font-semibold text-soup mb-4 flex items-center gap-2">
                ✨ 阿嬤的魔法廚房 (AI)
              </h3>
              
              <div className="space-y-3">
                <button 
                  onClick={onManualSync}
                  className="w-full py-3 bg-gradient-to-r from-soup to-noodle text-brand-900 hover:brightness-110 rounded-md text-sm font-bold transition-all shadow-lg flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                  手動節奏對時 (推薦)
                </button>

                <div className="h-px bg-brand-600/30 my-2"></div>

                <button 
                  onClick={onAutoTheme}
                  disabled={isGeneratingTheme}
                  className="w-full py-2 bg-brand-700 hover:bg-brand-600 disabled:opacity-50 text-stone-200 rounded-md text-xs font-medium transition-colors text-left px-3 flex items-center gap-2"
                >
                  🔮 {isGeneratingTheme ? '阿嬤正在算命...' : '阿嬤幫你算命 (自動主題)'}
                </button>

                <button 
                  onClick={onSmartTiming}
                  disabled={isTiming}
                  className="w-full py-2 bg-brand-700 hover:bg-brand-600 disabled:opacity-50 text-stone-200 rounded-md text-xs font-medium transition-colors text-left px-3 flex items-center gap-2"
                >
                  ⏱️ {isTiming ? '阿嬤正在聽歌...' : '阿嬤幫你抓節奏 (智能對時)'}
                </button>
                
                <button 
                  onClick={onTranslate}
                  disabled={isTranslating}
                  className="w-full py-2 bg-brand-700 hover:bg-brand-600 disabled:opacity-50 text-stone-200 rounded-md text-xs font-medium transition-colors text-left px-3 flex items-center gap-2"
                >
                  🉐 {isTranslating ? '阿嬤正在翻譯...' : '阿嬤幫你翻譯 (繁中)'}
                </button>
              </div>
            </div>
            
            <div className="text-xs text-stone-500 leading-relaxed">
               <p className="mb-2">💡 <strong>阿嬤小撇步：</strong></p>
               <ul className="list-disc pl-4 space-y-1">
                 <li>先上傳音樂，再貼上歌詞。</li>
                 <li>用「手動對時」最準，阿嬤耳朵有時候背。</li>
                 <li>背景影片建議使用短循環素材。</li>
               </ul>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default Controls;

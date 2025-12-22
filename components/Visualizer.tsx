import React, { useEffect, useRef, useState, useCallback } from 'react';
import { LyricLine, VisualSettings, ThemeStyle, AnimationType, ParticleStyle, AspectRatio } from '../types';

interface VisualizerProps {
  lyrics: LyricLine[];
  currentTime: number;
  isPlaying: boolean;
  audioRef: React.RefObject<HTMLAudioElement>;
  settings: VisualSettings;
  onExportProgress: (isExporting: boolean) => void;
}

const easeOutCubic = (x: number): number => 1 - Math.pow(1 - x, 3);
const easeInOutSine = (x: number): number => -(Math.cos(Math.PI * x) - 1) / 2;
const easeOutBack = (x: number): number => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
};

class Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  life: number;
  maxLife: number;
  style: ParticleStyle;
  angle: number;
  rotationSpeed: number;
  type: number; // For styling variations

  constructor(w: number, h: number, color: string, style: ParticleStyle, sizeMultiplier: number = 1.0) {
    this.x = Math.random() * w;
    this.y = Math.random() * h;
    this.style = style;
    this.color = color;
    this.life = 0;
    this.maxLife = Math.random() * 100 + 100;
    this.angle = Math.random() * Math.PI * 2;
    this.rotationSpeed = (Math.random() - 0.5) * 0.05;
    this.type = Math.floor(Math.random() * 3); // 0, 1, 2

    // Initialize based on style and apply sizeMultiplier
    if (style === ParticleStyle.OCEAN) {
        this.vx = (Math.random() - 0.5) * 0.5;
        this.vy = -Math.random() * 1.5 - 0.2; // Bubbles float up
        this.size = (Math.random() * 4 + 2) * sizeMultiplier;
    } else if (style === ParticleStyle.COSMOS) {
        this.vx = (Math.random() - 0.5) * 0.2; // Slow drift
        this.vy = (Math.random() - 0.5) * 0.2;
        const baseSize = this.type === 0 ? Math.random() * 1.5 + 0.5 : Math.random() * 4 + 2;
        this.size = baseSize * sizeMultiplier; 
        this.maxLife = Math.random() * 200 + 200; // Longer life
    } else if (style === ParticleStyle.GEOMETRIC) {
        this.vx = (Math.random() - 0.5) * 2;
        this.vy = (Math.random() - 0.5) * 2;
        this.size = (Math.random() * 6 + 4) * sizeMultiplier;
        this.rotationSpeed = (Math.random() - 0.5) * 0.1;
    } else if (style === ParticleStyle.MUSICAL) {
        this.vx = (Math.random() - 0.5) * 1;
        this.vy = -Math.random() * 1 - 0.2; // Float up slowly
        this.size = (Math.random() * 10 + 10) * sizeMultiplier;
        this.rotationSpeed = (Math.random() - 0.5) * 0.02;
    } else if (style === ParticleStyle.SNOW) {
        this.vx = (Math.random() - 0.5) * 0.5; // Slight wind drift
        this.vy = Math.random() * 2 + 1; // Fall down
        this.size = (Math.random() * 3 + 1) * sizeMultiplier;
    } else {
        // STANDARD
        this.vx = (Math.random() - 0.5) * 1;
        this.vy = (Math.random() - 0.5) * 1;
        this.size = (Math.random() * 3 + 1) * sizeMultiplier;
    }
  }

  update(width: number, height: number, beatFactor: number, speedFactor: number) {
    // Apply speedFactor to velocity components
    const moveX = this.vx * speedFactor * beatFactor;
    const moveY = this.vy * speedFactor * beatFactor;

    if (this.style === ParticleStyle.OCEAN) {
        this.x += moveX + Math.sin(this.life * 0.05) * 0.5; 
        this.y += moveY;
    } else if (this.style === ParticleStyle.SNOW) {
        this.x += moveX + Math.sin(this.life * 0.05) * 0.5;
        this.y += moveY;
    } else {
        this.x += moveX;
        this.y += moveY;
    }
    
    this.angle += this.rotationSpeed * beatFactor * speedFactor;
    this.life++;

    // Wrap around or bounce depending on style, here we just bounce/reset
    if (this.style === ParticleStyle.OCEAN || this.style === ParticleStyle.MUSICAL) {
        // Reset if goes off top
        if (this.y < -50) {
            this.y = height + 50;
            this.x = Math.random() * width;
            this.life = 0;
        }
    } else if (this.style === ParticleStyle.SNOW) {
        // Reset if goes off bottom
        if (this.y > height + 50) {
            this.y = -50;
            this.x = Math.random() * width;
            this.life = 0;
        }
    } else {
        if (this.x < 0 || this.x > width) this.vx *= -1;
        if (this.y < 0 || this.y > height) this.vy *= -1;
    }
  }

  draw(ctx: CanvasRenderingContext2D) {
    const alpha = 1 - this.life / this.maxLife;
    ctx.globalAlpha = Math.max(0, alpha);
    ctx.fillStyle = this.color;
    ctx.strokeStyle = this.color;

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);

    if (this.style === ParticleStyle.OCEAN) {
        // Bubble (circle with stroke)
        ctx.beginPath();
        ctx.arc(0, 0, this.size, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,255,255,0.1)';
        ctx.fill();
        ctx.lineWidth = 1;
        ctx.stroke();
        // Shine
        ctx.beginPath();
        ctx.arc(-this.size * 0.3, -this.size * 0.3, this.size * 0.2, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        ctx.fill();

    } else if (this.style === ParticleStyle.COSMOS) {
        if (this.type === 0) {
            // Star (twinkle)
            const twinkle = Math.abs(Math.sin(this.life * 0.1));
            ctx.globalAlpha = alpha * twinkle;
            ctx.beginPath();
            ctx.arc(0, 0, this.size, 0, Math.PI * 2);
            ctx.fill();
        } else {
            // Planet
            ctx.beginPath();
            ctx.arc(0, 0, this.size, 0, Math.PI * 2);
            ctx.fill();
            // Ring
            ctx.beginPath();
            ctx.ellipse(0, 0, this.size * 1.8, this.size * 0.5, 0.5, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(255,255,255,0.3)';
            ctx.stroke();
        }

    } else if (this.style === ParticleStyle.GEOMETRIC) {
        ctx.beginPath();
        if (this.type === 0) {
            // Triangle
            ctx.moveTo(0, -this.size);
            ctx.lineTo(this.size, this.size);
            ctx.lineTo(-this.size, this.size);
        } else if (this.type === 1) {
            // Square
            ctx.rect(-this.size, -this.size, this.size * 2, this.size * 2);
        } else {
            // Hexagon (approx)
            for (let i = 0; i < 6; i++) {
                const angle = (i * Math.PI) / 3;
                const x = Math.cos(angle) * this.size;
                const y = Math.sin(angle) * this.size;
                if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
            }
        }
        ctx.closePath();
        ctx.stroke(); // Outline style
        ctx.globalAlpha = alpha * 0.2;
        ctx.fill();

    } else if (this.style === ParticleStyle.MUSICAL) {
        const notes = ['♪', '♫', '♩'];
        const note = notes[this.type % notes.length];
        ctx.font = `${this.size}px serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(note, 0, 0);

    } else {
        // STANDARD & SNOW (Circle)
        ctx.beginPath();
        ctx.arc(0, 0, this.size, 0, Math.PI * 2);
        ctx.fill();
    }

    ctx.restore();
    ctx.globalAlpha = 1.0;
  }
}

const getResolution = (ratio: AspectRatio): { width: number, height: number } => {
    switch (ratio) {
        case '16:9': return { width: 1920, height: 1080 };
        case '9:16': return { width: 1080, height: 1920 };
        case '1:1': return { width: 1080, height: 1080 };
        case '4:3': return { width: 1440, height: 1080 };
        default: return { width: 1920, height: 1080 };
    }
};

const Visualizer: React.FC<VisualizerProps> = ({
  lyrics,
  currentTime,
  isPlaying,
  audioRef,
  settings,
  onExportProgress
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const requestRef = useRef<number | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const bgImageRef = useRef<HTMLImageElement | null>(null);
  const bgVideoRef = useRef<HTMLVideoElement>(document.createElement('video'));
  
  // Stable Refs
  const stateRef = useRef({ lyrics, settings, currentTime, isPlaying });

  // Store recording extension to use in onstop
  const recordingExtRef = useRef<string>('webm');

  useEffect(() => {
    stateRef.current = { lyrics, settings, currentTime, isPlaying };
  }, [lyrics, settings, currentTime, isPlaying]);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const [recording, setRecording] = useState(false);

  const initAudio = useCallback(() => {
    if (!audioRef.current || audioContextRef.current) return;

    const AudioCtor = (window.AudioContext || (window as any).webkitAudioContext) as any;
    const ctx = new AudioCtor();
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    
    const source = ctx.createMediaElementSource(audioRef.current as HTMLMediaElement);
    source.connect(analyser);
    analyser.connect(ctx.destination);

    audioContextRef.current = ctx;
    analyserRef.current = analyser;
    sourceRef.current = source;
  }, [audioRef]);

  // Handle Background Image
  useEffect(() => {
    if (settings.backgroundImage) {
      const img = new Image();
      img.src = settings.backgroundImage;
      img.onload = () => {
        bgImageRef.current = img;
      };
    } else {
      bgImageRef.current = null;
    }
  }, [settings.backgroundImage]);

  // Handle Background Video
  useEffect(() => {
    const video = bgVideoRef.current;
    if (settings.backgroundMode === 'VIDEO' && settings.backgroundVideo) {
      if (video.src !== settings.backgroundVideo) {
         video.src = settings.backgroundVideo;
         video.loop = true;
         video.muted = true;
         video.setAttribute('playsinline', 'true');
      }
      video.play().catch(e => console.error("Background video play error:", e));
    } else {
      video.pause();
    }
  }, [settings.backgroundVideo, settings.backgroundMode]);

  useEffect(() => {
    const resize = () => {
      if (canvasRef.current) {
        // Force internal resolution based on Aspect Ratio setting (High Quality)
        const { width, height } = getResolution(settings.aspectRatio);
        
        canvasRef.current.width = width;
        canvasRef.current.height = height;
        
        // Ensure CSS does not distort:
        // By setting width/height to 100%, we rely on the container to have correct aspect ratio.
        canvasRef.current.style.width = '100%';
        canvasRef.current.style.height = '100%';
        
        particlesRef.current = [];
      }
    };
    resize();
  }, [settings.aspectRatio]); 

  const animate = useCallback(() => {
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    const { lyrics, settings, currentTime, isPlaying } = stateRef.current;
    
    // Canvas dimensions are now fixed high-res
    const width = canvasRef.current.width;
    const height = canvasRef.current.height;

    // Reset transform to default identity because we are not using DPR scaling on ctx anymore
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    let beatFactor = 1.0;
    if (analyserRef.current) {
      const bufferLength = analyserRef.current.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      analyserRef.current.getByteFrequencyData(dataArray);
      let sum = 0;
      for (let i = 0; i < 20; i++) sum += dataArray[i];
      const average = sum / 20;
      beatFactor = 1 + (average / 255) * settings.beatSensitivity;
    }

    ctx.clearRect(0, 0, width, height);

    // BACKGROUND RENDERING LOGIC
    const drawCover = (source: HTMLImageElement | HTMLVideoElement, srcW: number, srcH: number) => {
        const targetRatio = width / height;
        const sourceRatio = srcW / srcH;

        let sx, sy, sWidth, sHeight;

        if (sourceRatio > targetRatio) {
            // Source is wider than target: Crop width
            sHeight = srcH;
            sWidth = srcH * targetRatio;
            sx = (srcW - sWidth) / 2;
            sy = 0;
        } else {
            // Source is taller than target: Crop height
            sWidth = srcW;
            sHeight = srcW / targetRatio;
            sx = 0;
            sy = (srcH - sHeight) / 2;
        }

        ctx.save();
        ctx.filter = `brightness(${settings.backgroundBrightness ?? 1.0})`;
        ctx.drawImage(source, sx, sy, sWidth, sHeight, 0, 0, width, height);
        ctx.restore();
        
        ctx.fillStyle = `rgba(0,0,0,0.4)`;
        ctx.fillRect(0, 0, width, height);
    };

    if (settings.backgroundMode === 'VIDEO' && settings.backgroundVideo && bgVideoRef.current.readyState >= 2) {
         drawCover(bgVideoRef.current, bgVideoRef.current.videoWidth, bgVideoRef.current.videoHeight);
    } else if (settings.backgroundMode === 'IMAGE' && bgImageRef.current) {
         drawCover(bgImageRef.current, bgImageRef.current.naturalWidth, bgImageRef.current.naturalHeight);
    } else {
      ctx.fillStyle = settings.backgroundColor;
      ctx.fillRect(0, 0, width, height);
    }

    // Particles
    if (particlesRef.current.length < settings.particleCount) {
      particlesRef.current.push(new Particle(width, height, Math.random() > 0.5 ? settings.primaryColor : settings.secondaryColor, settings.particleStyle, settings.particleSize ?? 1.0));
    }
    particlesRef.current.forEach((p, index) => {
      p.update(width, height, beatFactor, settings.particleSpeed ?? 1.0);
      p.draw(ctx);
      if (p.life >= p.maxLife || p.y < -100 || p.y > height + 100 || p.x < -100 || p.x > width + 100) {
          if (settings.particleStyle !== ParticleStyle.OCEAN && settings.particleStyle !== ParticleStyle.MUSICAL && settings.particleStyle !== ParticleStyle.SNOW) {
              particlesRef.current.splice(index, 1);
          } else if (p.life >= p.maxLife) {
             particlesRef.current.splice(index, 1);
          }
      }
    });

    // Audio Bars
    if (analyserRef.current) {
      const bufferLength = analyserRef.current.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      analyserRef.current.getByteFrequencyData(dataArray);
      const barWidth = (width / bufferLength) * 2.5;
      let barX = 0;
      for(let i = 0; i < bufferLength; i++) {
        const barHeight = (dataArray[i] / 255) * (height / 3) * beatFactor;
        ctx.fillStyle = settings.secondaryColor;
        ctx.globalAlpha = 0.3;
        ctx.fillRect(barX, height - barHeight, barWidth, barHeight);
        ctx.globalAlpha = 1.0;
        barX += barWidth + 1;
      }
    }

    const transitionDuration = settings.transitionDuration || 0.5;

    // Text Helpers
    const setupTextContext = () => {
        // Scale font size based on the SHORTER dimension to ensure consistent look
        // regardless of orientation (1080p landscape vs 1080p portrait)
        const scaleRatio = Math.min(width, height) / 1080;
        const adjustedFontSize = settings.fontSize * scaleRatio;
        
        ctx.font = `900 ${adjustedFontSize}px ${settings.fontFamily}`;
        ctx.fillStyle = '#ffffff';
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        if (settings.style === ThemeStyle.NEON) {
            ctx.shadowColor = settings.primaryColor;
            ctx.shadowBlur = 8; // Significantly reduced from 15/25 for sharpness
        } else if (settings.style === ThemeStyle.FIERY) {
            ctx.shadowColor = '#ea580c';
            ctx.shadowBlur = 8; // Significantly reduced from 12/20
        } else if (settings.style === ThemeStyle.MINIMAL) {
            ctx.shadowBlur = 0;
        } else {
            ctx.shadowColor = 'rgba(0,0,0,0.5)';
            ctx.shadowBlur = 5;
        }
        return adjustedFontSize;
    };

    const drawTextContent = (txt: string, x: number, y: number) => {
        if (settings.style === ThemeStyle.NEON || settings.style === ThemeStyle.FIERY) {
            // Draw the glowing stroke/surround
            ctx.lineWidth = 3;
            ctx.strokeStyle = settings.primaryColor;
            ctx.strokeText(txt, x, y);
            
            // Draw the base filled text (inherits shadow from context)
            ctx.fillText(txt, x, y);

            // Draw a crisp white overlay on top WITHOUT shadow to improve legibility
            // And use globalCompositeOperation to ensure it pops
            ctx.save();
            ctx.shadowBlur = 0;
            ctx.shadowColor = 'transparent';
            ctx.fillStyle = '#ffffff';
            ctx.fillText(txt, x, y);
            ctx.restore();
        } else {
            ctx.fillText(txt, x, y);
        }
    };

    const drawLine = (line: LyricLine, phase: 'enter' | 'active' | 'exit', progress: number) => {
      ctx.save();
      const currentFontSize = setupTextContext();
      
      let alpha = 1.0;
      let scale = 1.0;
      let yOffset = 0;
      let blurAmount = 0;
      const animType = settings.animationType;
      const fontBasedOffset = currentFontSize * 1.5; 
      
      // Get animation speed setting (default to 1.0)
      const animSpeedSetting = settings.animationSpeed || 1.0;

      if (phase === 'enter') {
        const t = easeOutCubic(progress); 
        if (animType === AnimationType.FADE) {
          alpha = t; blurAmount = (1 - t) * 4;
        } else if (animType === AnimationType.SLIDE_UP) {
          alpha = t; yOffset = fontBasedOffset * (1 - t); blurAmount = (1 - t) * 3;
        } else if (animType === AnimationType.ZOOM) {
          alpha = t; scale = 0.8 + (0.2 * t); blurAmount = (1 - t) * 2;
        } else if (animType === AnimationType.BOUNCE) {
          alpha = Math.min(1, progress * 3);
          const bounceT = easeOutBack(progress);
          scale = 0.5 + (0.5 * bounceT);
        } else if (animType === AnimationType.WAVE) {
           alpha = t; blurAmount = (1-t) * 2;
        } else {
            alpha = 1; 
        }
      } else if (phase === 'exit') {
        const t = easeInOutSine(progress); 
        if (animType === AnimationType.FADE || animType === AnimationType.TYPEWRITER || animType === AnimationType.KINETIC || animType === AnimationType.REVEAL || animType === AnimationType.WAVE) {
          alpha = 1 - t; blurAmount = t * 4;
        } else if (animType === AnimationType.SLIDE_UP) {
          alpha = 1 - t; yOffset = -fontBasedOffset * t; blurAmount = t * 3;
        } else if (animType === AnimationType.ZOOM) {
          alpha = 1 - t; scale = 1 + (0.3 * t); blurAmount = t * 2;
        } else if (animType === AnimationType.BOUNCE) {
          alpha = 1 - t; scale = 1 - (0.3 * t);
        }
      } else if (phase === 'active') {
          // Add subtle life to active text based on animation speed
          // Skip if Wave because Wave has its own continuous motion
          if (animType !== AnimationType.WAVE) {
              const idleTime = currentTime * animSpeedSetting;
              yOffset += Math.sin(idleTime) * 3; // Subtle float
          }
      }
      
      ctx.translate(width / 2, height / 2 + yOffset);
      ctx.scale(scale, scale);
      ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
      if (blurAmount > 0.5) ctx.filter = `blur(${blurAmount}px)`; else ctx.filter = 'none';

      const lines = line.text.split('\n');
      const lineHeight = currentFontSize * 1.2;
      const totalHeight = (lines.length - 1) * lineHeight;
      
      lines.forEach((txt, i) => {
          const ly = (i * lineHeight) - (totalHeight / 2);
          if (phase === 'enter' && animType === AnimationType.TYPEWRITER) {
              const visibleLen = Math.floor(txt.length * progress);
              const visibleText = txt.substring(0, visibleLen);
              const fullWidth = ctx.measureText(txt).width;
              ctx.textAlign = 'left';
              if (visibleText.length > 0) drawTextContent(visibleText, -fullWidth / 2, ly);
              ctx.textAlign = 'center';
          } else if (phase === 'enter' && animType === AnimationType.KINETIC) {
              const fullWidth = ctx.measureText(txt).width;
              let currentX = -fullWidth / 2;
              ctx.textAlign = 'left';
              const chars = txt.split('');
              chars.forEach((char, idx) => {
                  const charWidth = ctx.measureText(char).width;
                  const startP = (idx / chars.length) * 0.8;
                  const endP = startP + 0.3; 
                  const p = (progress - startP) / (endP - startP);
                  const clampedP = Math.max(0, Math.min(1, p));
                  if (clampedP > 0) {
                      const charScale = easeOutBack(clampedP);
                      ctx.save();
                      ctx.translate(currentX + charWidth/2, ly);
                      ctx.scale(charScale, charScale);
                      drawTextContent(char, -charWidth/2, 0);
                      ctx.restore();
                  }
                  currentX += charWidth;
              });
              ctx.textAlign = 'center';
          } else if (phase === 'enter' && animType === AnimationType.REVEAL) {
               ctx.save();
               ctx.beginPath();
               const h = currentFontSize * 1.5;
               const revealHeight = h * easeOutCubic(progress);
               ctx.rect(-width/2, ly + h/2 - revealHeight, width, revealHeight);
               ctx.clip();
               drawTextContent(txt, 0, ly);
               ctx.restore();
          } else if (animType === AnimationType.WAVE) {
               const fullWidth = ctx.measureText(txt).width;
               let currentX = -fullWidth / 2;
               ctx.textAlign = 'left';
               const chars = txt.split('');
               // Use settings.animationSpeed to control wave speed (default 4 base speed)
               const speed = 4 * animSpeedSetting; 
               const freq = 0.5; // Wave frequency
               const amp = 15 * beatFactor; // Wave amplitude
               
               chars.forEach((char, idx) => {
                    const charWidth = ctx.measureText(char).width;
                    const waveY = Math.sin(currentTime * speed + idx * freq) * amp;
                    ctx.save();
                    ctx.translate(currentX + charWidth/2, ly + waveY);
                    drawTextContent(char, -charWidth/2, 0);
                    ctx.restore();
                    currentX += charWidth;
               });
               ctx.textAlign = 'center';
          } else {
               drawTextContent(txt, 0, ly);
          }
      });

      if (settings.showTranslation && line.translation) {
        ctx.shadowBlur = 0; ctx.filter = 'none'; 
        ctx.font = `500 ${currentFontSize * 0.45}px ${settings.fontFamily}`;
        ctx.fillStyle = '#cbd5e1'; ctx.textAlign = 'center';
        const transY = (totalHeight / 2) + currentFontSize * 1.0;
        ctx.fillText(line.translation, 0, transY);
      }
      ctx.restore();
    };

    lyrics.forEach((line) => {
        const timeSinceStart = currentTime - line.startTime;
        if (currentTime >= line.startTime && currentTime < line.endTime) {
            if (timeSinceStart < transitionDuration) drawLine(line, 'enter', timeSinceStart / transitionDuration);
            else drawLine(line, 'active', 1);
        } else if (currentTime >= line.endTime && currentTime < line.endTime + transitionDuration) {
             const exitProgress = (currentTime - line.endTime) / transitionDuration;
             drawLine(line, 'exit', exitProgress);
        }
    });

    requestRef.current = requestAnimationFrame(animate);
  }, []);

  useEffect(() => {
    requestRef.current = requestAnimationFrame(animate);
    return () => { if (requestRef.current) cancelAnimationFrame(requestRef.current); };
  }, [animate]);

  useEffect(() => {
    if (isPlaying) {
      initAudio();
      audioContextRef.current?.resume();
    }
  }, [isPlaying, initAudio]);

  // Snapshot functionality
  const takeSnapshot = () => {
    if (!canvasRef.current) return;
    try {
        // High quality snapshot
        const url = canvasRef.current.toDataURL('image/png', 1.0);
        const a = document.createElement('a');
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        a.href = url;
        a.download = `willwi-cover-${timestamp}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    } catch (e) {
        console.error("Snapshot failed", e);
        alert("截圖失敗，可能是跨域資源問題");
    }
  };

  const startRecording = () => {
    if (!canvasRef.current || !audioRef.current) return;

    const canvasStream = canvasRef.current.captureStream(60); 
    const dest = audioContextRef.current!.createMediaStreamDestination();
    sourceRef.current!.connect(dest);
    const audioTrack = dest.stream.getAudioTracks()[0];
    canvasStream.addTrack(audioTrack);

    // Detect support for MP4
    const types = [
        { mime: 'video/mp4', ext: 'mp4' },
        { mime: 'video/webm;codecs=h264', ext: 'webm' },
        { mime: 'video/webm;codecs=vp9', ext: 'webm' },
        { mime: 'video/webm', ext: 'webm' },
    ];
    const supported = types.find(t => MediaRecorder.isTypeSupported(t.mime));
    
    const mimeType = supported ? supported.mime : 'video/webm';
    recordingExtRef.current = supported ? supported.ext : 'webm';
    
    console.log(`Recording using: ${mimeType}`);

    const recorder = new MediaRecorder(canvasStream, {
      mimeType: mimeType,
      videoBitsPerSecond: 8000000 
    });

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: recorder.mimeType || mimeType });
      chunksRef.current = [];
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `willwi-music.${recordingExtRef.current}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      setRecording(false);
      onExportProgress(false);
    };

    mediaRecorderRef.current = recorder;
    recorder.start();
    setRecording(true);
    onExportProgress(true);
    
    // Auto-restart audio for recording
    audioRef.current.currentTime = 0;
    audioRef.current.play();
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      audioRef.current?.pause();
    }
  };

  return (
    <div className="flex flex-col gap-4 w-full h-full font-sans">
      <div 
        ref={containerRef} 
        className="w-full h-full relative shadow-2xl rounded-xl overflow-hidden border-2 border-brand-700 bg-brand-900"
      >
        <canvas ref={canvasRef} className="w-full h-full block" />
        
        {recording && (
           <div className="absolute top-4 right-4 flex items-center gap-2 bg-red-600/80 px-3 py-1 rounded-full animate-pulse z-20">
             <div className="w-3 h-3 bg-white rounded-full"></div>
             <span className="text-xs font-bold text-white">REC ({recordingExtRef.current.toUpperCase()})</span>
           </div>
        )}
      </div>

      <div className="flex justify-between items-center bg-brand-800 p-4 rounded-xl border border-brand-700">
        <div className="text-sm text-stone-400">
            {recording ? "錄製中... 請讓歌曲播放完畢，按停止以儲存" : "預覽模式 (建議使用 Chrome)"}
        </div>
        {!recording ? (
             <div className="flex gap-3">
                 <button 
                   onClick={takeSnapshot}
                   className="px-4 py-2 bg-brand-700 rounded-lg text-stone-300 font-bold hover:bg-brand-600 transition-all flex items-center gap-2 border border-brand-600"
                 >
                   <span className="text-lg">📸</span> 封面截圖
                 </button>
                 <button 
                   onClick={startRecording}
                   className="px-6 py-2 bg-gradient-to-r from-noodle to-soup rounded-lg text-brand-900 font-bold hover:brightness-110 transition-all flex items-center gap-2"
                 >
                   <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                     <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                   </svg>
                   開始錄製 (MP4/WebM)
                 </button>
             </div>
        ) : (
            <button 
            onClick={stopRecording}
            className="px-6 py-2 bg-red-500 rounded-lg text-white font-bold hover:bg-red-600 transition-all animate-pulse"
          >
            ⏹ 停止並下載
          </button>
        )}
       
      </div>
    </div>
  );
};

export default Visualizer;
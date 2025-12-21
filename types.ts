
export interface LyricLine {
  id: string;
  startTime: number; // in seconds
  endTime: number; // in seconds
  text: string;
  translation?: string;
}

export enum ThemeStyle {
  NEON = 'NEON',
  MINIMAL = 'MINIMAL',
  NATURE = 'NATURE',
  FIERY = 'FIERY'
}

export enum AnimationType {
  FADE = 'FADE',
  SLIDE_UP = 'SLIDE_UP',
  ZOOM = 'ZOOM',
  BOUNCE = 'BOUNCE',
  TYPEWRITER = 'TYPEWRITER',
  KINETIC = 'KINETIC',
  REVEAL = 'REVEAL',
  WAVE = 'WAVE'
}

export enum ParticleStyle {
  STANDARD = 'STANDARD',
  COSMOS = 'COSMOS',
  OCEAN = 'OCEAN',
  GEOMETRIC = 'GEOMETRIC',
  MUSICAL = 'MUSICAL',
  SNOW = 'SNOW'
}

export type BackgroundMode = 'COLOR' | 'IMAGE' | 'VIDEO';
export type AspectRatio = '16:9' | '9:16' | '1:1' | '4:3';

export interface VisualSettings {
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  fontFamily: string;
  fontSize: number;
  particleCount: number;
  particleSpeed: number; // New field
  beatSensitivity: number; // 0.0 to 2.0
  style: ThemeStyle;
  
  aspectRatio: AspectRatio;

  backgroundMode: BackgroundMode;
  backgroundImage?: string;
  backgroundVideo?: string;
  backgroundBrightness: number; // 0.0 to 2.0
  
  animationType: AnimationType;
  animationSpeed: number; // 0.5 to 2.0
  transitionDuration: number; // 0.1 to 1.0 seconds
  
  particleStyle: ParticleStyle;

  showTranslation: boolean;
  driveFolderUrl?: string;
}

export interface SongMetadata {
  title: string;
  artist: string;
  duration: number;
}
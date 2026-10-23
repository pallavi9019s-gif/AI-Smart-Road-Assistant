export type DangerLevel = 'HIGH' | 'MEDIUM' | 'LOW';

export type AppLanguage = 'en' | 'kn' | 'kn_en';

export type HazardCategory =
  | 'pothole'
  | 'obstacle'
  | 'road_damage'
  | 'unsafe_condition'
  | 'poor_visibility'
  | 'human'
  | 'animal'
  | 'vehicle'
  | 'clear';

export interface HazardBox {
  name: string;
  type: string;
  dangerLevel: DangerLevel;
  box?: [number, number, number, number]; // [ymin, xmin, ymax, xmax] normalized 0-1000
}

export interface RoadAnalysisResult {
  id: string;
  timestamp: string;
  source: 'upload' | 'camera';
  primaryHazard: string;
  category: HazardCategory;
  dangerLevel: DangerLevel;
  confidence: number;
  description: string;
  recommendation: string;
  voiceAlert: string;
  primaryHazardKn?: string;
  recommendationKn?: string;
  voiceAlertKn?: string;
  estimatedDistance?: string;
  lanePosition?: string;
  roadSurface?: string;
  weatherLighting?: string;
  hazardsList?: HazardBox[];
  thumbnail?: string;
  imageFileName?: string;
}

export type HazardReport = RoadAnalysisResult;

export interface AppSettings {
  soundEnabled: boolean;
  voiceEnabled: boolean;
  volume: number;
  language: AppLanguage;
  cameraScanInterval: number; // in seconds, default 3
  autoSaveReports: boolean;
}

export interface SystemStatus {
  status: string;
  systemName: string;
  version: string;
  aiEngine: string;
  apiKeyConfigured: boolean;
  totalReportsStored: number;
  highRiskIncidents: number;
  timestamp: string;
}

export interface AnalysisPhase {
  startTime: number;
  endTime: number;
  phaseName: string;
  riderAnalysis: string;
  horseAnalysis: string;
  physicsNote: string;
  score: number;
}

export interface AnalysisResult {
  phases: AnalysisPhase[];
  overallSummary: string;
  suggestedImprovements: string[];
  movementName: string;
  similarProRider: string;
}

export interface ComparisonImage {
  title: string;
  url: string;
  source: string;
}

export enum AppState {
  UPLOAD = 'UPLOAD',
  ANALYZING = 'ANALYZING',
  RESULTS = 'RESULTS',
  ERROR = 'ERROR'
}

export interface AnalysisPhase {
  startTime: number;
  endTime: number;
  phaseName: string;
  riderAnalysis: string;
  horseAnalysis: string;
  physicsNote: string;
  score: number;
}

export interface Jump {
  jumpNumber: number;
  startTime: number;
  endTime: number;
  phases: AnalysisPhase[];
  overallScore: number;
}

export interface AnalysisResult {
  jumps: Jump[];
  overallSummary: string;
  suggestedImprovements: string[];
  movementName: string;
  similarProRider: string;
}

export type JobStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface AnalysisJob {
  id: string;
  user_id: string;
  status: JobStatus;
  progress_message: string;
  progress_percent: number;
  result: AnalysisResult | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

export interface ComparisonImage {
  title: string;
  url: string;
  source: string;
}

export enum AppState {
  UPLOAD = 'UPLOAD',
  COMPRESSING = 'COMPRESSING',
  ANALYZING = 'ANALYZING',
  RESULTS = 'RESULTS',
  ERROR = 'ERROR'
}

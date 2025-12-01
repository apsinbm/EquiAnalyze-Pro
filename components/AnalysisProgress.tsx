'use client';

interface AnalysisProgressProps {
  progress: {
    percent: number;
    message: string;
  };
}

export const AnalysisProgress: React.FC<AnalysisProgressProps> = ({ progress }) => {
  const { percent, message } = progress;

  return (
    <div className="flex flex-col items-center justify-center p-8">
      {/* Animated spinner with progress */}
      <div className="relative w-32 h-32 mb-8">
        {/* Background circle */}
        <svg className="w-full h-full transform -rotate-90">
          <circle
            cx="64"
            cy="64"
            r="56"
            stroke="currentColor"
            strokeWidth="8"
            fill="none"
            className="text-equi-slate/20"
          />
          <circle
            cx="64"
            cy="64"
            r="56"
            stroke="currentColor"
            strokeWidth="8"
            fill="none"
            strokeLinecap="round"
            className="text-equi-gold transition-all duration-500 ease-out"
            strokeDasharray={`${2 * Math.PI * 56}`}
            strokeDashoffset={`${2 * Math.PI * 56 * (1 - percent / 100)}`}
          />
        </svg>
        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold text-white">{percent}%</span>
        </div>
      </div>

      {/* Title */}
      <h2 className="text-2xl font-bold text-white mb-2">Analyzing Video</h2>

      {/* Progress message */}
      <p className="text-equi-slate text-sm mb-6 text-center max-w-xs">
        {message}
      </p>

      {/* Step indicators */}
      <div className="flex gap-2">
        <StepIndicator label="Upload" completed={percent >= 10} active={percent < 10} />
        <StepIndicator label="Detect" completed={percent >= 30} active={percent >= 10 && percent < 30} />
        <StepIndicator label="Analyze" completed={percent >= 60} active={percent >= 30 && percent < 60} />
        <StepIndicator label="Process" completed={percent >= 80} active={percent >= 60 && percent < 80} />
        <StepIndicator label="Complete" completed={percent >= 95} active={percent >= 80 && percent < 95} />
      </div>
    </div>
  );
};

const StepIndicator: React.FC<{
  label: string;
  completed: boolean;
  active: boolean;
}> = ({ label, completed, active }) => (
  <div className="flex flex-col items-center gap-1">
    <div
      className={`w-3 h-3 rounded-full transition-all duration-300 ${
        completed
          ? 'bg-equi-gold'
          : active
          ? 'bg-equi-gold/50 animate-pulse'
          : 'bg-equi-slate/30'
      }`}
    />
    <span
      className={`text-xs transition-colors ${
        completed || active ? 'text-white' : 'text-equi-slate/50'
      }`}
    >
      {label}
    </span>
  </div>
);

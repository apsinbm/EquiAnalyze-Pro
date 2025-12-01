'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import type { AnalysisResult, ComparisonImage } from '@/types';
import { ComparisonCard } from './ComparisonCard';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface AnalysisViewProps {
  videoUrl: string;
  result: AnalysisResult;
  comparisonImages: ComparisonImage[];
  onReset: () => void;
}

export const AnalysisView: React.FC<AnalysisViewProps> = ({ videoUrl, result, comparisonImages, onReset }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [activeJumpIndex, setActiveJumpIndex] = useState(0);
  const [activePhaseIndex, setActivePhaseIndex] = useState<number>(0);
  const [isManualSelection, setIsManualSelection] = useState(false);

  const currentJump = result.jumps[activeJumpIndex];
  const currentPhase = activePhaseIndex !== -1 && currentJump ? currentJump.phases[activePhaseIndex] : null;

  const findActiveJumpAndPhase = useCallback((time: number, videoDuration: number) => {
    // Don't auto-update if user manually selected a phase
    if (isManualSelection) return;

    // Check if video has ended (within 0.5s of end)
    const isAtEnd = videoDuration > 0 && time >= videoDuration - 0.5;

    for (let jIdx = 0; jIdx < result.jumps.length; jIdx++) {
      const jump = result.jumps[jIdx];
      // If at end of video, show last jump and last phase
      if (isAtEnd && jIdx === result.jumps.length - 1) {
        setActiveJumpIndex(jIdx);
        setActivePhaseIndex(jump.phases.length - 1);
        return;
      }
      if (time >= jump.startTime && time <= jump.endTime) {
        setActiveJumpIndex(jIdx);
        const pIdx = jump.phases.findIndex(p => time >= p.startTime && time <= p.endTime);
        if (pIdx !== -1) {
          setActivePhaseIndex(pIdx);
        } else if (isAtEnd) {
          // If at end but no phase matches, show last phase
          setActivePhaseIndex(jump.phases.length - 1);
        }
        return;
      }
    }
  }, [result.jumps, isManualSelection]);

  useEffect(() => {
    const handleTimeUpdate = () => {
      if (videoRef.current) {
        const time = videoRef.current.currentTime;
        const videoDuration = videoRef.current.duration;
        setCurrentTime(time);
        findActiveJumpAndPhase(time, videoDuration);
      }
    };

    const handlePlay = () => {
      // When video starts playing, allow auto-updates again
      setIsManualSelection(false);
    };

    const handleEnded = () => {
      // When video ends, show the last phase of the last jump
      if (result.jumps.length > 0) {
        const lastJumpIdx = result.jumps.length - 1;
        const lastPhaseIdx = result.jumps[lastJumpIdx].phases.length - 1;
        setActiveJumpIndex(lastJumpIdx);
        setActivePhaseIndex(lastPhaseIdx);
      }
    };

    const handleLoadedMetadata = () => {
      if (videoRef.current) {
        setDuration(videoRef.current.duration);
      }
    };

    const videoElement = videoRef.current;
    if (videoElement) {
      videoElement.addEventListener('timeupdate', handleTimeUpdate);
      videoElement.addEventListener('loadedmetadata', handleLoadedMetadata);
      videoElement.addEventListener('play', handlePlay);
      videoElement.addEventListener('ended', handleEnded);
      if (videoElement.duration) {
        setDuration(videoElement.duration);
      }
    }
    return () => {
      if (videoElement) {
        videoElement.removeEventListener('timeupdate', handleTimeUpdate);
        videoElement.removeEventListener('loadedmetadata', handleLoadedMetadata);
        videoElement.removeEventListener('play', handlePlay);
        videoElement.removeEventListener('ended', handleEnded);
      }
    };
  }, [findActiveJumpAndPhase, result.jumps]);

  const seekToTime = (time: number) => {
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = time;
    }
  };

  const seekToJump = (jumpIndex: number) => {
    const jump = result.jumps[jumpIndex];
    setIsManualSelection(true);
    setActiveJumpIndex(jumpIndex);
    setActivePhaseIndex(0);
    seekToTime(jump.startTime);
  };

  const seekToPhase = (phaseIndex: number) => {
    if (!currentJump) return;
    setIsManualSelection(true);
    setActivePhaseIndex(phaseIndex);
    // Don't seek video - just show the phase analysis
  };

  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!timelineRef.current || !duration) return;
    const rect = timelineRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percent = x / rect.width;
    const time = percent * duration;
    seekToTime(time);
  };

  const getJumpColor = (index: number) => {
    const colors = ['#fbbf24', '#38bdf8', '#34d399', '#f472b6', '#a78bfa'];
    return colors[index % colors.length];
  };

  // Clamp percentages to 0-100 range to prevent timeline overflow
  const clampPercent = (value: number) => Math.min(100, Math.max(0, value));

  const getTimelinePosition = (time: number) => {
    if (!duration || duration <= 0) return 0;
    return clampPercent((time / duration) * 100);
  };

  const getTimelineWidth = (startTime: number, endTime: number) => {
    if (!duration || duration <= 0) return 0;
    const start = Math.max(0, startTime);
    const end = Math.min(duration, endTime);
    return clampPercent(((end - start) / duration) * 100);
  };

  const chartData = currentJump?.phases.map(p => ({
    phaseName: p.phaseName,
    score: p.score
  })) ?? [];

  return (
    <div className="min-h-screen bg-equi-dark p-6 overflow-y-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-4 border-b border-equi-slate/20 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <span className="text-equi-gold">♦</span> {result.movementName} Analysis
          </h1>
          <p className="text-equi-slate text-sm mt-1">
            {result.jumps.length} jump{result.jumps.length > 1 ? 's' : ''} detected • Comparing to: {result.similarProRider}
          </p>
        </div>
        <button
          onClick={onReset}
          className="text-equi-slate hover:text-white transition-colors text-sm underline"
        >
          Upload New Video
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Left Column: Video & Timeline */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          {/* Video Player */}
          <div className="relative rounded-2xl overflow-hidden shadow-2xl shadow-black/50 border border-equi-slate/20 bg-black aspect-video">
            <video
              ref={videoRef}
              src={videoUrl}
              className="w-full h-full object-contain"
              controls
              playsInline
            />
            {/* Overlay for Phase Name - positioned to avoid video controls */}
            {currentPhase && (
               <div className="absolute top-3 left-3 bg-black/80 px-3 py-1.5 rounded-md border-l-2 pointer-events-none" style={{ borderColor: getJumpColor(activeJumpIndex) }}>
                 <span className="font-bold uppercase text-xs tracking-wider" style={{ color: getJumpColor(activeJumpIndex) }}>
                   Jump {activeJumpIndex + 1} • {currentPhase.phaseName}
                 </span>
               </div>
            )}
          </div>

          {/* Video Timeline with Jump Markers */}
          <div className="bg-equi-navy/30 rounded-xl p-4 border border-equi-slate/20">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-equi-slate">Timeline</span>
              <span className="text-xs text-equi-slate">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
            </div>

            {/* Timeline bar */}
            <div
              ref={timelineRef}
              className="relative h-8 bg-equi-dark rounded cursor-pointer overflow-hidden"
              onClick={handleTimelineClick}
            >
              {/* Jump regions */}
              {duration > 0 && result.jumps.map((jump, idx) => (
                <div
                  key={idx}
                  className="absolute top-0 h-full opacity-60 hover:opacity-100 transition-opacity cursor-pointer rounded"
                  style={{
                    left: `${getTimelinePosition(jump.startTime)}%`,
                    width: `${getTimelineWidth(jump.startTime, jump.endTime)}%`,
                    backgroundColor: getJumpColor(idx),
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    seekToJump(idx);
                  }}
                  title={`Jump ${idx + 1}`}
                />
              ))}

              {/* Playhead */}
              {duration > 0 && (
                <div
                  className="absolute top-0 w-0.5 h-full bg-white shadow-lg"
                  style={{ left: `${getTimelinePosition(currentTime)}%` }}
                />
              )}
            </div>

            {/* Jump legend */}
            <div className="flex gap-4 mt-3 flex-wrap">
              {result.jumps.map((jump, idx) => (
                <button
                  key={idx}
                  onClick={() => seekToJump(idx)}
                  className={`flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg transition-all ${
                    idx === activeJumpIndex
                      ? 'bg-white/10 ring-1 ring-white/30'
                      : 'hover:bg-white/5'
                  }`}
                >
                  <div
                    className="w-3 h-3 rounded"
                    style={{ backgroundColor: getJumpColor(idx) }}
                  />
                  <span className="text-white font-medium">Jump {idx + 1}</span>
                  <span className="text-equi-slate">({jump.overallScore.toFixed(1)})</span>
                </button>
              ))}
            </div>
          </div>

          {/* Phase Buttons for Current Jump */}
          {currentJump && (
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              {currentJump.phases.map((phase, idx) => (
                <button
                  key={idx}
                  onClick={() => seekToPhase(idx)}
                  className={`flex-shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    idx === activePhaseIndex
                      ? 'bg-equi-gold text-equi-navy shadow-lg shadow-equi-gold/20 scale-105'
                      : 'bg-equi-navy text-equi-slate hover:bg-slate-800'
                  }`}
                >
                  {phase.phaseName}
                  <span className="block text-xs opacity-60 font-normal">{(phase.endTime - phase.startTime).toFixed(1)}s</span>
                </button>
              ))}
            </div>
          )}

          {/* Performance Chart */}
          {currentJump && (
            <div className="bg-equi-navy/30 rounded-xl p-4 border border-equi-slate/20">
               <h3 className="text-white font-semibold mb-3 text-sm">
                 Jump {activeJumpIndex + 1} Scores
               </h3>
               <div className="h-40 w-full">
                 <ResponsiveContainer width="100%" height="100%">
                   <BarChart data={chartData}>
                     <XAxis dataKey="phaseName" tick={{fill: '#94a3b8', fontSize: 10}} interval={0} />
                     <YAxis hide domain={[0, 10]} />
                     <Tooltip
                       contentStyle={{backgroundColor: '#1e293b', border: 'none', borderRadius: '8px'}}
                       itemStyle={{color: '#fbbf24'}}
                     />
                     <Bar dataKey="score" radius={[4, 4, 0, 0]}>
                       {chartData.map((_, index) => (
                         <Cell key={`cell-${index}`} fill={index === activePhaseIndex ? '#fbbf24' : '#64748b'} />
                       ))}
                     </Bar>
                   </BarChart>
                 </ResponsiveContainer>
               </div>
            </div>
          )}
        </div>

        {/* Right Column: Deep Analysis */}
        <div className="lg:col-span-5 flex flex-col gap-4">

          {/* Active Phase Details */}
          <div className="bg-equi-navy/50 backdrop-blur-sm rounded-xl p-5 border border-equi-slate/20 min-h-[280px]">
            {currentPhase ? (
              <div className="space-y-4 animate-fadeIn">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-xs text-equi-slate uppercase tracking-wider mb-1">
                      Jump {activeJumpIndex + 1}
                    </p>
                    <h2 className="text-xl font-bold text-white">{currentPhase.phaseName}</h2>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-2xl font-bold text-equi-gold">{currentPhase.score}<span className="text-sm text-equi-slate">/10</span></span>
                    <span className="text-xs text-equi-slate uppercase tracking-widest">Phase Score</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="bg-blue-900/20 p-3 rounded-lg border-l-2 border-blue-400">
                    <h4 className="text-blue-400 text-xs font-bold uppercase tracking-wider mb-1">Rider Biomechanics</h4>
                    <p className="text-blue-100 text-sm leading-relaxed">{currentPhase.riderAnalysis}</p>
                  </div>

                  <div className="bg-emerald-900/20 p-3 rounded-lg border-l-2 border-emerald-400">
                    <h4 className="text-emerald-400 text-xs font-bold uppercase tracking-wider mb-1">Horse Biomechanics</h4>
                    <p className="text-emerald-100 text-sm leading-relaxed">{currentPhase.horseAnalysis}</p>
                  </div>

                  <div className="bg-purple-900/20 p-3 rounded-lg border-l-2 border-purple-400">
                    <h4 className="text-purple-400 text-xs font-bold uppercase tracking-wider mb-1">Physics & Dynamics</h4>
                    <p className="text-purple-100 text-sm leading-relaxed">{currentPhase.physicsNote}</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-equi-slate">
                <p>Play video or select a phase to see details</p>
              </div>
            )}
          </div>

          {/* Overall Summary */}
          <div className="bg-equi-navy/30 rounded-xl p-4 border border-equi-slate/20">
            <h3 className="text-white font-semibold mb-2 text-sm">Overall Summary</h3>
            <p className="text-gray-300 text-sm leading-relaxed">{result.overallSummary}</p>
          </div>

          {/* Suggestions */}
          <div className="bg-equi-navy/30 rounded-xl p-4 border border-equi-slate/20">
            <h3 className="text-white font-semibold mb-3 text-sm border-b border-equi-slate/20 pb-2">Coach&apos;s Suggestions</h3>
            <ul className="space-y-2">
              {result.suggestedImprovements.map((tip, i) => (
                <li key={i} className="flex gap-2 text-sm text-gray-300">
                  <span className="text-equi-gold flex-shrink-0">✓</span>
                  {tip}
                </li>
              ))}
            </ul>
          </div>

          {/* Pro Comparison */}
          <div className="bg-equi-navy/30 rounded-xl p-4 border border-equi-slate/20">
            <h3 className="text-white font-semibold mb-2 text-sm border-b border-equi-slate/20 pb-2">Pro Reference</h3>
            <p className="text-sm text-equi-slate mb-3">
              Study <strong className="text-white">{result.similarProRider}</strong> for this movement.
            </p>
            <div className="grid grid-cols-2 gap-3">
              {comparisonImages.length > 0 ? (
                comparisonImages.map((img, idx) => (
                  <ComparisonCard key={idx} image={img} />
                ))
              ) : (
                <div className="col-span-2 text-center py-3 bg-equi-dark/50 rounded-lg border border-dashed border-equi-slate/30">
                  <p className="text-xs text-equi-slate">Search &quot;{result.movementName} {result.similarProRider}&quot; for references.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const formatTime = (seconds: number): string => {
  if (!seconds || !isFinite(seconds)) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

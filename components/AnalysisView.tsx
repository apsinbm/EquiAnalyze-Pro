import React, { useRef, useState, useEffect } from 'react';
import type { AnalysisResult, ComparisonImage } from '../types';
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
  const [currentTime, setCurrentTime] = useState(0);
  const [activePhaseIndex, setActivePhaseIndex] = useState<number>(-1);

  useEffect(() => {
    const handleTimeUpdate = () => {
      if (videoRef.current) {
        const time = videoRef.current.currentTime;
        setCurrentTime(time);
        
        // Find active phase
        const index = result.phases.findIndex(p => time >= p.startTime && time <= p.endTime);
        if (index !== -1) {
          setActivePhaseIndex(index);
        }
      }
    };

    const videoElement = videoRef.current;
    if (videoElement) {
      videoElement.addEventListener('timeupdate', handleTimeUpdate);
    }
    return () => {
      if (videoElement) {
        videoElement.removeEventListener('timeupdate', handleTimeUpdate);
      }
    };
  }, [result.phases]);

  const seekToPhase = (time: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      videoRef.current.play();
    }
  };

  const currentPhase = activePhaseIndex !== -1 ? result.phases[activePhaseIndex] : null;

  return (
    <div className="min-h-screen bg-equi-dark p-6 overflow-y-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-6 border-b border-equi-slate/20 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <span className="text-equi-gold">♦</span> {result.movementName} Analysis
          </h1>
          <p className="text-equi-slate text-sm mt-1">Comparing to standard: {result.similarProRider}</p>
        </div>
        <button 
          onClick={onReset}
          className="text-equi-slate hover:text-white transition-colors text-sm underline"
        >
          Upload New Video
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Video & Timeline */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          <div className="relative rounded-2xl overflow-hidden shadow-2xl shadow-black/50 border border-equi-slate/20 bg-black aspect-video">
            <video 
              ref={videoRef}
              src={videoUrl} 
              className="w-full h-full object-contain" 
              controls 
              playsInline
            />
            {/* Overlay for Phase Name */}
            {currentPhase && (
               <div className="absolute top-4 left-4 bg-black/70 backdrop-blur-md px-4 py-2 rounded-lg border-l-4 border-equi-gold">
                 <span className="text-equi-gold font-bold uppercase text-xs tracking-wider">Current Phase</span>
                 <p className="text-white font-semibold text-lg">{currentPhase.phaseName}</p>
               </div>
            )}
          </div>

          {/* Phase Timeline Buttons */}
          <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide">
            {result.phases.map((phase, idx) => (
              <button
                key={idx}
                onClick={() => seekToPhase(phase.startTime)}
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

          {/* Performance Chart */}
          <div className="bg-equi-navy/30 rounded-xl p-6 border border-equi-slate/20">
             <h3 className="text-white font-semibold mb-4">Score Analysis by Phase</h3>
             <div className="h-48 w-full">
               <ResponsiveContainer width="100%" height="100%">
                 <BarChart data={result.phases}>
                   <XAxis dataKey="phaseName" tick={{fill: '#94a3b8', fontSize: 10}} interval={0} />
                   <YAxis hide domain={[0, 10]} />
                   <Tooltip 
                     contentStyle={{backgroundColor: '#1e293b', border: 'none', borderRadius: '8px'}}
                     itemStyle={{color: '#fbbf24'}}
                   />
                   <Bar dataKey="score" radius={[4, 4, 0, 0]}>
                     {result.phases.map((entry, index) => (
                       <Cell key={`cell-${index}`} fill={index === activePhaseIndex ? '#fbbf24' : '#64748b'} />
                     ))}
                   </Bar>
                 </BarChart>
               </ResponsiveContainer>
             </div>
          </div>
        </div>

        {/* Right Column: Deep Analysis */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          
          {/* Active Phase Details */}
          <div className="bg-equi-navy/50 backdrop-blur-sm rounded-xl p-6 border border-equi-slate/20 min-h-[300px]">
            {currentPhase ? (
              <div className="space-y-6 animate-fadeIn">
                <div className="flex justify-between items-start">
                  <h2 className="text-2xl font-bold text-white">{currentPhase.phaseName}</h2>
                  <div className="flex flex-col items-end">
                    <span className="text-3xl font-bold text-equi-gold">{currentPhase.score}<span className="text-sm text-equi-slate">/10</span></span>
                    <span className="text-xs text-equi-slate uppercase tracking-widest">Phase Score</span>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="bg-blue-900/20 p-4 rounded-lg border-l-2 border-blue-400">
                    <h4 className="text-blue-400 text-xs font-bold uppercase tracking-wider mb-1">Rider Biomechanics</h4>
                    <p className="text-blue-100 text-sm leading-relaxed">{currentPhase.riderAnalysis}</p>
                  </div>
                  
                  <div className="bg-emerald-900/20 p-4 rounded-lg border-l-2 border-emerald-400">
                    <h4 className="text-emerald-400 text-xs font-bold uppercase tracking-wider mb-1">Horse Biomechanics</h4>
                    <p className="text-emerald-100 text-sm leading-relaxed">{currentPhase.horseAnalysis}</p>
                  </div>

                  <div className="bg-purple-900/20 p-4 rounded-lg border-l-2 border-purple-400">
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

          {/* Suggestions & Comparison */}
          <div className="bg-equi-navy/30 rounded-xl p-6 border border-equi-slate/20 flex-grow">
            <h3 className="text-white font-semibold mb-4 border-b border-equi-slate/20 pb-2">Coach's Suggestions</h3>
            <ul className="space-y-3 mb-8">
              {result.suggestedImprovements.map((tip, i) => (
                <li key={i} className="flex gap-3 text-sm text-gray-300">
                  <span className="text-equi-gold flex-shrink-0 mt-1">✓</span>
                  {tip}
                </li>
              ))}
            </ul>

            <h3 className="text-white font-semibold mb-4 border-b border-equi-slate/20 pb-2">Top Pro Comparison</h3>
            <p className="text-sm text-equi-slate mb-4">
              Study <strong>{result.similarProRider}</strong> for this movement.
            </p>
            <div className="grid grid-cols-2 gap-4">
              {comparisonImages.length > 0 ? (
                comparisonImages.map((img, idx) => (
                  <ComparisonCard key={idx} image={img} />
                ))
              ) : (
                <div className="col-span-2 text-center py-4 bg-equi-dark/50 rounded-lg border border-dashed border-equi-slate/30">
                  <p className="text-xs text-equi-slate">No direct images found. Search Google for "{result.movementName} {result.similarProRider}".</p>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
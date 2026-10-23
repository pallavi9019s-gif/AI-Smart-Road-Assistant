import React, { useState, useEffect } from 'react';
import { 
  Camera, 
  UploadCloud, 
  AlertTriangle, 
  ShieldCheck, 
  Activity, 
  Clock, 
  CheckCircle2, 
  ArrowRight,
  Eye,
  AlertOctagon,
  Sparkles,
  Layers,
  ChevronRight,
  Siren,
  Volume2
} from 'lucide-react';
import { HazardReport, AppLanguage } from '../types';
import { getLocalizedHazard } from '../services/languageService';
import { audioService } from '../services/audioService';

interface DashboardViewProps {
  reports: HazardReport[];
  setActiveTab: (tab: string) => void;
  onSelectSampleImage?: (sampleId: string) => void;
  aiOnline: boolean;
  language?: AppLanguage;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  reports,
  setActiveTab,
  aiOnline,
  language = 'en',
}) => {
  const [sirenActive, setSirenActive] = useState<boolean>(false);

  useEffect(() => {
    const unsub = audioService.onSirenChange(setSirenActive);
    return unsub;
  }, []);

  const highRiskCount = reports.filter((r) => r.dangerLevel === 'HIGH').length;
  const mediumRiskCount = reports.filter((r) => r.dangerLevel === 'MEDIUM').length;
  const lowRiskCount = reports.filter((r) => r.dangerLevel === 'LOW').length;

  const recentReports = reports.slice(0, 5);

  const getDangerBadge = (level: 'HIGH' | 'MEDIUM' | 'LOW') => {
    switch (level) {
      case 'HIGH':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">
            <AlertOctagon className="w-3 h-3 text-rose-400" />
            HIGH DANGER
          </span>
        );
      case 'MEDIUM':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
            <AlertTriangle className="w-3 h-3 text-amber-400" />
            MEDIUM RISK
          </span>
        );
      case 'LOW':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            <ShieldCheck className="w-3 h-3 text-emerald-400" />
            LOW RISK / SAFE
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Hero Welcome Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-cyan-950 p-6 sm:p-8 border border-slate-700/60 shadow-xl">
        <div className="absolute right-0 top-0 -mt-10 -mr-10 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 mb-3">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-spin" />
            BCA Academic Capstone Project • Gemini Flash Multimodal Vision
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight">
            AI Smart Road Safety Assistant
          </h1>
          <p className="mt-2 text-sm sm:text-base text-slate-300 leading-relaxed">
            Real-time computer vision perception system designed to detect potholes, debris, damaged roadbeds, and hazardous surface conditions with instant acoustic and synthesized voice alerts.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              onClick={() => setActiveTab('live-camera')}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold text-sm shadow-lg shadow-cyan-500/25 transition-all hover:scale-102 cursor-pointer"
            >
              <Camera className="w-4 h-4" />
              <span>Launch Live Camera</span>
              <ArrowRight className="w-4 h-4 ml-1" />
            </button>
            <button
              onClick={() => setActiveTab('image-analysis')}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-200 border border-slate-600 font-semibold text-sm transition-all cursor-pointer"
            >
              <UploadCloud className="w-4 h-4 text-cyan-400" />
              <span>Analyze Road Image</span>
            </button>
            <button
              onClick={() => audioService.toggleEmergencySiren(3.5)}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm border transition-all cursor-pointer ${
                sirenActive
                  ? 'bg-rose-600 text-white border-rose-400 shadow-lg shadow-rose-600/50 animate-pulse'
                  : 'bg-rose-950/60 hover:bg-rose-900/60 text-rose-300 border-rose-800/70 hover:text-white'
              }`}
            >
              <Siren className={`w-4 h-4 ${sirenActive ? 'animate-bounce text-white' : 'text-rose-400'}`} />
              <span>{sirenActive ? '🚨 Siren Active (Stop)' : 'Alert Siren (ಸೈರನ್)'}</span>
            </button>
            <button
              onClick={() => audioService.testLanguage('kn')}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-950/60 hover:bg-amber-900/60 text-amber-300 border border-amber-800/70 font-semibold text-sm transition-all cursor-pointer"
              title="Test Voice Kannada Speech / ಕನ್ನಡ ಧ್ವನಿ ಎಚ್ಚರಿಕೆ ಪರೀಕ್ಷೆ"
            >
              <Volume2 className="w-4 h-4 text-amber-400" />
              <span>Voice Kannada (ಕನ್ನಡ ಧ್ವನಿ)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1 */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4 sm:p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Total Scans Logged</span>
            <Activity className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-extrabold text-white font-mono">
              {reports.length}
            </div>
            <p className="text-xs text-slate-500 mt-1">Image & camera events</p>
          </div>
        </div>

        {/* Metric 2 */}
        <div className="bg-slate-900/70 border border-rose-900/30 rounded-xl p-4 sm:p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-rose-300">High Danger Hazards</span>
            <AlertOctagon className="w-4 h-4 text-rose-400 animate-pulse" />
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-extrabold text-rose-400 font-mono">
              {highRiskCount}
            </div>
            <p className="text-xs text-rose-400/60 mt-1">Triggered urgent sirens</p>
          </div>
        </div>

        {/* Metric 3 */}
        <div className="bg-slate-900/70 border border-amber-900/30 rounded-xl p-4 sm:p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-amber-300">Medium Risk Warnings</span>
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-extrabold text-amber-400 font-mono">
              {mediumRiskCount}
            </div>
            <p className="text-xs text-amber-400/60 mt-1">Caution advisories issued</p>
          </div>
        </div>

        {/* Metric 4 */}
        <div className="bg-slate-900/70 border border-emerald-900/30 rounded-xl p-4 sm:p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-emerald-300">Safe / Clear Paths</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-extrabold text-emerald-400 font-mono">
              {lowRiskCount}
            </div>
            <p className="text-xs text-emerald-400/60 mt-1">Normal road conditions</p>
          </div>
        </div>
      </div>

      {/* Main Two Column Section: Live Feed + Quick Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Recent Hazard Logs (2 cols on lg) */}
        <div className="lg:col-span-2 bg-slate-900/80 border border-slate-800 rounded-2xl p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-cyan-400" />
              <h2 className="text-base font-bold text-white tracking-wide">
                Recent Road Hazard Incidents
              </h2>
            </div>
            <button
              onClick={() => setActiveTab('hazard-report')}
              className="text-xs text-cyan-400 hover:text-cyan-300 font-medium flex items-center gap-1"
            >
              View Full Audit Log <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {recentReports.length === 0 ? (
            <div className="py-12 text-center text-slate-500">
              <Eye className="w-8 h-8 mx-auto mb-2 text-slate-600" />
              <p>No hazard events recorded yet.</p>
              <p className="text-xs text-slate-600 mt-1">Upload an image or start the live camera to begin.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-800/80">
              {recentReports.map((report) => {
                const loc = getLocalizedHazard(report, language);
                return (
                  <div key={report.id} className="py-3.5 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm text-slate-100">
                          {loc.primaryHazard}
                        </span>
                        {getDangerBadge(report.dangerLevel)}
                        <span className="text-[11px] font-mono text-slate-400">
                          {report.confidence}% conf.
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 line-clamp-1">
                        {loc.recommendation}
                      </p>
                      <div className="flex items-center gap-3 text-[11px] text-slate-500">
                        <span>{new Date(report.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        <span>•</span>
                        <span className="capitalize">Source: {report.source}</span>
                        {report.lanePosition && (
                          <>
                            <span>•</span>
                            <span>{report.lanePosition}</span>
                          </>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => setActiveTab('hazard-report')}
                      className="self-start sm:self-center px-3 py-1.5 rounded-lg text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 shrink-0 cursor-pointer"
                    >
                      Inspect
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Project Highlights & Core Capabilities */}
        <div className="space-y-6">
          {/* Quick Capability Matrix */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-cyan-400" />
              <h3 className="text-sm font-bold text-white">Project Perception Capabilities</h3>
            </div>
            <ul className="space-y-2.5 text-xs text-slate-300">
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-400 mt-1.5 shrink-0" />
                <span><strong>Pedestrians & Humans:</strong> People crossing, walking along shoulder, workers, cyclists.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 shrink-0" />
                <span><strong>Road Animals:</strong> Cattle, stray cows, dogs, buffaloes, goats, horses, and wildlife in lane.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 mt-1.5 shrink-0" />
                <span><strong>Potholes:</strong> Deep asphalt craters, fractured rims, and multi-hole clusters.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 mt-1.5 shrink-0" />
                <span><strong>Road Obstacles:</strong> Fallen tree branches, boulders, construction barrels, stalled vehicles.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 mt-1.5 shrink-0" />
                <span><strong>Structural Damage:</strong> Alligator cracks, sunken roadbed, missing asphalt blocks.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 mt-1.5 shrink-0" />
                <span><strong>Hydroplaning / Conditions:</strong> Large standing water puddles, mud slicks, oil spills.</span>
              </li>
            </ul>
          </div>

          {/* Quick Test Launcher */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 border border-cyan-800/40 rounded-2xl p-5 space-y-3">
            <h4 className="text-xs font-bold text-cyan-300 uppercase tracking-wider font-mono">
              Quick Test Recommendation
            </h4>
            <p className="text-xs text-slate-300 leading-relaxed">
              Demonstrate the application to college examiners in two clicks:
            </p>
            <div className="space-y-2">
              <button
                onClick={() => setActiveTab('image-analysis')}
                className="w-full text-left p-2.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-xs flex items-center justify-between group transition-all"
              >
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-rose-500" />
                  <span className="font-semibold text-slate-200">Test Pothole & Obstacle Upload</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-cyan-400 transition-colors" />
              </button>
              <button
                onClick={() => setActiveTab('live-camera')}
                className="w-full text-left p-2.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-xs flex items-center justify-between group transition-all"
              >
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-cyan-400" />
                  <span className="font-semibold text-slate-200">Test Live Webcam Periodic Scan</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-cyan-400 transition-colors" />
              </button>
              <button
                onClick={() => audioService.testSirenWithVoice(language)}
                className="w-full text-left p-2.5 rounded-lg bg-rose-950/30 hover:bg-rose-900/40 border border-rose-800/50 text-xs flex items-center justify-between group transition-all cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-rose-400 animate-pulse" />
                  <span className="font-semibold text-rose-200">Test Alert Siren + Kannada Voice (ಸೈರನ್ + ಧ್ವನಿ)</span>
                </div>
                <ChevronRight className="w-4 h-4 text-rose-400 group-hover:text-white transition-colors" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

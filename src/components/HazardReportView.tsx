import React, { useState } from 'react';
import { 
  FileText, 
  Trash2, 
  Download, 
  Search, 
  Filter, 
  AlertTriangle, 
  ShieldCheck, 
  AlertOctagon, 
  Clock, 
  Calendar, 
  Check, 
  Eye, 
  X,
  Volume2,
  User,
  PawPrint,
  Siren
} from 'lucide-react';
import { HazardReport, AppLanguage } from '../types';
import { audioService } from '../services/audioService';
import { getLocalizedHazard } from '../services/languageService';

interface HazardReportViewProps {
  reports: HazardReport[];
  onClearReports: () => void;
  language?: AppLanguage;
}

export const HazardReportView: React.FC<HazardReportViewProps> = ({
  reports,
  onClearReports,
  language = 'en',
}) => {
  const [filterRisk, setFilterRisk] = useState<'ALL' | 'HIGH' | 'MEDIUM' | 'LOW'>('ALL');
  const [filterSource, setFilterSource] = useState<'ALL' | 'upload' | 'camera'>('ALL');
  const [filterCategory, setFilterCategory] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedReport, setSelectedReport] = useState<HazardReport | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState<boolean>(false);

  // Filtered reports
  const filteredReports = reports.filter((report) => {
    if (filterRisk !== 'ALL' && report.dangerLevel !== filterRisk) return false;
    if (filterSource !== 'ALL' && report.source !== filterSource) return false;
    if (filterCategory !== 'ALL' && report.category !== filterCategory) return false;
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const matchHazard = report.primaryHazard.toLowerCase().includes(q);
      const matchDesc = report.description.toLowerCase().includes(q);
      const matchRec = report.recommendation.toLowerCase().includes(q);
      if (!matchHazard && !matchDesc && !matchRec) return false;
    }
    return true;
  });

  // Export to CSV
  const exportCSV = () => {
    if (reports.length === 0) return;
    const headers = ['ID', 'Date/Time', 'Source', 'Hazard Name', 'Category', 'Danger Level', 'Confidence (%)', 'Recommendation', 'Voice Alert'];
    const rows = reports.map((r) => [
      `"${r.id}"`,
      `"${new Date(r.timestamp).toLocaleString()}"`,
      `"${r.source}"`,
      `"${r.primaryHazard.replace(/"/g, '""')}"`,
      `"${r.category}"`,
      `"${r.dangerLevel}"`,
      r.confidence,
      `"${r.recommendation.replace(/"/g, '""')}"`,
      `"${r.voiceAlert.replace(/"/g, '""')}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `road_safety_hazard_report_${Date.now()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Export to JSON
  const exportJSON = () => {
    if (reports.length === 0) return;
    const blob = new Blob([JSON.stringify(reports, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `road_safety_hazard_report_${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const getDangerBadge = (level: 'HIGH' | 'MEDIUM' | 'LOW') => {
    switch (level) {
      case 'HIGH':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">
            <AlertOctagon className="w-3 h-3 text-rose-400" />
            HIGH
          </span>
        );
      case 'MEDIUM':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
            <AlertTriangle className="w-3 h-3 text-amber-400" />
            MEDIUM
          </span>
        );
      case 'LOW':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
            <ShieldCheck className="w-3 h-3 text-emerald-400" />
            LOW / SAFE
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
            Hazard Incident Reports & Telemetry Log
          </h2>
          <p className="text-xs sm:text-sm text-slate-400">
            Persistent database of road hazards detected during live camera runs and uploaded road inspection imagery.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={exportCSV}
            disabled={reports.length === 0}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 border border-slate-700 text-xs font-semibold transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-cyan-400" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={exportJSON}
            disabled={reports.length === 0}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 border border-slate-700 text-xs font-semibold transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-cyan-400" />
            <span>Export JSON</span>
          </button>
          <button
            onClick={() => setShowClearConfirm(true)}
            disabled={reports.length === 0}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-950/40 hover:bg-rose-900/50 disabled:opacity-50 text-rose-300 border border-rose-800/60 text-xs font-semibold transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-400" />
            <span>Clear Database</span>
          </button>
        </div>
      </div>

      {/* Confirmation Modal for Clearing Database */}
      {showClearConfirm && (
        <div className="p-4 rounded-xl bg-rose-950/80 border border-rose-700 text-rose-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-fade-in">
          <div className="flex items-center gap-3">
            <AlertOctagon className="w-5 h-5 text-rose-400 shrink-0" />
            <span className="text-xs sm:text-sm font-semibold">
              Are you sure you want to permanently clear all {reports.length} hazard reports from the database?
            </span>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              onClick={() => setShowClearConfirm(false)}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 font-medium"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                onClearReports();
                setShowClearConfirm(false);
              }}
              className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-xs text-white font-bold"
            >
              Yes, Clear All
            </button>
          </div>
        </div>
      )}

      {/* Search and Filters Bar */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search hazard name, surface, or recommendation..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-800/90 border border-slate-700 rounded-xl pl-9 pr-4 py-2 text-xs sm:text-sm text-slate-200 placeholder-slate-400 focus:outline-none focus:border-cyan-500"
          />
        </div>

        {/* Filter Risk */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-slate-400 font-mono">Risk:</span>
          {(['ALL', 'HIGH', 'MEDIUM', 'LOW'] as const).map((risk) => (
            <button
              key={risk}
              onClick={() => setFilterRisk(risk)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold font-mono transition-all ${
                filterRisk === risk
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50'
                  : 'bg-slate-800/80 text-slate-400 hover:text-slate-200 border border-slate-700'
              }`}
            >
              {risk}
            </button>
          ))}
        </div>

        {/* Filter Source */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 font-mono">Source:</span>
          <select
            value={filterSource}
            onChange={(e) => setFilterSource(e.target.value as any)}
            className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-300 focus:outline-none focus:border-cyan-500 cursor-pointer"
          >
            <option value="ALL">All Sources</option>
            <option value="upload">Upload</option>
            <option value="camera">Live Camera</option>
          </select>
        </div>

        {/* Filter Category */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 font-mono">Category:</span>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-300 focus:outline-none focus:border-cyan-500 cursor-pointer"
          >
            <option value="ALL">All Categories</option>
            <option value="human">Pedestrians & Humans</option>
            <option value="animal">Animals (Cows, Dogs, etc.)</option>
            <option value="pothole">Potholes</option>
            <option value="obstacle">Obstacles</option>
            <option value="road_damage">Road Damage</option>
            <option value="unsafe_condition">Unsafe Conditions</option>
            <option value="clear">Clear / Safe Road</option>
          </select>
        </div>
      </div>

      {/* Reports Table / Card List */}
      {filteredReports.length === 0 ? (
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-12 text-center text-slate-500 space-y-2">
          <FileText className="w-10 h-10 mx-auto text-slate-600" />
          <h3 className="text-sm font-bold text-slate-400">No matching hazard records found</h3>
          <p className="text-xs text-slate-500">
            {reports.length === 0
              ? 'Run an image analysis or start the live camera to generate road safety reports.'
              : 'Try clearing your search query or adjusting your filters.'}
          </p>
        </div>
      ) : (
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/60 text-[11px] font-mono font-bold uppercase tracking-wider text-slate-400">
                  <th className="py-3.5 px-4">Hazard / Road Condition</th>
                  <th className="py-3.5 px-4">Danger Level</th>
                  <th className="py-3.5 px-4">Confidence</th>
                  <th className="py-3.5 px-4 hidden md:table-cell">Recommendation</th>
                  <th className="py-3.5 px-4">Date / Time</th>
                  <th className="py-3.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 text-xs">
                {filteredReports.map((report) => {
                  const loc = getLocalizedHazard(report, language);
                  return (
                    <tr
                      key={report.id}
                      className="hover:bg-slate-800/40 transition-colors cursor-pointer group"
                      onClick={() => setSelectedReport(report)}
                    >
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          {report.thumbnail && (
                            <img
                              src={report.thumbnail}
                              alt=""
                              className="w-9 h-9 rounded object-cover border border-slate-700 shrink-0"
                            />
                          )}
                          <div>
                            <span className="font-semibold text-white block group-hover:text-cyan-300 transition-colors">
                              {loc.primaryHazard}
                            </span>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="text-[10px] text-slate-400 font-mono capitalize">
                                Source: {report.source}
                              </span>
                              <span className="text-slate-600">•</span>
                              {report.category === 'human' ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.2 rounded font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                                  <User className="w-3 h-3 text-rose-400" /> Human
                                </span>
                              ) : report.category === 'animal' ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.2 rounded font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                  <PawPrint className="w-3 h-3 text-amber-400" /> Animal
                                </span>
                              ) : (
                                <span className="text-[10px] text-slate-400 font-mono capitalize">
                                  {report.category?.replace('_', ' ')}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {getDangerBadge(report.dangerLevel)}
                      </td>

                      <td className="py-3.5 px-4 font-mono font-semibold text-cyan-300">
                        {report.confidence}%
                      </td>

                      <td className="py-3.5 px-4 hidden md:table-cell text-slate-300 max-w-xs truncate" title={loc.recommendation}>
                        {loc.recommendation}
                      </td>

                      <td className="py-3.5 px-4 text-slate-400 whitespace-nowrap font-mono text-[11px]">
                        {new Date(report.timestamp).toLocaleDateString()}{' '}
                        <span className="text-slate-500">
                          {new Date(report.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedReport(report);
                          }}
                          className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-medium cursor-pointer"
                        >
                          Inspect
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Detail Inspection Modal */}
      {selectedReport && (() => {
        const loc = getLocalizedHazard(selectedReport, language);
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-5 shadow-2xl">
              {/* Modal Header */}
              <div className="flex items-start justify-between gap-4 pb-3 border-b border-slate-800">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-mono uppercase text-slate-400">Incident Inspection</span>
                    {getDangerBadge(selectedReport.dangerLevel)}
                    {selectedReport.category === 'human' && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                        <User className="w-3.5 h-3.5 text-rose-400" /> Pedestrian / Human
                      </span>
                    )}
                    {selectedReport.category === 'animal' && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        <PawPrint className="w-3.5 h-3.5 text-amber-400" /> Road Animal
                      </span>
                    )}
                  </div>
                  <h3 className="text-xl font-bold text-white">{loc.primaryHazard}</h3>
                  {language !== 'en' && (
                    <p className="text-xs text-amber-300/90 font-mono mt-1 font-semibold">
                      {loc.emergencyWarning}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => setSelectedReport(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Thumbnail if present */}
              {selectedReport.thumbnail && (
                <div className="rounded-xl overflow-hidden bg-slate-950 border border-slate-800 max-h-64 flex items-center justify-center">
                  <img
                    src={selectedReport.thumbnail}
                    alt={selectedReport.primaryHazard}
                    className="max-h-64 w-auto object-contain"
                  />
                </div>
              )}

              {/* Description */}
              <div className="space-y-1">
                <span className="text-xs font-bold font-mono uppercase text-slate-400">Perception Summary:</span>
                <p className="text-sm text-slate-200 leading-relaxed bg-slate-800/60 p-3 rounded-xl border border-slate-700/60">
                  {selectedReport.description}
                </p>
              </div>

              {/* Safety Action */}
              <div className="space-y-1">
                <span className="text-xs font-bold font-mono uppercase text-emerald-400 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4" /> Recommended Driver Action:
                </span>
                <p className="text-sm text-slate-100 font-medium leading-relaxed bg-emerald-950/30 p-3 rounded-xl border border-emerald-700/50">
                  {loc.recommendation}
                </p>
              </div>

              {/* Spoken Alert in Active Language */}
              <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-800 text-xs text-slate-300 space-y-1">
                <div className="flex items-center gap-1.5 font-bold font-mono text-cyan-400">
                  <Volume2 className="w-3.5 h-3.5" /> Spoken Voice Alert ({language === 'kn' ? 'ಕನ್ನಡ' : language === 'kn_en' ? 'ಕನ್ನಡ First ➔ English' : 'English'}):
                </div>
                <p className="font-mono text-slate-200 pl-5">
                  "{language === 'kn' ? loc.voiceAlertKn : language === 'kn_en' ? `${loc.voiceAlertKn} • ${loc.voiceAlertEn}` : loc.voiceAlertEn}"
                </p>
              </div>

              {/* Metadata Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
                <div className="p-2.5 rounded-lg bg-slate-800/60 border border-slate-800">
                  <span className="text-[10px] text-slate-500 uppercase block">Confidence</span>
                  <span className="text-cyan-300 font-bold mt-0.5 block">{selectedReport.confidence}%</span>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-800/60 border border-slate-800">
                  <span className="text-[10px] text-slate-500 uppercase block">Source</span>
                  <span className="text-slate-200 capitalize mt-0.5 block">{selectedReport.source}</span>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-800/60 border border-slate-800">
                  <span className="text-[10px] text-slate-500 uppercase block">Distance</span>
                  <span className="text-slate-200 mt-0.5 block">{selectedReport.estimatedDistance || 'N/A'}</span>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-800/60 border border-slate-800">
                  <span className="text-[10px] text-slate-500 uppercase block">Surface</span>
                  <span className="text-slate-200 capitalize mt-0.5 block">{selectedReport.roadSurface || 'Asphalt'}</span>
                </div>
              </div>

              {/* Modal Actions */}
              <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      audioService.triggerHazardAlert(
                        selectedReport.dangerLevel,
                        selectedReport.voiceAlert,
                        selectedReport.primaryHazard,
                        selectedReport.category,
                        selectedReport.voiceAlertKn
                      );
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 cursor-pointer"
                  >
                    <Volume2 className="w-3.5 h-3.5 text-cyan-400" />
                    Play Voice Warning (ಧ್ವನಿ)
                  </button>

                  <button
                    onClick={() => audioService.toggleEmergencySiren(3.0)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-950/80 hover:bg-rose-900/80 text-rose-300 text-xs font-medium border border-rose-800 cursor-pointer"
                    title="Sound Emergency Siren / ತುರ್ತು ಸೈರನ್ ಮೊಳಗಿಸಿ"
                  >
                    <Siren className="w-3.5 h-3.5 text-rose-400" />
                    Alert Siren (ಸೈರನ್)
                  </button>
                </div>

                <button
                  onClick={() => setSelectedReport(null)}
                  className="px-4 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold cursor-pointer"
                >
                  Close Audit
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

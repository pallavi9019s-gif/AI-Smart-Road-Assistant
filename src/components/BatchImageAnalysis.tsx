import React, { useState, useRef } from 'react';
import { 
  UploadCloud, 
  RefreshCw, 
  AlertTriangle, 
  ShieldCheck, 
  AlertOctagon, 
  Volume2, 
  CheckCircle2, 
  Trash2, 
  Plus, 
  Play, 
  BarChart3, 
  X, 
  Layers, 
  Eye, 
  Activity,
  Check,
  FileCheck,
  RotateCcw,
  User,
  PawPrint
} from 'lucide-react';
import { RoadAnalysisResult, DangerLevel, AppLanguage } from '../types';
import { SAMPLE_ROAD_IMAGES } from '../data/sampleImages';
import { audioService } from '../services/audioService';
import { getLocalizedHazard } from '../services/languageService';

export interface BatchItem {
  id: string;
  file?: File;
  name: string;
  sizeFormatted: string;
  dataUrl: string;
  status: 'pending' | 'analyzing' | 'completed' | 'failed';
  result?: RoadAnalysisResult;
  errorMessage?: string;
  retryCount?: number;
}

interface BatchImageAnalysisProps {
  onReportGenerated: (report: RoadAnalysisResult) => void;
  soundEnabled: boolean;
  voiceEnabled: boolean;
  language?: AppLanguage;
}

export const BatchImageAnalysis: React.FC<BatchImageAnalysisProps> = ({
  onReportGenerated,
  soundEnabled,
  voiceEnabled,
  language = 'en',
}) => {
  const [items, setItems] = useState<BatchItem[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [currentIndex, setCurrentIndex] = useState<number>(-1);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [selectedPreviewItem, setSelectedPreviewItem] = useState<BatchItem | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Add files to batch
  const handleFilesAdded = (files: FileList | File[]) => {
    const validFiles = Array.from(files).filter(f => f.type.startsWith('image/'));
    if (validFiles.length === 0) return;

    validFiles.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        const newItem: BatchItem = {
          id: `batch-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          file,
          name: file.name,
          sizeFormatted: formatFileSize(file.size),
          dataUrl,
          status: 'pending',
        };
        setItems(prev => [...prev, newItem]);
      };
      reader.readAsDataURL(file);
    });
  };

  // Load demo road batch with 1-click
  const handleLoadDemoBatch = async () => {
    const demoItems: BatchItem[] = [];
    for (const sample of SAMPLE_ROAD_IMAGES) {
      try {
        let dataUrl = sample.dataUrl;
        if (!dataUrl.startsWith('data:image/')) {
          const res = await fetch(sample.dataUrl);
          const blob = await res.blob();
          dataUrl = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.readAsDataURL(blob);
          });
        }
        demoItems.push({
          id: `demo-${sample.id}-${Date.now()}`,
          name: `${sample.title}.jpg`,
          sizeFormatted: '950 KB',
          dataUrl,
          status: 'pending',
        });
      } catch (e) {
        console.error('Failed to prepare demo item:', e);
      }
    }
    setItems(prev => [...prev, ...demoItems]);
  };

  // Remove individual item
  const handleRemoveItem = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (isAnalyzing) return;
    setItems(prev => prev.filter(item => item.id !== id));
    if (selectedPreviewItem?.id === id) {
      setSelectedPreviewItem(null);
    }
  };

  // Clear all images
  const handleClearAll = () => {
    if (isAnalyzing) return;
    setItems([]);
    setCurrentIndex(-1);
    setSelectedPreviewItem(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Reset statuses for re-analysis
  const handleAnalyzeAgain = () => {
    if (isAnalyzing || items.length === 0) return;
    setItems(prev => prev.map(item => ({
      ...item,
      status: 'pending',
      result: undefined,
      errorMessage: undefined,
      retryCount: 0
    })));
    setCurrentIndex(-1);
    startBatchAnalysis();
  };

  // Execute single image analysis with retry
  const analyzeSingleImage = async (dataUrl: string, maxRetries = 2): Promise<RoadAnalysisResult> => {
    let lastError: any = null;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const response = await fetch('/api/analyze-road', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            image: dataUrl,
            source: 'upload',
            saveReport: true,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          const errMsg = errorData.error || `Server status ${response.status}`;
          if ((response.status === 503 || errMsg.includes('503') || errMsg.includes('UNAVAILABLE')) && attempt < maxRetries) {
            await new Promise(r => setTimeout(r, 1200 * (attempt + 1)));
            continue;
          }
          throw new Error(errMsg);
        }

        const data = await response.json();
        if (!data.success || !data.report) {
          throw new Error(data.error || 'Invalid report payload');
        }

        return {
          ...data.report,
          thumbnail: dataUrl,
        };
      } catch (err: any) {
        lastError = err;
        if (attempt < maxRetries) {
          await new Promise(r => setTimeout(r, 1000));
        }
      }
    }
    throw lastError || new Error('Image analysis failed');
  };

  // Start Batch Analysis
  const startBatchAnalysis = async () => {
    if (isAnalyzing || items.length === 0) return;
    setIsAnalyzing(true);

    const updatedList = [...items];

    for (let i = 0; i < updatedList.length; i++) {
      setCurrentIndex(i);

      // Update state to analyzing
      setItems(prev => prev.map((item, idx) => 
        idx === i ? { ...item, status: 'analyzing', errorMessage: undefined } : item
      ));

      try {
        const report = await analyzeSingleImage(updatedList[i].dataUrl);

        // Update item with result
        setItems(prev => prev.map((item, idx) => 
          idx === i ? { ...item, status: 'completed', result: report } : item
        ));

        // Propagate report to global history
        onReportGenerated(report);

        // Trigger audio for High risk in active language
        if (report.dangerLevel === 'HIGH') {
          audioService.triggerHazardAlert(
            report.dangerLevel,
            report.voiceAlert,
            report.primaryHazard,
            report.category,
            report.voiceAlertKn
          );
        }
      } catch (err: any) {
        console.warn(`Analysis notice on item ${i + 1}:`, err?.message || err);
        setItems(prev => prev.map((item, idx) => 
          idx === i ? { ...item, status: 'failed', errorMessage: err?.message || 'Analysis failed' } : item
        ));
      }

      // Small throttle pause between calls to be gentle on server
      await new Promise(r => setTimeout(r, 400));
    }

    setIsAnalyzing(false);
    setCurrentIndex(-1);
  };

  // Calculate Batch Summary Stats
  const totalCount = items.length;
  const completedItems = items.filter(i => i.status === 'completed' && i.result);
  const completedCount = completedItems.length;
  const failedCount = items.filter(i => i.status === 'failed').length;
  const isFinished = totalCount > 0 && completedCount + failedCount === totalCount;

  const highRiskCount = completedItems.filter(i => i.result?.dangerLevel === 'HIGH').length;
  const mediumRiskCount = completedItems.filter(i => i.result?.dangerLevel === 'MEDIUM').length;
  const lowRiskCount = completedItems.filter(i => i.result?.dangerLevel === 'LOW').length;
  const hazardsDetectedCount = completedItems.filter(i => i.result?.category !== 'clear').length;

  // Most common hazard calculation
  const hazardFrequency: Record<string, number> = {};
  completedItems.forEach(i => {
    if (i.result && i.result.category !== 'clear') {
      const name = i.result.primaryHazard || 'Road Hazard';
      hazardFrequency[name] = (hazardFrequency[name] || 0) + 1;
    }
  });

  let mostCommonHazard = 'None (All Clear)';
  let maxFreq = 0;
  Object.entries(hazardFrequency).forEach(([name, freq]) => {
    if (freq > maxFreq) {
      maxFreq = freq;
      mostCommonHazard = `${name} (${freq} incident${freq > 1 ? 's' : ''})`;
    }
  });

  const getDangerBadge = (level?: DangerLevel) => {
    if (!level) return null;
    switch (level) {
      case 'HIGH':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">
            <AlertOctagon className="w-3.5 h-3.5 text-rose-400" />
            HIGH DANGER
          </span>
        );
      case 'MEDIUM':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            MEDIUM RISK
          </span>
        );
      case 'LOW':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            LOW RISK
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Educational & Inference Disclaimer */}
      <div className="px-4 py-2.5 rounded-xl bg-slate-900/90 border border-cyan-500/30 flex items-center justify-between text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-cyan-400 shrink-0" />
          <span>
            <strong className="text-slate-200">BCA Batch Vision Engine:</strong> Multi-image automated roadway inspection pipeline. Real-time inference only (no model training).
          </span>
        </div>
        <span className="hidden sm:inline text-[11px] font-mono text-cyan-400">
          Auto-Retry + Fallback Active
        </span>
      </div>

      {/* Multiple File Upload & Actions Header */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Layers className="w-5 h-5 text-cyan-400" />
              Batch Road Image Upload
            </h3>
            <p className="text-xs text-slate-400">
              Select multiple road photos at once to perform sequential AI hazard classification and risk analysis.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <input
              type="file"
              ref={fileInputRef}
              multiple
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => {
                if (e.target.files) handleFilesAdded(e.target.files);
              }}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isAnalyzing}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white text-xs font-semibold shadow-lg shadow-cyan-950 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Add Multiple Images
            </button>

            {items.length === 0 && (
              <button
                onClick={handleLoadDemoBatch}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-medium transition-colors"
              >
                <FileCheck className="w-3.5 h-3.5 text-cyan-400" />
                Load Sample Road Batch
              </button>
            )}

            {items.length > 0 && !isAnalyzing && (
              <button
                onClick={handleClearAll}
                className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-slate-800 hover:bg-rose-950/60 text-slate-400 hover:text-rose-300 border border-slate-700 hover:border-rose-800/80 text-xs font-medium transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Clear All ({items.length})
              </button>
            )}
          </div>
        </div>

        {/* Drag & Drop Zone if no items yet */}
        {items.length === 0 && (
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              if (e.dataTransfer.files) handleFilesAdded(e.dataTransfer.files);
            }}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center cursor-pointer transition-all ${
              isDragging
                ? 'border-cyan-400 bg-cyan-950/30 scale-[1.01]'
                : 'border-slate-700 hover:border-cyan-500/60 bg-slate-950/50 hover:bg-slate-900/80'
            }`}
          >
            <div className="w-14 h-14 mx-auto rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mb-3">
              <UploadCloud className="w-7 h-7" />
            </div>
            <h4 className="text-base font-bold text-white mb-1">
              Select or Drop Multiple Road Images
            </h4>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Hold Shift or Ctrl to select multiple JPG, PNG, or WEBP photos. You can inspect thumbnails and remove any image prior to analysis.
            </p>
          </div>
        )}
      </div>

      {/* Main Analysis Execution Bar & Progress */}
      {items.length > 0 && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-white">Batch Queue:</span>
                <span className="text-xs font-mono font-bold text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800/60">
                  {items.length} {items.length === 1 ? 'Image' : 'Images'}
                </span>
                {completedCount > 0 && (
                  <span className="text-xs font-mono text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/60">
                    {completedCount} Completed
                  </span>
                )}
                {failedCount > 0 && (
                  <span className="text-xs font-mono text-rose-400 bg-rose-950/60 px-2 py-0.5 rounded border border-rose-800/60">
                    {failedCount} Failed
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">
                {isAnalyzing
                  ? `Analyzing image ${currentIndex + 1} of ${totalCount}... Safe sequential execution.`
                  : isFinished
                  ? 'All images in batch processed successfully.'
                  : 'Ready to run server-side multimodal vision analysis on all images.'}
              </p>
            </div>

            <div className="flex items-center gap-2">
              {!isAnalyzing && !isFinished && (
                <button
                  onClick={startBatchAnalysis}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs sm:text-sm shadow-lg shadow-cyan-950 transition-all hover:scale-102 cursor-pointer"
                >
                  <Play className="w-4 h-4 fill-white" />
                  Analyze All Images ({items.length})
                </button>
              )}

              {isFinished && (
                <button
                  onClick={handleAnalyzeAgain}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs sm:text-sm shadow-lg transition-all"
                >
                  <RotateCcw className="w-4 h-4" />
                  Analyze Again
                </button>
              )}
            </div>
          </div>

          {/* Live Progress Bar during execution */}
          {isAnalyzing && (
            <div className="space-y-2 pt-2 border-t border-slate-800">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-cyan-300 flex items-center gap-2">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-cyan-400" />
                  Analyzing image {currentIndex + 1} of {totalCount}
                </span>
                <span className="text-slate-400 font-bold">
                  {Math.round(((currentIndex + 1) / totalCount) * 100)}%
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-300"
                  style={{ width: `${((currentIndex + 1) / totalCount) * 100}%` }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Overall Batch Summary Report (Requirement 11) */}
      {isFinished && completedCount > 0 && (
        <div className="bg-slate-900 border-2 border-cyan-500/40 rounded-2xl p-5 sm:p-6 space-y-5 shadow-2xl shadow-cyan-950/40">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 mb-2">
                <BarChart3 className="w-3.5 h-3.5 text-cyan-400" />
                BATCH ANALYSIS SUMMARY REPORT
              </div>
              <h3 className="text-xl font-extrabold text-white">
                Multi-Image Inspection Overview
              </h3>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleAnalyzeAgain}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-semibold transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Analyze Again
              </button>
              <button
                onClick={handleClearAll}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-rose-950/60 text-slate-300 hover:text-rose-200 border border-slate-700 text-xs font-semibold transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Clear All
              </button>
            </div>
          </div>

          {/* 6 Key Stat Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {/* Total Images */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 text-center">
              <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block mb-1">
                Total Images
              </span>
              <span className="text-2xl font-black text-white">{totalCount}</span>
            </div>

            {/* Images with Hazards */}
            <div className="bg-slate-950/80 border border-amber-900/40 rounded-xl p-3.5 text-center">
              <span className="text-[11px] font-mono text-amber-300 uppercase tracking-wider block mb-1">
                With Hazards
              </span>
              <span className="text-2xl font-black text-amber-400">{hazardsDetectedCount}</span>
            </div>

            {/* High-Risk Images */}
            <div className="bg-slate-950/80 border border-rose-900/40 rounded-xl p-3.5 text-center">
              <span className="text-[11px] font-mono text-rose-300 uppercase tracking-wider block mb-1">
                High Risk
              </span>
              <span className="text-2xl font-black text-rose-400">{highRiskCount}</span>
            </div>

            {/* Medium-Risk Images */}
            <div className="bg-slate-950/80 border border-amber-900/40 rounded-xl p-3.5 text-center">
              <span className="text-[11px] font-mono text-amber-300 uppercase tracking-wider block mb-1">
                Medium Risk
              </span>
              <span className="text-2xl font-black text-amber-400">{mediumRiskCount}</span>
            </div>

            {/* Low-Risk Images */}
            <div className="bg-slate-950/80 border border-emerald-900/40 rounded-xl p-3.5 text-center">
              <span className="text-[11px] font-mono text-emerald-300 uppercase tracking-wider block mb-1">
                Low Risk
              </span>
              <span className="text-2xl font-black text-emerald-400">{lowRiskCount}</span>
            </div>

            {/* Pass / Failure Rate */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 text-center">
              <span className="text-[11px] font-mono text-cyan-300 uppercase tracking-wider block mb-1">
                Success Rate
              </span>
              <span className="text-2xl font-black text-cyan-400">
                {Math.round((completedCount / totalCount) * 100)}%
              </span>
            </div>
          </div>

          {/* Most Common Hazard Bar */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
                <AlertTriangle className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block">
                  Most Common Detected Hazard in Batch
                </span>
                <span className="text-sm sm:text-base font-bold text-white">
                  {mostCommonHazard}
                </span>
              </div>
            </div>

            <div className="text-right">
              <span className="text-xs text-slate-400 block">Overall Batch Safety Status:</span>
              <span className={`text-xs font-bold font-mono ${
                highRiskCount > 0 ? 'text-rose-400' : mediumRiskCount > 0 ? 'text-amber-400' : 'text-emerald-400'
              }`}>
                {highRiskCount > 0
                  ? `CRITICAL ATTENTION REQUIRED (${highRiskCount} High Danger)`
                  : mediumRiskCount > 0
                  ? `MODERATE CAUTION ADVISED (${mediumRiskCount} Moderate Hazards)`
                  : 'OPTIMAL / CLEAR ROAD CONDITIONS'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Grid of Uploaded Images & Per-Image Results (Requirements 2, 7, 8) */}
      {items.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-300">
              Batch Items & Detailed AI Findings ({items.length})
            </h4>
            <span className="text-[11px] text-slate-500">
              Click any card to inspect full high-resolution telemetry
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {items.map((item, idx) => {
              const isCurrentlyAnalyzing = isAnalyzing && currentIndex === idx;
              const hasResult = item.status === 'completed' && item.result;
              const report = item.result;

              return (
                <div
                  key={item.id}
                  onClick={() => setSelectedPreviewItem(item)}
                  className={`bg-slate-900 border rounded-2xl p-4 transition-all relative flex flex-col justify-between cursor-pointer group ${
                    isCurrentlyAnalyzing
                      ? 'border-cyan-400 shadow-xl shadow-cyan-950/60 ring-2 ring-cyan-500/40'
                      : hasResult && report?.dangerLevel === 'HIGH'
                      ? 'border-rose-900/60 hover:border-rose-700 bg-rose-950/10'
                      : hasResult && report?.dangerLevel === 'MEDIUM'
                      ? 'border-amber-900/60 hover:border-amber-700 bg-amber-950/10'
                      : hasResult && report?.dangerLevel === 'LOW'
                      ? 'border-emerald-900/60 hover:border-emerald-700 bg-emerald-950/10'
                      : 'border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {/* Top Bar: Name, Status, Remove Button */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2 overflow-hidden">
                      <span className="w-5 h-5 rounded-md bg-slate-800 text-[11px] font-mono font-bold text-slate-300 flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <span className="text-xs font-semibold text-white truncate max-w-[180px] sm:max-w-[220px]" title={item.name}>
                        {item.name}
                      </span>
                      <span className="text-[10px] font-mono text-slate-500 shrink-0">
                        ({item.sizeFormatted})
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {/* Status indicator */}
                      {item.status === 'pending' && (
                        <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-slate-800 text-slate-400 border border-slate-700">
                          Pending
                        </span>
                      )}

                      {item.status === 'analyzing' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono bg-cyan-950 text-cyan-300 border border-cyan-800 animate-pulse">
                          <RefreshCw className="w-3 h-3 animate-spin text-cyan-400" />
                          Analyzing...
                        </span>
                      )}

                      {item.status === 'completed' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono bg-emerald-950 text-emerald-300 border border-emerald-800">
                          <Check className="w-3 h-3" />
                          Completed
                        </span>
                      )}

                      {item.status === 'failed' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono bg-rose-950 text-rose-300 border border-rose-800">
                          <X className="w-3 h-3" />
                          Failed
                        </span>
                      )}

                      {/* Remove button (disabled during active analysis of this item) */}
                      {!isAnalyzing && (
                        <button
                          onClick={(e) => handleRemoveItem(item.id, e)}
                          title="Remove image"
                          className="p-1 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Body: Preview Thumbnail + Result Summary */}
                  <div className="flex gap-3.5 items-start">
                    {/* Thumbnail preview (Requirement 2) */}
                    <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-xl overflow-hidden bg-slate-950 border border-slate-800 shrink-0 relative group-hover:border-cyan-500/40 transition-colors">
                      <img
                        src={item.dataUrl}
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white">
                        <Eye className="w-4 h-4" />
                      </div>
                    </div>

                    {/* Results data (Requirement 7) */}
                    <div className="flex-1 min-w-0 space-y-2">
                      {hasResult && report ? (
                        <>
                          <div className="flex flex-wrap items-center gap-1.5">
                            {getDangerBadge(report.dangerLevel)}
                            {report.category === 'human' && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">
                                <User className="w-3 h-3 text-rose-400" />
                                Pedestrian
                              </span>
                            )}
                            {report.category === 'animal' && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                                <PawPrint className="w-3 h-3 text-amber-400" />
                                Animal
                              </span>
                            )}
                            <span className="text-[11px] font-mono text-cyan-400 font-bold bg-slate-800 px-2 py-0.5 rounded">
                              {report.confidence}% Conf.
                            </span>
                          </div>

                          {(() => {
                            const loc = getLocalizedHazard(report, language);
                            return (
                              <>
                                <div>
                                  <h5 className="text-sm font-extrabold text-white truncate" title={loc.primaryHazard}>
                                    {loc.primaryHazard}
                                  </h5>
                                  <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed">
                                    {report.description}
                                  </p>
                                </div>

                                <div className="pt-1 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                                  <span className="truncate max-w-[200px]" title={loc.recommendation}>
                                    <strong className="text-slate-300">Action:</strong> {loc.recommendation}
                                  </span>
                                  {report.voiceAlert && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        audioService.triggerHazardAlert(
                                          report.dangerLevel,
                                          report.voiceAlert,
                                          report.primaryHazard,
                                          report.category,
                                          report.voiceAlertKn
                                        );
                                      }}
                                      title="Play voice alert"
                                      className="p-1 rounded text-cyan-400 hover:text-cyan-300 hover:bg-slate-800 shrink-0"
                                    >
                                      <Volume2 className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>
                              </>
                            );
                          })()}
                        </>
                      ) : item.status === 'failed' ? (
                        <div className="space-y-1 text-xs text-rose-300">
                          <p className="font-semibold flex items-center gap-1">
                            <AlertOctagon className="w-3.5 h-3.5 text-rose-400" />
                            Analysis Error
                          </p>
                          <p className="text-[11px] text-rose-200/80 leading-snug">
                            {item.errorMessage || 'AI vision model unavailable or unable to process image.'}
                          </p>
                        </div>
                      ) : item.status === 'analyzing' ? (
                        <div className="space-y-1 text-xs text-cyan-300 animate-pulse">
                          <p className="font-semibold flex items-center gap-1.5">
                            <RefreshCw className="w-3.5 h-3.5 animate-spin text-cyan-400" />
                            AI Multimodal Processing
                          </p>
                          <p className="text-[11px] text-slate-400">
                            Scanning road surface textures, cracks, and obstacles...
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-1 text-xs text-slate-500">
                          <p className="font-medium">Queued for AI inspection</p>
                          <p className="text-[11px]">
                            Click "Analyze All Images" above to process this item.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Modal / Detail Inspection Dialog for Selected Batch Item */}
      {selectedPreviewItem && selectedPreviewItem.result && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-5 sm:p-6 space-y-4 shadow-2xl animate-in fade-in duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-cyan-400 bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-800/80">
                  Detailed Telemetry
                </span>
                <h4 className="text-base font-bold text-white truncate max-w-xs sm:max-w-md">
                  {selectedPreviewItem.name}
                </h4>
              </div>
              <button
                onClick={() => setSelectedPreviewItem(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="aspect-video w-full rounded-xl overflow-hidden bg-black border border-slate-800 relative">
              <img
                src={selectedPreviewItem.dataUrl}
                alt={selectedPreviewItem.name}
                className="w-full h-full object-contain"
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                {getDangerBadge(selectedPreviewItem.result.dangerLevel)}
                <span className="text-xs font-mono text-cyan-400 font-bold bg-slate-800 px-2.5 py-1 rounded-lg">
                  Confidence: {selectedPreviewItem.result.confidence}%
                </span>
              </div>

              <div>
                <h3 className="text-lg font-extrabold text-white">
                  {selectedPreviewItem.result.primaryHazard}
                </h3>
                <p className="text-xs sm:text-sm text-slate-300 mt-1 leading-relaxed">
                  {selectedPreviewItem.result.description}
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1">
                <span className="text-[11px] font-mono text-amber-400 font-bold block uppercase tracking-wider">
                  Driver Safety Advisory:
                </span>
                <p className="text-xs sm:text-sm text-slate-200">
                  {selectedPreviewItem.result.recommendation}
                </p>
              </div>

              {selectedPreviewItem.result.voiceAlert && (
                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between gap-3 text-xs text-slate-400">
                  <div className="flex items-center gap-2">
                    <Volume2 className="w-4 h-4 text-cyan-400 shrink-0" />
                    <span className="italic text-slate-300">"{selectedPreviewItem.result.voiceAlert}"</span>
                  </div>
                  <button
                    onClick={() => {
                      if (selectedPreviewItem.result) {
                        audioService.triggerHazardAlert(
                          selectedPreviewItem.result.dangerLevel,
                          selectedPreviewItem.result.voiceAlert,
                          selectedPreviewItem.result.primaryHazard
                        );
                      }
                    }}
                    className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-cyan-400 font-semibold text-xs transition-colors shrink-0"
                  >
                    Play
                  </button>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setSelectedPreviewItem(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold"
              >
                Close Inspection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

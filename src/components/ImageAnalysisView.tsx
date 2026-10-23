import React, { useState, useRef, useEffect } from 'react';
import { 
  UploadCloud, 
  RefreshCw, 
  AlertTriangle, 
  ShieldCheck, 
  AlertOctagon, 
  Volume2, 
  CheckCircle2, 
  Compass, 
  Navigation, 
  CloudSun,
  Layers,
  ArrowRight,
  FileCheck,
  Maximize2
} from 'lucide-react';
import { RoadAnalysisResult, DangerLevel, AppLanguage } from '../types';
import { SAMPLE_ROAD_IMAGES, SampleRoadImage } from '../data/sampleImages';
import { audioService } from '../services/audioService';
import { getLocalizedHazard } from '../services/languageService';
import { BatchImageAnalysis } from './BatchImageAnalysis';
import { Image as ImageIcon, User, PawPrint, Siren } from 'lucide-react';

interface ImageAnalysisViewProps {
  onReportGenerated: (report: RoadAnalysisResult) => void;
  soundEnabled: boolean;
  voiceEnabled: boolean;
  language?: AppLanguage;
}

export const ImageAnalysisView: React.FC<ImageAnalysisViewProps> = ({
  onReportGenerated,
  soundEnabled,
  voiceEnabled,
  language = 'en',
}) => {
  const [analysisMode, setAnalysisMode] = useState<'single' | 'batch'>('single');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState<boolean>(false);
  const [analysisProgress, setAnalysisProgress] = useState<string>('');
  const [result, setResult] = useState<RoadAnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageElementRef = useRef<HTMLImageElement | null>(null);

  // File selection
  const handleFileSelect = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Please upload a valid image file (JPEG, PNG, WEBP).');
      return;
    }
    setError(null);
    setResult(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      setSelectedImage(dataUrl);
      analyzeImage(dataUrl);
    };
    reader.onerror = () => {
      setError('Failed to read the selected file.');
    };
    reader.readAsDataURL(file);
  };

  // Sample image selection
  const handleSelectSample = async (sample: SampleRoadImage) => {
    setError(null);
    setResult(null);
    setSelectedImage(sample.dataUrl);

    if (sample.dataUrl.startsWith('data:image/')) {
      analyzeImage(sample.dataUrl);
    } else {
      // It's a static image asset URL, convert to base64 data URL
      try {
        const response = await fetch(sample.dataUrl);
        const blob = await response.blob();
        const reader = new FileReader();
        reader.onload = (e) => {
          const base64 = e.target?.result as string;
          analyzeImage(base64);
        };
        reader.onerror = () => {
          setError('Failed to process sample image.');
        };
        reader.readAsDataURL(blob);
      } catch (err) {
        console.error('Failed to load sample image asset:', err);
        setError('Failed to load sample image.');
      }
    }
  };

  // Perform AI analysis
  const analyzeImage = async (dataUrl: string) => {
    setAnalyzing(true);
    setAnalysisProgress('Scanning road surface topography & obstacles...');
    setError(null);

    try {
      setAnalysisProgress('Connecting to Gemini Flash Multimodal Perception Engine...');
      
      const response = await fetch('/api/analyze-road', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image: dataUrl,
          source: 'upload',
          saveReport: true,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Server returned error status ${response.status}`);
      }

      setAnalysisProgress('Synthesizing hazards, danger rating & safety advisories...');
      const data = await response.json();

      if (!data.success || !data.report) {
        throw new Error(data.error || 'Empty or invalid analysis result from AI service.');
      }

      const report: RoadAnalysisResult = {
        ...data.report,
        thumbnail: dataUrl,
      };

      setResult(report);
      onReportGenerated(report);

      // Trigger audio & voice alerts according to danger level in selected language
      audioService.triggerHazardAlert(
        report.dangerLevel,
        report.voiceAlert,
        report.primaryHazard,
        report.category,
        report.voiceAlertKn
      );
    } catch (err: any) {
      console.error('Analysis error:', err);
      setError(
        err.message ||
        'Unable to complete AI vision analysis. Please check your network connection and server status.'
      );
    } finally {
      setAnalyzing(false);
      setAnalysisProgress('');
    }
  };

  // Draw bounding boxes on canvas when result or image changes
  useEffect(() => {
    if (!selectedImage || !canvasRef.current) return;

    const img = new Image();
    img.src = selectedImage;
    img.onload = () => {
      imageElementRef.current = img;
      const canvas = canvasRef.current;
      if (!canvas) return;

      canvas.width = img.naturalWidth || 800;
      canvas.height = img.naturalHeight || 600;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Draw original image
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      // If we have bounding boxes from Gemini
      if (result && result.hazardsList && result.hazardsList.length > 0) {
        result.hazardsList.forEach((hazard) => {
          if (!hazard.box || hazard.box.length !== 4) return;

          const [ymin, xmin, ymax, xmax] = hazard.box;
          // Coordinates are normalized 0-1000
          const x = (xmin / 1000) * canvas.width;
          const y = (ymin / 1000) * canvas.height;
          const w = ((xmax - xmin) / 1000) * canvas.width;
          const h = ((ymax - ymin) / 1000) * canvas.height;

          const color =
            hazard.type === 'human'
              ? '#f43f5e' // Vibrant Rose for Pedestrians
              : hazard.type === 'animal'
              ? '#f97316' // Vibrant Orange for Animals
              : hazard.dangerLevel === 'HIGH'
              ? '#ef4444'
              : hazard.dangerLevel === 'MEDIUM'
              ? '#f59e0b'
              : '#10b981';

          // Box outline
          ctx.strokeStyle = color;
          ctx.lineWidth = 4;
          ctx.strokeRect(x, y, w, h);

          // Box fill tint
          ctx.fillStyle = `${color}25`;
          ctx.fillRect(x, y, w, h);

          // Label badge
          const label = `${hazard.name} [${hazard.dangerLevel}]`;
          ctx.font = 'bold 16px sans-serif';
          const textWidth = ctx.measureText(label).width;

          ctx.fillStyle = color;
          ctx.fillRect(x, Math.max(0, y - 28), textWidth + 14, 26);

          ctx.fillStyle = '#ffffff';
          ctx.fillText(label, x + 7, Math.max(18, y - 9));
        });
      }
    };
  }, [selectedImage, result]);

  const resetAnalysis = () => {
    setSelectedImage(null);
    setResult(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const replayAudio = () => {
    if (!result) return;
    audioService.triggerHazardAlert(
      result.dangerLevel,
      result.voiceAlert,
      result.primaryHazard,
      result.category,
      result.voiceAlertKn
    );
  };

  const getDangerBadge = (level: DangerLevel) => {
    switch (level) {
      case 'HIGH':
        return (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse font-mono font-bold text-sm">
            <AlertOctagon className="w-5 h-5 text-rose-400" />
            <span>HIGH DANGER ALERT</span>
          </div>
        );
      case 'MEDIUM':
        return (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono font-bold text-sm">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
            <span>MEDIUM RISK WARNING</span>
          </div>
        );
      case 'LOW':
        return (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-mono font-bold text-sm">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <span>LOW RISK / CLEAR ROAD</span>
          </div>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
            Road Image AI Vision Analysis
          </h2>
          <p className="text-xs sm:text-sm text-slate-400">
            Upload custom road imagery or select sample cases for automated pothole, obstacle, and damage identification.
          </p>
        </div>
        {analysisMode === 'single' && selectedImage && (
          <button
            onClick={resetAnalysis}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold self-start sm:self-auto transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Analyze Another Image
          </button>
        )}
      </div>

      {/* Mode Switcher Tabs */}
      <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-slate-900 border border-slate-800 w-fit">
        <button
          onClick={() => setAnalysisMode('single')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
            analysisMode === 'single'
              ? 'bg-cyan-500 text-slate-950 shadow-md font-bold'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <ImageIcon className="w-4 h-4" />
          Single Image Analysis
        </button>
        <button
          onClick={() => setAnalysisMode('batch')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
            analysisMode === 'batch'
              ? 'bg-cyan-500 text-slate-950 shadow-md font-bold'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <Layers className="w-4 h-4" />
          Multiple Images Analysis
          <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${
            analysisMode === 'batch' ? 'bg-slate-900 text-cyan-300' : 'bg-cyan-950 text-cyan-400 border border-cyan-800/60'
          }`}>
            NEW
          </span>
        </button>
      </div>

      {analysisMode === 'batch' ? (
        <BatchImageAnalysis
          onReportGenerated={onReportGenerated}
          soundEnabled={soundEnabled}
          voiceEnabled={voiceEnabled}
          language={language}
        />
      ) : (
        <>
          {/* Error Alert */}
          {error && (
            <div className="p-4 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-200 text-sm flex items-start gap-3">
              <AlertOctagon className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-semibold text-rose-300">Analysis Failed</p>
                <p className="text-xs text-rose-200/90 leading-relaxed">{error}</p>
              </div>
            </div>
          )}

      {/* Upload Zone & Quick Sample Picker when no image is loaded */}
      {!selectedImage && (
        <div className="space-y-6">
          {/* Drag & Drop Upload Box */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                handleFileSelect(e.dataTransfer.files[0]);
              }
            }}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center cursor-pointer transition-all ${
              isDragging
                ? 'border-cyan-400 bg-cyan-950/30 scale-[1.01]'
                : 'border-slate-700 hover:border-cyan-500/60 bg-slate-900/60 hover:bg-slate-900/90'
            }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleFileSelect(e.target.files[0]);
                }
              }}
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
            />
            <div className="w-16 h-16 mx-auto rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mb-4">
              <UploadCloud className="w-8 h-8" />
            </div>
            <h3 className="text-base sm:text-lg font-bold text-white">
              Drag & Drop your road photograph here
            </h3>
            <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-md mx-auto">
              Supports JPEG, PNG, or WEBP. Upload dashcam photos, mobile road snapshots, or street level view images.
            </p>
            <div className="mt-4">
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs transition-colors shadow-lg shadow-cyan-600/20">
                Browse Road Files
              </span>
            </div>
          </div>

          {/* Quick 1-Click Sample Test Cases */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono">
                One-Click Test Cases (Instant AI Vision Evaluation)
              </h3>
              <span className="text-[11px] text-slate-500">
                Click any scenario below to trigger analysis
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {SAMPLE_ROAD_IMAGES.map((sample) => (
                <div
                  key={sample.id}
                  onClick={() => handleSelectSample(sample)}
                  className="bg-slate-900/90 hover:bg-slate-800 border border-slate-800 hover:border-cyan-500/50 rounded-xl p-3 cursor-pointer transition-all hover:scale-102 flex flex-col justify-between group"
                >
                  <div className="aspect-video w-full rounded-lg overflow-hidden bg-slate-950 border border-slate-800 mb-2.5 relative">
                    <img
                      src={sample.dataUrl}
                      alt={sample.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <span
                      className={`absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded text-[9px] font-bold ${
                        sample.expectedRisk === 'HIGH'
                          ? 'bg-rose-950/90 text-rose-300 border border-rose-700'
                          : sample.expectedRisk === 'MEDIUM'
                          ? 'bg-amber-950/90 text-amber-300 border border-amber-700'
                          : 'bg-emerald-950/90 text-emerald-300 border border-emerald-700'
                      }`}
                    >
                      {sample.expectedRisk} RISK
                    </span>
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white group-hover:text-cyan-300 transition-colors">
                      {sample.title}
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">
                      {sample.description}
                    </p>
                  </div>
                  <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-cyan-400">
                    <span>Run AI Vision</span>
                    <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Processing State */}
      {analyzing && (
        <div className="bg-slate-900/90 border border-cyan-500/40 rounded-2xl p-8 sm:p-12 text-center space-y-4">
          <div className="w-16 h-16 mx-auto relative flex items-center justify-center">
            <div className="absolute inset-0 rounded-full border-4 border-cyan-500/20 border-t-cyan-400 animate-spin" />
            <RefreshCw className="w-6 h-6 text-cyan-400 animate-pulse" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-white">AI Vision Analysis In Progress</h3>
            <p className="text-xs sm:text-sm text-cyan-300 font-mono animate-pulse">
              {analysisProgress}
            </p>
          </div>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Processing neural feature layers with Gemini Flash Vision to classify potholes, obstacles, and depth contours.
          </p>
        </div>
      )}

      {/* Analysis Results View */}
      {selectedImage && result && (
        <div className="space-y-6">
          {/* Main Inspection Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left: Image Canvas with Bounding Boxes (7 cols) */}
            <div className="lg:col-span-7 bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Maximize2 className="w-4 h-4 text-cyan-400" />
                    <span className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono">
                      Visual Perception Canvas
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-500 font-mono">
                    Detection Boxes Active
                  </span>
                </div>

                <div className="relative rounded-xl overflow-hidden bg-slate-950 border border-slate-800 shadow-inner flex items-center justify-center">
                  <canvas
                    ref={canvasRef}
                    className="w-full h-auto max-h-[500px] object-contain rounded-lg"
                  />
                </div>
              </div>

              {/* Quick action under image */}
              <div className="mt-4 flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-800">
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <span className="w-2 h-2 rounded-full bg-cyan-400" />
                  <span>Target Source: {result.source.toUpperCase()}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={replayAudio}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium transition-colors"
                  >
                    <Volume2 className="w-3.5 h-3.5 text-cyan-400" />
                    Replay Audio Alert
                  </button>
                  <button
                    onClick={resetAnalysis}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-medium transition-colors"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    New Image
                  </button>
                </div>
              </div>
            </div>

            {/* Right: Detailed Hazard Diagnostics & Recommendations (5 cols) */}
            {(() => {
              const loc = getLocalizedHazard(result, language);
              return (
                <div className="lg:col-span-5 space-y-4">
                  {/* Primary Hazard Card */}
                  <div
                    className={`rounded-2xl p-5 border shadow-xl ${
                      result.dangerLevel === 'HIGH'
                        ? 'bg-rose-950/40 border-rose-600/40'
                        : result.dangerLevel === 'MEDIUM'
                        ? 'bg-amber-950/40 border-amber-600/40'
                        : 'bg-emerald-950/40 border-emerald-600/40'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400">
                        Primary Detection
                      </span>
                      {getDangerBadge(result.dangerLevel)}
                    </div>

                    <h3 className="text-lg sm:text-xl font-extrabold text-white mt-2 leading-snug">
                      {loc.primaryHazard}
                    </h3>

                    {language !== 'en' && (
                      <p className="text-xs text-amber-300/90 font-mono mt-1">
                        {loc.emergencyWarning}
                      </p>
                    )}

                    <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                      {result.description}
                    </p>

                    {/* Confidence Bar */}
                    <div className="mt-4 pt-3 border-t border-slate-700/50">
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <span className="font-semibold text-slate-300">Perception Confidence</span>
                        <span className="font-mono font-bold text-cyan-300">{result.confidence}%</span>
                      </div>
                      <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-700 ${
                            result.dangerLevel === 'HIGH'
                              ? 'bg-rose-500'
                              : result.dangerLevel === 'MEDIUM'
                              ? 'bg-amber-400'
                              : 'bg-emerald-400'
                          }`}
                          style={{ width: `${result.confidence}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Safety Recommendation Card */}
                  <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-3">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-400" />
                      <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                        Driver Safety Action Recommendation
                      </h4>
                    </div>
                    <div className="p-3.5 rounded-xl bg-slate-800/80 border border-slate-700/60 text-xs sm:text-sm text-slate-200 leading-relaxed font-medium">
                      {loc.recommendation}
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400 italic pt-1">
                      <div className="flex items-center gap-2">
                        <Volume2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                        <span>
                          Voice alert ({language === 'kn' ? 'ಕನ್ನಡ' : language === 'kn_en' ? 'ಕನ್ನಡ First ➔ EN' : 'English'}): "
                          {language === 'kn' ? loc.voiceAlertKn : language === 'kn_en' ? `${loc.voiceAlertKn} • ${loc.voiceAlertEn}` : loc.voiceAlertEn}
                          "
                        </span>
                      </div>
                      <div className="flex items-center gap-2 not-italic">
                        <button
                          type="button"
                          onClick={() => audioService.triggerHazardAlert(result.dangerLevel, result.voiceAlert, result.primaryHazard, result.category, result.voiceAlertKn)}
                          className="shrink-0 px-2.5 py-1 rounded bg-cyan-950 text-cyan-300 border border-cyan-800 text-[11px] font-mono font-bold hover:bg-cyan-900 transition-colors cursor-pointer inline-flex items-center gap-1"
                          title="Replay Voice Alert in selected language"
                        >
                          <Volume2 className="w-3 h-3 text-cyan-400" />
                          <span>ಧ್ವನಿ ನುಡಿಸಿ (Play Voice)</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => audioService.toggleEmergencySiren(3.0)}
                          className="shrink-0 px-2.5 py-1 rounded bg-rose-950/80 text-rose-300 border border-rose-800 text-[11px] font-mono font-bold hover:bg-rose-900 transition-colors cursor-pointer inline-flex items-center gap-1"
                          title="Sound Alert Siren / ತುರ್ತು ಸೈರನ್ ಮೊಳಗಿಸಿ"
                        >
                          <Siren className="w-3 h-3 text-rose-400" />
                          <span>Alert Siren (ಸೈರನ್)</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Telemetry Breakdown Details */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-3">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono flex items-center gap-2">
                  <Layers className="w-3.5 h-3.5 text-cyan-400" />
                  Road Telemetry Parameters
                </h4>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-2.5 rounded-lg bg-slate-800/60 border border-slate-800">
                    <span className="text-[10px] text-slate-500 uppercase font-mono block">Estimated Distance</span>
                    <span className="font-semibold text-slate-200 mt-0.5 block">
                      {result.estimatedDistance || '10-15m'}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-800/60 border border-slate-800">
                    <span className="text-[10px] text-slate-500 uppercase font-mono block">Lane Position</span>
                    <span className="font-semibold text-slate-200 mt-0.5 block">
                      {result.lanePosition || 'Center road'}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-800/60 border border-slate-800">
                    <span className="text-[10px] text-slate-500 uppercase font-mono block">Surface Type</span>
                    <span className="font-semibold text-slate-200 mt-0.5 block capitalize">
                      {result.roadSurface || 'Asphalt'}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-800/60 border border-slate-800">
                    <span className="text-[10px] text-slate-500 uppercase font-mono block">Lighting / Weather</span>
                    <span className="font-semibold text-slate-200 mt-0.5 block capitalize">
                      {result.weatherLighting?.replace('_', ' ') || 'Clear day'}
                    </span>
                  </div>
                </div>

                {result.hazardsList && result.hazardsList.length > 1 && (
                  <div className="pt-2 border-t border-slate-800">
                    <span className="text-[10px] text-slate-500 uppercase font-mono block mb-1.5">
                      Secondary Hazards Detected ({result.hazardsList.length - 1})
                    </span>
                    <div className="space-y-1">
                      {result.hazardsList.slice(1).map((hz, idx) => (
                        <div key={idx} className="flex items-center justify-between text-xs py-1 px-2 rounded bg-slate-800/40">
                          <span className="text-slate-300">{hz.name}</span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded font-mono font-bold bg-slate-700 text-slate-300">
                            {hz.dangerLevel}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })()}
          </div>
        </div>
      )}
        </>
      )}
    </div>
  );
};

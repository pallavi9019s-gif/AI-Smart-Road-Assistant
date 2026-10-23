import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Camera, 
  CameraOff, 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Mic, 
  MicOff, 
  AlertTriangle, 
  ShieldCheck, 
  AlertOctagon, 
  RefreshCw, 
  Sliders, 
  Target, 
  Zap, 
  Activity,
  Layers,
  ChevronDown,
  Info,
  User,
  PawPrint,
  Siren
} from 'lucide-react';
import { RoadAnalysisResult, DangerLevel, AppLanguage } from '../types';
import { audioService } from '../services/audioService';
import { getLocalizedHazard } from '../services/languageService';

interface LiveCameraViewProps {
  onReportGenerated: (report: RoadAnalysisResult) => void;
  soundEnabled: boolean;
  setSoundEnabled: (enabled: boolean) => void;
  voiceEnabled: boolean;
  setVoiceEnabled: (enabled: boolean) => void;
  language?: AppLanguage;
}

export const LiveCameraView: React.FC<LiveCameraViewProps> = ({
  onReportGenerated,
  soundEnabled,
  setSoundEnabled,
  voiceEnabled,
  setVoiceEnabled,
  language = 'en',
}) => {
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [analysisActive, setAnalysisActive] = useState<boolean>(true);
  const [scanInterval, setScanInterval] = useState<number>(3); // 3 seconds default
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isProcessingFrame, setIsProcessingFrame] = useState<boolean>(false);
  const [lastAnalyzedTime, setLastAnalyzedTime] = useState<string | null>(null);
  const [currentHazard, setCurrentHazard] = useState<RoadAnalysisResult | null>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [isSimulatedRoadMode, setIsSimulatedRoadMode] = useState<boolean>(false);
  const [fpsCounter, setFpsCounter] = useState<number>(0);
  const [sirenActive, setSirenActive] = useState<boolean>(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastAlertRef = useRef<{ category: string; hazard: string; timestamp: number } | null>(null);

  // Subscribe to real-time siren state
  useEffect(() => {
    const unsub = audioService.onSirenChange(setSirenActive);
    return unsub;
  }, []);

  // Enumerate video devices
  useEffect(() => {
    if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
      navigator.mediaDevices
        .enumerateDevices()
        .then((deviceInfos) => {
          const videoInputs = deviceInfos.filter((d) => d.kind === 'videoinput');
          setDevices(videoInputs);
          if (videoInputs.length > 0 && !selectedDeviceId) {
            setSelectedDeviceId(videoInputs[0].deviceId);
          }
        })
        .catch(() => {});
    }
  }, [selectedDeviceId]);

  // Stop camera stream cleanup
  const stopCamera = useCallback(() => {
    if (intervalTimerRef.current) {
      clearInterval(intervalTimerRef.current);
      intervalTimerRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
    setIsProcessingFrame(false);
  }, []);

  // Safe Camera Start
  const startCamera = async (deviceId?: string) => {
    setCameraError(null);
    stopCamera();

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error(
          'Camera access (navigator.mediaDevices.getUserMedia) is not supported by your browser or environment.'
        );
      }

      const constraints: MediaStreamConstraints = {
        video: deviceId
          ? { deviceId: { exact: deviceId } }
          : {
              facingMode: { ideal: 'environment' },
              width: { ideal: 1280 },
              height: { ideal: 720 },
            },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setCameraActive(true);
      setIsSimulatedRoadMode(false);
    } catch (err: any) {
      console.error('Camera access error:', err);
      let message = 'Unable to access laptop webcam.';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        message = 'Webcam permission was denied. Please allow camera access in your browser address bar.';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        message = 'No webcam hardware was detected on your system.';
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        message = 'Camera is already in use by another application or locked.';
      } else if (err.message) {
        message = err.message;
      }
      setCameraError(message);
    }
  };

  // Capture single frame from video and send to backend
  const captureAndAnalyzeFrame = useCallback(async () => {
    if (isProcessingFrame) return;

    let dataUrl: string | null = null;

    if (cameraActive && videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (video.readyState < 2) return; // not enough data yet

      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Draw current video frame to hidden canvas
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    }

    if (!dataUrl) return;

    setIsProcessingFrame(true);

    try {
      const res = await fetch('/api/analyze-road', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: dataUrl,
          source: 'camera',
          saveReport: true,
        }),
      });

      if (!res.ok) {
        throw new Error(`Server returned HTTP ${res.status}`);
      }

      const data = await res.json();
      if (data.success && data.report) {
        const report: RoadAnalysisResult = {
          ...data.report,
          thumbnail: dataUrl,
        };

        setCurrentHazard(report);
        setLastAnalyzedTime(new Date().toLocaleTimeString());
        onReportGenerated(report);

        // Deduplicate repeated alerts for the same detected person or animal
        const isHumanOrAnimal = report.category === 'human' || report.category === 'animal';
        const now = Date.now();
        const prev = lastAlertRef.current;
        
        // Cooldown: 12 seconds for the same human/animal or 8 seconds for the same hazard name
        const cooldownMs = isHumanOrAnimal ? 12000 : 8000;
        const isRepeatedEntity = prev && 
          ((isHumanOrAnimal && prev.category === report.category) || prev.hazard === report.primaryHazard) &&
          (now - prev.timestamp < cooldownMs);

        if (!isRepeatedEntity) {
          lastAlertRef.current = {
            category: report.category,
            hazard: report.primaryHazard,
            timestamp: now,
          };

          // Dispatch auditory and speech warnings in selected language (English, Kannada, or Kannada+English)
          audioService.triggerHazardAlert(
            report.dangerLevel,
            report.voiceAlert,
            report.primaryHazard,
            report.category,
            report.voiceAlertKn
          );
        }
      }
    } catch (err: any) {
      console.warn('Live frame analysis failed:', err);
    } finally {
      setIsProcessingFrame(false);
    }
  }, [cameraActive, isProcessingFrame, onReportGenerated]);

  // Periodic capture loop
  useEffect(() => {
    if (cameraActive && analysisActive) {
      // Run first scan after 1.5 seconds once stream settles
      const initialTimeout = setTimeout(() => {
        captureAndAnalyzeFrame();
      }, 1500);

      const intervalMs = scanInterval * 1000;
      intervalTimerRef.current = setInterval(() => {
        captureAndAnalyzeFrame();
      }, intervalMs);

      return () => {
        clearTimeout(initialTimeout);
        if (intervalTimerRef.current) {
          clearInterval(intervalTimerRef.current);
          intervalTimerRef.current = null;
        }
      };
    }
  }, [cameraActive, analysisActive, scanInterval, captureAndAnalyzeFrame]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  return (
    <div className="space-y-6">
      {/* Hidden processing canvas */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
              Real-Time Live Camera Mode
            </h2>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center gap-1 font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-ping" />
              LIVE PERCEPTION
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            Real webcam feed streams to Gemini Flash Vision at periodic intervals for continuous road hazard detection.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Emergency Alert Siren Button (Always accessible) */}
          <button
            onClick={() => audioService.toggleEmergencySiren(4.0)}
            title={sirenActive ? 'Stop Emergency Siren / ತುರ್ತು ಸೈರನ್ ನಿಲ್ಲಿಸಿ' : 'Sound Emergency Alert Siren / ಅಪಾಯಕಾರಿ ಸೈರನ್ ಮೊಳಗಿಸಿ'}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-mono font-bold border transition-all cursor-pointer ${
              sirenActive
                ? 'bg-rose-600 text-white border-rose-400 shadow-lg shadow-rose-600/60 animate-pulse'
                : 'bg-rose-950/50 border-rose-700/60 text-rose-300 hover:bg-rose-900/60 hover:text-white'
            }`}
          >
            <Siren className={`w-4 h-4 ${sirenActive ? 'animate-bounce text-white' : 'text-rose-400'}`} />
            <span>{sirenActive ? '🚨 SIREN SOUNDING (ನಿಲ್ಲಿಸಿ)' : 'Alert Siren (ಸೈರನ್)'}</span>
          </button>

          {!cameraActive ? (
            <button
              onClick={() => startCamera(selectedDeviceId)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-semibold text-xs sm:text-sm shadow-lg shadow-emerald-500/20 transition-all hover:scale-102 cursor-pointer"
            >
              <Camera className="w-4 h-4" />
              <span>Start Live Camera</span>
            </button>
          ) : (
            <>
              <button
                onClick={() => setAnalysisActive(!analysisActive)}
                className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                  analysisActive
                    ? 'bg-amber-950/40 border-amber-600/50 text-amber-300 hover:bg-amber-900/40'
                    : 'bg-emerald-950/40 border-emerald-600/50 text-emerald-300 hover:bg-emerald-900/40'
                }`}
              >
                {analysisActive ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                <span>{analysisActive ? 'Pause AI Scanning' : 'Resume AI Scanning'}</span>
              </button>

              <button
                onClick={captureAndAnalyzeFrame}
                disabled={isProcessingFrame}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white text-xs font-semibold transition-colors cursor-pointer"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Instant Scan</span>
              </button>

              <button
                onClick={stopCamera}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-600/80 hover:bg-rose-500 text-white text-xs font-semibold transition-colors cursor-pointer"
              >
                <CameraOff className="w-3.5 h-3.5" />
                <span>Stop Camera</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Camera Error Message */}
      {cameraError && (
        <div className="p-4 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-200 text-sm flex items-start gap-3">
          <AlertOctagon className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <div className="space-y-1.5 flex-1">
            <p className="font-semibold text-rose-300">Camera Access Notice</p>
            <p className="text-xs text-rose-200/90 leading-relaxed">{cameraError}</p>
            <p className="text-[11px] text-rose-300/80">
              Tip: Ensure webcam permission is allowed in your browser settings. You can also test road scenarios anytime via the <strong>Image Analysis</strong> tab.
            </p>
          </div>
        </div>
      )}

      {/* Main HUD Viewport */}
      <div className="relative rounded-2xl overflow-hidden bg-slate-950 border-2 border-slate-800 shadow-2xl">
        {/* Siren Active Flashing Red Beacon Strobe Overlay */}
        {sirenActive && (
          <div className="absolute inset-0 pointer-events-none z-30 border-4 border-rose-600 animate-pulse shadow-[inset_0_0_60px_rgba(225,29,72,0.85)] flex items-start justify-center pt-4">
            <div className="px-4 py-1.5 rounded-full bg-rose-600/95 text-white font-mono font-extrabold text-xs tracking-wider border-2 border-white shadow-2xl flex items-center gap-2 animate-bounce backdrop-blur-md">
              <Siren className="w-4 h-4 text-white animate-spin" />
              <span>🚨 ALERT SIREN SOUNDING • ತುರ್ತು ಸೈರನ್ ಮೊಳಗುತ್ತಿದೆ 🚨</span>
            </div>
          </div>
        )}

        {/* Urgent High Danger Flashing Border HUD */}
        {!sirenActive && currentHazard && currentHazard.dangerLevel === 'HIGH' && (
          <div className="absolute inset-0 pointer-events-none z-20 border-4 border-rose-500/80 animate-pulse shadow-[inset_0_0_40px_rgba(244,63,94,0.5)]" />
        )}

        {/* Medium Warning Border HUD */}
        {!sirenActive && currentHazard && currentHazard.dangerLevel === 'MEDIUM' && (
          <div className="absolute inset-0 pointer-events-none z-20 border-2 border-amber-500/60" />
        )}

        {/* Video Element */}
        <div className="relative aspect-video w-full max-h-[600px] flex items-center justify-center bg-slate-950">
          <video
            ref={videoRef}
            playsInline
            muted
            className={`w-full h-full object-cover transition-opacity duration-300 ${
              cameraActive ? 'opacity-100' : 'opacity-0'
            }`}
          />

          {/* Standby screen when camera is stopped */}
          {!cameraActive && (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center space-y-4 bg-gradient-to-b from-slate-900 via-slate-950 to-slate-950">
              <div className="w-20 h-20 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-lg shadow-cyan-500/10">
                <Camera className="w-10 h-10" />
              </div>
              <div className="space-y-1 max-w-md">
                <h3 className="text-lg font-bold text-white">Live Camera Standby</h3>
                <p className="text-xs sm:text-sm text-slate-400">
                  Click <strong>Start Live Camera</strong> to request laptop webcam access. The system captures frames every {scanInterval}s for live hazard detection.
                </p>
              </div>
              <button
                onClick={() => startCamera(selectedDeviceId)}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs sm:text-sm shadow-lg shadow-cyan-500/25 transition-transform hover:scale-105"
              >
                <Camera className="w-4 h-4" />
                <span>Initialize Camera Stream</span>
              </button>
            </div>
          )}

          {/* HUD Overlay Elements (when camera is running) */}
          {cameraActive && (
            <>
              {/* Top Left: Telemetry Data */}
              <div className="absolute top-4 left-4 z-10 flex flex-col gap-1.5 font-mono text-[11px] text-cyan-300/90 bg-slate-950/80 px-3 py-2 rounded-lg border border-cyan-500/30 backdrop-blur-md">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  <span className="font-bold text-slate-200">OPTICAL SENSOR: ONLINE</span>
                </div>
                <div className="text-slate-400 text-[10px]">
                  SCAN CYCLE: <span className="text-cyan-300 font-bold">{scanInterval}s</span> | LAST: <span className="text-slate-300">{lastAnalyzedTime || 'CALIBRATING'}</span>
                </div>
              </div>

              {/* Top Right: Sound, Voice, and Alert Siren HUD Toggles */}
              <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
                <button
                  onClick={() => audioService.toggleEmergencySiren(4.0)}
                  title={sirenActive ? 'Stop Alert Siren / ತುರ್ತು ಸೈರನ್ ನಿಲ್ಲಿಸಿ' : 'Sound Alert Siren / ತುರ್ತು ಸೈರನ್ ಮೊಳಗಿಸಿ'}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border backdrop-blur-md text-xs font-mono font-bold transition-all cursor-pointer ${
                    sirenActive
                      ? 'bg-rose-600 border-rose-400 text-white shadow-lg shadow-rose-600/70 animate-pulse'
                      : 'bg-rose-950/70 border-rose-700/60 text-rose-300 hover:bg-rose-900/80 hover:text-white'
                  }`}
                >
                  <Siren className={`w-3.5 h-3.5 ${sirenActive ? 'animate-bounce text-white' : 'text-rose-400'}`} />
                  <span className="hidden sm:inline">{sirenActive ? 'SIREN ON' : 'SIREN'}</span>
                </button>

                <button
                  onClick={() => {
                    const next = !soundEnabled;
                    setSoundEnabled(next);
                    audioService.setSoundEnabled(next);
                  }}
                  title={soundEnabled ? 'Audio ON' : 'Audio OFF'}
                  className={`p-2 rounded-lg border backdrop-blur-md transition-all cursor-pointer ${
                    soundEnabled
                      ? 'bg-emerald-950/70 border-emerald-500/50 text-emerald-300'
                      : 'bg-slate-900/80 border-slate-700 text-slate-400'
                  }`}
                >
                  {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => {
                    const next = !voiceEnabled;
                    setVoiceEnabled(next);
                    audioService.setVoiceEnabled(next);
                  }}
                  title={voiceEnabled ? 'Voice Alerts ON' : 'Voice Alerts OFF'}
                  className={`p-2 rounded-lg border backdrop-blur-md transition-all cursor-pointer ${
                    voiceEnabled
                      ? 'bg-cyan-950/70 border-cyan-500/50 text-cyan-300'
                      : 'bg-slate-900/80 border-slate-700 text-slate-400'
                  }`}
                >
                  {voiceEnabled ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
                </button>
              </div>

              {/* Center Crosshair / HUD Reticle */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                <div className="relative w-48 h-48 border border-cyan-500/20 rounded-full flex items-center justify-center">
                  <div className="absolute top-0 w-2 h-0.5 bg-cyan-400/60" />
                  <div className="absolute bottom-0 w-2 h-0.5 bg-cyan-400/60" />
                  <div className="absolute left-0 h-2 w-0.5 bg-cyan-400/60" />
                  <div className="absolute right-0 h-2 w-0.5 bg-cyan-400/60" />
                  <div className="w-2 h-2 rounded-full bg-cyan-400/40" />
                </div>
              </div>

              {/* Scanning Active Indicator Bar */}
              {isProcessingFrame && (
                <div className="absolute top-0 left-0 right-0 z-10 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent animate-pulse" />
              )}
            </>
          )}
        </div>

        {/* Bottom Real-Time Hazard Warning Ribbon */}
        {cameraActive && currentHazard && (() => {
          const loc = getLocalizedHazard(currentHazard, language);
          return (
            <div
              className={`p-4 border-t transition-colors ${
                currentHazard.dangerLevel === 'HIGH'
                  ? 'bg-rose-950/90 border-rose-600/70'
                  : currentHazard.dangerLevel === 'MEDIUM'
                  ? 'bg-amber-950/90 border-amber-600/70'
                  : 'bg-slate-900/90 border-slate-800'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start sm:items-center gap-3">
                  <div className="mt-0.5 sm:mt-0">
                    {currentHazard.dangerLevel === 'HIGH' ? (
                      <div className="w-10 h-10 rounded-xl bg-rose-600/20 border border-rose-500/50 flex items-center justify-center text-rose-400 animate-bounce">
                        <AlertOctagon className="w-6 h-6" />
                      </div>
                    ) : currentHazard.dangerLevel === 'MEDIUM' ? (
                      <div className="w-10 h-10 rounded-xl bg-amber-600/20 border border-amber-500/50 flex items-center justify-center text-amber-400">
                        <AlertTriangle className="w-6 h-6" />
                      </div>
                    ) : (
                      <div className="w-10 h-10 rounded-xl bg-emerald-600/20 border border-emerald-500/50 flex items-center justify-center text-emerald-400">
                        <ShieldCheck className="w-6 h-6" />
                      </div>
                    )}
                  </div>

                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs uppercase font-mono font-bold tracking-wider text-slate-300">
                        CURRENT PERCEPTION:
                      </span>
                      <span className="text-sm font-extrabold text-white">
                        {loc.primaryHazard}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.2 rounded-full font-mono ${
                          currentHazard.dangerLevel === 'HIGH'
                            ? 'bg-rose-500 text-white animate-pulse'
                            : currentHazard.dangerLevel === 'MEDIUM'
                            ? 'bg-amber-500 text-black'
                            : 'bg-emerald-500 text-black'
                        }`}
                      >
                        {loc.dangerBadgeText} • {currentHazard.confidence}%
                      </span>

                      {currentHazard.category === 'human' && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full font-mono bg-rose-500/30 text-rose-200 border border-rose-400/50 animate-pulse">
                          <User className="w-3 h-3 text-rose-300" />
                          HUMAN / PEDESTRIAN
                        </span>
                      )}
                      {currentHazard.category === 'animal' && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full font-mono bg-amber-500/30 text-amber-200 border border-amber-400/50 animate-pulse">
                          <PawPrint className="w-3 h-3 text-amber-300" />
                          ROAD ANIMAL
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-200">
                      <strong>Advisory:</strong> {loc.recommendation}
                    </p>
                    <div className="flex flex-wrap items-center gap-2 pt-0.5">
                      {language !== 'en' && (
                        <p className="text-[11px] text-amber-200/90 font-mono">
                          <strong>ಧ್ವನಿ ಎಚ್ಚರಿಕೆ:</strong> {loc.emergencyWarning}
                        </p>
                      )}
                      <button
                        type="button"
                        onClick={() =>
                          audioService.triggerHazardAlert(
                            currentHazard.dangerLevel,
                            currentHazard.voiceAlert,
                            currentHazard.primaryHazard,
                            currentHazard.category,
                            currentHazard.voiceAlertKn
                          )
                        }
                        className="inline-flex items-center gap-1 text-[10px] font-mono font-bold px-2.5 py-1 rounded bg-cyan-950/80 text-cyan-300 border border-cyan-800/80 hover:bg-cyan-900 transition-colors cursor-pointer"
                        title="Replay Voice Alert (ಧ್ವನಿ ಪುನರಾವರ್ತನೆ)"
                      >
                        <Volume2 className="w-3 h-3 text-cyan-400" />
                        <span>ಧ್ವನಿ ನುಡಿಸಿ (Play Voice)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => audioService.toggleEmergencySiren(3.5)}
                        className={`inline-flex items-center gap-1 text-[10px] font-mono font-bold px-2.5 py-1 rounded border transition-colors cursor-pointer ${
                          sirenActive
                            ? 'bg-rose-600 border-rose-400 text-white animate-pulse'
                            : 'bg-rose-950/80 border-rose-800 text-rose-300 hover:bg-rose-900'
                        }`}
                        title="Sound Emergency Siren / ತುರ್ತು ಸೈರನ್ ಮೊಳಗಿಸಿ"
                      >
                        <Siren className={`w-3 h-3 ${sirenActive ? 'animate-bounce text-white' : 'text-rose-400'}`} />
                        <span>{sirenActive ? 'ಸೈರನ್ ನಿಲ್ಲಿಸಿ (Stop)' : 'ಸೈರನ್ ಮೊಳಗಿಸಿ (Siren)'}</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Distance & Lane Info */}
                <div className="flex items-center gap-4 text-xs font-mono text-slate-300 self-end sm:self-center shrink-0">
                  {currentHazard.estimatedDistance && (
                    <div>
                      <span className="text-slate-400 text-[10px] block">DISTANCE</span>
                      <span className="font-bold">{currentHazard.estimatedDistance}</span>
                    </div>
                  )}
                  {currentHazard.lanePosition && (
                    <div>
                      <span className="text-slate-400 text-[10px] block">POSITION</span>
                      <span className="font-bold">{currentHazard.lanePosition}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })()}
      </div>

      {/* Camera Tuning Settings & Diagnostics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Scan Interval Selector */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 space-y-2">
          <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5 uppercase font-mono">
            <Sliders className="w-3.5 h-3.5 text-cyan-400" />
            AI Scan Interval
          </label>
          <div className="grid grid-cols-3 gap-2">
            {[2, 3, 5].map((sec) => (
              <button
                key={sec}
                onClick={() => setScanInterval(sec)}
                className={`py-2 text-xs font-mono font-bold rounded-lg border transition-all ${
                  scanInterval === sec
                    ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50'
                    : 'bg-slate-800/80 hover:bg-slate-800 text-slate-400 border-slate-700'
                }`}
              >
                {sec} Seconds
              </button>
            ))}
          </div>
          <p className="text-[11px] text-slate-500">
            Balances real-time response rate with API compute efficiency.
          </p>
        </div>

        {/* Card 2: Webcam Device Selector */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 space-y-2">
          <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5 uppercase font-mono">
            <Camera className="w-3.5 h-3.5 text-cyan-400" />
            Video Input Device
          </label>
          <select
            value={selectedDeviceId}
            onChange={(e) => {
              setSelectedDeviceId(e.target.value);
              if (cameraActive) {
                startCamera(e.target.value);
              }
            }}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
          >
            {devices.length === 0 ? (
              <option value="">Default Web Camera</option>
            ) : (
              devices.map((d, index) => (
                <option key={d.deviceId} value={d.deviceId}>
                  {d.label || `Camera ${index + 1}`}
                </option>
              ))
            )}
          </select>
          <p className="text-[11px] text-slate-500">
            Select external webcam or built-in laptop sensor.
          </p>
        </div>

        {/* Card 3: Alert Status Diagnostic */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 space-y-2">
          <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5 uppercase font-mono">
            <Activity className="w-3.5 h-3.5 text-cyan-400" />
            Alert Subsystem Status
          </label>
          <div className="space-y-1.5 text-xs">
            <div className="flex items-center justify-between text-slate-300">
              <span>Siren Tone Generator:</span>
              <span className={soundEnabled ? 'text-emerald-400 font-bold' : 'text-slate-500'}>
                {soundEnabled ? 'ARMED' : 'MUTED'}
              </span>
            </div>
            <div className="flex items-center justify-between text-slate-300">
              <span>Speech Synthesizer:</span>
              <span className={voiceEnabled ? 'text-cyan-400 font-bold' : 'text-slate-500'}>
                {voiceEnabled ? 'ARMED' : 'MUTED'}
              </span>
            </div>
          </div>
          <p className="text-[11px] text-slate-500">
            Deduplication engine active: suppresses repeated alerts for identical hazards.
          </p>
        </div>
      </div>
    </div>
  );
};

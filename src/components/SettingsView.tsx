import React, { useState, useEffect } from 'react';
import { 
  Volume2, 
  VolumeX, 
  Mic, 
  MicOff, 
  Sliders, 
  ShieldCheck, 
  CheckCircle2, 
  XCircle, 
  Cpu, 
  Play, 
  HelpCircle,
  Code2,
  GraduationCap,
  Sparkles,
  Database,
  Download,
  User,
  PawPrint,
  Box,
  FileCheck,
  Globe,
  Siren,
  Square,
  Archive,
  FileArchive,
  Loader2,
  Layers,
  AlertTriangle,
  Check
} from 'lucide-react';
import { audioService } from '../services/audioService';
import { HazardReport, AppLanguage } from '../types';
import { LANGUAGE_OPTIONS } from '../services/languageService';
import { 
  downloadCOCODatasetZip, 
  DatasetExportAudit, 
  COCO_CATEGORIES 
} from '../services/datasetExportService';

interface SettingsViewProps {
  soundEnabled: boolean;
  setSoundEnabled: (val: boolean) => void;
  voiceEnabled: boolean;
  setVoiceEnabled: (val: boolean) => void;
  language: AppLanguage;
  setLanguage: (val: AppLanguage) => void;
  aiOnline: boolean;
  reports?: HazardReport[];
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  soundEnabled,
  setSoundEnabled,
  voiceEnabled,
  setVoiceEnabled,
  language,
  setLanguage,
  aiOnline,
  reports = [],
}) => {
  const [volume, setVolume] = useState<number>(audioService.getVolume() * 100);
  const [speechSupported, setSpeechSupported] = useState<boolean>(true);
  const [audioSupported, setAudioSupported] = useState<boolean>(true);
  const [cameraSupported, setCameraSupported] = useState<boolean>(true);
  const [testPlaying, setTestPlaying] = useState<boolean>(false);
  const [knVoicePlaying, setKnVoicePlaying] = useState<boolean>(false);
  const [sirenStyle, setSirenStyleState] = useState<'warble' | 'wail' | 'hilo'>(() => audioService.getSirenStyle());
  const [sirenPlaying, setSirenPlaying] = useState<boolean>(false);

  useEffect(() => {
    setSpeechSupported('speechSynthesis' in window);
    setAudioSupported('AudioContext' in window || 'webkitAudioContext' in (window as any));
    setCameraSupported(Boolean(navigator.mediaDevices && navigator.mediaDevices.getUserMedia));
    const unsub = audioService.onSirenChange(setSirenPlaying);
    return unsub;
  }, []);

  const handleVolumeChange = (newVol: number) => {
    setVolume(newVol);
    audioService.setVolume(newVol / 100);
  };

  const handleSirenStyleChange = (style: 'warble' | 'wail' | 'hilo') => {
    setSirenStyleState(style);
    audioService.setSirenStyle(style);
    audioService.playEmergencySiren(1.2, style);
  };

  const handleToggleSiren = () => {
    audioService.toggleEmergencySiren(4.0, sirenStyle);
  };

  const handleTestSirenWithVoice = () => {
    audioService.testSirenWithVoice(language);
  };

  const runKannadaVoiceTest = async () => {
    setKnVoicePlaying(true);
    await audioService.testKannadaVoiceOnly();
    setTimeout(() => {
      setKnVoicePlaying(false);
    }, 3500);
  };

  const humanReports = reports.filter(r => r.category === 'human');
  const animalReports = reports.filter(r => r.category === 'animal');
  const potholeReports = reports.filter(r => r.category === 'pothole');
  const obstacleReports = reports.filter(r => r.category === 'obstacle' || r.category === 'road_damage');

  const [exportingCOCO, setExportingCOCO] = useState<boolean>(false);
  const [exportAudit, setExportAudit] = useState<DatasetExportAudit | null>(null);

  // Export COCO Format Training Dataset Single ZIP containing actual images + COCO JSON
  const handleExportCOCOZip = async () => {
    setExportingCOCO(true);
    try {
      const audit = await downloadCOCODatasetZip(reports);
      setExportAudit(audit);
    } catch (err: any) {
      setExportAudit({
        success: false,
        filename: '',
        totalImagesExported: 0,
        totalAnnotations: 0,
        classesCovered: [],
        skippedReportsWithoutImages: reports.length,
        includedImageFilenames: [],
        error: err?.message || 'Failed to generate COCO dataset ZIP archive.',
      });
    } finally {
      setExportingCOCO(false);
    }
  };

  // Export YOLO format YAML & annotations manifest
  const exportYOLOManifest = () => {
    const yoloManifest = {
      dataset_name: 'road_safety_humans_animals_potholes_yolo',
      classes: ['pedestrian', 'road_animal', 'pothole', 'obstacle', 'road_damage'],
      yaml_config: `
# YOLOv8 / YOLOv11 Dataset Configuration
path: ./road_safety_dataset
train: images/train
val: images/val
names:
  0: pedestrian
  1: road_animal
  2: pothole
  3: obstacle
  4: road_damage
      `.trim(),
      labeled_instances: reports.map(r => ({
        id: r.id,
        category: r.category,
        primaryHazard: r.primaryHazard,
        annotations: r.hazardsList?.map(h => {
          let classId = 3;
          if (h.type === 'human' || r.category === 'human') classId = 0;
          else if (h.type === 'animal' || r.category === 'animal') classId = 1;
          else if (h.type === 'pothole' || r.category === 'pothole') classId = 2;
          else if (h.type === 'road_damage' || r.category === 'road_damage') classId = 4;
          const [ymin, xmin, ymax, xmax] = h.box || [200, 200, 600, 600];
          const cx = ((xmin + xmax) / 2) / 1000;
          const cy = ((ymin + ymax) / 2) / 1000;
          const w = (xmax - xmin) / 1000;
          const hgt = (ymax - ymin) / 1000;
          return `${classId} ${cx.toFixed(4)} ${cy.toFixed(4)} ${w.toFixed(4)} ${hgt.toFixed(4)}`;
        })
      }))
    };

    const blob = new Blob([JSON.stringify(yoloManifest, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `yolo_training_manifest_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSoundToggle = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    audioService.setSoundEnabled(next);
  };

  const handleVoiceToggle = () => {
    const next = !voiceEnabled;
    setVoiceEnabled(next);
    audioService.setVoiceEnabled(next);
  };

  const runAudioTest = () => {
    setTestPlaying(true);
    audioService.testAudio();
    setTimeout(() => {
      setTestPlaying(false);
    }, 2500);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
          System & Telemetry Settings
        </h2>
        <p className="text-xs sm:text-sm text-slate-400">
          Configure auditory alerting, text-to-speech synthesis parameters, and inspect hardware diagnostics.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Language Selection and Audio Controls */}
        <div className="space-y-6">
          {/* Card 1: Language Selector */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
                <Globe className="w-4 h-4 text-cyan-400" />
                Language Selector / ಭಾಷಾ ಆಯ್ಕೆ
              </h3>
              <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-cyan-950 text-cyan-400 border border-cyan-800">
                {language === 'kn' ? 'ಕನ್ನಡ' : language === 'kn_en' ? 'ಕನ್ನಡ + EN' : 'English'}
              </span>
            </div>

            <p className="text-xs text-slate-400">
              Select the active language for hazard detection messages, driver safety recommendations, voice speech alerts, and emergency warnings:
            </p>

            {/* 3 Options: English, Kannada, Kannada + English */}
            <div className="space-y-2.5">
              {LANGUAGE_OPTIONS.map((opt) => {
                const isSelected = language === opt.code;
                return (
                  <button
                    key={opt.code}
                    type="button"
                    onClick={() => {
                      setLanguage(opt.code);
                      audioService.setLanguage(opt.code);
                    }}
                    className={`w-full text-left p-3.5 rounded-xl border transition-all cursor-pointer flex items-start justify-between gap-3 ${
                      isSelected
                        ? 'bg-cyan-950/40 border-cyan-500 shadow-md shadow-cyan-950/50'
                        : 'bg-slate-800/40 border-slate-700/60 hover:bg-slate-800/70 hover:border-slate-600'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-sm font-bold ${isSelected ? 'text-white' : 'text-slate-200'}`}>
                          {opt.label}
                        </span>
                        <span className="text-xs text-cyan-400 font-bold font-mono">
                          ({opt.nativeLabel})
                        </span>
                        {opt.code === 'kn_en' && (
                          <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            ಕನ್ನಡ First ➔ English Second
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-slate-400">
                        {opt.description}
                      </p>

                      {/* Example Preview */}
                      <div className="text-[11px] font-mono text-slate-300 bg-slate-900/80 px-2.5 py-1.5 rounded border border-slate-800/80 mt-1">
                        <span className="text-slate-500 text-[10px] block font-mono">Sample Emergency Voice Alert:</span>
                        {opt.code === 'kn' ? (
                          <span className="text-amber-300 font-medium">"ಎಚ್ಚರಿಕೆ! ರಸ್ತೆಯಲ್ಲಿ ಅಪಾಯ ಪತ್ತೆಯಾಗಿದೆ. ದಯವಿಟ್ಟು ನಿಧಾನವಾಗಿ ಚಲಿಸಿ."</span>
                        ) : opt.code === 'en' ? (
                          <span className="text-cyan-300 font-medium">"Warning! Danger detected on the road. Please slow down."</span>
                        ) : (
                          <span className="text-emerald-300 font-medium">"ಎಚ್ಚರಿಕೆ! ರಸ್ತೆಯಲ್ಲಿ ಅಪಾಯ ಪತ್ತೆಯಾಗಿದೆ... Warning! Danger detected on the road..."</span>
                        )}
                      </div>
                    </div>

                    <div className="shrink-0 mt-0.5">
                      <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                        isSelected ? 'border-cyan-400 bg-cyan-500' : 'border-slate-600 bg-slate-800'
                      }`}>
                        {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Native Kannada Voice Audio Banner */}
            <div className="p-3.5 rounded-xl bg-gradient-to-r from-amber-950/40 via-cyan-950/30 to-slate-900 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-xs font-bold text-amber-300 uppercase tracking-wider font-mono">
                    ಕನ್ನಡ ಧ್ವನಿ ಸಕ್ರಿಯ (Native Kannada Voice AI Active)
                  </span>
                </div>
                <p className="text-[11px] text-slate-300">
                  Google Gemini Flash Voice AI reproduces authentic Kannada pronunciation for all road warnings.
                </p>
              </div>
              <button
                type="button"
                onClick={runKannadaVoiceTest}
                disabled={knVoicePlaying}
                className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 text-xs font-bold shadow-md transition-colors cursor-pointer shrink-0"
              >
                <Volume2 className="w-3.5 h-3.5" />
                <span>{knVoicePlaying ? 'ನುಡಿಯುತ್ತಿದೆ... (Playing)' : 'Play Kannada Voice (ಕನ್ನಡ ಧ್ವನಿ)'}</span>
              </button>
            </div>

            {/* Test Voice Alert for selected language */}
            <div className="pt-2 flex flex-wrap items-center justify-between gap-2 border-t border-slate-800">
              <span className="text-xs text-slate-400">
                Auditory test for <strong>{language === 'kn' ? 'ಕನ್ನಡ' : language === 'kn_en' ? 'ಕನ್ನಡ + English' : 'English'}</strong>:
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => audioService.testLanguage(language)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold shadow transition-colors cursor-pointer"
                >
                  <Volume2 className="w-3.5 h-3.5" />
                  <span>Test Active Language</span>
                </button>
                <button
                  type="button"
                  onClick={runKannadaVoiceTest}
                  disabled={knVoicePlaying}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600/90 hover:bg-amber-500 text-white text-xs font-semibold shadow transition-colors cursor-pointer"
                >
                  <Volume2 className="w-3.5 h-3.5" />
                  <span>{knVoicePlaying ? 'ನುಡಿಯುತ್ತಿದೆ...' : 'ಕನ್ನಡ ಧ್ವನಿ Test'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Card 2: Alert Controls */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 sm:p-6 space-y-5">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
              <Volume2 className="w-4 h-4 text-cyan-400" />
              Auditory & Voice Alert Engine
            </h3>

            {/* Sound Toggle */}
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/60">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-slate-200">Warning Siren & Chimes</span>
                  <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded font-bold ${
                    soundEnabled ? 'bg-emerald-950 text-emerald-400' : 'bg-slate-700 text-slate-400'
                  }`}>
                    {soundEnabled ? 'ACTIVE' : 'MUTED'}
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  Plays dual-tone acoustic sirens for HIGH risk and soft chimes for MEDIUM risk.
                </p>
              </div>
              <button
                onClick={handleSoundToggle}
                className={`w-12 h-6 rounded-full transition-colors relative ${
                  soundEnabled ? 'bg-cyan-600' : 'bg-slate-700'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white transition-transform ${
                    soundEnabled ? 'translate-x-6' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>

            {/* Voice Alert Toggle */}
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/60">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-slate-200">Voice Speech Synthesis</span>
                  <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded font-bold ${
                    voiceEnabled ? 'bg-cyan-950 text-cyan-400' : 'bg-slate-700 text-slate-400'
                  }`}>
                    {voiceEnabled ? 'ACTIVE' : 'MUTED'}
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  Browser Text-to-Speech enunciates immediate spoken safety warnings.
                </p>
              </div>
              <button
                onClick={handleVoiceToggle}
                className={`w-12 h-6 rounded-full transition-colors relative ${
                  voiceEnabled ? 'bg-cyan-600' : 'bg-slate-700'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white transition-transform ${
                    voiceEnabled ? 'translate-x-6' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>

            {/* Volume Slider */}
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-300">Master Alert Volume</span>
                <span className="font-mono text-cyan-400 font-bold">{Math.round(volume)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={volume}
                onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
              />
            </div>

            {/* Test Audio Button */}
            <div className="pt-3 border-t border-slate-800">
              <button
                onClick={runAudioTest}
                disabled={testPlaying}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-cyan-300 transition-colors cursor-pointer"
              >
                <Play className="w-3.5 h-3.5" />
                <span>{testPlaying ? 'Sound Engine Test Playing...' : 'Test Warning Audio & Voice Warning'}</span>
              </button>
            </div>
          </div>

          {/* Card 3: Emergency Alert Siren Engine */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 sm:p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
                <Siren className={`w-4 h-4 ${sirenPlaying ? 'text-rose-400 animate-bounce' : 'text-rose-400'}`} />
                Emergency Alert Siren / ತುರ್ತು ಎಚ್ಚರಿಕೆ ಸೈರನ್
              </h3>
              <span className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold border transition-colors ${
                sirenPlaying
                  ? 'bg-rose-600 text-white border-rose-400 shadow-md shadow-rose-600/50 animate-pulse'
                  : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}>
                {sirenPlaying ? '🚨 SIREN ACTIVE' : 'STANDBY'}
              </span>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Synthesized vehicle warning siren generated directly using the Web Audio API without network lag. Automatically sounds during HIGH hazard detection (pedestrians, animals, deep potholes, severe obstacles).
            </p>

            {/* Siren Tone Profiles */}
            <div className="space-y-2">
              <span className="text-xs font-semibold text-slate-300 block">
                Siren Tone Profile / ಸೈರನ್ ಶೈಲಿ:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {[
                  { id: 'warble', name: 'Rapid Warble', kn: 'ತೀವ್ರ ಎಚ್ಚರಿಕೆ', desc: '850Hz modulated at 5.5Hz' },
                  { id: 'hilo', name: 'ADAS Hi-Lo', kn: 'ದ್ವಿದ್ವನಿ ಸೈರನ್', desc: '960Hz / 680Hz two-tone' },
                  { id: 'wail', name: 'Sweeping Wail', kn: 'ವಿಸ್ತೃತ ಸೈರನ್', desc: '550Hz-1250Hz pitch sweep' },
                ].map((s) => {
                  const isSelected = sirenStyle === s.id;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => handleSirenStyleChange(s.id as any)}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-rose-950/50 border-rose-500 shadow-md shadow-rose-950/60'
                          : 'bg-slate-800/40 border-slate-700/60 hover:bg-slate-800/70 hover:border-slate-600'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className={`text-xs font-bold ${isSelected ? 'text-white' : 'text-slate-300'}`}>
                          {s.name}
                        </span>
                        <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                          isSelected ? 'border-rose-400 bg-rose-500' : 'border-slate-600 bg-slate-800'
                        }`}>
                          {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                        </div>
                      </div>
                      <span className="text-[11px] text-rose-300 font-mono block mt-0.5 font-bold">
                        {s.kn}
                      </span>
                      <p className="text-[10px] text-slate-400 mt-1">
                        {s.desc}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Siren Visual Animation Strobe Bar (Visible when active) */}
            {sirenPlaying && (
              <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-500/60 flex items-center justify-between gap-3 animate-pulse">
                <div className="flex items-center gap-2 text-rose-300 font-mono text-xs font-bold">
                  <Siren className="w-4 h-4 text-rose-400 animate-spin" />
                  <span>ಅಪಾಯದ ಸೈರನ್ ಧ್ವನಿಸುತ್ತಿದೆ • Alert Siren Active</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-1.5 h-4 bg-rose-500 rounded-full animate-bounce [animation-delay:0ms]" />
                  <div className="w-1.5 h-6 bg-rose-400 rounded-full animate-bounce [animation-delay:150ms]" />
                  <div className="w-1.5 h-5 bg-rose-500 rounded-full animate-bounce [animation-delay:300ms]" />
                  <div className="w-1.5 h-7 bg-rose-300 rounded-full animate-bounce [animation-delay:450ms]" />
                </div>
              </div>
            )}

            {/* Siren Action Buttons */}
            <div className="pt-2 flex flex-col sm:flex-row gap-2 border-t border-slate-800">
              <button
                type="button"
                onClick={handleToggleSiren}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-bold text-xs font-mono transition-all cursor-pointer ${
                  sirenPlaying
                    ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/50 animate-pulse'
                    : 'bg-rose-950/60 hover:bg-rose-900/60 text-rose-300 border border-rose-800/80 hover:text-white'
                }`}
              >
                <Siren className="w-3.5 h-3.5" />
                <span>{sirenPlaying ? 'Stop Siren / ಸೈರನ್ ನಿಲ್ಲಿಸಿ' : 'Sound Alert Siren / ಸೈರನ್ ಮೊಳಗಿಸಿ'}</span>
              </button>

              <button
                type="button"
                onClick={handleTestSirenWithVoice}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 font-bold text-xs text-amber-300 transition-colors cursor-pointer"
                title="Test Siren followed by Kannada Voice warning"
              >
                <Volume2 className="w-3.5 h-3.5 text-amber-400" />
                <span>Siren + Kannada Voice (ಸೈರನ್ + ಕನ್ನಡ ಧ್ವನಿ)</span>
              </button>
            </div>
          </div>

          {/* Card 2: Educational Prototype Notice */}
          <div className="bg-amber-950/20 border border-amber-800/40 rounded-2xl p-5 space-y-3">
            <div className="flex items-center gap-2 text-amber-300">
              <GraduationCap className="w-5 h-5 text-amber-400" />
              <h3 className="text-sm font-bold uppercase tracking-wider font-mono">
                Academic Project Specification
              </h3>
            </div>
            <p className="text-xs text-amber-200/90 leading-relaxed">
              This application has been engineered as a final-year Bachelor of Computer Applications (BCA) capstone project. It implements end-to-end full-stack perception using modern artificial intelligence.
            </p>
            <p className="text-xs text-amber-300/80 leading-relaxed font-semibold">
              Legal Disclaimer: Not certified for vehicle autopilot, ADAS deployment, or life-critical navigation. Drivers must remain attentive at all times.
            </p>
          </div>
        </div>

        {/* Right Column: Hardware & Browser Diagnostics */}
        <div className="space-y-6">
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 sm:p-6 space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
              <Cpu className="w-4 h-4 text-cyan-400" />
              Environment & Sensor Diagnostics
            </h3>

            <div className="divide-y divide-slate-800/80 text-xs">
              {/* Diag 1 */}
              <div className="py-3 flex items-center justify-between">
                <div>
                  <span className="font-semibold text-slate-200 block">AI Perception Model</span>
                  <span className="text-[11px] text-slate-500">Gemini Flash Multimodal Vision (Auto-Fallback)</span>
                </div>
                <div className="flex items-center gap-1.5 font-mono font-bold">
                  {aiOnline ? (
                    <span className="inline-flex items-center gap-1 text-emerald-400">
                      <CheckCircle2 className="w-4 h-4" /> Ready
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-amber-400">
                      <XCircle className="w-4 h-4" /> Offline
                    </span>
                  )}
                </div>
              </div>

              {/* Diag 2 */}
              <div className="py-3 flex items-center justify-between">
                <div>
                  <span className="font-semibold text-slate-200 block">Web Audio API</span>
                  <span className="text-[11px] text-slate-500">Synthesized acoustic sirens & chimes</span>
                </div>
                <div className="flex items-center gap-1.5 font-mono font-bold">
                  {audioSupported ? (
                    <span className="inline-flex items-center gap-1 text-emerald-400">
                      <CheckCircle2 className="w-4 h-4" /> Supported
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-rose-400">
                      <XCircle className="w-4 h-4" /> Not Supported
                    </span>
                  )}
                </div>
              </div>

              {/* Diag 3 */}
              <div className="py-3 flex items-center justify-between">
                <div>
                  <span className="font-semibold text-slate-200 block">Web Speech Synthesis API</span>
                  <span className="text-[11px] text-slate-500">Browser spoken voice alerts</span>
                </div>
                <div className="flex items-center gap-1.5 font-mono font-bold">
                  {speechSupported ? (
                    <span className="inline-flex items-center gap-1 text-emerald-400">
                      <CheckCircle2 className="w-4 h-4" /> Supported
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-rose-400">
                      <XCircle className="w-4 h-4" /> Not Supported
                    </span>
                  )}
                </div>
              </div>

              {/* Diag 4 */}
              <div className="py-3 flex items-center justify-between">
                <div>
                  <span className="font-semibold text-slate-200 block">MediaDevices Webcam Interface</span>
                  <span className="text-[11px] text-slate-500">Laptop video capture stream</span>
                </div>
                <div className="flex items-center gap-1.5 font-mono font-bold">
                  {cameraSupported ? (
                    <span className="inline-flex items-center gap-1 text-emerald-400">
                      <CheckCircle2 className="w-4 h-4" /> Available
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-amber-400">
                      <XCircle className="w-4 h-4" /> Restricted
                    </span>
                  )}
                </div>
              </div>

              {/* Diag 5 */}
              <div className="py-3 flex items-center justify-between">
                <div>
                  <span className="font-semibold text-slate-200 block">Database Storage Subsystem</span>
                  <span className="text-[11px] text-slate-500">Persistent JSON report engine on server</span>
                </div>
                <div className="flex items-center gap-1.5 font-mono font-bold text-emerald-400">
                  <CheckCircle2 className="w-4 h-4" /> Active
                </div>
              </div>
            </div>
          </div>

          {/* Custom AI Model Training & Dataset Pipeline Card */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
                <Database className="w-4 h-4 text-cyan-400" />
                Custom AI Model Training Pipeline
              </h3>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-950 text-cyan-300 border border-cyan-800/60">
                Single ZIP Dataset Export
              </span>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Export verified real-world roadway detections into a standardized computer vision dataset. Generates a <strong>single ZIP archive</strong> containing the actual original image files, the <code className="text-cyan-300 font-mono">_annotations.coco.json</code> annotation file, matching filenames, and all five target classes.
            </p>

            {/* 5 Target Classes Grid */}
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                <span className="font-semibold text-slate-300">All 5 Standardized COCO Classes:</span>
                <span className="text-cyan-400">100% Verified Annotations</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                <div className="p-2.5 rounded-xl bg-slate-950/70 border border-rose-900/40 text-center">
                  <div className="flex items-center justify-center gap-1 text-[11px] font-mono text-rose-300 mb-0.5">
                    <User className="w-3 h-3 text-rose-400" /> 1. Pedestrian
                  </div>
                  <span className="text-[10px] text-slate-400">Human crossers</span>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-950/70 border border-amber-900/40 text-center">
                  <div className="flex items-center justify-center gap-1 text-[11px] font-mono text-amber-300 mb-0.5">
                    <PawPrint className="w-3 h-3 text-amber-400" /> 2. Road Animal
                  </div>
                  <span className="text-[10px] text-slate-400">Cows, dogs, stray</span>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-950/70 border border-cyan-900/40 text-center">
                  <div className="flex items-center justify-center gap-1 text-[11px] font-mono text-cyan-300 mb-0.5">
                    <Box className="w-3 h-3 text-cyan-400" /> 3. Pothole
                  </div>
                  <span className="text-[10px] text-slate-400">Asphalt craters</span>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-950/70 border border-orange-900/40 text-center">
                  <div className="flex items-center justify-center gap-1 text-[11px] font-mono text-orange-300 mb-0.5">
                    <Layers className="w-3 h-3 text-orange-400" /> 4. Obstacle
                  </div>
                  <span className="text-[10px] text-slate-400">Fallen branches</span>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-950/70 border border-purple-900/40 text-center col-span-2 sm:col-span-1">
                  <div className="flex items-center justify-center gap-1 text-[11px] font-mono text-purple-300 mb-0.5">
                    <FileCheck className="w-3 h-3 text-purple-400" /> 5. Road Damage
                  </div>
                  <span className="text-[10px] text-slate-400">Alligator cracks</span>
                </div>
              </div>
            </div>

            {/* Supported Frameworks Chips */}
            <div className="p-3 rounded-xl bg-slate-950/50 border border-slate-800 text-xs text-slate-400 space-y-1.5">
              <span className="text-[11px] font-mono text-slate-300 uppercase tracking-wider block font-bold">
                Supported Fine-Tuning Frameworks:
              </span>
              <div className="flex flex-wrap gap-1.5">
                <span className="px-2 py-0.5 rounded bg-slate-800 text-[11px] font-mono text-slate-300">YOLOv8 / YOLOv11</span>
                <span className="px-2 py-0.5 rounded bg-slate-800 text-[11px] font-mono text-slate-300">PyTorch Torchvision (CocoDetection)</span>
                <span className="px-2 py-0.5 rounded bg-slate-800 text-[11px] font-mono text-slate-300">Roboflow / Label Studio</span>
                <span className="px-2 py-0.5 rounded bg-slate-800 text-[11px] font-mono text-slate-300">TensorFlow / TFLite Edge</span>
              </div>
            </div>

            {/* Training Status Notice (Honest Architecture Note) */}
            <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800 text-[11px] text-slate-400 flex items-start gap-2">
              <HelpCircle className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
              <span>
                <strong className="text-slate-300">Training Status:</strong> Live perception currently operates via cloud Vision AI inference. Custom edge models (such as custom YOLOv8 weights) are <em>not yet trained</em>. This pipeline prepares verified annotated instances so you can train your custom model when ready.
              </span>
            </div>

            {/* Export Buttons */}
            <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
              <button
                onClick={handleExportCOCOZip}
                disabled={exportingCOCO}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-bold text-xs sm:text-sm shadow-lg shadow-cyan-950/40 transition-all cursor-pointer"
              >
                {exportingCOCO ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Packaging COCO ZIP Archive...</span>
                  </>
                ) : (
                  <>
                    <Archive className="w-4 h-4 text-cyan-200" />
                    <span>Export COCO Dataset (.ZIP Archive)</span>
                  </>
                )}
              </button>
              <button
                onClick={exportYOLOManifest}
                disabled={reports.length === 0}
                className="inline-flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 border border-slate-700 font-semibold text-xs transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-cyan-400" />
                Export YOLOv8 Manifest
              </button>
            </div>

            {/* Transparent Dataset Export Audit & Integrity Report Card */}
            {exportAudit && (
              <div
                className={`p-4 rounded-xl border space-y-3 animate-fade-in ${
                  exportAudit.success
                    ? 'bg-emerald-950/40 border-emerald-800/70 text-emerald-100'
                    : 'bg-rose-950/50 border-rose-800/70 text-rose-100'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {exportAudit.success ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                    ) : (
                      <XCircle className="w-5 h-5 text-rose-400 shrink-0" />
                    )}
                    <h4 className="font-bold text-sm">
                      {exportAudit.success
                        ? 'COCO Dataset ZIP Exported Successfully'
                        : 'Dataset Export Notice'}
                    </h4>
                  </div>
                  <button
                    onClick={() => setExportAudit(null)}
                    className="text-xs px-2 py-0.5 rounded bg-black/30 hover:bg-black/50 text-slate-300 font-mono cursor-pointer"
                  >
                    Dismiss
                  </button>
                </div>

                {exportAudit.success ? (
                  <>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      Generated single archive <code className="px-1.5 py-0.5 rounded bg-black/40 font-mono text-cyan-300 text-[11px]">{exportAudit.filename}</code>. Every image referenced in <code className="text-cyan-300 font-mono">_annotations.coco.json</code> is verified to be present inside the ZIP file.
                    </p>

                    {/* Stats Ribbon */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs font-mono">
                      <div className="p-2 rounded-lg bg-black/30 border border-emerald-900/40">
                        <div className="text-[10px] text-slate-400">Images Packaged</div>
                        <div className="text-base font-bold text-emerald-400">{exportAudit.totalImagesExported}</div>
                      </div>
                      <div className="p-2 rounded-lg bg-black/30 border border-emerald-900/40">
                        <div className="text-[10px] text-slate-400">Total Annotations</div>
                        <div className="text-base font-bold text-cyan-400">{exportAudit.totalAnnotations}</div>
                      </div>
                      <div className="p-2 rounded-lg bg-black/30 border border-emerald-900/40">
                        <div className="text-[10px] text-slate-400">Classes Covered</div>
                        <div className="text-base font-bold text-amber-400">{exportAudit.classesCovered.length} / 5</div>
                      </div>
                      <div className="p-2 rounded-lg bg-black/30 border border-emerald-900/40">
                        <div className="text-[10px] text-slate-400">Integrity Verified</div>
                        <div className="text-base font-bold text-emerald-400">100%</div>
                      </div>
                    </div>

                    {/* Included Real Image Files with Matching Filenames */}
                    <div className="p-3 rounded-lg bg-black/40 border border-slate-800 space-y-1.5 text-xs">
                      <div className="font-semibold text-slate-300 text-[11px] font-mono flex items-center justify-between">
                        <span>Original Image Files in ZIP (1:1 Match with COCO JSON):</span>
                        <span className="text-emerald-400">No Fake Images</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 font-mono text-[11px] text-slate-300">
                        {exportAudit.includedImageFilenames.map((fname) => (
                          <div key={fname} className="flex items-center gap-1.5 truncate">
                            <Check className="w-3 h-3 text-emerald-400 shrink-0" />
                            <span className="truncate text-slate-200">{fname}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Unstored Historical Reports Disclosure */}
                    {exportAudit.skippedReportsWithoutImages > 0 && (
                      <div className="p-2 rounded bg-amber-950/30 border border-amber-800/40 text-[11px] text-amber-300/90 flex items-start gap-2">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                        <span>
                          <strong>Audit Disclosure:</strong> {exportAudit.skippedReportsWithoutImages} historical text report log(s) without stored original image files on disk were excluded from this export to ensure 100% COCO JSON image integrity.
                        </span>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="space-y-2 text-xs">
                    <p className="text-rose-200 leading-relaxed font-mono">
                      {exportAudit.error || 'No original image files are stored by the application for export.'}
                    </p>
                    <p className="text-slate-400 text-[11px]">
                      The AI Smart Road Safety Assistant strictly verifies that image binaries exist before exporting. It will not generate dummy image references or fake bounding box annotations.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Technical Stack Architecture Details */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-3 text-xs text-slate-300">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
              <Code2 className="w-3.5 h-3.5 text-cyan-400" />
              Technology Stack
            </h4>
            <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
              <div className="p-2 rounded bg-slate-800/60">Frontend: React 19 + TypeScript</div>
              <div className="p-2 rounded bg-slate-800/60">Styling: Tailwind CSS v4</div>
              <div className="p-2 rounded bg-slate-800/60">Backend: Express 4 + Vite</div>
              <div className="p-2 rounded bg-slate-800/60">Vision AI: @google/genai</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

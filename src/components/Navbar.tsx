import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, 
  LayoutDashboard, 
  Image as ImageIcon, 
  Camera, 
  FileText, 
  Settings, 
  Volume2, 
  VolumeX, 
  Mic, 
  MicOff,
  Cpu,
  Siren
} from 'lucide-react';
import { audioService } from '../services/audioService';
import { AppLanguage } from '../types';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  soundEnabled: boolean;
  setSoundEnabled: (enabled: boolean) => void;
  voiceEnabled: boolean;
  setVoiceEnabled: (enabled: boolean) => void;
  reportsCount: number;
  aiOnline: boolean;
  language?: AppLanguage;
  setLanguage?: (lang: AppLanguage) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  soundEnabled,
  setSoundEnabled,
  voiceEnabled,
  setVoiceEnabled,
  reportsCount,
  aiOnline,
  language = 'en',
  setLanguage,
}) => {
  const [sirenActive, setSirenActive] = useState<boolean>(false);

  useEffect(() => {
    const unsub = audioService.onSirenChange((active) => {
      setSirenActive(active);
    });
    return unsub;
  }, []);

  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    audioService.setSoundEnabled(next);
    if (next) audioService.playSafeChime();
  };

  const toggleVoice = () => {
    const next = !voiceEnabled;
    setVoiceEnabled(next);
    audioService.setVoiceEnabled(next);
    if (next) audioService.speakVoiceAlert('Voice alerts active', true);
  };

  const toggleSiren = () => {
    audioService.toggleEmergencySiren(3.5);
  };

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'image-analysis', label: 'Image Analysis', icon: ImageIcon },
    { id: 'live-camera', label: 'Live Camera', icon: Camera, badge: 'Real-Time' },
    { id: 'hazard-report', label: 'Hazard Report', icon: FileText, count: reportsCount },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <header className="bg-slate-900/90 border-b border-slate-800 sticky top-0 z-40 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand */}
          <div 
            onClick={() => setActiveTab('dashboard')} 
            className="flex items-center gap-3 cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 to-emerald-500 flex items-center justify-center shadow-lg shadow-cyan-500/20 group-hover:scale-105 transition-transform">
              <ShieldAlert className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-sm sm:text-base tracking-wide text-white uppercase font-mono">
                  RoadSafety<span className="text-cyan-400">.AI</span>
                </span>
                <span className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-cyan-950 text-cyan-300 border border-cyan-800">
                  BCA Project
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                AI Smart Road Safety Assistant
              </p>
            </div>
          </div>

          {/* Navigation Tabs (Desktop) */}
          <nav className="hidden md:flex items-center space-x-1 lg:space-x-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs lg:text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 shadow-sm'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-cyan-400' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                  {item.badge && (
                    <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 animate-pulse">
                      {item.badge}
                    </span>
                  )}
                  {typeof item.count === 'number' && item.count > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                      {item.count}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Quick Controls & Status */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* AI Status Pill */}
            <div 
              title={aiOnline ? 'Gemini Flash Multimodal Vision Ready (Auto-Fallback Enabled)' : 'AI Offline'}
              className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono bg-slate-800/80 border border-slate-700/80 text-slate-300"
            >
              <Cpu className="w-3.5 h-3.5 text-cyan-400" />
              <span className="text-[11px] text-slate-400">AI:</span>
              <span className={`w-2 h-2 rounded-full ${aiOnline ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`} />
              <span className="text-[11px] font-semibold text-slate-200">
                {aiOnline ? 'Online' : 'Offline'}
              </span>
            </div>

            {/* Language Selector Dropdown */}
            {setLanguage && (
              <div className="relative">
                <select
                  value={language}
                  onChange={(e) => {
                    const l = e.target.value as AppLanguage;
                    setLanguage(l);
                    audioService.setLanguage(l);
                  }}
                  className="bg-slate-800/90 border border-slate-700 hover:border-cyan-500 rounded-lg px-2 sm:px-2.5 py-1.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-cyan-500 cursor-pointer transition-colors"
                  title="Select Alert & Voice Language / ಭಾಷೆ ಆಯ್ಕೆಮಾಡಿ"
                >
                  <option value="en">English</option>
                  <option value="kn">ಕನ್ನಡ (Kannada)</option>
                  <option value="kn_en">ಕನ್ನಡ + English</option>
                </select>
              </div>
            )}

            {/* Alert Siren Trigger Button */}
            <button
              onClick={toggleSiren}
              title={sirenActive ? 'Stop Emergency Siren / ತುರ್ತು ಸೈರನ್ ನಿಲ್ಲಿಸಿ' : 'Sound Emergency Alert Siren / ಅಪಾಯಕಾರಿ ಸೈರನ್ ಮೊಳಗಿಸಿ'}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-mono font-bold transition-all cursor-pointer ${
                sirenActive
                  ? 'bg-rose-600 text-white border-rose-400 shadow-lg shadow-rose-600/50 animate-pulse'
                  : 'bg-rose-950/40 border-rose-800/60 text-rose-300 hover:bg-rose-900/60 hover:text-white'
              }`}
            >
              <Siren className={`w-3.5 h-3.5 ${sirenActive ? 'animate-bounce text-white' : 'text-rose-400'}`} />
              <span className="hidden sm:inline">{sirenActive ? '🚨 Siren Active' : 'Alert Siren'}</span>
              <span className="text-[10px] hidden xl:inline opacity-80">({sirenActive ? 'ನಿಲ್ಲಿಸಿ' : 'ಸೈರನ್'})</span>
            </button>

            {/* Sound Toggle Button */}
            <button
              onClick={toggleSound}
              title={soundEnabled ? 'Warning Audio: ON (Click to mute)' : 'Warning Audio: OFF'}
              className={`p-2 rounded-lg border transition-all ${
                soundEnabled
                  ? 'bg-emerald-950/40 border-emerald-600/40 text-emerald-400 hover:bg-emerald-900/50'
                  : 'bg-slate-800/80 border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              }`}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

            {/* Voice Alert Toggle Button */}
            <button
              onClick={toggleVoice}
              title={voiceEnabled ? 'Voice Alerts: ON (Click to mute)' : 'Voice Alerts: OFF'}
              className={`p-2 rounded-lg border transition-all ${
                voiceEnabled
                  ? 'bg-cyan-950/40 border-cyan-600/40 text-cyan-400 hover:bg-cyan-900/50'
                  : 'bg-slate-800/80 border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              }`}
            >
              {voiceEnabled ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Row */}
        <div className="flex md:hidden overflow-x-auto py-2 border-t border-slate-800 space-x-1 scrollbar-none">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{item.label}</span>
                {typeof item.count === 'number' && item.count > 0 && (
                  <span className="text-[10px] px-1 bg-slate-800 rounded font-mono">
                    {item.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};

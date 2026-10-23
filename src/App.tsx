/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Navbar } from './components/Navbar';
import { EducationalBanner } from './components/EducationalBanner';
import { DashboardView } from './components/DashboardView';
import { ImageAnalysisView } from './components/ImageAnalysisView';
import { LiveCameraView } from './components/LiveCameraView';
import { HazardReportView } from './components/HazardReportView';
import { SettingsView } from './components/SettingsView';
import { RoadAnalysisResult, SystemStatus, HazardReport, AppLanguage } from './types';
import { audioService } from './services/audioService';
import { getLocalizedHazard } from './services/languageService';
import { AlertOctagon, X, Volume2 } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [reports, setReports] = useState<HazardReport[]>([]);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(audioService.isSoundEnabled());
  const [voiceEnabled, setVoiceEnabled] = useState<boolean>(audioService.isVoiceEnabled());
  const [language, setLanguageState] = useState<AppLanguage>(() => audioService.getLanguage());
  const [aiOnline, setAiOnline] = useState<boolean>(true);
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [activeHighAlert, setActiveHighAlert] = useState<RoadAnalysisResult | null>(null);

  const handleSetLanguage = (lang: AppLanguage) => {
    setLanguageState(lang);
    audioService.setLanguage(lang);
  };

  // Fetch reports from backend database
  const fetchReports = useCallback(async () => {
    try {
      const res = await fetch('/api/reports');
      if (res.ok) {
        const data = await res.json();
        if (data.reports) {
          setReports(data.reports);
        }
      }
    } catch (err) {
      console.warn('Failed to fetch reports from server:', err);
    }
  }, []);

  // Check system status
  const checkStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/status');
      if (res.ok) {
        const data = await res.json();
        setSystemStatus(data);
        setAiOnline(data.apiKeyConfigured);
      }
    } catch (err) {
      console.warn('Failed to check API status:', err);
    }
  }, []);

  useEffect(() => {
    fetchReports();
    checkStatus();
  }, [fetchReports, checkStatus]);

  // Handle new report generated from Image Analysis or Live Camera
  const handleReportGenerated = (newReport: RoadAnalysisResult) => {
    setReports((prev) => {
      // Check if already in list
      const exists = prev.some((r) => r.id === newReport.id);
      if (exists) return prev;
      return [newReport as HazardReport, ...prev].slice(0, 100);
    });

    // If HIGH risk, trigger global high risk toast banner
    if (newReport.dangerLevel === 'HIGH') {
      setActiveHighAlert(newReport);
      // Auto dismiss after 7 seconds
      setTimeout(() => {
        setActiveHighAlert((curr) => (curr?.id === newReport.id ? null : curr));
      }, 7000);
    }
  };

  // Clear all reports
  const handleClearReports = async () => {
    try {
      await fetch('/api/reports', { method: 'DELETE' });
      setReports([]);
    } catch (err) {
      console.error('Failed to clear reports:', err);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-cyan-500 selection:text-black">
      {/* Educational Prototype Disclaimer */}
      <EducationalBanner />

      {/* Main Navigation Bar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        soundEnabled={soundEnabled}
        setSoundEnabled={setSoundEnabled}
        voiceEnabled={voiceEnabled}
        setVoiceEnabled={setVoiceEnabled}
        reportsCount={reports.length}
        aiOnline={aiOnline}
        language={language}
        setLanguage={handleSetLanguage}
      />

      {/* Floating High Hazard Emergency Banner */}
      {activeHighAlert && (() => {
        const localized = getLocalizedHazard(activeHighAlert, language);
        return (
          <div className="fixed top-20 right-4 left-4 sm:left-auto sm:w-96 z-50 animate-bounce">
            <div className="p-4 rounded-2xl bg-rose-600 text-white shadow-2xl shadow-rose-900/80 border-2 border-rose-300 flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <AlertOctagon className="w-6 h-6 shrink-0 mt-0.5 animate-pulse" />
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold uppercase tracking-wider bg-rose-900/60 px-2 py-0.5 rounded">
                      {localized.dangerBadgeText}
                    </span>
                  </div>
                  <h4 className="font-extrabold text-sm leading-snug">
                    {localized.primaryHazard}
                  </h4>
                  <p className="text-xs text-rose-100 font-medium">
                    {localized.recommendation}
                  </p>
                  <p className="text-[11px] text-rose-200/90 font-mono italic">
                    {localized.emergencyWarning}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setActiveHighAlert(null)}
                className="text-rose-200 hover:text-white p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        );
      })()}

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {activeTab === 'dashboard' && (
          <DashboardView
            reports={reports}
            setActiveTab={setActiveTab}
            aiOnline={aiOnline}
            language={language}
          />
        )}

        {activeTab === 'image-analysis' && (
          <ImageAnalysisView
            onReportGenerated={handleReportGenerated}
            soundEnabled={soundEnabled}
            voiceEnabled={voiceEnabled}
            language={language}
          />
        )}

        {activeTab === 'live-camera' && (
          <LiveCameraView
            onReportGenerated={handleReportGenerated}
            soundEnabled={soundEnabled}
            setSoundEnabled={setSoundEnabled}
            voiceEnabled={voiceEnabled}
            setVoiceEnabled={setVoiceEnabled}
            language={language}
          />
        )}

        {activeTab === 'hazard-report' && (
          <HazardReportView
            reports={reports}
            onClearReports={handleClearReports}
            language={language}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsView
            soundEnabled={soundEnabled}
            setSoundEnabled={setSoundEnabled}
            voiceEnabled={voiceEnabled}
            setVoiceEnabled={setVoiceEnabled}
            language={language}
            setLanguage={handleSetLanguage}
            aiOnline={aiOnline}
            reports={reports}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-slate-900/60 border-t border-slate-800/80 py-6 mt-12 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400" />
            <span className="font-semibold text-slate-300">
              AI Smart Road Safety Assistant
            </span>
            <span>•</span>
            <span>Final Year BCA Capstone Project</span>
          </div>

          <div className="flex items-center gap-4 text-[11px] font-mono">
            <span>Vision Engine: Gemini Flash Multimodal Vision</span>
            <span>•</span>
            <span>Audio: Web Audio + Speech API</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

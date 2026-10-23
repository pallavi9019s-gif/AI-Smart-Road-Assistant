import { AppLanguage, DangerLevel, HazardCategory } from '../types';
import { getKannadaTranslation, getKannadaPhonetic } from './languageService';

/**
 * Real-time Audio and Web Speech synthesizer service for Road Safety alerts.
 * Uses Web Audio API for zero-dependency reliable sirens/chimes,
 * Google Gemini Flash TTS for crystal-clear native Kannada & English voice audio,
 * and browser SpeechSynthesis API with phonetic fallbacks.
 */

class AudioService {
  private audioCtx: AudioContext | null = null;
  private soundEnabled: boolean = true;
  private voiceEnabled: boolean = true;
  private volume: number = 0.8;
  private language: AppLanguage = 'en';
  private lastSpokenText: string = '';
  private lastAlertTimestamp: number = 0;
  private minRepeatIntervalMs: number = 8000; // 8 seconds cooldown for repeating identical alerts
  private audioCache = new Map<string, string>();
  private activeAudio: HTMLAudioElement | null = null;
  private sirenStyle: 'warble' | 'wail' | 'hilo' = 'warble';
  private activeSirenNodes: { osc: OscillatorNode; gain: GainNode; lfo?: OscillatorNode }[] = [];
  private sirenPlaying: boolean = false;
  private sirenListeners: Set<(active: boolean) => void> = new Set();
  private sirenStopTimer: any = null;

  constructor() {
    // Load persisted preferences
    try {
      const savedSound = localStorage.getItem('road_safety_sound_enabled');
      if (savedSound !== null) this.soundEnabled = savedSound === 'true';

      const savedVoice = localStorage.getItem('road_safety_voice_enabled');
      if (savedVoice !== null) this.voiceEnabled = savedVoice === 'true';

      const savedVol = localStorage.getItem('road_safety_volume');
      if (savedVol !== null) this.volume = parseFloat(savedVol);

      const savedLang = localStorage.getItem('road_safety_language');
      if (savedLang === 'kn' || savedLang === 'kn_en' || savedLang === 'en') {
        this.language = savedLang;
      }

      const savedSiren = localStorage.getItem('road_safety_siren_style');
      if (savedSiren === 'warble' || savedSiren === 'wail' || savedSiren === 'hilo') {
        this.sirenStyle = savedSiren;
      }
    } catch {
      // localStorage may fail in restricted environments
    }
  }

  private getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.audioCtx) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        this.audioCtx = new AudioContextClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    return this.audioCtx;
  }

  public setSoundEnabled(enabled: boolean) {
    this.soundEnabled = enabled;
    try {
      localStorage.setItem('road_safety_sound_enabled', String(enabled));
    } catch {}
  }

  public isSoundEnabled(): boolean {
    return this.soundEnabled;
  }

  public setVoiceEnabled(enabled: boolean) {
    this.voiceEnabled = enabled;
    try {
      localStorage.setItem('road_safety_voice_enabled', String(enabled));
    } catch {}
  }

  public isVoiceEnabled(): boolean {
    return this.voiceEnabled;
  }

  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
    try {
      localStorage.setItem('road_safety_volume', String(this.volume));
    } catch {}
  }

  public getVolume(): number {
    return this.volume;
  }

  public setLanguage(lang: AppLanguage) {
    this.language = lang;
    try {
      localStorage.setItem('road_safety_language', lang);
    } catch {}
  }

  public getLanguage(): AppLanguage {
    return this.language;
  }

  public setSirenStyle(style: 'warble' | 'wail' | 'hilo') {
    this.sirenStyle = style;
    try {
      localStorage.setItem('road_safety_siren_style', style);
    } catch {}
  }

  public getSirenStyle(): 'warble' | 'wail' | 'hilo' {
    return this.sirenStyle;
  }

  public isSirenActive(): boolean {
    return this.sirenPlaying;
  }

  public onSirenChange(listener: (active: boolean) => void): () => void {
    this.sirenListeners.add(listener);
    // Immediately notify current status
    listener(this.sirenPlaying);
    return () => this.sirenListeners.delete(listener);
  }

  private notifySirenChange(active: boolean) {
    this.sirenPlaying = active;
    this.sirenListeners.forEach((fn) => {
      try {
        fn(active);
      } catch (err) {
        console.warn('Siren listener callback error:', err);
      }
    });
  }

  /**
   * Toggles emergency siren on/off. Returns current active status.
   */
  public toggleEmergencySiren(duration: number = 3.0, style?: 'warble' | 'wail' | 'hilo'): boolean {
    if (this.sirenPlaying) {
      this.stopSiren();
      return false;
    } else {
      this.playEmergencySiren(duration, style);
      return true;
    }
  }

  /**
   * Powerful Emergency Alert Siren generator using Web Audio API.
   * Generates authentic vehicle/hazard sirens:
   *  - 'warble': Rapid emergency alert warble (850Hz carrier modulated at 5.5Hz)
   *  - 'hilo': European/ADAS dual-tone alternating siren (960Hz / 680Hz)
   *  - 'wail': Sweeping pitch siren rising and falling smoothly (550Hz - 1250Hz)
   */
  public playEmergencySiren(duration: number = 2.0, style?: 'warble' | 'wail' | 'hilo') {
    if (!this.soundEnabled) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    this.stopSiren();
    const mode = style || this.sirenStyle;

    try {
      this.notifySirenChange(true);
      const now = ctx.currentTime;

      if (this.sirenStopTimer) {
        clearTimeout(this.sirenStopTimer);
        this.sirenStopTimer = null;
      }
      this.sirenStopTimer = setTimeout(() => {
        this.notifySirenChange(false);
      }, duration * 1000 + 80);

      if (mode === 'warble') {
        // High-urgency warning warble siren
        const carrier = ctx.createOscillator();
        const carrierGain = ctx.createGain();
        const lfo = ctx.createOscillator();
        const lfoGain = ctx.createGain();

        carrier.type = 'sawtooth';
        carrier.frequency.setValueAtTime(850, now);

        lfo.type = 'sine';
        lfo.frequency.setValueAtTime(5.5, now); // 5.5Hz rapid modulation
        lfoGain.gain.setValueAtTime(260, now); // +/- 260Hz pitch swing

        lfo.connect(carrier.frequency);
        carrier.connect(carrierGain);
        carrierGain.connect(ctx.destination);

        carrierGain.gain.setValueAtTime(0.001, now);
        carrierGain.gain.linearRampToValueAtTime(0.45 * this.volume, now + 0.08);
        carrierGain.gain.setValueAtTime(0.45 * this.volume, now + duration - 0.15);
        carrierGain.gain.linearRampToValueAtTime(0.001, now + duration);

        carrier.start(now);
        lfo.start(now);
        carrier.stop(now + duration);
        lfo.stop(now + duration);

        this.activeSirenNodes.push({ osc: carrier, gain: carrierGain, lfo });
        carrier.onended = () => {
          this.notifySirenChange(false);
        };
      } else if (mode === 'hilo') {
        // Two-tone ADAS emergency vehicle hi-lo siren (960Hz / 680Hz)
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.connect(gain);
        gain.connect(ctx.destination);

        gain.gain.setValueAtTime(0.4 * this.volume, now);

        const period = 0.35;
        const cycles = Math.floor(duration / period);
        for (let i = 0; i < cycles; i++) {
          const t = now + i * period;
          const freq = i % 2 === 0 ? 960 : 680;
          osc.frequency.setValueAtTime(freq, t);
        }

        gain.gain.setValueAtTime(0.4 * this.volume, now + duration - 0.15);
        gain.gain.linearRampToValueAtTime(0.001, now + duration);

        osc.start(now);
        osc.stop(now + duration);

        this.activeSirenNodes.push({ osc, gain });
        osc.onended = () => {
          this.notifySirenChange(false);
        };
      } else {
        // 'wail' - sweeping pitch rising and falling (550Hz to 1250Hz)
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.connect(gain);
        gain.connect(ctx.destination);

        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(0.45 * this.volume, now + 0.1);

        const sweepPeriod = 0.8;
        const cycles = Math.ceil(duration / sweepPeriod);
        for (let i = 0; i < cycles; i++) {
          const t = now + i * sweepPeriod;
          osc.frequency.setValueAtTime(550, t);
          osc.frequency.linearRampToValueAtTime(1250, t + sweepPeriod / 2);
          osc.frequency.linearRampToValueAtTime(550, t + sweepPeriod);
        }

        gain.gain.setValueAtTime(0.45 * this.volume, now + duration - 0.15);
        gain.gain.linearRampToValueAtTime(0.001, now + duration);

        osc.start(now);
        osc.stop(now + duration);

        this.activeSirenNodes.push({ osc, gain });
        osc.onended = () => {
          this.notifySirenChange(false);
        };
      }
    } catch (e) {
      console.warn('Emergency Siren error:', e);
      this.notifySirenChange(false);
    }
  }

  /**
   * Immediately stops any currently sounding siren.
   */
  public stopSiren() {
    if (this.sirenStopTimer) {
      clearTimeout(this.sirenStopTimer);
      this.sirenStopTimer = null;
    }
    this.activeSirenNodes.forEach(({ osc, gain, lfo }) => {
      try {
        if (this.audioCtx) {
          gain.gain.linearRampToValueAtTime(0.001, this.audioCtx.currentTime + 0.05);
        }
        setTimeout(() => {
          try {
            osc.stop();
            if (lfo) lfo.stop();
          } catch {}
        }, 60);
      } catch {}
    });
    this.activeSirenNodes = [];
    this.notifySirenChange(false);
  }

  /**
   * High Risk Urgent Alert Siren (sounds the active siren mode)
   */
  public playHighAlertSound() {
    this.playEmergencySiren(1.8, this.sirenStyle);
  }

  /**
   * Medium Risk Soft Advisory Chime
   */
  public playMediumAlertSound() {
    if (!this.soundEnabled) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      this.createPulse(ctx, now, 587.33, 0.18, 'sine'); // D5
      this.createPulse(ctx, now + 0.15, 783.99, 0.25, 'sine'); // G5
    } catch (e) {
      console.warn('Audio playback error:', e);
    }
  }

  /**
   * Low Risk / Safe road confirmation beep
   */
  public playSafeChime() {
    if (!this.soundEnabled) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      this.createPulse(ctx, now, 523.25, 0.12, 'sine'); // C5
    } catch (e) {
      console.warn('Audio playback error:', e);
    }
  }

  private createPulse(
    ctx: AudioContext,
    startTime: number,
    freq: number,
    duration: number,
    type: OscillatorType
  ) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, startTime);

    gain.gain.setValueAtTime(0.001, startTime);
    gain.gain.exponentialRampToValueAtTime(0.4 * this.volume, startTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(startTime);
    osc.stop(startTime + duration + 0.05);
  }

  private getPreferredVoice(isKannada: boolean): SpeechSynthesisVoice | null {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null;
    const voices = window.speechSynthesis.getVoices();
    if (isKannada) {
      return (
        voices.find((v) => v.lang.toLowerCase().startsWith('kn') || v.lang.toLowerCase().includes('kannada')) ||
        voices.find((v) => v.lang.includes('kn-IN')) ||
        voices.find((v) => v.lang.includes('en-IN') || v.lang.includes('hi-IN')) ||
        null
      );
    }
    return (
      voices.find(
        (v) => v.lang.startsWith('en') && (v.name.includes('Google') || v.name.includes('Natural') || v.name.includes('Samantha') || v.name.includes('David'))
      ) || voices.find((v) => v.lang.startsWith('en')) || null
    );
  }

  /**
   * Generates and plays authentic native Kannada voice audio via server Gemini TTS.
   * Resolves true if played successfully, or false if network/audio failed.
   */
  public async playKannadaVoiceAudio(textKn: string): Promise<boolean> {
    if (!this.voiceEnabled) return false;
    if (typeof window === 'undefined') return false;

    // Stop currently playing audio if any
    if (this.activeAudio) {
      try {
        this.activeAudio.pause();
        this.activeAudio.currentTime = 0;
      } catch {}
      this.activeAudio = null;
    }

    try {
      const trimmed = textKn.trim();
      let audioUrl = this.audioCache.get(trimmed);

      if (!audioUrl) {
        const response = await fetch('/api/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: trimmed, voice: 'Kore', language: 'kn' }),
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success && data.audioData) {
            audioUrl = `data:${data.mimeType || 'audio/wav'};base64,${data.audioData}`;
            this.audioCache.set(trimmed, audioUrl);
          }
        }
      }

      if (audioUrl) {
        const audio = new Audio(audioUrl);
        audio.volume = this.volume;
        this.activeAudio = audio;

        return new Promise<boolean>((resolve) => {
          let resolved = false;
          const finish = (ok: boolean) => {
            if (!resolved) {
              resolved = true;
              this.activeAudio = null;
              resolve(ok);
            }
          };

          audio.onended = () => finish(true);
          audio.onerror = () => finish(false);
          // Safety timeout
          setTimeout(() => finish(true), 8000);

          audio.play().catch((playErr) => {
            console.warn('Audio play notice (user gesture needed):', playErr);
            finish(false);
          });
        });
      }
    } catch (err) {
      console.warn('Native Kannada TTS fetch error:', err);
    }
    return false;
  }

  /**
   * Browser SpeechSynthesis fallback with phonetic transliteration
   */
  private speakBrowserFallback(text: string, isKannada: boolean, onEnd?: () => void) {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      if (onEnd) onEnd();
      return;
    }

    try {
      const voice = this.getPreferredVoice(isKannada);
      const hasNativeKnVoice = Boolean(
        voice && (voice.lang.toLowerCase().startsWith('kn') || voice.name.toLowerCase().includes('kannada'))
      );
      // If browser voice pack has no native Kannada, use phonetic transliteration so Indian English or Hindi voice pronounces it clearly
      const spokenText = isKannada && !hasNativeKnVoice ? getKannadaPhonetic(text) : text;

      const u = new SpeechSynthesisUtterance(spokenText);
      u.lang = isKannada && hasNativeKnVoice ? 'kn-IN' : 'en-IN';
      u.rate = isKannada ? 0.95 : 1.05;
      u.pitch = 1.0;
      u.volume = this.volume;
      if (voice) u.voice = voice;

      if (onEnd) {
        let ended = false;
        const done = () => {
          if (!ended) {
            ended = true;
            onEnd();
          }
        };
        u.onend = done;
        u.onerror = done;
        setTimeout(done, 4500);
      }

      window.speechSynthesis.speak(u);
    } catch (e) {
      console.warn('Browser speech synthesis error:', e);
      if (onEnd) onEnd();
    }
  }

  /**
   * Multilingual speech synthesis dispatcher.
   * Uses real native Kannada AI voice, followed by English in kn_en mode.
   */
  public async speakAlert(textKn: string, textEn: string, force: boolean = false) {
    if (!this.voiceEnabled) return;

    const now = Date.now();
    const alertKey = `${this.language}:${textKn}:${textEn}`;
    const timeSinceLastAlert = now - this.lastAlertTimestamp;

    if (!force && this.lastSpokenText === alertKey && timeSinceLastAlert < this.minRepeatIntervalMs) {
      // Cooldown in effect
      return;
    }

    this.lastSpokenText = alertKey;
    this.lastAlertTimestamp = now;

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    if (this.activeAudio) {
      try {
        this.activeAudio.pause();
        this.activeAudio.currentTime = 0;
      } catch {}
      this.activeAudio = null;
    }

    if (this.language === 'en') {
      this.speakBrowserFallback(textEn, false);
      return;
    }

    if (this.language === 'kn') {
      // Primary: AI Native Studio Kannada Voice
      const played = await this.playKannadaVoiceAudio(textKn);
      if (!played) {
        // Fallback: Browser Web Speech with phonetic guide
        this.speakBrowserFallback(textKn, true);
      }
      return;
    }

    if (this.language === 'kn_en') {
      // FOR KANNADA + ENGLISH: SPEAK KANNADA FIRST, THEN ENGLISH
      const played = await this.playKannadaVoiceAudio(textKn);
      if (played) {
        setTimeout(() => {
          this.speakBrowserFallback(textEn, false);
        }, 300);
      } else {
        // Fallback sequence via browser speech
        this.speakBrowserFallback(textKn, true, () => {
          setTimeout(() => {
            this.speakBrowserFallback(textEn, false);
          }, 300);
        });
      }
    }
  }

  /**
   * Backwards compatible speech method
   */
  public speakVoiceAlert(text: string, force: boolean = false) {
    this.speakAlert(text, text, force);
  }

  /**
   * Complete hazard alert dispatcher handling High, Med, Low levels
   * with automatic native Kannada + English language support
   */
  public triggerHazardAlert(
    dangerLevel: 'HIGH' | 'MEDIUM' | 'LOW',
    voiceTextEn: string,
    hazardName: string,
    category?: HazardCategory,
    voiceTextKn?: string
  ) {
    const now = Date.now();
    const hazardKey = `${this.language}:${dangerLevel}:${hazardName}`;
    const isRepeat = this.lastSpokenText === hazardKey && (now - this.lastAlertTimestamp) < this.minRepeatIntervalMs;

    const knData = getKannadaTranslation(hazardName, category || 'obstacle', dangerLevel);
    const resolvedKn = voiceTextKn || knData.voiceAlertKn;
    const resolvedEn = voiceTextEn || (dangerLevel === 'HIGH' ? `Warning! Dangerous ${hazardName} detected ahead. Please slow down!` : `Caution. Road hazard detected. Reduce speed.`);

    if (dangerLevel === 'HIGH') {
      this.playHighAlertSound();
      if (!isRepeat) {
        this.speakAlert(resolvedKn, resolvedEn);
        this.lastSpokenText = hazardKey;
        this.lastAlertTimestamp = now;
      }
    } else if (dangerLevel === 'MEDIUM') {
      if (!isRepeat) {
        this.playMediumAlertSound();
        this.speakAlert(resolvedKn, resolvedEn);
        this.lastSpokenText = hazardKey;
        this.lastAlertTimestamp = now;
      }
    } else {
      // LOW danger - play gentle chime occasionally
      if (!isRepeat && Math.random() < 0.2) {
        this.playSafeChime();
      }
    }
  }

  public testAudio() {
    this.playHighAlertSound();
    setTimeout(() => {
      const knTest = 'ಎಚ್ಚರಿಕೆ! ರಸ್ತೆಯಲ್ಲಿ ಅಪಾಯ ಪತ್ತೆಯಾಗಿದೆ. ದಯವಿಟ್ಟು ನಿಧಾನವಾಗಿ ಚಲಿಸಿ.';
      const enTest = 'Warning! Danger detected on the road. Please slow down.';
      this.speakAlert(knTest, enTest, true);
    }, 400);
  }

  public testLanguage(lang: AppLanguage) {
    const previous = this.language;
    this.language = lang;
    this.playHighAlertSound();
    setTimeout(() => {
      const knTest = 'ಎಚ್ಚರಿಕೆ! ರಸ್ತೆಯಲ್ಲಿ ಅಪಾಯ ಪತ್ತೆಯಾಗಿದೆ. ದಯವಿಟ್ಟು ನಿಧಾನವಾಗಿ ಚಲಿಸಿ.';
      const enTest = 'Warning! Danger detected on the road. Please slow down.';
      this.speakAlert(knTest, enTest, true);
      this.language = previous;
    }, 400);
  }

  public testSirenOnly(style?: 'warble' | 'wail' | 'hilo', duration: number = 2.5) {
    this.playEmergencySiren(duration, style);
  }

  public testSirenWithVoice(lang: AppLanguage = 'kn') {
    // Sound siren first for 1.8 seconds, followed by clear voice warning
    this.playEmergencySiren(1.8);
    setTimeout(() => {
      const knTest = 'ಎಚ್ಚರಿಕೆ! ರಸ್ತೆಯಲ್ಲಿ ಅಪಾಯ ಪತ್ತೆಯಾಗಿದೆ. ದಯವಿಟ್ಟು ನಿಧಾನವಾಗಿ ಚಲಿಸಿ.';
      const enTest = 'Warning! Danger detected on the road. Please slow down.';
      const prev = this.language;
      this.language = lang;
      this.speakAlert(knTest, enTest, true);
      this.language = prev;
    }, 1900);
  }

  public testKannadaVoiceOnly() {
    this.playHighAlertSound();
    setTimeout(async () => {
      const knTest = 'ಎಚ್ಚರಿಕೆ! ರಸ್ತೆಯಲ್ಲಿ ಅಪಾಯ ಪತ್ತೆಯಾಗಿದೆ. ದಯವಿಟ್ಟು ನಿಧಾನವಾಗಿ ಚಲಿಸಿ.';
      const played = await this.playKannadaVoiceAudio(knTest);
      if (!played) {
        this.speakBrowserFallback(knTest, true);
      }
    }, 350);
  }
}

export const audioService = new AudioService();

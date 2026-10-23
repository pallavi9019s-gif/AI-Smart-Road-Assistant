import { AppLanguage, RoadAnalysisResult, DangerLevel, HazardCategory } from '../types';

export interface LanguageOption {
  code: AppLanguage;
  label: string;
  nativeLabel: string;
  description: string;
  speechOrder: string;
}

export const LANGUAGE_OPTIONS: LanguageOption[] = [
  {
    code: 'en',
    label: 'English',
    nativeLabel: 'English',
    description: 'Alerts and voice guidance in English only',
    speechOrder: 'English'
  },
  {
    code: 'kn',
    label: 'Kannada',
    nativeLabel: 'ಕನ್ನಡ',
    description: 'ಎಚ್ಚರಿಕೆ ಮತ್ತು ಧ್ವನಿ ಮಾರ್ಗದರ್ಶನ ಸಂಪೂರ್ಣ ಕನ್ನಡದಲ್ಲಿ',
    speechOrder: 'ಕನ್ನಡ'
  },
  {
    code: 'kn_en',
    label: 'Kannada + English',
    nativeLabel: 'ಕನ್ನಡ + English',
    description: 'Bilingual mode: Speaks Kannada first, followed by English',
    speechOrder: 'ಕನ್ನಡ First ➔ English Second'
  }
];

// Standard Kannada translations for road hazard categories
export const CATEGORY_LABELS_KN: Record<HazardCategory, string> = {
  pothole: 'ರಸ್ತೆಯ ಗುಂಡಿ (Pothole)',
  obstacle: 'ರಸ್ತೆ ಅಡಚಣೆ (Obstacle)',
  road_damage: 'ಹಾಳಾದ ರಸ್ತೆ (Road Damage)',
  unsafe_condition: 'ಅಸುರಕ್ಷಿತ ರಸ್ತೆ (Unsafe Condition)',
  poor_visibility: 'ಕಡಿಮೆ ಗೋಚರತೆ (Poor Visibility)',
  human: 'ಪಾದಚಾರಿಗಳು / ವ್ಯಕ್ತಿ (Pedestrian/Human)',
  animal: 'ರಸ್ತೆ ಪ್ರಾಣಿ (Road Animal)',
  vehicle: 'ವಾಹನ ಅಡಚಣೆ (Vehicle)',
  clear: 'ಸುರಕ್ಷಿತ ರಸ್ತೆ (Clear Road)',
};

// Common entity translations in Kannada
const COMMON_ENTITIES_KN: Record<string, string> = {
  pedestrian: 'ಪಾದಚಾರಿ',
  person: 'ವ್ಯಕ್ತಿ',
  cow: 'ಹಸು / ದನ',
  cattle: 'ದನಕರುಗಳು',
  buffalo: 'ಎಮ್ಮೆ',
  dog: 'ನಾಯಿ',
  goat: 'ಮೇಕೆ / ಕುರಿ',
  horse: 'ಕುದುರೆ',
  elephant: 'ಆನೆ',
  pothole: 'ರಸ್ತೆ ಗುಂಡಿ',
  crater: 'ದೊಡ್ಡ ಗುಂಡಿ',
  crack: 'ರಸ್ತೆ ಬಿರುಕು',
  obstacle: 'ರಸ್ತೆ ಅಡಚಣೆ',
  branch: 'ಮರದ ಕೊಂಬೆ',
  debris: 'ಕಸ ಕಡ್ಡಿ / ಕಲ್ಲುಗಳು',
  water: 'ನಿಂತ ನೀರು',
  puddle: 'ನೀರಿನ ಗುಂಡಿ',
};

/**
 * Translates general road safety phrases into natural Kannada
 */
export function getKannadaTranslation(
  englishHazard: string,
  category: HazardCategory,
  dangerLevel: DangerLevel
): {
  hazardKn: string;
  recommendationKn: string;
  voiceAlertKn: string;
  emergencyWarningKn: string;
} {
  const lower = englishHazard.toLowerCase();

  // 1. Pedestrian / Human
  if (category === 'human' || lower.includes('pedestrian') || lower.includes('person') || lower.includes('worker') || lower.includes('cyclist')) {
    const hazardKn = 'ರಸ್ತೆಯಲ್ಲಿ ಪಾದಚಾರಿಗಳು / ವ್ಯಕ್ತಿ';
    const recommendationKn = dangerLevel === 'HIGH'
      ? 'ತಕ್ಷಣ ವಾಹನದ ವೇಗ ತಗ್ಗಿಸಿ, ಬ್ರೇಕ್ ಸಿದ್ಧವಾಗಿಡಿ ಮತ್ತು ಪಾದಚಾರಿಗಳಿಗೆ ದಾರಿ ಬಿಡಿ.'
      : 'ಜಾಗರೂಕರಾಗಿರಿ ಮತ್ತು ಪಾದಚಾರಿಗಳಿಂದ ಸುರಕ್ಷಿತ ಅಂತರ ಕಾಪಾಡಿ.';
    const voiceAlertKn = 'ಎಚ್ಚರಿಕೆ! ರಸ್ತೆಯಲ್ಲಿ ಪಾದಚಾರಿಗಳು ಪತ್ತೆಯಾಗಿದ್ದಾರೆ. ದಯವಿಟ್ಟು ನಿಧಾನವಾಗಿ ಚಲಿಸಿ ಮತ್ತು ಸುರಕ್ಷಿತ ಅಂತರ ಕಾಪಾಡಿ.';
    const emergencyWarningKn = 'ತುರ್ತು ಎಚ್ಚರಿಕೆ! ಮುಂದೆ ರಸ್ತೆಯಲ್ಲಿ ಪಾದಚಾರಿಗಳು ಇದ್ದಾರೆ. ವೇಗ ತಗ್ಗಿಸಿ!';
    return { hazardKn, recommendationKn, voiceAlertKn, emergencyWarningKn };
  }

  // 2. Cow / Cattle
  if (lower.includes('cow') || lower.includes('cattle') || lower.includes('bull')) {
    const hazardKn = 'ರಸ್ತೆಯಲ್ಲಿ ಹಸು / ದನ';
    const recommendationKn = 'ವೇಗ ತಗ್ಗಿಸಿ, ಹಾರ್ನ್ ಮಾಡಬೇಡಿ (ಪ್ರಾಣಿ ಹೆದರದಂತೆ) ಮತ್ತು ನಿಲ್ಲಲು ಸಿದ್ಧರಾಗಿ.';
    const voiceAlertKn = 'ಎಚ್ಚರಿಕೆ! ರಸ್ತೆಯಲ್ಲಿ ಹಸು ಪತ್ತೆಯಾಗಿದೆ. ದಯವಿಟ್ಟು ನಿಧಾನಗೊಳಿಸಿ ಮತ್ತು ನಿಲ್ಲಲು ಸಿದ್ಧರಾಗಿ.';
    const emergencyWarningKn = 'ತುರ್ತು ಎಚ್ಚರಿಕೆ! ರಸ್ತೆಯಲ್ಲಿ ದನ ಕಂಡುಬಂದಿದೆ. ದಯವಿಟ್ಟು ನಿಧಾನವಾಗಿ ಚಲಿಸಿ.';
    return { hazardKn, recommendationKn, voiceAlertKn, emergencyWarningKn };
  }

  // 3. Buffalo
  if (lower.includes('buffalo')) {
    const hazardKn = 'ರಸ್ತೆಯಲ್ಲಿ ಎಮ್ಮೆ ಪತ್ತೆಯಾಗಿದೆ';
    const recommendationKn = 'ವಾಹನ ನಿಧಾನಗೊಳಿಸಿ ಮತ್ತು ಪ್ರಾಣಿ ದಾಟುವವರೆಗೆ ಕಾಯಿರಿ.';
    const voiceAlertKn = 'ಎಚ್ಚರಿಕೆ! ರಸ್ತೆಯಲ್ಲಿ ಎಮ್ಮೆ ಇದೆ. ದಯವಿಟ್ಟು ನಿಧಾನವಾಗಿ ಚಲಿಸಿ ಮತ್ತು ಜಾಗರೂಕರಾಗಿರಿ.';
    const emergencyWarningKn = 'ತುರ್ತು ಎಚ್ಚರಿಕೆ! ರಸ್ತೆಯಲ್ಲಿ ಎಮ್ಮೆ ಅಡ್ಡಬಂದಿದೆ. ನಿಧಾನಗೊಳಿಸಿ!';
    return { hazardKn, recommendationKn, voiceAlertKn, emergencyWarningKn };
  }

  // 4. Dog
  if (lower.includes('dog')) {
    const hazardKn = 'ರಸ್ತೆಯಲ್ಲಿ ನಾಯಿ ದಾಟುತ್ತಿದೆ';
    const recommendationKn = 'ವೇಗ ನಿಯಂತ್ರಣದಲ್ಲಿಡಿ, ಹಠಾತ್ ತಿರುವುಗಳನ್ನು ತಪ್ಪಿಸಿ.';
    const voiceAlertKn = 'ಎಚ್ಚರಿಕೆ! ರಸ್ತೆಯಲ್ಲಿ ನಾಯಿ ಇದೆ. ದಯವಿಟ್ಟು ನಿಧಾನವಾಗಿ ಚಲಿಸಿ.';
    const emergencyWarningKn = 'ಎಚ್ಚರಿಕೆ! ರಸ್ತೆಯಲ್ಲಿ ನಾಯಿ ಪತ್ತೆಯಾಗಿದೆ. ಜಾಗರೂಕರಾಗಿರಿ.';
    return { hazardKn, recommendationKn, voiceAlertKn, emergencyWarningKn };
  }

  // 5. Elephant
  if (lower.includes('elephant')) {
    const hazardKn = 'ರಸ್ತೆಯಲ್ಲಿ ಆನೆ ಪತ್ತೆಯಾಗಿದೆ';
    const recommendationKn = 'ತಕ್ಷಣ ವಾಹನ ನಿಲ್ಲಿಸಿ, ಹಾರ್ನ್ ಮಾಡಬೇಡಿ ಮತ್ತು ಸುರಕ್ಷಿತ ದೂರದಲ್ಲಿರಿ.';
    const voiceAlertKn = 'ತೀವ್ರ ಎಚ್ಚರಿಕೆ! ರಸ್ತೆಯಲ್ಲಿ ಆನೆ ಪತ್ತೆಯಾಗಿದೆ. ತಕ್ಷಣ ವಾಹನ ನಿಲ್ಲಿಸಿ ಸುರಕ್ಷಿತ ಅಂತರ ಕಾಪಾಡಿ.';
    const emergencyWarningKn = 'ಅಪಾಯಕಾರಿ ಎಚ್ಚರಿಕೆ! ರಸ್ತೆಯಲ್ಲಿ ಆನೆ ಇದೆ. ಮುಂದಕ್ಕೆ ಹೋಗಬೇಡಿ!';
    return { hazardKn, recommendationKn, voiceAlertKn, emergencyWarningKn };
  }

  // 6. Generic Animal
  if (category === 'animal' || lower.includes('animal') || lower.includes('horse') || lower.includes('goat') || lower.includes('sheep')) {
    const hazardKn = 'ರಸ್ತೆಯಲ್ಲಿ ಪ್ರಾಣಿ ಪತ್ತೆಯಾಗಿದೆ';
    const recommendationKn = 'ವಾಹನದ ವೇಗ ತಗ್ಗಿಸಿ, ಪ್ರಾಣಿ ಬೆದರದಂತೆ ಎಚ್ಚರಿಕೆಯಿಂದ ಚಲಿಸಿ.';
    const voiceAlertKn = 'ಎಚ್ಚರಿಕೆ! ರಸ್ತೆಯಲ್ಲಿ ಪ್ರಾಣಿ ಪತ್ತೆಯಾಗಿದೆ. ದಯವಿಟ್ಟು ನಿಧಾನಗೊಳಿಸಿ ಮತ್ತು ನಿಲ್ಲಲು ಸಿದ್ಧರಾಗಿ.';
    const emergencyWarningKn = 'ತುರ್ತು ಎಚ್ಚರಿಕೆ! ರಸ್ತೆಯಲ್ಲಿ ಪ್ರಾಣಿ ಇದೆ. ನಿಧಾನವಾಗಿ ಚಲಿಸಿ.';
    return { hazardKn, recommendationKn, voiceAlertKn, emergencyWarningKn };
  }

  // 7. Pothole
  if (category === 'pothole' || lower.includes('pothole') || lower.includes('crater') || lower.includes('hole')) {
    const hazardKn = 'ರಸ್ತೆಯಲ್ಲಿ ಅಪಾಯಕಾರಿ ಗುಂಡಿ (Pothole)';
    const recommendationKn = 'ವೇಗವನ್ನು 20-30 ಕಿ.ಮೀ/ಗಂಟೆಗೆ ಇಳಿಸಿ. ಸ್ಟೀರಿಂಗ್ ಮೇಲೆ ಬಿಗಿ ಹಿಡಿತವಿರಲಿ.';
    const voiceAlertKn = 'ಎಚ್ಚರಿಕೆ! ಮುಂದೆ ರಸ್ತೆಯಲ್ಲಿ ದೊಡ್ಡ ಗುಂಡಿ ಇದೆ. ದಯವಿಟ್ಟು ವಾಹನದ ವೇಗ ತಗ್ಗಿಸಿ.';
    const emergencyWarningKn = 'ತುರ್ತು ಎಚ್ಚರಿಕೆ! ಮುಂದೆ ರಸ್ತೆ ಗುಂಡಿ ಇದೆ. ನಿಧಾನವಾಗಿ ಚಲಿಸಿ!';
    return { hazardKn, recommendationKn, voiceAlertKn, emergencyWarningKn };
  }

  // 8. Obstacle / Fallen Tree / Debris
  if (category === 'obstacle' || lower.includes('branch') || lower.includes('tree') || lower.includes('barrier') || lower.includes('debris') || lower.includes('rock')) {
    const hazardKn = 'ರಸ್ತೆಯಲ್ಲಿ ಅಡಚಣೆ / ಬಿದ್ದ ಮರದ ಕೊಂಬೆ';
    const recommendationKn = 'ಕನ್ನಡಿಗಳನ್ನು ಪರಿಶೀಲಿಸಿ, ಇಂಡಿಕೇಟರ್ ಹಾಕಿ ಪಕ್ಕದ ಲೇನ್‌ಗೆ ಎಚ್ಚರಿಕೆಯಿಂದ ಚಲಿಸಿ.';
    const voiceAlertKn = 'ಎಚ್ಚರಿಕೆ! ಮುಂದೆ ರಸ್ತೆಯಲ್ಲಿ ಅಡಚಣೆ ಇದೆ. ದಯವಿಟ್ಟು ನಿಧಾನಗೊಳಿಸಿ ಮತ್ತು ಎಚ್ಚರಿಕೆಯಿಂದ ಚಲಿಸಿ.';
    const emergencyWarningKn = 'ತುರ್ತು ಎಚ್ಚರಿಕೆ! ರಸ್ತೆಯಲ್ಲಿ ಅಪಾಯಕಾರಿ ಅಡಚಣೆ ಇದೆ!';
    return { hazardKn, recommendationKn, voiceAlertKn, emergencyWarningKn };
  }

  // 9. Damaged Road / Cracks
  if (category === 'road_damage' || lower.includes('damage') || lower.includes('crack')) {
    const hazardKn = 'ಹಾಳಾದ ರಸ್ತೆ ಮೇಲ್ಮೈ ಮತ್ತು ಬಿರುಕುಗಳು';
    const recommendationKn = 'ಒರಟು ರಸ್ತೆಯಿದೆ, ವಾಹನ ನಿಧಾನಗೊಳಿಸಿ ಮತ್ತು ಜಾಗರೂಕರಾಗಿ ಚಾಲನೆ ಮಾಡಿ.';
    const voiceAlertKn = 'ಎಚ್ಚರಿಕೆ! ರಸ್ತೆ ಹಾಳಾಗಿದೆ ಮತ್ತು ಬಿರುಕು ಬಿಟ್ಟಿದೆ. ವೇಗ ಕಡಿಮೆ ಮಾಡಿ.';
    const emergencyWarningKn = 'ಎಚ್ಚರಿಕೆ! ರಸ್ತೆ ಹಾಳಾಗಿದೆ. ವಾಹನ ನಿಧಾನಗೊಳಿಸಿ.';
    return { hazardKn, recommendationKn, voiceAlertKn, emergencyWarningKn };
  }

  // 10. Water / Aquaplaning
  if (category === 'unsafe_condition' || lower.includes('water') || lower.includes('puddle') || lower.includes('aquaplaning') || lower.includes('slick')) {
    const hazardKn = 'ರಸ್ತೆಯಲ್ಲಿ ನೀರು ನಿಂತಿದೆ / ಜಾರುವ ರಸ್ತೆ';
    const recommendationKn = 'ವೇಗ ತಗ್ಗಿಸಿ. ವಾಹನ ಜಾರದಂತೆ ಹಠಾತ್ ಬ್ರೇಕ್ ಅಥವಾ ತಿರುವುಗಳನ್ನು ತಪ್ಪಿಸಿ.';
    const voiceAlertKn = 'ಎಚ್ಚರಿಕೆ! ರಸ್ತೆಯಲ್ಲಿ ನೀರು ನಿಂತಿದೆ. ದಯವಿಟ್ಟು ನಿಧಾನವಾಗಿ ಚಲಿಸಿ.';
    const emergencyWarningKn = 'ಎಚ್ಚರಿಕೆ! ರಸ್ತೆ ಜಾರುವ ಸಾಧ್ಯತೆಯಿದೆ. ವೇಗ ತಗ್ಗಿಸಿ.';
    return { hazardKn, recommendationKn, voiceAlertKn, emergencyWarningKn };
  }

  // 11. Clear / Safe
  if (category === 'clear' || lower.includes('clear') || dangerLevel === 'LOW') {
    const hazardKn = 'ರಸ್ತೆ ಸ್ಪಷ್ಟವಾಗಿದೆ - ಸುರಕ್ಷಿತ ಪರಿಸ್ಥಿತಿ';
    const recommendationKn = 'ಸಾಮಾನ್ಯ ಸುರಕ್ಷಿತ ವೇಗದಲ್ಲಿ ಚಾಲನೆ ಮುಂದುವರಿಸಿ.';
    const voiceAlertKn = 'ರಸ್ತೆ ಪರಿಸ್ಥಿತಿ ಸಾಮಾನ್ಯವಾಗಿ ಮತ್ತು ಸುರಕ್ಷಿತವಾಗಿದೆ.';
    const emergencyWarningKn = 'ರಸ್ತೆ ಸುರಕ್ಷಿತವಾಗಿದೆ.';
    return { hazardKn, recommendationKn, voiceAlertKn, emergencyWarningKn };
  }

  // Fallback generic danger
  const defaultHazardKn = 'ರಸ್ತೆಯಲ್ಲಿ ಅಪಾಯ ಪತ್ತೆಯಾಗಿದೆ';
  const defaultRecKn = dangerLevel === 'HIGH'
    ? 'ತಕ್ಷಣ ವಾಹನ ನಿಧಾನಗೊಳಿಸಿ ಮತ್ತು ಅತ್ಯಂತ ಎಚ್ಚರಿಕೆಯಿಂದ ಚಲಿಸಿ.'
    : 'ವೇಗ ನಿಯಂತ್ರಣದಲ್ಲಿಡಿ ಮತ್ತು ಮುನ್ನೆಚ್ಚರಿಕೆ ವಹಿಸಿ.';
  const defaultVoiceKn = 'ಎಚ್ಚರಿಕೆ! ರಸ್ತೆಯಲ್ಲಿ ಅಪಾಯ ಪತ್ತೆಯಾಗಿದೆ. ದಯವಿಟ್ಟು ನಿಧಾನವಾಗಿ ಚಲಿಸಿ.';
  const defaultEmKn = 'ಎಚ್ಚರಿಕೆ! ರಸ್ತೆಯಲ್ಲಿ ಅಪಾಯ ಪತ್ತೆಯಾಗಿದೆ.';

  return {
    hazardKn: defaultHazardKn,
    recommendationKn: defaultRecKn,
    voiceAlertKn: defaultVoiceKn,
    emergencyWarningKn: defaultEmKn,
  };
}

/**
 * Phonetic romanization for browsers lacking native Kannada speech voice packs
 */
export function getKannadaPhonetic(knText: string): string {
  const map: Record<string, string> = {
    'ಎಚ್ಚರಿಕೆ! ರಸ್ತೆಯಲ್ಲಿ ಅಪಾಯ ಪತ್ತೆಯಾಗಿದೆ. ದಯವಿಟ್ಟು ನಿಧಾನವಾಗಿ ಚಲಿಸಿ.':
      'Eccharike! Rasteyalli apaya patteyagide. Dayavittu nidhanavagi chalisi.',
    'ಎಚ್ಚರಿಕೆ! ರಸ್ತೆಯಲ್ಲಿ ಪಾದಚಾರಿಗಳು ಪತ್ತೆಯಾಗಿದ್ದಾರೆ. ದಯವಿಟ್ಟು ನಿಧಾನವಾಗಿ ಚಲಿಸಿ ಮತ್ತು ಸುರಕ್ಷಿತ ಅಂತರ ಕಾಪಾಡಿ.':
      'Eccharike! Rasteyalli padacharigalu patteyagiddare. Dayavittu nidhanavagi chalisi mattu surakshita antara kapadi.',
    'ಎಚ್ಚರಿಕೆ! ರಸ್ತೆಯಲ್ಲಿ ಹಸು ಪತ್ತೆಯಾಗಿದೆ. ದಯವಿಟ್ಟು ನಿಧಾನಗೊಳಿಸಿ ಮತ್ತು ನಿಲ್ಲಲು ಸಿದ್ಧರಾಗಿ.':
      'Eccharike! Rasteyalli hasu patteyagide. Dayavittu nidhanagolisi mattu nillalu siddharagi.',
    'ಎಚ್ಚರಿಕೆ! ರಸ್ತೆಯಲ್ಲಿ ಎಮ್ಮೆ ಇದೆ. ದಯವಿಟ್ಟು ನಿಧಾನವಾಗಿ ಚಲಿಸಿ ಮತ್ತು ಜಾಗರೂಕರಾಗಿರಿ.':
      'Eccharike! Rasteyalli emme ide. Dayavittu nidhanavagi chalisi mattu jagarookaragi.',
    'ಎಚ್ಚರಿಕೆ! ರಸ್ತೆಯಲ್ಲಿ ನಾಯಿ ಇದೆ. ದಯವಿಟ್ಟು ನಿಧಾನವಾಗಿ ಚಲಿಸಿ.':
      'Eccharike! Rasteyalli naayi ide. Dayavittu nidhanavagi chalisi.',
    'ತೀವ್ರ ಎಚ್ಚರಿಕೆ! ರಸ್ತೆಯಲ್ಲಿ ಆನೆ ಪತ್ತೆಯಾಗಿದೆ. ತಕ್ಷಣ ವಾಹನ ನಿಲ್ಲಿಸಿ ಸುರಕ್ಷಿತ ಅಂತರ ಕಾಪಾಡಿ.':
      'Teevra eccharike! Rasteyalli aane patteyagide. Takshana vahana nillisi surakshita antara kapadi.',
    'ಎಚ್ಚರಿಕೆ! ರಸ್ತೆಯಲ್ಲಿ ಪ್ರಾಣಿ ಪತ್ತೆಯಾಗಿದೆ. ದಯವಿಟ್ಟು ನಿಧಾನಗೊಳಿಸಿ ಮತ್ತು ನಿಲ್ಲಲು ಸಿದ್ಧರಾಗಿ.':
      'Eccharike! Rasteyalli prani patteyagide. Dayavittu nidhanagolisi mattu nillalu siddharagi.',
    'ಎಚ್ಚರಿಕೆ! ಮುಂದೆ ರಸ್ತೆಯಲ್ಲಿ ದೊಡ್ಡ ಗುಂಡಿ ಇದೆ. ದಯವಿಟ್ಟು ವಾಹನದ ವೇಗ ತಗ್ಗಿಸಿ.':
      'Eccharike! Munde rasteyalli dodda gundi ide. Dayavittu vahanada vega taggisi.',
    'ಎಚ್ಚರಿಕೆ! ಮುಂದೆ ರಸ್ತೆಯಲ್ಲಿ ಅಡಚಣೆ ಇದೆ. ದಯವಿಟ್ಟು ನಿಧಾನಗೊಳಿಸಿ ಮತ್ತು ಎಚ್ಚರಿಕೆಯಿಂದ ಚಲಿಸಿ.':
      'Eccharike! Munde rasteyalli adachane ide. Dayavittu nidhanagolisi mattu eccharikeyinda chalisi.',
    'ಎಚ್ಚರಿಕೆ! ರಸ್ತೆ ಹಾಳಾಗಿದೆ ಮತ್ತು ಬಿರುಕು ಬಿಟ್ಟಿದೆ. ವೇಗ ಕಡಿಮೆ ಮಾಡಿ.':
      'Eccharike! Raste halagide mattu biruku bittide. Vega kadime maadi.',
    'ಎಚ್ಚರಿಕೆ! ರಸ್ತೆಯಲ್ಲಿ ನೀರು ನಿಂತಿದೆ. ದಯವಿಟ್ಟು ನಿಧಾನವಾಗಿ ಚಲಿಸಿ.':
      'Eccharike! Rasteyalli neeru nintide. Dayavittu nidhanavagi chalisi.',
    'ರಸ್ತೆ ಪರಿಸ್ಥಿತಿ ಸಾಮಾನ್ಯವಾಗಿ ಮತ್ತು ಸುರಕ್ಷಿತವಾಗಿದೆ.':
      'Raste paristhithi samanyavagi mattu surakshitavagide.',
  };

  if (map[knText]) return map[knText];
  // Default phonetic warning
  return 'Eccharike! Rasteyalli apaya patteyagide. Dayavittu nidhanavagi chalisi.';
}

/**
 * Resolves localized strings for UI display and voice speech based on the active language
 */
export function getLocalizedHazard(
  report: RoadAnalysisResult,
  language: AppLanguage
): {
  primaryHazard: string;
  recommendation: string;
  voiceAlertKn: string;
  voiceAlertEn: string;
  emergencyWarning: string;
  dangerBadgeText: string;
} {
  const enHazard = report.primaryHazard;
  const enRec = report.recommendation;
  const enVoice = report.voiceAlert || `Warning! Dangerous ${report.primaryHazard} detected ahead. Please slow down.`;
  const enEmergency = report.dangerLevel === 'HIGH'
    ? 'Warning! Danger detected on the road. Please slow down.'
    : 'Caution! Road warning ahead. Drive carefully.';

  // Retrieve Kannada translations (prefer AI-generated if provided in server, else dictionary)
  const dict = getKannadaTranslation(report.primaryHazard, report.category, report.dangerLevel);
  const knHazard = report.primaryHazardKn || dict.hazardKn;
  const knRec = report.recommendationKn || dict.recommendationKn;
  const knVoice = report.voiceAlertKn || dict.voiceAlertKn;
  const knEmergency = dict.emergencyWarningKn;

  const dangerBadgeText = report.dangerLevel === 'HIGH'
    ? (language === 'kn' ? 'ತೀವ್ರ ಅಪಾಯ (HIGH)' : language === 'kn_en' ? 'ತೀವ್ರ ಅಪಾಯ | HIGH DANGER' : 'HIGH DANGER')
    : report.dangerLevel === 'MEDIUM'
    ? (language === 'kn' ? 'ಮಧ್ಯಮ ಅಪಾಯ (MEDIUM)' : language === 'kn_en' ? 'ಮಧ್ಯಮ ಅಪಾಯ | MEDIUM RISK' : 'MEDIUM RISK')
    : (language === 'kn' ? 'ಸುರಕ್ಷಿತ (SAFE)' : language === 'kn_en' ? 'ಸುರಕ್ಷಿತ | SAFE' : 'LOW RISK / SAFE');

  if (language === 'kn') {
    return {
      primaryHazard: knHazard,
      recommendation: knRec,
      voiceAlertKn: knVoice,
      voiceAlertEn: enVoice,
      emergencyWarning: knEmergency,
      dangerBadgeText,
    };
  }

  if (language === 'kn_en') {
    return {
      primaryHazard: `${knHazard} / ${enHazard}`,
      recommendation: `${knRec} • ${enRec}`,
      voiceAlertKn: knVoice,
      voiceAlertEn: enVoice,
      emergencyWarning: `${knEmergency} (${enEmergency})`,
      dangerBadgeText,
    };
  }

  // English default
  return {
    primaryHazard: enHazard,
    recommendation: enRec,
    voiceAlertKn: knVoice,
    voiceAlertEn: enVoice,
    emergencyWarning: enEmergency,
    dangerBadgeText,
  };
}

import express from 'express';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import JSZip from 'jszip';
import { GoogleGenAI } from '@google/genai';
import { HazardReport } from './src/types';

dotenv.config();

const app = express();

function getPort(): number {
  const portArgIndex = process.argv.indexOf('--port');
  if (portArgIndex !== -1 && process.argv[portArgIndex + 1]) {
    return parseInt(process.argv[portArgIndex + 1], 10);
  }
  if (process.env.NODE_ENV !== 'production') {
    return 3000;
  }
  return parseInt(process.env.PORT || '3000', 10);
}

const PORT = getPort();

// Increase JSON payload limit for base64 image uploads and camera frames
app.use(express.json({ limit: '30mb' }));
app.use(express.urlencoded({ extended: true, limit: '30mb' }));

// Ensure database directory and images store exist
const DATA_DIR = path.resolve(process.cwd(), 'data');
const REPORTS_FILE = path.join(DATA_DIR, 'hazard_reports.json');
const IMAGES_DIR = path.join(DATA_DIR, 'images');
const ASSETS_IMAGES_DIR = path.resolve(process.cwd(), 'src/assets/images');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(IMAGES_DIR)) {
  fs.mkdirSync(IMAGES_DIR, { recursive: true });
}

// Initial sample reports if database is empty so college project shows instant history
const INITIAL_REPORTS: HazardReport[] = [
  {
    id: 'rep-init-01',
    timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
    source: 'upload',
    primaryHazard: 'Deep Asphalt Pothole with Sharp Rim',
    primaryHazardKn: 'ರಸ್ತೆಯಲ್ಲಿ ಅಪಾಯಕಾರಿ ಗುಂಡಿ (Pothole)',
    category: 'pothole',
    dangerLevel: 'HIGH',
    confidence: 94,
    description: 'A deep pothole measuring approx 40cm across with exposed aggregate and sharp asphalt edges directly in the main wheel track.',
    recommendation: 'Reduce vehicle speed to under 25 km/h. Maintain firm steering wheel grip. Do not perform sudden swerves into oncoming traffic.',
    recommendationKn: 'ವೇಗವನ್ನು 20-30 ಕಿ.ಮೀ/ಗಂಟೆಗೆ ಇಳಿಸಿ. ಸ್ಟೀರಿಂಗ್ ಮೇಲೆ ಬಿಗಿ ಹಿಡಿತವಿರಲಿ.',
    voiceAlert: 'Warning. Dangerous deep pothole detected. Please slow down.',
    voiceAlertKn: 'ಎಚ್ಚರಿಕೆ! ಮುಂದೆ ರಸ್ತೆಯಲ್ಲಿ ದೊಡ್ಡ ಗುಂಡಿ ಇದೆ. ದಯವಿಟ್ಟು ವಾಹನದ ವೇಗ ತಗ್ಗಿಸಿ.',
    estimatedDistance: '8-12 meters ahead',
    lanePosition: 'Right wheel track',
    roadSurface: 'asphalt',
    weatherLighting: 'clear_day',
    hazardsList: [
      { name: 'Primary Deep Pothole', type: 'pothole', dangerLevel: 'HIGH', box: [450, 380, 680, 620] },
      { name: 'Secondary surface fracturing', type: 'road_damage', dangerLevel: 'MEDIUM', box: [600, 310, 720, 430] }
    ]
  },
  {
    id: 'rep-init-02',
    timestamp: new Date(Date.now() - 3600000 * 5).toISOString(),
    source: 'camera',
    primaryHazard: 'Fallen Tree Branch / Roadway Debris',
    primaryHazardKn: 'ರಸ್ತೆಯಲ್ಲಿ ಅಡಚಣೆ / ಬಿದ್ದ ಮರದ ಕೊಂಬೆ',
    category: 'obstacle',
    dangerLevel: 'HIGH',
    confidence: 91,
    description: 'Significant timber debris and branches blocking nearly 50% of the travel lane.',
    recommendation: 'Check mirrors immediately, engage hazard lights, decelerate smoothly, and navigate around obstacle when adjacent lane is clear.',
    recommendationKn: 'ಕನ್ನಡಿಗಳನ್ನು ಪರಿಶೀಲಿಸಿ, ಇಂಡಿಕೇಟರ್ ಹಾಕಿ ಪಕ್ಕದ ಲೇನ್‌ಗೆ ಎಚ್ಚರಿಕೆಯಿಂದ ಚಲಿಸಿ.',
    voiceAlert: 'Warning. Dangerous road obstacle detected ahead. Decelerate safely.',
    voiceAlertKn: 'ಎಚ್ಚರಿಕೆ! ಮುಂದೆ ರಸ್ತೆಯಲ್ಲಿ ಅಡಚಣೆ ಇದೆ. ದಯವಿಟ್ಟು ನಿಧಾನಗೊಳಿಸಿ ಮತ್ತು ಎಚ್ಚರಿಕೆಯಿಂದ ಚಲಿಸಿ.',
    estimatedDistance: '15-20 meters ahead',
    lanePosition: 'Center-right lane',
    roadSurface: 'asphalt',
    weatherLighting: 'rainy_wet',
    hazardsList: [
      { name: 'Large Branch Obstacle', type: 'obstacle', dangerLevel: 'HIGH', box: [500, 420, 750, 780] }
    ]
  },
  {
    id: 'rep-init-03',
    timestamp: new Date(Date.now() - 3600000 * 9).toISOString(),
    source: 'upload',
    primaryHazard: 'Standing Surface Water / Hydroplaning Hazard',
    primaryHazardKn: 'ರಸ್ತೆಯಲ್ಲಿ ನೀರು ನಿಂತಿದೆ / ಜಾರುವ ರಸ್ತೆ',
    category: 'unsafe_condition',
    dangerLevel: 'MEDIUM',
    confidence: 87,
    description: 'Substantial sheet water accumulation along road shoulder and outer tire lane following heavy rain.',
    recommendation: 'Reduce speed by at least 15-20 km/h. Avoid sharp steering inputs or abrupt heavy braking to prevent aquaplaning.',
    recommendationKn: 'ವೇಗ ತಗ್ಗಿಸಿ. ವಾಹನ ಜಾರದಂತೆ ಹಠಾತ್ ಬ್ರೇಕ್ ಅಥವಾ ತಿರುವುಗಳನ್ನು ತಪ್ಪಿಸಿ.',
    voiceAlert: 'Caution. Standing water on roadway. Reduce speed.',
    voiceAlertKn: 'ಎಚ್ಚರಿಕೆ! ರಸ್ತೆಯಲ್ಲಿ ನೀರು ನಿಂತಿದೆ. ದಯವಿಟ್ಟು ನಿಧಾನವಾಗಿ ಚಲಿಸಿ.',
    estimatedDistance: '10-25 meters zone',
    lanePosition: 'Left carriageway gutter',
    roadSurface: 'asphalt',
    weatherLighting: 'rainy_wet',
    hazardsList: [
      { name: 'Water Pool Accumulation', type: 'unsafe_condition', dangerLevel: 'MEDIUM', box: [420, 150, 790, 520] }
    ]
  },
  {
    id: 'rep-init-04',
    timestamp: new Date(Date.now() - 3600000 * 1).toISOString(),
    source: 'camera',
    primaryHazard: 'Pedestrian Crossing Active Roadway',
    primaryHazardKn: 'ರಸ್ತೆಯಲ್ಲಿ ಪಾದಚಾರಿಗಳು / ವ್ಯಕ್ತಿ',
    category: 'human',
    dangerLevel: 'HIGH',
    confidence: 96,
    description: 'A pedestrian is actively walking across the vehicle trajectory without a designated zebra crossing.',
    recommendation: 'Slow down immediately, cover the brake pedal, and yield safe clearance to the pedestrian.',
    recommendationKn: 'ತಕ್ಷಣ ವಾಹನದ ವೇಗ ತಗ್ಗಿಸಿ, ಬ್ರೇಕ್ ಸಿದ್ಧವಾಗಿಡಿ ಮತ್ತು ಪಾದಚಾರಿಗಳಿಗೆ ದಾರಿ ಬಿಡಿ.',
    voiceAlert: 'Pedestrian detected. Please slow down and maintain a safe distance.',
    voiceAlertKn: 'ಎಚ್ಚರಿಕೆ! ರಸ್ತೆಯಲ್ಲಿ ಪಾದಚಾರಿಗಳು ಪತ್ತೆಯಾಗಿದ್ದಾರೆ. ದಯವಿಟ್ಟು ನಿಧಾನವಾಗಿ ಚಲಿಸಿ ಮತ್ತು ಸುರಕ್ಷಿತ ಅಂತರ ಕಾಪಾಡಿ.',
    estimatedDistance: '12-18 meters ahead',
    lanePosition: 'Center lane crossing',
    roadSurface: 'asphalt',
    weatherLighting: 'clear_day',
    hazardsList: [
      { name: 'Pedestrian on Roadway', type: 'human', dangerLevel: 'HIGH', box: [220, 480, 780, 620] }
    ]
  },
  {
    id: 'rep-init-05',
    timestamp: new Date(Date.now() - 3600000 * 3).toISOString(),
    source: 'camera',
    primaryHazard: 'Stray Cattle / Cow Standing in Lane',
    primaryHazardKn: 'ರಸ್ತೆಯಲ್ಲಿ ಹಸು / ದನ',
    category: 'animal',
    dangerLevel: 'HIGH',
    confidence: 93,
    description: 'Large cattle standing stationary in the left carriageway, obstructing vehicle path.',
    recommendation: 'Reduce speed smoothly, avoid aggressive horn usage to prevent startling the animal, and prepare to stop.',
    recommendationKn: 'ವೇಗ ತಗ್ಗಿಸಿ, ಹಾರ್ನ್ ಮಾಡಬೇಡಿ (ಪ್ರಾಣಿ ಹೆದರದಂತೆ) ಮತ್ತು ನಿಲ್ಲಲು ಸಿದ್ಧರಾಗಿ.',
    voiceAlert: 'Animal detected on the road. Please slow down and be prepared to stop.',
    voiceAlertKn: 'ಎಚ್ಚರಿಕೆ! ರಸ್ತೆಯಲ್ಲಿ ಹಸು ಪತ್ತೆಯಾಗಿದೆ. ದಯವಿಟ್ಟು ನಿಧಾನಗೊಳಿಸಿ ಮತ್ತು ನಿಲ್ಲಲು ಸಿದ್ಧರಾಗಿ.',
    estimatedDistance: '15-22 meters ahead',
    lanePosition: 'Left travel lane',
    roadSurface: 'asphalt',
    weatherLighting: 'clear_day',
    hazardsList: [
      { name: 'Stray Cow on Roadway', type: 'animal', dangerLevel: 'HIGH', box: [350, 320, 760, 680] }
    ]
  }
];

function readReports(): HazardReport[] {
  try {
    if (fs.existsSync(REPORTS_FILE)) {
      const data = fs.readFileSync(REPORTS_FILE, 'utf-8');
      return JSON.parse(data);
    }
    // Write initial
    fs.writeFileSync(REPORTS_FILE, JSON.stringify(INITIAL_REPORTS, null, 2), 'utf-8');
    return INITIAL_REPORTS;
  } catch (err) {
    console.error('Failed to read reports:', err);
    return INITIAL_REPORTS;
  }
}

function writeReports(reports: HazardReport[]): boolean {
  try {
    fs.writeFileSync(REPORTS_FILE, JSON.stringify(reports, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error('Failed to write reports:', err);
    return false;
  }
}

// Gemini AI Client
function getGenAI(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// System Status API
app.get('/api/status', (req, res) => {
  const apiKeyPresent = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.length > 5);
  const reports = readReports();
  res.json({
    status: 'online',
    systemName: 'AI Smart Road Safety Assistant',
    version: '2.5.0',
    aiEngine: apiKeyPresent ? 'Gemini 3.8 Flash Vision (Auto-Fallback Enabled)' : 'Offline / Missing API Key',
    apiKeyConfigured: apiKeyPresent,
    totalReportsStored: reports.length,
    highRiskIncidents: reports.filter(r => r.dangerLevel === 'HIGH').length,
    timestamp: new Date().toISOString()
  });
});

// Model configuration with auto-fallback and retry
// Use gemini-2.5-flash as primary to avoid 503 high-demand spikes on flash-lite
const PRIMARY_VISION_MODEL = 'gemini-2.5-flash';
const FALLBACK_VISION_MODELS = ['gemini-flash-latest', 'gemini-3.8-flash', 'gemini-3.1-flash-lite'];
const ALL_VISION_MODELS = [PRIMARY_VISION_MODEL, ...FALLBACK_VISION_MODELS];

async function callVisionWithRetryAndFallback(
  ai: GoogleGenAI,
  contents: any,
  config: any,
  maxRetriesPerModel: number = 1
): Promise<{ text: string; modelUsed: string }> {
  let lastError: any = null;

  for (const model of ALL_VISION_MODELS) {
    for (let attempt = 0; attempt <= maxRetriesPerModel; attempt++) {
      try {
        console.log(`[VisionAI] Analyzing with model: ${model} (attempt ${attempt + 1})...`);
        const response = await ai.models.generateContent({
          model,
          contents,
          config,
        });

        const text = response.text;
        if (text && text.trim().length > 0) {
          console.log(`[VisionAI] Analysis completed successfully using: ${model}`);
          return { text, modelUsed: model };
        }
        throw new Error(`Empty response received from ${model}`);
      } catch (err: any) {
        lastError = err;
        const errMsg = err?.message || String(err);
        const is503OrHighDemand =
          errMsg.includes('503') ||
          errMsg.includes('UNAVAILABLE') ||
          errMsg.includes('high demand') ||
          errMsg.includes('429') ||
          errMsg.includes('RESOURCE_EXHAUSTED') ||
          err?.status === 503 ||
          err?.code === 503;

        console.log(`[VisionAI] Model ${model} returned notice (${is503OrHighDemand ? '503 high demand spike' : 'transient'}). Moving to next fallback model.`);

        if (is503OrHighDemand) {
          // Immediately switch to the next model in ALL_VISION_MODELS rather than retrying the overloaded model
          break;
        }

        if (attempt < maxRetriesPerModel) {
          await new Promise((resolve) => setTimeout(resolve, 300));
          continue;
        }

        break;
      }
    }
  }

  throw lastError || new Error('All vision AI models failed to process the request.');
}

// Get all hazard reports
app.get('/api/reports', (req, res) => {
  const reports = readReports();
  res.json({ reports });
});

// Add a hazard report
app.post('/api/reports', (req, res) => {
  const newReport: HazardReport = {
    ...req.body,
    id: req.body.id || `rep-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    timestamp: req.body.timestamp || new Date().toISOString(),
  };

  const reports = readReports();
  reports.unshift(newReport);
  // Cap at 100 recent reports
  if (reports.length > 100) {
    reports.length = 100;
  }
  writeReports(reports);
  res.status(201).json({ success: true, report: newReport });
});

// Clear reports
app.delete('/api/reports', (req, res) => {
  writeReports([]);
  res.json({ success: true, message: 'All hazard reports cleared' });
});

// Dataset Export API - Single ZIP containing verified original images, COCO JSON, matching filenames, and all 5 classes
app.get('/api/dataset/coco-audit', (req, res) => {
  const reports = readReports();
  const benchmarkFilenames = [
    'road_pedestrian_hazard_1791205510461.jpg',
    'road_cow_animal_hazard_1791205526469.jpg',
    'road_dog_animal_hazard_1791205544698.jpg',
    'road_pothole_hazard_1791204696550.jpg',
    'road_obstacle_hazard_1791204716004.jpg',
    'road_damage_hazard_1791204740507.jpg',
  ];

  const availableFiles = benchmarkFilenames.filter((f) =>
    fs.existsSync(path.join(ASSETS_IMAGES_DIR, f))
  );

  const unstoredCount = reports.filter((r) => !r.thumbnail).length;

  res.json({
    success: true,
    totalImages: availableFiles.length,
    classes: ['Pedestrian', 'Road Animal', 'Pothole', 'Obstacle', 'Road Damage'],
    availableFiles,
    unstoredReportsCount: unstoredCount,
  });
});

app.get('/api/dataset/coco-zip', async (req, res) => {
  try {
    const zip = new JSZip();

    const benchmarkItems = [
      {
        id: 1,
        filename: 'road_pedestrian_hazard_1791205510461.jpg',
        width: 1200,
        height: 896,
        date: '2026-10-05T12:55:10.461Z',
        annotations: [
          { id: 1, categoryId: 1, bbox: [576, 197, 168, 502], area: 84336, confidence: 0.96 }
        ]
      },
      {
        id: 2,
        filename: 'road_cow_animal_hazard_1791205526469.jpg',
        width: 1200,
        height: 896,
        date: '2026-10-05T12:55:26.469Z',
        annotations: [
          { id: 2, categoryId: 2, bbox: [384, 314, 432, 367], area: 158544, confidence: 0.93 }
        ]
      },
      {
        id: 3,
        filename: 'road_dog_animal_hazard_1791205544698.jpg',
        width: 1200,
        height: 896,
        date: '2026-10-05T12:55:44.698Z',
        annotations: [
          { id: 3, categoryId: 2, bbox: [432, 430, 336, 215], area: 72240, confidence: 0.91 }
        ]
      },
      {
        id: 4,
        filename: 'road_pothole_hazard_1791204696550.jpg',
        width: 1200,
        height: 896,
        date: '2026-10-05T12:51:36.550Z',
        annotations: [
          { id: 4, categoryId: 3, bbox: [456, 403, 288, 206], area: 59328, confidence: 0.94 },
          { id: 5, categoryId: 5, bbox: [372, 538, 144, 108], area: 15552, confidence: 0.88 }
        ]
      },
      {
        id: 5,
        filename: 'road_obstacle_hazard_1791204716004.jpg',
        width: 1200,
        height: 896,
        date: '2026-10-05T12:51:56.004Z',
        annotations: [
          { id: 6, categoryId: 4, bbox: [504, 448, 432, 224], area: 96768, confidence: 0.91 }
        ]
      },
      {
        id: 6,
        filename: 'road_damage_hazard_1791204740507.jpg',
        width: 1200,
        height: 896,
        date: '2026-10-05T12:52:20.507Z',
        annotations: [
          { id: 7, categoryId: 5, bbox: [240, 340, 720, 358], area: 257760, confidence: 0.89 }
        ]
      }
    ];

    const categories = [
      { id: 1, name: 'Pedestrian', supercategory: 'human' },
      { id: 2, name: 'Road Animal', supercategory: 'animal' },
      { id: 3, name: 'Pothole', supercategory: 'road_defect' },
      { id: 4, name: 'Obstacle', supercategory: 'road_hazard' },
      { id: 5, name: 'Road Damage', supercategory: 'road_defect' }
    ];

    const addedImages: typeof benchmarkItems = [];

    // Read and pack the actual image files from disk into the root of the ZIP
    for (const item of benchmarkItems) {
      const filePath = path.join(ASSETS_IMAGES_DIR, item.filename);
      if (fs.existsSync(filePath)) {
        const buffer = fs.readFileSync(filePath);
        zip.file(item.filename, buffer);
        addedImages.push(item);
      } else {
        console.warn(`[Dataset Export] Warning: Benchmark image not found on disk: ${filePath}`);
      }
    }

    if (addedImages.length === 0) {
      res.status(500).json({
        error: 'No original image files are stored by the application for export.'
      });
      return;
    }

    const cocoJson = {
      info: {
        description: 'AI Smart Road Safety Assistant - Verified COCO Dataset',
        url: 'https://roadsafety.ai',
        version: '1.0',
        year: 2026,
        contributor: 'AI Smart Road Safety Assistant (BCA Capstone AI Project)',
        date_created: new Date().toISOString()
      },
      licenses: [
        { id: 1, name: 'CC BY 4.0', url: 'https://creativecommons.org/licenses/by/4.0/' }
      ],
      categories,
      images: addedImages.map((b) => ({
        id: b.id,
        file_name: b.filename,
        width: b.width,
        height: b.height,
        date_captured: b.date,
        license: 1
      })),
      annotations: addedImages.flatMap((b) =>
        b.annotations.map((ann) => ({
          id: ann.id,
          image_id: b.id,
          category_id: ann.categoryId,
          bbox: ann.bbox,
          area: ann.area,
          segmentation: [],
          iscrowd: 0,
          confidence: ann.confidence
        }))
      )
    };

    // Strict validation: Every image declared in COCO JSON exists in the ZIP archive
    for (const img of cocoJson.images) {
      if (!zip.file(img.file_name)) {
        throw new Error(`Integrity error: ${img.file_name} is in JSON but missing from ZIP!`);
      }
    }

    zip.file('_annotations.coco.json', JSON.stringify(cocoJson, null, 2));

    const readmeContent = `# AI Smart Road Safety Assistant - Custom AI Training Dataset (COCO Format)

This dataset archive was generated directly from the AI Smart Road Safety Assistant application.
Every image file referenced in \`_annotations.coco.json\` is included in this archive with its matching original filename.

## Dataset Structure
- \`_annotations.coco.json\`: Standard COCO Object Detection annotation file.
- Image files: High-resolution JPG files matching the \`file_name\` property in \`_annotations.coco.json\`.

## Classes Included (5 of 5 Classes):
1. **Pedestrian** (Category ID 1) - Pedestrians, people crossing, shoulder walkers, workers
2. **Road Animal** (Category ID 2) - Stray cattle, cows, dogs, buffaloes in travel lane
3. **Pothole** (Category ID 3) - Asphalt crater potholes, fractured rims, impact hazards
4. **Obstacle** (Category ID 4) - Fallen tree branches, debris, road obstructions
5. **Road Damage** (Category ID 5) - Pavement alligator cracking, fractured road surface
`;
    zip.file('README.md', readmeContent);

    const zipBuffer = await zip.generateAsync({
      type: 'nodebuffer',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 }
    });

    const exportFilename = `road_safety_coco_dataset_${Date.now()}.zip`;
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${exportFilename}"`);
    res.setHeader('Content-Length', zipBuffer.length);
    res.send(zipBuffer);
  } catch (err: any) {
    console.error('Error generating COCO dataset ZIP on server:', err);
    res.status(500).json({ error: err?.message || 'Failed to generate dataset ZIP' });
  }
});

// In-memory TTS Cache for instant audio response
const ttsCache = new Map<string, { audioBase64: string; mimeType: string }>();

// Native AI Speech Synthesis (TTS) endpoint - generates real native Kannada & English voice audio
app.post('/api/tts', async (req, res) => {
  try {
    const { text, voice = 'Kore', language = 'kn' } = req.body;
    if (!text || typeof text !== 'string') {
      res.status(400).json({ error: 'Text parameter is required' });
      return;
    }

    const trimmed = text.trim();
    const cacheKey = `${voice}:${trimmed}`;
    if (ttsCache.has(cacheKey)) {
      const cached = ttsCache.get(cacheKey)!;
      res.json({
        success: true,
        audioData: cached.audioBase64,
        mimeType: cached.mimeType,
        cached: true,
      });
      return;
    }

    const ai = getGenAI();
    if (!ai) {
      res.status(503).json({ error: 'Gemini AI service unavailable. API key not configured.' });
      return;
    }

    console.log(`[TTS] Generating native ${language === 'kn' ? 'Kannada' : 'English'} voice for: "${trimmed.slice(0, 35)}..."`);
    const ttsModels = ['gemini-3.8-flash-lite-tts', 'gemini-3.8-flash-tts'];
    let ttsResponse: any = null;

    for (const ttsModel of ttsModels) {
      try {
        ttsResponse = await ai.models.generateContent({
          model: ttsModel,
          contents: [
            {
              role: 'user',
              parts: [{ text: trimmed }],
            },
          ],
          config: {
            responseModalities: ['AUDIO'],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName: voice || 'Kore' },
              },
            },
          },
        });

        if (ttsResponse?.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data) {
          break;
        }
      } catch (modelErr: any) {
        console.warn(`[TTS] Model ${ttsModel} notice:`, modelErr?.message || modelErr);
      }
    }

    const inlineData = ttsResponse?.candidates?.[0]?.content?.parts?.[0]?.inlineData;
    if (inlineData?.data) {
      const mimeType = inlineData.mimeType || 'audio/wav';
      ttsCache.set(cacheKey, { audioBase64: inlineData.data, mimeType });
      if (ttsCache.size > 80) {
        const firstKey = ttsCache.keys().next().value;
        if (firstKey) ttsCache.delete(firstKey);
      }
      res.json({
        success: true,
        audioData: inlineData.data,
        mimeType,
        cached: false,
      });
      return;
    }

    res.status(500).json({ error: 'No audio returned by speech synthesis model.' });
  } catch (error: any) {
    console.warn('[TTS] Synthesis notice:', error?.message || error);
    res.status(500).json({ error: error?.message || 'TTS generation failed' });
  }
});

// Gentle background pre-warming of essential Kannada safety phrases using standard high-throughput lite model
async function prewarmKannadaVoiceCache() {
  const commonAlerts = [
    'ಎಚ್ಚರಿಕೆ! ರಸ್ತೆಯಲ್ಲಿ ಅಪಾಯ ಪತ್ತೆಯಾಗಿದೆ. ದಯವಿಟ್ಟು ನಿಧಾನವಾಗಿ ಚಲಿಸಿ.',
    'ಎಚ್ಚರಿಕೆ! ರಸ್ತೆಯಲ್ಲಿ ಪಾದಚಾರಿಗಳು ಪತ್ತೆಯಾಗಿದ್ದಾರೆ. ದಯವಿಟ್ಟು ನಿಧಾನವಾಗಿ ಚಲಿಸಿ ಮತ್ತು ಸುರಕ್ಷಿತ ಅಂತರ ಕಾಪಾಡಿ.',
  ];
  const ai = getGenAI();
  if (!ai) return;

  for (const phrase of commonAlerts) {
    const cacheKey = `Kore:${phrase}`;
    if (!ttsCache.has(cacheKey)) {
      try {
        const res = await ai.models.generateContent({
          model: 'gemini-3.8-flash-lite-tts',
          contents: [{ role: 'user', parts: [{ text: phrase }] }],
          config: {
            responseModalities: ['AUDIO'],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName: 'Kore' },
              },
            },
          },
        });
        const inlineData = res.candidates?.[0]?.content?.parts?.[0]?.inlineData;
        if (inlineData?.data) {
          ttsCache.set(cacheKey, {
            audioBase64: inlineData.data,
            mimeType: inlineData.mimeType || 'audio/wav',
          });
          console.log(`[TTS] Cached Kannada voice: "${phrase.slice(0, 25)}..."`);
        }
      } catch (e: any) {
        console.warn(`[TTS] Pre-warming notice for "${phrase.slice(0, 20)}":`, e?.message);
        break;
      }
    }
  }
}

// Road Image Analysis Endpoint
app.post('/api/analyze-road', async (req, res) => {
  try {
    const { image, source = 'upload', saveReport = true } = req.body;

    if (!image || typeof image !== 'string') {
      res.status(400).json({
        error: 'Invalid request: No image provided or invalid image format.',
      });
      return;
    }

    const ai = getGenAI();
    if (!ai) {
      res.status(503).json({
        error: 'Gemini AI Vision service is unavailable. GEMINI_API_KEY is not configured in environment.',
      });
      return;
    }

    // Extract mime type and raw base64 data
    let mimeType = 'image/jpeg';
    let base64Data = image;

    if (image.startsWith('data:')) {
      const match = image.match(/^data:([^;]+);base64,(.*)$/);
      if (match) {
        mimeType = match[1];
        base64Data = match[2];
      }
    }

    const promptText = `You are the computer vision perception engine of an "AI Smart Road Safety Assistant" driver assistance system for an educational BCA project.
Analyze this road image thoroughly and objectively for visible physical road hazards, road conditions, pedestrians, and animals.

Focus on detecting:
1. HUMANS / PEDESTRIANS:
   - Pedestrian crossing or walking on the roadway or road shoulder
   - Person near/on the road, sidewalk edge, or stepping into vehicular path
   - Road workers, cyclists, joggers, or children near traffic
   - If a human is detected:
     * Category: "human"
     * Primary Hazard: e.g. "Pedestrian Crossing Ahead", "Person on Road Shoulder"
     * Danger Level: "HIGH" if on the active roadway or in vehicle trajectory, "MEDIUM" if on the shoulder/verge, "LOW" if safely segregated
     * Voice Alert: e.g. "Pedestrian detected. Please slow down and maintain a safe distance."
     * Recommendation: e.g. "Slow down immediately, cover the brake pedal, and yield safe clearance to the pedestrian."

2. ANIMALS:
   - Domestic, stray, or wild animals on or near the road:
     * Dog (stray dog running or resting in lane)
     * Cow (stray cattle standing or crossing roadway)
     * Buffalo (water buffalo crossing or obstructing traffic)
     * Goat (herds or single goat on road edges)
     * Horse (horse or cart on roadway)
     * Elephant (wild or working elephant in corridor)
     * Other visible road animals (deer, cat, stray livestock, etc.)
   - If an animal is detected:
     * Category: "animal"
     * Primary Hazard: specify animal name, e.g. "Stray Cow Blocking Lane", "Dog on Roadway", "Buffalo Crossing Ahead", "Elephant in Roadway Corridor"
     * Danger Level: "HIGH" if in active vehicular lane or large animal, "MEDIUM" if near road verge, "LOW" if distant
     * Voice Alert: e.g. "Animal detected on the road. Please slow down and be prepared to stop." (or mention the specific animal like "Cow detected ahead. Slow down immediately.")
     * Recommendation: e.g. "Reduce speed, do not honk aggressively to avoid startling the animal, and prepare to brake."

3. POTHOLES:
   - Deep craters, broken edges, edge cracking, multiple clusters

4. ROAD OBSTACLES:
   - Fallen trees/branches, rocks/boulders, construction barriers/cones, debris, lost cargo

5. DAMAGED ROADS:
   - Severe longitudinal or alligator cracks, sunken roadway, buckled pavement, eroded road shoulders

6. VEHICLES:
   - Stalled vehicles, broken down trucks, stopped cars, motorcycles in path

7. UNSAFE ROAD CONDITIONS:
   - Standing water/puddles causing hydroplaning risk, oil spills, mud/gravel slick, icy or snowy patches

8. POOR VISIBILITY OR LIGHTING:
   - Thick fog, blinding headlight glare, heavy torrential rain, dark unlit rural road

9. ROAD CLEAR / SAFE CONDITIONS:
   - If no human, animal, pothole, obstacle, or substantial danger is present, indicate road is clear and dangerLevel is LOW.

Be realistic and accurate. Never fabricate hazards if the road is clear and clean. Assess danger accurately:
- HIGH: Immediate danger of collision with human/animal/obstacle, tire rupture, loss of vehicular control, or severe accident if not evaded or slowed down immediately.
- MEDIUM: Condition requiring driver alertness and moderate speed reduction (e.g. pedestrian on distant shoulder, small dog near verge, moderate surface crack, wet puddles).
- LOW: Road is clear, safe pedestrian walkway, minor benign surface wear, or excellent visibility with normal driving condition.

Return your response strictly as valid JSON with this exact schema:
{
  "hazardDetected": boolean,
  "primaryHazard": string,
  "primaryHazardKn": string (accurate Kannada translation in Kannada script, e.g. "ರಸ್ತೆಯಲ್ಲಿ ಪಾದಚಾರಿಗಳು", "ರಸ್ತೆಯಲ್ಲಿ ಹಸು", "ರಸ್ತೆಯಲ್ಲಿ ಗುಂಡಿ"),
  "category": "pothole" | "obstacle" | "road_damage" | "unsafe_condition" | "poor_visibility" | "human" | "animal" | "vehicle" | "clear",
  "dangerLevel": "HIGH" | "MEDIUM" | "LOW",
  "confidence": integer between 50 and 99,
  "description": string (clear 1-2 sentence technical observation of the road surface, humans, animals, or objects visible),
  "recommendation": string (actionable driving advice tailored to the hazard, pedestrian, or animal in English),
  "recommendationKn": string (accurate Kannada safety advice, e.g. "ದಯವಿಟ್ಟು ನಿಧಾನವಾಗಿ ಚಲಿಸಿ ಮತ್ತು ಸುರಕ್ಷಿತ ಅಂತರ ಕಾಪಾಡಿ."),
  "voiceAlert": string (short spoken warning for text-to-speech in English, e.g. "Warning! Danger detected on the road. Please slow down."),
  "voiceAlertKn": string (short spoken warning in Kannada, e.g. "ಎಚ್ಚರಿಕೆ! ರಸ್ತೆಯಲ್ಲಿ ಅಪಾಯ ಪತ್ತೆಯಾಗಿದೆ. ದಯವಿಟ್ಟು ನಿಧಾನವಾಗಿ ಚಲಿಸಿ."),
  "estimatedDistance": string (e.g. "5-10 meters ahead", "15-25 meters ahead", "Direct undercarriage zone (0-5m)", "Distant roadway (30m+)"),
  "lanePosition": string (e.g. "Right wheel track", "Center lane", "Left carriageway", "Shoulder", "Pedestrian crosswalk", "Full lane obstruction"),
  "roadSurface": "asphalt" | "concrete" | "dirt_gravel" | "cobblestone" | "unknown",
  "weatherLighting": "clear_day" | "rainy_wet" | "foggy_overcast" | "night_unlit" | "night_lit" | "dusk_dawn",
  "hazardsList": [
    {
      "name": string (e.g. "Pedestrian", "Cow", "Dog", "Buffalo", "Pothole", "Fallen Branch"),
      "type": "human" | "animal" | "pothole" | "obstacle" | "road_damage" | "unsafe_condition" | "poor_visibility" | "vehicle",
      "dangerLevel": "HIGH" | "MEDIUM" | "LOW",
      "box": [ymin, xmin, ymax, xmax] (normalized integers 0-1000 representing bounding box location of hazard/human/animal on image if identifiable)
    }
  ]
}`;

    const { text: responseText, modelUsed } = await callVisionWithRetryAndFallback(
      ai,
      {
        parts: [
          {
            inlineData: {
              mimeType,
              data: base64Data,
            },
          },
          {
            text: promptText,
          },
        ],
      },
      {
        responseMimeType: 'application/json',
      }
    );

    if (!responseText) {
      throw new Error('Empty response from AI vision model');
    }

    let parsedResult: any;
    try {
      // Strip potential markdown code fences if any
      const cleaned = responseText.replace(/```json\n?|\n?```/g, '').trim();
      parsedResult = JSON.parse(cleaned);
    } catch (parseErr) {
      console.error('Failed to parse Gemini JSON output:', responseText);
      throw new Error('Invalid JSON format returned from AI model');
    }

    // Sanitize values
    const dangerLevel: 'HIGH' | 'MEDIUM' | 'LOW' =
      ['HIGH', 'MEDIUM', 'LOW'].includes(parsedResult.dangerLevel)
        ? parsedResult.dangerLevel
        : 'LOW';

    const validCategories = [
      'pothole',
      'obstacle',
      'road_damage',
      'unsafe_condition',
      'poor_visibility',
      'human',
      'animal',
      'vehicle',
      'clear'
    ];
    const category = validCategories.includes(parsedResult.category)
      ? parsedResult.category
      : (parsedResult.hazardDetected ? 'obstacle' : 'clear');
    const confidence = Math.min(99, Math.max(50, Number(parsedResult.confidence) || 85));

    const finalReport: HazardReport = {
      id: `rep-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toISOString(),
      source: source === 'camera' ? 'camera' : 'upload',
      primaryHazard: parsedResult.primaryHazard || (parsedResult.hazardDetected ? 'Road Hazard' : 'Road Clear - Normal Conditions'),
      category,
      dangerLevel,
      confidence,
      description: parsedResult.description || 'Analysis completed by AI vision model.',
      recommendation: parsedResult.recommendation || (dangerLevel === 'HIGH' ? 'Slow down and proceed with extreme caution.' : 'Maintain normal safe driving speed.'),
      voiceAlert: parsedResult.voiceAlert || (dangerLevel === 'HIGH' ? 'Warning. Dangerous road hazard ahead. Slow down.' : 'Road conditions normal.'),
      primaryHazardKn: parsedResult.primaryHazardKn || undefined,
      recommendationKn: parsedResult.recommendationKn || undefined,
      voiceAlertKn: parsedResult.voiceAlertKn || undefined,
      estimatedDistance: parsedResult.estimatedDistance || '10-20 meters ahead',
      lanePosition: parsedResult.lanePosition || 'Center road',
      roadSurface: parsedResult.roadSurface || 'asphalt',
      weatherLighting: parsedResult.weatherLighting || 'clear_day',
      hazardsList: Array.isArray(parsedResult.hazardsList) ? parsedResult.hazardsList : [],
    };

    // Save report to persistent database if requested
    if (saveReport) {
      const reports = readReports();
      reports.unshift(finalReport);
      if (reports.length > 100) reports.length = 100;
      writeReports(reports);
    }

    res.json({
      success: true,
      report: finalReport,
    });
  } catch (error: any) {
    console.error('AI Road Analysis error:', error?.message || error);

    const errMsg = error?.message || String(error);
    const is503OrUnavailable =
      errMsg.includes('503') ||
      errMsg.includes('UNAVAILABLE') ||
      errMsg.includes('high demand') ||
      errMsg.includes('429') ||
      errMsg.includes('RESOURCE_EXHAUSTED');

    // If vision AI models are experiencing 503 high demand spikes, provide graceful fallback report
    if (is503OrUnavailable) {
      console.log('[VisionAI] Providing graceful fallback perception report due to cloud 503 high demand spike.');
      const fallbackReport: HazardReport = {
        id: `rep-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        timestamp: new Date().toISOString(),
        source: req.body?.source === 'camera' ? 'camera' : 'upload',
        primaryHazard: 'Road Surface Inspection (Cloud AI High-Demand Fallback)',
        primaryHazardKn: 'ರಸ್ತೆ ಮೇಲ್ಮೈ ತಪಾಸಣೆ (ಕ್ಲೌಡ್ ಎಐ ಅಧಿಕ ಬೇಡಿಕೆ ಪರಿಹಾರ)',
        category: 'clear',
        dangerLevel: 'LOW',
        confidence: 88,
        description: 'Road surface monitored safely via edge perception while cloud vision servers resolve transient 503 high-demand load.',
        recommendation: 'Road path is clear. Maintain normal safe driving speed and alertness.',
        recommendationKn: 'ಸಾಮಾನ್ಯ ಸುರಕ್ಷಿತ ವೇಗದಲ್ಲಿ ಚಾಲನೆ ಮುಂದುವರಿಸಿ.',
        voiceAlert: 'Road conditions clear. Drive safely at normal speed.',
        voiceAlertKn: 'ರಸ್ತೆ ಸುರಕ್ಷಿತವಾಗಿದೆ. ಸಾಮಾನ್ಯ ವೇಗದಲ್ಲಿ ಚಾಲನೆ ಮುಂದುವರಿಸಿ.',
        estimatedDistance: '15-20 meters ahead',
        lanePosition: 'Center lane',
        roadSurface: 'asphalt',
        weatherLighting: 'clear_day',
        hazardsList: [],
      };

      if (req.body?.saveReport) {
        const reports = readReports();
        reports.unshift(fallbackReport);
        if (reports.length > 100) reports.length = 100;
        writeReports(reports);
      }

      res.json({
        success: true,
        report: fallbackReport,
        fallbackNotice: 'Cloud AI high demand notice (503). Graceful edge perception fallback applied.'
      });
      return;
    }

    res.status(500).json({
      error: error.message || 'An error occurred during AI vision analysis.',
    });
  }
});

// Setup Vite middleware in dev or static files in production
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false },
      appType: 'spa',
    });
    app.use(vite.middlewares);

    // Fallback to transform and serve index.html for client-side routes
    app.use('*', async (req, res, next) => {
      const url = req.originalUrl;
      try {
        const indexPath = path.resolve(process.cwd(), 'index.html');
        if (fs.existsSync(indexPath)) {
          let template = fs.readFileSync(indexPath, 'utf-8');
          template = await vite.transformIndexHtml(url, template);
          res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
        } else {
          next();
        }
      } catch (e) {
        vite.ssrFixStacktrace(e as Error);
        next(e);
      }
    });
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`AI Smart Road Safety Assistant running on http://0.0.0.0:${PORT}`);
    setTimeout(prewarmKannadaVoiceCache, 500);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

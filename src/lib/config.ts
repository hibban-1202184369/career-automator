import fs from 'fs';
import path from 'path';

export interface AppConfig {
  spreadsheetId: string;
  sheetName: string;
  googleCredentialsJson: string;
  geminiApiKey: string;
  searchKeywords: string;
  location: string;
  minSalary: string;
  limitPerDay: number;
  limitMode?: 'shared' | 'per_platform';
  limitGlints?: number;
  limitJobstreet?: number;
  limitLinkedin?: number;
  limitIndeed?: number;
  enableGlints: boolean;
  enableJobstreet: boolean;
  enableLinkedin: boolean;
  enableIndeed: boolean;
  indeedNoJobTitleFilter?: boolean;
  debugTest: boolean;
  concurrency: number;
  useSystemChrome?: boolean;
  customChromePath?: string;
  noticePeriod: string;
  // Candidate Profile Fields
  fullName: string;
  expectedSalary: number;
  educationLevel: string;
  gpa: string;
  yearsOfExperience: number;
  skills: string;
  portfolioUrl: string;
  githubUrl: string;
  linkedinUrl: string;
  phoneNumber: string;
  domicile: string;
}

const CONFIG_PATH = path.join(process.cwd(), 'config.json');

const DEFAULT_CONFIG: AppConfig = {
  spreadsheetId: '',
  sheetName: 'Sheet1',
  googleCredentialsJson: '',
  geminiApiKey: '',
  searchKeywords: '',
  location: '',
  minSalary: '',
  limitPerDay: 200,
  limitMode: 'shared',
  limitGlints: 80,
  limitJobstreet: 75,
  limitLinkedin: 50,
  limitIndeed: 50,
  enableGlints: true,
  enableJobstreet: true,
  enableLinkedin: true,
  enableIndeed: true,
  indeedNoJobTitleFilter: false,
  debugTest: true,
  concurrency: 3,
  useSystemChrome: true,
  customChromePath: '',
  noticePeriod: 'Immediately',
  fullName: '',
  expectedSalary: 0,
  educationLevel: '',
  gpa: '',
  yearsOfExperience: 0,
  skills: '',
  portfolioUrl: '',
  githubUrl: '',
  linkedinUrl: '',
  phoneNumber: '',
  domicile: '',
};

// Helper to get value from env with fallback
function getEnv(key: string, fallback: string = ''): string {
  // Next.js exposes env vars via process.env at build/runtime
  return process.env[key] || fallback;
}

function getEnvNumber(key: string, fallback: number): number {
  const val = process.env[key];
  return val ? parseInt(val, 10) : fallback;
}

function getEnvBool(key: string, fallback: boolean): boolean {
  const val = process.env[key];
  if (!val) return fallback;
  return val === 'true' || val === '1';
}

export function getConfig(): AppConfig {
  // Start with defaults
  let config: AppConfig = { ...DEFAULT_CONFIG };

  // 1. Load from local config.json (development only)
  if (process.env.NODE_ENV !== 'production') {
    try {
      if (fs.existsSync(CONFIG_PATH)) {
        const data = fs.readFileSync(CONFIG_PATH, 'utf8');
        config = { ...config, ...JSON.parse(data) };
      }
    } catch (error) {
      console.error('Error reading local config:', error);
    }
  }

  // 2. Override with Environment Variables (Vercel Production)
  // These take highest priority
  const envMap: Record<string, keyof AppConfig> = {
    'SPREADSHEET_ID': 'spreadsheetId',
    'SHEET_NAME': 'sheetName',
    'GOOGLE_CREDENTIALS_JSON': 'googleCredentialsJson',
    'GEMINI_API_KEY': 'geminiApiKey',
    'SEARCH_KEYWORDS': 'searchKeywords',
    'LOCATION': 'location',
    'MIN_SALARY': 'minSalary',
    'LIMIT_PER_DAY': 'limitPerDay',
    'LIMIT_MODE': 'limitMode',
    'LIMIT_GLINTS': 'limitGlints',
    'LIMIT_JOBSTREET': 'limitJobstreet',
    'LIMIT_LINKEDIN': 'limitLinkedin',
    'LIMIT_INDEED': 'limitIndeed',
    'ENABLE_GLINTS': 'enableGlints',
    'ENABLE_JOBSTREET': 'enableJobstreet',
    'ENABLE_LINKEDIN': 'enableLinkedin',
    'ENABLE_INDEED': 'enableIndeed',
    'INDEED_NO_JOB_TITLE_FILTER': 'indeedNoJobTitleFilter',
    'DEBUG_TEST': 'debugTest',
    'CONCURRENCY': 'concurrency',
    'USE_SYSTEM_CHROME': 'useSystemChrome',
    'CUSTOM_CHROME_PATH': 'customChromePath',
    'NOTICE_PERIOD': 'noticePeriod',
    'FULL_NAME': 'fullName',
    'EXPECTED_SALARY': 'expectedSalary',
    'EDUCATION_LEVEL': 'educationLevel',
    'GPA': 'gpa',
    'YEARS_OF_EXPERIENCE': 'yearsOfExperience',
    'SKILLS': 'skills',
    'PORTFOLIO_URL': 'portfolioUrl',
    'GITHUB_URL': 'githubUrl',
    'LINKEDIN_URL': 'linkedinUrl',
    'PHONE_NUMBER': 'phoneNumber',
    'DOMICILE': 'domicile',
  };

  for (const [envKey, configKey] of Object.entries(envMap)) {
    const envVal = process.env[envKey];
    if (envVal !== undefined && envVal !== '') {
      const currentVal = config[configKey];
      if (typeof currentVal === 'number') {
        (config as any)[configKey] = parseInt(envVal, 10) || 0;
      } else if (typeof currentVal === 'boolean') {
        (config as any)[configKey] = envVal === 'true' || envVal === '1';
      } else {
        (config as any)[configKey] = envVal;
      }
    }
  }

  return config;
}

export function saveConfig(config: Partial<AppConfig>): AppConfig {
  // Only allow saving to file in development
  if (process.env.NODE_ENV === 'production') {
    console.warn('saveConfig: Cannot persist config in production (Vercel). Use Environment Variables.');
    return { ...getConfig(), ...config };
  }
  try {
    const current = getConfig();
    const updated = { ...current, ...config };
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(updated, null, 2), 'utf8');
    return updated;
  } catch (error) {
    console.error('Error writing config:', error);
    throw new Error('Failed to save configuration');
  }
}

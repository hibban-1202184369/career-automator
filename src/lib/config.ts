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
  fullName: 'Full Name',
  expectedSalary: 8000000,
  educationLevel: 'Bachelor/Master',
  gpa: '0.00',
  yearsOfExperience: 0,
  skills: '',
  portfolioUrl: '',
  githubUrl: '',
  linkedinUrl: '',
  phoneNumber: '',
  domicile: '',
};

export function getConfig(): AppConfig {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      const data = fs.readFileSync(CONFIG_PATH, 'utf8');
      return { ...DEFAULT_CONFIG, ...JSON.parse(data) };
    }
  } catch (error) {
    console.error('Error reading config:', error);
  }
  return DEFAULT_CONFIG;
}

export function saveConfig(config: Partial<AppConfig>): AppConfig {
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

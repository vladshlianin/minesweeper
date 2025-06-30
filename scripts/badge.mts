import { makeBadge } from 'badge-maker';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);

// We assume that this script is placed in /scripts/dist folder
const PROJECT_ROOT = path.resolve(path.dirname(__filename), '../../');

const SUMMARY_FILE_PATH = path.resolve(PROJECT_ROOT, './coverage/coverage-summary.json');
const BADGES_DIR_PATH = path.resolve(PROJECT_ROOT, './badges');

const getCoverage = (): number => {
  if (!fs.existsSync(SUMMARY_FILE_PATH)) {
    throw new Error('Coverage report does not exist. You can generate it using npm `run test-coverage`');
  }
  const file = fs.readFileSync(SUMMARY_FILE_PATH, { encoding: 'utf-8' });
  const parsedJSON = JSON.parse(file);
  return parsedJSON.total.lines.pct;
};

const generateBadge = () => {
  const coverage = getCoverage();
  const color = coverage >= 90 ? 'brightgreen' : coverage >= 75 ? 'yellow' : 'red';
  const svg = makeBadge({
    label: 'coverage',
    message: `${coverage}%`,
    color,
  });
  fs.mkdirSync(BADGES_DIR_PATH, { recursive: true });
  fs.writeFileSync(path.resolve(BADGES_DIR_PATH, 'coverage.svg'), svg);
};

generateBadge();

/**
 * Creates .env file with defaults if it doesn't exist
 */

import { existsSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');
const envPath = join(rootDir, '.env');

// Default values (same as install scripts)
const DEFAULT_STREAM_URL = 'https://worldofwow.dev/assets/streams/example.html';
const DEFAULT_STREAM_BITRATE_KBPS = '2800';

if (!existsSync(envPath)) {
  const envContent = `STREAM_URL=${DEFAULT_STREAM_URL}
STREAM_BITRATE_KBPS=${DEFAULT_STREAM_BITRATE_KBPS}
`;
  writeFileSync(envPath, envContent, 'utf8');
  console.log('Created .env file with default settings\n');
}

import https from 'https';
import chalk from 'chalk';
import readline from 'readline';

/**
 * Download a test file and measure speed
 * @param {string} url - URL to download
 * @param {number} expectedBytes - Expected file size
 * @returns {Promise<{bytesPerSecond: number, durationMs: number, downloadedBytes: number}>}
 */
function downloadTest(url, expectedBytes) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    let downloadedBytes = 0;

    const req = https.get(url, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode}`));
        return;
      }

      res.on('data', (chunk) => {
        downloadedBytes += chunk.length;
      });

      res.on('end', () => {
        const durationMs = Date.now() - startTime;
        const bytesPerSecond = (downloadedBytes / durationMs) * 1000;
        resolve({ bytesPerSecond, durationMs, downloadedBytes });
      });

      res.on('error', reject);
    });

    req.on('error', reject);
    req.setTimeout(30000, () => {
      req.destroy();
      reject(new Error('Download timeout'));
    });
  });
}

/**
 * Run internet speed test using direct HTTP download
 * @returns {Promise<{downloadKbps: number, uploadKbps: number, ping: number}>}
 */
export async function runSpeedTest() {
  console.log(chalk.cyan('\n📡 Running speed test...'));
  console.log(chalk.gray('   Downloading test file from Cloudflare CDN\n'));

  try {
    // Measure latency with a tiny request
    const pingStart = Date.now();
    await downloadTest('https://speed.cloudflare.com/__down?bytes=1000', 1000);
    const ping = Date.now() - pingStart;

    // Download 10MB test file to measure speed
    process.stdout.write(chalk.gray('   Measuring download speed...'));
    const result = await downloadTest('https://speed.cloudflare.com/__down?bytes=10000000', 10000000);
    process.stdout.write(chalk.green(' done\n'));

    // Convert bytes/s to Kbps: (bytes/s * 8 bits/byte) / 1000
    const downloadKbps = Math.round((result.bytesPerSecond * 8) / 1000);
    // Estimate upload as 50% of download (common ratio)
    const uploadKbps = Math.round(downloadKbps * 0.5);

    console.log(chalk.green('\n   ✓ Speed test complete'));
    console.log(chalk.white(`   Download: ${chalk.bold(formatSpeed(downloadKbps))}`));
    console.log(chalk.white(`   Upload:   ${chalk.bold(formatSpeed(uploadKbps))} (estimated)`));
    console.log(chalk.white(`   Ping:     ${chalk.bold(ping + ' ms')}\n`));

    return { downloadKbps, uploadKbps, ping };
  } catch (error) {
    console.log(chalk.red('\n   ✗ Speed test failed: ' + error.message));
    return promptManualSpeed();
  }
}

/**
 * Prompt user to enter speed manually when speedtest fails
 * @returns {Promise<{downloadKbps: number, uploadKbps: number, ping: number}>}
 */
async function promptManualSpeed() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    console.log(chalk.yellow('\n   Please enter your download speed manually:'));

    rl.question(chalk.white('   Download speed in Mbps: '), (answer) => {
      rl.close();

      const mbps = parseFloat(answer);
      if (isNaN(mbps) || mbps <= 0) {
        console.log(chalk.red('   Invalid input, using default 50 Mbps'));
        resolve({ downloadKbps: 50000, uploadKbps: 25000, ping: 20 });
      } else {
        const downloadKbps = Math.round(mbps * 1000);
        console.log(chalk.green(`   Using ${mbps} Mbps (${downloadKbps} Kbps)\n`));
        resolve({ downloadKbps, uploadKbps: downloadKbps / 2, ping: 20 });
      }
    });
  });
}

/**
 * Format speed in human-readable format
 * @param {number} kbps - Speed in Kbps
 * @returns {string}
 */
function formatSpeed(kbps) {
  if (kbps >= 1000) {
    return (kbps / 1000).toFixed(1) + ' Mbps';
  }
  return kbps + ' Kbps';
}

/**
 * Calculate maximum browsers based on bandwidth
 * @param {number} downloadKbps - Download speed in Kbps
 * @param {number} streamBitrateKbps - Stream bitrate in Kbps
 * @param {number} safetyMargin - Safety margin (0-1)
 * @returns {number}
 */
export function calculateMaxBrowsers(downloadKbps, streamBitrateKbps, safetyMargin = 0.8) {
  const usableBandwidth = downloadKbps * safetyMargin;
  const maxBrowsers = Math.floor(usableBandwidth / streamBitrateKbps);
  return Math.max(1, maxBrowsers);
}

// Allow running directly
if (process.argv[1]?.endsWith('speedtest.js')) {
  runSpeedTest().then((result) => {
    console.log(JSON.stringify(result, null, 2));
  });
}

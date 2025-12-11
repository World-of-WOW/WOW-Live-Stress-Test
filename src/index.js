#!/usr/bin/env node

import chalk from 'chalk';
import readline from 'readline';
import config from '../config.js';
import { runSpeedTest, calculateMaxBrowsers } from './speedtest.js';
import { BrowserManager } from './browser-manager.js';

// Parse command line arguments
const args = process.argv.slice(2);
const flags = {
  yes: args.includes('--yes') || args.includes('-y'),
  url: args.find((a) => a.startsWith('--url='))?.split('=')[1],
  max: args.find((a) => a.startsWith('--max='))?.split('=')[1],
  headless: args.includes('--headless'),
  help: args.includes('--help') || args.includes('-h'),
};

if (flags.help) {
  console.log(`
${chalk.bold('HLS Streaming Stress Test')}

Usage: npm start [options]

Options:
  --url=<url>    Stream page URL (overrides config)
  --max=<n>      Maximum browsers (overrides auto-calculation)
  --headless     Run in headless mode
  --yes, -y      Skip confirmation prompt
  --help, -h     Show this help

Environment variables:
  STREAM_URL              Stream page URL
  STREAM_BITRATE_KBPS     Stream bitrate (default: 2800)
  MAX_BROWSERS            Maximum browsers
  HEADLESS                Set to 'true' for headless mode
`);
  process.exit(0);
}

// Banner
console.log(chalk.cyan.bold('\n🚀 HLS Streaming Stress Test'));
console.log(chalk.gray('━'.repeat(40)));

// Main function
async function main() {
  const browserManager = new BrowserManager();

  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    await browserManager.shutdown();
    printSummary(browserManager.getStats());
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    await browserManager.shutdown();
    process.exit(0);
  });

  // Determine stream URL
  const streamUrl = flags.url || config.streamUrl;

  if (!streamUrl) {
    console.log(chalk.red('\n⚠️  No stream URL configured!'));
    console.log(chalk.yellow('   Set STREAM_URL environment variable or use --url flag'));
    console.log(chalk.gray('   Example: STREAM_URL=https://your-stream.com npm start'));
    console.log(chalk.gray('   Example: npm start --url=https://your-stream.com\n'));
    process.exit(1);
  }

  console.log(chalk.white(`\n📺 Stream URL: ${chalk.cyan(streamUrl)}`));
  console.log(chalk.white(`📊 Stream bitrate: ${chalk.cyan(config.streamBitrateKbps + ' Kbps')}`));

  // Apply headless flag
  if (flags.headless) {
    config.headless = true;
  }

  // Run speed test
  const speed = await runSpeedTest();

  // Calculate max browsers
  let maxBrowsers;
  if (flags.max) {
    maxBrowsers = parseInt(flags.max, 10);
    console.log(chalk.yellow(`\n📌 Using manual limit: ${maxBrowsers} browsers`));
  } else if (config.maxBrowsers) {
    maxBrowsers = config.maxBrowsers;
    console.log(chalk.yellow(`\n📌 Using config limit: ${maxBrowsers} browsers`));
  } else {
    maxBrowsers = calculateMaxBrowsers(
      speed.downloadKbps,
      config.streamBitrateKbps,
      config.bandwidthSafetyMargin
    );
  }

  // Display calculation
  const usableBandwidth = Math.round(speed.downloadKbps * config.bandwidthSafetyMargin);
  console.log(chalk.cyan('\n📊 Calculation:'));
  console.log(chalk.white(`   Stream bitrate:    ${formatNumber(config.streamBitrateKbps)} Kbps`));
  console.log(
    chalk.white(
      `   Usable bandwidth:  ${formatNumber(usableBandwidth)} Kbps (${config.bandwidthSafetyMargin * 100}% of ${formatNumber(speed.downloadKbps)})`
    )
  );
  console.log(chalk.white(`   Max browsers:      ${chalk.bold.green(maxBrowsers)}`));
  console.log(chalk.white(`   Launch delay:      ${config.launchDelayMs}ms between each`));

  // Confirm
  if (!flags.yes) {
    const result = await confirmWithCustom(maxBrowsers);
    if (result === false) {
      console.log(chalk.yellow('Cancelled.'));
      process.exit(0);
    }
    if (typeof result === 'number') {
      maxBrowsers = result;
      console.log(chalk.yellow(`   Using custom count: ${maxBrowsers} browsers`));
    }
  }

  // Start launching browsers
  console.log(chalk.cyan('\n🎬 Starting stress test...\n'));

  browserManager.startStaggeredLaunch(
    maxBrowsers,
    streamUrl,
    config.launchDelayMs,
    (progress) => {
      const status = progress.success
        ? chalk.green('✓ Playing')
        : chalk.red(`✗ ${progress.error || 'Failed'}`);

      // Clear line and print progress
      process.stdout.write(`\r   Opening browser ${progress.current}/${progress.total}... ${status}    `);

      if (progress.current === progress.total) {
        console.log('\n');
      }
    }
  );

  // Start health monitoring after a short delay
  setTimeout(() => {
    browserManager.startHealthChecks((stats) => {
      updateStatusLine(stats);
    });

    // Initial status display
    console.log(chalk.cyan('\n📈 Live Status (updates every 5s):'));
    console.log(chalk.gray('   Press Ctrl+C to stop and close all browsers\n'));
    updateStatusLine(browserManager.getStats());
  }, maxBrowsers * config.launchDelayMs + 2000);
}

/**
 * Update the status line in place
 */
function updateStatusLine(stats) {
  const active = chalk.bold(stats.launched);
  const healthy = chalk.green.bold(stats.healthy);
  const buffering = chalk.yellow.bold(stats.buffering);
  const errors = chalk.red.bold(stats.errors);

  process.stdout.write(
    `\r   Active: ${active} | Healthy: ${healthy} | Buffering: ${buffering} | Errors: ${errors}     `
  );
}

/**
 * Print final summary
 */
function printSummary(stats) {
  console.log(chalk.cyan('\n\n📋 Final Summary:'));
  console.log(chalk.white(`   Total launched:  ${stats.launched}`));
  console.log(chalk.green(`   Healthy:         ${stats.healthy}`));
  console.log(chalk.yellow(`   Buffering:       ${stats.buffering}`));
  console.log(chalk.red(`   Errors:          ${stats.errors}`));
  console.log('');
}

/**
 * Confirm with option to enter custom number
 * @param {number} suggestedCount - The suggested/calculated browser count
 * @returns {Promise<boolean|number>} - true to proceed, false to cancel, or a custom number
 */
function confirmWithCustom(suggestedCount) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    console.log(chalk.yellow(`\nProceed with ${suggestedCount} browsers?`));
    console.log(chalk.gray('   Enter: y = yes, n = no, or a number for custom count'));

    rl.question(chalk.white('   Your choice: '), (answer) => {
      rl.close();

      const trimmed = answer.trim().toLowerCase();

      // Check for yes
      if (trimmed === 'y' || trimmed === 'yes') {
        resolve(true);
        return;
      }

      // Check for no
      if (trimmed === 'n' || trimmed === 'no' || trimmed === '') {
        resolve(false);
        return;
      }

      // Check for custom number
      const customNumber = parseInt(trimmed, 10);
      if (!isNaN(customNumber) && customNumber > 0) {
        resolve(customNumber);
        return;
      }

      // Invalid input, treat as cancel
      console.log(chalk.red('   Invalid input.'));
      resolve(false);
    });
  });
}

/**
 * Format number with thousands separator
 */
function formatNumber(num) {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

// Run
main().catch((error) => {
  console.error(chalk.red('\n❌ Fatal error:'), error.message);
  process.exit(1);
});

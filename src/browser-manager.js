import { chromium } from 'playwright';
import chalk from 'chalk';
import config from '../config.js';
import { injectMonitor, getHealth, waitForPlayback, attemptPlay } from './stream-monitor.js';

/**
 * Browser Manager - handles launching and managing multiple browser instances
 */
export class BrowserManager {
  constructor() {
    this.browsers = [];
    this.pages = [];
    this.stats = {
      launched: 0,
      healthy: 0,
      buffering: 0,
      errors: 0,
    };
    this.isShuttingDown = false;
    this.healthCheckInterval = null;
  }

  /**
   * Launch a single browser instance and navigate to stream
   * @param {number} index - Browser index (for display)
   * @param {string} streamUrl - URL to navigate to
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async launchBrowser(index, streamUrl) {
    try {
      const browser = await chromium.launch({
        headless: config.headless,
        args: [
          '--autoplay-policy=no-user-gesture-required',
          '--disable-web-security',
          '--disable-features=IsolateOrigins,site-per-process',
        ],
      });

      const context = await browser.newContext({
        viewport: config.viewport,
        ignoreHTTPSErrors: true,
      });

      const page = await context.newPage();

      // Navigate to stream
      await page.goto(streamUrl, {
        timeout: config.pageLoadTimeoutMs,
        waitUntil: 'domcontentloaded',
      });

      // Inject monitoring and try to play
      await injectMonitor(page);
      await attemptPlay(page);

      // Wait for playback to start
      const playing = await waitForPlayback(page, config.videoPlayTimeoutMs);

      this.browsers.push(browser);
      this.pages.push(page);
      this.stats.launched++;

      if (playing) {
        this.stats.healthy++;
        return { success: true };
      } else {
        return { success: true, error: 'Video not playing yet' };
      }
    } catch (error) {
      this.stats.errors++;
      return { success: false, error: error.message };
    }
  }

  /**
   * Launch browsers with staggered timing
   * @param {number} count - Number of browsers to launch
   * @param {string} streamUrl - URL to navigate to
   * @param {number} delayMs - Delay between launches
   * @param {function} onProgress - Progress callback
   */
  async startStaggeredLaunch(count, streamUrl, delayMs, onProgress) {
    for (let i = 0; i < count; i++) {
      if (this.isShuttingDown) break;

      const result = await this.launchBrowser(i + 1, streamUrl);

      if (onProgress) {
        onProgress({
          current: i + 1,
          total: count,
          success: result.success,
          error: result.error,
          stats: this.stats,
        });
      }

      // Wait before launching next browser (except for the last one)
      if (i < count - 1 && !this.isShuttingDown) {
        await this.sleep(delayMs);
      }
    }
  }

  /**
   * Start periodic health checks
   * @param {function} onUpdate - Callback with updated stats
   */
  startHealthChecks(onUpdate) {
    this.healthCheckInterval = setInterval(async () => {
      if (this.isShuttingDown) return;

      let healthy = 0;
      let buffering = 0;
      let errors = 0;

      for (const page of this.pages) {
        try {
          const health = await getHealth(page);
          if (health.healthy) {
            healthy++;
          } else if (health.errors.length > 0) {
            errors++;
          } else {
            buffering++;
          }
        } catch {
          errors++;
        }
      }

      this.stats.healthy = healthy;
      this.stats.buffering = buffering;
      this.stats.errors = errors;

      if (onUpdate) {
        onUpdate(this.stats);
      }
    }, config.healthCheckIntervalMs);
  }

  /**
   * Stop health checks
   */
  stopHealthChecks() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
  }

  /**
   * Close all browsers gracefully
   */
  async shutdown() {
    if (this.isShuttingDown) return;

    this.isShuttingDown = true;
    this.stopHealthChecks();

    console.log(chalk.yellow('\n\n🛑 Shutting down...'));

    let closed = 0;
    for (const browser of this.browsers) {
      try {
        await browser.close();
        closed++;
      } catch {
        // Ignore close errors
      }
    }

    console.log(chalk.green(`   Closed ${closed}/${this.browsers.length} browsers`));

    this.browsers = [];
    this.pages = [];
  }

  /**
   * Get current statistics
   */
  getStats() {
    return { ...this.stats };
  }

  /**
   * Sleep utility
   */
  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

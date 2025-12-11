/**
 * Stream health monitoring utilities
 * Tracks playback status, buffering, and errors for each browser instance
 */

/**
 * Inject monitoring script into page
 * @param {import('playwright').Page} page
 */
export async function injectMonitor(page) {
  await page.evaluate(() => {
    window._streamHealth = {
      isPlaying: false,
      currentTime: 0,
      lastTime: 0,
      stalledCount: 0,
      bufferingCount: 0,
      errors: [],
      readyState: 0,
      startTime: Date.now(),
    };

    const video = document.querySelector('video');
    if (!video) {
      window._streamHealth.errors.push('No video element found');
      return;
    }

    // Track playback state
    video.addEventListener('playing', () => {
      window._streamHealth.isPlaying = true;
    });

    video.addEventListener('pause', () => {
      window._streamHealth.isPlaying = false;
    });

    video.addEventListener('waiting', () => {
      window._streamHealth.bufferingCount++;
    });

    video.addEventListener('stalled', () => {
      window._streamHealth.stalledCount++;
    });

    video.addEventListener('error', (e) => {
      window._streamHealth.errors.push(e.message || 'Unknown error');
    });

    // Update time periodically
    setInterval(() => {
      window._streamHealth.lastTime = window._streamHealth.currentTime;
      window._streamHealth.currentTime = video.currentTime;
      window._streamHealth.readyState = video.readyState;
      window._streamHealth.isPlaying = !video.paused && !video.ended && video.readyState > 2;
    }, 1000);
  });
}

/**
 * Get health status from a page
 * @param {import('playwright').Page} page
 * @returns {Promise<{isPlaying: boolean, currentTime: number, stalledCount: number, bufferingCount: number, errors: string[], healthy: boolean}>}
 */
export async function getHealth(page) {
  try {
    const health = await page.evaluate(() => window._streamHealth);

    if (!health) {
      return {
        isPlaying: false,
        currentTime: 0,
        stalledCount: 0,
        bufferingCount: 0,
        errors: ['Monitor not initialized'],
        healthy: false,
      };
    }

    // Consider healthy if playing and time is advancing
    const timeAdvancing = health.currentTime > health.lastTime;
    const healthy = health.isPlaying && timeAdvancing && health.errors.length === 0;

    return {
      ...health,
      healthy,
    };
  } catch (error) {
    return {
      isPlaying: false,
      currentTime: 0,
      stalledCount: 0,
      bufferingCount: 0,
      errors: [error.message],
      healthy: false,
    };
  }
}

/**
 * Wait for video to start playing
 * @param {import('playwright').Page} page
 * @param {number} timeoutMs
 * @returns {Promise<boolean>}
 */
export async function waitForPlayback(page, timeoutMs = 15000) {
  try {
    await page.waitForFunction(
      () => {
        const video = document.querySelector('video');
        return video && !video.paused && video.readyState >= 3;
      },
      { timeout: timeoutMs }
    );
    return true;
  } catch {
    return false;
  }
}

/**
 * Try to start video playback (handle autoplay restrictions)
 * @param {import('playwright').Page} page
 */
export async function attemptPlay(page) {
  await page.evaluate(() => {
    const video = document.querySelector('video');
    if (video) {
      video.muted = true; // Mute to bypass autoplay restrictions
      video.play().catch(() => {});
    }
  });
}

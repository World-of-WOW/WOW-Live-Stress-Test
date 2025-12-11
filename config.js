/**
 * HLS Stress Test Configuration
 *
 * All settings can be overridden via environment variables
 */

export default {
  // Stream settings
  streamUrl: process.env.STREAM_URL || '',
  streamBitrateKbps: parseInt(process.env.STREAM_BITRATE_KBPS, 10) || 2800,

  // Bandwidth settings
  bandwidthSafetyMargin: parseFloat(process.env.BANDWIDTH_SAFETY_MARGIN) || 0.8,

  // Browser launch settings
  launchDelayMs: parseInt(process.env.LAUNCH_DELAY_MS, 10) || 1000,
  maxBrowsers: process.env.MAX_BROWSERS ? parseInt(process.env.MAX_BROWSERS, 10) : null,

  // Playback monitoring
  bufferingThresholdMs: parseInt(process.env.BUFFERING_THRESHOLD_MS, 10) || 3000,
  healthCheckIntervalMs: parseInt(process.env.HEALTH_CHECK_INTERVAL_MS, 10) || 5000,

  // Browser settings
  headless: process.env.HEADLESS === 'true',
  viewport: {
    width: parseInt(process.env.VIEWPORT_WIDTH, 10) || 640,
    height: parseInt(process.env.VIEWPORT_HEIGHT, 10) || 360,
  },

  // Timeouts
  pageLoadTimeoutMs: parseInt(process.env.PAGE_LOAD_TIMEOUT_MS, 10) || 30000,
  videoPlayTimeoutMs: parseInt(process.env.VIDEO_PLAY_TIMEOUT_MS, 10) || 15000,
};

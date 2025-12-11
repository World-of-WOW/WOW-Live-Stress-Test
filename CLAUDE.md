# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

HLS streaming stress test tool that automatically scales browser instances based on internet bandwidth. Used to stress test streaming infrastructure by opening multiple concurrent video streams.

## Technology Stack

- Node.js 18+ with ES modules
- Playwright for browser automation
- speedtest-net for bandwidth measurement
- chalk for terminal colors
- cli-progress for progress bars

## Development Commands

```bash
npm install                    # Install dependencies
npx playwright install chromium # Install browser
npm start                      # Run stress test
npm start --url=<url>          # Run with specific stream URL
npm start --max=10             # Limit to 10 browsers
npm start --headless           # Run without visible windows
```

## Architecture

```
src/
├── index.js          # Main entry point, CLI handling, orchestration
├── speedtest.js      # Internet speed measurement, bandwidth calculation
├── browser-manager.js # Playwright browser lifecycle, staggered launches
└── stream-monitor.js  # Video playback health tracking
```

### Core Flow

1. `index.js` parses CLI args, runs speedtest, calculates max browsers
2. `speedtest.js` measures download speed via speedtest-net
3. `browser-manager.js` launches browsers with 1-second delays
4. `stream-monitor.js` injects monitoring script, tracks playback health

### Key Formula

```
max_browsers = (download_speed_kbps × safety_margin) / stream_bitrate_kbps
```

Default: 80% safety margin, 2800 Kbps stream bitrate

## Configuration

All settings in `config.js` can be overridden via environment variables:
- `STREAM_URL` - Target stream page
- `STREAM_BITRATE_KBPS` - Stream bitrate (default: 2800)
- `MAX_BROWSERS` - Override auto-calculated limit
- `HEADLESS` - Set to 'true' for headless mode

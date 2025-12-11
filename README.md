# WOW-Live-Stress-Test

HLS streaming stress test tool using Playwright. Automatically determines how many browser instances to spawn based on your internet bandwidth, then opens stream viewers with staggered timing to stress test your streaming infrastructure.

## Quick Start

### One-Command Install

**Linux/macOS:**
```bash
curl -fsSL https://raw.githubusercontent.com/World-of-WOW/WOW-Live-Stress-Test/main/install.sh | bash
```

**Windows (PowerShell):**
```powershell
irm https://raw.githubusercontent.com/World-of-WOW/WOW-Live-Stress-Test/main/install.ps1 | iex
```

This will:
1. Clone the repository
2. Install dependencies
3. Install Chromium browser
4. Create `.env` file with default stream URL

### Manual Install

```bash
git clone https://github.com/World-of-WOW/WOW-Live-Stress-Test.git
cd WOW-Live-Stress-Test
npm install
npx playwright install chromium
```

### Run

```bash
# Run with default stream URL (set in .env)
npm start

# Or override with command line flag
npm start --url=https://your-stream-page.com

# Or set environment variable
STREAM_URL=https://your-stream-page.com npm start
```

## How It Works

1. **Speed Test** - Measures your download speed using speedtest-net
2. **Calculate Capacity** - Determines max browsers: `(download_speed × 0.8) / stream_bitrate`
3. **Staggered Launch** - Opens browsers 1 per second until max is reached
4. **Health Monitoring** - Tracks playback status across all browsers

### Example

With 100 Mbps download and 2800 Kbps stream:
- Usable bandwidth: 80,000 Kbps (80% safety margin)
- Max browsers: 80,000 / 2,800 = **28 browsers**

## Configuration

### .env File

The installer creates a `.env` file with defaults:

```bash
STREAM_URL=https://worldofwow.dev/assets/streams/example.html
STREAM_BITRATE_KBPS=2800
```

Edit this file to change the stream URL or bitrate.

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `STREAM_URL` | (see .env) | Stream page URL |
| `STREAM_BITRATE_KBPS` | 2800 | Stream bitrate in Kbps |
| `BANDWIDTH_SAFETY_MARGIN` | 0.8 | Use 80% of measured bandwidth |
| `LAUNCH_DELAY_MS` | 1000 | Delay between browser launches |
| `MAX_BROWSERS` | auto | Override calculated max browsers |
| `HEADLESS` | false | Run without visible windows |

### Command Line Flags

```bash
npm start --url=<url>      # Stream page URL
npm start --max=10         # Limit to 10 browsers
npm start --headless       # Run in headless mode
npm start --yes            # Skip confirmation prompt
npm start --help           # Show help
```

## Requirements

- Node.js 22+
- npm
- ~500MB disk space for Chromium

## Output

```
🚀 HLS Streaming Stress Test
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📺 Stream URL: https://worldofwow.dev/assets/streams/example.html
📊 Stream bitrate: 2800 Kbps

📡 Running speed test...
   ✓ Speed test complete
   Download: 98.5 Mbps
   Upload: 47.2 Mbps
   Ping: 12ms

📊 Calculation:
   Stream bitrate:    2,800 Kbps
   Usable bandwidth:  78,800 Kbps (80% of 98,500)
   Max browsers:      28

🎬 Starting stress test...
   Opening browser 1/28... ✓ Playing
   Opening browser 2/28... ✓ Playing
   ...

📈 Live Status (updates every 5s):
   Active: 28 | Healthy: 27 | Buffering: 1 | Errors: 0

Press Ctrl+C to stop and close all browsers
```

## Troubleshooting

**Speed test fails**: Enter speed manually when prompted, or set `MAX_BROWSERS` env var

**Browsers won't open**: Ensure you have display access (use `--headless` on servers)

**Video not playing**: Check if stream URL requires authentication or has CORS restrictions

**Out of memory**: Reduce `MAX_BROWSERS` or use `--headless` mode

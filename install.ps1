# HLS Streaming Stress Test - Windows Installer (PowerShell)
# Usage: irm https://raw.githubusercontent.com/World-of-WOW/WOW-Live-Stress-Test/main/install.ps1 | iex

$ErrorActionPreference = "Stop"

# Default values
$DEFAULT_STREAM_URL = "https://www.worldofwow.com/live-event/franklammersofficial/3489e3a3-9f13-46bb-b413-3614e54516ea"
$DEFAULT_STREAM_BITRATE_KBPS = "2800"

# Colors
function Write-ColorOutput($ForegroundColor) {
    $fc = $host.UI.RawUI.ForegroundColor
    $host.UI.RawUI.ForegroundColor = $ForegroundColor
    if ($args) {
        Write-Output $args
    }
    $host.UI.RawUI.ForegroundColor = $fc
}

Write-Host ""
Write-Host "╔════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║   HLS Streaming Stress Test Installer  ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Check for Node.js
Write-Host "Checking prerequisites..." -ForegroundColor Cyan

try {
    $nodeVersion = node -v 2>$null
    if (-not $nodeVersion) {
        throw "Node.js not found"
    }

    $versionNumber = [int]($nodeVersion -replace 'v(\d+)\..*', '$1')
    if ($versionNumber -lt 22) {
        Write-Host ""
        Write-Host "╔════════════════════════════════════════════════════════╗" -ForegroundColor Red
        Write-Host "║  ERROR: Node.js version 22 or higher is required       ║" -ForegroundColor Red
        Write-Host "╚════════════════════════════════════════════════════════╝" -ForegroundColor Red
        Write-Host ""
        Write-Host "  Current version: " -NoNewLine
        Write-Host "$nodeVersion" -ForegroundColor Yellow
        Write-Host "  Required version: " -NoNewLine
        Write-Host "v22+" -ForegroundColor Green
        Write-Host ""
        Write-Host "  Please upgrade Node.js:"
        Write-Host "    - Download from: https://nodejs.org/"
        Write-Host "    - Or use winget: winget install OpenJS.NodeJS"
        Write-Host "    - Or use chocolatey: choco install nodejs"
        Write-Host ""
        Write-Error "Node.js version 22 or higher is required (found $nodeVersion)" -ErrorAction Continue
        Write-Host ""
        Read-Host "Press Enter to exit"
        exit 1
    }

    Write-Host "✓ Node.js $nodeVersion found" -ForegroundColor Green
} catch {
    Write-Host "✗ Node.js is not installed" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please install Node.js v22 or later:" -ForegroundColor Yellow
    Write-Host "  - Download from: https://nodejs.org/"
    Write-Host "  - Or use winget: winget install OpenJS.NodeJS.LTS"
    Write-Host "  - Or use chocolatey: choco install nodejs-lts"
    Write-Host ""
    Write-Error "Node.js is not installed" -ErrorAction Continue
    Write-Host ""
    Read-Host "Press Enter to exit"
    exit 1
}

# Check for npm
try {
    $npmVersion = npm -v 2>$null
    if (-not $npmVersion) {
        throw "npm not found"
    }
    Write-Host "✓ npm $npmVersion found" -ForegroundColor Green
} catch {
    Write-Host "✗ npm is not installed" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please try to run 'npm -v' in powershell"
    Write-Host "If you get this error:"
    Write-Host ""
    Write-Host "npm : File C:\Program Files\nodejs\npm.ps1 cannot be loaded because running scripts is disabled on this system." -ForegroundColor Red
    Write-Host "For more information, see about_Execution_Policies at" -ForegroundColor Red
    Write-Host "https:/go.microsoft.com/fwlink/?LinkID=135170." -ForegroundColor Red
    Write-Host "At line:1 char:1" -ForegroundColor Red
    Write-Host "+ npm -v" -ForegroundColor Red
    Write-Host "+ ~~~" -ForegroundColor Red
    Write-Host "    + CategoryInfo          : SecurityError: (:) [], PSSecurityException" -ForegroundColor Red
    Write-Host "    + FullyQualifiedErrorId : UnauthorizedAccess" -ForegroundColor Red
    Write-Host ""
    Write-Host "Then you need to run the following:"
    Write-Host "  Set-ExecutionPolicy RemoteSigned -Scope CurrentUser" -ForegroundColor Cyan
    Write-Host ""
    Write-Error "npm is not installed or execution policy prevents running scripts" -ErrorAction Continue
    Write-Host ""
    Read-Host "Press Enter to exit"
    exit 1
}

# Check for git
$hasGit = $false
try {
    $gitVersion = git --version 2>$null
    if ($gitVersion) {
        $hasGit = $true
        Write-Host "✓ Git found" -ForegroundColor Green
    }
} catch {
    Write-Host "! Git not found, will download as ZIP" -ForegroundColor Yellow
}

# Determine installation directory
$INSTALL_DIR = if ($env:INSTALL_DIR) { $env:INSTALL_DIR } else { Join-Path $HOME "wow-live-stress-test" }

Write-Host ""
Write-Host "Installing to: $INSTALL_DIR" -ForegroundColor Cyan

# Clone or download repository
if (Test-Path $INSTALL_DIR) {
    Write-Host "Directory exists, updating..." -ForegroundColor Yellow
    Set-Location $INSTALL_DIR
    if ((Test-Path ".git") -and $hasGit) {
        git pull --quiet 2>$null
    } else {
        # No .git folder = ZIP install, remove and re-download
        Write-Host "No git repository found, removing old installation..." -ForegroundColor Yellow
        Set-Location ..
        Remove-Item $INSTALL_DIR -Recurse -Force
    }
}

if (-not (Test-Path $INSTALL_DIR)) {
    Write-Host "Downloading project..." -ForegroundColor Cyan

    if ($hasGit) {
        $REPO_URL = if ($env:REPO_URL) { $env:REPO_URL } else { "https://github.com/World-of-WOW/WOW-Live-Stress-Test.git" }
        git clone --quiet $REPO_URL $INSTALL_DIR 2>$null
        if (-not $?) {
            Write-Host "Git clone failed, trying ZIP download..." -ForegroundColor Yellow
            $hasGit = $false
        }
    }

    if (-not $hasGit) {
        # Download as ZIP
        $zipUrl = "https://github.com/World-of-WOW/WOW-Live-Stress-Test/archive/refs/heads/main.zip"
        $zipPath = Join-Path $env:TEMP "wow-stress-test.zip"
        $extractPath = Join-Path $env:TEMP "wow-stress-test-extract"

        Write-Host "Downloading ZIP archive..." -ForegroundColor Cyan
        Invoke-WebRequest -Uri $zipUrl -OutFile $zipPath -UseBasicParsing

        Write-Host "Extracting..." -ForegroundColor Cyan
        Expand-Archive -Path $zipPath -DestinationPath $extractPath -Force

        # Move extracted folder to install dir
        $extractedFolder = Get-ChildItem $extractPath | Select-Object -First 1
        Move-Item -Path $extractedFolder.FullName -Destination $INSTALL_DIR

        # Cleanup
        Remove-Item $zipPath -Force
        Remove-Item $extractPath -Recurse -Force
    }

    Set-Location $INSTALL_DIR
}

# Install dependencies
Write-Host ""
Write-Host "Installing npm dependencies..." -ForegroundColor Cyan
npm install --silent 2>$null
if (-not $?) {
    npm install
}

# Install Playwright browsers
Write-Host ""
Write-Host "Installing Playwright browser (Chromium)..." -ForegroundColor Cyan
npx playwright install --with-deps chromium

# Create .env file with defaults if it doesn't exist
if (-not (Test-Path ".env")) {
    $streamUrl = if ($env:STREAM_URL) { $env:STREAM_URL } else { $DEFAULT_STREAM_URL }
    $bitrate = if ($env:STREAM_BITRATE_KBPS) { $env:STREAM_BITRATE_KBPS } else { $DEFAULT_STREAM_BITRATE_KBPS }

    @"
STREAM_URL=$streamUrl
STREAM_BITRATE_KBPS=$bitrate
"@ | Out-File -FilePath ".env" -Encoding UTF8

    Write-Host "✓ Created .env with default settings" -ForegroundColor Green
}

Write-Host ""
Write-Host "╔════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║      Installation Complete! ✓          ║" -ForegroundColor Green
Write-Host "╚════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""
Write-Host "To run the stress test:" -ForegroundColor Cyan
Write-Host ""
Write-Host "  cd $INSTALL_DIR"
Write-Host "  npm start"
Write-Host ""
Write-Host "Or with custom stream URL:" -ForegroundColor Cyan
Write-Host ""
Write-Host "  npm start --url=https://your-stream-page.com"
Write-Host ""
Write-Host "Additional options:" -ForegroundColor Cyan
Write-Host "  --max=10      Limit to 10 browsers"
Write-Host "  --headless    Run without visible windows"
Write-Host "  --yes         Skip confirmation prompt"
Write-Host ""

# Ask user if they want to run the test
Write-Host ""
$response = Read-Host "Would you like to start the stress test now? (y/n)"

if ($response -match "^[Yy]$") {
    Write-Host "Starting stress test..." -ForegroundColor Cyan
    Write-Host ""
    npm start
}

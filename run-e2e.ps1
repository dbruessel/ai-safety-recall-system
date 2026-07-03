# run-e2e-v2.ps1 - Automated End-to-End Test Runner for Windows (Emoji-free edition)
$ErrorActionPreference = "Stop"

# Keep track of background process
$BackendProcess = $null
$started = $false

function Cleanup {
    Write-Host ""
    if ($BackendProcess) {
        Write-Host "[STOP] Stopping FastAPI Backend server..." -ForegroundColor Red
        try {
            Stop-Process -Id $BackendProcess.Id -Force -ErrorAction SilentlyContinue
            Write-Host "[STOP] FastAPI Backend server stopped." -ForegroundColor Red
        } catch {
            Write-Host "[WARN] Failed to stop backend cleanly. It may already be closed." -ForegroundColor Yellow
        }
    }
    
    if (Test-Path "backend-e2e.log") {
        Write-Host "[CLEANUP] Removing temporary backend-e2e.log..." -ForegroundColor DarkGray
        Remove-Item "backend-e2e.log" -ErrorAction SilentlyContinue
    }
    Write-Host "[OK] E2E Lifecycle ended." -ForegroundColor Green
}

# Register the cleanup block to run on exit (Ctrl+C, normal completion, or crash)
try {
    Write-Host "[START] Launching FastAPI Backend Server..." -ForegroundColor Cyan
    
    # Start the backend process from the backend directory
    $BackendProcess = Start-Process -FilePath "uvicorn" -ArgumentList "app.main:app", "--port", "8000" `
        -WorkingDirectory "backend" `
        -RedirectStandardOutput "..\backend-e2e.log" `
        -RedirectStandardError "..\backend-e2e.log" `
        -NoNewWindow `
        -PassThru

    Write-Host "[INFO] Backend started with PID: $($BackendProcess.Id). Probing health..." -ForegroundColor Gray

    # Active Probing Loop
    $maxAttempts = 15
    $attempt = 1
    $healthy = $false

    while ($attempt -le $maxAttempts) {
        try {
            $response = Invoke-WebRequest -Uri "http://127.0.0.1:8000/docs" -Method Head -TimeoutSec 1 -UseBasicParsing -ErrorAction Stop
            if ($response.StatusCode -eq 200) {
                $healthy = $true
                break
            }
        } catch {
            # Quietly fail and retry
        }
        Write-Host "[INFO] Waiting for backend to spin up (attempt $attempt/$maxAttempts)..." -ForegroundColor Yellow
        Start-Sleep -Seconds 1
        $attempt++
    }

    if (-not $healthy) {
        Write-Host "[ERROR] FastAPI backend failed to become healthy on port 8000. Check backend-e2e.log for details." -ForegroundColor Red
        if (Test-Path "backend-e2e.log") {
            Get-Content "backend-e2e.log" -Tail 20 | Write-Host -ForegroundColor DarkRed
        }
        exit 1
    }

    Write-Host "[OK] FastAPI Backend is healthy and responding!" -ForegroundColor Green
    $started = $true

    # Navigate to frontend and run playwright
    Write-Host "[START] Launching Playwright E2E Tests..." -ForegroundColor Cyan
    Set-Location "frontend"
    
    # Forward arguments if any (like --ui)
    if ($args) {
        npx playwright test $args
    } else {
        npx playwright test
    }
    
} finally {
    Set-Location $PSScriptRoot
    Cleanup
}

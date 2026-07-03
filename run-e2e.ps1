# run-e2e-v3.ps1 - Emoji-free, multi-platform PowerShell runner with fixed stream redirects.

$ErrorActionPreference = "Stop"

# Clear historical log files safely
if (Test-Path "backend-e2e-out.log") { Remove-Item "backend-e2e-out.log" }
if (Test-Path "backend-e2e-err.log") { Remove-Item "backend-e2e-err.log" }

Write-Host "[START] Launching FastAPI Backend Server..." -ForegroundColor Green

# Start the FastAPI backend with separated stdout and stderr streams to prevent PowerShell handle conflicts
$backendProcess = Start-Process -FilePath "uvicorn" `
    -ArgumentList "app.main:app --port 8000" `
    -NoNewWindow `
    -PassThru `
    -RedirectStandardOutput "backend-e2e-out.log" `
    -RedirectStandardError "backend-e2e-err.log" `
    -WorkingDirectory "backend"

# Ensure we clean up the process on exit
$cleanup = {
    param($process)
    Write-Host "[STOP] Stopping background servers..." -ForegroundColor Yellow
    if ($process -and -not $process.HasExited) {
        Stop-Process -Id $process.Id -Force
        Write-Host "[OK] FastAPI Backend server stopped." -ForegroundColor Red
    }
    Write-Host "[OK] E2E Lifecycle ended." -ForegroundColor Green
}

# Register a process exit trap to clean up the backend if the script is interrupted (Ctrl+C)
$MyProcessId = $pid
Register-EngineEvent -SourceIdentifier "PowerShell.Exiting" -Action {
    &$cleanup -process $backendProcess
} | Out-Null

try {
    # Active Health Probe: wait for the backend to start up
    $started = $false
    $timeout = 15 # seconds
    $elapsed = 0

    Write-Host "[INFO] Waiting for API backend to report healthy on port 8000..." -ForegroundColor Cyan

    while (-not $started -and $elapsed -lt $timeout) {
        try {
            $response = Invoke-WebRequest -Uri "http://127.0.0.1:8000/docs" -Method Get -UseBasicParsing -TimeoutSec 1
            if ($response.StatusCode -eq 200) {
                $started = $true
            }
        }
        catch {
            # Catch connection failures and retry
            Start-Sleep -Seconds 1
            $elapsed++
        }
    }

    if (-not $started) {
        Write-Host "[ERROR] FastAPI backend failed to start within $timeout seconds." -ForegroundColor Red
        if (Test-Path "backend/backend-e2e-err.log") {
            Write-Host "[ERROR] Last few lines of backend-e2e-err.log:" -ForegroundColor DarkRed
            Get-Content "backend/backend-e2e-err.log" -Tail 10
        }
        throw "Backend startup timeout"
    }

    Write-Host "[OK] Backend is healthy! Launching Playwright tests..." -ForegroundColor Green

    # Run the Playwright tests inside the frontend folder
    Set-Location "frontend"
    npx playwright test
    Set-Location ".."
}
finally {
    # Clean up backend process
    Set-Location "C:\dev\clean-repo"
    &$cleanup -process $backendProcess
}

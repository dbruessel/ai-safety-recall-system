# run-e2e.ps1
# Native Windows PowerShell automation script to run local FastAPI backend & Playwright E2E tests in lockstep.
# Run in PowerShell: .\run-e2e.ps1

Write-Host "🚀 Starting E2E Automation Pipeline..." -ForegroundColor Cyan

# 1. Start FastAPI Backend in the background
Write-Host "🐍 Launching FastAPI Backend..." -ForegroundColor Yellow
Push-Location backend

# Activate Python virtual environment if present
if (Test-Path ".venv\Scripts\Activate.ps1") {
    Write-Host "⚡ Activating .venv virtual environment..." -ForegroundColor Gray
    & .venv\Scripts\Activate.ps1
} elseif (Test-Path "venv\Scripts\Activate.ps1") {
    Write-Host "⚡ Activating venv virtual environment..." -ForegroundColor Gray
    & venv\Scripts\Activate.ps1
}

# Launch Uvicorn asynchronously and stream console output to backend-e2e.log
$backendProcess = Start-Process python -ArgumentList "-m uvicorn app.main:app --host 127.0.0.1 --port 8000" -NoNewWindow -PassThru -RedirectStandardOutput "backend-e2e.log" -RedirectStandardError "backend-e2e.log"

# 2. Wait for the backend to start up
Write-Host "⏳ Waiting for FastAPI to respond on port 8000..." -ForegroundColor Yellow
$timeout = 30
$elapsed = 0
$started = $false

while ($elapsed -lt $timeout) {
    try {
        $response = Invoke-WebRequest -Uri "http://127.0.0.1:8000/docs" -UseBasicParsing -ErrorAction SilentlyContinue
        if ($response.StatusCode -eq 200) {
            $started = $true
            break
        }
    } catch {
        # Silent fail during wait loops
    }
    Start-Sleep -Seconds 1
    $elapsed++
}

if (-not $started) {
    Write-Host "❌ Error: FastAPI failed to start within $timeout seconds." -ForegroundColor Red
    if (Test-Path "backend-e2e.log") {
        Write-Host "🔍 Printing backend-e2e.log:" -ForegroundColor Gray
        Get-Content "backend-e2e.log" -Tail 15
    }
    Stop-Process -Id $backendProcess.Id -Force
    Pop-Location
    Exit 1
}

Write-Host "✅ FastAPI is online and healthy!" -ForegroundColor Green
Pop-Location

# 3. Run Playwright E2E Tests
Write-Host "🎭 Executing Playwright E2E Tests..." -ForegroundColor Yellow
Push-Location frontend

$testFailed = $false
try {
    npx playwright test
    Write-Host "🎉 E2E verification completed successfully!" -ForegroundColor Green
} catch {
    $testFailed = $true
    Write-Host "❌ E2E tests failed!" -ForegroundColor Red
} finally {
    # 4. Clean up background process under any termination condition
    Write-Host "🧹 Cleaning up background processes..." -ForegroundColor Cyan
    if ($backendProcess -and -not $backendProcess.HasExited) {
        Stop-Process -Id $backendProcess.Id -Force
        Write-Host "🛑 FastAPI Backend server stopped." -ForegroundColor Red
    }
    Pop-Location
}

if ($testFailed) {
    Exit 1
} else {
    Exit 0
}
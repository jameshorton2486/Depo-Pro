# Run All Services (Windows PowerShell)
# Starts both API server and worker

Write-Host "🚀 Starting Depo-Pro services..." -ForegroundColor Cyan
Write-Host ""

# Check if setup was run
if (-Not (Test-Path "node_modules")) {
    Write-Host "⚠️  Dependencies not installed" -ForegroundColor Yellow
    Write-Host "   Running setup first..." -ForegroundColor Yellow
    .\scripts\setup.ps1
}

Write-Host "Starting services in separate windows..." -ForegroundColor Yellow
Write-Host ""

# Start API server in new window
Start-Process powershell -ArgumentList "-NoExit", "-Command", "npm run dev"
Write-Host "✅ API server started (check new window)" -ForegroundColor Green

# Wait a moment
Start-Sleep -Seconds 2

# Start worker in new window
Start-Process powershell -ArgumentList "-NoExit", "-Command", "npm run worker"
Write-Host "✅ Worker started (check new window)" -ForegroundColor Green

Write-Host ""
Write-Host "🎉 All services running!" -ForegroundColor Green
Write-Host ""
Write-Host "API Server: http://localhost:3000" -ForegroundColor Cyan
Write-Host "Worker: Running in background" -ForegroundColor Cyan
Write-Host ""
Write-Host "Close the terminal windows to stop services." -ForegroundColor Yellow

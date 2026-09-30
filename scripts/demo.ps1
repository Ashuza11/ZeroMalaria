# ZeroMalaria — start API + web for local demo (Windows PowerShell)
# Usage: .\scripts\demo.ps1
# Prerequisites: .venv, npm install in apps/web, seed run at least once

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $Root

$venvPython = Join-Path $Root ".venv\Scripts\python.exe"
if (-not (Test-Path $venvPython)) {
  Write-Host "Missing .venv — run: python -m venv .venv && pip install -r apps\api\requirements.txt"
  exit 1
}

Write-Host "Seeding database (idempotent)..."
& $venvPython apps\api\app\seed.py

Write-Host "Starting API on http://127.0.0.1:8000 ..."
Start-Process -FilePath $venvPython `
  -ArgumentList "-m", "uvicorn", "app.main:app", "--reload", "--host", "127.0.0.1", "--port", "8000" `
  -WorkingDirectory (Join-Path $Root "apps\api") `
  -WindowStyle Normal

Start-Sleep -Seconds 2

Write-Host "Starting web on http://localhost:5173 ..."
Push-Location (Join-Path $Root "apps\web")
npm run rules 2>$null
Start-Process -FilePath "npm" -ArgumentList "run", "dev" -WorkingDirectory (Get-Location) -WindowStyle Normal
Pop-Location

Write-Host ""
Write-Host "Demo accounts (password demo1234): chw.demo, nurse.demo, supervisor.demo, rbc.demo"
Write-Host "Routes: /  (CHW)  |  /facility  |  /rbc  |  /app/patients"

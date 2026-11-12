# LedgerLine Full-Stack Application Launcher
# Starts MySQL 8, Spring Boot Backend (JAR), and React Frontend

$ErrorActionPreference = "Continue"

$workspaceRoot = $PSScriptRoot
$backendDir = Join-Path $workspaceRoot "backend"
$frontendDir = Join-Path $workspaceRoot "frontend"

$mysqld = "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysqld.exe"
$mysql = "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe"
$mysqladmin = "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysqladmin.exe"
$java = "C:\Program Files\Java\jdk-22\bin\java.exe"
$port = 3307

$targetDir = Join-Path $backendDir "target"
$jarPath = Join-Path $targetDir "ledgerline-backend-1.0.0-SNAPSHOT.jar"
$datadir = Join-Path $targetDir "mysql-test-data"

# 1. Start MySQL 8
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " 1. Checking / Starting MySQL 8 on port $port..." -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

$ping = & $mysqladmin -h 127.0.0.1 -P $port -u root ping 2>&1
if ($ping -notmatch "alive") {
    Write-Host "Starting MySQL server..." -ForegroundColor Gray
    Start-Process -FilePath $mysqld -ArgumentList "--datadir=`"$datadir`"", "--port=$port", "--console" -WindowStyle Hidden
    
    $ready = $false
    for ($i = 0; $i -lt 30; $i++) {
        Start-Sleep -Seconds 1
        $check = & $mysqladmin -h 127.0.0.1 -P $port -u root ping 2>&1
        if ($check -match "alive") {
            $ready = $true
            break
        }
    }
    if (-not $ready) {
        Write-Error "MySQL failed to start on port $port."
        exit 1
    }
}
Write-Host "MySQL 8 is ALIVE on port $port!" -ForegroundColor Green

# Ensure ledgerline database exists
& $mysql -h 127.0.0.1 -P $port -u root -e "CREATE DATABASE IF NOT EXISTS ledgerline CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
Write-Host "Database 'ledgerline' is ready." -ForegroundColor Green

# 2. Start Spring Boot Backend
Write-Host "`n==========================================================" -ForegroundColor Cyan
Write-Host " 2. Starting Spring Boot Backend (port 8080)..." -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

$backendOut = Join-Path $workspaceRoot "backend-out.log"
$backendErr = Join-Path $workspaceRoot "backend-err.log"
$backendArgs = "-DDB_HOST=127.0.0.1 -DDB_PORT=3307 -DDB_NAME=ledgerline -DDB_USER=root -DDB_PASSWORD= -DJWT_SECRET=ledgerline-development-jwt-super-secret-key-32-chars-long-2026 -jar `"$jarPath`""

Write-Host "Launching Spring Boot JAR in background..." -ForegroundColor Gray
Start-Process -FilePath $java -ArgumentList $backendArgs -RedirectStandardOutput $backendOut -RedirectStandardError $backendErr -WindowStyle Hidden

Write-Host "Waiting for backend to bind to http://localhost:8080..." -ForegroundColor Gray
$backendUp = $false
for ($i = 0; $i -lt 30; $i++) {
    Start-Sleep -Seconds 1
    try {
        $tcp = Test-NetConnection -ComputerName 127.0.0.1 -Port 8080 -InformationLevel Quiet -ErrorAction SilentlyContinue
        if ($tcp) {
            $backendUp = $true
            break
        }
    } catch {}
}

if ($backendUp) {
    Write-Host "Spring Boot Backend is UP at http://localhost:8080!" -ForegroundColor Green
} else {
    Write-Host "Backend is still initializing. Check backend-err.log for details." -ForegroundColor Yellow
}

# 3. Start Frontend Dev Server
Write-Host "`n==========================================================" -ForegroundColor Cyan
Write-Host " 3. Starting Frontend React + Vite (port 3000)..." -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

$frontendOut = Join-Path $workspaceRoot "frontend-out.log"
$frontendErr = Join-Path $workspaceRoot "frontend-err.log"
Write-Host "Launching Vite dev server on http://localhost:3000..." -ForegroundColor Gray
Start-Process -FilePath "cmd.exe" -ArgumentList "/c npm run dev -- --port 3000" -WorkingDirectory $frontendDir -RedirectStandardOutput $frontendOut -RedirectStandardError $frontendErr -WindowStyle Hidden

Write-Host "Waiting for frontend to bind to http://localhost:3000..." -ForegroundColor Gray
$frontendUp = $false
for ($i = 0; $i -lt 15; $i++) {
    Start-Sleep -Seconds 1
    try {
        $tcp = Test-NetConnection -ComputerName 127.0.0.1 -Port 3000 -InformationLevel Quiet -ErrorAction SilentlyContinue
        if ($tcp) {
            $frontendUp = $true
            break
        }
    } catch {}
}

if ($frontendUp) {
    Write-Host "Frontend is running at http://localhost:3000!" -ForegroundColor Green
} else {
    Write-Host "Frontend is starting up on http://localhost:3000." -ForegroundColor Yellow
}

Write-Host "`n==========================================================" -ForegroundColor Cyan
Write-Host " LEDGERLINE APPLICATION IS READY!" -ForegroundColor Green
Write-Host " - Frontend Portal: http://localhost:3000" -ForegroundColor White
Write-Host " - Backend REST API: http://localhost:8080" -ForegroundColor White
Write-Host " - Demo Accounts:   Admin:     admin     / Admin@123456" -ForegroundColor White
Write-Host "                    Customer:  john_doe  / User@123456" -ForegroundColor White
Write-Host "                    Auditor:   auditor   / Auditor@123456" -ForegroundColor White
Write-Host "==========================================================" -ForegroundColor Cyan

Write-Host "`nAll services active. Press Ctrl+C in this terminal to stop." -ForegroundColor Cyan
while ($true) {
    Start-Sleep -Seconds 10
}

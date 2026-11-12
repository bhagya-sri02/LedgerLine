param(
    [int]$Port = 3307
)

$mysqld = "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysqld.exe"
$mysql = "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe"
$mysqladmin = "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysqladmin.exe"

$targetDir = (Get-Item "backend/target").FullName
$datadir = Join-Path $targetDir "mysql-test-data"

if (-not (Test-Path $datadir)) {
    Write-Host "Initializing MySQL datadir at $datadir..."
    New-Item -ItemType Directory -Path $datadir -Force | Out-Null
    & $mysqld --initialize-insecure --datadir="$datadir"
    Start-Sleep -Seconds 2
}

Write-Host "Starting MySQL 8 on port $Port..."
$proc = Start-Process -FilePath $mysqld -ArgumentList "--datadir=`"$datadir`"", "--port=$Port", "--console" -PassThru

$ready = $false
for ($i = 0; $i -lt 20; $i++) {
    Start-Sleep -Seconds 1
    $ping = & $mysqladmin -h 127.0.0.1 -P $Port -u root ping 2>&1
    if ($ping -match "alive") {
        $ready = $true
        break
    }
}

if ($ready) {
    Write-Host "MySQL 8 is ready on port $Port!"
    & $mysql -h 127.0.0.1 -P $Port -u root -e "CREATE DATABASE IF NOT EXISTS ledgerline CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
    Write-Host "Database 'ledgerline' verified!"
    $proc | Out-Null
} else {
    Write-Error "Failed to start MySQL."
}


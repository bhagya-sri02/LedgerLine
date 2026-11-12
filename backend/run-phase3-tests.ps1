$ErrorActionPreference = "Continue"

$targetDir = (Get-Item "backend/target").FullName
$datadir = Join-Path $targetDir "mysql-test-data"
$mysqld = "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysqld.exe"
$mysql = "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe"
$mysqladmin = "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysqladmin.exe"
$port = 3307
$dbname = "ledgerline_test_" + (Get-Date -Format "yyyyMMdd_HHmmss")

if (-not (Test-Path $datadir)) {
    Write-Host "Initializing temporary MySQL test datadir at $datadir..."
    New-Item -ItemType Directory -Path $datadir -Force | Out-Null
    & $mysqld --initialize-insecure --datadir="$datadir"
    Start-Sleep -Seconds 2
}

Write-Host "Starting MySQL 8 instance on port $port..."
$process = Start-Process -FilePath $mysqld -ArgumentList "--datadir=`"$datadir`"", "--port=$port", "--console" -PassThru

try {
    $ready = $false
    for ($i = 0; $i -lt 30; $i++) {
        Start-Sleep -Seconds 1
        $ping = & $mysqladmin -h 127.0.0.1 -P $port -u root ping 2>&1
        if ($ping -match "alive") {
            $ready = $true
            break
        }
    }

    if (-not $ready) {
        Write-Error "MySQL 8 failed to start within 30 seconds."
        return
    }
    Start-Sleep -Seconds 2
    Write-Host "MySQL 8 is ALIVE and ready on port $port!"

    # Create clean test database
    & $mysql -h 127.0.0.1 -P $port -u root -e "CREATE DATABASE IF NOT EXISTS $dbname CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

    # Run the Spring Boot test against MySQL 8
    Write-Host "Running tests against MySQL 8..."
    $env:JAVA_HOME = "C:\Program Files\Java\jdk-22"
    Push-Location -Path "backend"
    try {
        cmd /c "mvnw.cmd test `"-Dtest=*IntegrationTest`" `"-Dspring.datasource.url=jdbc:mysql://127.0.0.1:3307/$dbname`" `"-Dspring.datasource.username=root`" `"-Dspring.datasource.password=`" `"-Dspring.datasource.driver-class-name=com.mysql.cj.jdbc.Driver`""
    } finally {
        Pop-Location
    }

} finally {
    Write-Host "Stopping MySQL 8 instance..."
    & $mysqladmin -h 127.0.0.1 -P $port -u root shutdown 2>&1 | Out-Null
    if ($process -and -not $process.HasExited) {
        $process.Kill()
    }
}

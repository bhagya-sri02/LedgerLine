$body = @{ username = 'admin'; password = 'Admin@123456' } | ConvertTo-Json
$login = Invoke-RestMethod -Uri 'http://localhost:8080/api/v1/auth/login' -Method Post -Body $body -ContentType 'application/json'

Write-Host ">>> Live Auth Success!" -ForegroundColor Green
Write-Host "Username:      $($login.username)"
Write-Host "Role:          $($login.role)"
Write-Host "JWT Issued:    $($login.token.Substring(0, 30))... (valid 24h)"

$headers = @{ Authorization = "Bearer $($login.token)" }
$accounts = Invoke-RestMethod -Uri 'http://localhost:8080/api/v1/admin/accounts' -Headers $headers

Write-Host "`n>>> Live Admin Accounts Query Success!" -ForegroundColor Green
Write-Host "Accounts count: $($accounts.Count)"
foreach ($acc in $accounts) {
    Write-Host " - Account #$($acc.accountNumber) ($($acc.accountType)): Available = `$$($acc.balance) $($acc.currency) [$($acc.status)]"
}

$hba = 'C:\Program Files\PostgreSQL\18\data\pg_hba.conf'
$bak = "$hba.bak"
$data = 'C:\Program Files\PostgreSQL\18\data'
$bin  = 'C:\Program Files\PostgreSQL\18\bin'

Copy-Item $hba $bak -Force
$raw = Get-Content $hba -Raw
$raw = $raw -replace 'scram-sha-256', 'trust'
Set-Content -Path $hba -Value $raw -NoNewline -Encoding ASCII

& "$bin\pg_ctl.exe" reload -D $data
if ($LASTEXITCODE -ne 0) { Write-Output "RELOAD_FAILED"; exit 1 }
Start-Sleep -Seconds 2

& "$bin\psql.exe" -w -h 127.0.0.1 -p 5433 -U postgres -d postgres -c "ALTER USER postgres PASSWORD 'learnova_dev_pw';"
if ($LASTEXITCODE -ne 0) { Write-Output "ALTER_FAILED"; exit 1 }

Copy-Item $bak $hba -Force
& "$bin\pg_ctl.exe" reload -D $data
Write-Output "PG_PASSWORD_RESET_OK pg_hba_restored"

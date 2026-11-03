# Resets the database to fresh sample data: every table is dropped and
# rebuilt, then the real AI embeddings are generated.
#   npm run db:reset
# Uses DATABASE_URL from .env, so no password needs to be typed.
# WARNING: deletes everything in the database (accounts, jobs, applications).

$ErrorActionPreference = "Stop"
Set-Location (Split-Path $PSScriptRoot -Parent)   # the project folder

$line = Get-Content .env -ErrorAction SilentlyContinue | Where-Object { $_ -match '^\s*DATABASE_URL\s*=' } | Select-Object -Last 1
if (-not $line) { Write-Host "DATABASE_URL not found in .env (see SETUP.md, step 9b)." -ForegroundColor Red; exit 1 }
$url = ($line -replace '^\s*DATABASE_URL\s*=\s*', '').Trim().Trim('"').Trim("'")

# Split postgres://USER:PASSWORD@HOST:PORT/DATABASE into its parts. The password
# is matched greedily up to the LAST "@", so it may contain "@" even if it was not
# written as %40 (psql itself would misread such a URL). %XX codes are decoded.
if ($url -notmatch '^postgres(?:ql)?://([^:/@]+)(?::(.*))?@([^@/:]+)(?::(\d+))?/([^?]+)') {
    Write-Host "DATABASE_URL in .env doesn't look like postgres://USER:PASSWORD@HOST:PORT/DATABASE" -ForegroundColor Red
    exit 1
}
$dbUser = [uri]::UnescapeDataString($Matches[1])
$env:PGPASSWORD = [uri]::UnescapeDataString("$($Matches[2])")   # psql reads the password from here
$dbHost = $Matches[3]
$dbPort = if ($Matches[4]) { $Matches[4] } else { "5432" }
$dbName = [uri]::UnescapeDataString($Matches[5])

Write-Host "This DELETES all data in database '$dbName' on $($dbHost):$dbPort and reloads the sample data." -ForegroundColor Yellow
$answer = Read-Host "Type RESET to continue"
if ($answer -ne "RESET") { Write-Host "Cancelled. Nothing was changed."; exit 0 }

# Same order as SETUP.md: structure, then rules, then data.
$files = "schema", "alter_drop", "embeddings_alter", "triggers", "seed", "seed_text"
foreach ($file in $files) {
    Write-Host "Running sql/$file.sql ..."
    psql -h $dbHost -p $dbPort -U $dbUser -d $dbName -w -X -q -v ON_ERROR_STOP=1 -f "sql/$file.sql" | Out-Null
    if ($LASTEXITCODE -ne 0) { Write-Host "sql/$file.sql failed; stopped." -ForegroundColor Red; exit 1 }
}

Write-Host "Generating AI embeddings ..."
npm run embed:all
if ($LASTEXITCODE -ne 0) { exit 1 }
Write-Host "Database reset complete." -ForegroundColor Green

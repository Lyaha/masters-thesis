Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$settingsPath = Join-Path $projectRoot '.env'
if (Test-Path -LiteralPath $settingsPath) {
	Write-Output 'Existing .env preserved. See docs/security.md for upgrading an existing database.'
	exit 0
}
function New-Secret {
	$bytes = New-Object byte[] 32
	$generator = [System.Security.Cryptography.RandomNumberGenerator]::Create()
	try { $generator.GetBytes($bytes) } finally { $generator.Dispose() }
	return [System.BitConverter]::ToString($bytes).Replace('-', '').ToLowerInvariant()
}
$settings = @(
	"POSTGRES_PASSWORD=$(New-Secret)"
	"JWT_SECRET=$(New-Secret)"
	'ADMIN_EMAIL=admin@example.com'
	"ADMIN_PASSWORD=$(New-Secret)"
)
[System.IO.File]::WriteAllLines($settingsPath, $settings, (New-Object System.Text.UTF8Encoding($false)))
Write-Output 'Created .env with unique secrets. Administrator credentials are in .env; do not commit or share this file.'

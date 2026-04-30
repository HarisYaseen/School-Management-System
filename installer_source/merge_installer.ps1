$projectName = "SMS_Connect"
$version = "1.0.8"
$baseDir = Get-Location
$distPath = Join-Path $baseDir "dist\win-unpacked"
$zipFile = Join-Path $baseDir "installer_source\app.zip"
$stubFile = Join-Path $baseDir "installer_source\stub.exe"
$outFile = Join-Path $baseDir "dist\${projectName}_V${version}_Setup.exe"

Write-Host "--- BUILD STAGE: Zipping Application ---" -ForegroundColor Cyan
if (Test-Path $zipFile) { Remove-Item $zipFile -Force }

if (!(Test-Path $distPath)) {
    Write-Host "ERROR: Electron build not found at $distPath" -ForegroundColor Red
    exit 1
}

# Use .NET compression for speed and memory efficiency
Add-Type -AssemblyName System.IO.Compression.FileSystem
[System.IO.Compression.ZipFile]::CreateFromDirectory($distPath, $zipFile)

# Calculate SHA256 for integrity verification
$sha256 = (Get-FileHash $zipFile -Algorithm SHA256).Hash.ToLower()
Write-Host "Payload SHA256: $sha256" -ForegroundColor Yellow
Write-Host "Update 'ExpectedSHA256' in installer.cs with this value if needed." -ForegroundColor Gray

Write-Host "--- BUILD STAGE: Merging with Stub ---" -ForegroundColor Cyan
if (!(Test-Path $stubFile)) {
    Write-Host "ERROR: Installer stub not found at $stubFile" -ForegroundColor Red
    exit 1
}

if (Test-Path $outFile) { Remove-Item $outFile -Force }

$out = [System.IO.File]::Create($outFile)
$s1 = [System.IO.File]::OpenRead($stubFile)
$s1.CopyTo($out)
$s1.Close()

$s2 = [System.IO.File]::OpenRead($zipFile)
$s2.CopyTo($out)
$s2.Close()

$out.Close()

Write-Host "==========================================" -ForegroundColor Green
Write-Host "  SUCCESS: Final Installer Created!" -ForegroundColor Green
Write-Host "  Location: $outFile" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green

#!/usr/bin/env pwsh
# Package Lambda Layer for deployment
# Usage: .\scripts\package-lambda-layer.ps1

$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$infraDir = Split-Path -Parent $scriptDir
$layerDir = Join-Path $infraDir "lambda-layers\shared-utils\nodejs"
$outputDir = Join-Path $infraDir "lambda-layers"
$outputZip = Join-Path $outputDir "shared-utils.zip"

Write-Host "Packaging Lambda Layer..." -ForegroundColor Cyan

# Check if source directory exists
if (-not (Test-Path $layerDir)) {
    Write-Error "Layer source directory not found: $layerDir"
    exit 1
}

# Install dependencies
Write-Host "Installing dependencies..." -ForegroundColor Yellow
Push-Location $layerDir
npm install --production
if ($LASTEXITCODE -ne 0) {
    Pop-Location
    Write-Error "Failed to install npm dependencies"
    exit 1
}
Pop-Location

# Remove old zip if exists
if (Test-Path $outputZip) {
    Remove-Item $outputZip -Force
}

# Create zip - Lambda expects nodejs/ folder structure
Write-Host "Creating ZIP archive..." -ForegroundColor Yellow
$tempDir = Join-Path $env:TEMP "lambda-layer-$(Get-Random)"
$nodejsDir = Join-Path $tempDir "nodejs"

# Create temp structure
New-Item -ItemType Directory -Force -Path $nodejsDir | Out-Null

# Copy files
Copy-Item -Path "$layerDir\*" -Destination $nodejsDir -Recurse

# Create zip
Compress-Archive -Path "$tempDir\*" -DestinationPath $outputZip -Force

# Cleanup
Remove-Item -Path $tempDir -Recurse -Force

# Verify
if (Test-Path $outputZip) {
    $size = (Get-Item $outputZip).Length / 1MB
    Write-Host "`nLambda Layer packaged successfully!" -ForegroundColor Green
    Write-Host "Output: $outputZip" -ForegroundColor Cyan
    Write-Host "Size: $([math]::Round($size, 2)) MB" -ForegroundColor Cyan

    if ($size -gt 50) {
        Write-Warning "Layer size exceeds 50 MB. Lambda has a 250 MB unzipped limit."
    }
} else {
    Write-Error "Failed to create ZIP file"
    exit 1
}

Write-Host "`nTo deploy, set terraform variable:" -ForegroundColor Yellow
Write-Host "  lambda_layer_zip_path = `"$outputZip`"" -ForegroundColor White

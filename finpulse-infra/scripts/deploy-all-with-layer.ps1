#!/usr/bin/env pwsh
# Deploy all Lambda functions and attach shared layer
# Usage: .\scripts\deploy-all-with-layer.ps1

$ErrorActionPreference = "Continue"

$LAYER_ARN = "arn:aws:lambda:us-east-1:383349724213:layer:finpulse-shared-utils-prod:1"
$BASE = "C:\Users\olegh\Desktop\Projects\finpulse\finpulse-infra\lambda-code"
$ENV_NAME = "prod"
$FUNCTIONS = @("auth", "market-data", "portfolio", "community", "ai", "payments", "twitter", "news", "admin")

Write-Host "Deploying Lambda functions with layer $LAYER_ARN" -ForegroundColor Cyan
Write-Host ""

foreach ($FUNC in $FUNCTIONS) {
    Write-Host "=== Deploying $FUNC ===" -ForegroundColor Cyan

    # Create temp dir
    $TempDir = Join-Path $env:TEMP "lambda-deploy-$FUNC-$(Get-Random)"
    New-Item -ItemType Directory -Force -Path $TempDir | Out-Null

    # Copy function code
    $FuncDir = Join-Path $BASE $FUNC
    Copy-Item -Path "$FuncDir\*" -Destination $TempDir -Recurse -Force -ErrorAction SilentlyContinue

    # Copy shared modules into shared/ subdir if it exists in the function
    $SharedDest = Join-Path $TempDir "shared"
    $SharedSrc = Join-Path $BASE "shared"
    if (Test-Path $SharedDest) {
        # Copy .js files from top-level shared
        Get-ChildItem -Path $SharedSrc -Filter "*.js" | ForEach-Object { Copy-Item $_.FullName -Destination $SharedDest -Force }
        # Copy node_modules from top-level shared
        $SharedNodeModules = Join-Path $SharedSrc "node_modules"
        if (Test-Path $SharedNodeModules) {
            $DestNodeModules = Join-Path $SharedDest "node_modules"
            if (!(Test-Path $DestNodeModules)) {
                Copy-Item -Path $SharedNodeModules -Destination $SharedDest -Recurse -Force
            }
        }
    }

    # Remove any stale zips inside temp
    Get-ChildItem -Path $TempDir -Filter "*.zip" | Remove-Item -Force
    # Remove secret.json if accidentally copied
    $secretFile = Join-Path $TempDir "secret.json"
    if (Test-Path $secretFile) { Remove-Item $secretFile -Force }

    # Create ZIP
    $ZipPath = Join-Path $env:TEMP "lambda-$FUNC.zip"
    if (Test-Path $ZipPath) { Remove-Item $ZipPath -Force }
    Compress-Archive -Path "$TempDir\*" -DestinationPath $ZipPath -Force

    $zipSize = [math]::Round((Get-Item $ZipPath).Length / 1KB, 1)
    Write-Host "  ZIP size: $zipSize KB"

    # Deploy code
    Write-Host "  Updating function code..."
    $result = aws lambda update-function-code --function-name "finpulse-$FUNC-$ENV_NAME" --zip-file "fileb://$ZipPath" --no-cli-pager --query "FunctionName" --output text 2>&1

    if ($LASTEXITCODE -eq 0) {
        Write-Host "  Code deployed: $result" -ForegroundColor Green
    } else {
        Write-Host "  Code deploy FAILED: $result" -ForegroundColor Red
    }

    # Cleanup
    Remove-Item -Path $TempDir -Recurse -Force
    Remove-Item $ZipPath -Force -ErrorAction SilentlyContinue
    Write-Host ""
}

Write-Host "All functions deployed. Now attaching layer..." -ForegroundColor Yellow
Write-Host ""

# Wait for all code updates to settle
Start-Sleep -Seconds 5

# Attach layer to all functions
foreach ($FUNC in $FUNCTIONS) {
    Write-Host "Attaching layer to finpulse-$FUNC-$ENV_NAME..."

    # Wait for function to be ready (not in Pending state)
    $retries = 0
    do {
        $state = aws lambda get-function-configuration --function-name "finpulse-$FUNC-$ENV_NAME" --query "LastUpdateStatus" --output text 2>&1
        if ($state -eq "InProgress") {
            Write-Host "  Waiting for function to be ready..."
            Start-Sleep -Seconds 3
            $retries++
        }
    } while ($state -eq "InProgress" -and $retries -lt 10)

    $result = aws lambda update-function-configuration --function-name "finpulse-$FUNC-$ENV_NAME" --layers $LAYER_ARN --no-cli-pager --query "{FunctionName: FunctionName, Layers: Layers[*].Arn}" --output json 2>&1

    if ($LASTEXITCODE -eq 0) {
        Write-Host "  Layer attached" -ForegroundColor Green
    } else {
        Write-Host "  Layer attach FAILED: $result" -ForegroundColor Red
    }
    Write-Host ""
}

Write-Host "All done!" -ForegroundColor Green

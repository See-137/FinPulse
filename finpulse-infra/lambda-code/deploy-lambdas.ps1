# FinPulse Lambda Deployment Script
# Installs dependencies and creates deployment packages

param(
    [string]$Environment = "prod",
    [switch]$SkipInstall
)

$ErrorActionPreference = "Stop"
$LambdaCodeDir = $PSScriptRoot

Write-Host "FinPulse Lambda Deployment Script" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan
Write-Host ""

# Lambda functions to deploy
$Functions = @("admin", "ai", "auth", "community", "fx", "market-data", "news", "portfolio")

# Step 1: Install shared module dependencies
if (-not $SkipInstall) {
    Write-Host "[1/4] Installing shared module dependencies..." -ForegroundColor Yellow
    Push-Location "$LambdaCodeDir\shared"
    
    if (Test-Path "node_modules") {
        Remove-Item -Recurse -Force "node_modules"
    }
    
    npm install --production
    Pop-Location
    Write-Host "  ✓ Shared dependencies installed" -ForegroundColor Green
}

# Step 2: Copy shared module to each Lambda function
Write-Host "[2/4] Copying shared module to Lambda functions..." -ForegroundColor Yellow

foreach ($func in $Functions) {
    $targetDir = "$LambdaCodeDir\$func\shared"
    
    # Remove existing shared directory
    if (Test-Path $targetDir) {
        Remove-Item -Recurse -Force $targetDir
    }
    
    # Copy shared module
    Copy-Item -Recurse "$LambdaCodeDir\shared" $targetDir
    
    # Copy secret.json for local development (API keys)
    $secretFile = "$LambdaCodeDir\secret.json"
    if (Test-Path $secretFile) {
        Copy-Item $secretFile "$LambdaCodeDir\$func\secret.json" -Force
        Write-Host "  ✓ Copied shared + secret.json to $func" -ForegroundColor Green
    } else {
        Write-Host "  ✓ Copied shared to $func" -ForegroundColor Green
    }
}

# Step 3: Install function-specific dependencies
Write-Host "[3/4] Installing function dependencies..." -ForegroundColor Yellow

foreach ($func in $Functions) {
    $funcDir = "$LambdaCodeDir\$func"
    $packageJson = "$funcDir\package.json"
    
    if (Test-Path $packageJson) {
        Push-Location $funcDir
        
        if (Test-Path "node_modules") {
            Remove-Item -Recurse -Force "node_modules"
        }
        
        npm install --production
        Pop-Location
        Write-Host "  ✓ $func dependencies installed" -ForegroundColor Green
    }
}

# Step 4: Create deployment packages (ZIP files)
Write-Host "[4/4] Creating deployment packages..." -ForegroundColor Yellow

$OutputDir = "$LambdaCodeDir\dist"
if (-not (Test-Path $OutputDir)) {
    New-Item -ItemType Directory -Path $OutputDir | Out-Null
}

foreach ($func in $Functions) {
    $funcDir = "$LambdaCodeDir\$func"
    $zipFile = "$OutputDir\$func.zip"
    
    # Remove existing zip
    if (Test-Path $zipFile) {
        Remove-Item $zipFile
    }
    
    # Create zip file
    Push-Location $funcDir
    Compress-Archive -Path "*" -DestinationPath $zipFile -Force
    Pop-Location
    
    $size = [math]::Round((Get-Item $zipFile).Length / 1KB, 2)
    Write-Host "  ✓ $func.zip created ($size KB)" -ForegroundColor Green
}

Write-Host ""
Write-Host "Deployment packages created in: $OutputDir" -ForegroundColor Cyan
Write-Host ""

# Optional: Deploy to AWS
$deploy = Read-Host "Deploy to AWS Lambda? (y/N)"
if ($deploy -eq "y" -or $deploy -eq "Y") {
    Write-Host ""
    Write-Host "Deploying to AWS Lambda ($Environment)..." -ForegroundColor Yellow
    
    foreach ($func in $Functions) {
        $zipFile = "$OutputDir\$func.zip"
        $functionName = "finpulse-$func-$Environment"
        
        Write-Host "  Deploying $functionName..." -ForegroundColor Gray
        
        try {
            aws lambda update-function-code `
                --function-name $functionName `
                --zip-file "fileb://$zipFile" `
                --publish | Out-Null
            
            Write-Host "  ✓ $functionName deployed" -ForegroundColor Green
        }
        catch {
            Write-Host "  ✗ Failed to deploy $functionName" -ForegroundColor Red
            Write-Host "    $_" -ForegroundColor Red
        }
    }
    
    Write-Host ""
    Write-Host "Deployment complete!" -ForegroundColor Green
}
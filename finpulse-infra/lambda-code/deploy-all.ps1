# Deploy all Lambda functions with security fixes

Write-Host "🚀 Deploying Lambda functions with security fixes..." -ForegroundColor Green
Write-Host "==================================================" -ForegroundColor Green

$FUNCTIONS = @("admin", "auth", "portfolio", "community", "market-data", "fx", "ai")
$ENVIRONMENT = "prod"

# Install shared dependencies
Write-Host ""
Write-Host "📦 Installing shared dependencies..." -ForegroundColor Cyan
Push-Location shared
npm install --production
Pop-Location

foreach ($FUNC in $FUNCTIONS) {
    Write-Host ""
    Write-Host "📦 Packaging $FUNC..." -ForegroundColor Cyan
    
    # Create temporary directory
    $TempDir = "$env:TEMP\lambda-$FUNC"
    New-Item -ItemType Directory -Force -Path $TempDir | Out-Null
    
    # Copy function code
    Copy-Item -Path "$FUNC\*" -Destination $TempDir -Recurse -Force
    
    # Copy shared modules
    $SharedDir = Join-Path $TempDir "shared"
    New-Item -ItemType Directory -Force -Path $SharedDir | Out-Null
    Copy-Item -Path "shared\*.js" -Destination $SharedDir -Force
    if (Test-Path "shared\node_modules") {
        Copy-Item -Path "shared\node_modules" -Destination $SharedDir -Recurse -Force
    }
    
    # Create ZIP
    $ZipPath = "$TempDir\$FUNC.zip"
    Push-Location $TempDir
    Compress-Archive -Path * -DestinationPath $ZipPath -Force
    Pop-Location
    
    # Deploy to AWS
    Write-Host "🚀 Deploying finpulse-$FUNC-$ENVIRONMENT..." -ForegroundColor Yellow
    aws lambda update-function-code `
        --function-name "finpulse-$FUNC-$ENVIRONMENT" `
        --zip-file "fileb://$ZipPath" `
        --no-cli-pager
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ $FUNC deployed successfully" -ForegroundColor Green
    } else {
        Write-Host "❌ Failed to deploy $FUNC" -ForegroundColor Red
    }
    
    # Cleanup
    Remove-Item -Path $TempDir -Recurse -Force
}

Write-Host ""
Write-Host "✅ All Lambda functions deployed successfully!" -ForegroundColor Green

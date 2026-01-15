# FinPulse Lambda Deployment Script
# Zips and deploys all Lambda functions to AWS

$ErrorActionPreference = "Stop"

$LAMBDA_BASE = "c:\Users\olegh\Desktop\FinPulse App Lib\finpulse-infrastructure\lambda-code"
$REGION = "us-east-1"
$ENVIRONMENT = "prod"
$PROJECT = "finpulse"

# Lambda function mappings (folder name -> AWS function name)
$LAMBDAS = @{
    "market-data" = "finpulse-market-data-prod"
    "portfolio"   = "finpulse-portfolio-prod"
    "fx"          = "finpulse-fx-prod"
    "news"        = "finpulse-news-prod"
    "community"   = "finpulse-community-prod"
    "auth"        = "finpulse-auth-prod"
    "admin"       = "finpulse-admin-prod"
}

Write-Host "`n=== FinPulse Lambda Deployment ===" -ForegroundColor Cyan
Write-Host "Region: $REGION"
Write-Host "Environment: $ENVIRONMENT`n"

# Create temp directory for zips
$TEMP_DIR = "$env:TEMP\finpulse-lambda-deploy"
if (Test-Path $TEMP_DIR) {
    Remove-Item -Recurse -Force $TEMP_DIR
}
New-Item -ItemType Directory -Path $TEMP_DIR | Out-Null

$successCount = 0
$failCount = 0

foreach ($folder in $LAMBDAS.Keys) {
    $functionName = $LAMBDAS[$folder]
    $sourcePath = "$LAMBDA_BASE\$folder"
    $zipPath = "$TEMP_DIR\$folder.zip"
    
    Write-Host "Deploying $functionName..." -ForegroundColor Yellow
    
    try {
        # Check if source exists
        if (-not (Test-Path "$sourcePath\index.js")) {
            Write-Host "  [SKIP] No index.js found in $folder" -ForegroundColor Gray
            continue
        }
        
        # Create zip file
        Write-Host "  Creating zip..." -NoNewline
        Compress-Archive -Path "$sourcePath\*" -DestinationPath $zipPath -Force
        Write-Host " done" -ForegroundColor Green
        
        # Deploy to AWS
        Write-Host "  Uploading to AWS..." -NoNewline
        $result = aws lambda update-function-code `
            --function-name $functionName `
            --zip-file "fileb://$zipPath" `
            --region $REGION `
            --output json 2>&1
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host " success!" -ForegroundColor Green
            $successCount++
        } else {
            Write-Host " FAILED" -ForegroundColor Red
            Write-Host "  Error: $result" -ForegroundColor Red
            $failCount++
        }
    }
    catch {
        Write-Host " ERROR" -ForegroundColor Red
        Write-Host "  $_" -ForegroundColor Red
        $failCount++
    }
}

# Cleanup
Remove-Item -Recurse -Force $TEMP_DIR -ErrorAction SilentlyContinue

Write-Host "`n=== Deployment Complete ===" -ForegroundColor Cyan
Write-Host "Success: $successCount" -ForegroundColor Green
Write-Host "Failed:  $failCount" -ForegroundColor $(if ($failCount -gt 0) { "Red" } else { "Green" })

if ($failCount -eq 0) {
    Write-Host "`nAll Lambda functions deployed successfully!" -ForegroundColor Green
} else {
    Write-Host "`nSome deployments failed. Check errors above." -ForegroundColor Yellow
}

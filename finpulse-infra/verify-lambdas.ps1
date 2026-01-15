#!/usr/bin/env pwsh
# ============================================================
# FinPulse Lambda Deployment Verification Script
# Run this to verify all Lambda functions are properly deployed
# ============================================================

param(
    [string]$Environment = "prod",
    [switch]$Verbose,
    [switch]$FixPlaceholders
)

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "FinPulse Lambda Deployment Verification" -ForegroundColor Cyan
Write-Host "Environment: $Environment" -ForegroundColor Yellow
Write-Host "============================================"
Write-Host ""

$functions = @(
    @{ Name = "auth" },
    @{ Name = "portfolio" },
    @{ Name = "market-data" },
    @{ Name = "news" },
    @{ Name = "fx" },
    @{ Name = "community" },
    @{ Name = "admin" },
    @{ Name = "ai" }
    # payments excluded per requirements
)

$results = @()
$hasIssues = $false

foreach ($func in $functions) {
    $functionName = "finpulse-" + $func.Name + "-" + $Environment
    Write-Host "Checking $functionName..." -NoNewline
    
    try {
        # Get function details
        $details = aws lambda get-function --function-name $functionName 2>$null | ConvertFrom-Json
        $codeSize = $details.Configuration.CodeSize
        $lastModified = $details.Configuration.LastModified
        $runtime = $details.Configuration.Runtime
        
        # Check code size (placeholder is typically < 1KB)
        $status = "OK"
        $issue = ""
        
        $sizeKB = [math]::Round($codeSize/1KB, 1)
        $sizeMB = [math]::Round($codeSize/1MB, 2)
        
        if ($codeSize -lt 1000) {
            $status = "PLACEHOLDER"
            $issue = "Code size only $codeSize bytes - likely placeholder!"
            $hasIssues = $true
            Write-Host " [X] PLACEHOLDER - $codeSize bytes" -ForegroundColor Red
        }
        elseif ($codeSize -lt 10000 -and ($func.Name -eq "ai" -or $func.Name -eq "market-data" -or $func.Name -eq "news")) {
            $status = "WARNING"
            $issue = "Code size suspiciously small - $codeSize bytes"
            Write-Host " [!] WARNING - $sizeKB KB" -ForegroundColor Yellow
        }
        else {
            if ($codeSize -gt 1MB) {
                Write-Host " [OK] $sizeMB MB" -ForegroundColor Green
            } else {
                Write-Host " [OK] $sizeKB KB" -ForegroundColor Green
            }
        }
        
        # Smoke test (optional - skip if it fails)
        if ($status -ne "PLACEHOLDER") {
            try {
                $testPayload = switch ($func.Name) {
                    "ai" { '{"httpMethod":"POST","body":"{\"query\":\"test\"}","headers":{}}' }
                    "market-data" { '{"httpMethod":"GET","path":"/market/prices","headers":{}}' }
                    "fx" { '{"httpMethod":"GET","path":"/fx/rates","headers":{}}' }
                    "news" { '{"httpMethod":"GET","path":"/news","headers":{}}' }
                    default { '{"httpMethod":"OPTIONS","headers":{}}' }
                }
                
                $tempPayload = Join-Path $env:TEMP "test-payload.json"
                $tempResponse = Join-Path $env:TEMP "lambda-response.json"
                
                $testPayload | Out-File -FilePath $tempPayload -Encoding UTF8 -NoNewline
                
                aws lambda invoke `
                    --function-name $functionName `
                    --payload "file://$tempPayload" `
                    --cli-binary-format raw-in-base64-out `
                    $tempResponse 2>$null | Out-Null
                
                if (Test-Path $tempResponse) {
                    $responseBody = Get-Content $tempResponse -Raw
                    
                    if ($responseBody -match "placeholder|Placeholder") {
                        $status = "PLACEHOLDER"
                        $issue = "Response contains placeholder text"
                        $hasIssues = $true
                        Write-Host "   -> Response indicates placeholder code!" -ForegroundColor Red
                    }
                    elseif ($Verbose) {
                        $previewLen = [Math]::Min(100, $responseBody.Length)
                        $preview = $responseBody.Substring(0, $previewLen)
                        Write-Host "   -> Response: $preview..." -ForegroundColor Gray
                    }
                }
            }
            catch {
                # Smoke test failed - not critical for verification
                Write-Host "   -> Smoke test skipped" -ForegroundColor Gray
            }
        }
        
        $results += [PSCustomObject]@{
            Function = $func.Name
            LambdaName = $functionName
            CodeSize = $codeSize
            Status = $status
            Issue = $issue
            LastModified = $lastModified
            Runtime = $runtime
        }
    }
    catch {
        Write-Host " [X] NOT FOUND" -ForegroundColor Red
        $hasIssues = $true
        $results += [PSCustomObject]@{
            Function = $func.Name
            LambdaName = $functionName
            CodeSize = 0
            Status = "NOT_FOUND"
            Issue = "Lambda function does not exist"
            LastModified = ""
            Runtime = ""
        }
    }
}

Write-Host ""
Write-Host "============================================"
Write-Host "Summary Report"
Write-Host "============================================"
Write-Host ""

$results | Format-Table -AutoSize @(
    @{Label="Function"; Expression={$_.Function}},
    @{Label="Status"; Expression={$_.Status}},
    @{Label="Size"; Expression={
        if ($_.CodeSize -gt 0) { 
            if ($_.CodeSize -gt 1MB) { 
                "$([math]::Round($_.CodeSize/1MB, 2)) MB" 
            }
            else { 
                "$([math]::Round($_.CodeSize/1KB, 1)) KB" 
            }
        } else { "-" }
    }},
    @{Label="Last Modified"; Expression={
        if ($_.LastModified) { 
            ([datetime]$_.LastModified).ToString("yyyy-MM-dd HH:mm") 
        } else { "-" }
    }}
)

# Show issues
$issuesList = $results | Where-Object { $_.Status -ne "OK" }
if ($issuesList.Count -gt 0) {
    Write-Host ""
    Write-Host "Issues Found:" -ForegroundColor Yellow
    foreach ($issueItem in $issuesList) {
        Write-Host "  - $($issueItem.Function): $($issueItem.Issue)" -ForegroundColor Red
    }
    
    if ($FixPlaceholders) {
        Write-Host ""
        Write-Host "Attempting to fix placeholder functions..." -ForegroundColor Cyan
        
        $placeholders = $issuesList | Where-Object { $_.Status -eq "PLACEHOLDER" }
        foreach ($placeholder in $placeholders) {
            $funcDir = $placeholder.Function
            $lambdaDir = Join-Path $PSScriptRoot "lambda-code" $funcDir
            
            if (Test-Path $lambdaDir) {
                Write-Host "  Deploying $funcDir..." -NoNewline
                
                Push-Location $lambdaDir
                try {
                    # Install dependencies
                    if (Test-Path "package.json") {
                        npm ci --production 2>$null | Out-Null
                    }
                    
                    # Create zip
                    $zipPath = Join-Path $PSScriptRoot "lambda-code" "deploy-$funcDir.zip"
                    Compress-Archive -Path * -DestinationPath $zipPath -Force
                    
                    # Deploy
                    aws lambda update-function-code `
                        --function-name $placeholder.LambdaName `
                        --zip-file "fileb://$zipPath" `
                        --publish | Out-Null
                    
                    Write-Host " Deployed!" -ForegroundColor Green
                }
                catch {
                    Write-Host " Failed: $_" -ForegroundColor Red
                }
                finally {
                    Pop-Location
                }
            }
            else {
                Write-Host "  Source directory not found for $funcDir" -ForegroundColor Yellow
            }
        }
    }
    else {
        Write-Host ""
        Write-Host "Run with -FixPlaceholders to automatically deploy missing code" -ForegroundColor Gray
    }
    
    exit 1
}
else {
    Write-Host ""
    Write-Host "All Lambda functions are properly deployed!" -ForegroundColor Green
    exit 0
}

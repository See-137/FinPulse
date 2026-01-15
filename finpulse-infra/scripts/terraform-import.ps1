# FinPulse Terraform Mass Import Script
# Imports all 36+ orphaned AWS resources into Terraform state

$ErrorActionPreference = "Continue"
Set-Location "C:\Users\olegh\Desktop\FinPulse-client\finpulse-infrastructure"

Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "   FinPulse Terraform Mass Import Script" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

$successful = 0
$failed = 0

function Import-Resource {
    param([string]$Address, [string]$ID, [string]$Description)
    
    Write-Host "  Importing: $Description" -ForegroundColor Yellow
    Write-Host "    Address: $Address" -ForegroundColor Gray
    Write-Host "    ID: $ID" -ForegroundColor Gray
    
    $result = terraform import $Address $ID 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "    ✅ Success" -ForegroundColor Green
        $script:successful++
    } else {
        Write-Host "    ❌ Failed: $result" -ForegroundColor Red
        $script:failed++
    }
    Write-Host ""
}

# =============================================================================
# 1. COGNITO USER POOLS (2 resources)
# =============================================================================
Write-Host "`n📦 IMPORTING COGNITO USER POOLS..." -ForegroundColor Magenta

Import-Resource `
    "module.cognito.aws_cognito_user_pool.main" `
    "us-east-1_b36NPuJf3" `
    "Cognito User Pool (prod)"

# Get the Cognito client ID
$cognitoClientId = aws cognito-idp list-user-pool-clients --user-pool-id us-east-1_b36NPuJf3 --query "UserPoolClients[0].ClientId" --output text 2>$null

Import-Resource `
    "module.cognito.aws_cognito_user_pool_client.main" `
    "us-east-1_b36NPuJf3/$cognitoClientId" `
    "Cognito User Pool Client (prod)"

# =============================================================================
# 2. DYNAMODB TABLES (7 resources)
# =============================================================================
Write-Host "`n📦 IMPORTING DYNAMODB TABLES..." -ForegroundColor Magenta

Import-Resource `
    "module.dynamodb.aws_dynamodb_table.users" `
    "finpulse-users-prod" `
    "DynamoDB Users Table"

Import-Resource `
    "module.dynamodb.aws_dynamodb_table.portfolios" `
    "finpulse-portfolios-prod" `
    "DynamoDB Portfolios Table"

Import-Resource `
    "module.dynamodb.aws_dynamodb_table.market_prices" `
    "finpulse-market-prices-prod" `
    "DynamoDB Market Prices Table"

Import-Resource `
    "module.dynamodb.aws_dynamodb_table.news" `
    "finpulse-news-prod" `
    "DynamoDB News Table"

Import-Resource `
    "module.dynamodb.aws_dynamodb_table.community_posts" `
    "finpulse-community-posts-prod" `
    "DynamoDB Community Posts Table"

Import-Resource `
    "module.dynamodb.aws_dynamodb_table.ai_queries" `
    "finpulse-ai-queries-prod" `
    "DynamoDB AI Queries Table"

Import-Resource `
    "module.dynamodb.aws_dynamodb_table.circuit_breaker" `
    "finpulse-circuit-breaker-prod" `
    "DynamoDB Circuit Breaker Table"

# =============================================================================
# 3. LAMBDA FUNCTIONS (8 prod resources)
# =============================================================================
Write-Host "`n📦 IMPORTING LAMBDA FUNCTIONS (PROD)..." -ForegroundColor Magenta

Import-Resource `
    "module.lambda.aws_lambda_function.auth_service" `
    "finpulse-auth-prod" `
    "Lambda Auth Service"

Import-Resource `
    "module.lambda.aws_lambda_function.market_data_service" `
    "finpulse-market-data-prod" `
    "Lambda Market Data Service"

Import-Resource `
    "module.lambda.aws_lambda_function.portfolio_service" `
    "finpulse-portfolio-prod" `
    "Lambda Portfolio Service"

Import-Resource `
    "module.lambda.aws_lambda_function.fx_service" `
    "finpulse-fx-prod" `
    "Lambda FX Service"

Import-Resource `
    "module.lambda.aws_lambda_function.ai_service" `
    "finpulse-ai-prod" `
    "Lambda AI Service"

Import-Resource `
    "module.lambda.aws_lambda_function.news_service" `
    "finpulse-news-prod" `
    "Lambda News Service"

Import-Resource `
    "module.lambda.aws_lambda_function.community_service" `
    "finpulse-community-prod" `
    "Lambda Community Service"

Import-Resource `
    "module.lambda.aws_lambda_function.admin_service" `
    "finpulse-admin-prod" `
    "Lambda Admin Service"

# =============================================================================
# 4. SECRETS MANAGER (6 resources)
# =============================================================================
Write-Host "`n📦 IMPORTING SECRETS MANAGER SECRETS..." -ForegroundColor Magenta

Import-Resource `
    'module.secrets.aws_secretsmanager_secret.secrets["coingecko-api-key"]' `
    "arn:aws:secretsmanager:us-east-1:383349724213:secret:finpulse/prod/coingecko-api-key-2nYARX" `
    "Secret: CoinGecko API Key"

Import-Resource `
    'module.secrets.aws_secretsmanager_secret.secrets["alphavantage-api-key"]' `
    "arn:aws:secretsmanager:us-east-1:383349724213:secret:finpulse/prod/alphavantage-api-key-ldWQiO" `
    "Secret: AlphaVantage API Key"

Import-Resource `
    'module.secrets.aws_secretsmanager_secret.secrets["newsapi-key"]' `
    "arn:aws:secretsmanager:us-east-1:383349724213:secret:finpulse/prod/newsapi-key-O67JPN" `
    "Secret: NewsAPI Key"

Import-Resource `
    'module.secrets.aws_secretsmanager_secret.secrets["exchangerate-api-key"]' `
    "arn:aws:secretsmanager:us-east-1:383349724213:secret:finpulse/prod/exchangerate-api-key-pUtYGC" `
    "Secret: ExchangeRate API Key"

Import-Resource `
    'module.secrets.aws_secretsmanager_secret.secrets["gemini-api-key"]' `
    "arn:aws:secretsmanager:us-east-1:383349724213:secret:finpulse/prod/gemini-api-key-lE3Jj4" `
    "Secret: Gemini API Key"

# =============================================================================
# 5. API GATEWAY (prod)
# =============================================================================
Write-Host "`n📦 IMPORTING API GATEWAY..." -ForegroundColor Magenta

Import-Resource `
    "module.api_gateway.aws_api_gateway_rest_api.main" `
    "b3fgmin9yj" `
    "API Gateway REST API (prod)"

# =============================================================================
# 6. VPC RESOURCES
# =============================================================================
Write-Host "`n📦 IMPORTING VPC RESOURCES..." -ForegroundColor Magenta

Import-Resource `
    "aws_vpc.main" `
    "vpc-094d78d41ebab7d48" `
    "VPC (prod)"

# =============================================================================
# SUMMARY
# =============================================================================
Write-Host "`n═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "   IMPORT SUMMARY" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  ✅ Successful imports: $successful" -ForegroundColor Green
Write-Host "  ❌ Failed imports: $failed" -ForegroundColor $(if ($failed -gt 0) { "Red" } else { "Green" })
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  1. Run 'terraform state list' to verify imports" -ForegroundColor White
Write-Host "  2. Run 'terraform plan' to check for drift" -ForegroundColor White
Write-Host "  3. Fix any configuration differences in .tf files" -ForegroundColor White

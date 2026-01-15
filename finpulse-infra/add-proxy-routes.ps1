# Add proxy routes to API Gateway for all services
# Run this script to enable nested paths like /market/history, /fx/convert, etc.

$API_ID = "b3fgmin9yj"
$REGION = "us-east-1"
$ACCOUNT = "383349724213"

# Routes to add proxy to
$routes = @(
    @{ path = "/market"; parentId = "z033iz"; lambda = "finpulse-market-data-prod" }
    @{ path = "/fx"; parentId = "n5e948"; lambda = "finpulse-fx-prod" }
    @{ path = "/news"; parentId = "ozkgqi"; lambda = "finpulse-news-prod" }
    @{ path = "/community"; parentId = "mofgz0"; lambda = "finpulse-community-prod" }
    @{ path = "/portfolio"; parentId = "w4nvj5"; lambda = "finpulse-portfolio-prod" }
    @{ path = "/auth"; parentId = "yaq7do"; lambda = "finpulse-auth-prod" }
)

Write-Host "Adding proxy routes to API Gateway..." -ForegroundColor Cyan

foreach ($route in $routes) {
    Write-Host "`nProcessing $($route.path)..." -ForegroundColor Yellow
    
    # Create proxy resource
    $result = aws apigateway create-resource --rest-api-id $API_ID --parent-id $route.parentId --path-part "{proxy+}" --region $REGION --output json 2>&1
    
    if ($result -match '"id"') {
        $proxyId = ($result | ConvertFrom-Json).id
        Write-Host "  Created resource: $proxyId" -ForegroundColor Green
    } elseif ($result -match 'ConflictException') {
        # Get existing proxy ID
        $allResources = aws apigateway get-resources --rest-api-id $API_ID --region $REGION --output json | ConvertFrom-Json
        $proxyId = ($allResources.items | Where-Object { $_.path -eq "$($route.path)/{proxy+}" }).id
        Write-Host "  Using existing: $proxyId" -ForegroundColor Cyan
    } else {
        Write-Host "  Error: $result" -ForegroundColor Red
        continue
    }
    
    # Add ANY method
    Write-Host "  Adding method..."
    aws apigateway put-method --rest-api-id $API_ID --resource-id $proxyId --http-method ANY --authorization-type NONE --region $REGION --output json 2>&1 | Out-Null
    
    # Add integration
    Write-Host "  Adding integration..."
    $lambdaArn = "arn:aws:lambda:${REGION}:${ACCOUNT}:function:$($route.lambda)"
    $integrationUri = "arn:aws:apigateway:${REGION}:lambda:path/2015-03-31/functions/$lambdaArn/invocations"
    aws apigateway put-integration --rest-api-id $API_ID --resource-id $proxyId --http-method ANY --type AWS_PROXY --integration-http-method POST --uri $integrationUri --region $REGION --output json 2>&1 | Out-Null
    
    # Add Lambda permission
    Write-Host "  Adding Lambda permission..."
    $stmtId = "apigw-proxy-$(Get-Random)"
    aws lambda add-permission --function-name $route.lambda --statement-id $stmtId --action lambda:InvokeFunction --principal apigateway.amazonaws.com --source-arn "arn:aws:execute-api:${REGION}:${ACCOUNT}:${API_ID}/*/*/*" --region $REGION 2>&1 | Out-Null
    
    Write-Host "  Done!" -ForegroundColor Green
}

Write-Host "`nDeploying API changes..." -ForegroundColor Cyan
Start-Sleep -Seconds 3
aws apigateway create-deployment --rest-api-id $API_ID --stage-name prod --region $REGION --output json

Write-Host "`nAll proxy routes added!" -ForegroundColor Green

#!/bin/bash
# Deploy all Lambda functions with security fixes

set -e

echo "🚀 Deploying Lambda functions with security fixes..."
echo "=================================================="

# List of Lambda functions
FUNCTIONS=("admin" "auth" "portfolio" "community" "market-data" "fx" "ai")
ENVIRONMENT="prod"

# Install shared dependencies
echo ""
echo "📦 Installing shared dependencies..."
cd shared
npm install --production
cd ..

for FUNC in "${FUNCTIONS[@]}"; do
  echo ""
  echo "📦 Packaging $FUNC..."
  
  # Create temporary directory
  mkdir -p "/tmp/lambda-$FUNC"
  
  # Copy function code
  cp -r "$FUNC"/* "/tmp/lambda-$FUNC/"
  
  # Copy shared modules
  mkdir -p "/tmp/lambda-$FUNC/shared"
  cp shared/*.js "/tmp/lambda-$FUNC/shared/"
  cp -r shared/node_modules "/tmp/lambda-$FUNC/shared/" 2>/dev/null || true
  
  # Create ZIP
  cd "/tmp/lambda-$FUNC"
  zip -r "$FUNC.zip" . -q
  
  # Deploy to AWS
  echo "🚀 Deploying finpulse-$FUNC-$ENVIRONMENT..."
  aws lambda update-function-code \
    --function-name "finpulse-$FUNC-$ENVIRONMENT" \
    --zip-file "fileb://$FUNC.zip" \
    --no-cli-pager
  
  # Wait for update to complete
  aws lambda wait function-updated \
    --function-name "finpulse-$FUNC-$ENVIRONMENT"
  
  echo "✅ $FUNC deployed successfully"
  
  # Cleanup
  cd -
  rm -rf "/tmp/lambda-$FUNC"
done

echo ""
echo "✅ All Lambda functions deployed successfully!"

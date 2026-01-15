#!/bin/bash
# FinPulse AWS Resource Audit Script
# Lists Terraform state files and extracts resource tags for inventory

set -e

OUTPUT_FILE="aws-resources-audit.csv"
REGION="${AWS_REGION:-us-east-1}"

echo "=========================================="
echo "FinPulse AWS Resource Audit"
echo "Region: $REGION"
echo "Date: $(date -u +"%Y-%m-%d %H:%M:%S UTC")"
echo "=========================================="
echo ""

# Initialize CSV
echo "resource_type,resource_id,environment_tag,managed_by_tag" > "$OUTPUT_FILE"

# ==========================================
# 1. List Terraform State Files in S3
# ==========================================
echo "📁 Searching for Terraform state files in S3..."
echo ""

# Find all S3 buckets
BUCKETS=$(aws s3api list-buckets --query "Buckets[].Name" --output text 2>/dev/null || echo "")

if [[ -n "$BUCKETS" ]]; then
    echo "Bucket Name | State File | Last Modified"
    echo "------------|------------|---------------"
    
    for bucket in $BUCKETS; do
        # Look for .tfstate files
        STATES=$(aws s3api list-objects-v2 \
            --bucket "$bucket" \
            --query "Contents[?contains(Key, '.tfstate')].{Key:Key,LastModified:LastModified}" \
            --output json 2>/dev/null || echo "[]")
        
        if [[ "$STATES" != "[]" && "$STATES" != "null" && -n "$STATES" ]]; then
            echo "$STATES" | jq -r '.[] | "'"$bucket"' | \(.Key) | \(.LastModified)"' 2>/dev/null || true
        fi
    done
else
    echo "No S3 buckets found or no access"
fi

echo ""
echo "=========================================="

# ==========================================
# 2. Extract VPC Tags
# ==========================================
echo "🌐 Extracting VPC resources..."

VPCS=$(aws ec2 describe-vpcs \
    --region "$REGION" \
    --query "Vpcs[].{VpcId:VpcId,Tags:Tags}" \
    --output json 2>/dev/null || echo "[]")

echo "$VPCS" | jq -r '.[] | 
    .VpcId as $id | 
    (.Tags // []) | 
    (map(select(.Key == "Environment")) | .[0].Value // "N/A") as $env |
    (map(select(.Key == "ManagedBy")) | .[0].Value // "N/A") as $managed |
    "VPC,\($id),\($env),\($managed)"' >> "$OUTPUT_FILE" 2>/dev/null || true

VPC_COUNT=$(echo "$VPCS" | jq 'length' 2>/dev/null || echo "0")
echo "  Found $VPC_COUNT VPCs"

# Subnets
SUBNETS=$(aws ec2 describe-subnets \
    --region "$REGION" \
    --query "Subnets[].{SubnetId:SubnetId,Tags:Tags}" \
    --output json 2>/dev/null || echo "[]")

echo "$SUBNETS" | jq -r '.[] | 
    .SubnetId as $id | 
    (.Tags // []) | 
    (map(select(.Key == "Environment")) | .[0].Value // "N/A") as $env |
    (map(select(.Key == "ManagedBy")) | .[0].Value // "N/A") as $managed |
    "Subnet,\($id),\($env),\($managed)"' >> "$OUTPUT_FILE" 2>/dev/null || true

SUBNET_COUNT=$(echo "$SUBNETS" | jq 'length' 2>/dev/null || echo "0")
echo "  Found $SUBNET_COUNT Subnets"

# ==========================================
# 3. Extract S3 Bucket Tags
# ==========================================
echo "🪣 Extracting S3 bucket tags..."

S3_COUNT=0
for bucket in $BUCKETS; do
    TAGS=$(aws s3api get-bucket-tagging \
        --bucket "$bucket" \
        --query "TagSet" \
        --output json 2>/dev/null || echo "[]")
    
    if [[ "$TAGS" != "[]" && -n "$TAGS" ]]; then
        ENV_TAG=$(echo "$TAGS" | jq -r 'map(select(.Key == "Environment")) | .[0].Value // "N/A"' 2>/dev/null || echo "N/A")
        MANAGED_TAG=$(echo "$TAGS" | jq -r 'map(select(.Key == "ManagedBy")) | .[0].Value // "N/A"' 2>/dev/null || echo "N/A")
    else
        ENV_TAG="N/A"
        MANAGED_TAG="N/A"
    fi
    
    echo "S3,$bucket,$ENV_TAG,$MANAGED_TAG" >> "$OUTPUT_FILE"
    ((S3_COUNT++))
done

echo "  Found $S3_COUNT S3 buckets"

# ==========================================
# 4. Extract DynamoDB Table Tags
# ==========================================
echo "📊 Extracting DynamoDB table tags..."

TABLES=$(aws dynamodb list-tables \
    --region "$REGION" \
    --query "TableNames" \
    --output json 2>/dev/null || echo "[]")

DDB_COUNT=0
for table in $(echo "$TABLES" | jq -r '.[]' 2>/dev/null); do
    # Get table ARN
    TABLE_ARN=$(aws dynamodb describe-table \
        --region "$REGION" \
        --table-name "$table" \
        --query "Table.TableArn" \
        --output text 2>/dev/null || echo "")
    
    if [[ -n "$TABLE_ARN" ]]; then
        TAGS=$(aws dynamodb list-tags-of-resource \
            --region "$REGION" \
            --resource-arn "$TABLE_ARN" \
            --query "Tags" \
            --output json 2>/dev/null || echo "[]")
        
        ENV_TAG=$(echo "$TAGS" | jq -r 'map(select(.Key == "Environment")) | .[0].Value // "N/A"' 2>/dev/null || echo "N/A")
        MANAGED_TAG=$(echo "$TAGS" | jq -r 'map(select(.Key == "ManagedBy")) | .[0].Value // "N/A"' 2>/dev/null || echo "N/A")
        
        echo "DynamoDB,$table,$ENV_TAG,$MANAGED_TAG" >> "$OUTPUT_FILE"
        ((DDB_COUNT++))
    fi
done

echo "  Found $DDB_COUNT DynamoDB tables"

# ==========================================
# 5. Extract Secrets Manager Tags
# ==========================================
echo "🔐 Extracting Secrets Manager tags..."

SECRETS=$(aws secretsmanager list-secrets \
    --region "$REGION" \
    --query "SecretList[].{Name:Name,ARN:ARN,Tags:Tags}" \
    --output json 2>/dev/null || echo "[]")

echo "$SECRETS" | jq -r '.[] | 
    .Name as $name | 
    (.Tags // []) | 
    (map(select(.Key == "Environment")) | .[0].Value // "N/A") as $env |
    (map(select(.Key == "ManagedBy")) | .[0].Value // "N/A") as $managed |
    "SecretsManager,\($name),\($env),\($managed)"' >> "$OUTPUT_FILE" 2>/dev/null || true

SECRET_COUNT=$(echo "$SECRETS" | jq 'length' 2>/dev/null || echo "0")
echo "  Found $SECRET_COUNT secrets"

# ==========================================
# 6. Extract Lambda Function Tags
# ==========================================
echo "⚡ Extracting Lambda function tags..."

LAMBDAS=$(aws lambda list-functions \
    --region "$REGION" \
    --query "Functions[].FunctionName" \
    --output json 2>/dev/null || echo "[]")

LAMBDA_COUNT=0
for func in $(echo "$LAMBDAS" | jq -r '.[]' 2>/dev/null); do
    TAGS=$(aws lambda list-tags \
        --region "$REGION" \
        --resource "arn:aws:lambda:$REGION:$(aws sts get-caller-identity --query Account --output text):function:$func" \
        --query "Tags" \
        --output json 2>/dev/null || echo "{}")
    
    ENV_TAG=$(echo "$TAGS" | jq -r '.Environment // "N/A"' 2>/dev/null || echo "N/A")
    MANAGED_TAG=$(echo "$TAGS" | jq -r '.ManagedBy // "N/A"' 2>/dev/null || echo "N/A")
    
    echo "Lambda,$func,$ENV_TAG,$MANAGED_TAG" >> "$OUTPUT_FILE"
    ((LAMBDA_COUNT++))
done

echo "  Found $LAMBDA_COUNT Lambda functions"

# ==========================================
# 7. Extract API Gateway Tags
# ==========================================
echo "🌍 Extracting API Gateway tags..."

APIS=$(aws apigateway get-rest-apis \
    --region "$REGION" \
    --query "items[].{id:id,name:name,tags:tags}" \
    --output json 2>/dev/null || echo "[]")

echo "$APIS" | jq -r '.[] | 
    .name as $name | 
    (.tags // {}) | 
    (.Environment // "N/A") as $env |
    (.ManagedBy // "N/A") as $managed |
    "APIGateway,\($name),\($env),\($managed)"' >> "$OUTPUT_FILE" 2>/dev/null || true

API_COUNT=$(echo "$APIS" | jq 'length' 2>/dev/null || echo "0")
echo "  Found $API_COUNT API Gateways"

# ==========================================
# 8. Extract Cognito User Pool Tags
# ==========================================
echo "👤 Extracting Cognito User Pool tags..."

POOLS=$(aws cognito-idp list-user-pools \
    --region "$REGION" \
    --max-results 60 \
    --query "UserPools[].{Id:Id,Name:Name}" \
    --output json 2>/dev/null || echo "[]")

COGNITO_COUNT=0
for pool_id in $(echo "$POOLS" | jq -r '.[].Id' 2>/dev/null); do
    POOL_NAME=$(echo "$POOLS" | jq -r --arg id "$pool_id" '.[] | select(.Id == $id) | .Name' 2>/dev/null || echo "$pool_id")
    
    # Get tags for the pool
    POOL_ARN="arn:aws:cognito-idp:$REGION:$(aws sts get-caller-identity --query Account --output text):userpool/$pool_id"
    TAGS=$(aws cognito-idp list-tags-for-resource \
        --resource-arn "$POOL_ARN" \
        --query "Tags" \
        --output json 2>/dev/null || echo "{}")
    
    ENV_TAG=$(echo "$TAGS" | jq -r '.Environment // "N/A"' 2>/dev/null || echo "N/A")
    MANAGED_TAG=$(echo "$TAGS" | jq -r '.ManagedBy // "N/A"' 2>/dev/null || echo "N/A")
    
    echo "Cognito,$POOL_NAME,$ENV_TAG,$MANAGED_TAG" >> "$OUTPUT_FILE"
    ((COGNITO_COUNT++))
done

echo "  Found $COGNITO_COUNT Cognito User Pools"

# ==========================================
# Summary
# ==========================================
echo ""
echo "=========================================="
echo "✅ Audit Complete!"
echo "=========================================="
echo ""
echo "Output saved to: $OUTPUT_FILE"
echo ""
echo "Resource Summary:"
echo "  VPCs:           $VPC_COUNT"
echo "  Subnets:        $SUBNET_COUNT"
echo "  S3 Buckets:     $S3_COUNT"
echo "  DynamoDB:       $DDB_COUNT"
echo "  Secrets:        $SECRET_COUNT"
echo "  Lambdas:        $LAMBDA_COUNT"
echo "  API Gateways:   $API_COUNT"
echo "  Cognito Pools:  $COGNITO_COUNT"
echo ""
echo "Preview of CSV:"
head -20 "$OUTPUT_FILE"
echo ""
echo "Total resources: $(wc -l < "$OUTPUT_FILE" | tr -d ' ') (including header)"

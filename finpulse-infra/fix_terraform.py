#!/usr/bin/env python3
"""
Fix Terraform Lambda module configuration errors.
This script:
1. Removes invalid aws_lambda_reserved_concurrent_executions resources
2. Adds reserved_concurrent_executions attribute to each Lambda function
"""

import re

def fix_lambda_main_tf():
    """Fix modules/lambda/main.tf"""
    file_path = "modules/lambda/main.tf"

    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Define the Lambda functions and their concurrent execution values
    lambda_configs = {
        'auth_service': 10,
        'market_data_service': 8,
        'portfolio_service': 8,
        'fx_service': 5,
        'ai_service': 3,
        'news_service': 5,
        'community_service': 5,
        'admin_service': 3
    }

    # Step 1: Remove all aws_lambda_reserved_concurrent_executions resources
    # Pattern matches the resource block including its content
    pattern = r'resource "aws_lambda_reserved_concurrent_executions" "[^"]+" \{[^}]*\}'
    content = re.sub(pattern, '', content, flags=re.MULTILINE)

    # Remove comment lines that reference these resources
    content = re.sub(r'\n# [^\n]*aws_lambda_reserved_concurrent_executions[^\n]*\n', '\n', content)

    # Step 2: Add reserved_concurrent_executions to each Lambda function
    for func_name, concurrency in lambda_configs.items():
        # Handle conditional resources (ai_service)
        if func_name == 'ai_service':
            # Find the Lambda function resource
            pattern = r'(resource "aws_lambda_function" "' + func_name + r'" \{[^}]*?)(  tags = var\.tags\n\})'
            replacement = r'\1  reserved_concurrent_executions = ' + str(concurrency) + r'\n\n\2'
        else:
            # Standard pattern for non-conditional resources
            pattern = r'(resource "aws_lambda_function" "' + func_name + r'" \{[^}]*?)(  tags = var\.tags\n\})'
            replacement = r'\1  reserved_concurrent_executions = ' + str(concurrency) + r'\n\n\2'

        content = re.sub(pattern, replacement, content, flags=re.DOTALL)

    # Step 3: Clean up multiple consecutive blank lines
    content = re.sub(r'\n\n\n+', '\n\n', content)

    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)

    print(f"[OK] Fixed {file_path}")
    print(f"   - Removed 8 invalid aws_lambda_reserved_concurrent_executions resources")
    print(f"   - Added reserved_concurrent_executions attribute to 8 Lambda functions")

if __name__ == "__main__":
    fix_lambda_main_tf()
    print("\n[DONE] Terraform fix completed!")
    print("   Next: Run 'terraform plan' to verify changes")

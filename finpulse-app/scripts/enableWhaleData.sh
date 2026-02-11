#!/bin/bash

# ================================================================
# Enable Live Whale Data - Quick Activation Script
# ================================================================
# This script helps you enable live whale data in FinPulse
# Usage: ./scripts/enableWhaleData.sh [your-api-key]

set -e  # Exit on error

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
ENV_FILE="$PROJECT_DIR/.env"

echo "🐋 FinPulse Whale Data Activation"
echo "=================================="
echo ""

# Check if API key provided as argument
if [ -n "$1" ]; then
    API_KEY="$1"
    echo "✓ Using API key from command line argument"
else
    # Prompt for API key
    echo "Enter your Whale Alert API key (get one at https://whale-alert.io/signup):"
    read -r API_KEY
fi

# Validate API key format
if [[ ! $API_KEY =~ ^wak_[a-zA-Z0-9]{32,}$ ]]; then
    echo ""
    echo "⚠️  Warning: API key doesn't match expected format (wak_xxxxx...)"
    echo "Continuing anyway, but this may not work."
    echo ""
fi

# Check if .env exists
if [ ! -f "$ENV_FILE" ]; then
    echo "❌ Error: .env file not found at $ENV_FILE"
    echo "Creating .env from .env.example..."

    if [ -f "$PROJECT_DIR/.env.example" ]; then
        cp "$PROJECT_DIR/.env.example" "$ENV_FILE"
        echo "✓ Created .env file"
    else
        echo "❌ Error: .env.example not found. Cannot create .env"
        exit 1
    fi
fi

echo ""
echo "Configuring .env file..."

# Update or add VITE_WHALE_ALERT_API_KEY
if grep -q "^VITE_WHALE_ALERT_API_KEY=" "$ENV_FILE"; then
    # Update existing key
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        sed -i '' "s|^VITE_WHALE_ALERT_API_KEY=.*|VITE_WHALE_ALERT_API_KEY=$API_KEY|" "$ENV_FILE"
    else
        # Linux
        sed -i "s|^VITE_WHALE_ALERT_API_KEY=.*|VITE_WHALE_ALERT_API_KEY=$API_KEY|" "$ENV_FILE"
    fi
    echo "✓ Updated VITE_WHALE_ALERT_API_KEY"
else
    # Add new key
    echo "" >> "$ENV_FILE"
    echo "VITE_WHALE_ALERT_API_KEY=$API_KEY" >> "$ENV_FILE"
    echo "✓ Added VITE_WHALE_ALERT_API_KEY"
fi

# Update or add VITE_ENABLE_LIVE_WHALE_DATA
if grep -q "^VITE_ENABLE_LIVE_WHALE_DATA=" "$ENV_FILE"; then
    # Update existing flag
    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' "s|^VITE_ENABLE_LIVE_WHALE_DATA=.*|VITE_ENABLE_LIVE_WHALE_DATA=true|" "$ENV_FILE"
    else
        sed -i "s|^VITE_ENABLE_LIVE_WHALE_DATA=.*|VITE_ENABLE_LIVE_WHALE_DATA=true|" "$ENV_FILE"
    fi
    echo "✓ Enabled live whale data"
else
    # Add new flag
    echo "VITE_ENABLE_LIVE_WHALE_DATA=true" >> "$ENV_FILE"
    echo "✓ Enabled live whale data"
fi

# Add cache and rate limit settings if missing
if ! grep -q "^CACHE_TTL_WHALE_DATA=" "$ENV_FILE"; then
    echo "CACHE_TTL_WHALE_DATA=300" >> "$ENV_FILE"
    echo "✓ Set cache TTL to 300 seconds (5 minutes)"
fi

if ! grep -q "^RATE_LIMIT_WHALE_ALERT=" "$ENV_FILE"; then
    echo "RATE_LIMIT_WHALE_ALERT=25" >> "$ENV_FILE"
    echo "✓ Set rate limit to 25 calls/minute"
fi

echo ""
echo "=================================="
echo "✅ Whale data successfully enabled!"
echo "=================================="
echo ""
echo "Configuration:"
echo "  • API Key: ${API_KEY:0:12}...${API_KEY: -4}"
echo "  • Live Data: ENABLED"
echo "  • Cache TTL: 5 minutes"
echo "  • Rate Limit: 25 calls/min"
echo ""
echo "Next steps:"
echo "  1. Restart your dev server:"
echo "     npm run dev"
echo ""
echo "  2. Test the integration:"
echo "     npx vitest run --reporter=verbose"
echo ""
echo "  3. Check the UI:"
echo "     - Open portfolio view"
echo "     - Look for whale signals (should show real data)"
echo "     - Check browser console for any warnings"
echo ""
echo "Documentation: docs/WHALE_SETUP.md"
echo ""

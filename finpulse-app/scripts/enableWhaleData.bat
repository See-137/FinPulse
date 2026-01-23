@echo off
REM ================================================================
REM Enable Live Whale Data - Quick Activation Script (Windows)
REM ================================================================
REM This script helps you enable live whale data in FinPulse
REM Usage: scripts\enableWhaleData.bat [your-api-key]

setlocal enabledelayedexpansion

echo.
echo 🐋 FinPulse Whale Data Activation
echo ==================================
echo.

REM Get API key
if "%~1"=="" (
    echo Enter your Whale Alert API key (get one at https://whale-alert.io/signup):
    set /p API_KEY=
) else (
    set API_KEY=%~1
    echo ✓ Using API key from command line argument
)

REM Check if .env exists
if not exist ".env" (
    echo ❌ Error: .env file not found
    echo Creating .env from .env.example...

    if exist ".env.example" (
        copy .env.example .env >nul
        echo ✓ Created .env file
    ) else (
        echo ❌ Error: .env.example not found. Cannot create .env
        exit /b 1
    )
)

echo.
echo Configuring .env file...

REM Backup original .env
copy .env .env.backup >nul 2>&1

REM Check if key already exists
findstr /C:"WHALE_ALERT_API_KEY=" .env >nul 2>&1
if %errorlevel%==0 (
    REM Update existing key (using PowerShell for better regex)
    powershell -Command "(Get-Content .env) -replace '^WHALE_ALERT_API_KEY=.*', 'WHALE_ALERT_API_KEY=%API_KEY%' | Set-Content .env"
    echo ✓ Updated WHALE_ALERT_API_KEY
) else (
    REM Add new key
    echo. >> .env
    echo WHALE_ALERT_API_KEY=%API_KEY% >> .env
    echo ✓ Added WHALE_ALERT_API_KEY
)

REM Enable live data flag
findstr /C:"NEXT_PUBLIC_ENABLE_LIVE_WHALE_DATA=" .env >nul 2>&1
if %errorlevel%==0 (
    powershell -Command "(Get-Content .env) -replace '^NEXT_PUBLIC_ENABLE_LIVE_WHALE_DATA=.*', 'NEXT_PUBLIC_ENABLE_LIVE_WHALE_DATA=true' | Set-Content .env"
    echo ✓ Enabled live whale data
) else (
    echo NEXT_PUBLIC_ENABLE_LIVE_WHALE_DATA=true >> .env
    echo ✓ Enabled live whale data
)

REM Add cache TTL if missing
findstr /C:"CACHE_TTL_WHALE_DATA=" .env >nul 2>&1
if %errorlevel% neq 0 (
    echo CACHE_TTL_WHALE_DATA=300 >> .env
    echo ✓ Set cache TTL to 300 seconds (5 minutes)
)

REM Add rate limit if missing
findstr /C:"RATE_LIMIT_WHALE_ALERT=" .env >nul 2>&1
if %errorlevel% neq 0 (
    echo RATE_LIMIT_WHALE_ALERT=25 >> .env
    echo ✓ Set rate limit to 25 calls/minute
)

echo.
echo ==================================
echo ✅ Whale data successfully enabled!
echo ==================================
echo.
echo Configuration:
echo   • API Key: %API_KEY:~0,12%...%API_KEY:~-4%
echo   • Live Data: ENABLED
echo   • Cache TTL: 5 minutes
echo   • Rate Limit: 25 calls/min
echo.
echo Next steps:
echo   1. Restart your dev server:
echo      npm run dev
echo.
echo   2. Test the integration:
echo      npx ts-node scripts/testWhaleDataIntegration.ts
echo.
echo   3. Check the UI:
echo      - Open portfolio view
echo      - Look for whale signals (should show real data)
echo      - Check browser console for any warnings
echo.
echo Documentation: docs\WHALE_SETUP.md
echo.
echo Backup saved to: .env.backup
echo.

endlocal

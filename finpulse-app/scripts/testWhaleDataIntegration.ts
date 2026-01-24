/* eslint-disable no-console */
/**
 * Test Script: Whale Data Integration
 *
 * Validates Whale Alert API integration and signal conversion.
 * Run with: npx ts-node scripts/testWhaleDataIntegration.ts
 */

import { getWhaleWalletService } from '../services/whaleWalletService';
import { getWhaleAlertClient } from '../services/dataProviders/whaleAlertAPI';
import { apiConfig } from '../config/apiKeys';

async function testWhaleDataIntegration() {
  console.log('🧪 Testing Whale Data Integration\n');
  console.log('='.repeat(60));

  // Test 1: Check API configuration
  console.log('\n1. Checking API Configuration...');
  console.log(`   API Key configured: ${apiConfig.whaleAlert.enabled ? '✓' : '✗'}`);
  console.log(`   Live data enabled: ${apiConfig.features.liveWhaleData ? '✓' : '✗'}`);

  if (!apiConfig.whaleAlert.enabled) {
    console.log('   ⚠️  Whale Alert API key not configured');
    console.log('   → Using mock data for testing\n');
  }

  // Test 2: Fetch whale metrics
  console.log('\n2. Fetching Whale Metrics for BTC...');
  const service = getWhaleWalletService();

  try {
    const metrics = await service.getWhaleMetrics('BTC');

    console.log('   ✓ Whale Metrics retrieved:');
    console.log(`     Symbol: ${metrics.symbol}`);
    console.log(`     Net Flow (24h): $${(metrics.netFlow24h / 1000000).toFixed(2)}M`);
    console.log(`     Large Transfers: ${metrics.largeTransfers}`);
    console.log(`     Exchange Inflow: $${(metrics.exchangeReserves.inflow / 1000000).toFixed(2)}M`);
    console.log(`     Exchange Outflow: $${(metrics.exchangeReserves.outflow / 1000000).toFixed(2)}M`);

    // Test 3: Convert to signal
    console.log('\n3. Converting to WhaleSignal...');
    const signal = service.convertToWhaleSignal(metrics);

    console.log('   ✓ Signal generated:');
    console.log(`     Symbol: ${signal.symbol}`);
    console.log(`     Direction: ${signal.direction.toUpperCase()}`);
    console.log(`     Score: ${signal.score}/100`);
    console.log(`     Activity: ${signal.activity}`);
    console.log(`     Volume Indicator: $${signal.volumeIndicator.toFixed(2)}M`);

    // Test 4: Validate signal
    console.log('\n4. Validating Signal...');
    const validations = [
      { test: 'Score in range 0-100', pass: signal.score >= 0 && signal.score <= 100 },
      {
        test: 'Direction is valid',
        pass: ['bullish', 'bearish', 'neutral'].includes(signal.direction),
      },
      {
        test: 'Activity is valid',
        pass: ['accumulation', 'distribution', 'neutral'].includes(signal.activity),
      },
      { test: 'Timestamp is recent', pass: Date.now() - signal.timestamp < 300000 }, // 5 min
    ];

    validations.forEach(v => {
      console.log(`   ${v.pass ? '✓' : '✗'} ${v.test}`);
    });

    const allPassed = validations.every(v => v.pass);
    console.log(`\n   ${allPassed ? '✅ All validations passed!' : '❌ Some validations failed'}`);

    // Test 5: Fetch large transactions (if API enabled)
    if (apiConfig.whaleAlert.enabled && apiConfig.features.liveWhaleData) {
      console.log('\n5. Fetching Large Transactions...');
      const transactions = await service.getLargeTransactions('BTC', 1000000); // $1M+

      console.log(`   ✓ Retrieved ${transactions.length} large transactions`);

      if (transactions.length > 0) {
        console.log('\n   Recent Transactions:');
        transactions.slice(0, 3).forEach((tx, idx) => {
          const time = new Date(tx.timestamp).toLocaleTimeString();
          console.log(`   ${idx + 1}. $${(tx.amountUSD / 1000000).toFixed(2)}M ${tx.symbol} - ${tx.type} (${time})`);
        });
      }
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('✅ Whale Data Integration Test Complete!\n');
    console.log('Next steps:');
    console.log('  1. Configure WHALE_ALERT_API_KEY in .env.local for live data');
    console.log('  2. Set NEXT_PUBLIC_ENABLE_LIVE_WHALE_DATA=true');
    console.log('  3. Run this test again to validate API integration\n');

  } catch (error) {
    console.error('\n❌ Test failed with error:');
    console.error(error);
    process.exit(1);
  }
}

// Run test
if (require.main === module) {
  testWhaleDataIntegration()
    .then(() => process.exit(0))
    .catch(err => {
      console.error(err);
      process.exit(1);
    });
}

export default testWhaleDataIntegration;

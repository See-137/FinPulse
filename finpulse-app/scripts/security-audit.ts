#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * FinPulse Security Audit Script
 * Performs automated checks on codebase for common security issues
 * Run with: npx node scripts/security-audit.ts
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '..');

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m',
};

interface AuditResult {
  name: string;
  passed: boolean;
  issues: string[];
  warnings: string[];
}

const results: AuditResult[] = [];

function log(color: string, message: string) {
  console.log(`${color}${message}${colors.reset}`);
}

/**
 * Check 1: Verify no hardcoded secrets or API keys
 */
function checkForHardcodedSecrets(): AuditResult {
  const issues: string[] = [];
  const patterns = [
    /sk-[\w\d]{20,}/gi, // Stripe secret keys
    /Bearer\s+[\w\d]{20,}/gi, // Bearer tokens
    /API_KEY\s*=\s*['"][\w\d]+['"]/gi, // API key assignments
    /password\s*=\s*['"][\w\d]+['"]/gi, // Password assignments
  ];

  const searchDirs = ['src', 'components', 'services', 'store'];
  
  for (const dir of searchDirs) {
    const dirPath = path.join(rootDir, dir);
    if (!fs.existsSync(dirPath)) continue;

    const files = fs.readdirSync(dirPath, { recursive: true });
    for (const file of files) {
      if (!String(file).endsWith('.ts') && !String(file).endsWith('.tsx')) continue;
      
      const filePath = path.join(dirPath, String(file));
      const content = fs.readFileSync(filePath, 'utf-8');

      for (const pattern of patterns) {
        if (pattern.test(content)) {
          issues.push(`Found potential hardcoded secret in ${filePath}`);
        }
      }
    }
  }

  return {
    name: 'No Hardcoded Secrets',
    passed: issues.length === 0,
    issues,
    warnings: [],
  };
}

/**
 * Check 2: Verify no console.log statements in production code
 */
function checkForConsoleStatements(): AuditResult {
  const issues: string[] = [];
  const searchDirs = ['src', 'components', 'services', 'store'];

  for (const dir of searchDirs) {
    const dirPath = path.join(rootDir, dir);
    if (!fs.existsSync(dirPath)) continue;

    const files = fs.readdirSync(dirPath, { recursive: true });
    for (const file of files) {
      if (!String(file).endsWith('.ts') && !String(file).endsWith('.tsx')) continue;
      
      const filePath = path.join(dirPath, String(file));
      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n');

      lines.forEach((line, idx) => {
        if (/console\.(log|error|warn|info)/i.test(line) && !line.includes('apiLogger') && !line.includes('authLogger')) {
          issues.push(`Console statement found in ${filePath}:${idx + 1}`);
        }
      });
    }
  }

  return {
    name: 'No Console Statements',
    passed: issues.length === 0,
    issues: issues.slice(0, 5), // Show first 5
    warnings: issues.length > 5 ? [`... and ${issues.length - 5} more console statements`] : [],
  };
}

/**
 * Check 3: Verify dependencies for known vulnerabilities
 */
function checkDependencies(): AuditResult {
  const warnings: string[] = [];
  const packageJsonPath = path.join(rootDir, 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));

  // List of known vulnerable versions (simplified example)
  const vulnerableDeps: Record<string, string[]> = {
    'axios': ['< 1.6.0'], // Example - not actually vulnerable
    'lodash': ['< 4.17.21'],
  };

  for (const [pkg, vulnVersions] of Object.entries(vulnerableDeps)) {
    const installed = packageJson.dependencies?.[pkg] || packageJson.devDependencies?.[pkg];
    if (installed) {
      warnings.push(`Consider auditing ${pkg}@${installed} for known vulnerabilities`);
    }
  }

  return {
    name: 'Dependency Audit',
    passed: warnings.length === 0,
    issues: [],
    warnings,
  };
}

/**
 * Check 4: Verify authorization checks in API calls
 */
function checkAuthorizationChecks(): AuditResult {
  const warnings: string[] = [];
  const servicesPath = path.join(rootDir, 'services');
  
  if (!fs.existsSync(servicesPath)) {
    return { name: 'Authorization Checks', passed: true, issues: [], warnings };
  }

  const apiServicePath = path.join(servicesPath, 'apiService.ts');
  if (fs.existsSync(apiServicePath)) {
    const content = fs.readFileSync(apiServicePath, 'utf-8');
    if (!content.includes('Authorization') && !content.includes('Bearer')) {
      warnings.push('No Bearer token authorization found in apiService.ts');
    }
  }

  return {
    name: 'Authorization Checks',
    passed: warnings.length === 0,
    issues: [],
    warnings,
  };
}

/**
 * Check 5: Verify XSS protection (DOMPurify usage)
 */
function checkXSSProtection(): AuditResult {
  const warnings: string[] = [];
  const searchDirs = ['components', 'services'];
  let foundDOMPurify = false;

  for (const dir of searchDirs) {
    const dirPath = path.join(rootDir, dir);
    if (!fs.existsSync(dirPath)) continue;

    const files = fs.readdirSync(dirPath, { recursive: true });
    for (const file of files) {
      const filePath = path.join(dirPath, String(file));
      const content = fs.readFileSync(filePath, 'utf-8');

      if (content.includes('DOMPurify')) {
        foundDOMPurify = true;
      }
      
      // Check for dangerous innerHTML usage
      if (/innerHTML\s*=/.test(content) && !content.includes('DOMPurify')) {
        warnings.push(`Potential XSS vulnerability: innerHTML without DOMPurify in ${filePath}`);
      }
    }
  }

  if (!foundDOMPurify) {
    warnings.push('DOMPurify not found in codebase - ensure all user input is properly sanitized');
  }

  return {
    name: 'XSS Protection',
    passed: warnings.length === 0,
    issues: [],
    warnings,
  };
}

/**
 * Check 6: Verify TypeScript strict mode
 */
function checkTypeScriptStrict(): AuditResult {
  const tsconfigPath = path.join(rootDir, 'tsconfig.json');
  const tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, 'utf-8'));
  const warnings: string[] = [];

  const requiredStrictOptions = [
    'strict',
    'noImplicitAny',
    'strictNullChecks',
    'strictFunctionTypes',
    'noImplicitThis',
  ];

  for (const option of requiredStrictOptions) {
    if (!tsconfig.compilerOptions[option]) {
      warnings.push(`TypeScript strict option missing: ${option}`);
    }
  }

  return {
    name: 'TypeScript Strict Mode',
    passed: warnings.length === 0,
    issues: [],
    warnings,
  };
}

/**
 * Main audit execution
 */
async function runAudit() {
  log(colors.blue, '\n╔════════════════════════════════════════════════╗');
  log(colors.blue, '║   FinPulse Security Audit - January 12, 2026  ║');
  log(colors.blue, '╚════════════════════════════════════════════════╝\n');

  results.push(checkForHardcodedSecrets());
  results.push(checkForConsoleStatements());
  results.push(checkDependencies());
  results.push(checkAuthorizationChecks());
  results.push(checkXSSProtection());
  results.push(checkTypeScriptStrict());

  // Display results
  let passedCount = 0;
  for (const result of results) {
    const status = result.passed ? `${colors.green}✓ PASS${colors.reset}` : `${colors.red}✗ FAIL${colors.reset}`;
    console.log(`${status} - ${result.name}`);

    if (result.issues.length > 0) {
      result.issues.forEach(issue => console.log(`  ${colors.red}[ERROR]${colors.reset} ${issue}`));
    }

    if (result.warnings.length > 0) {
      result.warnings.forEach(warning => console.log(`  ${colors.yellow}[WARN]${colors.reset} ${warning}`));
    }

    if (result.passed) passedCount++;
  }

  // Summary
  const totalChecks = results.length;
  const summary = `\n${passedCount}/${totalChecks} security checks passed`;
  
  if (passedCount === totalChecks) {
    log(colors.green, `\n✓ ${summary}`);
    log(colors.green, '✓ Security audit completed successfully!\n');
    process.exit(0);
  } else {
    log(colors.yellow, `\n⚠ ${summary}`);
    log(colors.yellow, '⚠ Some security checks need attention\n');
    process.exit(1);
  }
}

// Run audit
runAudit().catch(err => {
  log(colors.red, `\n✗ Audit failed: ${err.message}\n`);
  process.exit(1);
});

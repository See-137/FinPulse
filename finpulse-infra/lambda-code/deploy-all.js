#!/usr/bin/env node
// Deploy all Lambda functions with security fixes

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const archiver = require('archiver');

const FUNCTIONS = ['admin', 'auth', 'portfolio', 'community', 'market-data', 'fx', 'ai'];
const ENVIRONMENT = 'prod';

console.log('🚀 Deploying Lambda functions with security fixes...');
console.log('==================================================');

// Create a zip file for a Lambda function
async function createZip(functionName, tempDir) {
  return new Promise((resolve, reject) => {
    const zipPath = path.join(tempDir, `${functionName}.zip`);
    const output = fs.createWriteStream(zipPath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    output.on('close', () => resolve(zipPath));
    archive.on('error', (err) => reject(err));

    archive.pipe(output);
    archive.directory(tempDir, false);
    archive.finalize();
  });
}

// Copy directory recursively
function copyDirRecursive(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

async function deployFunction(functionName) {
  console.log(`\n📦 Packaging ${functionName}...`);

  // Create temporary directory
  const tempDir = path.join(__dirname, 'temp', functionName);
  if (fs.existsSync(tempDir)) {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
  fs.mkdirSync(tempDir, { recursive: true });

  try {
    // Copy function code
    const funcDir = path.join(__dirname, functionName);
    copyDirRecursive(funcDir, tempDir);

    // Copy shared modules
    const sharedDir = path.join(__dirname, 'shared');
    const destSharedDir = path.join(tempDir, 'shared');
    fs.mkdirSync(destSharedDir, { recursive: true });

    // Copy shared JS files
    const sharedFiles = fs.readdirSync(sharedDir).filter(f => f.endsWith('.js'));
    for (const file of sharedFiles) {
      fs.copyFileSync(
        path.join(sharedDir, file),
        path.join(destSharedDir, file)
      );
    }

    // Copy shared node_modules if exists
    const sharedNodeModules = path.join(sharedDir, 'node_modules');
    if (fs.existsSync(sharedNodeModules)) {
      copyDirRecursive(sharedNodeModules, path.join(destSharedDir, 'node_modules'));
    }

    // Create ZIP
    const zipPath = await createZip(functionName, tempDir);
    console.log(`✅ Package created: ${zipPath}`);

    // Deploy to AWS
    console.log(`🚀 Deploying finpulse-${functionName}-${ENVIRONMENT}...`);
    execSync(
      `aws lambda update-function-code --function-name finpulse-${functionName}-${ENVIRONMENT} --zip-file fileb://${zipPath} --no-cli-pager`,
      { stdio: 'inherit' }
    );

    // Wait for update to complete
    console.log('⏳ Waiting for function update to complete...');
    execSync(
      `aws lambda wait function-updated --function-name finpulse-${functionName}-${ENVIRONMENT}`,
      { stdio: 'inherit' }
    );

    console.log(`✅ ${functionName} deployed successfully`);

    // Cleanup temp directory
    fs.rmSync(tempDir, { recursive: true, force: true });
  } catch (error) {
    console.error(`❌ Failed to deploy ${functionName}:`, error.message);
    throw error;
  }
}

async function main() {
  try {
    // Install shared dependencies
    console.log('\n📦 Installing shared dependencies...');
    execSync('npm install --production', {
      cwd: path.join(__dirname, 'shared'),
      stdio: 'inherit'
    });

    // Deploy each function
    for (const func of FUNCTIONS) {
      await deployFunction(func);
    }

    // Cleanup temp directory
    const tempRoot = path.join(__dirname, 'temp');
    if (fs.existsSync(tempRoot)) {
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }

    console.log('\n✅ All Lambda functions deployed successfully!');
  } catch (error) {
    console.error('\n❌ Deployment failed:', error.message);
    process.exit(1);
  }
}

main();

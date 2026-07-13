import { execSync } from 'child_process';
import readline from 'readline';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const apiDir = path.join(rootDir, 'server', 'apps', 'api');

function runCommand(command, cwd = rootDir) {
  try {
    execSync(command, { stdio: 'inherit', cwd });
    return true;
  } catch (error) {
    console.error(`\n❌ Command failed: ${command}\n`);
    return false;
  }
}

function getCommandOutput(command, cwd = rootDir) {
  try {
    return execSync(command, { encoding: 'utf-8', cwd, stdio: ['pipe', 'pipe', 'ignore'] }).trim();
  } catch (error) {
    return null;
  }
}

async function askQuestion(query) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) =>
    rl.question(query, (ans) => {
      rl.close();
      resolve(ans);
    })
  );
}

function getDatabaseUrl() {
  const envPath = path.join(apiDir, '.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    const match = envContent.match(/^DATABASE_URL=(.*)$/m);
    if (match) {
      return match[1].trim();
    }
  }
  return 'NOT FOUND';
}

async function main() {
  console.log('=============================================');
  console.log('🔄 Running Upward Post-Fetch Sync Script...');
  console.log('=============================================\n');

  // 1. Check for dependency changes
  console.log('🔍 Checking for package.json changes...');
  const changedFiles = getCommandOutput('git diff-tree -r --name-only ORIG_HEAD HEAD') || '';
  if (changedFiles.includes('package.json') || changedFiles.includes('pnpm-lock.yaml') || !fs.existsSync(path.join(rootDir, 'node_modules'))) {
    console.log('📦 Dependencies changed or missing. Running pnpm install...');
    runCommand('pnpm install');
  } else {
    console.log('✅ No dependency changes detected. Skipping install.');
  }

  // 2. Prisma Generate
  console.log('\n⚙️ Running Prisma Generate...');
  const generateSuccess = runCommand('pnpm run prisma:generate', apiDir);
  if (!generateSuccess) {
    console.log('⚠️ Prisma generate failed, but continuing script...');
  }

  // 3. Database Migration check
  const dbUrl = getDatabaseUrl();
  console.log('\n=============================================');
  console.log(`🛢️  Current DATABASE_URL: ${dbUrl}`);
  console.log('=============================================');
  console.log('⚠️ WARNING: Ensure this is NOT a production database if you are running migrations locally!');
  
  const proceed = await askQuestion('\nDo you want to proceed with database migrations/push? (y/N): ');
  
  if (proceed.toLowerCase() === 'y' || proceed.toLowerCase() === 'yes') {
    console.log('\n🚀 Attempting prisma migrate deploy...');
    const migrateSuccess = runCommand('npx prisma migrate deploy --schema=prisma/schema.prisma', apiDir);
    
    if (!migrateSuccess) {
      console.log('\n⚠️ Migrate deploy failed. Falling back to prisma db push...');
      const pushSuccess = runCommand('npx prisma db push --schema=prisma/schema.prisma', apiDir);
      if (pushSuccess) {
        console.log('✅ Prisma db push successful!');
      } else {
        console.log('❌ Prisma db push also failed.');
      }
    } else {
      console.log('✅ Prisma migrate deploy successful!');
    }
  } else {
    console.log('\n⏭️ Skipping database migrations.');
  }
  
  console.log('\n🎉 Sync script completed successfully!');
}

main().catch(err => {
  console.error('\n❌ An unexpected error occurred:', err);
  process.exit(1);
});

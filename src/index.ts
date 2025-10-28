import { execa } from 'execa';
import fs from 'fs-extra';
import path from 'path';
import { runExerciseChecks } from './exerciseChecker';
import { Logger, LogEntry } from './logger';

type Result = { cmd: string; code: number };

const log = (...args: any[]) => console.log('[node-ts-checker]', ...args);

// Mode types
type CheckMode = 'single-repo' | 'single-exercise' | 'all-repos';

interface CheckOptions {
  mode: CheckMode;
  repoDir?: string;
  configPath?: string;
  exerciseId?: string;
  testReposDir?: string;
  logDir?: string;
}

async function fileExists(p: string) {
  try {
    return await fs.pathExists(p);
  } catch (e) {
    return false;
  }
}

async function runCommand(cmd: string, cwd: string): Promise<Result> {
  log('> running:', cmd);
  try {
    const child = execa(cmd, {
      shell: true,
      cwd,
      stdio: 'inherit'
    });
    await child;
    return { cmd, code: 0 };
  } catch (err: any) {
    const code = err?.exitCode ?? 1;
    log(`command failed (${cmd}) exitCode=${code}`);
    return { cmd, code };
  }
}

async function defaultCommandsForRepo(repoDir: string): Promise<string[]> {
  const cmds: string[] = [];
  const pkgPath = path.join(repoDir, 'package.json');
  const hasPkg = await fileExists(pkgPath);
  const tsconfigExists = await fileExists(path.join(repoDir, 'tsconfig.json'));

  if (hasPkg) {
    const pkg = await fs.readJSON(pkgPath).catch(() => ({}));
    const scripts = pkg.scripts || {};
    // install deps unless SKIP_INSTALL=1
    if (process.env.SKIP_INSTALL !== '1') {
      cmds.push('npm ci --no-audit --no-fund');
    }
    if (scripts.test) cmds.push('npm test');
    if (scripts.lint) cmds.push('npm run lint');
    if (scripts.build) cmds.push('npm run build');
    else if (tsconfigExists) cmds.push('npx tsc --noEmit');
  } else if (tsconfigExists) {
    cmds.push('npx tsc --noEmit');
  } else {
    // fallback: run a simple quick scan
    cmds.push('echo "No package.json or tsconfig.json found; nothing to run."');
  }

  return cmds;
}

async function main() {
  // Determine mode from environment variables
  const mode = (process.env.CHECK_MODE as CheckMode) || 'single-repo';
  const repoDir = process.env.REPO_DIR || '/repo';
  const configPath = process.env.EXERCISE_CONFIG;
  const exerciseId = process.env.EXERCISE_ID;
  const testReposDir = path.resolve(process.env.TEST_REPOS_DIR || './test-repos');
  const logDir = process.env.LOG_DIR || './logs';
  
  const logger = new Logger(logDir);
  const projectRoot = path.resolve(__dirname, '..');
  
  log(`Mode: ${mode}`);
  
  switch (mode) {
    case 'single-repo':
      await checkSingleRepo(repoDir, configPath, exerciseId, projectRoot, logger);
      break;
    
    case 'all-repos':
      await checkAllRepos(testReposDir, repoDir, projectRoot, logger);
      break;
    
    default:
      await checkSingleRepo(repoDir, configPath, exerciseId, projectRoot, logger);
  }
}

async function checkSingleRepo(
  repoDir: string,
  configPath: string | undefined,
  exerciseId: string | undefined,
  projectRoot: string,
  logger: Logger
) {
  const absRepo = path.resolve(repoDir);
  log('repoDir =', absRepo);

  const exists = await fileExists(absRepo);
  if (!exists) {
    console.error(`[node-ts-checker] repository directory does not exist: ${absRepo}`);
    process.exit(2);
  }

  // Check if we're running in exercise mode
  if (configPath) {
    const absConfig = path.resolve(configPath);
    const configExists = await fileExists(absConfig);
    
    if (!configExists) {
      console.error(`[node-ts-checker] exercise config not found: ${absConfig}`);
      process.exit(2);
    }
    
    log('Running in EXERCISE MODE with config:', absConfig);
    const results = await runExerciseChecks(absRepo, absConfig, projectRoot, exerciseId);
    
    // Prepare log entry
    const config = await fs.readJSON(absConfig);
    const passed = results.filter(r => r.passed).length;
    const total = results.length;
    const percentage = parseFloat(((passed / total) * 100).toFixed(1));
    
    const logEntry: LogEntry = {
      timestamp: new Date().toISOString(),
      repoPath: absRepo,
      day: config.day,
      totalExercises: total,
      passedExercises: passed,
      failedExercises: total - passed,
      percentage,
      results: results.map(r => ({
        id: r.id,
        name: r.name,
        passed: r.passed,
        error: r.error,
        expectedOutput: r.expectedOutput,
        actualOutput: r.actualOutput
      }))
    };
    
    // Write log
    const logPath = await logger.writeLog(logEntry);
    log('Log written to:', logPath);
    
    // Write to Excel
    await logger.writeExcel(logEntry);
    
    // Exit with non-zero if any exercise failed
    const allPassed = results.every(r => r.passed);
    process.exit(allPassed ? 0 : 1);
  }

  // Default mode: run generic checks
  const envCommands = process.env.CHECK_COMMANDS;
  const commands = envCommands
    ? envCommands.split(';').map((s: string) => s.trim()).filter(Boolean)
    : await defaultCommandsForRepo(absRepo);

  if (commands.length === 0) {
    log('No commands to run. Exiting 0.');
    process.exit(0);
  }

  log('Will run commands:');
  for (const c of commands) log(' -', c);

  for (const cmd of commands) {
    const res = await runCommand(cmd, absRepo);
    if (res.code !== 0) {
      process.exit(res.code);
    }
  }

  log('All commands finished successfully.');
  process.exit(0);
}

async function checkAllRepos(
  testReposDir: string,
  baseRepoDir: string,
  projectRoot: string,
  logger: Logger
) {
  log('Checking all repositories in:', testReposDir);
  
  const allLogs: LogEntry[] = [];
  
  // Find all day folders
  const dayFolders = await fs.readdir(testReposDir);
  
  for (const dayFolder of dayFolders) {
    const dayPath = path.join(testReposDir, dayFolder);
    const stat = await fs.stat(dayPath);
    
    if (!stat.isDirectory() || dayFolder === '.git') continue;
    
    const configPath = path.resolve(path.join(dayPath, 'config.json'));
    if (!(await fileExists(configPath))) continue;
    
    log(`\n${'='.repeat(60)}`);
    log(`Checking ${dayFolder}...`);
    log('='.repeat(60));
    
    // Use the day's answers folder as the repo to check
    const repoToCheck = path.resolve(path.join(dayPath, 'answers'));
    
    if (!(await fileExists(repoToCheck))) {
      log('❌ Answers folder not found in', dayFolder);
      continue;
    }
    
    const results = await runExerciseChecks(repoToCheck, configPath, projectRoot);
    
    const config = await fs.readJSON(configPath);
    const passed = results.filter(r => r.passed).length;
    const total = results.length;
    const percentage = parseFloat(((passed / total) * 100).toFixed(1));
    
    const logEntry: LogEntry = {
      timestamp: new Date().toISOString(),
      repoPath: repoToCheck,
      day: config.day,
      totalExercises: total,
      passedExercises: passed,
      failedExercises: total - passed,
      percentage,
      results: results.map(r => ({
        id: r.id,
        name: r.name,
        passed: r.passed,
        error: r.error,
        expectedOutput: r.expectedOutput,
        actualOutput: r.actualOutput
      }))
    };
    
    allLogs.push(logEntry);
  }
  
  // Write summary
  const summaryPath = await logger.writeSummary(allLogs);
  log('\n✅ Summary written to:', summaryPath);
  
  // Exit with 0 if all passed, 1 if any failed
  const allPassed = allLogs.every(entry => entry.failedExercises === 0);
  process.exit(allPassed ? 0 : 1);
}

main().catch(err => {
  console.error('[node-ts-checker] unexpected error:', err);
  process.exit(3);
});

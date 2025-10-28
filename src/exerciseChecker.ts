import { execa } from 'execa';
import fs from 'fs-extra';
import path from 'path';

export interface Exercise {
  id: string;
  name: string;
  file: string;
  expectedOutput: string;
  description: string;
  errorPattern?: string;
}

export interface SetupExercise {
  id: string;
  name: string;
  files: string[];
  expectedOutput: string;
  runCommand: string;
}

export interface ExerciseConfig {
  day: string;
  baseDir: string;
  setupExercise: SetupExercise;
  exercises: Exercise[];
}

export interface ExerciseResult {
  id: string;
  name: string;
  passed: boolean;
  fileExists: boolean;
  outputMatch: boolean;
  expectedOutput?: string;
  actualOutput?: string;
  error?: string;
  errorDetails?: string; // More detailed error information
}

const log = (...args: any[]) => console.log('[exercise-checker]', ...args);

function normalizeOutput(output: string): string {
  return output.trim().replace(/\r\n/g, '\n');
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    return await fs.pathExists(filePath);
  } catch (e) {
    return false;
  }
}

/**
 * Try to find a file in multiple possible base directories
 * Returns the actual path if found, null otherwise
 */
async function findExerciseFile(
  repoDir: string,
  configBaseDir: string,
  fileName: string
): Promise<string | null> {
  // Possible base directories where exercises might be located
  const possibleBaseDirs = [
    configBaseDir, // From config (e.g., "IDV-VUJS/day01/hello-typescript")
    'IDV-VUJS/day01/hello-typescript',
    'IDV-VUJS/day01',
    'hello-typescript',
    '.' // Root of repo
  ];
  
  // Remove duplicates and empty strings
  const uniqueBaseDirs = [...new Set(possibleBaseDirs.filter(d => d))];
  
  for (const baseDir of uniqueBaseDirs) {
    const fullPath = path.join(repoDir, baseDir, fileName);
    if (await fileExists(fullPath)) {
      log(`📁 Found file at: ${baseDir}/${fileName}`);
      return fullPath;
    }
  }
  
  return null;
}

export async function checkSetupExercise(
  repoDir: string,
  setup: SetupExercise,
  projectRoot: string,
  baseDir: string = '.'
): Promise<ExerciseResult> {
  log(`\n📋 Checking Exercise ${setup.id}: ${setup.name}`);
  
  const missingFiles: string[] = [];
  const foundFiles: string[] = [];
  
  for (const file of setup.files) {
    const filePath = await findExerciseFile(repoDir, baseDir, file);
    if (!filePath) {
      missingFiles.push(file);
    } else {
      foundFiles.push(filePath);
    }
  }
  
  if (missingFiles.length > 0) {
    log(`❌ Missing files: ${missingFiles.join(', ')}`);
    return {
      id: setup.id,
      name: setup.name,
      passed: false,
      fileExists: false,
      outputMatch: false,
      error: `Missing files: ${missingFiles.join(', ')}`
    };
  }
  
  log('✅ All required files exist');
  
  // Run the command using project's ts-node
  try {
    const tsNodePath = path.join(projectRoot, 'node_modules', '.bin', 'ts-node');
    // Use the first found TypeScript file
    const targetFile = foundFiles.find(f => f.endsWith('.ts')) || foundFiles[0];
    const fileDir = path.dirname(targetFile);
    
    // Create a temporary minimal tsconfig.json in the repo directory
    const tempTsConfig = path.join(fileDir, 'tsconfig.json');
    const needsCleanup = !(await fileExists(tempTsConfig));
    
    if (needsCleanup) {
      await fs.writeJSON(tempTsConfig, {
        compilerOptions: {
          module: 'commonjs',
          target: 'ES2020',
          esModuleInterop: true
        }
      });
    }
    
    try {
      const result = await execa(tsNodePath, [
        '--transpileOnly',
        path.basename(targetFile)
      ], {
        cwd: fileDir,
        timeout: 10000
      });
      
      // Clean up temp tsconfig if we created it
      if (needsCleanup) {
        await fs.remove(tempTsConfig);
      }
      
      const actualOutput = normalizeOutput(result.stdout);
      const expectedOutput = normalizeOutput(setup.expectedOutput);
      const outputMatch = actualOutput === expectedOutput;
      
      if (outputMatch) {
        log('✅ Output matches expected');
      } else {
        log('❌ Output mismatch');
        log('Expected:', expectedOutput);
        log('Got:', actualOutput);
      }
      
      return {
        id: setup.id,
        name: setup.name,
        passed: outputMatch,
        fileExists: true,
        outputMatch,
        expectedOutput,
        actualOutput
      };
    } catch (execError) {
      // Clean up temp tsconfig if we created it
      if (needsCleanup) {
        await fs.remove(tempTsConfig).catch(() => {});
      }
      throw execError;
    }
  } catch (err: any) {
    log('❌ Execution failed:', err.message);
    return {
      id: setup.id,
      name: setup.name,
      passed: false,
      fileExists: true,
      outputMatch: false,
      error: err.message,
      errorDetails: err.stderr || err.stdout || '',
      actualOutput: err.stdout || ''
    };
  }
}

export async function checkExercise(
  repoDir: string,
  baseDir: string,
  exercise: Exercise,
  projectRoot: string
): Promise<ExerciseResult> {
  log(`\n📋 Checking Exercise ${exercise.id}: ${exercise.name}`);
  
  // Try to find the file in multiple possible locations
  const filePath = await findExerciseFile(repoDir, baseDir, exercise.file);
  
  if (!filePath) {
    log(`❌ File not found: ${exercise.file} (searched in multiple locations)`);
    return {
      id: exercise.id,
      name: exercise.name,
      passed: false,
      fileExists: false,
      outputMatch: false,
      error: `File not found: ${exercise.file}`
    };
  }
  
  log(`✅ File exists: ${exercise.file}`);
  
  // Handle compile error exercises (ex17)
  if (exercise.expectedOutput === 'compile_error') {
    try {
      const tscPath = path.join(projectRoot, 'node_modules', '.bin', 'tsc');
      await execa(tscPath, ['--noEmit', filePath], {
        cwd: projectRoot,
        timeout: 10000
      });
      
      log('❌ Expected compilation error but file compiled successfully');
      return {
        id: exercise.id,
        name: exercise.name,
        passed: false,
        fileExists: true,
        outputMatch: false,
        error: 'Expected compilation error but compilation succeeded'
      };
    } catch (err: any) {
      const errorOutput = err.stderr || err.stdout || '';
      const hasExpectedError = exercise.errorPattern 
        ? errorOutput.includes(exercise.errorPattern)
        : true;
      
      if (hasExpectedError) {
        log('✅ Compilation error as expected:', exercise.errorPattern);
        return {
          id: exercise.id,
          name: exercise.name,
          passed: true,
          fileExists: true,
          outputMatch: true,
          actualOutput: errorOutput
        };
      } else {
        log('❌ Wrong compilation error');
        log('Expected pattern:', exercise.errorPattern);
        log('Got:', errorOutput);
        return {
          id: exercise.id,
          name: exercise.name,
          passed: false,
          fileExists: true,
          outputMatch: false,
          expectedOutput: exercise.errorPattern,
          actualOutput: errorOutput
        };
      }
    }
  }
  
  // Run the TypeScript file using project's ts-node
  try {
    const tsNodePath = path.join(projectRoot, 'node_modules', '.bin', 'ts-node');
    const fileDir = path.dirname(filePath);
    
    // Create a temporary minimal tsconfig.json in the repo directory
    const tempTsConfig = path.join(fileDir, 'tsconfig.json');
    const needsCleanup = !(await fileExists(tempTsConfig));
    
    if (needsCleanup) {
      await fs.writeJSON(tempTsConfig, {
        compilerOptions: {
          module: 'commonjs',
          target: 'ES2020',
          esModuleInterop: true
        }
      });
    }
    
    try {
      const result = await execa(tsNodePath, [
        '--transpileOnly',
        path.basename(filePath)
      ], {
        cwd: fileDir,
        timeout: 10000
      });
      
      // Clean up temp tsconfig if we created it
      if (needsCleanup) {
        await fs.remove(tempTsConfig);
      }
      
      const actualOutput = normalizeOutput(result.stdout);
      const expectedOutput = normalizeOutput(exercise.expectedOutput);
      const outputMatch = actualOutput === expectedOutput;
      
      if (outputMatch) {
        log('✅ Output matches expected');
      } else {
        log('❌ Output mismatch');
        log('Expected:', JSON.stringify(expectedOutput));
        log('Got:', JSON.stringify(actualOutput));
      }
      
      return {
        id: exercise.id,
        name: exercise.name,
        passed: outputMatch,
        fileExists: true,
        outputMatch,
        expectedOutput,
        actualOutput
      };
    } catch (execError) {
      // Clean up temp tsconfig if we created it
      if (needsCleanup) {
        await fs.remove(tempTsConfig).catch(() => {});
      }
      throw execError;
    }
  } catch (err: any) {
    log('❌ Execution failed:', err.message);
    return {
      id: exercise.id,
      name: exercise.name,
      passed: false,
      fileExists: true,
      outputMatch: false,
      error: err.message,
      errorDetails: err.stderr || err.stdout || '',
      actualOutput: err.stdout || ''
    };
  }
}

export async function runExerciseChecks(
  repoDir: string,
  configPath: string,
  projectRoot: string = process.cwd(),
  exerciseIdFilter?: string
): Promise<ExerciseResult[]> {
  log('Loading exercise config:', configPath);
  
  const config: ExerciseConfig = await fs.readJSON(configPath);
  const results: ExerciseResult[] = [];
  
  log(`\n🚀 Starting checks for ${config.day}`);
  log(`Base directory: ${config.baseDir}`);
  log(`Project root: ${projectRoot}`);
  
  if (exerciseIdFilter) {
    log(`Filtering for exercise ID: ${exerciseIdFilter}`);
  }
  
  // Check setup exercise first (if not filtering or if filter matches)
  if (!exerciseIdFilter || exerciseIdFilter === config.setupExercise.id) {
    const setupResult = await checkSetupExercise(repoDir, config.setupExercise, projectRoot, config.baseDir);
    results.push(setupResult);
  }
  
  // Check all exercises (or filtered)
  for (const exercise of config.exercises) {
    if (exerciseIdFilter && exercise.id !== exerciseIdFilter) {
      continue; // Skip if filtering and doesn't match
    }
    const result = await checkExercise(repoDir, config.baseDir, exercise, projectRoot);
    results.push(result);
  }
  
  // Summary
  const passed = results.filter(r => r.passed).length;
  const total = results.length;
  const percentage = ((passed / total) * 100).toFixed(1);
  
  log('\n' + '='.repeat(60));
  log(`📊 SUMMARY: ${passed}/${total} exercises passed (${percentage}%)`);
  log('='.repeat(60));
  
  results.forEach(r => {
    const icon = r.passed ? '✅' : '❌';
    log(`${icon} Ex${r.id}: ${r.name}`);
    if (!r.passed && r.error) {
      log(`   └─ ${r.error}`);
    }
  });
  
  return results;
}

import { execa } from 'execa';
import fs from 'fs-extra';
import path from 'path';
import { runSmartTest } from './smartTestRunner';

export interface Exercise {
  id: string;
  name: string;
  file: string;
  expectedOutput: string;
  description: string;
  errorPattern?: string;
  testType?: 'output' | 'return' | 'structure';  // Added: 'structure' for code validation
  functionName?: string;            // Added: function name to test/call
  testInput?: any;                  // Added: input to pass to function for return testing
  functionParams?: any[];           // Added: parameters to pass when auto-calling function
  dynamicFields?: string[];         // Added: field names that can have dynamic values (e.g., 'id' for UUIDs)
  requiredPatterns?: string[];      // Added: regex patterns that must exist in code (for structure tests)
  timeout?: number;                 // Added: custom timeout for tests (e.g., async tests)
  allowCompilationErrors?: boolean; // Added: for exercises where compilation errors are expected (e.g., ex08)
  useStandardizedTests?: boolean;   // Added: replace student's test calls with standardized ones
  testCode?: string;                // Added: standardized test code to use instead of student's calls
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
  setupExercise?: SetupExercise;  // Made optional - not all days have setup
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

// Verbose logging - set to false to reduce output
const VERBOSE = process.env.VERBOSE === 'true';
const log = (...args: any[]) => {
  if (VERBOSE) {
    console.log('[exercise-checker]', ...args);
  }
};
const logAlways = (...args: any[]) => console.log('[exercise-checker]', ...args);

function normalizeOutput(output: string): string {
  return output.trim().replace(/\r\n/g, '\n');
}

/**
 * More aggressive normalization for flexible comparison
 * - Normalizes multiple spaces to single space
 * - Handles array spacing: [ 1, 2 ] becomes [1,2]
 */
function normalizeFlexible(output: string): string {
  return output
    .trim()
    .replace(/\r\n/g, '\n')
    // Normalize spaces around array brackets and commas
    .replace(/\[\s+/g, '[')
    .replace(/\s+\]/g, ']')
    .replace(/\s*,\s*/g, ',')
    // Normalize multiple spaces between words to single space
    .replace(/\s+/g, ' ');
}

/**
 * Flexible output comparison that handles locale differences
 * - Accepts both "14.17" and "14,17" as equivalent
 * - Normalizes whitespace and newlines
 * - Handles array spacing differences
 * - Can ignore dynamic fields like UUIDs
 */
function compareOutputs(expected: string, actual: string, dynamicFields?: string[]): boolean {
  const normalizedExpected = normalizeOutput(expected);
  const normalizedActual = normalizeOutput(actual);
  
  // Direct match
  if (normalizedExpected === normalizedActual) {
    return true;
  }
  
  // Try swapping decimal separators (. <-> ,)
  const expectedWithComma = normalizedExpected.replace(/\./g, ',');
  const expectedWithPeriod = normalizedExpected.replace(/,/g, '.');
  
  if (expectedWithComma === normalizedActual || expectedWithPeriod === normalizedActual) {
    return true;
  }
  
  // Try flexible normalization (handles spacing differences)
  const flexExpected = normalizeFlexible(expected);
  const flexActual = normalizeFlexible(actual);
  
  if (flexExpected === flexActual) {
    return true;
  }
  
  // Handle dynamic fields (e.g., UUIDs)
  if (dynamicFields && dynamicFields.length > 0) {
    let expectedPattern = normalizedExpected;
    let actualPattern = normalizedActual;
    
    log(`🔍 Applying dynamic field matching for: ${dynamicFields.join(', ')}`);
    
    for (const field of dynamicFields) {
      // Match field: 'value' pattern and replace value with wildcard
      // Handles both single and double quotes, with or without spaces
      const fieldPattern = new RegExp(`${field}:\\s*['"]([^'"]+)['"]`, 'gi');
      
      // Replace dynamic field values with a placeholder
      expectedPattern = expectedPattern.replace(fieldPattern, `${field}: '__DYNAMIC__'`);
      actualPattern = actualPattern.replace(fieldPattern, `${field}: '__DYNAMIC__'`);
    }
    
    log(`📝 Expected pattern: ${expectedPattern.substring(0, 200)}`);
    log(`📝 Actual pattern: ${actualPattern.substring(0, 200)}`);
    
    if (expectedPattern === actualPattern) {
      log(`✅ Dynamic field matching succeeded!`);
      return true;
    }
  }
  
  return false;
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
  // Extract day-specific paths from configBaseDir
  // e.g., "IDV-VUJS/day02/loops-and-classes" -> ["IDV-VUJS/day02/loops-and-classes", "IDV-VUJS/day02", "loops-and-classes"]
  const basePathParts = configBaseDir.split('/').filter(p => p);
  const possibleBaseDirs = [
    configBaseDir, // From config (e.g., "IDV-VUJS/day02/loops-and-classes")
    '.' // Root of repo
  ];
  
  // Add parent directories of configBaseDir
  if (basePathParts.length > 1) {
    // e.g., "IDV-VUJS/day02"
    possibleBaseDirs.push(basePathParts.slice(0, -1).join('/'));
  }
  if (basePathParts.length > 2) {
    // e.g., "IDV-VUJS"
    possibleBaseDirs.push(basePathParts.slice(0, -2).join('/'));
  }
  // Add last part as standalone directory
  if (basePathParts.length > 0) {
    possibleBaseDirs.push(basePathParts[basePathParts.length - 1]);
  }
  
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
      const outputMatch = compareOutputs(setup.expectedOutput, result.stdout);
      
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
  // Wrap entire function in try-catch to prevent crashes
  try {
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
  
  // Handle structure validation (checking for required code patterns)
  if (exercise.testType === 'structure' && exercise.requiredPatterns) {
    try {
      log(`🔍 Validating code structure with ${exercise.requiredPatterns.length} required patterns...`);
      
      const fileContent = await fs.readFile(filePath, 'utf8');
      const missingPatterns: string[] = [];
      
      for (const pattern of exercise.requiredPatterns) {
        const regex = new RegExp(pattern, 'i'); // case-insensitive
        if (!regex.test(fileContent)) {
          missingPatterns.push(pattern);
          log(`❌ Missing pattern: ${pattern}`);
        } else {
          log(`✅ Found pattern: ${pattern}`);
        }
      }
      
      if (missingPatterns.length === 0) {
        log('✅ All required patterns found');
        
        // Try to compile the file to ensure it's valid TypeScript
        // (unless compilation errors are explicitly allowed)
        if (exercise.allowCompilationErrors) {
          log('⚠️ Compilation errors are allowed for this exercise');
          return {
            id: exercise.id,
            name: exercise.name,
            passed: true,
            fileExists: true,
            outputMatch: true,
            actualOutput: 'Code structure validated successfully (compilation errors allowed)'
          };
        }
        
        const tscPath = path.join(projectRoot, 'node_modules', '.bin', 'tsc');
        try {
          await execa(tscPath, ['--noEmit', filePath], {
            cwd: projectRoot,
            timeout: 10000
          });
          log('✅ File compiles successfully');
          
          return {
            id: exercise.id,
            name: exercise.name,
            passed: true,
            fileExists: true,
            outputMatch: true,
            actualOutput: 'Code structure validated successfully'
          };
        } catch (compileErr: any) {
          log('❌ File has compilation errors');
          return {
            id: exercise.id,
            name: exercise.name,
            passed: false,
            fileExists: true,
            outputMatch: false,
            error: 'Code structure correct but compilation failed',
            errorDetails: compileErr.stderr || compileErr.stdout || ''
          };
        }
      } else {
        log(`❌ Missing ${missingPatterns.length} required pattern(s)`);
        return {
          id: exercise.id,
          name: exercise.name,
          passed: false,
          fileExists: true,
          outputMatch: false,
          error: `Missing required code patterns: ${missingPatterns.join(', ')}`,
          expectedOutput: exercise.requiredPatterns.join('\n'),
          actualOutput: `Missing: ${missingPatterns.join(', ')}`
        };
      }
    } catch (err: any) {
      log('❌ Structure validation failed:', err.message);
      return {
        id: exercise.id,
        name: exercise.name,
        passed: false,
        fileExists: true,
        outputMatch: false,
        error: `Structure validation error: ${err.message}`
      };
    }
  }
  
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
  
  // Handle return value testing (for functions that should return, not print)
  if (exercise.testType === 'return' && exercise.functionName) {
    try {
      log(`🔍 Testing return value of function: ${exercise.functionName}`);
      
      const tsNodePath = path.join(projectRoot, 'node_modules', '.bin', 'ts-node');
      const fileDir = path.dirname(filePath);
      
      let originalCode: string;
      let tempFilePath: string;
      let tempTsConfig: string;
      let needsCleanup = false;
      
      try {
        // Read the original file
        originalCode = await fs.readFile(filePath, 'utf8');
      } catch (readError: any) {
        log('❌ Failed to read file:', readError.message);
        return {
          id: exercise.id,
          name: exercise.name,
          passed: false,
          fileExists: true,
          outputMatch: false,
          error: `Failed to read file: ${readError.message}`
        };
      }
      
      // Generate test input based on type
      let testInputCode: string;
      if (exercise.testInput === 'SUNDAY') {
        // Special handling for enum - assume DaysOfWeek is defined in the file
        testInputCode = `DaysOfWeek.${exercise.testInput}`;
      } else if (typeof exercise.testInput === 'string') {
        testInputCode = `"${exercise.testInput}"`;
      } else {
        testInputCode = String(exercise.testInput);
      }
      
      // Append a test call at the end of the file
      const modifiedCode = originalCode + `\n\n// Auto-generated test\nconsole.log(${exercise.functionName}(${testInputCode}));\n`;
      
      // Write modified code to a temporary file
      tempFilePath = path.join(fileDir, `__temp_${path.basename(filePath)}`);
      
      try {
        await fs.writeFile(tempFilePath, modifiedCode);
      } catch (writeError: any) {
        log('❌ Failed to write temp file:', writeError.message);
        return {
          id: exercise.id,
          name: exercise.name,
          passed: false,
          fileExists: true,
          outputMatch: false,
          error: `Failed to write temp file: ${writeError.message}`
        };
      }
      
      // Create a temporary minimal tsconfig.json in the repo directory
      tempTsConfig = path.join(fileDir, 'tsconfig.json');
      needsCleanup = !(await fileExists(tempTsConfig));
      
      if (needsCleanup) {
        try {
          await fs.writeJSON(tempTsConfig, {
            compilerOptions: {
              module: 'commonjs',
              target: 'ES2020',
              esModuleInterop: true
            }
          });
        } catch (configError: any) {
          log('❌ Failed to write tsconfig:', configError.message);
          await fs.remove(tempFilePath).catch(() => {});
          return {
            id: exercise.id,
            name: exercise.name,
            passed: false,
            fileExists: true,
            outputMatch: false,
            error: `Failed to write tsconfig: ${configError.message}`
          };
        }
      }
      
      try {
        const result = await execa(tsNodePath, [
          '--transpileOnly',
          path.basename(tempFilePath)
        ], {
          cwd: fileDir,
          timeout: 10000
        });
        
        // Clean up
        await fs.remove(tempFilePath);
        if (needsCleanup) {
          await fs.remove(tempTsConfig);
        }
        
        const actualOutput = normalizeOutput(result.stdout);
        const expectedOutput = normalizeOutput(exercise.expectedOutput);
        
        const outputMatch = compareOutputs(exercise.expectedOutput, result.stdout, exercise.dynamicFields);
        
        if (outputMatch) {
          log(`✅ Return value matches expected: ${expectedOutput}`);
        } else {
          log('❌ Return value mismatch');
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
      } catch (execError: any) {
        // Clean up
        await fs.remove(tempFilePath).catch(() => {});
        if (needsCleanup) {
          await fs.remove(tempTsConfig).catch(() => {});
        }
        
        log('❌ Function execution failed:', execError.message);
        return {
          id: exercise.id,
          name: exercise.name,
          passed: false,
          fileExists: true,
          outputMatch: false,
          error: execError.message,
          errorDetails: execError.stderr || execError.stdout || ''
        };
      }
    } catch (err: any) {
      log('❌ Return value test failed:', err.message);
      return {
        id: exercise.id,
        name: exercise.name,
        passed: false,
        fileExists: true,
        outputMatch: false,
        error: err.message
      };
    }
  }
  
  // Run the TypeScript file using smart test runner (handles console.error, flexible matching)
  try {
    log(`🚀 Running smart test for exercise ${exercise.id}`);
    
    // Use smart test runner for better handling of student code variations
    const testResult = await runSmartTest(repoDir, filePath, exercise, projectRoot);
    
    if (testResult.passed) {
      log('✅ Test passed with smart runner');
    } else {
      log('❌ Test failed');
      if (testResult.error) {
        log('Error:', testResult.error);
      }
    }
    
    return {
      id: exercise.id,
      name: exercise.name,
      passed: testResult.passed,
      fileExists: true,
      outputMatch: testResult.passed,
      expectedOutput: exercise.expectedOutput,
      actualOutput: testResult.actualOutput,
      error: testResult.error,
      errorDetails: testResult.errorDetails
    };
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
  } catch (unexpectedError: any) {
    // Catch-all for any unexpected errors to prevent crashes
    logAlways('❌ UNEXPECTED ERROR in checkExercise:', unexpectedError.message);
    logAlways('Stack:', unexpectedError.stack);
    return {
      id: exercise.id,
      name: exercise.name,
      passed: false,
      fileExists: false,
      outputMatch: false,
      error: `Unexpected error: ${unexpectedError.message}`
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
  
  logAlways(`\n🚀 Starting checks for ${config.day}`);
  log(`Base directory: ${config.baseDir}`);
  log(`Project root: ${projectRoot}`);
  
  if (exerciseIdFilter) {
    log(`Filtering for exercise ID: ${exerciseIdFilter}`);
  }
  
  // Check setup exercise first (if it exists and not filtering or if filter matches)
  if (config.setupExercise && (!exerciseIdFilter || exerciseIdFilter === config.setupExercise.id)) {
    try {
      const setupResult = await checkSetupExercise(repoDir, config.setupExercise, projectRoot, config.baseDir);
      results.push(setupResult);
    } catch (setupError: any) {
      logAlways(`❌ Fatal error checking setup exercise:`, setupError.message);
      results.push({
        id: config.setupExercise.id,
        name: config.setupExercise.name,
        passed: false,
        fileExists: false,
        outputMatch: false,
        error: `Fatal error: ${setupError.message}`
      });
    }
  }
  
  // Check all exercises (or filtered)
  for (const exercise of config.exercises) {
    if (exerciseIdFilter && exercise.id !== exerciseIdFilter) {
      continue; // Skip if filtering and doesn't match
    }
    try {
      const result = await checkExercise(repoDir, config.baseDir, exercise, projectRoot);
      results.push(result);
    } catch (exerciseError: any) {
      // Even if checkExercise fails catastrophically, log and continue
      logAlways(`❌ Fatal error checking Ex${exercise.id}:`, exerciseError.message);
      results.push({
        id: exercise.id,
        name: exercise.name,
        passed: false,
        fileExists: false,
        outputMatch: false,
        error: `Fatal error: ${exerciseError.message}`
      });
    }
  }
  
  // Summary
  const passed = results.filter(r => r.passed).length;
  const total = results.length;
  const percentage = ((passed / total) * 100).toFixed(1);
  
  logAlways('\n' + '='.repeat(60));
  logAlways(`📊 SUMMARY: ${passed}/${total} exercises passed (${percentage}%)`);
  logAlways('='.repeat(60));
  
  results.forEach(r => {
    const icon = r.passed ? '✅' : '❌';
    logAlways(`${icon} Ex${r.id}: ${r.name}`);
    if (!r.passed) {
      if (!r.fileExists) {
        logAlways(`   └─ File not found: ${config.exercises.find(e => e.id === r.id)?.file || 'unknown'}`);
      } else if (r.error) {
        logAlways(`   └─ ${r.error}`);
        // Show error details if verbose mode
        if (VERBOSE && r.errorDetails) {
          logAlways(`   └─ Details: ${r.errorDetails}`);
        }
      } else if (!r.outputMatch) {
        logAlways(`   └─ Output mismatch`);
        if (VERBOSE) {
          logAlways(`   └─ Expected: ${r.expectedOutput || '(empty)'}`);
          logAlways(`   └─ Got: ${r.actualOutput || '(empty)'}`);
        }
      }
    }
  });
  
  return results;
}

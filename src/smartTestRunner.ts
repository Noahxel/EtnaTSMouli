import { execa } from 'execa';
import fs from 'fs-extra';
import path from 'path';
import { Exercise } from './exerciseChecker';

const VERBOSE = process.env.VERBOSE === 'true';
const log = (...args: any[]) => {
  if (VERBOSE) {
    console.log('[smart-test-runner]', ...args);
  }
};

/**
 * Smart test runner that can handle various student implementations
 * - Handles both console.log and console.error outputs
 * - Creates test wrappers for functions that aren't called
 * - Validates semantic correctness rather than exact string matching
 */

interface TestResult {
  passed: boolean;
  actualOutput: string;
  error?: string;
  errorDetails?: string;
}

/**
 * Normalize output for comparison - handles console.error outputs too
 */
function normalizeOutput(output: string): string {
  return output
    .trim()
    .replace(/\r\n/g, '\n')
    // Remove ANSI color codes
    .replace(/\u001b\[\d+m/g, '')
    // Normalize multiple spaces
    .replace(/\s+/g, ' ')
    // Normalize newlines with spaces (for single-line comparison)
    .split('\n')
    .map(line => line.trim())
    .join('\n');
}

/**
 * Strict comparison with minor flexibility for whitespace and formatting
 * The subject requirements are explicit - students must match them exactly
 */
function semanticMatch(expected: string, actual: string): boolean {
  const normalizedExpected = normalizeOutput(expected);
  const normalizedActual = normalizeOutput(actual);
  
  // Direct match
  if (normalizedExpected === normalizedActual) {
    return true;
  }
  
  // Allow flexible whitespace in object/array formatting
  // (handles different console.log formatting between Node versions)
  const flexExpected = normalizedExpected
    .replace(/\s*\{\s*/g, '{')
    .replace(/\s*\}\s*/g, '}')
    .replace(/\s*\[\s*/g, '[')
    .replace(/\s*\]\s*/g, ']')
    .replace(/\s*,\s*/g, ',')
    .replace(/\s*:\s*/g, ':');
    
  const flexActual = normalizedActual
    .replace(/\s*\{\s*/g, '{')
    .replace(/\s*\}\s*/g, '}')
    .replace(/\s*\[\s*/g, '[')
    .replace(/\s*\]\s*/g, ']')
    .replace(/\s*,\s*/g, ',')
    .replace(/\s*:\s*/g, ':');
  
  if (flexExpected === flexActual) {
    return true;
  }
  
  // Allow comma/period decimal separator differences (e.g., "14.17" vs "14,17")
  const expWithComma = normalizedExpected.replace(/\./g, ',');
  const expWithPeriod = normalizedExpected.replace(/,/g, '.');
  
  if (expWithComma === normalizedActual || expWithPeriod === normalizedActual) {
    return true;
  }
  
  // If none of the above work, it's not a match
  // Students must follow the subject requirements exactly
  return false;
}

/**
 * Ensure student repo has a valid package.json and tsconfig.json
 */
async function ensureProjectSetup(repoDir: string, projectRoot: string): Promise<void> {
  const packageJsonPath = path.join(repoDir, 'package.json');
  const tsconfigPath = path.join(repoDir, 'tsconfig.json');
  
  // Check and create package.json if missing or invalid
  let needsPackageJson = false;
  try {
    const pkg = await fs.readJSON(packageJsonPath);
    if (!pkg.dependencies || !pkg.dependencies['typescript']) {
      needsPackageJson = true;
    }
  } catch {
    needsPackageJson = true;
  }
  
  if (needsPackageJson) {
    log('Creating standardized package.json');
    await fs.writeJSON(packageJsonPath, {
      name: "student-submission",
      version: "1.0.0",
      private: true,
      dependencies: {
        "typescript": "^5.0.0",
        "ts-node": "^10.9.0",
        "@types/node": "^20.0.0"
      }
    }, { spaces: 2 });
  }
  
  // Always overwrite tsconfig.json to ensure consistency
  log('Creating standardized tsconfig.json');
  await fs.writeJSON(tsconfigPath, {
    compilerOptions: {
      module: "commonjs",
      target: "ES2020",
      esModuleInterop: true,
      skipLibCheck: true,
      strict: false,
      resolveJsonModule: true,
      moduleResolution: "node"
    },
    include: ["./**/*.ts"],
    exclude: ["node_modules"]
  }, { spaces: 2 });
}

/**
 * Remove student's test code from the file
 * Looks for try-catch blocks and function calls at the end of the file
 */
function removeStudentTests(code: string): string {
  const lines = code.split('\n');
  
  // Find where function/interface definitions end
  // Everything after that is likely test code
  let lastDefinitionLine = -1;
  let braceDepth = 0;
  let inMultilineComment = false;
  let inDefinition = false; // Track if we're inside a definition
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Handle multi-line comments
    if (line.includes('/*')) inMultilineComment = true;
    if (line.includes('*/')) {
      inMultilineComment = false;
      continue;
    }
    if (inMultilineComment || line.startsWith('//')) continue;
    
    // Count braces to track nesting
    braceDepth += (line.match(/\{/g) || []).length;
    braceDepth -= (line.match(/\}/g) || []).length;
    
    // If we see a function/class/interface/type/enum definition (NOT variable declarations)
    if (/^(function|async function|class|interface|type|enum)\s+\w+/.test(line) ||
        /^(const|let|var)\s+\w+\s*=\s*\(.*\)\s*(:\s*\w+\s*)?=>/.test(line)) { // Arrow functions with optional return type
      lastDefinitionLine = i;
      inDefinition = true;
    }
    
    // If we're at zero brace depth and were in a definition, we're done with it
    if (braceDepth === 0 && /\}/.test(line) && inDefinition) {
      lastDefinitionLine = i;
      inDefinition = false;
    }
  }
  
  // If we found definitions, remove everything after them (with some buffer)
  if (lastDefinitionLine > -1) {
    // Keep a few blank lines after the last definition
    let cutoffLine = lastDefinitionLine + 1;
    
    // Skip blank lines and comments immediately after
    while (cutoffLine < lines.length) {
      const trimmed = lines[cutoffLine].trim();
      if (trimmed === '' || trimmed.startsWith('//') || trimmed.startsWith('/*')) {
        cutoffLine++;
      } else {
        break;
      }
    }
    
    // If the next non-blank line looks like test code, cut here
    if (cutoffLine < lines.length) {
      const nextLine = lines[cutoffLine].trim();
      // Check for try-catch blocks, direct function calls (including method calls), variable declarations, loops, etc.
      if (/^(try|catch|const|let|var|for\s*\(|while\s*\(|if\s*\(|async\s+function|[\w.]+\s*\()/.test(nextLine)) {
        log(`Removing test code starting at line ${cutoffLine + 1}: ${nextLine.substring(0, 60)}`);
        return lines.slice(0, cutoffLine).join('\n');
      }
    }
  }
  
  return code;
}

/**
 * Create a smart test wrapper that captures both stdout and stderr
 */
async function createTestWrapper(
  filePath: string,
  exercise: Exercise
): Promise<{ wrapperPath: string, cleanup: () => Promise<void> }> {
  const fileDir = path.dirname(filePath);
  const fileName = path.basename(filePath, '.ts');
  const wrapperPath = path.join(fileDir, `__test_${fileName}.ts`);
  
  // Read the original file
  let originalCode = await fs.readFile(filePath, 'utf8');
  
  // If useStandardizedTests is true, remove all student's test calls
  if (exercise.useStandardizedTests) {
    log('Using standardized tests - removing student test calls');
    originalCode = removeStudentTests(originalCode);
  }
  
  let wrapperCode = '';
  
  // Redirect console.error to console.log so we capture all output
  wrapperCode += `
// Test wrapper - captures all output
const originalError = console.error;
console.error = (...args: any[]) => {
  console.log(...args);
};

`;
  
  // Import/include the student code
  wrapperCode += originalCode + '\n\n';
  
  // Add standardized test code or auto-call functions
  if (exercise.useStandardizedTests && exercise.testCode) {
    log('Adding standardized test code');
    wrapperCode += `${exercise.testCode}\n`;
  } else if (exercise.functionName) {
    // Check if function is called in the original code
    const functionCallPattern = new RegExp(`${exercise.functionName}\\s*\\([^)]*\\)`, 'm');
    const hasFunctionCall = functionCallPattern.test(originalCode);
    
    if (!hasFunctionCall) {
      log(`Auto-calling function: ${exercise.functionName}`);
      const params = exercise.functionParams || [];
      const paramsStr = params.map((p: any) => {
        if (typeof p === 'string') {
          return `"${p}"`;
        } else if (typeof p === 'object' && p !== null) {
          return JSON.stringify(p);
        }
        return JSON.stringify(p);
      }).join(', ');
      
      wrapperCode += `\n// Auto-generated test call\n${exercise.functionName}(${paramsStr});\n`;
    }
  }
  
  // Write the wrapper
  await fs.writeFile(wrapperPath, wrapperCode);
  
  return {
    wrapperPath,
    cleanup: async () => {
      await fs.remove(wrapperPath).catch(() => {});
    }
  };
}

/**
 * Run a test with smart wrapper and semantic matching
 */
export async function runSmartTest(
  repoDir: string,
  filePath: string,
  exercise: Exercise,
  projectRoot: string
): Promise<TestResult> {
  try {
    // Ensure project setup
    await ensureProjectSetup(repoDir, projectRoot);
    
    // Create test wrapper
    const { wrapperPath, cleanup } = await createTestWrapper(filePath, exercise);
    
    try {
      // Run the test
      const tsNodePath = path.join(projectRoot, 'node_modules', '.bin', 'ts-node');
      const result = await execa(tsNodePath, [
        '--transpileOnly',
        '--skip-project',
        '--compiler-options', JSON.stringify({
          module: 'commonjs',
          target: 'ES2020',
          esModuleInterop: true,
          skipLibCheck: true
        }),
        path.basename(wrapperPath)
      ], {
        cwd: path.dirname(wrapperPath),
        timeout: exercise.timeout || 10000,
        reject: false // Don't throw on non-zero exit
      });
      
      // Cleanup
      await cleanup();
      
      // Combine stdout and stderr
      const actualOutput = (result.stdout + '\n' + result.stderr).trim();
      
      // Check for semantic match
      const passed = semanticMatch(exercise.expectedOutput, actualOutput);
      
      if (!passed) {
        log('Semantic mismatch:');
        log('Expected:', exercise.expectedOutput);
        log('Actual:', actualOutput);
      }
      
      return {
        passed,
        actualOutput,
        error: result.exitCode !== 0 && !passed ? `Process exited with code ${result.exitCode}` : undefined,
        errorDetails: result.stderr
      };
    } catch (err: any) {
      await cleanup();
      throw err;
    }
  } catch (err: any) {
    return {
      passed: false,
      actualOutput: err.stdout || '',
      error: err.message,
      errorDetails: err.stderr || ''
    };
  }
}

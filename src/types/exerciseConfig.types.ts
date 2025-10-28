/**
 * TypeScript interfaces for exercise configuration files
 * Use this as a reference when creating new exercise configs
 */

export interface Exercise {
  /** Exercise identifier (e.g., "01", "02", "03") */
  id: string;
  
  /** Human-readable exercise name */
  name: string;
  
  /** Filename relative to baseDir (e.g., "welcomeMessage.ts") */
  file: string;
  
  /** 
   * Expected stdout output when running the file
   * Use "compile_error" for exercises that should fail compilation
   * Use \n for multi-line outputs
   */
  expectedOutput: string;
  
  /** Brief description of what the exercise tests */
  description: string;
  
  /** 
   * Required error pattern for compile_error exercises
   * The error message must contain this substring
   */
  errorPattern?: string;
}

export interface SetupExercise {
  /** Exercise identifier (usually "00") */
  id: string;
  
  /** Name (usually "setup") */
  name: string;
  
  /** List of required files for setup (relative to repo root) */
  files: string[];
  
  /** Expected output when running the setup command */
  expectedOutput: string;
  
  /** Shell command to run for verification */
  runCommand: string;
}

export interface ExerciseConfig {
  /** Day identifier (e.g., "day01", "day02") */
  day: string;
  
  /** Base directory where exercises are located (e.g., "IDV-VUJS/day01") */
  baseDir: string;
  
  /** Setup exercise (usually checks for project structure) */
  setupExercise: SetupExercise;
  
  /** List of exercises to validate */
  exercises: Exercise[];
}

/**
 * Example usage - day02-exercises.json:
 * 
 * {
 *   "day": "day02",
 *   "baseDir": "IDV-VUJS/day02",
 *   "setupExercise": {
 *     "id": "00",
 *     "name": "setup",
 *     "files": [".gitignore", "package.json", "tsconfig.json"],
 *     "expectedOutput": "Setup complete!",
 *     "runCommand": "npx ts-node setup.ts"
 *   },
 *   "exercises": [
 *     {
 *       "id": "01",
 *       "name": "classes",
 *       "file": "person.ts",
 *       "expectedOutput": "John Doe\n30",
 *       "description": "Create a Person class with name and age"
 *     },
 *     {
 *       "id": "02",
 *       "name": "inheritance",
 *       "file": "student.ts",
 *       "expectedOutput": "Alice Smith\n22\nComputer Science",
 *       "description": "Student class extending Person"
 *     }
 *   ]
 * }
 */

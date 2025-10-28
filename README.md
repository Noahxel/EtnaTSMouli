# node-ts-checker

Small Node + TypeScript CLI to run repository checks inside a Docker container. Useful for running tests/lints/builds against mounted repos (e.g. in CI or locally using Docker).

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Build the project
npm run build

# 3. Test with sample data
./test-checker.sh

# 4. (Optional) Setup GitLab cloning
cp scripts/config_etna.example.py config_etna.py
# Edit config_etna.py with your GitLab token
pip3 install -r scripts/requirements.txt
./clone-students.sh 1 5
```

## Build the Image

```bash
docker build -t node-ts-checker .
```

## Usage Modes

The checker supports three modes:

### 1. Single Repository Mode (default)

Check exercises in a specific student repository:

```bash
# Local testing
REPO_DIR=./path/to/student-repo \
EXERCISE_CONFIG=./test-repos/day01/config.json \
node dist/index.js

# Docker
docker run --rm \
  -v /path/to/student-repo:/repo \
  -e REPO_DIR=/repo \
  -e EXERCISE_CONFIG=/usr/src/app/test-repos/day01/config.json \
  node-ts-checker
```

**Note**: Student repositories must contain a `tsconfig.json` file for TypeScript compilation. Minimal example:
```json
{
  "compilerOptions": {
    "module": "commonjs",
    "target": "ES2020",
    "esModuleInterop": true
  }
}
```

### 2. Single Exercise Mode

Check only one specific exercise in a repository:

```bash
REPO_DIR=./path/to/student-repo \
EXERCISE_CONFIG=./test-repos/day01/config.json \
EXERCISE_ID="05" \
node dist/index.js
```

### 3. All Repositories Mode

Batch check all student repositories (useful for grading multiple students):

```bash
# Check all days in test-repos folder
CHECK_MODE=all-repos \
TEST_REPOS_DIR=./test-repos \
node dist/index.js
```

This will:
- Find all day folders in `TEST_REPOS_DIR`
- Check each day's `answers/` folder against its `config.json`
- Generate a summary report with scores for each repository

## Environment Variables

- **`CHECK_MODE`**: Mode selection (`single-repo` [default], `all-repos`)
- **`REPO_DIR`** (default `/repo`): Path to student repository to check
- **`EXERCISE_CONFIG`**: Path to exercise config JSON file (required for single-repo mode)
- **`EXERCISE_ID`** (optional): Check only this exercise ID (e.g., "05")
- **`TEST_REPOS_DIR`** (default `./test-repos`): Root directory containing all day folders (for all-repos mode)
- **`LOG_DIR`** (default `./logs`): Directory to write log files

## Logging System

The checker automatically creates detailed logs:

### JSON Logs (per repository)
```bash
logs/2025-10-27T14-03-14-366Z_answers_day01.json
```

Contains:
- Timestamp, repository path, day
- Total/passed/failed exercise counts and percentage
- Detailed results for each exercise with expected vs actual output
- Error messages and details for failed exercises

### Summary Reports (batch mode)
```bash
logs/summary_2025-10-27T14-03-14-366Z.txt
```

Contains aggregated results for all checked repositories.

## Example Output

```
[exercise-checker] 📊 SUMMARY: 21/21 exercises passed (100.0%)
✅ Ex00: setup
✅ Ex01: string
✅ Ex02: number
...
✅ Ex20: displayAverageForStudent function
```

## Exercise Validation

The checker validates:
- ✅ **File existence**: Required files exist at expected paths
- ✅ **Output correctness**: Compiles and runs TypeScript, compares output
- ✅ **Compilation errors**: Detects when exercises should fail to compile

## Exit Codes

- **0**: All checks/exercises passed
- **1**: One or more commands/exercises failed
- **2**: Configuration error (repo not found, config not found)
- **3**: Unexpected error

## Local Development

### Using the test-checker.sh Script

The `test-checker.sh` script provides a simplified interface for testing:

```bash
# Check reference answers for day01
./test-checker.sh

# Check all students in day01
./test-checker.sh --day day01 --all

# Check a specific student
./test-checker.sh --day day01 --student john_doe

# Check only one exercise for a student
./test-checker.sh --day day01 --student john_doe --exercise 05

# Check with custom repo path
./test-checker.sh --day day01 --repo /path/to/student/repo

# Force rebuild before running
./test-checker.sh --rebuild --day day01 --all

# Combined example
./test-checker.sh -d day01 -s john_doe -e 03 -b
```

Run `./test-checker.sh --help` for all options.

### Manual Testing

Build and test manually:

```bash
npm install
npm run build

# Single repo mode
REPO_DIR=/path/to/test-repo \
EXERCISE_CONFIG=./test-repos/day01/config.json \
node dist/index.js

# Single exercise mode
REPO_DIR=/path/to/test-repo \
EXERCISE_CONFIG=./test-repos/day01/config.json \
EXERCISE_ID="05" \
node dist/index.js

# All repos mode
CHECK_MODE=all-repos \
TEST_REPOS_DIR=./test-repos \
node dist/index.js
```

## Project Structure

```
.
├── src/
│   ├── index.ts              # Main CLI entry point with mode routing
│   ├── exerciseChecker.ts    # Exercise validation logic
│   └── logger.ts             # Logging system (JSON + text summaries)
├── scripts/
│   ├── clone_repos_etna.py   # GitLab cloning script
│   ├── find_group_id.py      # Helper to find GitLab group IDs
│   ├── list_jours_disponibles.py  # List available days
│   ├── config_etna.example.py      # Configuration template
│   └── requirements.txt      # Python dependencies
├── test-repos/
│   └── day01/
│       ├── config.json       # Exercise definitions and expected outputs
│       ├── answers/          # Reference solution files (tracked in git)
│       │   ├── welcomeMessage.ts
│       │   ├── number.ts
│       │   └── ...
│       ├── exercises.txt     # Exercise descriptions
│       └── repos/            # Cloned student repos from GitLab (gitignored)
│           ├── student1/     # Student repository with their exercise files
│           ├── student2/
│           └── ...
├── dist/                     # Compiled JavaScript (generated)
├── logs/                     # Log files (generated)
├── clone-students.sh         # Script to clone all student repos from GitLab
├── test-checker.sh           # Simplified test script
├── Dockerfile                # Multi-stage Docker build
└── README.md                 # This file
```

**Note**: Student repositories cloned from GitLab are placed in `test-repos/dayXX/repos/student_name/` and are gitignored. The checker validates student code against the expected outputs defined in `config.json`. Only `answers/` and configuration files are tracked in git.

## Cloning Student Repositories from GitLab

To automatically clone all student repositories from GitLab:

### 1. Setup Configuration

Copy the example config and edit it:
```bash
cp scripts/config_etna.example.py config_etna.py
# Edit config_etna.py with your GitLab token and group info
```

### 2. Install Python Dependencies

```bash
pip3 install -r scripts/requirements.txt
```

### 3. Clone All Students

```bash
# Clone days 1 to 5
./clone-students.sh 1 5

# Clone only day 1
./clone-students.sh 1 1

# Clone days 3 to 7
./clone-students.sh 3 7
```

Repositories will be cloned to `test-repos/day01/repos/student_name/`, `test-repos/day02/repos/student_name/`, etc.

### 4. Helper Scripts

```bash
# Find your GitLab group ID
python3 scripts/find_group_id.py

# List available days in your group
python3 scripts/list_jours_disponibles.py
```

## Checking Student Repositories

Once cloned, check student submissions:

```bash
# Check all students for day01
./test-checker.sh --day day01 --all

# Check a specific student
./test-checker.sh --day day01 --student student_name

# Check specific student's specific exercise
./test-checker.sh -d day01 -s student_name -e 05

# Check reference answers
./test-checker.sh --day day01
```

The checker will create detailed logs in `logs/` directory with pass/fail status for each student.

# EtnaTSMouli
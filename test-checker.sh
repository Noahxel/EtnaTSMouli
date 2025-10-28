#!/bin/bash

# Exercise Checker Test Script
# Usage: ./test-checker.sh [options]
#   -d, --day <day>       Day to check (e.g., day01) [default: day01]
#   -r, --repo <path>     Student repository path
#   -e, --exercise <id>   Check only specific exercise ID
#   -a, --all             Check all repositories in test-repos/
#   -b, --rebuild         Force rebuild before running
#   -h, --help            Show this help

set -e

# Default values
DAY="day01"
REPO_PATH=""
STUDENT_NAME=""
EXERCISE_ID=""
MODE="single-repo"
CHECK_ALL_STUDENTS=false
REBUILD=false

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Print usage
usage() {
  echo "Exercise Checker Test Script"
  echo ""
  echo "Usage: ./test-checker.sh [options]"
  echo ""
  echo "Options:"
  echo "  -d, --day <day>       Day to check (e.g., day01, day02) [default: day01]"
  echo "  -r, --repo <path>     Path to student repository"
  echo "  -s, --student <name>  Check specific student in test-repos/dayXX/"
  echo "  -e, --exercise <id>   Check only specific exercise ID (e.g., 05)"
  echo "  -a, --all             Check all students in specified day"
  echo "  -b, --rebuild         Force rebuild before running"
  echo "  -h, --help            Show this help"
  echo ""
  echo "Examples:"
  echo "  ./test-checker.sh --day day01 --all              # Check all students in day01"
  echo "  ./test-checker.sh -d day01 -s student_name       # Check specific student"
  echo "  ./test-checker.sh -d day01 -r /path/to/repo      # Check custom repo path"
  echo "  ./test-checker.sh -d day01 -s student_name -e 05 # Check one exercise"
  echo ""
  echo "Note: Student repos should be in test-repos/dayXX/repos/student_name/"
  exit 0
}

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    -d|--day)
      DAY="$2"
      shift 2
      ;;
    -r|--repo)
      REPO_PATH="$2"
      shift 2
      ;;
    -s|--student)
      STUDENT_NAME="$2"
      shift 2
      ;;
    -e|--exercise)
      EXERCISE_ID="$2"
      shift 2
      ;;
    -a|--all)
      CHECK_ALL_STUDENTS=true
      shift
      ;;
    -b|--rebuild)
      REBUILD=true
      shift
      ;;
    -h|--help)
      usage
      ;;
    *)
      echo -e "${RED}❌ Unknown option: $1${NC}"
      echo "Use --help for usage information"
      exit 1
      ;;
  esac
done

echo -e "${BLUE}🚀 Exercise Checker${NC}"
echo "================================"
echo ""

# Build if needed or forced
if [ "$REBUILD" = true ] || [ ! -d "dist" ]; then
  echo -e "${YELLOW}📦 Building TypeScript...${NC}"
  npm run build
  echo ""
fi

CONFIG_PATH="./test-repos/${DAY}/config.json"

# Check if config exists
if [ ! -f "$CONFIG_PATH" ]; then
  echo -e "${RED}❌ Config not found: $CONFIG_PATH${NC}"
  echo ""
  echo "Available days:"
  find test-repos -name "config.json" 2>/dev/null | sed 's|test-repos/||;s|/config.json||' || echo "  (none)"
  exit 1
fi

# All students mode - check all repos in day folder
if [ "$CHECK_ALL_STUDENTS" = true ]; then
  echo -e "${GREEN}📚 Checking all students in ${DAY}...${NC}"
  echo ""
  
  REPOS_DIR="./test-repos/${DAY}/repos"
  
  if [ ! -d "$REPOS_DIR" ]; then
    echo -e "${RED}❌ Repos directory not found: $REPOS_DIR${NC}"
    echo "Run ./clone-students.sh to clone student repositories first"
    exit 1
  fi
  
  # Find all student directories
  STUDENT_DIRS=$(find "$REPOS_DIR" -mindepth 1 -maxdepth 1 -type d ! -name ".*" | sort)
  
  if [ -z "$STUDENT_DIRS" ]; then
    echo -e "${YELLOW}⚠️  No student repositories found in $REPOS_DIR${NC}"
    echo "Run ./clone-students.sh to clone student repositories"
    exit 1
  fi
  
  TOTAL=0
  SUCCESS=0
  FAILED=0
  
  for STUDENT_DIR in $STUDENT_DIRS; do
    STUDENT=$(basename "$STUDENT_DIR")
    TOTAL=$((TOTAL + 1))
    
    echo ""
    echo -e "${BLUE}======================================${NC}"
    echo -e "${BLUE}Student: $STUDENT${NC}"
    echo -e "${BLUE}======================================${NC}"
    
    if [ -n "$EXERCISE_ID" ]; then
      # run checker and handle exit code inside the if to avoid set -e exiting the whole script
      if REPO_DIR="$STUDENT_DIR" EXERCISE_CONFIG="$CONFIG_PATH" EXERCISE_ID="$EXERCISE_ID" node dist/index.js; then
        SUCCESS=$((SUCCESS + 1))
      else
        FAILED=$((FAILED + 1))
      fi
    else
      if REPO_DIR="$STUDENT_DIR" EXERCISE_CONFIG="$CONFIG_PATH" node dist/index.js; then
        SUCCESS=$((SUCCESS + 1))
      else
        FAILED=$((FAILED + 1))
      fi
    fi
  done
  
  echo ""
  echo -e "${BLUE}======================================${NC}"
  echo -e "${BLUE}📊 SUMMARY${NC}"
  echo -e "${BLUE}======================================${NC}"
  echo -e "Total students: ${BLUE}$TOTAL${NC}"
  echo -e "Success: ${GREEN}$SUCCESS${NC}"
  echo -e "Failed: ${RED}$FAILED${NC}"
  
  exit 0
fi

# Specific student mode
if [ -n "$STUDENT_NAME" ]; then
  REPO_PATH="./test-repos/${DAY}/repos/${STUDENT_NAME}"
  echo -e "${GREEN}📂 Student: $STUDENT_NAME${NC}"
fi

# Single repo mode - validate inputs
if [ -z "$REPO_PATH" ]; then
  # Default to test-repos answers folder
  REPO_PATH="./test-repos/${DAY}/answers"
  echo -e "${YELLOW}ℹ️  No repo specified, using reference answers: $REPO_PATH${NC}"
fi

# Validate paths
if [ ! -d "$REPO_PATH" ]; then
  echo -e "${RED}❌ Repository not found: $REPO_PATH${NC}"
  echo ""
  echo "Available in test-repos/${DAY}/repos/:"
  ls -d test-repos/${DAY}/repos/*/ 2>/dev/null | xargs -n1 basename 2>/dev/null || echo "  (empty)"
  exit 1
fi

echo -e "${GREEN}📂 Repository: $REPO_PATH${NC}"
echo -e "${GREEN}📋 Config: $CONFIG_PATH${NC}"
[ -n "$EXERCISE_ID" ] && echo -e "${GREEN}🎯 Exercise: $EXERCISE_ID${NC}"
echo ""

# Run the checker
if [ -n "$EXERCISE_ID" ]; then
  REPO_DIR="$REPO_PATH" EXERCISE_CONFIG="$CONFIG_PATH" EXERCISE_ID="$EXERCISE_ID" node dist/index.js
else
  REPO_DIR="$REPO_PATH" EXERCISE_CONFIG="$CONFIG_PATH" node dist/index.js
fi

echo ""
echo -e "${GREEN}✅ Check complete!${NC}"

#!/bin/bash

# Docker-based Exercise Checker
# Usage: ./docker-test.sh [options]
# Each repository is tested in its own isolated Docker container

set -e

# Default values
DAY="day01"
STUDENT_NAME=""
EXERCISE_ID=""
CHECK_ALL_STUDENTS=false
REBUILD_IMAGE=false
IMAGE_NAME="mouli-ts-checker:latest"
PARALLEL_JOBS=16  # Number of parallel Docker containers

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Print usage
usage() {
  echo "Docker-based Exercise Checker"
  echo ""
  echo "Usage: ./docker-test.sh [options]"
  echo ""
  echo "Options:"
  echo "  -d, --day <day>       Day to check (e.g., day01, day02) [default: day01]"
  echo "  -s, --student <name>  Check specific student in test-repos/dayXX/repos/"
  echo "  -e, --exercise <id>   Check only specific exercise ID (e.g., 05)"
  echo "  -a, --all             Check all students in specified day (sequential)"
  echo "  -b, --rebuild         Force rebuild Docker image before running"
  echo "  -h, --help            Show this help"
  echo ""
  echo "Examples:"
  echo "  ./docker-test.sh --day day01 --all              # Check all students in day01"
  echo "  ./docker-test.sh -d day01 -s student_name       # Check specific student"
  echo "  ./docker-test.sh -d day01 -s student_name -e 05 # Check one exercise"
  echo ""
  echo "Note: Each student repo is tested in an isolated Docker container"
  exit 0
}

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    -d|--day)
      DAY="$2"
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
      REBUILD_IMAGE=true
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

echo -e "${CYAN}🐳 Docker Exercise Checker${NC}"
echo "================================"
echo ""

# Check Docker is available
if ! command -v docker &> /dev/null; then
  echo -e "${RED}❌ Docker is not installed or not in PATH${NC}"
  exit 1
fi

# Build or rebuild Docker image
if [ "$REBUILD_IMAGE" = true ] || ! docker image inspect "$IMAGE_NAME" &> /dev/null; then
  echo -e "${YELLOW}🔨 Building Docker image: $IMAGE_NAME${NC}"
  docker build -t "$IMAGE_NAME" .
  echo -e "${GREEN}✅ Image built successfully${NC}"
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

# Get absolute paths for Docker mounts
PROJECT_ROOT=$(pwd)
CONFIG_ABS="$PROJECT_ROOT/$CONFIG_PATH"
LOGS_DIR="$PROJECT_ROOT/logs"
RESULTS_DIR="$PROJECT_ROOT/results"
RESULTS_FILE="$RESULTS_DIR/results.xlsx"

# Create logs and results directories if they don't exist
mkdir -p "$LOGS_DIR"
mkdir -p "$RESULTS_DIR"

# Create empty results file if it doesn't exist
if [ ! -f "$RESULTS_FILE" ]; then
  touch "$RESULTS_FILE" || echo "" > "$RESULTS_FILE"
fi

# Function to run checker in Docker container
run_checker_in_docker() {
  local student_dir=$1
  local student_name=$2
  local exercise_id=$3
  
  local student_abs="$PROJECT_ROOT/$student_dir"
  
  # Build docker run command with proper arguments
  # Look up GroupID for this student
  local group_id="${STUDENT_GROUP_IDS[$student_name]:-}"
  
  local docker_args=(
    "--rm"
    "-v" "$student_abs:/repo:z"
    "-v" "$CONFIG_ABS:/config.json:ro,z"
    "-v" "$LOGS_DIR:/logs:z"
    "-v" "$RESULTS_DIR:/results:z"
    "-e" "REPO_DIR=/repo"
    "-e" "EXERCISE_CONFIG=/config.json"
    "-e" "LOG_DIR=/logs"
    "-e" "RESULTS_FILE=/results/results.xlsx"
    "-e" "STUDENT_NAME=$student_name"
    "-e" "GROUP_ID=$group_id"
  )
  
  if [ -n "$exercise_id" ]; then
    docker_args+=("-e" "EXERCISE_ID=$exercise_id")
  fi
  
  docker_args+=("$IMAGE_NAME")
  
  # Execute
  docker run "${docker_args[@]}"
  return $?
}

# Parse clone log to extract GroupIDs
declare -A STUDENT_GROUP_IDS
CLONE_LOG="./test-repos/${DAY}/clone_log.txt"
if [ -f "$CLONE_LOG" ]; then
  while IFS= read -r line; do
    if [[ "$line" =~ ^[[:space:]]*Student:[[:space:]]*(.+)$ ]]; then
      _student="${BASH_REMATCH[1]}"
    fi
    if [[ "$line" =~ ^[[:space:]]*GroupID:[[:space:]]*([0-9]+)$ ]]; then
      _groupid="${BASH_REMATCH[1]}"
      if [ -n "$_student" ]; then
        STUDENT_GROUP_IDS["$_student"]="$_groupid"
      fi
    fi
  done < "$CLONE_LOG"
  echo -e "${GREEN}✅ Loaded ${#STUDENT_GROUP_IDS[@]} GroupIDs from clone log${NC}"
fi

# All students mode
if [ "$CHECK_ALL_STUDENTS" = true ]; then
  echo -e "${GREEN}📚 Checking all students in ${DAY} (sequential mode)...${NC}"
  echo ""
  
  # Remove stale results file to start fresh
  rm -f "$RESULTS_FILE"
  
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
  
  # Sequential execution only - no parallel to ensure Excel consistency
  for STUDENT_DIR in $STUDENT_DIRS; do
    STUDENT=$(basename "$STUDENT_DIR")
    TOTAL=$((TOTAL + 1))
    
    echo ""
    echo -e "${BLUE}======================================${NC}"
    echo -e "${BLUE}🐳 [$TOTAL] Testing: $STUDENT${NC}"
    echo -e "${BLUE}======================================${NC}"
      
      if run_checker_in_docker "$STUDENT_DIR" "$STUDENT" "$EXERCISE_ID"; then
        SUCCESS=$((SUCCESS + 1))
        echo -e "${GREEN}✅ $STUDENT completed${NC}"
      else
        FAILED=$((FAILED + 1))
        echo -e "${RED}❌ $STUDENT failed${NC}"
      fi
    done
  
  echo ""
  echo -e "${BLUE}======================================${NC}"
  echo -e "${BLUE}📊 SUMMARY${NC}"
  echo -e "${BLUE}======================================${NC}"
  echo -e "Total students: ${BLUE}$TOTAL${NC}"
  echo -e "Success: ${GREEN}$SUCCESS${NC}"
  echo -e "Failed: ${RED}$FAILED${NC}"
  echo ""
  echo -e "${CYAN}📄 Results saved to: results.xlsx${NC}"
  
  exit 0
fi

# Single student mode
if [ -n "$STUDENT_NAME" ]; then
  REPO_PATH="./test-repos/${DAY}/repos/${STUDENT_NAME}"
  
  if [ ! -d "$REPO_PATH" ]; then
    echo -e "${RED}❌ Student repository not found: $REPO_PATH${NC}"
    echo ""
    echo "Available students in test-repos/${DAY}/repos/:"
    ls -d test-repos/${DAY}/repos/*/ 2>/dev/null | xargs -n1 basename 2>/dev/null || echo "  (empty)"
    exit 1
  fi
  
  echo -e "${GREEN}📂 Student: $STUDENT_NAME${NC}"
  echo -e "${GREEN}📋 Config: $CONFIG_PATH${NC}"
  [ -n "$EXERCISE_ID" ] && echo -e "${GREEN}🎯 Exercise: $EXERCISE_ID${NC}"
  echo ""
  
  echo -e "${BLUE}🐳 Starting Docker container for $STUDENT_NAME...${NC}"
  echo ""
  
  # Look up GroupID for this student
  local single_group_id="${STUDENT_GROUP_IDS[$STUDENT_NAME]:-}"
  
  # Build docker run command with proper arguments
  docker_args=(
    "--rm"
    "-v" "$PROJECT_ROOT/$REPO_PATH:/repo:z"
    "-v" "$CONFIG_ABS:/config.json:ro,z"
    "-v" "$LOGS_DIR:/logs:z"
    "-v" "$RESULTS_DIR:/results:z"
    "-e" "REPO_DIR=/repo"
    "-e" "EXERCISE_CONFIG=/config.json"
    "-e" "LOG_DIR=/logs"
    "-e" "RESULTS_FILE=/results/results.xlsx"
    "-e" "STUDENT_NAME=$STUDENT_NAME"
    "-e" "GROUP_ID=$single_group_id"
    "-e" "VERBOSE=true"
  )
  
  if [ -n "$EXERCISE_ID" ]; then
    docker_args+=("-e" "EXERCISE_ID=$EXERCISE_ID")
  fi
  
  docker_args+=("$IMAGE_NAME")
  
  if docker run "${docker_args[@]}"; then
    echo ""
    echo -e "${GREEN}✅ Check complete!${NC}"
    echo -e "${CYAN}📄 Results saved to: results.xlsx${NC}"
    exit 0
  else
    echo ""
    echo -e "${RED}❌ Check failed${NC}"
    exit 1
  fi
fi

# No student specified
echo -e "${RED}❌ Please specify a student (-s) or use --all to check all students${NC}"
echo "Use --help for usage information"
exit 1

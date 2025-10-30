#!/bin/bash

# Manual validation script for individual students
# Usage: ./manual-validation.sh -d <day> -s <student> [options]

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
DAY=""
STUDENT=""
MODE=""
COUNT=""
ACTION=""

# Show usage
usage() {
    echo "Manual Exercise Validation Tool"
    echo ""
    echo "Usage: $0 -d <day> -s <student> [options]"
    echo ""
    echo "Required:"
    echo "  -d <day>        Day (e.g., day01, day02)"
    echo "  -s <student>    Student login (e.g., john_doe)"
    echo ""
    echo "Modes:"
    echo "  --all <V|D>     Validate (V) or Deny (D) ALL exercises"
    echo "  --first <n> <V|D>  Validate/Deny first N exercises"
    echo "  --interactive   Interactive mode: validate/deny each exercise"
    echo ""
    echo "Examples:"
    echo "  $0 -d day02 -s john_d --all V"
    echo "  $0 -d day02 -s john_d --first 5 V"
    echo "  $0 -d day02 -s john_d --interactive"
    echo ""
    exit 1
}

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -d)
            DAY="$2"
            shift 2
            ;;
        -s)
            STUDENT="$2"
            shift 2
            ;;
        --all)
            MODE="all"
            ACTION="$2"
            shift 2
            ;;
        --first)
            MODE="first"
            COUNT="$2"
            ACTION="$3"
            shift 3
            ;;
        --interactive)
            MODE="interactive"
            shift
            ;;
        -h|--help)
            usage
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            usage
            ;;
    esac
done

# Validate required arguments
if [ -z "$DAY" ] || [ -z "$STUDENT" ]; then
    echo -e "${RED}Error: Day and student are required${NC}"
    usage
fi

if [ -z "$MODE" ]; then
    echo -e "${RED}Error: Mode is required (--all, --first, or --interactive)${NC}"
    usage
fi

# Validate action for non-interactive modes
if [ "$MODE" != "interactive" ]; then
    if [ "$ACTION" != "V" ] && [ "$ACTION" != "D" ]; then
        echo -e "${RED}Error: Action must be V (validate) or D (deny)${NC}"
        exit 1
    fi
fi

# Check if config exists
CONFIG_PATH="./test-repos/${DAY}/config.json"
if [ ! -f "$CONFIG_PATH" ]; then
    echo -e "${RED}Error: Config not found: $CONFIG_PATH${NC}"
    exit 1
fi

echo -e "${BLUE}🔧 Manual Validation Tool${NC}"
echo "================================"
echo -e "📂 Day: ${GREEN}$DAY${NC}"
echo -e "👤 Student: ${GREEN}$STUDENT${NC}"
echo ""

# Read config to get exercises
EXERCISES=$(node -e "
const fs = require('fs');
const config = JSON.parse(fs.readFileSync('$CONFIG_PATH', 'utf8'));
const exercises = config.exercises.map(ex => ({
    id: ex.id,
    name: ex.name
}));
console.log(JSON.stringify(exercises));
")

# Count total exercises
TOTAL=$(echo "$EXERCISES" | node -e "
const exercises = JSON.parse(require('fs').readFileSync(0, 'utf8'));
console.log(exercises.length);
")

echo -e "📊 Total exercises: ${BLUE}$TOTAL${NC}"
echo ""

# Action map
action_to_text() {
    if [ "$1" == "V" ]; then
        echo -e "${GREEN}✅ VALID${NC}"
    else
        echo -e "${RED}❌ DENIED${NC}"
    fi
}

action_to_status() {
    if [ "$1" == "V" ]; then
        echo "VALID"
    else
        echo "ERROR"
    fi
}

# Prepare validation array
declare -a validations

# Mode: All exercises
if [ "$MODE" == "all" ]; then
    echo -e "Mode: $(action_to_text $ACTION) ${BLUE}ALL${NC} exercises"
    echo ""
    
    for i in $(seq 0 $((TOTAL - 1))); do
        EX_ID=$(echo "$EXERCISES" | node -e "
const exercises = JSON.parse(require('fs').readFileSync(0, 'utf8'));
console.log(exercises[$i].id);
")
        EX_NAME=$(echo "$EXERCISES" | node -e "
const exercises = JSON.parse(require('fs').readFileSync(0, 'utf8'));
console.log(exercises[$i].name);
")
        
        validations[$i]="$ACTION"
        echo -e "  Ex$EX_ID: $EX_NAME → $(action_to_text $ACTION)"
    done

# Mode: First N exercises
elif [ "$MODE" == "first" ]; then
    if [ "$COUNT" -gt "$TOTAL" ]; then
        echo -e "${YELLOW}Warning: Requested $COUNT exercises but only $TOTAL available${NC}"
        COUNT=$TOTAL
    fi
    
    echo -e "Mode: $(action_to_text $ACTION) first ${BLUE}$COUNT${NC} exercises"
    echo ""
    
    for i in $(seq 0 $((COUNT - 1))); do
        EX_ID=$(echo "$EXERCISES" | node -e "
const exercises = JSON.parse(require('fs').readFileSync(0, 'utf8'));
console.log(exercises[$i].id);
")
        EX_NAME=$(echo "$EXERCISES" | node -e "
const exercises = JSON.parse(require('fs').readFileSync(0, 'utf8'));
console.log(exercises[$i].name);
")
        
        validations[$i]="$ACTION"
        echo -e "  Ex$EX_ID: $EX_NAME → $(action_to_text $ACTION)"
    done
    
    # Skip remaining
    for i in $(seq $COUNT $((TOTAL - 1))); do
        validations[$i]="SKIP"
    done

# Mode: Interactive
elif [ "$MODE" == "interactive" ]; then
    echo -e "Mode: ${BLUE}Interactive${NC} - validate each exercise individually"
    echo -e "${YELLOW}Enter V (valid), D (deny), or S (skip) for each exercise${NC}"
    echo ""
    
    for i in $(seq 0 $((TOTAL - 1))); do
        EX_ID=$(echo "$EXERCISES" | node -e "
const exercises = JSON.parse(require('fs').readFileSync(0, 'utf8'));
console.log(exercises[$i].id);
")
        EX_NAME=$(echo "$EXERCISES" | node -e "
const exercises = JSON.parse(require('fs').readFileSync(0, 'utf8'));
console.log(exercises[$i].name);
")
        
        while true; do
            echo -ne "  ${BLUE}Ex$EX_ID${NC}: $EX_NAME - [V/D/S]: "
            read -r response
            
            case ${response^^} in
                V)
                    validations[$i]="V"
                    echo -e "    → $(action_to_text V)"
                    break
                    ;;
                D)
                    validations[$i]="D"
                    echo -e "    → $(action_to_text D)"
                    break
                    ;;
                S)
                    validations[$i]="SKIP"
                    echo -e "    → ${YELLOW}⊘ SKIPPED${NC}"
                    break
                    ;;
                *)
                    echo -e "    ${RED}Invalid input. Use V, D, or S${NC}"
                    ;;
            esac
        done
    done
fi

echo ""
echo "================================"
echo -e "${YELLOW}⚠️  Ready to send validations to ETNA API${NC}"
echo ""

# Count actions
VALID_COUNT=0
DENIED_COUNT=0
SKIP_COUNT=0

for i in $(seq 0 $((TOTAL - 1))); do
    case ${validations[$i]} in
        V) ((VALID_COUNT++)) ;;
        D) ((DENIED_COUNT++)) ;;
        SKIP) ((SKIP_COUNT++)) ;;
    esac
done

echo -e "  ${GREEN}✅ Valid: $VALID_COUNT${NC}"
echo -e "  ${RED}❌ Denied: $DENIED_COUNT${NC}"
if [ $SKIP_COUNT -gt 0 ]; then
    echo -e "  ${YELLOW}⊘ Skipped: $SKIP_COUNT${NC}"
fi
echo ""

read -p "Continue? [y/N]: " confirm
if [[ ! $confirm =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}Cancelled${NC}"
    exit 0
fi

echo ""
echo -e "${BLUE}🚀 Sending validations...${NC}"
echo ""

# Build validation payload and send
for i in $(seq 0 $((TOTAL - 1))); do
    if [ "${validations[$i]}" == "SKIP" ]; then
        continue
    fi
    
    EX_ID=$(echo "$EXERCISES" | node -e "
const exercises = JSON.parse(require('fs').readFileSync(0, 'utf8'));
console.log(exercises[$i].id);
")
    EX_NAME=$(echo "$EXERCISES" | node -e "
const exercises = JSON.parse(require('fs').readFileSync(0, 'utf8'));
console.log(exercises[$i].name);
")
    
    STATUS=$(action_to_status ${validations[$i]})
    
    echo -e "  Sending Ex$EX_ID ($EX_NAME): $STATUS"
    
    # Call the etna validator
    npm run validate-etna -- \
        -d "$DAY" \
        -s "$STUDENT" \
        -e "Ex$EX_ID" \
        --status "$STATUS" \
        --send \
        > /dev/null 2>&1
    
    if [ $? -eq 0 ]; then
        echo -e "    ${GREEN}✓ Sent successfully${NC}"
    else
        echo -e "    ${RED}✗ Failed to send${NC}"
    fi
done

echo ""
echo -e "${GREEN}✅ Validation process complete!${NC}"

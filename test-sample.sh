#!/bin/bash
# Quick test runner for a few students to demonstrate the system

echo "🧪 Testing Docker Exercise Checker with Multiple Students"
echo "=========================================================="
echo ""

# Array of students to test
STUDENTS=("guerme_m" "ferrei_e" "lachir_w" "benmak_c")

for student in "${STUDENTS[@]}"; do
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "Testing: $student"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  
  if [ ! -d "test-repos/day01/repos/$student" ]; then
    echo "⚠️  Student directory not found, skipping..."
    continue
  fi
  
  ./docker-test.sh -d day01 -s "$student" 2>&1 | grep -E "(📋 Checking Exercise|✅ Ex|❌ Ex|📊 SUMMARY)" || echo "No output"
  echo ""
done

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 EXCEL SUMMARY"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Results saved to: results.xlsx"
echo "Total entries: $(grep -o '<row' results.xlsx 2>/dev/null | wc -l)"
echo ""
echo "✅ All tests complete! Open results.xlsx to see detailed results."

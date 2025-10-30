#!/usr/bin/env node

import { EtnaValidator } from './etnaValidator';

const args = process.argv.slice(2);

function usage() {
  console.log(`
📋 ETNA Validation Script
=========================

Usage:
  npm run validate-etna [options]

Options:
  -d, --day <day>        Day to validate (default: day01)
  -s, --student <id>     Validate only this student (default: all)
  -e, --exercise <ex>    Validate only this exercise (e.g., Ex01)
  --status <status>      Override status: VALID or ERROR (for manual validation)
  -j, --jobs <n>         Number of parallel requests (default: 16)
  --send                 Actually send validations (default: dry-run)
  -h, --help             Show this help

Examples:
  npm run validate-etna                    # Dry-run for all students in day01
  npm run validate-etna -d day01           # Dry-run for all students in day01
  npm run validate-etna -s guerme_m        # Dry-run for guerme_m only
  npm run validate-etna -s guerme_m --send # Send validations for guerme_m
  npm run validate-etna -s guerme_m -e Ex05 --status VALID --send  # Manually validate Ex05
  npm run validate-etna --send             # Send validations for ALL students
  npm run validate-etna --send -j 8        # Send with 8 parallel requests

Notes:
  - First run will create etna-validation-config.json template
  - Update the config with your ETNA credentials before sending
  - Dry-run mode shows what would be sent without actually sending
  - Parallel jobs speed up validation (default: 4 concurrent requests)
`);
  process.exit(0);
}

async function main() {
  let day = 'day01';
  let studentId: string | undefined;
  let exerciseId: string | undefined;
  let manualStatus: 'VALID' | 'ERROR' | undefined;
  let send = false;
  let parallelJobs = 16;
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    switch (arg) {
      case '-h':
      case '--help':
        usage();
        break;
      
      case '-d':
      case '--day':
        day = args[++i];
        if (!day) {
          console.error('❌ Error: --day requires a value');
          process.exit(1);
        }
        break;
      
      case '-s':
      case '--student':
        studentId = args[++i];
        if (!studentId) {
          console.error('❌ Error: --student requires a value');
          process.exit(1);
        }
        break;
      
      case '-e':
      case '--exercise':
        exerciseId = args[++i];
        if (!exerciseId) {
          console.error('❌ Error: --exercise requires a value');
          process.exit(1);
        }
        break;
      
      case '--status':
        const status = args[++i];
        if (status !== 'VALID' && status !== 'ERROR') {
          console.error('❌ Error: --status must be VALID or ERROR');
          process.exit(1);
        }
        manualStatus = status;
        break;
      
      case '-j':
      case '--jobs':
        parallelJobs = parseInt(args[++i]);
        if (isNaN(parallelJobs) || parallelJobs < 1) {
          console.error('❌ Error: --jobs must be a positive number');
          process.exit(1);
        }
        break;
      
      case '--send':
        send = true;
        break;
      
      default:
        console.error(`❌ Unknown option: ${arg}`);
        usage();
    }
  }
  
  try {
    const validator = new EtnaValidator('./results.xlsx');
    await validator.validateErrors(day, studentId, !send, parallelJobs, exerciseId, manualStatus);
  } catch (err) {
    console.error('❌ Error:', err instanceof Error ? err.message : String(err));
    process.exit(1);
  }
}

main().catch(console.error);

#!/usr/bin/env node

/**
 * Manual Validation Tool
 * Manually validate or deny exercises for a specific student
 */

import fs from 'fs-extra';
import readline from 'readline';
import { execSync } from 'child_process';

interface Exercise {
  id: string;
  name: string;
}

const args = process.argv.slice(2);

function usage() {
  console.log(`
🔧 Manual Exercise Validation Tool
===================================

Usage: npm run manual-validate [options]

Required:
  -d, --day <day>        Day (e.g., day01, day02)
  -s, --student <login>  Student login

Modes:
  --all <V|D>            Validate (V) or Deny (D) ALL exercises
  --first <n> <V|D>      Validate/Deny first N exercises  
  --interactive          Interactive mode: validate/deny each exercise

Examples:
  npm run manual-validate -- -d day02 -s john_d --all V
  npm run manual-validate -- -d day02 -s john_d --first 5 V
  npm run manual-validate -- -d day02 -s john_d --interactive

Notes:
  - V = Valid (green checkmark on ETNA)
  - D = Denied (red cross on ETNA)
  - Interactive mode lets you decide for each exercise
`);
  process.exit(0);
}

async function promptUser(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

async function main() {
  let day: string | undefined;
  let student: string | undefined;
  let mode: 'all' | 'first' | 'interactive' | undefined;
  let count: number | undefined;
  let action: 'V' | 'D' | undefined;

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
        break;
      
      case '-s':
      case '--student':
        student = args[++i];
        break;
      
      case '--all':
        mode = 'all';
        action = args[++i] as 'V' | 'D';
        break;
      
      case '--first':
        mode = 'first';
        count = parseInt(args[++i]);
        action = args[++i] as 'V' | 'D';
        break;
      
      case '--interactive':
        mode = 'interactive';
        break;
      
      default:
        console.error(`❌ Unknown option: ${arg}`);
        usage();
    }
  }

  if (!day || !student || !mode) {
    console.error('❌ Error: Missing required arguments');
    usage();
  }

  if (mode !== 'interactive' && (!action || (action !== 'V' && action !== 'D'))) {
    console.error('❌ Error: Action must be V or D');
    process.exit(1);
  }

  // Load config
  const configPath = `./test-repos/${day}/config.json`;
  if (!fs.existsSync(configPath)) {
    console.error(`❌ Error: Config not found: ${configPath}`);
    process.exit(1);
  }

  const config = await fs.readJSON(configPath);
  const exercises: Exercise[] = config.exercises;

  console.log('\n🔧 Manual Validation Tool');
  console.log('================================');
  console.log(`📂 Day: ${day}`);
  console.log(`👤 Student: ${student}`);
  console.log(`📊 Total exercises: ${exercises.length}\n`);

  // Determine validations
  const validations: Array<{ exercise: Exercise; action: 'V' | 'D' | 'SKIP' }> = [];

  if (mode === 'all') {
    console.log(`Mode: ${action === 'V' ? '✅ VALIDATE' : '❌ DENY'} ALL exercises\n`);
    for (const ex of exercises) {
      validations.push({ exercise: ex, action: action! });
      console.log(`  Ex${ex.id}: ${ex.name} → ${action === 'V' ? '✅' : '❌'}`);
    }
  } else if (mode === 'first') {
    const limit = Math.min(count!, exercises.length);
    console.log(`Mode: ${action === 'V' ? '✅ VALIDATE' : '❌ DENY'} first ${limit} exercises\n`);
    
    for (let i = 0; i < limit; i++) {
      const ex = exercises[i];
      validations.push({ exercise: ex, action: action! });
      console.log(`  Ex${ex.id}: ${ex.name} → ${action === 'V' ? '✅' : '❌'}`);
    }
  } else if (mode === 'interactive') {
    console.log('Mode: Interactive - validate/deny each exercise');
    console.log('Enter V (valid), D (deny), or S (skip) for each exercise\n');
    
    for (const ex of exercises) {
      let response: string;
      while (true) {
        response = await promptUser(`  Ex${ex.id}: ${ex.name} - [V/D/S]: `);
        const upper = response.toUpperCase();
        
        if (upper === 'V' || upper === 'D' || upper === 'S') {
          validations.push({ 
            exercise: ex, 
            action: upper as 'V' | 'D' | 'SKIP'
          });
          console.log(`    → ${upper === 'V' ? '✅ VALID' : upper === 'D' ? '❌ DENIED' : '⊘ SKIPPED'}`);
          break;
        } else {
          console.log('    Invalid input. Use V, D, or S');
        }
      }
    }
  }

  // Summary
  const validCount = validations.filter(v => v.action === 'V').length;
  const deniedCount = validations.filter(v => v.action === 'D').length;
  const skipCount = validations.filter(v => v.action === 'SKIP').length;

  console.log('\n================================');
  console.log('⚠️  Ready to send validations to ETNA API\n');
  console.log(`  ✅ Valid: ${validCount}`);
  console.log(`  ❌ Denied: ${deniedCount}`);
  if (skipCount > 0) {
    console.log(`  ⊘ Skipped: ${skipCount}`);
  }
  console.log('');

  const confirm = await promptUser('Continue? [y/N]: ');
  if (confirm.toLowerCase() !== 'y') {
    console.log('Cancelled');
    process.exit(0);
  }

  // Send validations
  console.log('\n🚀 Sending validations...\n');

  for (const { exercise, action } of validations) {
    if (action === 'SKIP') continue;

    const status = action === 'V' ? 'VALID' : 'ERROR';
    console.log(`  Sending Ex${exercise.id} (${exercise.name}): ${status}`);

    try {
      execSync(
        `npm run validate-etna -- -d "${day}" -s "${student}" -e "Ex${exercise.id}" --status "${status}" --send`,
        { stdio: 'pipe' }
      );
      console.log(`    ✓ Sent successfully`);
    } catch (err) {
      console.error(`    ✗ Failed to send`);
    }
  }

  console.log('\n✅ Validation process complete!');
}

main().catch((err) => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});

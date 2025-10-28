# 🚀 Complete Workflow: Clone → Test → Validate

This document explains the complete workflow from cloning student repositories to validating results on ETNA.

## Overview

```
1. Clone repos (with GroupIDs)  →  2. Initialize Excel  →  3. Run tests  →  4. Validate on ETNA
   Python script                   Python script          Docker          TypeScript script
```

## Step-by-Step Workflow

### Step 1: Clone Student Repositories

Clone all student repos for a specific day from GitLab:

```bash
cd scripts
python clone_repos_etna.py 1
```

**What it does:**
- Clones all student repositories for day 1
- Saves repos to `test-repos/day01/repos/`
- **Creates `test-repos/day01/clone_log.txt` with GroupIDs**

**Example output:**
```
✅ 80 projet(s) trouvé(s)

[1/80] Groupe de guerme_m 1065845
  📚 Clone: guerme_m
  ✅ Cloned

[2/80] Groupe de lachir_w 1065846
  📚 Clone: lachir_w
  ✅ Cloned

✅ Clone log saved: test-repos/day01/clone_log.txt
```

### Step 2: Initialize Excel with Students and GroupIDs

Create the Excel file with all students and their GroupIDs:

```bash
python scripts/init_excel.py 1
```

**What it does:**
- Reads the clone log to extract GroupIDs
- Scans `test-repos/day01/repos/` for student folders
- Reads `test-repos/day01/config.json` for exercise list
- **Creates `results.xlsx` with all students and empty exercise columns**
- **Includes GroupID column at the end**

**Example output:**
```
🔍 Initializing Excel for day01...

✅ Found 80 students
✅ Found 80 groupIds from clone log
✅ Excel file created: ./results.xlsx
   - Worksheet: day01
   - Students: 80
   - Exercises: 21  (Student ID, Score, GroupID excluded)
   - GroupIDs found: 80

📋 Next steps:
   1. Run tests: ./docker-test.sh -d day01 --all
   2. Check results in results.xlsx
   3. Validate on ETNA: npm run validate-etna
```

**Excel structure created:**

| Student ID | Score | Ex00 | Ex01 | ... | Ex20 | GroupID |
|------------|-------|------|------|-----|------|---------|
| guerme_m   |       |      |      |     |      | 1065845 |
| lachir_w   |       |      |      |     |      | 1065846 |
| ...        |       |      |      |     |      | ...     |

### Step 3: Run Tests

Run Docker tests on all students:

```bash
# Test all students
./docker-test.sh -d day01 --all

# Or test specific students
./docker-test.sh -d day01 -s guerme_m
./docker-test.sh -d day01 -s lachir_w
```

**What it does:**
- Runs each student's code in isolated Docker container
- **Updates Excel file with test results** (OK or error messages)
- **Preserves the GroupID column**
- Generates JSON logs in `logs/` directory

**Excel after tests:**

| Student ID | Score              | Ex00 | Ex01 | ... | Ex20  | GroupID |
|------------|-------------------|------|------|-----|-------|---------|
| guerme_m   | 16/21 passed (76.2%) | OK   | OK   | ... | Error | 1065845 |
| lachir_w   | 12/21 passed (57.1%) | Error| OK   | ... | OK    | 1065846 |

### Step 4: Validate Results on ETNA

Send validations to ETNA's intranet:

```bash
# DRY RUN - Preview what will be sent (ALWAYS DO THIS FIRST!)
npm run validate-etna

# Preview for specific student
npm run validate-etna -- -s guerme_m

# ACTUALLY SEND validations (after verifying dry-run)
npm run validate-etna -- --send
npm run validate-etna -- -s guerme_m --send
```

**What it does:**
- Reads Excel file to find all errors
- **Automatically gets GroupIDs from Excel** (no manual mapping needed!)
- Sends "denied" validation to ETNA for each error
- Includes the detailed error message from Excel

**Example output:**
```
📊 Reading Excel file for errors...

Found 14 errors to validate:

guerme_m (GroupID: 1065845): 5 errors
  - Ex09: Expected: "23" | Got: ""
  - Ex13: Expected: "Hello everyone!\n-42" | Got: ""
  ...

lachir_w (GroupID: 1065846): 9 errors
  - Ex00: Missing files: helloTypeScript.ts
  ...

🔍 DRY RUN MODE - No validations sent
Run with --send flag to actually send validations to ETNA
```

## Complete Example

```bash
# 1. Clone repos for day 1
cd scripts
python clone_repos_etna.py 1
cd ..

# 2. Initialize Excel with students and GroupIDs
python scripts/init_excel.py 1

# 3. Run all tests
./docker-test.sh -d day01 --all

# 4. Preview validations
npm run validate-etna

# 5. If everything looks good, send to ETNA
npm run validate-etna -- --send
```

## Configuration Required

### For Cloning (config_etna.py)

```python
# scripts/config_etna.py
GITLAB_URL = "https://gitlab.etna-alternance.net"
GITLAB_TOKEN = "your_gitlab_token"
MAIN_GROUP_ID = 12345  # Your activity's main group ID
BASE_DIR = "./test-repos"
```

### For ETNA Validation (etna-validation-config.json)

```json
{
  "moduleId": 10188,
  "activityId": 54335,
  "authenticator": "your_etna_cookie",
  "exerciseMapping": {
    "00": { "stageName": "Exercice 00", "stageNumber": "000" },
    ...
  }
}
```

**Note:** No need to manually map students anymore! GroupIDs are automatically extracted during cloning and stored in Excel.

## Key Benefits

✅ **Automated GroupID Extraction:** Extracted from GitLab project names during cloning  
✅ **Single Source of Truth:** Excel file contains both test results and GroupIDs  
✅ **No Manual Mapping:** No need to manually maintain student/GroupID mapping  
✅ **Traceable:** Clone log preserves the original project names with GroupIDs  
✅ **Flexible:** Can re-test students without losing GroupID data  

## Troubleshooting

### "GroupID column not found in Excel"

**Problem:** Trying to validate before initializing Excel properly

**Solution:**
```bash
python scripts/init_excel.py 1
```

### "No GroupID found for student"

**Problem:** Student was added manually to Excel without GroupID

**Solutions:**
1. Check `test-repos/day01/clone_log.txt` for the GroupID
2. Manually add the GroupID to the Excel file
3. Or re-clone the repos and re-initialize Excel

### "No clone log found"

**Problem:** Cloned repos before the GroupID logging feature was added

**Solution:**
```bash
# Re-clone to generate the log with GroupIDs
cd scripts
python clone_repos_etna.py 1
cd ..
python scripts/init_excel.py 1
```

## Advanced Usage

### Re-test After Student Fixes

```bash
# Student fixed their code, re-test them
./docker-test.sh -d day01 -s guerme_m

# Check new results
npm run validate-etna -- -s guerme_m

# If they passed, nothing will be shown (no errors to deny)
```

### Multiple Days

```bash
# Day 1
python scripts/clone_repos_etna.py 1
python scripts/init_excel.py 1
./docker-test.sh -d day01 --all

# Day 2
python scripts/clone_repos_etna.py 2
python scripts/init_excel.py 2
./docker-test.sh -d day02 --all

# Now results.xlsx has two worksheets: day01 and day02
```

### Partial Testing

```bash
# Initialize Excel for all students
python scripts/init_excel.py 1

# Test only a few students first
./docker-test.sh -d day01 -s student1
./docker-test.sh -d day01 -s student2

# Excel will have results for these 2, others remain empty
# Can test the rest later without recreating Excel
```

---

**Ready to use!** Follow the steps above for a complete automated correction workflow.

import ExcelJS from "exceljs";
import fs from "fs-extra";

interface ValidationPayload {
  validation: "denied" | "valid";
  content: string;
}

interface DayConfig {
  moduleId: number;
  activityId: number;
  exerciseMapping: {
    [exerciseId: string]: {
      stageName: string;
      stageNumber: string;
    };
  };
}

interface EtnaConfig {
  authenticator: string;
  days: {
    [day: string]: DayConfig;
  };
}

interface StudentValidation {
  studentId: string;
  login: string;
  groupId: number;
  exerciseId: string;
  exerciseName: string;
  status: "OK" | "ERROR" | "VALID";
  errorMessage?: string;
}

export class EtnaValidator {
  private config: EtnaConfig;
  private excelPath: string;

  constructor(excelPath: string = "./results/results.xlsx") {
    this.excelPath = excelPath;
    this.config = this.loadConfig();
  }

  private loadConfig(): EtnaConfig {
    const configPath = "./etna-validation-config.json";
    if (!fs.existsSync(configPath)) {
      console.log("⚠️  Configuration file not found. Creating template...");
      this.createConfigTemplate(configPath);
      throw new Error(
        `Please configure ${configPath} with your ETNA credentials and module details`,
      );
    }
    return fs.readJSONSync(configPath);
  }

  private createConfigTemplate(configPath: string): void {
    const template = {
      authenticator: "YOUR_AUTHENTICATOR_COOKIE_HERE",
      days: {
        day01: {
          moduleId: 10188,
          activityId: 54309,
          exerciseMapping: {
            "00": { stageName: "Exercice ", stageNumber: "000" },
            "01": { stageName: "Exercice ", stageNumber: "001" },
            "02": { stageName: "Exercice ", stageNumber: "002" },
            "03": { stageName: "Exercice ", stageNumber: "003" },
            "04": { stageName: "Exercice ", stageNumber: "004" },
            "05": { stageName: "Exercice ", stageNumber: "005" },
            "06": { stageName: "Exercice ", stageNumber: "006" },
            "07": { stageName: "Exercice ", stageNumber: "007" },
            "08": { stageName: "Exercice ", stageNumber: "008" },
            "09": { stageName: "Exercice ", stageNumber: "009" },
            "10": { stageName: "Exercice ", stageNumber: "010" },
            "11": { stageName: "Exercice ", stageNumber: "011" },
            "12": { stageName: "Exercice ", stageNumber: "012" },
            "13": { stageName: "Exercice ", stageNumber: "013" },
            "14": { stageName: "Exercice ", stageNumber: "014" },
            "15": { stageName: "Exercice ", stageNumber: "015" },
            "16": { stageName: "Exercice ", stageNumber: "016" },
            "17": { stageName: "Exercice ", stageNumber: "017" },
            "18": { stageName: "Exercice ", stageNumber: "018" },
            "19": { stageName: "Exercice ", stageNumber: "019" },
            "20": { stageName: "Exercice ", stageNumber: "020" },
          },
        },
        day02: {
          moduleId: 10188,
          activityId: 54335,
          exerciseMapping: {
            "01": { stageName: "Exercice ", stageNumber: "001" },
            "02": { stageName: "Exercice ", stageNumber: "002" },
            "03": { stageName: "Exercice ", stageNumber: "003" },
            "04": { stageName: "Exercice ", stageNumber: "004" },
            "05": { stageName: "Exercice ", stageNumber: "005" },
            "06": { stageName: "Exercice ", stageNumber: "006" },
            "07": { stageName: "Exercice ", stageNumber: "007" },
            "08": { stageName: "Exercice ", stageNumber: "008" },
            "09": { stageName: "Exercice ", stageNumber: "009" },
            "10": { stageName: "Exercice ", stageNumber: "010" },
            "11": { stageName: "Exercice ", stageNumber: "011" },
            "12": { stageName: "Exercice ", stageNumber: "012" },
            "13": { stageName: "Exercice ", stageNumber: "013" },
            "14": { stageName: "Exercice ", stageNumber: "014" },
            "15": { stageName: "Exercice ", stageNumber: "015" },
            "16": { stageName: "Exercice ", stageNumber: "016" },
            "17": { stageName: "Exercice ", stageNumber: "017" },
            "18": { stageName: "Exercice ", stageNumber: "018" },
            "19": { stageName: "Exercice ", stageNumber: "019" },
            "20": { stageName: "Exercice ", stageNumber: "020" },
          },
        },
      },
    };

    fs.writeJSONSync(configPath, template, { spaces: 2 });
    console.log(`✅ Template created at ${configPath}`);
    console.log("📝 Please update:");
    console.log("   - authenticator: Your ETNA cookie");
    console.log("   - moduleId & activityId for each day: From ETNA URL");
    console.log("   - GroupIDs are automatically read from Excel (column 24)");
  }

  async readExcelValidations(
    day: string = "day01",
    studentId?: string,
  ): Promise<StudentValidation[]> {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(this.excelPath);

    const worksheet = workbook.getWorksheet(day);
    if (!worksheet) {
      throw new Error(`Worksheet ${day} not found in Excel file`);
    }

    const validations: StudentValidation[] = [];

    // Find the GroupID column index
    let groupIdColumnIndex = 0;
    const headerRow = worksheet.getRow(1);
    headerRow.eachCell((cell, colNumber) => {
      if (cell.value?.toString() === "GroupID") {
        groupIdColumnIndex = colNumber;
      }
    });

    if (groupIdColumnIndex === 0) {
      throw new Error(
        "GroupID column not found in Excel. Please run: python scripts/init_excel.py <day>",
      );
    }

    // Iterate through rows (skip header)
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // Skip header

      const currentStudentId = row.getCell(1).value?.toString();
      if (!currentStudentId) return;

      // If specific student requested, skip others
      if (studentId && currentStudentId !== studentId) return;

      // Get groupId from Excel
      const groupId = row.getCell(groupIdColumnIndex).value;
      if (!groupId || groupId === "") {
        console.log(
          `⚠️  No GroupID found for student: ${currentStudentId} (skipping)`,
        );
        return;
      }

      const groupIdNum =
        typeof groupId === "number" ? groupId : parseInt(groupId.toString());
      if (isNaN(groupIdNum)) {
        console.log(
          `⚠️  Invalid GroupID for student: ${currentStudentId} (skipping)`,
        );
        return;
      }

      // Iterate through exercise columns (starting from column 3, after Student ID and Score)
      // Stop before GroupID column
      for (let col = 3; col < groupIdColumnIndex; col++) {
        const cell = row.getCell(col);
        const cellValue = cell.value?.toString() || "";
        const headerCell = worksheet.getRow(1).getCell(col);
        const exerciseHeader = headerCell.value?.toString() || "";

        // Extract exercise ID (Ex00 -> 00)
        const exerciseIdMatch = exerciseHeader.match(/Ex(\d+)/);
        if (!exerciseIdMatch) continue;

        const exerciseId = exerciseIdMatch[1];

        // Only process errors (not OK)
        // Check if cell has an error or is OK
        if (cellValue === "OK") {
          // Student passed the exercise
          validations.push({
            studentId: currentStudentId,
            login: currentStudentId,
            groupId: groupIdNum,
            exerciseId: exerciseId,
            exerciseName: exerciseHeader,
            status: "VALID",
            errorMessage: "OK",
          });
        } else if (cellValue !== "" && cellValue !== null) {
          // Student failed the exercise
          validations.push({
            studentId: currentStudentId,
            login: currentStudentId,
            groupId: groupIdNum,
            exerciseId: exerciseId,
            exerciseName: exerciseHeader,
            status: "ERROR",
            errorMessage: cellValue,
          });
        }
      }
    });

    return validations;
  }

  async sendValidation(
    day: string,
    groupId: number,
    exerciseId: string,
    payload: ValidationPayload,
  ): Promise<any> {
    const dayConfig = this.config.days[day];
    if (!dayConfig) {
      throw new Error(`No configuration found for ${day}`);
    }

    const exerciseInfo = dayConfig.exerciseMapping[exerciseId];
    if (!exerciseInfo) {
      throw new Error(`No mapping found for exercise ${exerciseId} in ${day}`);
    }

    const encodedStage = encodeURIComponent(exerciseInfo.stageName);
    const url = `https://modules-api.etna-alternance.net/${dayConfig.moduleId}/activities/${dayConfig.activityId}/group/${groupId}/stages/${encodedStage}/validation`;

    const headers = {
      Accept: "application/json, text/plain, */*",
      "Content-Type": "application/json;charset=UTF-8",
      Origin: "https://intra-prof.etna-alternance.net",
      Referer: "https://intra-prof.etna-alternance.net/",
      Cookie: `authenticator="${this.config.authenticator}"`,
      "User-Agent":
        "Mozilla/5.0 (X11; Linux x86_64) Chrome/141.0.0.0 Safari/537.36",
    };

    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`HTTP ${response.status}: ${text}`);
    }

    return await response.json();
  }

  async validateErrors(
    day: string = "day01",
    studentId?: string,
    dryRun: boolean = true,
    parallelJobs: number = 16,
    exerciseId?: string,
    manualStatus?: "VALID" | "ERROR",
  ): Promise<void> {
    console.log("📊 Reading Excel file for validations...\n");

    let validations = await this.readExcelValidations(day, studentId);

    // Filter by exercise if specified
    if (exerciseId) {
      validations = validations.filter((v) => v.exerciseId === exerciseId);
      if (validations.length === 0) {
        console.log(`⚠️  No validations found for exercise ${exerciseId}`);
        return;
      }
    }

    // Override status if manual status is provided
    if (manualStatus) {
      console.log(`🔧 Manual status override: ${manualStatus}\n`);
      validations = validations.map((v) => ({
        ...v,
        status: manualStatus === "VALID" ? "VALID" : "ERROR",
        errorMessage:
          manualStatus === "VALID"
            ? undefined
            : v.errorMessage || "Manually denied",
      }));
    }

    if (validations.length === 0) {
      console.log("✅ No validations found!");
      return;
    }

    console.log(`Found ${validations.length} validations to send:\n`);

    // Group by student
    const byStudent = new Map<string, StudentValidation[]>();
    validations.forEach((validation) => {
      if (!byStudent.has(validation.studentId)) {
        byStudent.set(validation.studentId, []);
      }
      byStudent.get(validation.studentId)!.push(validation);
    });

    // Display summary
    for (const [studentId, studentValidations] of byStudent) {
      console.log(`${studentId}: ${studentValidations.length} exercises`);
      studentValidations.forEach((val) => {
        const shortMsg =
          val.errorMessage && val.errorMessage.length > 50
            ? val.errorMessage.substring(0, 50) + "..."
            : val.errorMessage || val.status;
        console.log(`  - ${val.exerciseName}: ${shortMsg}`);
      });
      console.log("");
    }

    if (dryRun) {
      console.log("🔍 DRY RUN MODE - No validations sent");
      console.log("Run with --send flag to actually send validations to ETNA");
      return;
    }

    // Send validations with parallel processing
    console.log(
      `📤 Sending validations to ETNA (${parallelJobs} parallel jobs)...\n`,
    );

    let successCount = 0;
    let failCount = 0;

    // Process in batches to control concurrency
    const processBatch = async (batch: StudentValidation[]) => {
      const promises = batch.map(async (validation) => {
        try {
          const payload: ValidationPayload =
            validation.status === "VALID"
              ? {
                  validation: "valid",
                  content: "OK",
                }
              : {
                  validation: "denied",
                  content:
                    "\n" +
                    (validation.errorMessage?.replace(" | ", "  |  ") ||
                      "Exercise failed validation"),
                };

          await this.sendValidation(
            day,
            validation.groupId,
            validation.exerciseId,
            payload,
          );

          const statusIcon = validation.status === "VALID" ? "✅" : "❌";
          const statusText =
            validation.status === "VALID" ? "Validated" : "Denied";
          console.log(
            `${statusIcon} ${validation.studentId} - ${validation.exerciseName}: ${statusText}`,
          );
          return { success: true, validation };
        } catch (err) {
          console.error(
            `❌ ${validation.studentId} - ${validation.exerciseName}: Failed`,
          );
          console.error(
            `   ${err instanceof Error ? err.message : String(err)}`,
          );
          return { success: false, validation };
        }
      });

      return await Promise.all(promises);
    };

    // Split validations into batches
    for (let i = 0; i < validations.length; i += parallelJobs) {
      const batch = validations.slice(i, i + parallelJobs);
      const results = await processBatch(batch);

      results.forEach((result) => {
        if (result.success) {
          successCount++;
        } else {
          failCount++;
        }
      });

      // Small delay between batches to avoid overwhelming the API
      if (i + parallelJobs < validations.length) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }

    console.log("\n" + "=".repeat(80));
    console.log(`✅ Success: ${successCount}`);
    console.log(`❌ Failed: ${failCount}`);
    console.log(`📊 Total: ${validations.length}`);
    console.log("=".repeat(80));
  }
}

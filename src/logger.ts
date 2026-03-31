import fs from "fs-extra";
import path from "path";
import ExcelJS from "exceljs";
import * as lockfile from "proper-lockfile";

export interface LogEntry {
  timestamp: string;
  repoPath: string;
  day: string;
  totalExercises: number;
  passedExercises: number;
  failedExercises: number;
  percentage: number;
  results: Array<{
    id: string;
    name: string;
    passed: boolean;
    error?: string;
    expectedOutput?: string;
    actualOutput?: string;
  }>;
}

export class Logger {
  private logDir: string;

  constructor(logDir: string = "./logs") {
    this.logDir = logDir;
  }

  private formatErrorMessage(result: LogEntry["results"][0]): string {
    if (result.passed) {
      return "OK";
    }

    // If there's a specific error message (file not found, compilation error, etc.)
    if (result.error && !result.expectedOutput && !result.actualOutput) {
      // Truncate long error messages for Excel display
      const maxLength = 100;
      if (result.error.length > maxLength) {
        // Try to get the first line or meaningful part
        const firstLine = result.error.split("\n")[0];
        if (firstLine.length > maxLength) {
          return firstLine.substring(0, maxLength) + "...";
        }
        return firstLine;
      }
      return result.error;
    }

    // If we have expected vs actual output
    if (
      result.expectedOutput !== undefined &&
      result.actualOutput !== undefined
    ) {
      const expected = result.expectedOutput.trim();
      const actual = result.actualOutput.trim();

      // Don't truncate the comparison - show full values
      return `Expected: ${expected} | Got: ${actual}`;
    }

    // Fallback to error message or generic FAIL
    return result.error || "FAIL";
  }

  async ensureLogDir(): Promise<void> {
    await fs.ensureDir(this.logDir);
  }

  async writeLog(entry: LogEntry): Promise<string> {
    // JSON logging removed - only Excel is used now
    return "";
  }

  async writeSummary(entries: LogEntry[]): Promise<string> {
    await this.ensureLogDir();

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const summaryPath = path.join(this.logDir, `summary_${timestamp}.txt`);

    let summary = "========================================\n";
    summary += `  Exercise Check Summary\n`;
    summary += `  Generated: ${new Date().toISOString()}\n`;
    summary += "========================================\n\n";

    for (const entry of entries) {
      summary += `📁 Repository: ${entry.repoPath}\n`;
      summary += `📅 Day: ${entry.day}\n`;
      summary += `📊 Score: ${entry.passedExercises}/${entry.totalExercises} (${entry.percentage}%)\n`;
      summary += `\n`;

      for (const result of entry.results) {
        const icon = result.passed ? "✅" : "❌";
        summary += `  ${icon} Ex${result.id}: ${result.name}\n`;
        if (!result.passed && result.error) {
          summary += `     └─ ${result.error}\n`;
        }
      }
      summary += "\n";
    }

    await fs.writeFile(summaryPath, summary, "utf8");
    return summaryPath;
  }

  async getRecentLogs(limit: number = 10): Promise<LogEntry[]> {
    const files = await fs.readdir(this.logDir);
    const jsonFiles = files
      .filter((f) => f.endsWith(".json"))
      .sort()
      .reverse()
      .slice(0, limit);

    const logs: LogEntry[] = [];
    for (const file of jsonFiles) {
      const data = await fs.readJSON(path.join(this.logDir, file));
      logs.push(data);
    }

    return logs;
  }

  private initializeExcelHeaders(worksheet: ExcelJS.Worksheet): void {
    // This method is no longer used - kept for compatibility
  }

  async writeExcel(entry: LogEntry): Promise<void> {
    const excelPath = process.env.RESULTS_FILE || "./results.xlsx";

    // Acquire lock on the Excel file to prevent race conditions
    const lockPath = excelPath + ".lock";
    let release: (() => Promise<void>) | null = null;
    const lockStart = Date.now();

    try {
      // Wait up to 60 seconds to acquire lock (for parallel execution)
      release = await lockfile.lock(excelPath, {
        retries: {
          retries: 120, // More retries for highly parallel workloads
          minTimeout: 500,
          maxTimeout: 2000,
        },
        stale: 60000, // 60 second stale timeout
        realpath: false, // Don't resolve symlinks - faster
      });

      const lockWait = Date.now() - lockStart;
      if (lockWait > 5000 && process.env.VERBOSE === "true") {
        console.log(`⏱️  Waited ${lockWait}ms for lock on ${excelPath}`);
      }

      let workbook: ExcelJS.Workbook;

      // Load existing workbook or create new one
      const fileExists = await fs.pathExists(excelPath);
      const fileSize = fileExists ? (await fs.stat(excelPath)).size : 0;

      if (fileExists && fileSize > 0) {
        try {
          workbook = new ExcelJS.Workbook();
          await workbook.xlsx.readFile(excelPath);
        } catch (err) {
          // File is corrupted or invalid, create new workbook
          workbook = new ExcelJS.Workbook();
        }
      } else {
        workbook = new ExcelJS.Workbook();
      }

      // Get or create worksheet for this day
      const dayName = entry.day;
      let worksheet = workbook.getWorksheet(dayName);

      if (!worksheet) {
        worksheet = workbook.addWorksheet(dayName);

        // Initialize headers: Student ID | Score | Ex00 | Ex01 | Ex02 | ... | GroupID
        const headers = ["Student ID", "Score"];

        // Add exercise columns based on the results
        const exerciseIds = entry.results.map((r) => `Ex${r.id}`);
        headers.push(...exerciseIds);

        // Add GroupID column at the end
        headers.push("GroupID");

        worksheet.columns = headers.map((h, idx) => {
          const isGroupId = idx === headers.length - 1;
          const isStudentId = idx === 0;
          const isScore = idx === 1;

          return {
            header: h,
            key: isGroupId
              ? "group_id"
              : isStudentId
                ? "student_id"
                : isScore
                  ? "score"
                  : `ex${entry.results[idx - 2]?.id}`,
            width: isGroupId ? 12 : isStudentId ? 20 : isScore ? 25 : 15,
          };
        });

        // Style header row
        const headerRow = worksheet.getRow(1);
        headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
        headerRow.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FF0070C0" },
        };
        headerRow.alignment = { horizontal: "center", vertical: "middle" };
      }
      // DO NOT reset worksheet.columns if worksheet already exists!
      // Setting worksheet.columns wipes out all existing data in ExcelJS
      // The worksheet already has the correct structure from init_excel.py

      const studentId =
        process.env.STUDENT_NAME || path.basename(entry.repoPath);

      // Find GroupID column by scanning header row
      let groupIdColNumber = 0;
      const headerRow = worksheet.getRow(1);
      headerRow.eachCell((cell, colNumber) => {
        if (cell.value === "GroupID") {
          groupIdColNumber = colNumber;
        }
      });

      // Find existing row for this student or create new one
      let studentRow: ExcelJS.Row | null = null;
      let studentRowNumber = 0;

      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber > 1) {
          // Skip header
          const cellValue = row.getCell(1).value;
          if (cellValue === studentId) {
            studentRow = row;
            studentRowNumber = rowNumber;
          }
        }
      });

      // Get GroupID from environment variable (passed by docker-test.sh)
      const envGroupId = process.env.GROUP_ID;

      if (!studentRow) {
        // Student not found - add new row
        const newRowNum = worksheet.rowCount + 1;
        const row = worksheet.getRow(newRowNum);
        row.getCell(1).value = studentId;
        row.getCell(2).value =
          `${entry.passedExercises}/${entry.totalExercises} passed (${entry.percentage}%)`;

        entry.results.forEach((result, idx) => {
          row.getCell(idx + 3).value = this.formatErrorMessage(result);
        });

        // Set GroupID from env var
        if (envGroupId && groupIdColNumber > 0) {
          row.getCell(groupIdColNumber).value = parseInt(envGroupId);
        }

        row.commit();
        studentRowNumber = newRowNum;
      } else {
        // Update existing row
        const scoreCell = worksheet.getRow(studentRowNumber).getCell(2);
        scoreCell.value = `${entry.passedExercises}/${entry.totalExercises} passed (${entry.percentage}%)`;

        // Update exercise columns
        entry.results.forEach((result, idx) => {
          const colNumber = idx + 3;
          const cell = worksheet.getRow(studentRowNumber).getCell(colNumber);
          cell.value = this.formatErrorMessage(result);
        });

        // Set GroupID from env var (or preserve existing)
        if (groupIdColNumber > 0) {
          const existingGroupId = worksheet
            .getRow(studentRowNumber)
            .getCell(groupIdColNumber).value;
          if (envGroupId) {
            worksheet.getRow(studentRowNumber).getCell(groupIdColNumber).value =
              parseInt(envGroupId);
          } else if (existingGroupId) {
            worksheet.getRow(studentRowNumber).getCell(groupIdColNumber).value =
              existingGroupId;
          }
        }
      }

      // Style the Student ID cell (no background color)
      const studentIdCell = worksheet.getRow(studentRowNumber).getCell(1);
      studentIdCell.alignment = { horizontal: "left", vertical: "middle" };

      // Style the Score cell
      const scoreCell = worksheet.getRow(studentRowNumber).getCell(2);
      scoreCell.alignment = { horizontal: "center", vertical: "middle" };
      scoreCell.font = { bold: true };

      // Color code the exercise cells (starting from column 3)
      entry.results.forEach((result, idx) => {
        const colNumber = idx + 3; // +1 for 1-based, +1 for student_id, +1 for score
        const cell = worksheet.getRow(studentRowNumber).getCell(colNumber);
        const cellValue = cell.value?.toString() || "";

        // Add comment/note with full error details if there's an error
        if (!result.passed) {
          let noteText = "";

          // For expected vs actual comparisons
          if (
            result.expectedOutput !== undefined &&
            result.actualOutput !== undefined
          ) {
            noteText = `Expected:\n${result.expectedOutput}\n\nGot:\n${result.actualOutput}`;
          }
          // For other errors
          else if (result.error && result.error.length > 100) {
            noteText = result.error;
          }

          // DISABLED: cell notes cause ExcelJS file corruption when re-reading
          // The file becomes unreadable after being saved with notes
          /*
        if (noteText) {
          cell.note = {
            texts: [{ 
              font: { size: 10, name: 'Calibri' },
              text: noteText 
            }],
            margins: {
              insetmode: 'custom',
              inset: [0.13, 0.13, 0.13, 0.13]
            }
          };
        }
        */
        }

        // Color based on actual cell value
        if (cellValue === "OK") {
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FF92D050" }, // Green
          };
          cell.font = { bold: true, color: { argb: "FF006100" } };
        } else if (cellValue && cellValue !== "") {
          // Error - red background
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFFF6B6B" }, // Red
          };
          cell.font = { color: { argb: "FF8B0000" } };
        } else {
          // Empty cell - no fill (white) - don't set any fill
          // ExcelJS will leave it as default/no fill
        }

        cell.alignment = {
          horizontal: "center",
          vertical: "middle",
          wrapText: true,
        };
      });

      // Save workbook
      await workbook.xlsx.writeFile(excelPath);
    } finally {
      // Always release the lock
      if (release) {
        await release();
      }
    }
  }
}

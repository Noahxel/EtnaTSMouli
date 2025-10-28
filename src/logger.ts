import fs from 'fs-extra';
import path from 'path';
import ExcelJS from 'exceljs';

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
  
  constructor(logDir: string = './logs') {
    this.logDir = logDir;
  }
  
  private formatErrorMessage(result: LogEntry['results'][0]): string {
    if (result.passed) {
      return 'OK';
    }
    
    // If there's a specific error message (file not found, compilation error, etc.)
    if (result.error && !result.expectedOutput && !result.actualOutput) {
      return result.error;
    }
    
    // If we have expected vs actual output
    if (result.expectedOutput !== undefined && result.actualOutput !== undefined) {
      const expected = result.expectedOutput.trim();
      const actual = result.actualOutput.trim();
      
      // If both are short enough, show inline
      if (expected.length <= 30 && actual.length <= 30) {
        return `Expected: "${expected}" | Got: "${actual}"`;
      }
      
      // If too long, show truncated
      const expectedShort = expected.substring(0, 30) + (expected.length > 30 ? '...' : '');
      const actualShort = actual.substring(0, 30) + (actual.length > 30 ? '...' : '');
      return `Expected: "${expectedShort}" | Got: "${actualShort}"`;
    }
    
    // Fallback to error message or generic FAIL
    return result.error || 'FAIL';
  }
  
  async ensureLogDir(): Promise<void> {
    await fs.ensureDir(this.logDir);
  }
  
  async writeLog(entry: LogEntry): Promise<string> {
    await this.ensureLogDir();
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const repoName = path.basename(entry.repoPath);
    const filename = `${timestamp}_${repoName}_${entry.day}.json`;
    const logPath = path.join(this.logDir, filename);
    
    await fs.writeJSON(logPath, entry, { spaces: 2 });
    return logPath;
  }
  
  async writeSummary(entries: LogEntry[]): Promise<string> {
    await this.ensureLogDir();
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const summaryPath = path.join(this.logDir, `summary_${timestamp}.txt`);
    
    let summary = '========================================\n';
    summary += `  Exercise Check Summary\n`;
    summary += `  Generated: ${new Date().toISOString()}\n`;
    summary += '========================================\n\n';
    
    for (const entry of entries) {
      summary += `📁 Repository: ${entry.repoPath}\n`;
      summary += `📅 Day: ${entry.day}\n`;
      summary += `📊 Score: ${entry.passedExercises}/${entry.totalExercises} (${entry.percentage}%)\n`;
      summary += `\n`;
      
      for (const result of entry.results) {
        const icon = result.passed ? '✅' : '❌';
        summary += `  ${icon} Ex${result.id}: ${result.name}\n`;
        if (!result.passed && result.error) {
          summary += `     └─ ${result.error}\n`;
        }
      }
      summary += '\n';
    }
    
    await fs.writeFile(summaryPath, summary, 'utf8');
    return summaryPath;
  }
  
  async getRecentLogs(limit: number = 10): Promise<LogEntry[]> {
    const files = await fs.readdir(this.logDir);
    const jsonFiles = files
      .filter(f => f.endsWith('.json'))
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
    const excelPath = process.env.RESULTS_FILE || './results.xlsx';
    
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
      const headers = ['Student ID', 'Score'];
      
      // Add exercise columns based on the results
      const exerciseIds = entry.results.map(r => `Ex${r.id}`);
      headers.push(...exerciseIds);
      
      // Add GroupID column at the end
      headers.push('GroupID');
      
      worksheet.columns = headers.map((h, idx) => {
        const isGroupId = idx === headers.length - 1;
        const isStudentId = idx === 0;
        const isScore = idx === 1;
        
        return {
          header: h,
          key: isGroupId ? 'group_id' : 
               isStudentId ? 'student_id' : 
               isScore ? 'score' : 
               `ex${entry.results[idx - 2]?.id}`,
          width: isGroupId ? 12 : isStudentId ? 20 : isScore ? 25 : 15
        };
      });
      
      // Style header row
      const headerRow = worksheet.getRow(1);
      headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF0070C0' }
      };
      headerRow.alignment = { horizontal: 'center', vertical: 'middle' };
    } else {
      // Worksheet exists - re-establish column keys for addRow to work correctly
      const headers = ['Student ID', 'Score'];
      const exerciseIds = entry.results.map(r => `Ex${r.id}`);
      headers.push(...exerciseIds);
      headers.push('GroupID');
      
      worksheet.columns = headers.map((h, idx) => {
        const isGroupId = idx === headers.length - 1;
        const isStudentId = idx === 0;
        const isScore = idx === 1;
        
        return {
          header: h,
          key: isGroupId ? 'group_id' : 
               isStudentId ? 'student_id' : 
               isScore ? 'score' : 
               `ex${entry.results[idx - 2]?.id}`,
          width: isGroupId ? 12 : isStudentId ? 20 : isScore ? 25 : 15
        };
      });
    }
    
    const studentId = process.env.STUDENT_NAME || path.basename(entry.repoPath);
    
    // Find existing row for this student or create new one
    let studentRow: ExcelJS.Row | null = null;
    let studentRowNumber = 0;
    
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber > 1) { // Skip header
        const cellValue = row.getCell(1).value;
        if (cellValue === studentId) {
          studentRow = row;
          studentRowNumber = rowNumber;
        }
      }
    });
    
    if (!studentRow) {
      // Add new row
      const rowData: any = { 
        student_id: studentId,
        score: `${entry.passedExercises}/${entry.totalExercises} passed (${entry.percentage}%)`
      };
      
      entry.results.forEach((result, idx) => {
        const key = `ex${result.id}`;
        rowData[key] = this.formatErrorMessage(result);
      });
      
      studentRow = worksheet.addRow(rowData);
      studentRowNumber = studentRow.number;
    } else {
      // Update existing row - score column
      const scoreCell = worksheet.getRow(studentRowNumber).getCell(2);
      scoreCell.value = `${entry.passedExercises}/${entry.totalExercises} passed (${entry.percentage}%)`;
      
      entry.results.forEach((result, idx) => {
        const colNumber = idx + 3; // +1 for 1-based, +1 for student_id, +1 for score
        const cell = worksheet.getRow(studentRowNumber).getCell(colNumber);
        cell.value = this.formatErrorMessage(result);
      });
    }
    
    // Style the Student ID cell (no background color)
    const studentIdCell = worksheet.getRow(studentRowNumber).getCell(1);
    studentIdCell.alignment = { horizontal: 'left', vertical: 'middle' };
    
    // Style the Score cell
    const scoreCell = worksheet.getRow(studentRowNumber).getCell(2);
    scoreCell.alignment = { horizontal: 'center', vertical: 'middle' };
    scoreCell.font = { bold: true };
    
    // Color code the exercise cells (starting from column 3)
    entry.results.forEach((result, idx) => {
      const colNumber = idx + 3; // +1 for 1-based, +1 for student_id, +1 for score
      const cell = worksheet.getRow(studentRowNumber).getCell(colNumber);
      const cellValue = cell.value?.toString() || '';
      
      // Color based on actual cell value
      if (cellValue === 'OK') {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF92D050' } // Green
        };
        cell.font = { bold: true, color: { argb: 'FF006100' } };
      } else if (cellValue && cellValue !== '') {
        // Error - red background
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFF6B6B' } // Red
        };
        cell.font = { color: { argb: 'FF8B0000' } };
      } else {
        // Empty cell - no fill (white) - don't set any fill
        // ExcelJS will leave it as default/no fill
      }
      
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    });
    
    // Save workbook
    await workbook.xlsx.writeFile(excelPath);
  }
}

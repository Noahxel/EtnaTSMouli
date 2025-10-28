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
    worksheet.columns = [
      { header: 'Student ID', key: 'student_id', width: 20 },
      { header: 'Day', key: 'day', width: 10 },
      { header: 'Exercise ID', key: 'exercise_id', width: 12 },
      { header: 'Exercise Name', key: 'exercise_name', width: 30 },
      { header: 'Passed', key: 'passed', width: 10 },
      { header: 'Error', key: 'error', width: 50 },
      { header: 'Timestamp', key: 'timestamp', width: 25 }
    ];
    
    // Style headers
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF0070C0' }
    };
  }
  
  async writeExcel(entry: LogEntry): Promise<void> {
    const excelPath = process.env.RESULTS_FILE || './results.xlsx';
    
    let workbook: ExcelJS.Workbook;
    let worksheet: ExcelJS.Worksheet;
    
    // Load existing workbook or create new one
    const fileExists = await fs.pathExists(excelPath);
    const fileSize = fileExists ? (await fs.stat(excelPath)).size : 0;
    
    if (fileExists && fileSize > 0) {
      try {
        workbook = new ExcelJS.Workbook();
        await workbook.xlsx.readFile(excelPath);
        worksheet = workbook.getWorksheet('Results') || workbook.addWorksheet('Results');
      } catch (err) {
        // File is corrupted or invalid, create new workbook
        workbook = new ExcelJS.Workbook();
        worksheet = workbook.addWorksheet('Results');
        this.initializeExcelHeaders(worksheet);
      }
    } else {
      workbook = new ExcelJS.Workbook();
      worksheet = workbook.addWorksheet('Results');
      this.initializeExcelHeaders(worksheet);
    }
    
    const studentId = path.basename(entry.repoPath);
    
    // Get existing rows to check for duplicates
    const existingRows = new Set<string>();
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber > 1) { // Skip header
        const key = `${row.getCell(1).value}_${row.getCell(2).value}_${row.getCell(3).value}`;
        existingRows.add(key);
      }
    });
    
    // Add or update rows for each exercise result
    for (const result of entry.results) {
      const key = `${studentId}_${entry.day}_${result.id}`;
      
      // Check if this combination already exists
      let existingRowNumber: number | null = null;
      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber > 1) {
          const rowKey = `${row.getCell(1).value}_${row.getCell(2).value}_${row.getCell(3).value}`;
          if (rowKey === key) {
            existingRowNumber = rowNumber;
          }
        }
      });
      
      const rowData = {
        student_id: studentId,
        day: entry.day,
        exercise_id: result.id,
        exercise_name: result.name,
        passed: result.passed ? 'YES' : 'NO',
        error: result.error || '',
        timestamp: entry.timestamp
      };
      
      if (existingRowNumber) {
        // Update existing row
        const existingRow = worksheet.getRow(existingRowNumber);
        existingRow.getCell('student_id').value = rowData.student_id;
        existingRow.getCell('day').value = rowData.day;
        existingRow.getCell('exercise_id').value = rowData.exercise_id;
        existingRow.getCell('exercise_name').value = rowData.exercise_name;
        existingRow.getCell('passed').value = rowData.passed;
        existingRow.getCell('error').value = rowData.error;
        existingRow.getCell('timestamp').value = rowData.timestamp;
      } else {
        // Add new row
        const newRow = worksheet.addRow(rowData);
        
        // Color code based on pass/fail
        if (result.passed) {
          newRow.getCell('passed').fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF92D050' } // Green
          };
        } else {
          newRow.getCell('passed').fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFFF6B6B' } // Red
          };
        }
      }
    }
    
    // Save workbook
    await workbook.xlsx.writeFile(excelPath);
  }
}

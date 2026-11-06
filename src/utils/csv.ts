import * as XLSX from 'xlsx';

/**
 * Utility to download CSV files with UTF-8 BOM so Amharic text opens cleanly in MS Excel
 */
export const downloadCSV = (csvContent: string, filename: string) => {
  const bom = '\uFEFF';
  const content = csvContent.startsWith(bom) ? csvContent : bom + csvContent;
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  const finalFilename = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  link.setAttribute('download', finalFilename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
};

/**
 * Safely parses line input (e.g., "1. ወንደሰን አበበ (ወ)", "ወይንሸት ታደሰ [ሴ]")
 * Extracts gender if explicitly marked inside parentheses or brackets or explicit suffix,
 * and strips ONLY leading numbering (e.g. "1.", "01)"), WITHOUT EVER truncating or stripping
 * valid Amharic name letters like "ወ" or "ሴ"!
 */
export const parseCleanStudentLine = (
  rawLine: string,
  defaultGender: 'ወ' | 'ሴ' | '' = ''
): { name: string; gender: 'ወ' | 'ሴ' | '' } => {
  if (!rawLine || !rawLine.trim()) {
    return { name: '', gender: defaultGender };
  }

  let text = rawLine.trim();

  // 1. Strip leading row numbers e.g. "1.", "01)", "1 -", "[1]", "1 "
  text = text.replace(/^\[?\d+\]?[\.\)\-\s]+/, '').trim();

  let gender: 'ወ' | 'ሴ' | '' = defaultGender;

  // 2. Check for explicit parenthetical or bracketed gender marker e.g. (ወ), (ሴ), [ወ], [ሴ], (M), (F), (ወንድ), (ሴት)
  if (/[\(\[\{]\s*(?:ሴ|ሴት|f|female)\s*[\)\]\}]/i.test(text)) {
    gender = 'ሴ';
    text = text.replace(/\s*[\(\[\{]\s*(?:ሴ|ሴት|f|female)\s*[\)\]\}]/gi, '');
  } else if (/[\(\[\{]\s*(?:ወ|ወንድ|m|male)\s*[\)\]\}]/i.test(text)) {
    gender = 'ወ';
    text = text.replace(/\s*[\(\[\{]\s*(?:ወ|ወንድ|m|male)\s*[\)\]\}]/gi, '');
  } else if (/[\s,]+(?:ወንድ|male)$/i.test(text)) {
    gender = 'ወ';
    text = text.replace(/[\s,]+(?:ወንድ|male)$/gi, '');
  } else if (/[\s,]+(?:ሴት|female)$/i.test(text)) {
    gender = 'ሴ';
    text = text.replace(/[\s,]+(?:ሴት|female)$/gi, '');
  }

  const name = text.trim();
  return { name, gender };
};

/**
 * Download single sheet XLSX file
 */
export const downloadXLSX = (data: (string | number)[][], filename: string, sheetName = 'ውጤት መዝገብ') => {
  const worksheet = XLSX.utils.aoa_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName.substring(0, 31));
  XLSX.writeFile(workbook, filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`);
};

/**
 * Download multi-sheet XLSX file
 */
export const downloadMultiSheetXLSX = (
  sheets: { name: string; data: (string | number)[][] }[],
  filename: string
) => {
  const workbook = XLSX.utils.book_new();
  sheets.forEach((sh, idx) => {
    const ws = XLSX.utils.aoa_to_sheet(sh.data);
    const validName = (sh.name || `ክፍል_${idx + 1}`).substring(0, 31);
    XLSX.utils.book_append_sheet(workbook, ws, validName);
  });
  XLSX.writeFile(workbook, filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`);
};

export const parseCSVLine = (line: string): string[] => {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if ((char === ',' || char === '\t' || char === ';') && !inQuotes) {
      result.push(current.trim().replace(/^"|"$/g, ''));
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim().replace(/^"|"$/g, ''));
  return result;
};

export interface SheetData {
  sheetName: string;
  rows: string[][];
}

export interface ParsedWorkbookResult {
  isExcel: boolean;
  sheets: SheetData[];
}

/**
 * Normalizes class strings for fuzzy comparison:
 * Removes spaces, dashes, dots, underscores, turns to lower case
 */
export const normalizeClassString = (str: string): string => {
  return (str || '')
    .toString()
    .toLowerCase()
    .replace(/[\s\-_./\\#:]+/g, '')
    .trim();
};

/**
 * Intelligent class matcher: finds best matching class from classList
 */
export const matchClassName = (
  raw: string,
  classList: string[],
  defaultClassName?: string
): string | null => {
  if (!raw || typeof raw !== 'string') return null;
  const rawTrimmed = raw.trim();
  if (!rawTrimmed) return null;

  // 1. Direct exact match
  const exact = classList.find((c) => c === rawTrimmed);
  if (exact) return exact;

  // 2. Case-insensitive exact match
  const caseMatch = classList.find((c) => c.toLowerCase() === rawTrimmed.toLowerCase());
  if (caseMatch) return caseMatch;

  const normalizedRaw = normalizeClassString(rawTrimmed);

  // 3. Normalized exact match (e.g. "1ኛክፍልሀ" vs "1ኛ ክፍል ሀ")
  const normMatch = classList.find((c) => normalizeClassString(c) === normalizedRaw);
  if (normMatch) return normMatch;

  // 4. Special Amharic shorthands
  if (
    normalizedRaw.includes('ማቆያ') ||
    normalizedRaw.includes('መዋዕለ') ||
    normalizedRaw.includes('ህፃናት') ||
    normalizedRaw.includes('ሕፃናት') ||
    normalizedRaw === 'kg' ||
    normalizedRaw === 'kindergarten'
  ) {
    const makoya = classList.find((c) => c.includes('ማቆያ') || c.includes('መዋዕለ'));
    if (makoya) return makoya;
  }

  // "ደረጃ 1" or "ደረጃ 2"
  if (normalizedRaw.includes('ደረጃ1') || normalizedRaw.includes('level1') || normalizedRaw === 'ደ1') {
    const d1 = classList.find((c) => c.includes('ደረጃ 1') || c.includes('ደረጃ1'));
    if (d1) return d1;
  }
  if (normalizedRaw.includes('ደረጃ2') || normalizedRaw.includes('level2') || normalizedRaw === 'ደ2') {
    const d2 = classList.find((c) => c.includes('ደረጃ 2') || c.includes('ደረጃ2'));
    if (d2) return d2;
  }

  // 5. Intelligent Grade Number and Section extraction
  // Extract number (1 to 12)
  const numMatch = rawTrimmed.match(/(?:ክፍል|ደረጃ|grade|g)?\s*(\d+)/i);
  if (numMatch) {
    const num = parseInt(numMatch[1], 10);
    if (num >= 1 && num <= 12) {
      // Check section letter: "ሀ", "A" or "ለ", "B"
      let section: 'ሀ' | 'ለ' | null = null;
      if (
        rawTrimmed.includes('ሀ') ||
        /\b[aA]\b/.test(rawTrimmed) ||
        /grade\s*\d+\s*[aA]/i.test(rawTrimmed) ||
        /\d+\s*[aA]/.test(rawTrimmed) ||
        normalizedRaw.endsWith('ሀ') ||
        normalizedRaw.endsWith('a')
      ) {
        section = 'ሀ';
      } else if (
        rawTrimmed.includes('ለ') ||
        /\b[bB]\b/.test(rawTrimmed) ||
        /grade\s*\d+\s*[bB]/i.test(rawTrimmed) ||
        /\d+\s*[bB]/.test(rawTrimmed) ||
        normalizedRaw.endsWith('ለ') ||
        normalizedRaw.endsWith('b')
      ) {
        section = 'ለ';
      }

      // Grades 11 and 12 typically have no section
      if (num === 11) {
        const c11 = classList.find((c) => c.includes('11'));
        if (c11) return c11;
      }
      if (num === 12) {
        const c12 = classList.find((c) => c.includes('12'));
        if (c12) return c12;
      }

      // For grades 1 to 10
      if (section) {
        const targetClass = `${num}ኛ ክፍል ${section}`;
        const found = classList.find((c) => c === targetClass || normalizeClassString(c) === normalizeClassString(targetClass));
        if (found) return found;
      }

      // If no section was given (e.g. just "8ኛ ክፍል" or "8ኛ" or "Grade 8"):
      // Check if defaultClassName belongs to this grade
      if (defaultClassName) {
        const normDef = normalizeClassString(defaultClassName);
        if (normDef.startsWith(`${num}ኛ`)) {
          return defaultClassName;
        }
      }

      // Otherwise default to section 'ሀ'
      const targetDefault = `${num}ኛ ክፍል ሀ`;
      const foundDefault = classList.find((c) => c === targetDefault || c.includes(`${num}ኛ ክፍል`));
      if (foundDefault) return foundDefault;
    }
  }

  // 6. Substring match fallback
  for (const c of classList) {
    const normC = normalizeClassString(c);
    const strippedC = normC.replace('ክፍል', '');
    if (normalizedRaw === strippedC || (normalizedRaw.length >= 3 && strippedC.includes(normalizedRaw))) {
      return c;
    }
  }

  return null;
};

/**
 * Reads any Excel (.xlsx, .xls) or CSV/text file and returns all parsed sheets
 */
export const readExcelOrCSVWorkbook = (file: File): Promise<ParsedWorkbookResult> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const buffer = event.target?.result as ArrayBuffer;
        if (!buffer || buffer.byteLength === 0) {
          return resolve({ isExcel: false, sheets: [] });
        }

        // Try parsing with SheetJS (XLSX/XLS)
        try {
          const workbook = XLSX.read(buffer, { type: 'array', codepage: 65001 });
          if (workbook.SheetNames && workbook.SheetNames.length > 0) {
            const parsedSheets: SheetData[] = [];

            workbook.SheetNames.forEach((sheetName) => {
              const worksheet = workbook.Sheets[sheetName];
              if (!worksheet) return;

              const rawRows = XLSX.utils.sheet_to_json<(string | number)[]>(worksheet, {
                header: 1,
                raw: false,
                defval: ''
              });

              if (rawRows && rawRows.length > 0) {
                const cleanRows = rawRows
                  .map((row) =>
                    Array.isArray(row)
                      ? row.map((cell) => (cell !== null && cell !== undefined ? String(cell).trim() : ''))
                      : []
                  )
                  .filter((row) => row.some((cell) => cell.length > 0));

                if (cleanRows.length > 0) {
                  parsedSheets.push({
                    sheetName,
                    rows: cleanRows
                  });
                }
              }
            });

            if (parsedSheets.length > 0) {
              return resolve({
                isExcel: true,
                sheets: parsedSheets
              });
            }
          }
        } catch {
          // Fall through to text/CSV decoding
        }

        // Fallback for CSV / TXT files
        const bytes = new Uint8Array(buffer);
        let text = '';

        if (bytes.length >= 2 && bytes[0] === 0xFF && bytes[1] === 0xFE) {
          text = new TextDecoder('utf-16le').decode(buffer);
        } else if (bytes.length >= 2 && bytes[0] === 0xFE && bytes[1] === 0xFF) {
          text = new TextDecoder('utf-16be').decode(buffer);
        } else if (bytes.length >= 3 && bytes[0] === 0xEF && bytes[1] === 0xBB && bytes[2] === 0xBF) {
          text = new TextDecoder('utf-8').decode(buffer);
        } else {
          try {
            const decoder = new TextDecoder('utf-8', { fatal: true });
            text = decoder.decode(buffer);
          } catch {
            try {
              text = new TextDecoder('utf-16le').decode(buffer);
            } catch {
              text = new TextDecoder('utf-8').decode(buffer);
            }
          }
        }

        if (text.charCodeAt(0) === 0xFEFF) {
          text = text.slice(1);
        }

        const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
        const parsedRows = lines.map((l) => parseCSVLine(l));
        const cleanRows = parsedRows.filter((row) => row.some((cell) => cell.length > 0));

        const baseFileName = file.name.replace(/\.[^/.]+$/, '');
        resolve({
          isExcel: false,
          sheets: [{ sheetName: baseFileName, rows: cleanRows }]
        });
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = (err) => reject(err);
    reader.readAsArrayBuffer(file);
  });
};

/**
 * Backward compatible readCSVFile that delegates to readExcelOrCSVWorkbook
 */
export const readCSVFile = async (file: File): Promise<string[][]> => {
  const result = await readExcelOrCSVWorkbook(file);
  if (result.sheets.length > 0) {
    return result.sheets[0].rows;
  }
  return [];
};

export interface ParsedStudentRow {
  name: string;
  className?: string; // If detected in row
  age: string;
  gender: string;
  m1: number;
  m2: number;
  m3: number;
  m4: number;
  m5: number;
  m6: number;
  m7: number;
}

/**
 * Intelligent row parser that detects columns (Name, Class, Age, Gender, Assessments M1-M7)
 */
export const parseStudentRowsWithHeaders = (
  rows: string[][],
  defaultClassName: string,
  classList: string[]
): {
  students: ParsedStudentRow[];
  detectedClasses: string[];
  hasClassColumn: boolean;
} => {
  if (!rows || rows.length === 0) {
    return { students: [], detectedClasses: [], hasClassColumn: false };
  }

  // Find header row in first 3 rows
  let headerRowIndex = -1;
  let colIdxName = -1;
  let colIdxClass = -1;
  let colIdxAge = -1;
  let colIdxGender = -1;
  let colIdxM1 = -1;
  let colIdxM2 = -1;
  let colIdxM3 = -1;
  let colIdxM4 = -1;
  let colIdxM5 = -1;
  let colIdxM6 = -1;
  let colIdxM7 = -1;

  // Scan up to 12 rows to find the true table header row
  let bestHeaderScore = 0;
  for (let r = 0; r < Math.min(rows.length, 12); r++) {
    const row = rows[r];
    let score = 0;
    let tempColName = -1;
    let tempColClass = -1;
    let tempColAge = -1;
    let tempColGender = -1;

    row.forEach((cell, idx) => {
      const c = cell.toLowerCase().trim();
      if (c.includes('ስም') || c.includes('name') || c === 'ተማሪ' || c === 'የተማሪ ስም' || c === 'ሙሉ ስም') {
        score += 10;
        if (tempColName === -1) tempColName = idx;
      }
      if (c.includes('ክፍል') || c.includes('class') || c.includes('grade') || c.includes('ደረጃ')) {
        score += 3;
        if (tempColClass === -1) tempColClass = idx;
      }
      if (c.includes('ዕድሜ') || c.includes('እድሜ') || c === 'age') {
        score += 3;
        if (tempColAge === -1) tempColAge = idx;
      }
      if (c.includes('ፆታ') || c.includes('ጾታ') || c === 'gender' || c === 'sex') {
        score += 3;
        if (tempColGender === -1) tempColGender = idx;
      }
      if (c.includes('ምዘና') || c.includes('quiz') || c.includes('test') || c.includes('ድምር')) {
        score += 2;
      }
      if (c.includes('ተ.ቁ') || c === 'no' || c === '#' || c === 'no.') {
        score += 2;
      }
    });

    // A true table header must contain a name column or have high column match
    if (tempColName !== -1 && score > bestHeaderScore) {
      bestHeaderScore = score;
      headerRowIndex = r;
      colIdxName = tempColName;
      colIdxClass = tempColClass;
      colIdxAge = tempColAge;
      colIdxGender = tempColGender;

      // Map assessment columns
      row.forEach((cell, idx) => {
        const cLower = cell.toLowerCase().trim();
        if (cLower.includes('ምዘና 1') || cLower === 'ምዘና1' || cLower === 'm1' || cLower.includes('quiz 1') || cLower.includes('test 1')) {
          colIdxM1 = idx;
        } else if (cLower.includes('ምዘና 2') || cLower === 'ምዘና2' || cLower === 'm2' || cLower.includes('quiz 2') || cLower.includes('test 2')) {
          colIdxM2 = idx;
        } else if (cLower.includes('ምዘና 3') || cLower === 'ምዘና3' || cLower === 'm3' || cLower.includes('quiz 3') || cLower.includes('test 3')) {
          colIdxM3 = idx;
        } else if (cLower.includes('ምዘና 4') || cLower === 'ምዘና4' || cLower === 'm4' || cLower.includes('mid') || cLower.includes('test 4')) {
          colIdxM4 = idx;
        } else if (cLower.includes('ምዘና 5') || cLower === 'ምዘና5' || cLower === 'm5' || cLower.includes('quiz 4') || cLower.includes('test 5')) {
          colIdxM5 = idx;
        } else if (cLower.includes('ምዘና 6') || cLower === 'ምዘና6' || cLower === 'm6' || cLower.includes('quiz 5') || cLower.includes('test 6')) {
          colIdxM6 = idx;
        } else if (cLower.includes('ምዘና 7') || cLower === 'ምዘና7' || cLower === 'm7' || cLower.includes('final') || cLower.includes('ማጠቃለያ')) {
          colIdxM7 = idx;
        }
      });
    }
  }

  const startIdx = headerRowIndex !== -1 ? headerRowIndex + 1 : 0;
  const students: ParsedStudentRow[] = [];
  const foundClassesSet = new Set<string>();

  for (let i = startIdx; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0) continue;

    let name = '';
    let rowClass = '';
    let age = '7';
    let gender = 'ወ';
    let m1 = 0, m2 = 0, m3 = 0, m4 = 0, m5 = 0, m6 = 0, m7 = 0;

    if (headerRowIndex !== -1 && colIdxName !== -1) {
      name = row[colIdxName] || '';
      if (colIdxClass !== -1 && row[colIdxClass]) {
        rowClass = row[colIdxClass].trim();
      }
      if (colIdxAge !== -1 && row[colIdxAge]) {
        age = row[colIdxAge].trim() || '7';
      }
      if (colIdxGender !== -1 && row[colIdxGender]) {
        const gRaw = row[colIdxGender].trim();
        gender = gRaw.includes('ሴ') || gRaw.toLowerCase().startsWith('f') ? 'ሴ' : 'ወ';
      }
      if (colIdxM1 !== -1) m1 = parseFloat(row[colIdxM1]) || 0;
      if (colIdxM2 !== -1) m2 = parseFloat(row[colIdxM2]) || 0;
      if (colIdxM3 !== -1) m3 = parseFloat(row[colIdxM3]) || 0;
      if (colIdxM4 !== -1) m4 = parseFloat(row[colIdxM4]) || 0;
      if (colIdxM5 !== -1) m5 = parseFloat(row[colIdxM5]) || 0;
      if (colIdxM6 !== -1) m6 = parseFloat(row[colIdxM6]) || 0;
      if (colIdxM7 !== -1) m7 = parseFloat(row[colIdxM7]) || 0;
    } else {
      // No recognized header row: inspect first columns heuristic
      let nameIdx = 0;
      if (!isNaN(Number(row[0])) && row.length > 1) {
        nameIdx = 1;
      }

      name = row[nameIdx] || '';

      // Check if subsequent column is a Class name
      const potentialClassCol1 = row[nameIdx + 1] || '';
      const matchedAsClass1 = matchClassName(potentialClassCol1, classList, defaultClassName);

      if (matchedAsClass1) {
        rowClass = matchedAsClass1;
        age = row[nameIdx + 2] || '7';
        const gRaw = row[nameIdx + 3] || 'ወ';
        gender = gRaw.includes('ሴ') || gRaw.toLowerCase().startsWith('f') ? 'ሴ' : 'ወ';
        m1 = parseFloat(row[nameIdx + 4]) || 0;
        m2 = parseFloat(row[nameIdx + 5]) || 0;
        m3 = parseFloat(row[nameIdx + 6]) || 0;
        m4 = parseFloat(row[nameIdx + 7]) || 0;
        m5 = parseFloat(row[nameIdx + 8]) || 0;
        m6 = parseFloat(row[nameIdx + 9]) || 0;
        m7 = parseFloat(row[nameIdx + 10]) || 0;
      } else {
        age = row[nameIdx + 1] || '7';
        const gRaw = row[nameIdx + 2] || 'ወ';
        gender = gRaw.includes('ሴ') || gRaw.toLowerCase().startsWith('f') ? 'ሴ' : 'ወ';
        m1 = parseFloat(row[nameIdx + 3]) || 0;
        m2 = parseFloat(row[nameIdx + 4]) || 0;
        m3 = parseFloat(row[nameIdx + 5]) || 0;
        m4 = parseFloat(row[nameIdx + 6]) || 0;
        m5 = parseFloat(row[nameIdx + 7]) || 0;
        m6 = parseFloat(row[nameIdx + 8]) || 0;
        m7 = parseFloat(row[nameIdx + 9]) || 0;
      }
    }

    // Filter out rows that are actually header leftovers or empty names
    if (!name || name.trim().length === 0) continue;
    if (name.includes('ተ.ቁ') || name.includes('የተማሪ ስም') || name.toLowerCase() === 'name') continue;

    // Match class if found
    let finalClass = defaultClassName;
    if (rowClass) {
      const matched = matchClassName(rowClass, classList, defaultClassName);
      if (matched) {
        finalClass = matched;
        foundClassesSet.add(matched);
      } else {
        finalClass = rowClass;
        foundClassesSet.add(rowClass);
      }
    }

    students.push({
      name: name.trim(),
      className: rowClass ? finalClass : undefined,
      age: age || '7',
      gender,
      m1, m2, m3, m4, m5, m6, m7
    });
  }

  return {
    students,
    detectedClasses: Array.from(foundClassesSet),
    hasClassColumn: colIdxClass !== -1 || foundClassesSet.size > 0
  };
};

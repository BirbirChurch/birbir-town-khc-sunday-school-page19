import React, { useState, useMemo, useEffect } from 'react';
import {
  Calendar,
  UserX,
  Trash2,
  Printer,
  Download,
  Upload,
  Filter,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Sparkles,
  Users,
  Search,
  CheckSquare,
  Clock,
  Award,
  Layers,
  Info,
  UserPlus,
  Plus,
  FileText,
  Check,
  RotateCcw,
  Eraser
} from 'lucide-react';
import {
  AbsenteeRecord,
  Role,
  Student,
  Teacher,
  WeeklyAttendanceStatus,
  YearWeeklyAttendanceMap
} from '../types';
import {
  downloadCSV,
  downloadXLSX,
  readCSVFile,
  readExcelOrCSVWorkbook,
  parseCleanStudentLine
} from '../utils/csv';

interface AttendanceTabProps {
  currentYear: string;
  classList: string[];
  studentsByClass: { [className: string]: Student[] };
  weeklyAttendance: YearWeeklyAttendanceMap;
  weekDates: { [weekNumber: number]: string };
  attendance: AbsenteeRecord[];
  onUpdateStudentWeeklyAttendance: (
    year: string,
    className: string,
    studentId: number | string,
    week: number,
    status: WeeklyAttendanceStatus
  ) => void;
  onBatchUpdateWeeklyAttendance: (
    year: string,
    className: string,
    week: number,
    statusUpdates: { [studentId: string]: WeeklyAttendanceStatus },
    weekDate?: string
  ) => void;
  onSetWeekDate: (year: string, week: number, dateStr: string) => void;
  onClearWeekAttendance: (year: string, className: string, week: number) => void;
  onAddAttendance: (record: Omit<AbsenteeRecord, 'id'>) => void;
  onAddAttendanceBatch?: (records: Omit<AbsenteeRecord, 'id'>[]) => void;
  onDeleteAttendance: (id: number) => void;
  onDeleteStudent?: (studentId: number) => void;
  onClearClassStudents?: (className: string) => void;
  onSetClassAge?: (className: string, newAge: string) => void;
  onAddStudentToClass?: (className: string, student: Omit<Student, 'id'>) => void;
  onUpdateStudent?: (student: Student) => void;
  currentUserRole: Role | null;
  loggedInTeacher?: Teacher | null;
}

type AttendanceViewMode = 'roster40' | 'weeklyTaker' | 'absenteeList';
type QuarterFilter = 'all' | 'h1' | 'h2' | 'q1' | 'q2' | 'q3' | 'q4';

export const AttendanceTab: React.FC<AttendanceTabProps> = ({
  currentYear,
  classList,
  studentsByClass,
  weeklyAttendance,
  weekDates,
  attendance,
  onUpdateStudentWeeklyAttendance,
  onBatchUpdateWeeklyAttendance,
  onSetWeekDate,
  onClearWeekAttendance,
  onAddAttendance,
  onAddAttendanceBatch,
  onDeleteAttendance,
  onDeleteStudent,
  onClearClassStudents,
  onSetClassAge,
  onAddStudentToClass,
  onUpdateStudent,
  currentUserRole,
  loggedInTeacher
}) => {
  // Navigation / View modes
  const [activeView, setActiveView] = useState<AttendanceViewMode>('roster40');
  const [selectedClass, setSelectedClass] = useState<string>(() => {
    if (loggedInTeacher?.assignedClass && classList.includes(loggedInTeacher.assignedClass)) {
      return loggedInTeacher.assignedClass;
    }
    return classList[0] || '';
  });

  // Quarter filter for 40-week grid
  const [quarterFilter, setQuarterFilter] = useState<QuarterFilter>('all');
  const [searchStudent, setSearchStudent] = useState('');
  const [isPrinting, setIsPrinting] = useState(false);

  useEffect(() => {
    const handleBeforePrint = () => setIsPrinting(true);
    const handleAfterPrint = () => setIsPrinting(false);
    window.addEventListener('beforeprint', handleBeforePrint);
    window.addEventListener('afterprint', handleAfterPrint);
    return () => {
      window.removeEventListener('beforeprint', handleBeforePrint);
      window.removeEventListener('afterprint', handleAfterPrint);
    };
  }, []);

  // Weekly Taker Mode States
  const [selectedWeek, setSelectedWeek] = useState<number>(1);
  const [currentWeekDate, setCurrentWeekDate] = useState<string>(() => {
    return weekDates?.[1] || new Date().toISOString().substring(0, 10);
  });
  const [quickAbsentReasons, setQuickAbsentReasons] = useState<{ [studentId: string]: string }>({});

  // Absentee List Filter States
  const [absenteeDateFilter, setAbsenteeDateFilter] = useState(() => new Date().toISOString().substring(0, 10));
  const [absenteeClassFilter, setAbsenteeClassFilter] = useState('all');
  const [showAddAbsenteeModal, setShowAddAbsenteeModal] = useState(false);

  // Modal form states for manual absentee slip
  const [modalTargetClass, setModalTargetClass] = useState(classList[0] || '');
  const [modalStudentName, setModalStudentName] = useState('');
  const [modalGender, setModalGender] = useState('ወ');
  const [modalReason, setModalReason] = useState('ሕመም / አልመጣም');

  // Active week popover state in 40-week grid
  const [activeWeekMenu, setActiveWeekMenu] = useState<number | null>(null);

  // Interactive inline student addition on blank rows (to fill up to 40 lines)
  const [editingRowIndex, setEditingRowIndex] = useState<number | null>(null);
  const [inlineStudentName, setInlineStudentName] = useState('');
  const [inlineStudentGender, setInlineStudentGender] = useState<'ወ' | 'ሴ' | ''>('ወ');

  // Batch paste modal state (to quickly fill lines 1 to 40 with student names)
  const [showBatchAddModal, setShowBatchAddModal] = useState(false);
  const [batchNamesText, setBatchNamesText] = useState('');
  const [batchDefaultGender, setBatchDefaultGender] = useState<'ወ' | 'ሴ' | ''>('');
  const [batchDefaultAge, setBatchDefaultAge] = useState<string>('8');

  // Students for the currently selected class
  const classStudents = useMemo(() => {
    return studentsByClass?.[selectedClass] || [];
  }, [studentsByClass, selectedClass]);

  const filteredClassStudents = useMemo(() => {
    if (!searchStudent.trim()) return classStudents;
    const q = searchStudent.trim().toLowerCase();
    return classStudents.filter((s) => s.name.toLowerCase().includes(q));
  }, [classStudents, searchStudent]);

  // Current class attendance map: studentId -> { [week]: 'P' | 'A' | 'E' }
  const currentClassAttendance = useMemo(() => {
    return weeklyAttendance?.[selectedClass] || {};
  }, [weeklyAttendance, selectedClass]);

  // Weeks range based on Half-Year / Quarter filter
  const displayedWeeks = useMemo(() => {
    if (quarterFilter === 'h1') return Array.from({ length: 20 }, (_, i) => i + 1); // 1-20 (1ኛ ግማሽ ዓመት)
    if (quarterFilter === 'h2') return Array.from({ length: 20 }, (_, i) => i + 21); // 21-40 (2ኛ ግማሽ ዓመት)
    if (quarterFilter === 'q1') return Array.from({ length: 10 }, (_, i) => i + 1); // 1-10
    if (quarterFilter === 'q2') return Array.from({ length: 10 }, (_, i) => i + 11); // 11-20
    if (quarterFilter === 'q3') return Array.from({ length: 10 }, (_, i) => i + 21); // 21-30
    if (quarterFilter === 'q4') return Array.from({ length: 10 }, (_, i) => i + 31); // 31-40
    return Array.from({ length: 40 }, (_, i) => i + 1); // 1-40 (ሁሉም)
  }, [quarterFilter]);

  // Standard 40 rows per class: guaranteed minimum 40 rows!
  const TARGET_ROWS_COUNT = 40;
  const totalDisplayRows = useMemo(() => {
    if (searchStudent.trim() && !isPrinting) {
      return filteredClassStudents.length;
    }
    return Math.max(TARGET_ROWS_COUNT, classStudents.length);
  }, [classStudents.length, filteredClassStudents.length, searchStudent, isPrinting]);

  // Compute student stats across 40 weeks
  const studentStatsMap = useMemo(() => {
    const map: {
      [studentId: string]: {
        present: number;
        absent: number;
        excused: number;
        totalRecorded: number;
        rate: number;
      };
    } = {};

    classStudents.forEach((student) => {
      const records = currentClassAttendance[student.id] || {};
      let present = 0;
      let absent = 0;
      let excused = 0;

      for (let w = 1; w <= 40; w++) {
        const status = records[w];
        if (status === 'P') present++;
        else if (status === 'A') absent++;
        else if (status === 'E') excused++;
      }

      const totalRecorded = present + absent + excused;
      const rate = totalRecorded > 0 ? Math.round((present / totalRecorded) * 100) : 0;

      map[student.id] = {
        present,
        absent,
        excused,
        totalRecorded,
        rate
      };
    });

    return map;
  }, [classStudents, currentClassAttendance]);

  // Class overall stats
  const overallClassStats = useMemo(() => {
    let totalPresent = 0;
    let totalAbsent = 0;
    let totalExcused = 0;
    let totalActiveStudents = classStudents.length;

    Object.values(studentStatsMap).forEach((st) => {
      totalPresent += st.present;
      totalAbsent += st.absent;
      totalExcused += st.excused;
    });

    const totalSessionsRecorded = totalPresent + totalAbsent + totalExcused;
    const avgRate =
      totalSessionsRecorded > 0 ? Math.round((totalPresent / totalSessionsRecorded) * 100) : 0;

    // This selected week stats
    let thisWeekPresent = 0;
    let thisWeekAbsent = 0;
    let thisWeekExcused = 0;

    classStudents.forEach((s) => {
      const st = currentClassAttendance[s.id]?.[selectedWeek];
      if (st === 'P') thisWeekPresent++;
      else if (st === 'A') thisWeekAbsent++;
      else if (st === 'E') thisWeekExcused++;
    });

    return {
      totalActiveStudents,
      avgRate,
      thisWeekPresent,
      thisWeekAbsent,
      thisWeekExcused,
      thisWeekTotal: thisWeekPresent + thisWeekAbsent + thisWeekExcused
    };
  }, [classStudents, studentStatsMap, currentClassAttendance, selectedWeek]);

  // Per-week summary for footer of table
  const weeklyColumnSummary = useMemo(() => {
    const summary: {
      [week: number]: { present: number; absent: number; excused: number; rate: number };
    } = {};

    for (let w = 1; w <= 40; w++) {
      let p = 0;
      let a = 0;
      let e = 0;
      classStudents.forEach((st) => {
        const val = currentClassAttendance[st.id]?.[w];
        if (val === 'P') p++;
        else if (val === 'A') a++;
        else if (val === 'E') e++;
      });
      const tot = p + a + e;
      const rate = tot > 0 ? Math.round((p / tot) * 100) : 0;
      summary[w] = { present: p, absent: a, excused: e, rate };
    }

    return summary;
  }, [classStudents, currentClassAttendance]);

  // Cycle status on click: '' -> 'P' -> 'A' -> 'E' -> ''
  const handleCycleStatus = (studentId: number | string, weekNumber: number) => {
    const current = currentClassAttendance[studentId]?.[weekNumber] || '';
    let next: WeeklyAttendanceStatus = '';
    if (!current) next = 'P';
    else if (current === 'P') next = 'A';
    else if (current === 'A') next = 'E';
    else next = '';

    onUpdateStudentWeeklyAttendance(currentYear, selectedClass, studentId, weekNumber, next);
  };

  // Keyboard entry & arrow navigation for 40-week cells (score-entry style)
  const handleAttendanceKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    rowIndex: number,
    colIndex: number,
    studentId: number | string,
    weekNumber: number
  ) => {
    const totalRows = Math.max(TARGET_ROWS_COUNT, classStudents.length);
    const totalCols = displayedWeeks.length;
    const key = e.key;

    let moveDown = false;
    let targetRow = rowIndex;
    let targetCol = colIndex;

    if (key === '1' || key.toLowerCase() === 'p' || key === 'ተ') {
      e.preventDefault();
      onUpdateStudentWeeklyAttendance(currentYear, selectedClass, studentId, weekNumber, 'P');
      moveDown = true;
    } else if (key === '0' || key.toLowerCase() === 'a' || key === 'ቀ') {
      e.preventDefault();
      onUpdateStudentWeeklyAttendance(currentYear, selectedClass, studentId, weekNumber, 'A');
      moveDown = true;
    } else if (key === '2' || key.toLowerCase() === 'e' || key === 'ፈ') {
      e.preventDefault();
      onUpdateStudentWeeklyAttendance(currentYear, selectedClass, studentId, weekNumber, 'E');
      moveDown = true;
    } else if (key === 'Backspace' || key === 'Delete' || key === ' ') {
      e.preventDefault();
      onUpdateStudentWeeklyAttendance(currentYear, selectedClass, studentId, weekNumber, '');
    } else if (key === 'ArrowDown' || key === 'Enter') {
      e.preventDefault();
      moveDown = true;
    } else if (key === 'ArrowUp') {
      e.preventDefault();
      targetRow = Math.max(0, rowIndex - 1);
    } else if (key === 'ArrowRight') {
      e.preventDefault();
      if (colIndex < totalCols - 1) {
        targetCol = colIndex + 1;
      }
    } else if (key === 'ArrowLeft') {
      e.preventDefault();
      if (colIndex > 0) {
        targetCol = colIndex - 1;
      }
    } else {
      return;
    }

    if (moveDown) {
      targetRow = Math.min(totalRows - 1, rowIndex + 1);
    }

    const nextElem = document.getElementById(`att-cell-input-${targetRow}-${targetCol}`) as HTMLInputElement | null;
    if (nextElem) {
      nextElem.focus();
      nextElem.select();
    }
  };

  const handleStudentInfoChange = (
    student: Student,
    field: 'name' | 'age' | 'gender',
    val: string
  ) => {
    if (onUpdateStudent) {
      onUpdateStudent({
        ...student,
        [field]: val
      });
    }
  };

  // Mark all students present for a specific week
  const handleMarkAllPresent = (weekNumber: number) => {
    const updates: { [studentId: string]: WeeklyAttendanceStatus } = {};
    classStudents.forEach((s) => {
      updates[s.id] = 'P';
    });
    const dateStr = weekDates?.[weekNumber] || currentWeekDate;
    onBatchUpdateWeeklyAttendance(currentYear, selectedClass, weekNumber, updates, dateStr);
  };

  // Mark all students absent for a specific week
  const handleMarkAllAbsent = (weekNumber: number) => {
    const updates: { [studentId: string]: WeeklyAttendanceStatus } = {};
    classStudents.forEach((s) => {
      updates[s.id] = 'A';
    });
    const dateStr = weekDates?.[weekNumber] || currentWeekDate;
    onBatchUpdateWeeklyAttendance(currentYear, selectedClass, weekNumber, updates, dateStr);
  };

  // Clear all records for a specific week
  const handleClearWeek = (weekNumber: number) => {
    if (confirm(`የሳምንት ${weekNumber} አቴንዳንስ ሙሉ በሙሉ እንዲጠፋ ይፈልጋሉ?`)) {
      onClearWeekAttendance(currentYear, selectedClass, weekNumber);
    }
  };

  // Clear all 40-week records for the currently selected class
  const handleClearAllClassAttendance = () => {
    if (confirm(`የ"${selectedClass}" ክፍል የ40 ሳምንታት አቴንዳንስ መረጃ በሙሉ እንዲጠፋ ይፈልጋሉ?`)) {
      for (let w = 1; w <= 40; w++) {
        onClearWeekAttendance(currentYear, selectedClass, w);
      }
      alert(`✓ የ"${selectedClass}" ክፍል አቴንዳንስ መረጃ በሙሉ ተፀድቷል።`);
    }
  };

  // Delete all registered students in the currently selected class
  const handleDeleteAllClassStudents = () => {
    if (!onDeleteStudent && !onClearClassStudents) return;
    if (classStudents.length === 0) {
      alert('በዚህ ክፍል ውስጥ የተመዘገበ ተማሪ የለም!');
      return;
    }
    if (
      confirm(
        `⚠️ የማስጠንቀቂያ መልእክት፦\nየ"${selectedClass}" ክፍል ${classStudents.length} ተማሪዎች ሙሉ በሙሉ ይደለታሉ። እርግጠኛ ነዎት?`
      )
    ) {
      if (onClearClassStudents) {
        onClearClassStudents(selectedClass);
      } else if (onDeleteStudent) {
        classStudents.forEach((student) => {
          onDeleteStudent(student.id);
        });
      }
      alert(`✓ የ"${selectedClass}" ክፍል ተማሪዎች በሙሉ ተሰርዘዋል።`);
    }
  };

  // Apply same age to all students in this class
  const handleApplyClassAge = (newAge: string) => {
    if (classStudents.length === 0) {
      alert('በዚህ ክፍል ውስጥ የተመዘገበ ተማሪ የለም!');
      return;
    }
    if (
      window.confirm(
        `የ"${selectedClass}" ክፍል ${classStudents.length} ተማሪዎችን ዕድሜ በሙሉ ወደ "${newAge} ዓመት" መቀየር ይፈልጋሉ?`
      )
    ) {
      if (onSetClassAge) {
        onSetClassAge(selectedClass, newAge);
      } else if (onUpdateStudent) {
        classStudents.forEach((s) => onUpdateStudent({ ...s, age: newAge }));
      }
      alert(`✓ የ"${selectedClass}" ክፍል ተማሪዎች በሙሉ ዕድሜያቸው ${newAge} ዓመት ተደርጓል!`);
    }
  };

  // Set week date handler
  const handleUpdateWeekDate = (weekNumber: number, dateStr: string) => {
    setCurrentWeekDate(dateStr);
    onSetWeekDate(currentYear, weekNumber, dateStr);
  };

  // Single week marker: toggle a specific student
  const handleSetStudentStatus = (
    studentId: number | string,
    status: WeeklyAttendanceStatus,
    studentNameVal?: string,
    genderVal?: string
  ) => {
    onUpdateStudentWeeklyAttendance(currentYear, selectedClass, studentId, selectedWeek, status);

    if ((status === 'A' || status === 'E') && studentNameVal) {
      const enteredReason = quickAbsentReasons[studentId];
      if (enteredReason && enteredReason.trim()) {
        onAddAttendance({
          date: currentWeekDate,
          className: selectedClass,
          studentName: studentNameVal,
          gender: genderVal || 'ወ',
          reason: status === 'E' ? `[ፍቃድ] ${enteredReason.trim()}` : enteredReason.trim()
        });
      }
    }
  };

  // Save inline student typed into a blank row (lines 1 to 40)
  const handleSaveInlineStudent = (rowNumber: number) => {
    if (!inlineStudentName.trim()) {
      setEditingRowIndex(null);
      return;
    }
    const { name: cleanName, gender: parsedGender } = parseCleanStudentLine(
      inlineStudentName,
      inlineStudentGender
    );

    if (onAddStudentToClass && cleanName) {
      onAddStudentToClass(selectedClass, {
        name: cleanName,
        age: '12',
        gender: parsedGender,
        m1: 0,
        m2: 0,
        m3: 0,
        m4: 0,
        m5: 0,
        m6: 0,
        m7: 0
      });
    }
    setInlineStudentName('');
    setInlineStudentGender('ወ');
    setEditingRowIndex(null);
  };

  // Save multiple students pasted at once to fill up to 40 rows
  const handleBatchAddStudents = () => {
    if (!batchNamesText.trim()) return;
    const lines = batchNamesText
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (lines.length === 0) return;

    if (onAddStudentToClass) {
      lines.forEach((line) => {
        const { name: cleanName, gender: g } = parseCleanStudentLine(line, batchDefaultGender);

        if (cleanName && cleanName.length >= 2) {
          onAddStudentToClass(selectedClass, {
            name: cleanName,
            age: batchDefaultAge || '8',
            gender: g,
            m1: 0,
            m2: 0,
            m3: 0,
            m4: 0,
            m5: 0,
            m6: 0,
            m7: 0
          });
        }
      });
    }

    alert(`✓ ${lines.length} ተማሪዎች ወደ "${selectedClass}" ክፍል በተሳካ ሁኔታ ተመዝግበዋል!`);
    setBatchNamesText('');
    setShowBatchAddModal(false);
  };

  // Export 40-Week Roster to Excel (.xlsx)
  const handleExport40WeeksXLSX = () => {
    const headerRow: (string | number)[] = ['ተ.ቁ', 'የተማሪው ሙሉ ስም', 'ክፍል', 'ፆታ', 'ዕድሜ'];
    for (let w = 1; w <= 40; w++) {
      const d = weekDates?.[w] ? ` (${weekDates[w]})` : '';
      headerRow.push(`ሳምንት ${w}${d}`);
    }
    headerRow.push('የተገኙ', 'የቀሩ', 'ፍቃድ', 'ጠቅላላ የተመዘገበ', 'የመገኘት ምጣኔ (%)');

    const dataRows: (string | number)[][] = [headerRow];

    const rowsToExport = Math.max(TARGET_ROWS_COUNT, classStudents.length);
    for (let idx = 0; idx < rowsToExport; idx++) {
      const s = classStudents[idx];
      if (s) {
        const st = studentStatsMap[s.id] || { present: 0, absent: 0, excused: 0, totalRecorded: 0, rate: 0 };
        const row: (string | number)[] = [
          idx + 1,
          s.name,
          selectedClass,
          s.gender || 'ወ',
          s.age || ''
        ];

        for (let w = 1; w <= 40; w++) {
          const val = currentClassAttendance[s.id]?.[w] || '-';
          const displayVal = val === 'P' ? 'ተ' : val === 'A' ? 'ቀ' : val === 'E' ? 'ፈ' : '-';
          row.push(displayVal);
        }

        row.push(st.present, st.absent, st.excused, st.totalRecorded, `${st.rate}%`);
        dataRows.push(row);
      } else {
        const blankRow: (string | number)[] = [idx + 1, '', selectedClass, '', ''];
        for (let w = 1; w <= 40; w++) blankRow.push('');
        blankRow.push(0, 0, 0, 0, '0%');
        dataRows.push(blankRow);
      }
    }

    downloadXLSX(dataRows, `የሰንበት_ትምህርት_${selectedClass}_የ40_ሳምንት_አቴንዳንስ_${currentYear}.xlsx`, selectedClass);
  };

  // Export 40-Week Roster or Attendance Report to PDF
  const handleExportPDF = () => {
    if (searchStudent) {
      setSearchStudent('');
    }
    setTimeout(() => {
      window.print();
    }, 150);
  };

  // Export 40-Week Roster to CSV
  const handleExport40WeeksCSV = () => {
    let csv = '\uFEFFተ.ቁ,የተማሪው ስም,ክፍል,ፆታ,እድሜ';
    for (let w = 1; w <= 40; w++) {
      const d = weekDates?.[w] ? ` (${weekDates[w]})` : '';
      csv += `,ሳምንት ${w}${d}`;
    }
    csv += ',የተገኙ,የቀሩ,ፍቃድ,ጠቅላላ የተመዘገበ,የመገኘት ምጣኔ (%)\n';

    // Export up to 40 rows
    const rowsToExport = Math.max(TARGET_ROWS_COUNT, classStudents.length);
    for (let idx = 0; idx < rowsToExport; idx++) {
      const s = classStudents[idx];
      if (s) {
        const st = studentStatsMap[s.id] || { present: 0, absent: 0, excused: 0, totalRecorded: 0, rate: 0 };
        const row = [
          idx + 1,
          `"${s.name}"`,
          `"${selectedClass}"`,
          `"${s.gender || 'ወ'}"`,
          `"${s.age || ''}"`
        ];

        for (let w = 1; w <= 40; w++) {
          const val = currentClassAttendance[s.id]?.[w] || '-';
          const displayVal = val === 'P' ? 'ተ' : val === 'A' ? 'ቀ' : val === 'E' ? 'ፈ' : '-';
          row.push(`"${displayVal}"`);
        }

        row.push(st.present, st.absent, st.excused, st.totalRecorded, `"${st.rate}%"`);
        csv += row.join(',') + '\n';
      } else {
        // Blank row placeholder
        const blankRow = [idx + 1, '""', `"${selectedClass}"`, '""', '""'];
        for (let w = 1; w <= 40; w++) blankRow.push('""');
        blankRow.push('0', '0', '0', '0', '"0%"');
        csv += blankRow.join(',') + '\n';
      }
    }

    downloadCSV(csv, `የሰንበት_ትምህርት_${selectedClass}_የ40_ሳምንት_አቴንዳንስ_${currentYear}.csv`);
  };

  // Import 40-Week Roster / Excel file
  const handleImport40WeeksCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const workbookResult = await readExcelOrCSVWorkbook(file);
      if (!workbookResult.sheets || workbookResult.sheets.length === 0) {
        alert('የተመረጠው ፋይል ባዶ ወይም ትክክለኛ የኤክሴል/CSV ፎርማት አይደለም!');
        e.target.value = '';
        return;
      }

      let newStudentsCount = 0;
      let updatedAttendanceCount = 0;

      for (const sheet of workbookResult.sheets) {
        const rows = sheet.rows;
        if (!rows || rows.length <= 1) continue;

        const header = rows[0];
        let nameColIdx = 1;
        let ageColIdx = -1;
        let genderColIdx = -1;

        header.forEach((h, idx) => {
          const hLower = h.toLowerCase();
          if (h.includes('ስም') || hLower.includes('name')) nameColIdx = idx;
          if (h.includes('ዕድሜ') || h.includes('እድሜ') || hLower.includes('age')) ageColIdx = idx;
          if (h.includes('ፆታ') || h.includes('ጾታ') || hLower.includes('gender') || hLower.includes('sex')) genderColIdx = idx;
        });

        const weekColMap: { [week: number]: number } = {};
        header.forEach((h, colIdx) => {
          const match = h.match(/(?:ሳምንት|week)\s*(\d+)/i);
          if (match && match[1]) {
            const wNum = parseInt(match[1], 10);
            if (wNum >= 1 && wNum <= 40) {
              weekColMap[wNum] = colIdx;
            }
          }
        });

        for (let r = 1; r < rows.length; r++) {
          const row = rows[r];
          if (!row || row.length <= nameColIdx) continue;
          const rawName = row[nameColIdx]?.trim();
          if (!rawName) continue;

          const rawGender = genderColIdx >= 0 ? row[genderColIdx]?.trim() : '';
          const { name: cleanName, gender: parsedGender } = parseCleanStudentLine(
            rawName,
            rawGender === 'ሴ' ? 'ሴ' : rawGender === 'ወ' ? 'ወ' : ''
          );

          if (!cleanName) continue;

          const studentAge = ageColIdx >= 0 && row[ageColIdx]?.trim() ? row[ageColIdx].trim() : '12';

          let matchedStudent = classStudents.find(
            (s) => s.name.trim().toLowerCase() === cleanName.toLowerCase()
          );

          // If student is in file but not yet in class, register them into the class roster!
          if (!matchedStudent && onAddStudentToClass) {
            onAddStudentToClass(selectedClass, {
              name: cleanName,
              age: studentAge,
              gender: parsedGender,
              m1: 0, m2: 0, m3: 0, m4: 0, m5: 0, m6: 0, m7: 0
            });
            newStudentsCount++;
          }

          if (matchedStudent) {
            Object.entries(weekColMap).forEach(([wStr, colIdx]) => {
              const w = parseInt(wStr, 10);
              const rawVal = row[colIdx]?.trim().toUpperCase();
              let statusVal: WeeklyAttendanceStatus = '';
              if (rawVal === 'ተ' || rawVal === 'P' || rawVal === 'PRESENT' || rawVal === '1') {
                statusVal = 'P';
              } else if (rawVal === 'ቀ' || rawVal === 'A' || rawVal === 'ABSENT' || rawVal === '0') {
                statusVal = 'A';
              } else if (rawVal === 'ፈ' || rawVal === 'E' || rawVal === 'PERMISSION' || rawVal === 'EXCUSED') {
                statusVal = 'E';
              }

              if (statusVal) {
                onUpdateStudentWeeklyAttendance(currentYear, selectedClass, matchedStudent.id, w, statusVal);
                updatedAttendanceCount++;
              }
            });
          }
        }
      }

      alert(
        `✓ የኤክሴል መረጃ በተሳካ ሁኔታ ተጭኗል!\n• ወደ ክፍል ዝርዝር የተመዘገቡ ተማሪዎች፦ ${newStudentsCount}\n• የተሻሻሉ የአቴንዳንስ ምዝገባዎች፦ ${updatedAttendanceCount}\n(ማስታወሻ፦ የተመዘገቡት ተማሪዎች በሁለቱም በአተንዳንስና በውጤት መሙያው ገጽ ላይ ይገኛሉ)`
      );
    } catch {
      alert('የኤክሴል/CSV ፋይሉን ማንበብ አልተሳካም። እባክዎን ትክክለኛነቱን ያረጋግጡ።');
    }
    e.target.value = '';
  };

  // Filtered absentee list (for absentee slips archive)
  const filteredAbsenteeList = useMemo(() => {
    return attendance.filter((rec) => {
      const matchesDate = !absenteeDateFilter || rec.date === absenteeDateFilter;
      const matchesClass = absenteeClassFilter === 'all' || rec.className === absenteeClassFilter;
      return matchesDate && matchesClass;
    });
  }, [attendance, absenteeDateFilter, absenteeClassFilter]);

  const handleModalAddAbsenteeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalStudentName.trim()) {
      alert('እባክዎን የቀረውን ተማሪ ስም ያስገቡ!');
      return;
    }
    onAddAttendance({
      date: absenteeDateFilter,
      className: modalTargetClass,
      studentName: modalStudentName.trim(),
      gender: modalGender,
      reason: modalReason.trim() || 'ያልታወቀ ምክንያት'
    });
    setModalStudentName('');
    setModalReason('ሕመም / አልመጣም');
    setShowAddAbsenteeModal(false);
  };

  return (
    <div className="space-y-6">
      {/* Printable Sheet Header (Clean, crisp church header for official attendance register) */}
      <div className="hidden print:block text-center pb-3 mb-3 border-b-2 border-slate-900">
        <h1 className="text-xl font-black text-slate-950">የብርብር ከተማ ቃለ ሕይወት ቤተክርስቲያን</h1>
        <h2 className="text-base font-extrabold text-slate-900">
          የልጆች አገልግሎት ዘርፍ - የሰንበት ትምህርት የ40 ሳምንታት የተማሪዎች መገኘት መዝገብ (40 መስመሮች)
        </h2>
        <div className="flex justify-between items-center text-xs mt-2.5 font-bold px-2 text-slate-900">
          <span>የትምህርት ዘመን፦ {currentYear} ዓ.ም</span>
          <span>ክፍል፦ {selectedClass}</span>
          <span>የክፍሉ ተማሪዎች፦ {classStudents.length} / 40 መስመር</span>
          <span>አማካይ የመገኘት ምጣኔ፦ {overallClassStats.avgRate}%</span>
        </div>
        <p className="text-[10px] text-slate-700 mt-1">
          መመሪያ ምልክቶች፦ <strong>ተ = ተገኝቷል (Present)</strong> | <strong>ቀ = ቀርቷል (Absent)</strong> |{' '}
          <strong>ፈ = ፍቃድ (Permission)</strong>
        </p>
      </div>

      {/* View Switcher & Class Selection Bar */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-sm print:hidden">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
          {/* Class and Mode Tabs */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5">
              <Users className="w-4 h-4 text-emerald-600" />
              <label className="text-xs font-bold text-slate-700">ክፍል፦</label>
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="bg-transparent text-xs font-bold text-slate-900 focus:outline-none cursor-pointer"
              >
                {classList.map((c) => (
                  <option key={c} value={c}>
                    {c} ({studentsByClass?.[c]?.length || 0} ተማሪዎች)
                  </option>
                ))}
              </select>
            </div>

            {/* View Mode Buttons */}
            <div className="inline-flex bg-slate-100 p-1 rounded-xl text-xs font-semibold">
              <button
                onClick={() => setActiveView('roster40')}
                className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
                  activeView === 'roster40'
                    ? 'bg-white text-emerald-700 shadow-sm font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                የ40 ሳምንት መዝገብ (40 መስመር)
              </button>

              <button
                onClick={() => setActiveView('weeklyTaker')}
                className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
                  activeView === 'weeklyTaker'
                    ? 'bg-white text-blue-700 shadow-sm font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <CheckSquare className="w-3.5 h-3.5" />
                የሳምንት መመዝገቢያ (Weekly Mode)
              </button>

              <button
                onClick={() => setActiveView('absenteeList')}
                className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
                  activeView === 'absenteeList'
                    ? 'bg-white text-rose-700 shadow-sm font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <UserX className="w-3.5 h-3.5" />
                የቀሪዎች ማህደር (Absence Log)
              </button>
            </div>
          </div>

          {/* Action Tools - Horizontally Scrollable Row (ወደ ጎን) */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1.5 scrollbar-thin max-w-full shrink-0">
            {/* Excel ጫን (High Visibility Front Button) */}
            <label
              className="bg-teal-700 hover:bg-teal-600 text-white text-xs font-bold px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 shadow-md cursor-pointer shrink-0 border border-teal-800"
              title="የ40 ሳምንት አቴንዳንስ ከCSV/ኤክሴል ጫን"
            >
              <Upload className="w-4 h-4 text-teal-200" />
              <span>📥 Excel ጫን</span>
              <input
                type="file"
                accept=".csv,.xlsx,.xls,.txt"
                onChange={handleImport40WeeksCSV}
                className="hidden"
              />
            </label>

            {/* Excel አውርድ */}
            <button
              onClick={handleExport40WeeksXLSX}
              className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-3 py-2 rounded-xl transition flex items-center gap-1.5 shadow-sm cursor-pointer shrink-0"
              title="የተሟላ የ40 ሳምንት መረጃ በኤክሴል (.xlsx) አውርድ"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Excel አውርድ</span>
            </button>

            {/* PDF አውርድ */}
            <button
              onClick={handleExportPDF}
              className="bg-rose-700 hover:bg-rose-600 text-white text-xs font-bold px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 shadow-md cursor-pointer shrink-0 border border-rose-800"
              title="የ40 መስመር አቴንዳንስ መዝገብ በPDF አውርድ / አትም (Save as PDF)"
            >
              <FileText className="w-4 h-4 text-rose-200" />
              <span>📄 PDF አውርድ</span>
            </button>

            {/* Batch Add Button */}
            <button
              onClick={() => setShowBatchAddModal(true)}
              className="bg-indigo-700 hover:bg-indigo-600 text-white text-xs font-semibold px-3 py-2 rounded-xl transition flex items-center gap-1.5 shadow-sm cursor-pointer shrink-0"
              title="የተማሪዎችን ስም ዝርዝር በአንድነት አስገባ (Batch Add / Paste)"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>+ በቡድን አስገባ</span>
            </button>

            {/* Class Age Selector Dropdown in Toolbar */}
            <div
              className="bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-xl px-2.5 py-1.5 transition flex items-center gap-1.5 shadow-xs shrink-0"
              title="የዚህን ክፍል ተማሪዎች በሙሉ አንድ አይነት ዕድሜ (ከ4 እስከ 17) ምረጥ"
            >
              <span className="text-xs font-bold text-emerald-950 whitespace-nowrap">🎂 የክፍሉ ዕድሜ፦</span>
              <select
                onChange={(e) => {
                  if (e.target.value) {
                    handleApplyClassAge(e.target.value);
                    e.target.value = '';
                  }
                }}
                defaultValue=""
                className="bg-white border border-emerald-400 text-emerald-950 font-bold text-xs rounded-lg px-2 py-1 cursor-pointer focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              >
                <option value="" disabled>ለሁሉም ምረጥ (4-17)...</option>
                {Array.from({ length: 14 }, (_, i) => i + 4).map((a) => (
                  <option key={`att_bar_age_${a}`} value={String(a)}>
                    {a} ዓመት
                  </option>
                ))}
              </select>
            </div>

            {/* Print / PDF */}
            <button
              onClick={handleExportPDF}
              className="bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold px-3 py-2 rounded-xl transition flex items-center gap-1.5 shadow-sm cursor-pointer shrink-0"
              title="የ40 መስመር አቴንዳንስ መዝገብ አትም (Print)"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>ማተሚያ (Print)</span>
            </button>

            {/* Clear Class Attendance Button */}
            <button
              onClick={handleClearAllClassAttendance}
              className="bg-amber-700 hover:bg-amber-600 text-white text-xs font-bold px-3 py-2 rounded-xl transition flex items-center gap-1.5 shadow-sm cursor-pointer shrink-0 border border-amber-800"
              title="የዚሁን ክፍል የ40 ሳምንት አቴንዳንስ መዝገብ አጽዳ"
            >
              <RotateCcw className="w-3.5 h-3.5 text-amber-200" />
              <span>አቴንዳንስ አጽዳ</span>
            </button>

            {/* Delete Class Students Button */}
            {onDeleteStudent && (
              <button
                onClick={handleDeleteAllClassStudents}
                className="bg-red-700 hover:bg-red-600 text-white text-xs font-bold px-3 py-2 rounded-xl transition flex items-center gap-1.5 shadow-sm cursor-pointer shrink-0 border border-red-800"
                title="የዚህን ክፍል ተማሪዎች በሙሉ ሰርዝ"
              >
                <Eraser className="w-3.5 h-3.5 text-red-200" />
                <span>ተማሪዎችን ሰርዝ</span>
              </button>
            )}
          </div>
        </div>

        {/* KPI Mini Summary */}
        <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="bg-slate-50 border border-slate-100 rounded-xl p-2.5 flex items-center justify-between">
            <div>
              <p className="text-slate-500 text-[11px] font-medium">በመዝገብ ያሉ ተማሪዎች</p>
              <p className="text-base font-bold text-slate-800">
                {classStudents.length} <span className="text-xs text-slate-400 font-normal">/ 40 መስመር</span>
              </p>
            </div>
            <Users className="w-5 h-5 text-slate-400" />
          </div>

          <div className="bg-emerald-50/70 border border-emerald-100 rounded-xl p-2.5 flex items-center justify-between">
            <div>
              <p className="text-emerald-700 text-[11px] font-medium">አማካይ የመገኘት ምጣኔ</p>
              <p className="text-base font-bold text-emerald-800">{overallClassStats.avgRate}%</p>
            </div>
            <Award className="w-5 h-5 text-emerald-500" />
          </div>

          <div className="bg-blue-50/70 border border-blue-100 rounded-xl p-2.5 flex items-center justify-between">
            <div>
              <p className="text-blue-700 text-[11px] font-medium">የተመረጠው ሳምንት {selectedWeek}</p>
              <p className="text-base font-bold text-blue-800">
                {overallClassStats.thisWeekPresent} የተገኙ / {overallClassStats.thisWeekAbsent} የቀሩ
              </p>
            </div>
            <Clock className="w-5 h-5 text-blue-500" />
          </div>

          <div className="bg-amber-50/70 border border-amber-100 rounded-xl p-2.5 flex items-center justify-between">
            <div>
              <p className="text-amber-700 text-[11px] font-medium">ክፍት መስመሮች</p>
              <p className="text-xs font-bold text-amber-900 truncate">
                {Math.max(0, 40 - classStudents.length)} ባዶ መስመሮች ዝግጁ ናቸው
              </p>
            </div>
            <Calendar className="w-5 h-5 text-amber-500" />
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* VIEW 1: 40-WEEK MASTER GRID (የ40 ሳምንት አጠቃላይ መዝገብ - 40 መስመሮች) */}
      {/* ============================================================== */}
      {activeView === 'roster40' && (
        <div className="space-y-4">
          {/* Sub Toolbar for Grid: Quarter Filter & Quick Search */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200/80 shadow-sm print:hidden">
            {/* Half-Year & Quarter Filter Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              <span className="text-xs font-bold text-slate-500 mr-1 flex items-center gap-1 shrink-0">
                <Layers className="w-3.5 h-3.5 text-emerald-600" /> ክፍለ-ጊዜ፦
              </span>

              {/* Prominent Half-Year (ግማሽ ዓመት) Buttons */}
              <button
                onClick={() => setQuarterFilter('h1')}
                className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition whitespace-nowrap flex items-center gap-1 shrink-0 ${
                  quarterFilter === 'h1'
                    ? 'bg-emerald-700 text-white shadow-md ring-2 ring-emerald-400'
                    : 'bg-emerald-50 text-emerald-950 border border-emerald-300 hover:bg-emerald-100'
                }`}
                title="1ኛ ግማሽ ዓመት (ሳምንት 1 - 20) አቴንዳንስ አሳይ"
              >
                <span>📅 1ኛ ግማሽ ዓመት (1-20)</span>
              </button>

              <button
                onClick={() => setQuarterFilter('h2')}
                className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition whitespace-nowrap flex items-center gap-1 shrink-0 ${
                  quarterFilter === 'h2'
                    ? 'bg-emerald-700 text-white shadow-md ring-2 ring-emerald-400'
                    : 'bg-emerald-50 text-emerald-950 border border-emerald-300 hover:bg-emerald-100'
                }`}
                title="2ኛ ግማሽ ዓመት (ሳምንት 21 - 40) አቴንዳንስ አሳይ"
              >
                <span>📅 2ኛ ግማሽ ዓመት (21-40)</span>
              </button>

              <span className="text-slate-300 font-normal mx-0.5 shrink-0">|</span>

              <button
                onClick={() => setQuarterFilter('all')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition whitespace-nowrap shrink-0 ${
                  quarterFilter === 'all'
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                ሁሉም (1-40)
              </button>
              <button
                onClick={() => setQuarterFilter('q1')}
                className={`px-2 py-1 rounded-lg text-xs font-semibold transition whitespace-nowrap shrink-0 ${
                  quarterFilter === 'q1'
                    ? 'bg-teal-700 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                1ኛ ሩብ (1-10)
              </button>
              <button
                onClick={() => setQuarterFilter('q2')}
                className={`px-2 py-1 rounded-lg text-xs font-semibold transition whitespace-nowrap shrink-0 ${
                  quarterFilter === 'q2'
                    ? 'bg-teal-700 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                2ኛ ሩብ (11-20)
              </button>
              <button
                onClick={() => setQuarterFilter('q3')}
                className={`px-2 py-1 rounded-lg text-xs font-semibold transition whitespace-nowrap shrink-0 ${
                  quarterFilter === 'q3'
                    ? 'bg-teal-700 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                3ኛ ሩብ (21-30)
              </button>
              <button
                onClick={() => setQuarterFilter('q4')}
                className={`px-2 py-1 rounded-lg text-xs font-semibold transition whitespace-nowrap shrink-0 ${
                  quarterFilter === 'q4'
                    ? 'bg-teal-700 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                4ኛ ሩብ (31-40)
              </button>
            </div>

            {/* Student Search */}
            <div className="relative min-w-[200px]">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="ተማሪ በስም ፈልግ..."
                value={searchStudent}
                onChange={(e) => setSearchStudent(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Dedicated Quick Batch Tools Bar for Currently Selected Week */}
          <div className="bg-gradient-to-r from-emerald-900 via-slate-900 to-teal-900 text-white p-3.5 rounded-2xl shadow-md border border-emerald-700/50 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 print:hidden">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-xl border border-white/20">
                <Clock className="w-4 h-4 text-emerald-400" />
                <label className="text-xs font-bold text-emerald-100">የተመረጠው ሳምንት፦</label>
                <select
                  value={selectedWeek}
                  onChange={(e) => {
                    const w = parseInt(e.target.value, 10);
                    setSelectedWeek(w);
                    if (weekDates?.[w]) setCurrentWeekDate(weekDates[w]);
                  }}
                  className="bg-slate-800 text-white text-xs font-extrabold rounded-lg px-2.5 py-1 focus:outline-none focus:ring-2 focus:ring-emerald-400 cursor-pointer"
                >
                  {Array.from({ length: 40 }, (_, i) => i + 1).map((w) => (
                    <option key={`opt_roster_w_${w}`} value={w}>
                      ሳምንት {w} {weekDates?.[w] ? `(${weekDates[w]})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-xl border border-white/20">
                <Calendar className="w-4 h-4 text-amber-300" />
                <label className="text-xs font-bold text-amber-100">ቀን፦</label>
                <input
                  type="date"
                  value={weekDates?.[selectedWeek] || currentWeekDate}
                  onChange={(e) => handleUpdateWeekDate(selectedWeek, e.target.value)}
                  className="bg-slate-800 text-white text-xs font-bold rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => handleMarkAllPresent(selectedWeek)}
                className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 shadow cursor-pointer border border-emerald-400/30"
                title={`በሳምንት ${selectedWeek} ያሉትን ሁሉንም ተማሪዎች "ተገኝቷል (ተ)" አድርግ`}
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-200" />
                <span>✓ ለሁሉም "ተገኝ (P)" ምላ</span>
              </button>

              <button
                type="button"
                onClick={() => handleMarkAllAbsent(selectedWeek)}
                className="bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 shadow cursor-pointer border border-rose-400/30"
                title={`በሳምንት ${selectedWeek} ያሉትን ሁሉንም ተማሪዎች "ቀርቷል (ቀ)" አድርግ`}
              >
                <XCircle className="w-3.5 h-3.5 text-rose-200" />
                <span>❌ ለሁሉም "ቀርቷል (A)" ምላ</span>
              </button>

              <button
                type="button"
                onClick={() => handleClearWeek(selectedWeek)}
                className="bg-slate-700 hover:bg-slate-600 text-slate-100 text-xs font-bold px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 cursor-pointer border border-slate-500/40"
                title={`የሳምንት ${selectedWeek} ምዝገባ አጽዳ`}
              >
                <Trash2 className="w-3.5 h-3.5 text-slate-300" />
                <span>🔄 ሳምንቱን አጽዳ</span>
              </button>
            </div>
          </div>

          {/* Quick Instruction Banner with Keyboard Shortcuts */}
          <div className="bg-blue-50/90 border border-blue-200/90 rounded-xl px-4 py-2.5 text-xs text-blue-950 flex flex-wrap items-center justify-between gap-2 print:hidden shadow-xs">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-blue-700 shrink-0" />
              <span>
                <strong>የኪቦርድ ውጤት መሙያ መመሪያ፦</strong> ሳጥኑ ላይ ሆነው <strong>1</strong> (ተገኝ/P) | <strong>0</strong> (ቀርቷል/A) | <strong>2</strong> (ፍቃድ/E) | <strong>Backspace/Space</strong> (አጽዳ) ሲጫኑ በራሱ ወደ ታች ይወርዳል። በኪቦርድ ቀስቶች (<strong>↑ ↓ → ←</strong>) እና <strong>Enter</strong> ቀጥታ አሳሽ።
              </span>
            </div>
            <div className="text-[11px] font-extrabold text-blue-900 bg-blue-100/80 px-2.5 py-0.5 rounded-lg border border-blue-300">
              40 መስመሮች • 40 ሳምንታት
            </div>
          </div>

          {/* Master 40-Week Grid Table with 40 Rows */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden print:border-slate-900 print:rounded-none print:overflow-visible">
            <div className="overflow-x-auto max-h-[750px] relative print:max-h-none print:overflow-visible">
              <table className="w-full min-w-[1300px] border-collapse text-xs text-center border-spacing-0 print:min-w-full print:text-[10px]">
                <thead>
                  {/* Primary Headers */}
                  <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-200 sticky top-0 z-30 shadow-xs print:static print:bg-slate-200 print:border-slate-900">
                    <th className="py-2.5 px-2 border-r border-slate-200 w-12 sticky left-0 bg-slate-100 z-40 print:static print:bg-slate-200 print:border-slate-900 text-center">
                      ተ.ቁ
                    </th>
                    <th className="py-2.5 px-3 border-r border-slate-200 min-w-[240px] text-left text-[12pt] font-extrabold text-slate-900 sticky left-[48px] bg-slate-100 z-40 print:static print:bg-slate-200 print:border-slate-900">
                      የተማሪው ሙሉ ስም (12pt)
                    </th>
                    <th className="py-2 px-1 border-r border-slate-200 min-w-[65px] sticky left-[288px] bg-slate-100 z-40 print:static print:bg-slate-200 print:border-slate-900">
                      <div className="flex flex-col items-center justify-center gap-0.5">
                        <span>ዕድሜ</span>
                        {classStudents.length > 0 && (
                          <select
                            onChange={(e) => {
                              if (e.target.value) {
                                handleApplyClassAge(e.target.value);
                                e.target.value = '';
                              }
                            }}
                            defaultValue=""
                            className="text-[9px] bg-white border border-slate-300 rounded px-1 py-0.2 font-bold text-slate-700 cursor-pointer print:hidden hover:border-emerald-500 shadow-xs"
                            title="ለክፍሉ ተማሪዎች በሙሉ አንድ አይነት ዕድሜ ምረጥ"
                          >
                            <option value="" disabled>ለሁሉም ▾</option>
                            {Array.from({ length: 14 }, (_, i) => i + 4).map((a) => (
                              <option key={`att_head_age_${a}`} value={String(a)}>
                                {a}
                              </option>
                            ))}
                          </select>
                        )}
                      </div>
                    </th>
                    <th className="py-2.5 px-2 border-r border-slate-200 w-14 sticky left-[353px] bg-slate-100 z-40 print:static print:bg-slate-200 print:border-slate-900 text-center">
                      ፆታ
                    </th>

                    {/* Weeks Columns 1 to 40 */}
                    {displayedWeeks.map((w) => {
                      const hasDate = weekDates?.[w];
                      return (
                        <th
                          key={`th_week_${w}`}
                          onClick={() => {
                            setSelectedWeek(w);
                            setActiveWeekMenu(activeWeekMenu === w ? null : w);
                          }}
                          className={`py-2 px-0.5 border-r border-slate-200 min-w-[34px] text-[11px] cursor-pointer hover:bg-emerald-50 transition relative print:border-slate-900 print:min-w-[20px] print:text-[9px] ${
                            selectedWeek === w ? 'bg-emerald-100/90 text-emerald-950 font-black' : ''
                          }`}
                          title={`ሳምንት ${w}${hasDate ? ` (${hasDate})` : ''} - አማራጮችን ለማየት ጠቅ ያድርጉ`}
                        >
                          <div>ሳ{w}</div>
                          {hasDate ? (
                            <div className="text-[8px] font-normal text-slate-500 truncate max-w-[36px] print:hidden">
                              {hasDate.substring(5)}
                            </div>
                          ) : (
                            <div className="text-[8px] font-normal text-slate-400 print:hidden">እሁድ</div>
                          )}
                        </th>
                      );
                    })}

                    {/* Calculated Summary Headers */}
                    <th className="py-2.5 px-2 border-r border-slate-200 bg-emerald-50 text-emerald-900 w-12 font-bold print:border-slate-900">
                      ተገኝ
                    </th>
                    <th className="py-2.5 px-2 border-r border-slate-200 bg-rose-50 text-rose-900 w-12 font-bold print:border-slate-900">
                      ቀሪ
                    </th>
                    <th className="py-2.5 px-2 border-r border-slate-200 bg-amber-50 text-amber-900 w-12 font-bold print:border-slate-900">
                      ፍቃድ
                    </th>
                    <th className="py-2.5 px-2.5 bg-blue-50 text-blue-900 min-w-[55px] font-bold print:border-slate-900">
                      %
                    </th>
                    <th className="py-2.5 px-2 bg-slate-100 text-slate-700 w-12 font-bold print:hidden">
                      ተግባር
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-200 print:divide-slate-900">
                  {Array.from({ length: totalDisplayRows }, (_, rowIndex) => {
                    const activeStudentList = isPrinting ? classStudents : filteredClassStudents;
                    const student = activeStudentList[rowIndex];
                    const isRegistered = !!student;
                    const rowNumber = rowIndex + 1;

                    if (isRegistered) {
                      const st = studentStatsMap[student.id] || {
                        present: 0,
                        absent: 0,
                        excused: 0,
                        totalRecorded: 0,
                        rate: 0
                      };

                      return (
                        <tr
                          key={`s_row_${student.id}_${rowIndex}`}
                          className="hover:bg-slate-50/80 transition group print:border-b print:border-slate-400"
                        >
                          {/* Row Number (Sticky) */}
                          <td className="py-2 px-2 border-r border-slate-200 text-slate-600 font-bold sticky left-0 bg-white group-hover:bg-slate-50 z-20 print:static print:border-slate-900 w-12 text-center">
                            {rowNumber}
                          </td>

                          {/* Student Name (Sticky - 240px wide, 12pt font, NO TRUNCATE so names are not squeezed) */}
                          <td className="py-2 px-3 border-r border-slate-200 text-left font-bold text-slate-900 sticky left-[48px] bg-white group-hover:bg-slate-50 z-20 min-w-[240px] print:static print:border-slate-900">
                            {onUpdateStudent ? (
                              <input
                                type="text"
                                value={student.name}
                                onChange={(e) => handleStudentInfoChange(student, 'name', e.target.value)}
                                className="w-full bg-transparent border-b border-transparent hover:border-slate-300 focus:border-emerald-600 focus:bg-white px-1 py-0.5 rounded text-[12pt] outline-none font-bold text-slate-900 leading-normal"
                              />
                            ) : (
                              <span className="text-[12pt] font-bold text-slate-900 leading-normal">{student.name}</span>
                            )}
                          </td>

                          {/* Age (Sticky) */}
                          <td className="py-2 px-1 border-r border-slate-200 text-slate-700 font-semibold sticky left-[288px] bg-white group-hover:bg-slate-50 z-20 min-w-[65px] print:static print:border-slate-900 text-center">
                            {onUpdateStudent ? (
                              <select
                                value={student.age || ''}
                                onChange={(e) => handleStudentInfoChange(student, 'age', e.target.value)}
                                className="bg-transparent border-b border-transparent hover:border-slate-300 focus:border-emerald-600 rounded px-0.5 py-0.5 text-xs outline-none font-bold text-slate-800 text-center cursor-pointer"
                              >
                                <option value="">-</option>
                                {Array.from({ length: 14 }, (_, i) => i + 4).map((a) => (
                                  <option key={`att_opt_age_${a}`} value={String(a)}>
                                    {a}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <span>{student.age || '-'}</span>
                            )}
                          </td>

                          {/* Gender (Sticky) */}
                          <td className="py-2 px-2 border-r border-slate-200 sticky left-[353px] bg-white group-hover:bg-slate-50 z-20 w-14 print:static print:border-slate-900 text-center">
                            {onUpdateStudent ? (
                              <select
                                value={student.gender || ''}
                                onChange={(e) => handleStudentInfoChange(student, 'gender', e.target.value)}
                                className="bg-transparent border-b border-transparent hover:border-slate-300 focus:border-emerald-600 rounded px-0.5 py-0.5 text-xs outline-none font-bold text-slate-800"
                              >
                                <option value="ወ">ወንድ (ወ)</option>
                                <option value="ሴ">ሴት (ሴ)</option>
                                <option value="">-</option>
                              </select>
                            ) : (
                              <span
                                className={`font-bold ${
                                  student.gender === 'ወ'
                                    ? 'text-blue-600'
                                    : student.gender === 'ሴ'
                                    ? 'text-rose-600'
                                    : 'text-slate-400'
                                }`}
                              >
                                {student.gender === 'ወ' ? 'ወ' : student.gender === 'ሴ' ? 'ሴ' : '-'}
                              </span>
                            )}
                          </td>

                          {/* 40 Week Attendance Input Cells (Cell-by-Cell Score Entry Style) */}
                          {displayedWeeks.map((w, wIndex) => {
                            const val = currentClassAttendance[student.id]?.[w] || '';
                            const displayVal = val === 'P' ? 'ተ' : val === 'A' ? 'ቀ' : val === 'E' ? 'ፈ' : '';
                            return (
                              <td
                                key={`cell_${student.id}_${w}`}
                                className={`py-1 px-0.5 border-r border-slate-200 text-center font-bold transition select-none print:border-slate-900 ${
                                  selectedWeek === w ? 'bg-emerald-50/70' : ''
                                }`}
                              >
                                <input
                                  id={`att-cell-input-${rowIndex}-${wIndex}`}
                                  type="text"
                                  value={displayVal}
                                  onChange={() => {}}
                                  onKeyDown={(e) => handleAttendanceKeyDown(e, rowIndex, wIndex, student.id, w)}
                                  onClick={() => handleCycleStatus(student.id, w)}
                                  onFocus={(e) => {
                                    e.target.select();
                                    setSelectedWeek(w);
                                  }}
                                  className={`w-6 h-6 text-center rounded font-black text-[10px] cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white print:border-none print:bg-transparent ${
                                    val === 'P'
                                      ? 'bg-emerald-600 text-white'
                                      : val === 'A'
                                      ? 'bg-rose-600 text-white'
                                      : val === 'E'
                                      ? 'bg-amber-500 text-white'
                                      : 'text-slate-300 hover:bg-slate-100 bg-transparent'
                                  }`}
                                  placeholder="-"
                                  title={`${student.name} - ሳምንት ${w}: 1=ተ፣ 0=ቀ፣ 2=ፈ (ጠቅ ያድርጉ ወይም በኪቦርድ ይሙሉ)`}
                                />
                              </td>
                            );
                          })}

                          {/* Total Present */}
                          <td className="py-2 px-1 border-r border-slate-200 bg-emerald-50/30 text-emerald-800 font-bold print:border-slate-900">
                            {st.present}
                          </td>

                          {/* Total Absent */}
                          <td className="py-2 px-1 border-r border-slate-200 bg-rose-50/30 text-rose-800 font-bold print:border-slate-900">
                            {st.absent}
                          </td>

                          {/* Total Excused */}
                          <td className="py-2 px-1 border-r border-slate-200 bg-amber-50/30 text-amber-800 font-bold print:border-slate-900">
                            {st.excused}
                          </td>

                          {/* Rate % */}
                          <td className="py-2 px-1 bg-blue-50/40 print:border-slate-900">
                            <span
                              className={`font-black inline-block px-1 py-0.5 rounded text-[10px] ${
                                st.rate >= 80
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : st.rate >= 50
                                  ? 'bg-blue-100 text-blue-800'
                                  : st.totalRecorded > 0
                                  ? 'bg-rose-100 text-rose-800'
                                  : 'text-slate-400'
                              }`}
                            >
                              {st.totalRecorded > 0 ? `${st.rate}%` : '-'}
                            </span>
                          </td>

                          {/* Action (Delete Student) */}
                          <td className="py-2 px-1 text-center print:hidden">
                            {onDeleteStudent && (
                              <button
                                type="button"
                                onClick={() => {
                                  if (confirm(`"${student.name}" ከተማሪዎች ዝርዝር ውስጥ ይደለታል?`)) {
                                    onDeleteStudent(student.id);
                                  }
                                }}
                                className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                                title={`${student.name} ሰርዝ`}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    }

                    // Blank / Fillable Row (for rows up to 40)
                    return (
                      <tr
                        key={`blank_row_${rowIndex}`}
                        className="bg-slate-50/40 hover:bg-slate-100/60 transition group print:bg-white print:border-b print:border-slate-300"
                      >
                        {/* Row Index */}
                        <td className="py-2 px-2 border-r border-slate-200 text-slate-400 font-semibold sticky left-0 bg-white group-hover:bg-slate-100 z-20 print:static print:text-slate-700 print:border-slate-900 w-12 text-center">
                          {rowNumber}
                        </td>

                        {/* Name Cell: Interactive inline editor or print blank writing line */}
                        <td className="py-1.5 px-3 border-r border-slate-200 text-left sticky left-[48px] bg-white group-hover:bg-slate-100 z-20 min-w-[240px] print:static print:border-slate-900">
                          {editingRowIndex === rowIndex ? (
                            <div className="flex items-center gap-1.5 py-0.5 print:hidden">
                              <input
                                type="text"
                                placeholder={`የተማሪ ሙሉ ስም (መስመር ${rowNumber})...`}
                                value={inlineStudentName}
                                onChange={(e) => setInlineStudentName(e.target.value)}
                                autoFocus
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleSaveInlineStudent(rowIndex);
                                  else if (e.key === 'Escape') setEditingRowIndex(null);
                                }}
                                className="px-2.5 py-1.5 text-[12pt] font-bold border border-emerald-400 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 w-full text-slate-900"
                              />
                              <select
                                value={inlineStudentGender}
                                onChange={(e) => setInlineStudentGender(e.target.value as 'ወ' | 'ሴ' | '')}
                                className="px-1.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white font-bold"
                              >
                                <option value="ወ">ወንድ (ወ)</option>
                                <option value="ሴ">ሴት (ሴ)</option>
                                <option value="">-</option>
                              </select>
                              <button
                                type="button"
                                onClick={() => handleSaveInlineStudent(rowIndex)}
                                className="bg-emerald-600 hover:bg-emerald-500 text-white p-1.5 rounded-lg shadow-xs"
                                title="አስገባ / መዝግብ"
                              >
                                <Check className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <div>
                              <div
                                onClick={() => {
                                  setEditingRowIndex(rowIndex);
                                  setInlineStudentName('');
                                }}
                                className="cursor-pointer text-slate-400 hover:text-emerald-700 text-[12pt] font-medium italic flex items-center gap-1.5 select-none print:hidden"
                                title="ተማሪ ለመመዝገብ ጠቅ ያድርጉ"
                              >
                                <Plus className="w-3.5 h-3.5 text-slate-400" />
                                <span>መስመር {rowNumber}፦ + ተማሪ ስም ጻፍ</span>
                              </div>
                              {/* Clean dotted line for handwritten printout */}
                              <div className="hidden print:block text-slate-400 text-[10px]">
                                .....................................................
                              </div>
                            </div>
                          )}
                        </td>

                        {/* Age */}
                        <td className="py-2 px-1 border-r border-slate-200 sticky left-[288px] bg-white group-hover:bg-slate-100 z-20 text-slate-300 min-w-[65px] print:static print:border-slate-900 text-center">
                          -
                        </td>

                        {/* Gender */}
                        <td className="py-2 px-2 border-r border-slate-200 sticky left-[353px] bg-white group-hover:bg-slate-100 z-20 text-slate-300 w-14 print:static print:border-slate-900 text-center">
                          -
                        </td>

                        {/* Week Cells (Empty) */}
                        {displayedWeeks.map((w) => (
                          <td
                            key={`blank_cell_${rowIndex}_${w}`}
                            className="py-1 px-0.5 border-r border-slate-200 text-slate-200 print:border-slate-900"
                          >
                            <span className="print:hidden">·</span>
                          </td>
                        ))}

                        <td className="py-2 px-1 border-r border-slate-200 bg-emerald-50/10 text-slate-300 print:border-slate-900">
                          -
                        </td>
                        <td className="py-2 px-1 border-r border-slate-200 bg-rose-50/10 text-slate-300 print:border-slate-900">
                          -
                        </td>
                        <td className="py-2 px-1 border-r border-slate-200 bg-amber-50/10 text-slate-300 print:border-slate-900">
                          -
                        </td>
                        <td className="py-2 px-1 bg-blue-50/10 text-slate-300 print:border-slate-900">
                          -
                        </td>
                        <td className="py-2 px-1 text-center print:hidden">
                          <span className="text-slate-300">-</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>

                {/* Table Footer: Weekly Totals Across Whole Class (Appears at end of table) */}
                <tfoot className="bg-slate-100 font-bold border-t-2 border-slate-300 text-slate-800 sticky bottom-0 z-20 print:static print:border-slate-900 print:table-row-group">
                  {/* Row 1: Present count */}
                  <tr className="bg-emerald-50/50 print:bg-slate-100">
                    <td
                      colSpan={4}
                      className="py-2 px-3 border-r border-slate-300 text-left sticky left-0 bg-slate-100 z-30 text-emerald-800 print:static print:border-slate-900 font-black"
                    >
                      ጠቅላላ የተገኙ (Present)
                    </td>
                    {displayedWeeks.map((w) => (
                      <td
                        key={`foot_p_${w}`}
                        className="py-1.5 px-0.5 border-r border-slate-300 text-emerald-700 font-black text-[11px] print:border-slate-900 print:text-[9px]"
                      >
                        {weeklyColumnSummary[w]?.present || 0}
                      </td>
                    ))}
                    <td colSpan={4} className="bg-slate-100 print:border-slate-900"></td>
                  </tr>

                  {/* Row 2: Absent count */}
                  <tr className="bg-rose-50/50 print:bg-slate-100">
                    <td
                      colSpan={4}
                      className="py-2 px-3 border-r border-slate-300 text-left sticky left-0 bg-slate-100 z-30 text-rose-800 print:static print:border-slate-900 font-black"
                    >
                      ጠቅላላ የቀሩ (Absent)
                    </td>
                    {displayedWeeks.map((w) => (
                      <td
                        key={`foot_a_${w}`}
                        className="py-1.5 px-0.5 border-r border-slate-300 text-rose-700 font-black text-[11px] print:border-slate-900 print:text-[9px]"
                      >
                        {weeklyColumnSummary[w]?.absent || 0}
                      </td>
                    ))}
                    <td colSpan={4} className="bg-slate-100 print:border-slate-900"></td>
                  </tr>

                  {/* Row 3: Class Attendance Rate % */}
                  <tr className="bg-slate-200 text-slate-900 border-t border-slate-300 print:border-slate-900">
                    <td
                      colSpan={4}
                      className="py-2 px-3 border-r border-slate-300 text-left sticky left-0 bg-slate-200 z-30 font-black text-blue-900 print:static print:border-slate-900"
                    >
                      የሳምንቱ አማካይ %
                    </td>
                    {displayedWeeks.map((w) => {
                      const r = weeklyColumnSummary[w]?.rate || 0;
                      return (
                        <td
                          key={`foot_r_${w}`}
                          className="py-2 px-0.5 border-r border-slate-300 text-[10px] font-black print:border-slate-900 print:text-[8px]"
                        >
                          {r > 0 ? `${r}%` : '-'}
                        </td>
                      );
                    })}
                    <td
                      colSpan={4}
                      className="py-2 px-2 text-center text-xs font-black text-emerald-900 bg-emerald-100 print:border-slate-900"
                    >
                      ዓመታዊ፦ {overallClassStats.avgRate}%
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Quick Week Controls Modal / Popover */}
          {activeWeekMenu !== null && (
            <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-emerald-600" />
                    የሳምንት {activeWeekMenu} ፈጣን ተግባራት
                  </h3>
                  <button
                    onClick={() => setActiveWeekMenu(null)}
                    className="text-slate-400 hover:text-slate-600 p-1"
                  >
                    &times;
                  </button>
                </div>

                <div className="py-4 space-y-4 text-xs">
                  {/* Date setting */}
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">
                      የዚህ ሰንበት ቀን (Date)፦
                    </label>
                    <input
                      type="date"
                      value={weekDates?.[activeWeekMenu] || currentWeekDate}
                      onChange={(e) => handleUpdateWeekDate(activeWeekMenu, e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                    />
                  </div>

                  {/* Bulk Actions */}
                  <div className="space-y-2 pt-2 border-t border-slate-100">
                    <p className="text-slate-500 font-semibold text-[11px]">ፈጣን ምዝገባ፦</p>
                    <button
                      onClick={() => {
                        handleMarkAllPresent(activeWeekMenu);
                        setActiveWeekMenu(null);
                      }}
                      className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 rounded-xl transition flex items-center justify-center gap-1.5 shadow-sm"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      ሁሉንም ተማሪዎች ተገኝተዋል (ተ) አድርግ
                    </button>

                    <button
                      onClick={() => {
                        handleMarkAllAbsent(activeWeekMenu);
                        setActiveWeekMenu(null);
                      }}
                      className="w-full bg-rose-600 hover:bg-rose-500 text-white font-bold py-2 rounded-xl transition flex items-center justify-center gap-1.5 shadow-sm"
                    >
                      <XCircle className="w-4 h-4" />
                      ሁሉንም ተማሪዎች ቀርተዋል (ቀ) አድርግ
                    </button>

                    <button
                      onClick={() => {
                        handleClearWeek(activeWeekMenu);
                        setActiveWeekMenu(null);
                      }}
                      className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2 rounded-xl transition flex items-center justify-center gap-1.5"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      የዚህን ሳምንት ምዝገባ አፅዳ
                    </button>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 flex justify-end">
                  <button
                    onClick={() => setActiveWeekMenu(null)}
                    className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs"
                  >
                    ዝጋ
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Printable Bottom Summary & Signature Section (print only - at the very end of PDF) */}
          <div className="hidden print:block pt-6 mt-6 border-t-2 border-slate-900 text-xs font-bold text-slate-900">
            <div className="bg-slate-100 p-3 rounded-lg border border-slate-800 mb-6 flex justify-between items-center text-xs font-black">
              <span>ክፍል፦ {selectedClass}</span>
              <span>በመዝገብ ያሉ ተማሪዎች፦ {classStudents.length} / 40</span>
              <span>የክፍሉ ዓመታዊ የመገኘት ምጣኔ፦ {overallClassStats.avgRate}%</span>
            </div>

            <div className="grid grid-cols-2 gap-12 pt-2">
              <div>
                <p>የመማሪያ ክፍል መምህር ስም፦ _______________________</p>
                <p className="mt-3">ፊርማ፦ _______________________ ቀን፦ ____________</p>
              </div>
              <div className="text-right">
                <p>የሰንበት ት/ቤት አስተባባሪ ስም፦ _______________________</p>
                <p className="mt-3">ፊርማ፦ _______________________ ቀን፦ ____________</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* VIEW 2: WEEKLY ATTENDANCE TAKER (የሳምንት መመዝገቢያ)              */}
      {/* ============================================================== */}
      {activeView === 'weeklyTaker' && (
        <div className="space-y-4">
          {/* Week Selector Bar */}
          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-3">
                {/* Week Selector Dropdown */}
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-blue-600" />
                  <label className="text-xs font-bold text-slate-700">ሳምንት፦</label>
                  <select
                    value={selectedWeek}
                    onChange={(e) => {
                      const newW = parseInt(e.target.value, 10);
                      setSelectedWeek(newW);
                      if (weekDates?.[newW]) {
                        setCurrentWeekDate(weekDates[newW]);
                      }
                    }}
                    className="bg-slate-50 border border-slate-300 text-slate-800 text-xs font-bold rounded-xl px-3 py-2 focus:ring-2 focus:ring-blue-600 focus:outline-none cursor-pointer"
                  >
                    {Array.from({ length: 40 }, (_, i) => i + 1).map((w) => (
                      <option key={`opt_w_${w}`} value={w}>
                        ሳምንት {w} {weekDates?.[w] ? `(${weekDates[w]})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Sunday Date Picker */}
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-emerald-600" />
                  <label className="text-xs font-bold text-slate-700">የሰንበት ቀን፦</label>
                  <input
                    type="date"
                    value={weekDates?.[selectedWeek] || currentWeekDate}
                    onChange={(e) => handleUpdateWeekDate(selectedWeek, e.target.value)}
                    className="bg-slate-50 border border-slate-300 text-slate-800 text-xs font-bold rounded-xl px-3 py-2 focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                  />
                </div>
              </div>

              {/* Fast 1-Click Action Buttons */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={handleExportPDF}
                  className="bg-rose-700 hover:bg-rose-600 text-white text-xs font-bold px-3 py-2 rounded-xl transition flex items-center gap-1.5 shadow-sm cursor-pointer border border-rose-800"
                  title="የሳምንቱ አቴንዳንስ በPDF አውርድ / አትም"
                >
                  <FileText className="w-3.5 h-3.5 text-rose-200" />
                  <span>📄 PDF አውርድ</span>
                </button>

                <button
                  onClick={() => setShowBatchAddModal(true)}
                  className="bg-indigo-700 hover:bg-indigo-600 text-white text-xs font-bold px-3 py-2 rounded-xl transition flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  + ተማሪ ጨምር
                </button>

                <button
                  onClick={() => handleMarkAllPresent(selectedWeek)}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 shadow-sm"
                  title="በዚህ ክፍል ያሉትን ሁሉንም ተማሪዎች በአንድ ጊዜ ተገኝተዋል አድርግ"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  ሁሉንም ተገኝተዋል አድርግ
                </button>

                <button
                  onClick={() => handleMarkAllAbsent(selectedWeek)}
                  className="bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold px-3 py-2 rounded-xl transition flex items-center gap-1.5 shadow-sm"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  ሁሉንም ቀርተዋል አድርግ
                </button>

                <button
                  onClick={() => handleClearWeek(selectedWeek)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold px-3 py-2 rounded-xl transition flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  አፅዳ
                </button>
              </div>
            </div>

            {/* Week Progress Status Strip */}
            <div className="flex items-center justify-between text-xs pt-3 border-t border-slate-100">
              <span className="text-slate-600">
                የሳምንት <strong className="text-slate-900 font-bold">{selectedWeek}</strong> አጠቃላይ ሁኔታ፦{' '}
                <span className="text-emerald-700 font-bold ml-1">
                  {overallClassStats.thisWeekPresent} የተገኙ
                </span>{' '}
                |{' '}
                <span className="text-rose-700 font-bold">
                  {overallClassStats.thisWeekAbsent} የቀሩ
                </span>{' '}
                |{' '}
                <span className="text-amber-700 font-bold">
                  {overallClassStats.thisWeekExcused} ፍቃድ
                </span>
              </span>
              <span className="text-slate-500 font-medium">
                የክፍል ተማሪዎች፦ {classStudents.length} / 40 መስመር
              </span>
            </div>
          </div>

          {/* Student Cards Grid for Fast Marking */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {classStudents.length === 0 ? (
              <div className="col-span-full py-12 text-center text-slate-500 bg-white rounded-2xl border border-slate-200 space-y-3">
                <p>በዚህ ክፍል እስካሁን ተማሪዎች አልተመዘገቡም።</p>
                <button
                  onClick={() => setShowBatchAddModal(true)}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold inline-flex items-center gap-2"
                >
                  <UserPlus className="w-4 h-4" />
                  + ተማሪዎችን በአንድነት አስገባ (Batch Add)
                </button>
              </div>
            ) : (
              classStudents.map((student, idx) => {
                const currentStatus = currentClassAttendance[student.id]?.[selectedWeek] || '';
                return (
                  <div
                    key={`card_st_${student.id}_${idx}`}
                    className={`bg-white rounded-2xl p-4 border transition shadow-xs flex flex-col justify-between gap-3 ${
                      currentStatus === 'P'
                        ? 'border-emerald-300 ring-1 ring-emerald-200 bg-emerald-50/20'
                        : currentStatus === 'A'
                        ? 'border-rose-300 ring-1 ring-rose-200 bg-rose-50/20'
                        : currentStatus === 'E'
                        ? 'border-amber-300 ring-1 ring-amber-200 bg-amber-50/20'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <span className="w-6 h-6 rounded-lg bg-slate-100 text-slate-600 font-bold text-xs flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <div>
                          <h4 className="font-bold text-slate-900 text-xs">{student.name}</h4>
                          <span
                            className={`text-[11px] font-semibold ${
                              student.gender === 'ወ'
                                ? 'text-blue-600'
                                : student.gender === 'ሴ'
                                ? 'text-rose-600'
                                : 'text-slate-400'
                            }`}
                          >
                            {student.gender === 'ወ' ? 'ወንድ' : student.gender === 'ሴ' ? 'ሴት' : '-'}
                            {student.age ? ` • ${student.age} ዓመት` : ''}
                          </span>
                        </div>
                      </div>

                      {/* Current Status Indicator Badge & Delete Button */}
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`text-xs font-black px-2 py-0.5 rounded-lg ${
                            currentStatus === 'P'
                              ? 'bg-emerald-600 text-white'
                              : currentStatus === 'A'
                              ? 'bg-rose-600 text-white'
                              : currentStatus === 'E'
                              ? 'bg-amber-500 text-white'
                              : 'bg-slate-100 text-slate-400'
                          }`}
                        >
                          {currentStatus === 'P'
                            ? 'ተገኝቷል'
                            : currentStatus === 'A'
                            ? 'ቀርቷል'
                            : currentStatus === 'E'
                            ? 'ፍቃድ'
                            : 'ያልተመዘገበ'}
                        </span>
                        {onDeleteStudent && (
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm(`"${student.name}" ከተማሪዎች ዝርዝር ውስጥ ይደለታል?`)) {
                                onDeleteStudent(student.id);
                              }
                            }}
                            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                            title={`${student.name} ሰርዝ`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Toggle Buttons */}
                    <div className="grid grid-cols-4 gap-1.5 text-xs font-bold pt-1">
                      <button
                        onClick={() =>
                          handleSetStudentStatus(student.id, 'P', student.name, student.gender)
                        }
                        className={`py-1.5 rounded-xl transition flex items-center justify-center gap-1 ${
                          currentStatus === 'P'
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700'
                        }`}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        ተ
                      </button>

                      <button
                        onClick={() =>
                          handleSetStudentStatus(student.id, 'A', student.name, student.gender)
                        }
                        className={`py-1.5 rounded-xl transition flex items-center justify-center gap-1 ${
                          currentStatus === 'A'
                            ? 'bg-rose-600 text-white shadow-xs'
                            : 'bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-700'
                        }`}
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        ቀ
                      </button>

                      <button
                        onClick={() =>
                          handleSetStudentStatus(student.id, 'E', student.name, student.gender)
                        }
                        className={`py-1.5 rounded-xl transition flex items-center justify-center gap-1 ${
                          currentStatus === 'E'
                            ? 'bg-amber-500 text-white shadow-xs'
                            : 'bg-slate-100 hover:bg-amber-50 text-slate-700 hover:text-amber-700'
                        }`}
                      >
                        <HelpCircle className="w-3.5 h-3.5" />
                        ፈ
                      </button>

                      <button
                        onClick={() => handleSetStudentStatus(student.id, '')}
                        className={`py-1.5 rounded-xl transition text-slate-400 hover:text-slate-700 bg-slate-50 hover:bg-slate-100`}
                        title="አጽዳ"
                      >
                        -
                      </button>
                    </div>

                    {/* Inline reason field if Absent or Excused */}
                    {(currentStatus === 'A' || currentStatus === 'E') && (
                      <div className="mt-1">
                        <input
                          type="text"
                          placeholder="ምክንያት አስገባ (ለምሳሌ፡ ሕመም፣ ጉዞ)..."
                          value={quickAbsentReasons[student.id] || ''}
                          onChange={(e) =>
                            setQuickAbsentReasons({
                              ...quickAbsentReasons,
                              [student.id]: e.target.value
                            })
                          }
                          className="w-full px-2.5 py-1 text-[11px] bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-400"
                        />
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* VIEW 3: ABSENTEE RECORD LOG (የቀሪዎችና ፍቃድ ማህደር)               */}
      {/* ============================================================== */}
      {activeView === 'absenteeList' && (
        <div className="space-y-4">
          {/* Controls Bar for Absentee Archive */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-600" />
                <label className="text-xs font-semibold text-slate-600">ቀን፦</label>
                <input
                  type="date"
                  value={absenteeDateFilter}
                  onChange={(e) => setAbsenteeDateFilter(e.target.value)}
                  className="bg-slate-50 border border-slate-300 text-slate-800 text-xs font-semibold rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-slate-400" />
                <label className="text-xs font-semibold text-slate-600">ክፍል፦</label>
                <select
                  value={absenteeClassFilter}
                  onChange={(e) => setAbsenteeClassFilter(e.target.value)}
                  className="bg-slate-50 border border-slate-300 text-slate-800 text-xs font-semibold rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                  <option value="all">ሁሉም ክፍሎች ({classList.length})</option>
                  {classList.map((c) => (
                    <option key={`opt_abs_${c}`} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleExportPDF}
                className="bg-rose-700 hover:bg-rose-600 text-white text-xs font-bold px-3 py-2 rounded-xl transition flex items-center gap-1.5 shadow-sm cursor-pointer border border-rose-800"
                title="የቀሪዎች ማህደር በPDF አውርድ / አትም"
              >
                <FileText className="w-3.5 h-3.5 text-rose-200" />
                <span>📄 PDF አውርድ</span>
              </button>

              <button
                onClick={() => setShowAddAbsenteeModal(true)}
                className="bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 shadow-sm"
              >
                <UserX className="w-3.5 h-3.5" />
                + የቀረ ተማሪ መዝግብ
              </button>
            </div>
          </div>

          {/* Table of Absentee Slips */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden print:border-none print:shadow-none print:overflow-visible">
            <div className="overflow-x-auto print:overflow-visible">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 uppercase tracking-wider text-center">
                    <th className="py-3 px-3 border-r border-slate-200 w-12">ተ.ቁ</th>
                    <th className="py-3 px-3 border-r border-slate-200 w-28">ቀን</th>
                    <th className="py-3 px-3 border-r border-slate-200 w-36">ክፍል</th>
                    <th className="py-3 px-4 border-r border-slate-200 text-left">የተማሪው ስም</th>
                    <th className="py-3 px-3 border-r border-slate-200 w-16">ፆታ</th>
                    <th className="py-3 px-4 border-r border-slate-200 text-left">የቀረበት ምክንያት</th>
                    <th className="py-3 px-3 print:hidden w-16">ተግባር</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-center">
                  {filteredAbsenteeList.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400">
                        በዚህ ቀን የተመዘገበ የቀረ ተማሪ አልተገኘም።
                      </td>
                    </tr>
                  ) : (
                    filteredAbsenteeList.map((rec, idx) => (
                      <tr
                        key={`att_${rec.id || 'rec'}_${idx}`}
                        className="hover:bg-slate-50 transition"
                      >
                        <td className="py-2.5 px-3 border-r border-slate-200 text-slate-500 font-medium">
                          {idx + 1}
                        </td>
                        <td className="py-2.5 px-3 border-r border-slate-200 text-slate-600 font-mono text-[11px]">
                          {rec.date}
                        </td>
                        <td className="py-2.5 px-3 border-r border-slate-200 font-semibold text-blue-900">
                          {rec.className}
                        </td>
                        <td className="py-2.5 px-4 border-r border-slate-200 text-left font-bold text-slate-900">
                          {rec.studentName}
                        </td>
                        <td className="py-2.5 px-3 border-r border-slate-200">
                          <span
                            className={`font-semibold ${
                              rec.gender === 'ወ'
                                ? 'text-blue-600'
                                : rec.gender === 'ሴ'
                                ? 'text-rose-600'
                                : 'text-slate-400'
                            }`}
                          >
                            {rec.gender || '-'}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 border-r border-slate-200 text-left text-slate-700">
                          {rec.reason}
                        </td>
                        <td className="py-2.5 px-3 print:hidden">
                          <button
                            onClick={() => {
                              if (confirm(`${rec.studentName} የቀረበትን መዝገብ መሰረዝ ይፈልጋሉ?`)) {
                                onDeleteAttendance(rec.id);
                              }
                            }}
                            className="text-rose-600 hover:text-rose-800 p-1 rounded hover:bg-rose-50 transition"
                            title="መዝገብ ሰርዝ"
                          >
                            <Trash2 className="w-4 h-4 mx-auto" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Manual Absentee Modal */}
      {showAddAbsenteeModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-lg font-bold text-slate-900 mb-1">የቀረ ተማሪ መዝግብ</h3>
            <p className="text-xs text-slate-500 mb-4">የቀን፦ {absenteeDateFilter}</p>

            <form onSubmit={handleModalAddAbsenteeSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">ክፍል፦</label>
                <select
                  value={modalTargetClass}
                  onChange={(e) => setModalTargetClass(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-600 bg-white"
                >
                  {classList.map((c) => (
                    <option key={`modal_c_${c}`} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  የተማሪው ስም፦
                </label>
                <input
                  type="text"
                  value={modalStudentName}
                  onChange={(e) => setModalStudentName(e.target.value)}
                  placeholder="የተማሪውን ስም ያስገቡ"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-600"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">ፆታ፦</label>
                <select
                  value={modalGender}
                  onChange={(e) => setModalGender(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-600 bg-white"
                >
                  <option value="ወ">ወንድ (ወ)</option>
                  <option value="ሴ">ሴት (ሴ)</option>
                  <option value="">-</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  የቀረበት ምክንያት፦
                </label>
                <input
                  type="text"
                  value={modalReason}
                  onChange={(e) => setModalReason(e.target.value)}
                  placeholder="ምሳሌ፡ ሕመም፣ ጉዞ፣ ወዘተ"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddAbsenteeModal(false)}
                  className="px-4 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-xl font-medium"
                >
                  ሰርዝ
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-semibold shadow"
                >
                  መዝግብ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Batch Add Modal: Paste up to 40 student names directly into this class */}
      {showBatchAddModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-700">
                <UserPlus className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  ተማሪዎችን በአንድነት አስገባ (Batch Paste)
                </h3>
                <p className="text-xs text-slate-500">
                  ክፍል፦ <span className="font-bold text-slate-800">{selectedClass}</span> (እስከ 40 መስመር ይሞላል)
                </p>
              </div>
            </div>

            <div className="py-4 space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  የተማሪዎች ስም ዝርዝር (በየመስመሩ አንዱን ስም ያስገቡ ወይም ይለጥፉ)፦
                </label>
                <textarea
                  rows={8}
                  value={batchNamesText}
                  onChange={(e) => setBatchNamesText(e.target.value)}
                  placeholder={`ምሳሌ፦\nዮሐንስ ተስፋዬ\nሳራ መንግስቱ\nዳዊት አበበ (ወ)\nሊዲያ ደስታ (ሴ)`}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-mono focus:ring-2 focus:ring-indigo-600 focus:outline-none"
                  autoFocus
                />
              </div>

              <div className="flex items-center justify-between bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                <span className="text-slate-600 font-semibold">ነባሪ ፆታ (ላልተገለጹት)፦</span>
                <div className="flex items-center gap-2.5">
                  <label className="flex items-center gap-1 cursor-pointer">
                    <input
                      type="radio"
                      name="batchGender"
                      checked={batchDefaultGender === 'ወ'}
                      onChange={() => setBatchDefaultGender('ወ')}
                    />
                    <span className="font-bold text-blue-700">ወንድ (ወ)</span>
                  </label>
                  <label className="flex items-center gap-1 cursor-pointer">
                    <input
                      type="radio"
                      name="batchGender"
                      checked={batchDefaultGender === 'ሴ'}
                      onChange={() => setBatchDefaultGender('ሴ')}
                    />
                    <span className="font-bold text-rose-700">ሴት (ሴ)</span>
                  </label>
                  <label className="flex items-center gap-1 cursor-pointer">
                    <input
                      type="radio"
                      name="batchGender"
                      checked={batchDefaultGender === ''}
                      onChange={() => setBatchDefaultGender('')}
                    />
                    <span className="font-bold text-slate-600">-</span>
                  </label>
                </div>
              </div>

              {/* Default Age for Batch Addition */}
              <div className="flex items-center justify-between bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                <span className="text-slate-600 font-semibold">ነባሪ ዕድሜ ለሁሉም፦</span>
                <select
                  value={batchDefaultAge}
                  onChange={(e) => setBatchDefaultAge(e.target.value)}
                  className="bg-white border border-slate-300 rounded-lg text-xs font-bold px-2.5 py-1 text-slate-800 cursor-pointer focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  {Array.from({ length: 14 }, (_, i) => i + 4).map((a) => (
                    <option key={`att_batch_age_opt_${a}`} value={String(a)}>
                      {a} ዓመት
                    </option>
                  ))}
                </select>
              </div>

              <p className="text-[11px] text-slate-500">
                💡 <strong>ጠቃሚ ማስታወሻ፦</strong> ከ Word፣ Excel ወይም ከየትኛውም ቦታ የተማሪዎች ስም ኮፒ አድርገው እዚህ በመለጠፍ በአንድ ቅጽበት የክፍሉን 40 መስመሮች መሙላት ይችላሉ።
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowBatchAddModal(false)}
                className="px-4 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-xl font-medium"
              >
                ሰርዝ
              </button>
              <button
                type="button"
                onClick={handleBatchAddStudents}
                disabled={!batchNamesText.trim()}
                className="px-5 py-2 text-xs bg-indigo-700 hover:bg-indigo-600 disabled:opacity-50 text-white rounded-xl font-bold shadow flex items-center gap-1.5 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                አሁን አስገባ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useState, useMemo, useEffect } from 'react';
import {
  UserPlus,
  Printer,
  FileText,
  Download,
  Upload,
  Search,
  Trash2,
  Award,
  UserCheck,
  RotateCcw,
  Eraser,
  Compass,
  ArrowDownUp,
  FileSpreadsheet,
  FileCheck,
  Layers,
  HelpCircle,
  Check,
  AlertCircle,
  Users
} from 'lucide-react';
import { Student, Teacher, Role } from '../types';
import {
  downloadCSV,
  downloadXLSX,
  readExcelOrCSVWorkbook,
  parseStudentRowsWithHeaders,
  matchClassName,
  parseCleanStudentLine
} from '../utils/csv';

interface ClassesTabProps {
  currentYear: string;
  classList: string[];
  selectedClass: string;
  onSelectClass: (className: string) => void;
  teachers: Teacher[];
  students: Student[];
  onUpdateStudent: (student: Student) => void;
  onAddStudent: (student: Omit<Student, 'id'>) => void;
  onAddStudentsBatch?: (
    students: Omit<Student, 'id'>[],
    targetClass?: string,
    replaceExisting?: boolean
  ) => void;
  onAddStudentsMultiClass?: (
    studentsByClass: { [className: string]: Omit<Student, 'id'>[] },
    replaceExisting?: boolean
  ) => void;
  onDeleteStudent: (studentId: number) => void;
  onClearClassStudents?: (className: string) => void;
  onClearClassScores?: (className: string) => void;
  onSetClassAge?: (className: string, newAge: string) => void;
  onGoToAttendance?: () => void;
  onGoToAllStudents?: () => void;
  currentUserRole: Role | null;
  loggedInTeacher: Teacher | null;
  subjects?: string[];
  classSubjects?: { [className: string]: string[] };
  onUpdateClassSubjects?: (classSubjects: { [className: string]: string[] }) => void;
}

export const ClassesTab: React.FC<ClassesTabProps> = ({
  currentYear,
  classList,
  selectedClass,
  onSelectClass,
  teachers,
  students,
  onUpdateStudent,
  onAddStudent,
  onAddStudentsBatch,
  onAddStudentsMultiClass,
  onDeleteStudent,
  onClearClassStudents,
  onClearClassScores,
  onSetClassAge,
  onGoToAttendance,
  onGoToAllStudents,
  currentUserRole,
  loggedInTeacher,
  subjects = [],
  classSubjects = {},
  onUpdateClassSubjects
}) => {
  const [searchQuery, setSearchQuery] = useState('');
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

  const [showAddModal, setShowAddModal] = useState(false);
  const [showSubjectModal, setShowSubjectModal] = useState(false);
  const [newStudentName, setNewStudentName] = useState('');
  const [newStudentAge, setNewStudentAge] = useState('7');
  const [newStudentGender, setNewStudentGender] = useState<string>('ወ');

  // Batch paste modal state (to enter multiple students at once)
  const [showBatchAddModal, setShowBatchAddModal] = useState(false);
  const [batchNamesText, setBatchNamesText] = useState('');
  const [batchDefaultGender, setBatchDefaultGender] = useState<'ወ' | 'ሴ' | ''>('');
  const [batchDefaultAge, setBatchDefaultAge] = useState<string>('8');

  // Excel/CSV import modal and preview states
  const [importPreview, setImportPreview] = useState<{
    fileName: string;
    isMultiClass: boolean;
    totalStudents: number;
    classesSummary: { className: string; count: number }[];
    studentsByClass: { [className: string]: Omit<Student, 'id'>[] };
    selectedClassCount: number;
  } | null>(null);
  const [importMode, setImportMode] = useState<'all_classes' | 'selected_only' | 'all_into_selected'>('all_into_selected');
  const [replaceExisting, setReplaceExisting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const assignedTeacher = teachers.find((t) => t.assignedClass === selectedClass);
  const canEdit =
    currentUserRole === 'admin' ||
    (currentUserRole === 'teacher' && loggedInTeacher?.assignedClass === selectedClass);

  // Configuration of 7 assessments with their max scores and styling (memoized)
  const assessmentsConfig = useMemo(() => [
    { key: 'm1' as const, label: 'ምዘና 1 (10)', max: 10, bg: 'bg-blue-50/40', inputFocus: 'focus:border-blue-600' },
    { key: 'm2' as const, label: 'ምዘና 2 (10)', max: 10, bg: 'bg-blue-50/40', inputFocus: 'focus:border-blue-600' },
    { key: 'm3' as const, label: 'ምዘና 3 (10)', max: 10, bg: 'bg-blue-50/40', inputFocus: 'focus:border-blue-600' },
    { key: 'm4' as const, label: 'ምዘና 4 (20)', max: 20, bg: 'bg-indigo-50/40', inputFocus: 'focus:border-indigo-600' },
    { key: 'm5' as const, label: 'ምዘና 5 (10)', max: 10, bg: 'bg-blue-50/40', inputFocus: 'focus:border-blue-600' },
    { key: 'm6' as const, label: 'ምዘና 6 (10)', max: 10, bg: 'bg-blue-50/40', inputFocus: 'focus:border-blue-600' },
    { key: 'm7' as const, label: 'ምዘና 7 (30)', max: 30, bg: 'bg-amber-50/40', inputFocus: 'focus:border-amber-600' },
  ], []);

  // Compute calculated totals and rankings (clean 0 scores so blank students don't clutter)
  const { rankedStudents, studentsWithScores } = useMemo(() => {
    const calculated = students.map((s) => {
      const m1 = Number(s.m1) || 0;
      const m2 = Number(s.m2) || 0;
      const m3 = Number(s.m3) || 0;
      const m4 = Number(s.m4) || 0;
      const m5 = Number(s.m5) || 0;
      const m6 = Number(s.m6) || 0;
      const m7 = Number(s.m7) || 0;

      const hasAnyScore = m1 > 0 || m2 > 0 || m3 > 0 || m4 > 0 || m5 > 0 || m6 > 0 || m7 > 0;
      const total = m1 + m2 + m3 + m4 + m5 + m6 + m7;
      return { ...s, total, hasAnyScore };
    });

    const withScores = calculated.filter((s) => s.hasAnyScore);
    const sortedTotals = [...withScores].sort((a, b) => b.total - a.total);

    const ranked = calculated.map((s) => {
      if (!s.hasAnyScore) {
        return { ...s, rank: undefined };
      }
      const rank = sortedTotals.findIndex((item) => item.total === s.total) + 1;
      return { ...s, rank };
    });

    return { rankedStudents: ranked, studentsWithScores: withScores };
  }, [students]);

  const filteredStudents = useMemo(() => {
    if (!searchQuery.trim()) return rankedStudents;
    const q = searchQuery.toLowerCase();
    return rankedStudents.filter((s) => s.name.toLowerCase().includes(q));
  }, [rankedStudents, searchQuery]);

  // When printing/exporting to PDF, ensure ALL students of the class are included
  const studentsToRender = useMemo(() => {
    if (isPrinting) return rankedStudents;
    return filteredStudents;
  }, [isPrinting, rankedStudents, filteredStudents]);

  // Stats
  const totalCount = rankedStudents.length;
  const maleCount = rankedStudents.filter((s) => s.gender === 'ወ').length;
  const femaleCount = rankedStudents.filter((s) => s.gender === 'ሴ').length;
  const gradedCount = studentsWithScores.length;
  const avgScore =
    gradedCount > 0
      ? (studentsWithScores.reduce((sum, s) => sum + (s.total || 0), 0) / gradedCount).toFixed(1)
      : '-';
  const highestScore =
    gradedCount > 0 ? Math.max(...studentsWithScores.map((s) => s.total || 0)) : 0;

  // Sister section (e.g. 8ኛ ክፍል ሀ <-> 8ኛ ክፍል ለ) for quick switching
  const siblingSection = useMemo(() => {
    if (selectedClass.endsWith(' ሀ')) {
      const bName = selectedClass.replace(' ሀ', ' ለ');
      return classList.includes(bName) ? bName : null;
    }
    if (selectedClass.endsWith(' ለ')) {
      const aName = selectedClass.replace(' ለ', ' ሀ');
      return classList.includes(aName) ? aName : null;
    }
    return null;
  }, [selectedClass, classList]);

  // Horizontal and vertical keyboard navigation (↑ ↓ ← → and Enter)
  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    rowIndex: number,
    colIndex: number
  ) => {
    const totalRows = filteredStudents.length;
    const totalCols = assessmentsConfig.length;

    let targetRow = rowIndex;
    let targetCol = colIndex;

    if (e.key === 'ArrowDown' || e.key === 'Enter') {
      e.preventDefault();
      targetRow = Math.min(totalRows - 1, rowIndex + 1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      targetRow = Math.max(0, rowIndex - 1);
    } else if (e.key === 'ArrowRight') {
      const input = e.currentTarget;
      if (
        input.selectionEnd === input.value.length ||
        (input.selectionStart === 0 && input.selectionEnd === input.value.length)
      ) {
        if (colIndex < totalCols - 1) {
          e.preventDefault();
          targetCol = colIndex + 1;
        }
      } else {
        return;
      }
    } else if (e.key === 'ArrowLeft') {
      const input = e.currentTarget;
      if (
        input.selectionStart === 0 ||
        (input.selectionStart === 0 && input.selectionEnd === input.value.length)
      ) {
        if (colIndex > 0) {
          e.preventDefault();
          targetCol = colIndex - 1;
        }
      } else {
        return;
      }
    } else {
      return;
    }

    const nextElem = document.getElementById(`score-input-${targetRow}-${targetCol}`) as HTMLInputElement | null;
    if (nextElem) {
      nextElem.focus();
      nextElem.select();
    }
  };

  const handleScoreChange = (
    student: Student,
    field: 'm1' | 'm2' | 'm3' | 'm4' | 'm5' | 'm6' | 'm7',
    val: string,
    maxVal: number
  ) => {
    if (val.trim() === '') {
      onUpdateStudent({
        ...student,
        [field]: 0
      });
      return;
    }
    let num = parseFloat(val);
    if (isNaN(num) || num < 0) num = 0;
    if (num > maxVal) {
      num = maxVal;
    }
    onUpdateStudent({
      ...student,
      [field]: num
    });
  };

  // Clear single student's scores to blank
  const handleClearStudentScores = (student: Student) => {
    if (!canEdit) return;
    if (window.confirm(`የ"${student.name}"ን ውጤት በሙሉ አጽድተው ባዶ ማድረግ ይፈልጋሉ?`)) {
      onUpdateStudent({
        ...student,
        m1: 0,
        m2: 0,
        m3: 0,
        m4: 0,
        m5: 0,
        m6: 0,
        m7: 0
      });
    }
  };

  // Bulk actions: Clear all scores in class
  const handleClearClassScores = () => {
    if (!canEdit || students.length === 0) return;
    if (
      window.confirm(
        `እርግጠኛ ነዎት? በ${selectedClass} ያሉትን የ${students.length} ተማሪዎች ውጤት በሙሉ አጽድተው ባዶ ማድረግ ይፈልጋሉ? (የተማሪዎች ስም አይጠፋም)`
      )
    ) {
      if (onClearClassScores) {
        onClearClassScores(selectedClass);
      } else {
        students.forEach((s) => {
          onUpdateStudent({
            ...s,
            m1: 0,
            m2: 0,
            m3: 0,
            m4: 0,
            m5: 0,
            m6: 0,
            m7: 0
          });
        });
      }
    }
  };

  // Bulk actions: Delete all students in class
  const handleClearAllStudents = () => {
    if (!canEdit || students.length === 0) return;
    if (
      window.confirm(
        `⚠️ ማስጠንቀቂያ፡ በ${selectedClass} ውስጥ ያሉትን ሁሉንም (${students.length}) ተማሪዎች ከመዝገብ ሙሉ በሙሉ መሰረዝ ይፈልጋሉ? ይህ እርምጃ አይመለስም!`
      )
    ) {
      if (onClearClassStudents) {
        onClearClassStudents(selectedClass);
      } else {
        students.forEach((s) => onDeleteStudent(s.id));
      }
    }
  };

  // Apply same age to all students in this class
  const handleApplyClassAge = (newAge: string) => {
    if (!canEdit) return;
    if (students.length === 0) {
      alert('በዚህ ክፍል ውስጥ የተመዘገበ ተማሪ የለም!');
      return;
    }
    if (
      window.confirm(
        `የ"${selectedClass}" ክፍል ${students.length} ተማሪዎችን ዕድሜ በሙሉ ወደ "${newAge} ዓመት" መቀየር ይፈልጋሉ?`
      )
    ) {
      if (onSetClassAge) {
        onSetClassAge(selectedClass, newAge);
      } else {
        students.forEach((s) => onUpdateStudent({ ...s, age: newAge }));
      }
      alert(`✓ የ"${selectedClass}" ክፍል ተማሪዎች በሙሉ ዕድሜያቸው ${newAge} ዓመት ተደርጓል!`);
    }
  };

  const handleInfoChange = (
    student: Student,
    field: 'name' | 'age' | 'gender',
    val: string
  ) => {
    onUpdateStudent({
      ...student,
      [field]: val
    });
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudentName.trim()) {
      alert('እባክዎ የተማሪውን ሙሉ ስም ያስገቡ!');
      return;
    }
    onAddStudent({
      name: newStudentName.trim(),
      age: newStudentAge.trim() || '7',
      gender: newStudentGender,
      m1: 0,
      m2: 0,
      m3: 0,
      m4: 0,
      m5: 0,
      m6: 0,
      m7: 0
    });
    setNewStudentName('');
    setNewStudentAge('7');
    setShowAddModal(false);
  };

  const handleBatchAddStudents = () => {
    if (!batchNamesText.trim()) return;

    const lines = batchNamesText.split(/\r?\n/);
    const newStudents: Omit<Student, 'id'>[] = [];

    lines.forEach((line) => {
      const { name, gender } = parseCleanStudentLine(line, batchDefaultGender);

      if (name && name.length >= 2) {
        newStudents.push({
          name,
          age: batchDefaultAge || '8',
          gender,
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

    if (newStudents.length === 0) {
      alert('እባክዎን ትክክለኛ የተማሪ ስም ያስገቡ!');
      return;
    }

    if (onAddStudentsBatch) {
      onAddStudentsBatch(newStudents, selectedClass, false);
    } else {
      newStudents.forEach((st) => onAddStudent(st));
    }

    alert(`✓ ${newStudents.length} ተማሪዎች ወደ "${selectedClass}" በተሳካ ሁኔታ ተመዝግበዋል!`);
    setBatchNamesText('');
    setShowBatchAddModal(false);
  };

  const handleExportCSV = () => {
    let csv =
      '\uFEFFተ.ቁ,የተማሪው ስም,ክፍል,ዕድሜ,ፆታ,ምዘና 1 (10),ምዘና 2 (10),ምዘና 3 (10),ምዘና 4 (20),ምዘና 5 (10),ምዘና 6 (10),ምዘና 7 (30),አጠቃላይ ድምር (100),ደረጃ\n';
    rankedStudents.forEach((s, idx) => {
      csv += `${idx + 1},"${s.name}","${selectedClass}",${s.age},${s.gender},${s.m1},${s.m2},${s.m3},${s.m4},${s.m5},${s.m6},${s.m7},${s.total},${s.rank || ''}\n`;
    });
    downloadCSV(csv, `${selectedClass}_የውጤት_መዝገብ_${currentYear}.csv`);
  };

  const handleExportXLSX = () => {
    const data: (string | number)[][] = [
      [
        'ተ.ቁ',
        'የተማሪው ሙሉ ስም',
        'ክፍል',
        'ዕድሜ',
        'ፆታ',
        'ምዘና 1 (10)',
        'ምዘና 2 (10)',
        'ምዘና 3 (10)',
        'ምዘና 4 (20)',
        'ምዘና 5 (10)',
        'ምዘና 6 (10)',
        'ምዘና 7 (30)',
        'አጠቃላይ ድምር (100)',
        'ደረጃ'
      ]
    ];

    rankedStudents.forEach((s, idx) => {
      data.push([
        idx + 1,
        s.name,
        selectedClass,
        s.age,
        s.gender,
        s.m1,
        s.m2,
        s.m3,
        s.m4,
        s.m5,
        s.m6,
        s.m7,
        s.total || 0,
        s.rank || '-'
      ]);
    });

    downloadXLSX(data, `${selectedClass}_የውጤት_መዝገብ_${currentYear}.xlsx`, selectedClass);
  };

  const handleDownloadTemplate = () => {
    const templateData: (string | number)[][] = [
      ['ተ.ቁ', 'የተማሪው ሙሉ ስም', 'ክፍል', 'ዕድሜ', 'ፆታ', 'ምዘና 1 (10)', 'ምዘና 2 (10)', 'ምዘና 3 (10)', 'ምዘና 4 (20)', 'ምዘና 5 (10)', 'ምዘና 6 (10)', 'ምዘና 7 (30)'],
      [1, 'አበበ ከበደ', selectedClass, '7', 'ወ', '', '', '', '', '', '', ''],
      [2, 'አልማዝ ተስፋዬ', selectedClass, '8', 'ሴ', '', '', '', '', '', '', '']
    ];
    downloadXLSX(templateData, `${selectedClass}_የተማሪ_መጫኛ_ናሙና_ቅጽ.xlsx`, selectedClass);
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsImporting(true);
      const workbookResult = await readExcelOrCSVWorkbook(file);
      if (!workbookResult.sheets || workbookResult.sheets.length === 0) {
        alert('የተመረጠው ፋይል ባዶ ወይም ትክክለኛ የኤክሴል/CSV ፎርማት አይደለም!');
        setIsImporting(false);
        e.target.value = '';
        return;
      }

      // Group parsed students by destination class
      const studentsByClass: { [className: string]: Omit<Student, 'id'>[] } = {};
      let totalParsed = 0;

      for (const sheet of workbookResult.sheets) {
        // Check if sheet name matches a class
        const matchedClassFromSheet = matchClassName(sheet.sheetName, classList);
        const defaultClassForSheet = matchedClassFromSheet || selectedClass;

        const parsed = parseStudentRowsWithHeaders(sheet.rows, defaultClassForSheet, classList);

        for (const st of parsed.students) {
          const destClass = st.className || defaultClassForSheet;
          if (!studentsByClass[destClass]) {
            studentsByClass[destClass] = [];
          }
          studentsByClass[destClass].push({
            name: st.name,
            age: st.age,
            gender: st.gender,
            m1: st.m1,
            m2: st.m2,
            m3: st.m3,
            m4: st.m4,
            m5: st.m5,
            m6: st.m6,
            m7: st.m7
          });
          totalParsed++;
        }
      }

      if (totalParsed === 0) {
        alert('በፋይሉ ውስጥ ምንም የተማሪ ስም አልተገኘም! እባክዎ ፋይሉን ያረጋግጡ።');
        setIsImporting(false);
        e.target.value = '';
        return;
      }

      const classKeys = Object.keys(studentsByClass).filter((k) => studentsByClass[k].length > 0);
      const isMultiClass = classKeys.length > 1;
      const selectedClassList = studentsByClass[selectedClass] || [];

      const classesSummary = classKeys.map((c) => ({
        className: c,
        count: studentsByClass[c].length
      }));

      setImportPreview({
        fileName: file.name,
        isMultiClass,
        totalStudents: totalParsed,
        classesSummary,
        studentsByClass,
        selectedClassCount: selectedClassList.length
      });

      // Default mode: always load all students into the currently selected class so that naming variations (e.g. 8 vs 8ኛ ክፍል vs 8ኛ ክፍል ሀ) never drop students
      setImportMode('all_into_selected');
      setReplaceExisting(false);
    } catch {
      alert('ፋይሉን ማንበብ አልተሳካም። እባክዎ ትክክለኛ የExcel (.xlsx/.xls) ወይም CSV ፋይል መሆኑን ያረጋግጡ።');
    } finally {
      setIsImporting(false);
      e.target.value = '';
    }
  };

  const confirmImport = () => {
    if (!importPreview) return;

    if (importMode === 'all_into_selected') {
      const allStudents: Omit<Student, 'id'>[] = [];
      Object.values(importPreview.studentsByClass).forEach((list) => {
        allStudents.push(...list);
      });

      if (allStudents.length === 0) {
        alert('በፋይሉ ውስጥ ምንም ተማሪ አልተገኘም!');
        return;
      }

      if (onAddStudentsBatch) {
        onAddStudentsBatch(allStudents, selectedClass, replaceExisting);
      } else {
        allStudents.forEach((s) => onAddStudent(s));
      }

      alert(
        `✓ በድምሩ ${allStudents.length} ተማሪዎች ወደ "${selectedClass}" ክፍል በተሳካ ሁኔታ ተጭነዋል!`
      );
    } else if (importMode === 'all_classes' && importPreview.isMultiClass) {
      if (onAddStudentsMultiClass) {
        onAddStudentsMultiClass(importPreview.studentsByClass, replaceExisting);
      } else if (onAddStudentsBatch) {
        Object.entries(importPreview.studentsByClass).forEach(([cName, list]) => {
          onAddStudentsBatch(list, cName, replaceExisting);
        });
      }
      alert(
        `✓ በድምሩ ${importPreview.totalStudents} ተማሪዎች ወደ ${importPreview.classesSummary.length} ክፍሎች በተሳካ ሁኔታ ተጭነዋል!`
      );
    } else {
      // Selected class only
      let targetBatch = importPreview.studentsByClass[selectedClass] || [];
      if (targetBatch.length === 0 && importPreview.classesSummary.length === 1) {
        targetBatch = importPreview.studentsByClass[importPreview.classesSummary[0].className] || [];
      }

      if (targetBatch.length === 0) {
        alert(`በተመረጠው ፋይል ውስጥ ለ"${selectedClass}" የተመደበ ተማሪ አልተገኘም! እባክዎ "ሁሉንም ወደዚህ ክፍል ጫን" የሚለውን ይምረጡ።`);
        return;
      }

      if (onAddStudentsBatch) {
        onAddStudentsBatch(targetBatch, selectedClass, replaceExisting);
      } else {
        targetBatch.forEach((s) => onAddStudent(s));
      }

      alert(
        `✓ ${targetBatch.length} ተማሪዎች ወደ "${selectedClass}" ክፍል ብቻ በተሳካ ሁኔታ ተጭነዋል!`
      );
    }

    setImportPreview(null);
  };

  // Export/Print to PDF - ensures all students of the class are rendered and included
  const handlePrint = () => {
    if (searchQuery) {
      setSearchQuery('');
    }
    setTimeout(() => {
      window.print();
    }, 120);
  };

  return (
    <div className="space-y-6">
      {/* Printable Sheet Header */}
      <div className="hidden print:block text-center pb-4 mb-4 border-b border-slate-300">
        <h1 className="text-xl font-bold">የብርብር ከተማ ቃለ ሕይወት ቤተክርስቲያን</h1>
        <h2 className="text-base font-semibold">የልጆች አገልግሎት ዘርፍ የውጤት መዝገብ</h2>
        <div className="flex justify-between text-xs mt-2 font-medium">
          <span>ክፍል፦ {selectedClass}</span>
          <span>የትምህርት ዘመን፦ {currentYear} ዓ/ም</span>
          <span>ጠቅላላ ተማሪዎች፦ {rankedStudents.length}</span>
          <span>መምህር፦ {assignedTeacher ? assignedTeacher.name : 'ልዩ አልተመደበም'}</span>
        </div>
      </div>

      {/* Controls Bar */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm print:hidden">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">
                ክፍል ይምረጡ፦
              </label>
              <select
                value={selectedClass}
                onChange={(e) => onSelectClass(e.target.value)}
                disabled={currentUserRole === 'teacher'}
                className="bg-slate-50 border border-slate-300 text-slate-900 rounded-xl px-3.5 py-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-600 disabled:bg-slate-100 disabled:opacity-80"
              >
                {classList.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div className="pt-5 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-teal-50 border border-teal-200 rounded-xl text-teal-800 text-xs font-semibold">
                <UserCheck className="w-3.5 h-3.5" />
                የክፍሉ መምህር፦ {assignedTeacher ? `${assignedTeacher.name}${assignedTeacher.assignedSubject ? ` (${assignedTeacher.assignedSubject})` : ''}` : 'ልዩ አልተመደበም'}
              </span>

              {/* Class Subjects Badge & Picker Button */}
              <button
                type="button"
                onClick={() => setShowSubjectModal(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-xl text-blue-900 text-xs font-semibold hover:bg-blue-100 transition"
                title="ለዚህ ክፍል የትምህርት ዓይነቶች ምረጥ"
              >
                <span>ትምህርቶች፦ {(classSubjects[selectedClass] || []).length > 0 ? (classSubjects[selectedClass] || []).join('፣ ') : 'አጠቃላይ'}</span>
                {canEdit && <span className="bg-blue-200 text-blue-800 px-1.5 py-0.5 rounded text-[10px] font-bold">+ ምረጥ</span>}
              </button>

              {/* Sister Section Switcher (e.g. 8ኛ ክፍል ሀ <-> 8ኛ ክፍል ለ) */}
              {siblingSection && currentUserRole !== 'teacher' && (
                <button
                  type="button"
                  onClick={() => onSelectClass(siblingSection)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 border border-amber-300 rounded-xl text-amber-900 text-xs font-bold hover:bg-amber-100 transition cursor-pointer"
                  title={`ወደ ${siblingSection} ቀይር`}
                >
                  <ArrowDownUp className="w-3.5 h-3.5 text-amber-700" />
                  <span>ወደ "{siblingSection}" ቀይር</span>
                </button>
              )}

              {/* Master All Students Shortcut for Coordinator / Leaders */}
              {onGoToAllStudents && (currentUserRole === 'admin' || currentUserRole === 'leader') && (
                <button
                  type="button"
                  onClick={onGoToAllStudents}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 border border-indigo-200 rounded-xl text-indigo-900 text-xs font-bold hover:bg-indigo-100 transition shadow-sm cursor-pointer"
                  title="የሁሉንም ክፍሎች የተመዘገቡ ተማሪዎች ማስተር ገጽ ክፈት"
                >
                  <Users className="w-3.5 h-3.5 text-indigo-700" />
                  <span>👥 ሁሉንም የተመዘገቡ ተማሪዎች በአንድ ላይ እይ</span>
                </button>
              )}
            </div>
          </div>

          {/* Search and Action Buttons Bar - Strictly Horizontal Scrollable Row (ወደ ጎን) */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1.5 scrollbar-thin max-w-full shrink-0">
            {/* Search Input */}
            <div className="relative min-w-[160px] shrink-0">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="በስም ፈልግ..."
                className="pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 w-full"
              />
            </div>

            {/* High-Visibility Excel Import Button (በዋናነት ወደ ጎን በመጀመሪያ ረድፍ) */}
            {canEdit && (
              <label
                className={`bg-teal-700 hover:bg-teal-600 text-white text-xs font-bold px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 shadow-md cursor-pointer shrink-0 border border-teal-800 ${
                  isImporting ? 'opacity-70 pointer-events-none' : ''
                }`}
                title="የተማሪዎችን ስምና ውጤት ከExcel/CSV ፋይል ወደ ስርዓቱ ጫን"
              >
                <Upload className="w-4 h-4 text-teal-200" />
                <span>{isImporting ? 'በማንበብ ላይ...' : '📥 Excel ጫን'}</span>
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv,.txt"
                  onChange={handleImportFile}
                  disabled={isImporting}
                  className="hidden"
                />
              </label>
            )}

            {/* Excel Download & Template Buttons */}
            {onGoToAttendance && (
              <button
                type="button"
                onClick={onGoToAttendance}
                className="bg-emerald-800 hover:bg-emerald-700 text-amber-300 border border-emerald-600 text-xs font-bold px-3 py-2 rounded-xl transition flex items-center gap-1.5 shadow-md cursor-pointer shrink-0"
                title="ወደ የተማሪዎች አተንዳንስ ገጽ ሂድ"
              >
                <span>📅 የተማሪዎች አተንዳንስ</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleExportXLSX}
              className="bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-semibold px-3 py-2 rounded-xl transition flex items-center gap-1.5 shadow-sm cursor-pointer shrink-0"
              title="የዚህን ክፍል የተማሪዎች ውጤት በExcel አውርድ"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Excel አውርድ</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadTemplate}
              className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-semibold px-2.5 py-2 rounded-xl transition flex items-center gap-1 shadow-sm cursor-pointer shrink-0"
              title="ለዚህ ክፍል የተማሪዎች መሙያ ዝግጁ የሆነ ባዶ የExcel ናሙና ቅጽ አውርድ"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
              <span>ናሙና ቅጽ</span>
            </button>

            {/* Add Student & Batch Paste Buttons */}
            {(canEdit || currentUserRole === 'leader') && (
              <>
                <button
                  onClick={() => setShowAddModal(true)}
                  className="bg-blue-800 hover:bg-blue-700 text-white text-xs font-semibold px-3 py-2 rounded-xl transition flex items-center gap-1.5 shadow-sm cursor-pointer shrink-0"
                  title="አንድ አዲስ ተማሪ መዝግብ"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>+ ተማሪ</span>
                </button>

                <button
                  onClick={() => setShowBatchAddModal(true)}
                  className="bg-indigo-700 hover:bg-indigo-600 text-white text-xs font-semibold px-3 py-2 rounded-xl transition flex items-center gap-1.5 shadow-sm cursor-pointer shrink-0"
                  title="የተማሪዎችን ስም ዝርዝር በአንድነት ለጥፈህ አስገባ (Batch Paste)"
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>+ በቡድን አስገባ</span>
                </button>

                {/* Class-wide Age Selector Dropdown in Toolbar */}
                <div
                  className="bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-xl px-2.5 py-1.5 transition flex items-center gap-1.5 shadow-xs shrink-0"
                  title="የዚህን ክፍል ተማሪዎች በሙሉ አንድ አይነት ዕድሜ (ከ4 እስከ 17) ምረጥ"
                >
                  <span className="text-xs font-bold text-indigo-900 whitespace-nowrap">🎂 የክፍሉ ዕድሜ፦</span>
                  <select
                    onChange={(e) => {
                      if (e.target.value) {
                        handleApplyClassAge(e.target.value);
                        e.target.value = '';
                      }
                    }}
                    defaultValue=""
                    className="bg-white border border-indigo-300 text-indigo-950 font-bold text-xs rounded-lg px-2 py-1 cursor-pointer focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  >
                    <option value="" disabled>ለሁሉም ምረጥ (4-17)...</option>
                    {Array.from({ length: 14 }, (_, i) => i + 4).map((a) => (
                      <option key={`bar_class_age_${a}`} value={String(a)}>
                        {a} ዓመት
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}

            {/* Print / PDF Buttons */}
            <button
              onClick={handlePrint}
              className="bg-rose-700 hover:bg-rose-600 text-white text-xs font-bold px-3 py-2 rounded-xl transition flex items-center gap-1.5 shadow-sm cursor-pointer shrink-0 border border-rose-800"
              title="የክፍሉን የተማሪዎች ውጤት መዝገብ በPDF አውርድ ወይም አትም"
            >
              <FileText className="w-3.5 h-3.5 text-rose-200" />
              <span>📄 PDF አውርድ</span>
            </button>
            <button
              onClick={handlePrint}
              className="bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold px-3 py-2 rounded-xl transition flex items-center gap-1.5 shadow-sm cursor-pointer shrink-0"
              title="ገጹን ወደ PDF ቀይር ወይም አትም"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print</span>
            </button>

            {/* Clear / Delete Buttons */}
            {canEdit && (
              <>
                <button
                  type="button"
                  onClick={handleClearClassScores}
                  disabled={students.length === 0}
                  className="bg-amber-100 hover:bg-amber-200 text-amber-800 disabled:opacity-40 text-xs font-semibold px-3 py-2 rounded-xl transition flex items-center gap-1.5 border border-amber-300 shrink-0"
                  title="የክፍሉን ተማሪዎች ውጤት በሙሉ አጽዳ"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>ውጤት አጽዳ</span>
                </button>

                <button
                  type="button"
                  onClick={handleClearAllStudents}
                  disabled={students.length === 0}
                  className="bg-rose-50 hover:bg-rose-100 text-rose-700 disabled:opacity-40 text-xs font-semibold px-3 py-2 rounded-xl transition flex items-center gap-1.5 border border-rose-300 shrink-0"
                  title="በዚህ ክፍል ያሉትን ተማሪዎች በሙሉ ከመዝገብ ሰርዝ"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>ተማሪዎችን ሰርዝ</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Navigation Tip Bar for Computers and Mobile Horizontal Scrolling */}
        <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-2 bg-blue-50/90 text-blue-900 border border-blue-200 px-3 py-1.5 rounded-xl font-medium">
            <Compass className="w-4 h-4 text-blue-700 shrink-0" />
            <span>
              <strong>የውጤት መሙያ መመሪያ፦</strong> በኪቦርድ ቀስቶች (<strong>↑፣ ↓፣ →፣ ←</strong>) ወይም <strong>Enter</strong> እየተጫኑ ውጤት ይሙሉ፤ ሠንጠረዡ ከማያ ገጽ እንዳይወጣ <strong>ወደ ጎን (Horizontal Scroll ↔️)</strong> ይሸበለላል።
            </span>
          </div>

          <div className="flex items-center gap-3 text-slate-500 text-[11px]">
            <span>ጠቅላላ፦ <strong className="text-slate-800">{totalCount}</strong></span>
            <span>ውጤት የገባቸው፦ <strong className="text-teal-700">{gradedCount}</strong></span>
            <span>አማካይ፦ <strong className="text-blue-800">{avgScore}</strong></span>
          </div>
        </div>
      </div>

      {/* Main Table with Sticky Header & Sticky Columns */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden print:border-none print:shadow-none print:overflow-visible">
        <div className="overflow-x-auto max-h-[72vh] overflow-y-auto relative scrollbar-thin print:max-h-none print:overflow-visible">
          <table className="w-full min-w-[1100px] print:min-w-0 print:w-full border-collapse text-left text-xs">
            <thead className="sticky top-0 z-20 bg-slate-100 shadow-sm">
              <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 uppercase tracking-wider text-center">
                <th className="py-3 px-2 border-r border-slate-200 sticky left-0 z-30 bg-slate-100 w-12 print:static print:border-slate-400">
                  ተ.ቁ
                </th>
                <th className="py-3 px-3 border-r border-slate-200 min-w-[240px] text-left sticky left-12 z-30 bg-slate-100 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] print:static print:shadow-none print:border-slate-400 text-[12pt] font-extrabold text-slate-900">
                  የተማሪው ሙሉ ስም (12pt)
                </th>
                <th className="py-2 px-1 border-r border-slate-200 min-w-[72px]">
                  <div className="flex flex-col items-center justify-center gap-0.5">
                    <span>ዕድሜ</span>
                    {canEdit && students.length > 0 && (
                      <select
                        onChange={(e) => {
                          if (e.target.value) {
                            handleApplyClassAge(e.target.value);
                            e.target.value = '';
                          }
                        }}
                        defaultValue=""
                        className="text-[10px] bg-white border border-slate-300 rounded px-1 py-0.5 font-bold text-slate-700 cursor-pointer print:hidden shadow-xs hover:border-blue-500"
                        title="ለክፍሉ ተማሪዎች በሙሉ አንድ አይነት ዕድሜ ምረጥ"
                      >
                        <option value="" disabled>ለሁሉም ▾</option>
                        {Array.from({ length: 14 }, (_, i) => i + 4).map((a) => (
                          <option key={`head_age_${a}`} value={String(a)}>
                            {a}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                </th>
                <th className="py-3 px-2 border-r border-slate-200 w-12">ፆታ</th>
                {assessmentsConfig.map((ass) => (
                  <th key={ass.key} className={`py-3 px-2 border-r border-slate-200 w-16 ${ass.bg}`}>
                    {ass.label}
                  </th>
                ))}
                <th className="py-3 px-2 border-r border-slate-200 w-20 bg-slate-200 font-extrabold text-slate-900">
                  ድምር (100)
                </th>
                <th className="py-3 px-2 border-r border-slate-200 w-16">ደረጃ</th>
                {currentUserRole !== 'leader' && (
                  <th className="py-3 px-2 print:hidden w-24" id="actionHeaderTh">
                    ተግባር / መደለቻ
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-center">
              {studentsToRender.length === 0 ? (
                <tr>
                  <td colSpan={14} className="py-12 text-center text-slate-400">
                    ምንም ተማሪ አልተገኘም። አዲስ ተማሪ ለማስገባት "+ ተማሪ" የሚለውን ይጫኑ ወይም ከ Excel ይጫኑ።
                  </td>
                </tr>
              ) : (
                studentsToRender.map((s, index) => {
                  const isTopThree = s.rank !== undefined && s.rank <= 3;
                  return (
                    <tr
                      key={`std_${s.id || 'item'}_${index}`}
                      className={`group hover:bg-slate-50/80 transition ${
                        isTopThree ? 'bg-amber-50/20' : ''
                      }`}
                    >
                      {/* Sticky Index Column */}
                      <td className="py-2.5 px-2 border-r border-slate-200 font-medium text-slate-500 sticky left-0 z-10 bg-white group-hover:bg-slate-50 w-12 print:static print:border-slate-400">
                        {index + 1}
                      </td>

                      {/* Sticky Name Column */}
                      <td className="py-2.5 px-3 border-r border-slate-200 text-left font-bold text-slate-900 sticky left-12 z-10 bg-white group-hover:bg-slate-50 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] min-w-[240px] print:static print:shadow-none print:border-slate-400">
                        {canEdit ? (
                          <input
                            type="text"
                            value={s.name}
                            onChange={(e) => handleInfoChange(s, 'name', e.target.value)}
                            className="w-full bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-600 focus:bg-white px-1 py-0.5 rounded text-[12pt] outline-none font-bold text-slate-900 leading-normal"
                          />
                        ) : (
                          <span className="text-[12pt] font-bold text-slate-900 leading-normal">{s.name}</span>
                        )}
                      </td>

                      {/* Age */}
                      <td className="py-2.5 px-1 border-r border-slate-200">
                        {canEdit ? (
                          <select
                            value={s.age || ''}
                            onChange={(e) => handleInfoChange(s, 'age', e.target.value)}
                            className="bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-600 focus:bg-white px-0.5 py-0.5 rounded text-xs outline-none font-bold text-slate-800 text-center cursor-pointer"
                          >
                            <option value="">-</option>
                            {Array.from({ length: 14 }, (_, i) => i + 4).map((a) => (
                              <option key={`opt_age_${a}`} value={String(a)}>
                                {a}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span>{s.age}</span>
                        )}
                      </td>

                      {/* Gender */}
                      <td className="py-2.5 px-1 border-r border-slate-200">
                        {canEdit ? (
                          <select
                            value={s.gender || ''}
                            onChange={(e) => handleInfoChange(s, 'gender', e.target.value)}
                            className="bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-600 rounded px-1 py-0.5 text-xs outline-none font-bold"
                          >
                            <option value="ወ">ወንድ (ወ)</option>
                            <option value="ሴ">ሴት (ሴ)</option>
                            <option value="">-</option>
                          </select>
                        ) : (
                          <span
                            className={`font-semibold ${
                              s.gender === 'ወ'
                                ? 'text-blue-600'
                                : s.gender === 'ሴ'
                                ? 'text-rose-600'
                                : 'text-slate-400'
                            }`}
                          >
                            {s.gender === 'ወ' ? 'ወ' : s.gender === 'ሴ' ? 'ሴ' : '-'}
                          </span>
                        )}
                      </td>

                      {/* Assessments 1 - 7 with Keyboard Arrow Navigation and Zero-score Blanking */}
                      {assessmentsConfig.map((ass, colIdx) => {
                        const val = s[ass.key];
                        const displayVal = val && Number(val) > 0 ? val : '';
                        return (
                          <td key={ass.key} className={`py-2 px-1 border-r border-slate-200 ${ass.bg}`}>
                            <input
                              id={`score-input-${index}-${colIdx}`}
                              type="number"
                              value={displayVal}
                              placeholder=""
                              disabled={!canEdit}
                              onFocus={(e) => e.target.select()}
                              onKeyDown={(e) => handleKeyDown(e, index, colIdx)}
                              onChange={(e) => handleScoreChange(s, ass.key, e.target.value, ass.max)}
                              className={`w-12 text-center py-1.5 rounded-lg border border-slate-300 ${ass.inputFocus} focus:bg-white focus:ring-2 focus:ring-blue-400 focus:outline-none disabled:bg-transparent disabled:border-transparent font-bold text-slate-900 text-xs transition`}
                              min="0"
                              max={ass.max}
                            />
                          </td>
                        );
                      })}

                      {/* Total */}
                      <td className="py-2.5 px-2 border-r border-slate-200 font-extrabold text-sm text-slate-900 bg-slate-100/60">
                        {s.hasAnyScore ? s.total : '-'}
                      </td>

                      {/* Rank */}
                      <td className="py-2.5 px-2 border-r border-slate-200 font-semibold">
                        {s.rank !== undefined ? (
                          isTopThree ? (
                            <span
                              className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full font-bold text-xs ${
                                s.rank === 1
                                  ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                  : s.rank === 2
                                  ? 'bg-slate-200 text-slate-800 border border-slate-300'
                                  : 'bg-orange-100 text-orange-800 border border-orange-300'
                              }`}
                            >
                              <Award className="w-3 h-3" />
                              {s.rank}ኛ
                            </span>
                          ) : (
                            <span className="text-slate-600 font-medium">{s.rank}ኛ</span>
                          )
                        ) : (
                          <span className="text-slate-400 font-normal">-</span>
                        )}
                      </td>

                      {/* Actions: Clear student scores or delete student */}
                      {currentUserRole !== 'leader' && (
                        <td className="py-2.5 px-2 print:hidden">
                          {canEdit ? (
                            <div className="flex items-center justify-center gap-1">
                              {s.hasAnyScore && (
                                <button
                                  type="button"
                                  onClick={() => handleClearStudentScores(s)}
                                  className="text-amber-600 hover:text-amber-800 p-1 rounded hover:bg-amber-50 transition"
                                  title="የተማሪውን ውጤት አጽዳ (ደልት)"
                                >
                                  <Eraser className="w-3.5 h-3.5" />
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => {
                                  if (confirm(`"${s.name}" የተባለውን ተማሪ ከመዝገብ ሙሉ በሙሉ መሰረዝ ይፈልጋሉ?`)) {
                                    onDeleteStudent(s.id);
                                  }
                                }}
                                className="text-rose-600 hover:text-rose-800 p-1 rounded hover:bg-rose-50 transition"
                                title="ተማሪ ሰርዝ"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>


      {/* Printable Signature Section */}
      <div className="hidden print:flex justify-between pt-10 text-xs font-semibold text-slate-800">
        <div>
          <p>የክፍሉ መምህር ስም፦ _______________________</p>
          <p className="mt-2">ፊርማ፦ _________________ ቀን፦ ___________</p>
        </div>
        <div>
          <p>የሰንበት ት/ቤት አስተባባሪ፦ ___________________</p>
          <p className="mt-2">ፊርማ፦ _________________ ቀን፦ ___________</p>
        </div>
      </div>

      {/* Add Student Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900 mb-1">አዲስ ተማሪ መዝግብ</h3>
            <p className="text-xs text-slate-500 mb-4">ክፍል፦ {selectedClass}</p>

            <form onSubmit={handleAddSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  የተማሪው ሙሉ ስም፦
                </label>
                <input
                  type="text"
                  value={newStudentName}
                  onChange={(e) => setNewStudentName(e.target.value)}
                  placeholder="የተማሪውን ሙሉ ስም ያስገቡ"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-600"
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    ዕድሜ፦
                  </label>
                  <select
                    value={newStudentAge}
                    onChange={(e) => setNewStudentAge(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-600 bg-white font-bold cursor-pointer"
                  >
                    <option value="">- ይምረጡ -</option>
                    {Array.from({ length: 14 }, (_, i) => i + 4).map((a) => (
                      <option key={`opt_modal_age_${a}`} value={String(a)}>
                        {a} ዓመት
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    ፆታ፦
                  </label>
                  <select
                    value={newStudentGender}
                    onChange={(e) => setNewStudentGender(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-600 bg-white"
                  >
                    <option value="ወ">ወንድ (ወ)</option>
                    <option value="ሴ">ሴት (ሴ)</option>
                    <option value="">-</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-xl font-medium"
                >
                  ሰርዝ
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs bg-blue-800 hover:bg-blue-700 text-white rounded-xl font-semibold shadow"
                >
                  መዝግብ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Subject Picker Modal for Current Class */}
      {showSubjectModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-1">
              ለ{selectedClass} የትምህርት ዓይነቶች መምረጫ
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              ይህ ክፍል የሚማራቸውን ትምህርቶች ይምረጡ ወይም ምልክት (Check) ያድርጉ
            </p>

            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {subjects.map((sub) => {
                const currentList = classSubjects[selectedClass] || [];
                const isChecked = currentList.includes(sub);
                return (
                  <button
                    key={sub}
                    type="button"
                    disabled={!canEdit}
                    onClick={() => {
                      if (!onUpdateClassSubjects) return;
                      const next = isChecked
                        ? currentList.filter((s) => s !== sub)
                        : [...currentList, sub];
                      onUpdateClassSubjects({
                        ...classSubjects,
                        [selectedClass]: next
                      });
                    }}
                    className={`w-full flex items-center justify-between p-3 rounded-xl border text-xs font-semibold transition ${
                      isChecked
                        ? 'bg-blue-50 border-blue-300 text-blue-900'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <span>{sub}</span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        isChecked ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {isChecked ? 'ተመርጧል' : 'አልተመረጠም'}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="flex justify-end gap-2 pt-4 mt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowSubjectModal(false)}
                className="px-4 py-2 text-xs bg-blue-900 hover:bg-blue-800 text-white rounded-xl font-bold shadow"
              >
                እሺ / ተጠናቋል
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Excel / CSV Import Confirmation & Preview Modal */}
      {importPreview && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-4 sm:p-6 shadow-2xl border border-slate-200 flex flex-col max-h-[90vh] my-auto animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100 shrink-0">
              <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700 shrink-0">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-base font-bold text-slate-900 truncate">
                  የተማሪዎች መጫኛ ማረጋገጫ (Excel/CSV)
                </h3>
                <p className="text-xs text-slate-500 truncate">
                  ፋይል፦ <span className="font-semibold text-slate-700">{importPreview.fileName}</span> (በድምሩ {importPreview.totalStudents} ተማሪዎች)
                </p>
              </div>
            </div>

            <div className="py-3 space-y-3.5 overflow-y-auto max-h-[58vh] pr-1 scrollbar-thin">
              {/* Classes Breakdown */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  በፋይሉ ውስጥ የተገኙ ክፍሎች ({importPreview.classesSummary.length})፦
                </label>
                <div className="grid grid-cols-2 gap-2 max-h-36 overflow-y-auto p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                  {importPreview.classesSummary.map((item) => {
                    const isCurrent = item.className === selectedClass;
                    return (
                      <div
                        key={item.className}
                        className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg border ${
                          isCurrent
                            ? 'bg-blue-50 border-blue-300 text-blue-900 font-bold'
                            : 'bg-white border-slate-200 text-slate-700'
                        }`}
                      >
                        <span className="truncate">{item.className}</span>
                        <span className="text-[11px] font-semibold text-slate-500">
                          {item.count} ተማሪ
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Import Target Choice */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700">
                  የመጫኛ አማራጭ ይምረጡ፦
                </label>

                {/* Option 1: Load all students into selected class */}
                <label
                  onClick={() => setImportMode('all_into_selected')}
                  className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition ${
                    importMode === 'all_into_selected'
                      ? 'bg-emerald-50/80 border-emerald-400 text-emerald-950 font-semibold'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="importMode"
                    checked={importMode === 'all_into_selected'}
                    onChange={() => setImportMode('all_into_selected')}
                    className="mt-0.5"
                  />
                  <div>
                    <div className="text-xs font-bold text-emerald-900">
                      ✓ በፋይሉ ውስጥ ያሉትን ሁሉንም ({importPreview.totalStudents}) ተማሪዎች ወደ "{selectedClass}" ጫን
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      በፋይሉ ውስጥ ያለው ክፍል ስም ልዩነት ቢኖረውም እንኳን ሁሉም ተማሪዎች ወደ {selectedClass} ገብተው እንዲመዘገቡ ያደርጋል።
                    </div>
                  </div>
                </label>

                {/* Option 2: Distribute across all classes */}
                {importPreview.isMultiClass && currentUserRole !== 'teacher' && (
                  <label
                    onClick={() => setImportMode('all_classes')}
                    className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition ${
                      importMode === 'all_classes'
                        ? 'bg-blue-50/70 border-blue-400 text-blue-950'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="importMode"
                      checked={importMode === 'all_classes'}
                      onChange={() => setImportMode('all_classes')}
                      className="mt-0.5"
                    />
                    <div>
                      <div className="text-xs font-bold">
                        በፋይሉ ውስጥ ባለው የክፍል ስም መሠረት በየክፍላቸው መድብ ({importPreview.classesSummary.length} ክፍሎች)
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        እያንዳንዱ ተማሪ ለተመደበበት ትክክለኛ ክፍል ብቻ ይገባል።
                      </div>
                    </div>
                  </label>
                )}

                {/* Option 3: Only students matched to selected class */}
                {importPreview.selectedClassCount > 0 && importPreview.selectedClassCount < importPreview.totalStudents && (
                  <label
                    onClick={() => setImportMode('selected_only')}
                    className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition ${
                      importMode === 'selected_only'
                        ? 'bg-blue-50/70 border-blue-400 text-blue-950'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="importMode"
                      checked={importMode === 'selected_only'}
                      onChange={() => setImportMode('selected_only')}
                      className="mt-0.5"
                    />
                    <div>
                      <div className="text-xs font-bold">
                        ለ"{selectedClass}" ብቻ የተለዩትን ({importPreview.selectedClassCount}) ተማሪዎች ጫን
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        ከፋይሉ ውስጥ የ{selectedClass} ስም ያለባቸው ተማሪዎች ብቻ ይገባሉ።
                      </div>
                    </div>
                  </label>
                )}
              </div>

              {/* Append vs Replace Choice */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                <div className="text-xs font-bold text-slate-700">ነባር መረጃን በተመለከተ፦</div>
                <div className="flex flex-col sm:flex-row gap-3 pt-1">
                  <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                    <input
                      type="radio"
                      name="replaceMode"
                      checked={!replaceExisting}
                      onChange={() => setReplaceExisting(false)}
                    />
                    <span>ካሉት ተማሪዎች ጋር ጨምር (Append)</span>
                  </label>
                  <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                    <input
                      type="radio"
                      name="replaceMode"
                      checked={replaceExisting}
                      onChange={() => setReplaceExisting(true)}
                    />
                    <span className="text-rose-700 font-semibold">የነበሩትን አጽድተህ ተካ (Replace)</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 shrink-0 mt-auto">
              <button
                type="button"
                onClick={() => setImportPreview(null)}
                className="px-4 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-xl font-medium"
              >
                ሰርዝ
              </button>
              <button
                type="button"
                onClick={confirmImport}
                className="px-5 py-2 text-xs bg-teal-700 hover:bg-teal-600 text-white rounded-xl font-bold shadow flex items-center gap-1.5 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                አሁን ጫን
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Batch Add Modal: Paste student roster directly into this class */}
      {showBatchAddModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-700">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  ተማሪዎችን በአንድነት አስገባ (Batch Paste)
                </h3>
                <p className="text-xs text-slate-500">
                  ክፍል፦ <span className="font-bold text-slate-800">{selectedClass}</span>
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
                      name="batchGenderClass"
                      checked={batchDefaultGender === 'ወ'}
                      onChange={() => setBatchDefaultGender('ወ')}
                    />
                    <span className="font-bold text-blue-700">ወንድ (ወ)</span>
                  </label>
                  <label className="flex items-center gap-1 cursor-pointer">
                    <input
                      type="radio"
                      name="batchGenderClass"
                      checked={batchDefaultGender === 'ሴ'}
                      onChange={() => setBatchDefaultGender('ሴ')}
                    />
                    <span className="font-bold text-rose-700">ሴት (ሴ)</span>
                  </label>
                  <label className="flex items-center gap-1 cursor-pointer">
                    <input
                      type="radio"
                      name="batchGenderClass"
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
                    <option key={`batch_age_opt_${a}`} value={String(a)}>
                      {a} ዓመት
                    </option>
                  ))}
                </select>
              </div>

              <p className="text-[11px] text-slate-500">
                💡 <strong>ጠቃሚ ማስታወሻ፦</strong> ከ Word፣ Excel ወይም ከሌላ ማስታወሻ የተማሪዎች ስም ኮፒ አድርገው እዚህ በመለጠፍ በአንድ ቅጽበት ወደ {selectedClass} ማስገባት ይችላሉ።
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

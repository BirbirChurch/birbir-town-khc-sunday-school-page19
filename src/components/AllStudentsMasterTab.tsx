import React, { useState, useMemo, useEffect } from 'react';
import {
  Users,
  Search,
  Printer,
  Download,
  FileSpreadsheet,
  Filter,
  ArrowUpDown,
  Plus,
  Trash2,
  Edit2,
  ExternalLink,
  UserCheck,
  Music,
  BookOpen,
  Award,
  ChevronRight,
  RefreshCw,
  Check,
  X,
  Church,
  Phone,
  PhoneCall,
  Copy
} from 'lucide-react';
import { Student, Teacher, ChoirMember, SpiritualMember, Role, ChurchChild } from '../types';
import { downloadCSV, downloadXLSX } from '../utils/csv';
import { DEFAULT_CHAPELS } from '../constants/initialData';

interface AllStudentsMasterTabProps {
  currentYear: string;
  classList: string[];
  teachers: Teacher[];
  studentsByClass: { [className: string]: Student[] };
  choirMembers: ChoirMember[];
  spiritualMembers: SpiritualMember[];
  churchChildren?: ChurchChild[];
  chapelList?: string[];
  onUpdateStudent: (student: Student) => void;
  onAddStudentToClass: (targetClass: string, student: Omit<Student, 'id'>) => void;
  onDeleteStudent: (studentId: number | string) => void;
  onMoveStudentClass?: (studentId: number | string, sourceClass: string, targetClass: string) => void;
  onGoToClass?: (className: string) => void;
  currentUserRole: Role | null;
}

interface EnrichedStudent extends Student {
  className: string;
  teacherName: string;
  choirGroup?: string;
  spiritualGroup?: string;
  hasScore: boolean;
  totalScore: number;
  chapel?: string;
  parentName?: string;
  parentPhone?: string;
}

export const AllStudentsMasterTab: React.FC<AllStudentsMasterTabProps> = ({
  currentYear,
  classList,
  teachers,
  studentsByClass,
  choirMembers,
  spiritualMembers,
  churchChildren = [],
  chapelList = DEFAULT_CHAPELS,
  onUpdateStudent,
  onAddStudentToClass,
  onDeleteStudent,
  onMoveStudentClass,
  onGoToClass,
  currentUserRole
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>('all');
  const [selectedChapelFilter, setSelectedChapelFilter] = useState<string>('all');
  const [selectedGenderFilter, setSelectedGenderFilter] = useState<string>('all');
  const [selectedServiceFilter, setSelectedServiceFilter] = useState<'all' | 'choir' | 'spiritual' | 'both'>('all');
  const [sortBy, setSortBy] = useState<'class' | 'name' | 'score' | 'age'>('class');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [isPrinting, setIsPrinting] = useState(false);
  const [copiedPhoneId, setCopiedPhoneId] = useState<string | number | null>(null);

  const handleCopyPhone = (id: string | number, phone: string) => {
    if (!phone || phone === '-') return;
    navigator.clipboard.writeText(phone);
    setCopiedPhoneId(id);
    setTimeout(() => setCopiedPhoneId(null), 2000);
  };

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState<EnrichedStudent | null>(null);
  const [movingStudent, setMovingStudent] = useState<EnrichedStudent | null>(null);
  const [targetMoveClass, setTargetMoveClass] = useState<string>(classList[0] || '');

  // Add form state
  const [newName, setNewName] = useState('');
  const [newClass, setNewClass] = useState(classList[3] || classList[0] || '');
  const [newGender, setNewGender] = useState<string>('ወ');
  const [newAge, setNewAge] = useState<string>('8');

  // Edit form state
  const [editName, setEditName] = useState('');
  const [editGender, setEditGender] = useState('');
  const [editAge, setEditAge] = useState('');

  // Handle window beforeprint/afterprint
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

  // Union of all class names from CLASS_LIST and any existing keys in studentsByClass
  const allClasses = useMemo(() => {
    const set = new Set(classList);
    Object.keys(studentsByClass).forEach((c) => set.add(c));
    return Array.from(set);
  }, [classList, studentsByClass]);

  // Aggregate all registered students across all classes with enrichment
  const allMasterStudents: EnrichedStudent[] = useMemo(() => {
    const result: EnrichedStudent[] = [];

    // Map choir and spiritual lookups for fast access
    const choirMap = new Map<string, string>();
    choirMembers.forEach((m) => {
      if (m.name) choirMap.set(m.name.trim().toLowerCase(), m.group);
    });

    const spiritualMap = new Map<string, string>();
    spiritualMembers.forEach((m) => {
      if (m.name) spiritualMap.set(m.name.trim().toLowerCase(), m.group);
    });

    const teacherMap = new Map<string, string>();
    teachers.forEach((t) => {
      if (t.assignedClass) teacherMap.set(t.assignedClass, t.name);
    });

    // Cross-reference map from Church Children database
    const normalizeAmharic = (str: string) =>
      (str || '')
        .trim()
        .toLowerCase()
        .replace(/\s+/g, ' ')
        .replace(/[ሐኀ]/g, 'ሀ')
        .replace(/ሠ/g, 'ሰ')
        .replace(/ፀ/g, 'ጸ')
        .replace(/ዐ/g, 'አ');

    const churchChildMap = new Map<string, ChurchChild>();
    (churchChildren || []).forEach((c) => {
      if (c.name) {
        churchChildMap.set(c.name.trim().toLowerCase(), c);
        churchChildMap.set(normalizeAmharic(c.name), c);
      }
    });

    allClasses.forEach((cName) => {
      const list = studentsByClass[cName] || [];
      const teacherName = teacherMap.get(cName) || 'ልዩ አልተመደበም';

      list.forEach((s) => {
        const cleanName = (s.name || '').trim().toLowerCase();
        const normName = normalizeAmharic(s.name);
        const choirGroup = choirMap.get(cleanName);
        const spiritualGroup = spiritualMap.get(cleanName);

        // Lookup from Church Children repository
        const matchedChild = churchChildMap.get(cleanName) || churchChildMap.get(normName);
        const chapel = s.chapel || matchedChild?.chapel || 'ዋናው ማዕከል ቻፕል';
        const parentName = s.parentName || matchedChild?.parentName || '-';
        const parentPhone = s.phone || matchedChild?.phone || '-';

        const m1 = Number(s.m1) || 0;
        const m2 = Number(s.m2) || 0;
        const m3 = Number(s.m3) || 0;
        const m4 = Number(s.m4) || 0;
        const m5 = Number(s.m5) || 0;
        const m6 = Number(s.m6) || 0;
        const m7 = Number(s.m7) || 0;
        const totalScore = m1 + m2 + m3 + m4 + m5 + m6 + m7;
        const hasScore = m1 > 0 || m2 > 0 || m3 > 0 || m4 > 0 || m5 > 0 || m6 > 0 || m7 > 0;

        result.push({
          ...s,
          className: cName,
          teacherName,
          choirGroup,
          spiritualGroup,
          hasScore,
          totalScore,
          chapel,
          parentName,
          parentPhone
        });
      });
    });

    return result;
  }, [allClasses, studentsByClass, teachers, choirMembers, spiritualMembers, churchChildren]);

  // High-level statistics
  const stats = useMemo(() => {
    const total = allMasterStudents.length;
    const male = allMasterStudents.filter((s) => s.gender === 'ወ').length;
    const female = allMasterStudents.filter((s) => s.gender === 'ሴ').length;
    const unspecified = allMasterStudents.filter((s) => s.gender !== 'ወ' && s.gender !== 'ሴ').length;
    const inChoir = allMasterStudents.filter((s) => s.choirGroup).length;
    const inSpiritual = allMasterStudents.filter((s) => s.spiritualGroup).length;

    // Per-class stats
    const classStats = allClasses.map((cName) => {
      const classStudents = studentsByClass[cName] || [];
      const cMale = classStudents.filter((s) => s.gender === 'ወ').length;
      const cFemale = classStudents.filter((s) => s.gender === 'ሴ').length;
      const teacher = teachers.find((t) => t.assignedClass === cName);
      return {
        className: cName,
        total: classStudents.length,
        male: cMale,
        female: cFemale,
        teacherName: teacher ? teacher.name : 'ያልተመደበ'
      };
    });

    const activeClasses = classStats.filter((c) => c.total > 0).length;

    return {
      total,
      male,
      female,
      unspecified,
      inChoir,
      inSpiritual,
      activeClasses,
      classStats
    };
  }, [allMasterStudents, allClasses, studentsByClass, teachers]);

  // Filtered & Sorted Students
  const filteredStudents = useMemo(() => {
    let result = [...allMasterStudents];

    // Filter by Class
    if (selectedClassFilter !== 'all') {
      result = result.filter((s) => s.className === selectedClassFilter);
    }

    // Filter by Gender
    if (selectedGenderFilter === 'ወ') {
      result = result.filter((s) => s.gender === 'ወ');
    } else if (selectedGenderFilter === 'ሴ') {
      result = result.filter((s) => s.gender === 'ሴ');
    } else if (selectedGenderFilter === 'none') {
      result = result.filter((s) => s.gender !== 'ወ' && s.gender !== 'ሴ');
    }

    // Filter by Service
    if (selectedServiceFilter === 'choir') {
      result = result.filter((s) => !!s.choirGroup);
    } else if (selectedServiceFilter === 'spiritual') {
      result = result.filter((s) => !!s.spiritualGroup);
    } else if (selectedServiceFilter === 'both') {
      result = result.filter((s) => !!s.choirGroup && !!s.spiritualGroup);
    }

    // Filter by Chapel
    if (selectedChapelFilter !== 'all') {
      result = result.filter((s) => (s.chapel || 'ዋናው ማዕከል ቻፕል') === selectedChapelFilter);
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (s) =>
          (s.name && s.name.toLowerCase().includes(q)) ||
          (s.className && s.className.toLowerCase().includes(q)) ||
          (s.teacherName && s.teacherName.toLowerCase().includes(q)) ||
          (s.chapel && s.chapel.toLowerCase().includes(q)) ||
          (s.parentPhone && s.parentPhone.toLowerCase().includes(q)) ||
          (s.parentName && s.parentName.toLowerCase().includes(q)) ||
          (s.choirGroup && s.choirGroup.toLowerCase().includes(q)) ||
          (s.spiritualGroup && s.spiritualGroup.toLowerCase().includes(q))
      );
    }

    // Sorting
    result.sort((a, b) => {
      if (sortBy === 'class') {
        const classIndexA = classList.indexOf(a.className);
        const classIndexB = classList.indexOf(b.className);
        const diff = (classIndexA === -1 ? 999 : classIndexA) - (classIndexB === -1 ? 999 : classIndexB);
        if (diff !== 0) return sortOrder === 'asc' ? diff : -diff;
        return a.name.localeCompare(b.name, 'am');
      } else if (sortBy === 'name') {
        const cmp = a.name.localeCompare(b.name, 'am');
        return sortOrder === 'asc' ? cmp : -cmp;
      } else if (sortBy === 'score') {
        const diff = (b.totalScore || 0) - (a.totalScore || 0);
        return sortOrder === 'asc' ? -diff : diff;
      } else if (sortBy === 'age') {
        const ageA = Number(a.age) || 0;
        const ageB = Number(b.age) || 0;
        const diff = ageA - ageB;
        return sortOrder === 'asc' ? diff : -diff;
      }
      return 0;
    });

    return result;
  }, [allMasterStudents, selectedClassFilter, selectedGenderFilter, selectedServiceFilter, selectedChapelFilter, searchQuery, sortBy, sortOrder, classList]);

  // When printing, we include all filtered students (or all students if search was clear)
  const studentsToRender = useMemo(() => {
    if (isPrinting) {
      // If user had a specific class filter selected, respect that; otherwise print the full master roster
      if (selectedClassFilter === 'all') return allMasterStudents;
      return allMasterStudents.filter((s) => s.className === selectedClassFilter);
    }
    return filteredStudents;
  }, [isPrinting, filteredStudents, allMasterStudents, selectedClassFilter]);

  // Handle Add Student Submit
  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) {
      alert('እባክዎን የተማሪውን ስም ያስገቡ!');
      return;
    }
    onAddStudentToClass(newClass, {
      name: newName.trim(),
      gender: newGender,
      age: newAge || '8',
      m1: 0,
      m2: 0,
      m3: 0,
      m4: 0,
      m5: 0,
      m6: 0,
      m7: 0
    });
    setNewName('');
    setShowAddModal(false);
  };

  // Handle Edit Student
  const handleOpenEdit = (student: EnrichedStudent) => {
    setEditingStudent(student);
    setEditName(student.name);
    setEditGender(student.gender || '');
    setEditAge(String(student.age || ''));
  };

  const handleEditSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent || !editName.trim()) return;

    onUpdateStudent({
      ...editingStudent,
      name: editName.trim(),
      gender: editGender,
      age: editAge || editingStudent.age
    });

    setEditingStudent(null);
  };

  // Handle Move Class
  const handleOpenMove = (student: EnrichedStudent) => {
    setMovingStudent(student);
    setTargetMoveClass(classList[0] || '');
  };

  const handleMoveSubmit = () => {
    if (!movingStudent || !onMoveStudentClass) return;
    if (movingStudent.className === targetMoveClass) {
      alert('ተማሪው ቀድሞውኑ በዚህ ክፍል ውስጥ ነው የሚገኘው!');
      return;
    }
    onMoveStudentClass(movingStudent.id, movingStudent.className, targetMoveClass);
    setMovingStudent(null);
  };

  // Handle Delete Student
  const handleDelete = (student: EnrichedStudent) => {
    if (window.confirm(`ተማሪ "${student.name}" ከ${student.className} ሙሉ በሙሉ እንዲሰረዝ ይፈልጋሉ?`)) {
      onDeleteStudent(student.id);
    }
  };

  // Export to Excel (XLSX)
  const handleExportExcel = () => {
    const headers = [
      'ተ.ቁ',
      'የተማሪው ሙሉ ስም',
      'ክፍል / ደረጃ',
      'ቻፕል (አጥቢያ ማዕከል)',
      'የወላጅ ስም',
      'የወላጅ ስልክ ቁጥር',
      'ጾታ',
      'ዕድሜ',
      'የክፍሉ መምህር',
      'ምዘና 1 (10)',
      'ምዘና 2 (10)',
      'ምዘና 3 (10)',
      'ምዘና 4 (20)',
      'ምዘና 5 (10)',
      'ምዘና 6 (10)',
      'ምዘና 7 (30)',
      'ጠቅላላ ውጤት (100)',
      'የመዘምራን ቡድን',
      'የመንፈሳዊ ትምህርት ቡድን'
    ];

    const rows = filteredStudents.map((s, idx) => [
      idx + 1,
      s.name,
      s.className,
      s.chapel || 'ዋናው ማዕከል ቻፕል',
      s.parentName || '-',
      s.parentPhone || '-',
      s.gender === 'ወ' ? 'ወንድ' : s.gender === 'ሴ' ? 'ሴት' : '-',
      s.age || '-',
      s.teacherName,
      s.m1 ?? 0,
      s.m2 ?? 0,
      s.m3 ?? 0,
      s.m4 ?? 0,
      s.m5 ?? 0,
      s.m6 ?? 0,
      s.m7 ?? 0,
      s.totalScore ?? 0,
      s.choirGroup || '-',
      s.spiritualGroup || '-'
    ]);

    const data = [headers, ...rows];
    downloadXLSX(data, `የብርብር_ቃለሕይወት_ጠቅላላ_ተማሪዎች_ማስተር_${currentYear}ዓም.xlsx`, 'ጠቅላላ ተማሪዎች ማስተር');
  };

  // Export to CSV
  const handleExportCSV = () => {
    let csv = `\uFEFFተ.ቁ,የተማሪው ሙሉ ስም,ክፍል,ቻፕል,የወላጅ ስም,የወላጅ ስልክ,ጾታ,ዕድሜ,መምህር,ጠቅላላ ውጤት,መዘምራን ቡድን,መንፈሳዊ ቡድን\n`;
    filteredStudents.forEach((s, idx) => {
      const g = s.gender === 'ወ' ? 'ወንድ' : s.gender === 'ሴ' ? 'ሴት' : '-';
      csv += `${idx + 1},"${s.name}","${s.className}","${s.chapel || 'ዋናው ማዕከል ቻፕል'}","${s.parentName || '-'}","${s.parentPhone || '-'}","${g}","${s.age || '-'}","${s.teacherName}",${s.totalScore ?? 0},"${s.choirGroup || '-'}","${s.spiritualGroup || '-'}"\n`;
    });
    downloadCSV(csv, `የብርብር_ቃለሕይወት_ጠቅላላ_ተማሪዎች_ማስተር_${currentYear}ዓም.csv`);
  };

  // Print Action
  const handleTriggerPrint = () => {
    setIsPrinting(true);
    setTimeout(() => {
      window.print();
    }, 120);
  };

  return (
    <div className="space-y-6">
      {/* Printable Sheet Header (Prints automatically on PDF / printer) */}
      <div className="hidden print:block text-center pb-4 mb-4 border-b-2 border-slate-800">
        <h1 className="text-2xl font-extrabold text-black">የብርብር ከተማ ቃለ ሕይወት ቤተክርስቲያን</h1>
        <h2 className="text-lg font-bold text-slate-800 mt-1">
          የልጆች አገልግሎት ዘርፍ - የ{currentYear} ዓ.ም የተመዘገቡ ጠቅላላ ተማሪዎች ማስተር መዝገብ
        </h2>
        <div className="flex justify-between items-center text-xs mt-3 px-4 font-semibold border-t border-slate-300 pt-2">
          <span>ጠቅላላ ተማሪዎች፦ {stats.total}</span>
          <span>ወንድ፦ {stats.male} ({stats.total > 0 ? ((stats.male / stats.total) * 100).toFixed(0) : 0}%)</span>
          <span>ሴት፦ {stats.female} ({stats.total > 0 ? ((stats.female / stats.total) * 100).toFixed(0) : 0}%)</span>
          <span>ያልተገለጸ ጾታ፦ {stats.unspecified}</span>
          <span>ተማሪ ያላቸው ክፍሎች፦ {stats.activeClasses}</span>
        </div>
      </div>

      {/* Top Banner & Title (Screen only) */}
      <div className="bg-gradient-to-r from-blue-950 via-indigo-900 to-slate-900 rounded-3xl p-6 sm:p-7 text-white shadow-lg border border-blue-800/50 print:hidden">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-amber-400/20 border border-amber-300/40 flex items-center justify-center text-amber-300 shadow-inner shrink-0">
              <Users className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="bg-amber-400 text-blue-950 text-[11px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wide">
                  የአስተባባሪ ገጽ ማስተር
                </span>
                <span className="text-blue-200 text-xs font-medium">የ{currentYear} ዓ.ም ትምህርት ዘመን</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight mt-1">
                የተመዘገቡ ጠቅላላ ተማሪዎች ማስተር ገጽ
              </h1>
              <p className="text-blue-200 text-xs sm:text-sm mt-1 max-w-2xl">
                በሁሉም የሰንበት ት/ቤት ክፍሎች የተመዘገቡ ተማሪዎችን በአንድ ላይ የሚያሳይ፣ በጾታና በክፍል የሚያጠቃልል፣ 
                ለዋና አስተባባሪ የተዘጋጀ ማስተር ሪፖርትና መቆጣጠሪያ።
              </p>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-2.5 flex-wrap self-stretch md:self-auto justify-end">
            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-2.5 rounded-xl text-xs transition flex items-center gap-2 shadow-md cursor-pointer hover:scale-[1.02] active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>➕ አዲስ ተማሪ መዝግብ</span>
            </button>
            <button
              type="button"
              onClick={handleTriggerPrint}
              className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-4 py-2.5 rounded-xl text-xs transition flex items-center gap-2 shadow-md cursor-pointer hover:scale-[1.02] active:scale-95"
              title="ሁሉንም ተማሪዎች በPDF ወይም በፕሪንተር ያትሙ"
            >
              <Printer className="w-4 h-4" />
              <span>🖨️ በፕሪንተር / PDF አውርድ</span>
            </button>
            <button
              type="button"
              onClick={handleExportExcel}
              className="bg-teal-700 hover:bg-teal-600 text-white font-bold px-3.5 py-2.5 rounded-xl text-xs transition flex items-center gap-1.5 shadow-md cursor-pointer"
              title="ሁሉንም የተመዘገቡ ተማሪዎች ወደ Excel ፋይል ያውርዱ"
            >
              <FileSpreadsheet className="w-4 h-4 text-teal-200" />
              <span>Excel</span>
            </button>
            <button
              type="button"
              onClick={handleExportCSV}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold px-3.5 py-2.5 rounded-xl text-xs transition flex items-center gap-1.5 border border-slate-700 shadow"
              title="CSV ፋይል ያውርዱ"
            >
              <Download className="w-4 h-4" />
              <span>CSV</span>
            </button>
          </div>
        </div>

        {/* High-Level KPI Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-6 pt-6 border-t border-blue-800/50">
          {/* Card 1: Total */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3.5 border border-white/15 flex flex-col justify-between">
            <span className="text-[11px] font-semibold text-blue-200">ጠቅላላ ተማሪዎች</span>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-2xl sm:text-3xl font-extrabold text-white">{stats.total}</span>
              <span className="text-[11px] text-emerald-300 font-bold">100%</span>
            </div>
          </div>

          {/* Card 2: Male */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3.5 border border-white/15 flex flex-col justify-between">
            <span className="text-[11px] font-semibold text-blue-200 flex items-center gap-1">
              <span>ወንድ ተማሪዎች</span>
            </span>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-2xl sm:text-3xl font-extrabold text-cyan-300">{stats.male}</span>
              <span className="text-[11px] text-cyan-200 font-bold">
                {stats.total > 0 ? ((stats.male / stats.total) * 100).toFixed(0) : 0}%
              </span>
            </div>
          </div>

          {/* Card 3: Female */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3.5 border border-white/15 flex flex-col justify-between">
            <span className="text-[11px] font-semibold text-blue-200 flex items-center gap-1">
              <span>ሴት ተማሪዎች</span>
            </span>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-2xl sm:text-3xl font-extrabold text-rose-300">{stats.female}</span>
              <span className="text-[11px] text-rose-200 font-bold">
                {stats.total > 0 ? ((stats.female / stats.total) * 100).toFixed(0) : 0}%
              </span>
            </div>
          </div>

          {/* Card 4: Classes */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3.5 border border-white/15 flex flex-col justify-between">
            <span className="text-[11px] font-semibold text-blue-200">ተማሪ ያላቸው ክፍሎች</span>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-2xl sm:text-3xl font-extrabold text-amber-300">{stats.activeClasses}</span>
              <span className="text-[11px] text-amber-200">ከ {allClasses.length}</span>
            </div>
          </div>

          {/* Card 5: In Choir */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3.5 border border-white/15 flex flex-col justify-between">
            <span className="text-[11px] font-semibold text-blue-200 flex items-center gap-1">
              <Music className="w-3.5 h-3.5 text-amber-300" />
              <span>በመዘምራን የታቀፉ</span>
            </span>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-2xl sm:text-3xl font-extrabold text-emerald-300">{stats.inChoir}</span>
              <span className="text-[11px] text-emerald-200 font-bold">
                {stats.total > 0 ? ((stats.inChoir / stats.total) * 100).toFixed(0) : 0}%
              </span>
            </div>
          </div>

          {/* Card 6: In Spiritual */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3.5 border border-white/15 flex flex-col justify-between">
            <span className="text-[11px] font-semibold text-blue-200 flex items-center gap-1">
              <BookOpen className="w-3.5 h-3.5 text-blue-300" />
              <span>መንፈሳዊ ትምህርት</span>
            </span>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-2xl sm:text-3xl font-extrabold text-violet-300">{stats.inSpiritual}</span>
              <span className="text-[11px] text-violet-200 font-bold">
                {stats.total > 0 ? ((stats.inSpiritual / stats.total) * 100).toFixed(0) : 0}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Class Distribution Quick-Bar (Screen only) */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-sm print:hidden">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
            <h3 className="text-sm font-bold text-slate-800">
              የክፍሎች የተማሪዎች ስርጭት (በክፍል ለመምረጥ ይጫኑ)፦
            </h3>
          </div>
          {selectedClassFilter !== 'all' && (
            <button
              type="button"
              onClick={() => setSelectedClassFilter('all')}
              className="text-xs text-blue-700 hover:text-blue-900 font-bold flex items-center gap-1"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>ሁሉንም ክፍሎች አሳይ</span>
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-2 overflow-x-auto pb-1 max-h-36 overflow-y-auto scrollbar-thin">
          <button
            type="button"
            onClick={() => setSelectedClassFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              selectedClassFilter === 'all'
                ? 'bg-blue-900 text-white shadow'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <span>ሁሉም ክፍሎች</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${selectedClassFilter === 'all' ? 'bg-blue-800 text-amber-300' : 'bg-slate-200 text-slate-800'}`}>
              {stats.total}
            </span>
          </button>

          {stats.classStats.map((cs) => {
            const isSelected = selectedClassFilter === cs.className;
            return (
              <button
                key={cs.className}
                type="button"
                onClick={() => setSelectedClassFilter(cs.className)}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-blue-900 text-white shadow'
                    : cs.total > 0
                    ? 'bg-blue-50 text-blue-900 hover:bg-blue-100 border border-blue-200/60'
                    : 'bg-slate-50 text-slate-400 border border-slate-200/50'
                }`}
                title={`መምህር፦ ${cs.teacherName} | ወንድ፦ ${cs.male} | ሴት፦ ${cs.female}`}
              >
                <span>{cs.className}</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                    isSelected
                      ? 'bg-blue-800 text-amber-300'
                      : cs.total > 0
                      ? 'bg-blue-200/80 text-blue-900'
                      : 'bg-slate-200 text-slate-500'
                  }`}
                >
                  {cs.total}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Search & Comprehensive Filters Bar (Screen only) */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-sm print:hidden">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="በተማሪ ስም፣ ክፍል፣ መምህር፣ ወይም የአገልግሎት ቡድን ፈልግ..."
              className="pl-10 pr-9 py-2.5 text-xs sm:text-sm border border-slate-300 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 w-full font-medium"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Filter Dropdowns */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Class Dropdown */}
            <div>
              <select
                value={selectedClassFilter}
                onChange={(e) => setSelectedClassFilter(e.target.value)}
                className="bg-slate-50 border border-slate-300 text-slate-800 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                <option value="all">ሁሉንም ክፍሎች ({stats.total})</option>
                {allClasses.map((c) => {
                  const count = (studentsByClass[c] || []).length;
                  return (
                    <option key={c} value={c}>
                      {c} ({count} ተማሪዎች)
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Chapel Dropdown */}
            <div>
              <select
                value={selectedChapelFilter}
                onChange={(e) => setSelectedChapelFilter(e.target.value)}
                className="bg-slate-50 border border-slate-300 text-slate-800 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                <option value="all">ሁሉም ቻፕል / አጥቢያ ({stats.total})</option>
                {chapelList.map((ch) => {
                  const count = allMasterStudents.filter((s) => (s.chapel || 'ዋናው ማዕከል ቻፕል') === ch).length;
                  return (
                    <option key={ch} value={ch}>
                      {ch} ({count} ተማሪዎች)
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Gender Dropdown */}
            <div>
              <select
                value={selectedGenderFilter}
                onChange={(e) => setSelectedGenderFilter(e.target.value)}
                className="bg-slate-50 border border-slate-300 text-slate-800 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                <option value="all">ሁሉም ጾታ ({stats.total})</option>
                <option value="ወ">ወንድ ብቻ ({stats.male})</option>
                <option value="ሴ">ሴት ብቻ ({stats.female})</option>
                <option value="none">ያልተገለጸ ጾታ (-) ({stats.unspecified})</option>
              </select>
            </div>

            {/* Service Dropdown */}
            <div>
              <select
                value={selectedServiceFilter}
                onChange={(e) => setSelectedServiceFilter(e.target.value as any)}
                className="bg-slate-50 border border-slate-300 text-slate-800 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                <option value="all">ሁሉም አገልግሎት</option>
                <option value="choir">መዘምራን ብቻ ({stats.inChoir})</option>
                <option value="spiritual">መንፈሳዊ ትምህርት ብቻ ({stats.inSpiritual})</option>
                <option value="both">በሁለቱም የታቀፉ</option>
              </select>
            </div>

            {/* Sort Selector */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-transparent text-slate-800 text-xs font-semibold focus:outline-none px-2 py-1"
              >
                <option value="class">በክፍል ቅደም ተከተል</option>
                <option value="name">በስም (ሀ - ፖ)</option>
                <option value="score">በውጤት</option>
                <option value="age">በዕድሜ</option>
              </select>

              <button
                type="button"
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className="p-1 hover:bg-white rounded text-slate-600 transition"
                title={sortOrder === 'asc' ? 'ከትንሽ ወደ ትልቅ (ዕርገት)' : 'ከትልቅ ወደ ትንሽ (ውድቀት)'}
              >
                <ArrowUpDown className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Filter Results Summary */}
        <div className="flex items-center justify-between text-xs text-slate-500 mt-3 pt-3 border-t border-slate-100 flex-wrap gap-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span>የተገኙ ተማሪዎች ድምር፦ <strong className="text-slate-900">{filteredStudents.length}</strong> (ከጠቅላላው {stats.total})</span>
            {selectedClassFilter !== 'all' && (
              <span className="bg-blue-100 text-blue-900 px-2 py-0.5 rounded-md font-semibold text-[11px]">
                ክፍል፦ {selectedClassFilter}
              </span>
            )}
            {selectedChapelFilter !== 'all' && (
              <span className="bg-emerald-100 text-emerald-900 px-2 py-0.5 rounded-md font-semibold text-[11px]">
                ቻፕል፦ {selectedChapelFilter}
              </span>
            )}
            {selectedGenderFilter !== 'all' && (
              <span className="bg-purple-100 text-purple-900 px-2 py-0.5 rounded-md font-semibold text-[11px]">
                ጾታ፦ {selectedGenderFilter === 'ወ' ? 'ወንድ' : selectedGenderFilter === 'ሴ' ? 'ሴት' : '-'}
              </span>
            )}
          </div>

          {(selectedClassFilter !== 'all' || selectedChapelFilter !== 'all' || selectedGenderFilter !== 'all' || selectedServiceFilter !== 'all' || searchQuery) && (
            <button
              type="button"
              onClick={() => {
                setSelectedClassFilter('all');
                setSelectedChapelFilter('all');
                setSelectedGenderFilter('all');
                setSelectedServiceFilter('all');
                setSearchQuery('');
              }}
              className="text-rose-600 hover:text-rose-800 font-bold flex items-center gap-1 text-xs ml-auto"
            >
              <RefreshCw className="w-3 h-3" />
              <span>ማጣሪያዎችን አጽዳ</span>
            </button>
          )}
        </div>
      </div>

      {/* Master Students Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden print:border-none print:shadow-none print:rounded-none">
        <div className="overflow-x-auto print:overflow-visible">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-900 text-white uppercase text-[11px] tracking-wider print:bg-slate-800 print:text-white">
                <th className="py-3 px-3 text-center w-12 font-bold">ተ.ቁ</th>
                <th className="py-3 px-4 font-extrabold text-[13pt] text-white min-w-[200px]">የተማሪው ሙሉ ስም</th>
                <th className="py-3 px-3 font-bold min-w-[110px]">ክፍል / ደረጃ</th>
                <th className="py-3 px-3 font-bold min-w-[130px]">ቻፕል (አጥቢያ)</th>
                <th className="py-3 px-3 font-bold min-w-[140px]">የወላጅ ስልክ</th>
                <th className="py-3 px-3 text-center font-bold w-16">ጾታ</th>
                <th className="py-3 px-3 text-center font-bold w-16">ዕድሜ</th>
                <th className="py-3 px-3 font-bold min-w-[140px]">የክፍሉ መምህር</th>
                <th className="py-3 px-3 text-center font-bold w-20">ውጤት</th>
                <th className="py-3 px-3 font-bold min-w-[130px]">መዘምራን</th>
                <th className="py-3 px-3 font-bold min-w-[140px]">መንፈሳዊ ትምህርት</th>
                <th className="py-3 px-3 text-center font-bold w-24 print:hidden">እርምጃዎች</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {studentsToRender.length === 0 ? (
                <tr>
                  <td colSpan={12} className="py-12 text-center text-slate-500">
                    <Users className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                    <p className="font-semibold text-sm">ምንም የተመዘገበ ተማሪ አልተገኘም!</p>
                    <p className="text-xs text-slate-400 mt-1">የተመረጠውን ማጣሪያ ወይም የፍለጋ ቃል ያረጋግጡ።</p>
                  </td>
                </tr>
              ) : (
                studentsToRender.map((student, idx) => {
                  const isMale = student.gender === 'ወ';
                  const isFemale = student.gender === 'ሴ';
                  const genderDisplay = isMale ? 'ወንድ' : isFemale ? 'ሴት' : '-';

                  return (
                    <tr
                      key={`${student.className}-${student.id}`}
                      className="hover:bg-blue-50/50 transition-colors print:break-inside-avoid"
                    >
                      {/* Row No */}
                      <td className="py-2.5 px-3 text-center font-bold text-slate-600 bg-slate-50/70 print:bg-transparent">
                        {idx + 1}
                      </td>

                      {/* Student Name */}
                      <td className="py-2.5 px-4 font-bold text-[13pt] text-slate-900 min-w-[200px] leading-normal">
                        <span>{student.name}</span>
                      </td>

                      {/* Class */}
                      <td className="py-2.5 px-3">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-900 border border-blue-200/80 font-bold text-[11px] print:border-none print:bg-transparent print:p-0">
                          {student.className}
                        </span>
                      </td>

                      {/* Chapel */}
                      <td className="py-2.5 px-3">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-900 border border-emerald-200/80 font-bold text-[11px] print:border-none print:bg-transparent print:p-0">
                          <Church className="w-3.5 h-3.5 text-emerald-700 shrink-0 print:hidden" />
                          <span>{student.chapel || 'ዋናው ማዕከል ቻፕል'}</span>
                        </span>
                      </td>

                      {/* Parent & Phone */}
                      <td className="py-2.5 px-3">
                        {student.parentPhone && student.parentPhone !== '-' ? (
                          <div className="flex flex-col gap-0.5">
                            {student.parentName && student.parentName !== '-' && (
                              <span className="text-[10px] text-slate-500 font-semibold truncate max-w-[140px]">
                                {student.parentName}
                              </span>
                            )}
                            <div className="flex items-center gap-1">
                              <a
                                href={`tel:${student.parentPhone}`}
                                className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-700 hover:text-blue-900 bg-blue-50/90 hover:bg-blue-100 px-2 py-0.5 rounded border border-blue-200/60 transition tabular-nums print:border-none print:bg-transparent print:p-0 print:text-black"
                                title={`ወደ ${student.parentName || 'ወላጅ'} ደውል`}
                              >
                                <PhoneCall className="w-3 h-3 text-blue-600 shrink-0 print:hidden" />
                                <span>{student.parentPhone}</span>
                              </a>
                              <button
                                type="button"
                                onClick={() => handleCopyPhone(`${student.className}-${student.id}`, student.parentPhone || '')}
                                className="p-1 hover:bg-slate-200 rounded text-slate-400 hover:text-slate-700 transition print:hidden"
                                title="ስልክ ቁጥር ቅዳ"
                              >
                                {copiedPhoneId === `${student.className}-${student.id}` ? (
                                  <Check className="w-3 h-3 text-emerald-600" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-xs">-</span>
                        )}
                      </td>

                      {/* Gender (Always - if empty, NEVER 'ባዶ') */}
                      <td className="py-2.5 px-3 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded font-bold text-[11px] ${
                            isMale
                              ? 'bg-blue-100 text-blue-800'
                              : isFemale
                              ? 'bg-rose-100 text-rose-800'
                              : 'text-slate-400'
                          } print:bg-transparent print:text-black`}
                        >
                          {genderDisplay}
                        </span>
                      </td>

                      {/* Age */}
                      <td className="py-2.5 px-3 text-center text-slate-700 font-semibold">
                        {student.age || '-'}
                      </td>

                      {/* Teacher */}
                      <td className="py-2.5 px-3 text-slate-700 font-medium">
                        <span className="flex items-center gap-1">
                          <UserCheck className="w-3.5 h-3.5 text-teal-600 shrink-0 print:hidden" />
                          <span>{student.teacherName}</span>
                        </span>
                      </td>

                      {/* Total Score */}
                      <td className="py-2.5 px-3 text-center">
                        {student.hasScore ? (
                          <span className="inline-block px-2 py-0.5 rounded font-extrabold text-[11px] bg-amber-50 text-amber-900 border border-amber-200 print:border-none">
                            {student.totalScore}
                          </span>
                        ) : (
                          <span className="text-slate-400 font-medium">-</span>
                        )}
                      </td>

                      {/* Choir Group */}
                      <td className="py-2.5 px-3">
                        {student.choirGroup ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 font-semibold text-[11px] border border-emerald-200/60 print:border-none print:p-0">
                            <Music className="w-3 h-3 text-emerald-600 shrink-0 print:hidden" />
                            <span>{student.choirGroup}</span>
                          </span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>

                      {/* Spiritual Group */}
                      <td className="py-2.5 px-3">
                        {student.spiritualGroup ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-purple-50 text-purple-800 font-semibold text-[11px] border border-purple-200/60 print:border-none print:p-0">
                            <BookOpen className="w-3 h-3 text-purple-600 shrink-0 print:hidden" />
                            <span>{student.spiritualGroup}</span>
                          </span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>

                      {/* Actions (Screen only) */}
                      <td className="py-2.5 px-3 text-center print:hidden">
                        <div className="flex items-center justify-center gap-1.5">
                          {onGoToClass && (
                            <button
                              type="button"
                              onClick={() => onGoToClass(student.className)}
                              className="p-1 hover:bg-blue-100 text-blue-700 rounded transition"
                              title={`ወደ "${student.className}" ክፍል ሂድ`}
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(student)}
                            className="p-1 hover:bg-slate-100 text-slate-700 rounded transition"
                            title="ተማሪውን አርትዕ"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          {onMoveStudentClass && (
                            <button
                              type="button"
                              onClick={() => handleOpenMove(student)}
                              className="p-1 hover:bg-amber-100 text-amber-700 rounded transition text-[10px] font-bold"
                              title="ወደ ሌላ ክፍል ቀይር"
                            >
                              ቀይር
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleDelete(student)}
                            className="p-1 hover:bg-rose-100 text-rose-600 rounded transition"
                            title="ተማሪውን ሰርዝ"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer Summary */}
        <div className="bg-slate-50 px-4 py-3 border-t border-slate-200 flex flex-wrap items-center justify-between text-xs text-slate-600 font-medium print:bg-white print:border-t-2 print:border-slate-800">
          <span>
            የተዘረዘሩ ተማሪዎች፦ <strong className="text-slate-900">{studentsToRender.length}</strong> (ወንድ፦ {studentsToRender.filter((s) => s.gender === 'ወ').length} | ሴት፦ {studentsToRender.filter((s) => s.gender === 'ሴ').length} | ያልተገለጸ፦ {studentsToRender.filter((s) => s.gender !== 'ወ' && s.gender !== 'ሴ').length})
          </span>
          <span className="text-[11px] text-slate-500">
            የብርብር ከተማ ቃለ ሕይወት ቤተክርስቲያን የልጆች አገልግሎት • ዋና አስተባባሪ
          </span>
        </div>
      </div>

      {/* Printable Signature Section (Prints only on printer/PDF) */}
      <div className="hidden print:block mt-8 pt-6 border-t border-slate-400 text-xs">
        <div className="grid grid-cols-2 gap-8">
          <div>
            <p className="font-bold">የልጆች አገልግሎት ዋና አስተባባሪ፦</p>
            <p className="mt-4">ስም፦ _____________________________</p>
            <p className="mt-2">ፊርማ፦ ___________________________</p>
            <p className="mt-2">ቀን፦ _____________________________</p>
          </div>
          <div>
            <p className="font-bold">የሰንበት ት/ቤት መሪ / ኮሚቴ፦</p>
            <p className="mt-4">ስም፦ _____________________________</p>
            <p className="mt-2">ፊርማ፦ ___________________________</p>
            <p className="mt-2">ቀን፦ _____________________________</p>
          </div>
        </div>
      </div>

      {/* Add Student Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Plus className="w-5 h-5 text-emerald-600" />
                <span>አዲስ ተማሪ መዝግብ</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-4 mt-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  የተማሪው ሙሉ ስም <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="ምሳሌ፡ ዮናስ አበበ"
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ክፍል ይምረጡ <span className="text-rose-600">*</span>
                </label>
                <select
                  value={newClass}
                  onChange={(e) => setNewClass(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none font-semibold"
                >
                  {allClasses.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">ጾታ</label>
                  <select
                    value={newGender}
                    onChange={(e) => setNewGender(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none font-semibold"
                  >
                    <option value="ወ">ወንድ</option>
                    <option value="ሴ">ሴት</option>
                    <option value="">- (ያልተገለጸ)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">ዕድሜ</label>
                  <input
                    type="text"
                    value={newAge}
                    onChange={(e) => setNewAge(e.target.value)}
                    placeholder="ምሳሌ፡ 8"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  ይቅር
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow"
                >
                  መዝግብ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Student Modal */}
      {editingStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-blue-600" />
                <span>ተማሪ አርትዕ ({editingStudent.className})</span>
              </h3>
              <button
                type="button"
                onClick={() => setEditingStudent(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditSave} className="space-y-4 mt-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">የተማሪው ሙሉ ስም</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">ጾታ</label>
                  <select
                    value={editGender}
                    onChange={(e) => setEditGender(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none font-semibold"
                  >
                    <option value="ወ">ወንድ</option>
                    <option value="ሴ">ሴት</option>
                    <option value="">- (ያልተገለጸ)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">ዕድሜ</label>
                  <input
                    type="text"
                    value={editAge}
                    onChange={(e) => setEditAge(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingStudent(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  ይቅር
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold bg-blue-700 hover:bg-blue-600 text-white rounded-xl shadow"
                >
                  አስቀምጥ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Move Class Modal */}
      {movingStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <ArrowUpDown className="w-5 h-5 text-amber-600" />
                <span>ተማሪውን ወደ ሌላ ክፍል ቀይር</span>
              </h3>
              <button
                type="button"
                onClick={() => setMovingStudent(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <div className="bg-amber-50 p-3 rounded-xl border border-amber-200 text-xs text-amber-900">
                <p>
                  የተማሪ ስም፦ <strong className="font-bold">{movingStudent.name}</strong>
                </p>
                <p className="mt-1">
                  የአሁኑ ክፍል፦ <span className="font-semibold">{movingStudent.className}</span>
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">አዲሱ ክፍል ይምረጡ</label>
                <select
                  value={targetMoveClass}
                  onChange={(e) => setTargetMoveClass(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none font-semibold"
                >
                  {allClasses
                    .filter((c) => c !== movingStudent.className)
                    .map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setMovingStudent(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  ይቅር
                </button>
                <button
                  type="button"
                  onClick={handleMoveSubmit}
                  className="px-4 py-2 text-xs font-bold bg-amber-600 hover:bg-amber-500 text-white rounded-xl shadow"
                >
                  ቀይርና አንቀሳቅስ
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

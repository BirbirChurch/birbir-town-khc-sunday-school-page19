import React, { useState, useMemo, useRef } from 'react';
import {
  Users,
  UserPlus,
  FileSpreadsheet,
  Printer,
  Download,
  Upload,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  Edit2,
  Trash2,
  ArrowRight,
  GraduationCap,
  Calendar,
  Phone,
  Home,
  User,
  X,
  FileUp,
  HelpCircle,
  UserCheck,
  ChevronRight,
  Church,
  Copy,
  Check,
  PhoneCall
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { ChurchChild, Student, Role } from '../types';
import { generateUniqueId } from '../utils/idGenerator';
import { downloadXLSX } from '../utils/csv';
import { DEFAULT_CHAPELS } from '../constants/initialData';

interface ChurchChildrenTabProps {
  currentYear: string;
  classList: string[];
  churchChildren: ChurchChild[];
  chapelList?: string[];
  studentsByClass: { [className: string]: Student[] };
  onAddChild: (child: Omit<ChurchChild, 'id'>) => void;
  onUpdateChild: (child: ChurchChild) => void;
  onDeleteChild: (id: number) => void;
  onBatchAddChildren: (children: Omit<ChurchChild, 'id'>[]) => void;
  onEnrollToSundaySchool: (child: ChurchChild, targetClass: string) => void;
  onImportMissingStudentsToChurchChildren: (
    students: { name: string; gender: string; age: number | string; className: string; chapel?: string; phone?: string }[]
  ) => void;
  currentUserRole: Role | null;
}

// Normalization function to match Amharic names accurately
const normalizeAmharicName = (name: string): string => {
  return (name || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[ሐኀ]/g, 'ሀ')
    .replace(/ሠ/g, 'ሰ')
    .replace(/ፀ/g, 'ጸ')
    .replace(/ዐ/g, 'አ');
};

type ViewFilter = 'all' | 'enrolled' | 'not_enrolled' | 'missing_from_church';
type AgeFilter = 'all' | '0-3' | '4-6' | '7-9' | '10-12' | '13-14' | '15+';

export const ChurchChildrenTab: React.FC<ChurchChildrenTabProps> = ({
  currentYear,
  classList,
  churchChildren = [],
  chapelList = DEFAULT_CHAPELS,
  studentsByClass = {},
  onAddChild,
  onUpdateChild,
  onDeleteChild,
  onBatchAddChildren,
  onEnrollToSundaySchool,
  onImportMissingStudentsToChurchChildren,
  currentUserRole
}) => {
  // State
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [viewFilter, setViewFilter] = useState<ViewFilter>('all');
  const [ageFilter, setAgeFilter] = useState<AgeFilter>('all');
  const [genderFilter, setGenderFilter] = useState<string>('all');
  const [selectedChapelFilter, setSelectedChapelFilter] = useState<string>('all');
  const [copiedPhoneId, setCopiedPhoneId] = useState<number | null>(null);

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [editingChild, setEditingChild] = useState<ChurchChild | null>(null);
  const [enrollTargetChild, setEnrollTargetChild] = useState<ChurchChild | null>(null);
  const [selectedEnrollClass, setSelectedEnrollClass] = useState<string>(classList[0] || 'ማቆያ ክፍል');
  const [isImportModalOpen, setIsImportModalOpen] = useState<boolean>(false);

  // Form state
  const [formName, setFormName] = useState<string>('');
  const [formGender, setFormGender] = useState<'ወ' | 'ሴ' | ''>('ወ');
  const [formAge, setFormAge] = useState<string>('5');
  const [formChapel, setFormChapel] = useState<string>(chapelList[0] || 'ዋናው ማዕከል ቻፕል');
  const [formParent, setFormParent] = useState<string>('');
  const [formPhone, setFormPhone] = useState<string>('');
  const [formResidence, setFormResidence] = useState<string>('');
  const [formVillage, setFormVillage] = useState<string>('');
  const [formNotes, setFormNotes] = useState<string>('');

  // Import preview state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importPreview, setImportPreview] = useState<Omit<ChurchChild, 'id'>[]>([]);
  const [importFileName, setImportFileName] = useState<string>('');

  // 1. Build an index of Sunday School students for fast cross-referencing
  const sundaySchoolIndex = useMemo(() => {
    const map = new Map<string, { student: Student; className: string }>();
    const allStudentsList: { student: Student; className: string }[] = [];

    Object.entries(studentsByClass).forEach(([className, students]) => {
      if (Array.isArray(students)) {
        students.forEach((s) => {
          if (s && s.name) {
            const norm = normalizeAmharicName(s.name);
            map.set(norm, { student: s, className });
            allStudentsList.push({ student: s, className });
          }
        });
      }
    });

    return { map, allStudentsList };
  }, [studentsByClass]);

  // 2. Identify Church Children enrollment status
  const churchChildrenWithStatus = useMemo(() => {
    return churchChildren.map((child) => {
      const norm = normalizeAmharicName(child.name);
      const match = sundaySchoolIndex.map.get(norm);
      return {
        ...child,
        isEnrolled: !!match,
        enrolledClass: match ? match.className : null
      };
    });
  }, [churchChildren, sundaySchoolIndex]);

  // 3. Identify Sunday School students MISSING from Church Children Registry
  const missingFromChurchChildren = useMemo(() => {
    const churchNormSet = new Set(churchChildren.map((c) => normalizeAmharicName(c.name)));
    const missing: { student: Student; className: string }[] = [];

    sundaySchoolIndex.allStudentsList.forEach((item) => {
      const norm = normalizeAmharicName(item.student.name);
      if (!churchNormSet.has(norm)) {
        missing.push(item);
      }
    });

    return missing;
  }, [churchChildren, sundaySchoolIndex]);

  // 4. Chapel Breakdown Statistics Matrix
  const chapelStats = useMemo(() => {
    const chapels = Array.from(
      new Set([
        ...chapelList,
        ...churchChildrenWithStatus.map((c) => c.chapel).filter(Boolean) as string[]
      ])
    );

    const statsMap: { [chapel: string]: { total: number; enrolled: number; notEnrolled: number; male: number; female: number } } = {};
    chapels.forEach((ch) => {
      statsMap[ch] = { total: 0, enrolled: 0, notEnrolled: 0, male: 0, female: 0 };
    });

    churchChildrenWithStatus.forEach((child) => {
      const ch = child.chapel || 'ያልተገለጸ ቻፕል';
      if (!statsMap[ch]) {
        statsMap[ch] = { total: 0, enrolled: 0, notEnrolled: 0, male: 0, female: 0 };
      }
      statsMap[ch].total++;
      if (child.gender === 'ወ') statsMap[ch].male++;
      if (child.gender === 'ሴ') statsMap[ch].female++;

      if (child.isEnrolled) statsMap[ch].enrolled++;
      else statsMap[ch].notEnrolled++;
    });

    return {
      chapels: Object.keys(statsMap),
      statsMap
    };
  }, [chapelList, churchChildrenWithStatus]);

  // 5. Age Demographic Cohorts Calculation (0-3, 4-6, 7-9, 10-12, 13-14, 15+)
  const demographicStats = useMemo(() => {
    const cohorts = [
      { key: '0-3', label: 'ከ0 - 3 ዓመት (ጨቅላና ህፃናት)', min: 0, max: 3, male: 0, female: 0, total: 0, enrolled: 0, notEnrolled: 0 },
      { key: '4-6', label: 'ከ4 - 6 ዓመት (ጀማሪ ህፃናት)', min: 4, max: 6, male: 0, female: 0, total: 0, enrolled: 0, notEnrolled: 0 },
      { key: '7-9', label: 'ከ7 - 9 ዓመት (መካከለኛ ህፃናት)', min: 7, max: 9, male: 0, female: 0, total: 0, enrolled: 0, notEnrolled: 0 },
      { key: '10-12', label: 'ከ10 - 12 ዓመት (ታዳጊዎች)', min: 10, max: 12, male: 0, female: 0, total: 0, enrolled: 0, notEnrolled: 0 },
      { key: '13-14', label: 'ከ13 - 14 ዓመት (ታዳጊ ወጣቶች)', min: 13, max: 14, male: 0, female: 0, total: 0, enrolled: 0, notEnrolled: 0 },
      { key: '15+', label: 'ከ15 ዓመት በላይ & ያልተገለጸ', min: 15, max: 999, male: 0, female: 0, total: 0, enrolled: 0, notEnrolled: 0 }
    ];

    let totalMale = 0;
    let totalFemale = 0;
    let totalEnrolled = 0;
    let totalNotEnrolled = 0;

    churchChildrenWithStatus.forEach((child) => {
      const numAge = parseInt(String(child.age || '0'), 10) || 0;
      const isMale = child.gender === 'ወ';
      const isFemale = child.gender === 'ሴ';

      if (isMale) totalMale++;
      if (isFemale) totalFemale++;
      if (child.isEnrolled) totalEnrolled++;
      else totalNotEnrolled++;

      let assigned = false;
      for (const cohort of cohorts) {
        if (numAge >= cohort.min && numAge <= cohort.max) {
          cohort.total++;
          if (isMale) cohort.male++;
          if (isFemale) cohort.female++;
          if (child.isEnrolled) cohort.enrolled++;
          else cohort.notEnrolled++;
          assigned = true;
          break;
        }
      }
      if (!assigned) {
        const last = cohorts[cohorts.length - 1];
        last.total++;
        if (isMale) last.male++;
        if (isFemale) last.female++;
        if (child.isEnrolled) last.enrolled++;
        else last.notEnrolled++;
      }
    });

    const totalChildren = churchChildrenWithStatus.length;

    return {
      cohorts,
      totalChildren,
      totalMale,
      totalFemale,
      totalEnrolled,
      totalNotEnrolled
    };
  }, [churchChildrenWithStatus]);

  // 6. Filtered Church Children
  const filteredChildren = useMemo(() => {
    return churchChildrenWithStatus.filter((child) => {
      // 1. Search term (Name, Parent, Phone, Residence, Chapel)
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchesName = child.name?.toLowerCase().includes(q);
        const matchesParent = child.parentName?.toLowerCase().includes(q);
        const matchesPhone = child.phone?.toLowerCase().includes(q);
        const matchesResidence = child.residence?.toLowerCase().includes(q);
        const matchesChapel = child.chapel?.toLowerCase().includes(q);
        const matchesVillage = child.fellowshipOrVillage?.toLowerCase().includes(q);
        if (!matchesName && !matchesParent && !matchesPhone && !matchesResidence && !matchesChapel && !matchesVillage) {
          return false;
        }
      }

      // 2. View filter (enrolled / not_enrolled)
      if (viewFilter === 'enrolled' && !child.isEnrolled) return false;
      if (viewFilter === 'not_enrolled' && child.isEnrolled) return false;

      // 3. Chapel filter
      if (selectedChapelFilter !== 'all' && (child.chapel || 'ያልተገለጸ ቻፕል') !== selectedChapelFilter) {
        return false;
      }

      // 4. Gender filter
      if (genderFilter !== 'all' && child.gender !== genderFilter) return false;

      // 5. Age filter
      if (ageFilter !== 'all') {
        const numAge = parseInt(String(child.age || '0'), 10) || 0;
        if (ageFilter === '0-3' && (numAge < 0 || numAge > 3)) return false;
        if (ageFilter === '4-6' && (numAge < 4 || numAge > 6)) return false;
        if (ageFilter === '7-9' && (numAge < 7 || numAge > 9)) return false;
        if (ageFilter === '10-12' && (numAge < 10 || numAge > 12)) return false;
        if (ageFilter === '13-14' && (numAge < 13 || numAge > 14)) return false;
        if (ageFilter === '15+' && numAge < 15) return false;
      }

      return true;
    });
  }, [churchChildrenWithStatus, searchTerm, viewFilter, selectedChapelFilter, genderFilter, ageFilter]);

  // Copy phone handler
  const handleCopyPhone = (id: number, phone: string) => {
    if (!phone) return;
    navigator.clipboard.writeText(phone);
    setCopiedPhoneId(id);
    setTimeout(() => setCopiedPhoneId(null), 2000);
  };

  // Modal helpers
  const openAddModal = () => {
    setEditingChild(null);
    setFormName('');
    setFormGender('ወ');
    setFormAge('5');
    setFormChapel(chapelList[0] || 'ዋናው ማዕከል ቻፕል');
    setFormParent('');
    setFormPhone('');
    setFormResidence('');
    setFormVillage('');
    setFormNotes('');
    setIsAddModalOpen(true);
  };

  const openEditModal = (child: ChurchChild) => {
    setEditingChild(child);
    setFormName(child.name);
    setFormGender((child.gender as 'ወ' | 'ሴ') || 'ወ');
    setFormAge(String(child.age || '5'));
    setFormChapel(child.chapel || chapelList[0] || 'ዋናው ማዕከል ቻፕል');
    setFormParent(child.parentName || '');
    setFormPhone(child.phone || '');
    setFormResidence(child.residence || '');
    setFormVillage(child.fellowshipOrVillage || '');
    setFormNotes(child.notes || '');
    setIsAddModalOpen(true);
  };

  const handleSaveChild = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      alert('እባክዎ የልጁን ሙሉ ስም ያስገቡ!');
      return;
    }

    const payload: Omit<ChurchChild, 'id'> = {
      name: formName.trim(),
      gender: formGender || 'ወ',
      age: parseInt(formAge, 10) || 5,
      chapel: formChapel.trim() || undefined,
      parentName: formParent.trim() || undefined,
      phone: formPhone.trim() || undefined,
      residence: formResidence.trim() || undefined,
      fellowshipOrVillage: formVillage.trim() || undefined,
      notes: formNotes.trim() || undefined,
      registeredDate: editingChild?.registeredDate || new Date().toISOString().split('T')[0]
    };

    if (editingChild) {
      onUpdateChild({
        ...payload,
        id: editingChild.id
      });
    } else {
      onAddChild(payload);
    }

    setIsAddModalOpen(false);
  };

  // Enroll in Sunday School handler
  const handleConfirmEnroll = () => {
    if (!enrollTargetChild || !selectedEnrollClass) return;
    onEnrollToSundaySchool(enrollTargetChild, selectedEnrollClass);
    setEnrollTargetChild(null);
  };

  // Batch import all missing Sunday School students into Church Registry
  const handleBatchImportMissing = () => {
    if (missingFromChurchChildren.length === 0) return;
    const confirmMsg = `በሰንበት ት/ቤት ያሉትን ${missingFromChurchChildren.length} ተማሪዎች ወደ ቤተክርስቲያኒቱ አጠቃላይ የልጆች መረጃ ቋት ማስገባት ይፈልጋሉ?`;
    if (!window.confirm(confirmMsg)) return;

    const toImport = missingFromChurchChildren.map((item) => ({
      name: item.student.name,
      gender: item.student.gender || 'ወ',
      age: item.student.age || 7,
      className: item.className,
      chapel: item.student.chapel || chapelList[0] || 'ዋናው ማዕከል ቻፕል',
      phone: item.student.phone
    }));

    onImportMissingStudentsToChurchChildren(toImport);
    setViewFilter('all');
  };

  // Single import of a missing Sunday School student
  const handleImportSingleMissing = (item: { student: Student; className: string }) => {
    onImportMissingStudentsToChurchChildren([
      {
        name: item.student.name,
        gender: item.student.gender || 'ወ',
        age: item.student.age || 7,
        className: item.className,
        chapel: item.student.chapel || chapelList[0] || 'ዋናው ማዕከል ቻፕል',
        phone: item.student.phone
      }
    ]);
  };

  // Excel Export Handler
  const handleExportExcel = () => {
    // Sheet 1: Children list
    const headers = [
      'ተ.ቁ',
      'የልጁ ሙሉ ስም',
      'ጾታ',
      'ዕድሜ',
      'የዕድሜ ምድብ',
      'ቻፕል (አጥቢያ)',
      'በሰንበት ት/ቤት ይማራል?',
      'የሰንበት ት/ቤት ክፍል',
      'የወላጅ/አሳዳጊ ስም',
      'የወላጅ ስልክ ቁጥር',
      'መኖሪያ አካባቢ',
      'ህብረት/መንደር',
      'የተመዘገበበት ቀን',
      'ማስታወሻ'
    ];

    const rows = filteredChildren.map((c, idx) => {
      const numAge = parseInt(String(c.age || '0'), 10) || 0;
      let ageGroupStr = '15+';
      if (numAge <= 3) ageGroupStr = '0-3 ዓመት';
      else if (numAge <= 6) ageGroupStr = '4-6 ዓመት';
      else if (numAge <= 9) ageGroupStr = '7-9 ዓመት';
      else if (numAge <= 12) ageGroupStr = '10-12 ዓመት';
      else if (numAge <= 14) ageGroupStr = '13-14 ዓመት';

      return [
        idx + 1,
        c.name,
        c.gender === 'ወ' ? 'ወንድ' : c.gender === 'ሴ' ? 'ሴት' : '-',
        c.age || '-',
        ageGroupStr,
        c.chapel || 'ዋናው ማዕከል ቻፕል',
        c.isEnrolled ? 'አዎ (ይማራል)' : 'አይማርም',
        c.enrolledClass || '-',
        c.parentName || '-',
        c.phone || '-',
        c.residence || '-',
        c.fellowshipOrVillage || '-',
        c.registeredDate || '-',
        c.notes || ''
      ];
    });

    // Sheet 2: Chapel breakdown stats
    const chapelHeaders = ['ቻፕል (አጥቢያ ማዕከል)', 'ጠቅላላ ልጆች', 'በሰንበት ት/ቤት የሚማሩ', 'የማይማሩ', 'ወንድ', 'ሴት', 'የመማር ምጣኔ (%)'];
    const chapelRows = chapelStats.chapels.map((ch) => {
      const st = chapelStats.statsMap[ch];
      const rate = st.total > 0 ? `${Math.round((st.enrolled / st.total) * 100)}%` : '0%';
      return [ch, st.total, st.enrolled, st.notEnrolled, st.male, st.female, rate];
    });

    // Sheet 3: Age Demographic stats table
    const statHeaders = ['የዕድሜ ምድብ', 'ወንድ', 'ሴት', 'ድምር', 'በሰንበት ት/ቤት የሚማሩ', 'የማይማሩ', 'የመቶኛ ድርሻ (%)'];
    const statRows = demographicStats.cohorts.map((coh) => [
      coh.label,
      coh.male,
      coh.female,
      coh.total,
      coh.enrolled,
      coh.notEnrolled,
      demographicStats.totalChildren > 0
        ? `${Math.round((coh.total / demographicStats.totalChildren) * 100)}%`
        : '0%'
    ]);

    const sheets = [
      { name: 'የልጆች ዝርዝር & ቻፕል', data: [headers, ...rows] },
      { name: 'የቻፕሎች ስታትስቲክስ', data: [chapelHeaders, ...chapelRows] },
      { name: 'የዕድሜ ምድብ ስታቲስቲክስ', data: [statHeaders, ...statRows] }
    ];

    const wb = XLSX.utils.book_new();
    sheets.forEach((sh) => {
      const ws = XLSX.utils.aoa_to_sheet(sh.data);
      XLSX.utils.book_append_sheet(wb, ws, sh.name);
    });

    const fileName = `የብርብር_ቤተክርስቲያን_የልጆች_ቋት_${currentYear}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  // Download Sample Excel Template
  const handleDownloadSampleTemplate = () => {
    const headers = ['የልጁ ሙሉ ስም', 'ጾታ (ወ/ሴ)', 'ዕድሜ', 'ቻፕል', 'የወላጅ ስም', 'የወላጅ ስልክ', 'መኖሪያ አካባቢ', 'ህብረት/መንደር', 'ማስታወሻ'];
    const sampleRows = [
      ['ዮናታን ዳዊት', 'ወ', 2, 'ዋናው ማዕከል ቻፕል', 'ዳዊት ታደሰ', '0911223344', 'ቀበሌ 01', 'ቤቴል ህብረት', 'ጨቅላ ህፃን'],
      ['ሩት ተስፋዬ', 'ሴ', 5, 'ሰላም ቻፕል', 'ተስፋዬ በቀለ', '0922334455', 'ቀበሌ 02', 'ሰላም ህብረት', ''],
      ['አማኑኤል መሠረት', 'ወ', 8, 'ቤቴል ቻፕል', 'መሠረት ሌቃ', '0933445566', 'ቀበሌ 01', 'አማኑኤል ህብረት', ''],
      ['ራሔል አሸናፊ', 'ሴ', 11, 'ሰላም ቻፕል', 'አሸናፊ ጫፋ', '0944556677', 'ቀበሌ 03', 'ጽዮን ህብረት', ''],
      ['ዳዊት መስፍን', 'ወ', 14, 'ዋናው ማዕከል ቻፕል', 'መስፍን ማንጁራ', '0955667788', 'መንደር 1', 'ቤቴል ህብረት', '']
    ];
    downloadXLSX([headers, ...sampleRows], 'የልጆች_መረጃ_መሙያ_ናሙና.xlsx', 'የልጆች መረጃ');
  };

  // Handle File Upload for Import
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportFileName(file.name);
    const reader = new FileReader();

    reader.onload = (evt) => {
      try {
        const buffer = evt.target?.result;
        const workbook = XLSX.read(buffer, { type: 'binary' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const rawRows: string[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        if (rawRows.length < 2) {
          alert('ፋይሉ ምንም የመረጃ መስመር አልያዘም!');
          return;
        }

        // Find header row
        const headerRow = rawRows[0] || [];
        let nameIdx = -1;
        let genderIdx = -1;
        let ageIdx = -1;
        let chapelIdx = -1;
        let parentIdx = -1;
        let phoneIdx = -1;
        let residenceIdx = -1;
        let notesIdx = -1;

        headerRow.forEach((col, idx) => {
          const str = String(col || '').toLowerCase();
          if (str.includes('ስም') && !str.includes('ወላጅ') && !str.includes('አባት')) nameIdx = idx;
          if (str.includes('ጾታ') || str.includes('gender')) genderIdx = idx;
          if (str.includes('ዕድሜ') || str.includes('age')) ageIdx = idx;
          if (str.includes('ቻፕል') || str.includes('chapel') || str.includes('አጥቢያ')) chapelIdx = idx;
          if (str.includes('ወላጅ') || str.includes('አባት') || str.includes('parent')) parentIdx = idx;
          if (str.includes('ስልክ') || str.includes('phone')) phoneIdx = idx;
          if (str.includes('መኖሪያ') || str.includes('ቀበሌ') || str.includes('አካባቢ') || str.includes('መንደር')) residenceIdx = idx;
          if (str.includes('ማስታወሻ') || str.includes('note')) notesIdx = idx;
        });

        // Fallbacks if header wasn't matched explicitly
        if (nameIdx === -1) nameIdx = 0;
        if (genderIdx === -1) genderIdx = 1;
        if (ageIdx === -1) ageIdx = 2;

        const parsed: Omit<ChurchChild, 'id'>[] = [];

        for (let i = 1; i < rawRows.length; i++) {
          const row = rawRows[i];
          if (!row || row.length === 0) continue;

          const rawName = String(row[nameIdx] || '').trim();
          if (!rawName || rawName === 'ተ.ቁ' || rawName === 'ስም') continue;

          const rawGender = String(row[genderIdx] || '').trim();
          const gender = rawGender.startsWith('ሴ') || rawGender.toLowerCase().startsWith('f') ? 'ሴ' : 'ወ';
          const age = parseInt(String(row[ageIdx] || '5'), 10) || 5;
          const chapel = chapelIdx !== -1 && row[chapelIdx] ? String(row[chapelIdx]).trim() : chapelList[0] || 'ዋናው ማዕከል ቻፕል';
          const parentName = parentIdx !== -1 && row[parentIdx] ? String(row[parentIdx]).trim() : undefined;
          const phone = phoneIdx !== -1 && row[phoneIdx] ? String(row[phoneIdx]).trim() : undefined;
          const residence = residenceIdx !== -1 && row[residenceIdx] ? String(row[residenceIdx]).trim() : undefined;
          const notes = notesIdx !== -1 && row[notesIdx] ? String(row[notesIdx]).trim() : undefined;

          parsed.push({
            name: rawName,
            gender,
            age,
            chapel,
            parentName,
            phone,
            residence,
            notes,
            registeredDate: new Date().toISOString().split('T')[0]
          });
        }

        setImportPreview(parsed);
      } catch (err) {
        console.error('Error parsing excel file', err);
        alert('ፋይሉን ማንበብ አልተቻለም። እባክዎ ትክክለኛ Excel ወይም CSV ፋይል መሆኑን ያረጋግጡ።');
      }
    };

    reader.readAsBinaryString(file);
  };

  // Confirm Import
  const handleConfirmImport = () => {
    if (importPreview.length === 0) return;
    onBatchAddChildren(importPreview);
    setIsImportModalOpen(false);
    setImportPreview([]);
    setImportFileName('');
  };

  return (
    <div className="space-y-6">
      {/* Printable Letterhead (Shown only when printing) */}
      <div className="hidden print:block text-center border-b-2 border-slate-900 pb-4 mb-4">
        <h1 className="text-xl font-black text-slate-900">የብርብር ከተማ ቃለ ሕይወት ቤተክርስቲያን</h1>
        <h2 className="text-base font-bold text-slate-800">የልጆች አገልግሎት ዘርፍ</h2>
        <h3 className="text-sm font-semibold text-slate-700 mt-1">
          የቤተክርስቲያኒቱ ልጆች የመረጃ ቋት እና የሰንበት ት/ቤት የመማር ሁኔታ ሪፖርት ({currentYear} ዓ.ም)
        </h3>
        <p className="text-xs text-slate-500 mt-0.5">የታተመበት ቀን፦ {new Date().toLocaleDateString('en-CA')}</p>
      </div>

      {/* Top Banner / Toolbar */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm print:hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-900 flex items-center justify-center font-bold">
                <Users className="w-5 h-5 text-blue-900" />
              </div>
              <div>
                <h2 className="text-lg font-extrabold text-slate-900">
                  የቤተክርስቲያኒቱ አጠቃላይ የልጆች መረጃ ቋት
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  ከሰንበት ት/ቤት ጋር በስም በማገናኘት የሚማሩና የማይማሩትን፣ ቻፕላቸውን እና የወላጅ ስልክ ቁጥር ማስተባበሪያ
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={openAddModal}
              className="bg-blue-900 hover:bg-blue-800 text-white font-bold text-xs px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 shadow-sm"
            >
              <UserPlus className="w-4 h-4 text-amber-300" />
              <span>+ አዲስ ልጅ መዝግብ</span>
            </button>

            <button
              type="button"
              onClick={() => setIsImportModalOpen(true)}
              className="bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs px-3 py-2 rounded-xl transition flex items-center gap-1.5 shadow-sm"
              title="ልጆችን ከExcel (.xlsx) ወይም CSV ፋይል አስገባ"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>📥 ኤክሴል አስገባ</span>
            </button>

            <button
              type="button"
              onClick={handleExportExcel}
              className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs px-3 py-2 rounded-xl transition flex items-center gap-1.5 border border-slate-200"
              title="ሙሉ መረጃውን በExcel አውርድ"
            >
              <Download className="w-4 h-4 text-slate-600" />
              <span>📤 ኤክሴል አውርድ</span>
            </button>

            <button
              type="button"
              onClick={() => window.print()}
              className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-3 py-2 rounded-xl transition flex items-center gap-1.5"
              title="ሪፖርት አትም ወይም በPDF አስቀምጥ"
            >
              <Printer className="w-4 h-4" />
              <span>🖨️ ፕሪንት / PDF</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI & Summary Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5 print:grid-cols-5">
        {/* Total Children */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-3.5 shadow-xs">
          <p className="text-[11px] font-semibold text-slate-500">ጠቅላላ የቤተክርስቲያን ልጆች</p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-black text-slate-900 tabular-nums">
              {demographicStats.totalChildren}
            </span>
            <span className="text-xs font-bold text-slate-400">100%</span>
          </div>
        </div>

        {/* Male */}
        <div className="bg-white rounded-xl border border-blue-200/80 bg-blue-50/20 p-3.5 shadow-xs">
          <p className="text-[11px] font-semibold text-blue-700">ወንዶች ልጆች</p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-black text-blue-900 tabular-nums">
              {demographicStats.totalMale}
            </span>
            <span className="text-xs font-bold text-blue-600">
              {demographicStats.totalChildren > 0
                ? `${Math.round((demographicStats.totalMale / demographicStats.totalChildren) * 100)}%`
                : '0%'}
            </span>
          </div>
        </div>

        {/* Female */}
        <div className="bg-white rounded-xl border border-rose-200/80 bg-rose-50/20 p-3.5 shadow-xs">
          <p className="text-[11px] font-semibold text-rose-700">ሴቶች ልጆች</p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-black text-rose-900 tabular-nums">
              {demographicStats.totalFemale}
            </span>
            <span className="text-xs font-bold text-rose-600">
              {demographicStats.totalChildren > 0
                ? `${Math.round((demographicStats.totalFemale / demographicStats.totalChildren) * 100)}%`
                : '0%'}
            </span>
          </div>
        </div>

        {/* Enrolled in Sunday School */}
        <div className="bg-white rounded-xl border border-emerald-200/80 bg-emerald-50/20 p-3.5 shadow-xs">
          <p className="text-[11px] font-semibold text-emerald-700 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>በሰንበት ት/ቤት የሚማሩ</span>
          </p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-black text-emerald-900 tabular-nums">
              {demographicStats.totalEnrolled}
            </span>
            <span className="text-xs font-bold text-emerald-700">
              {demographicStats.totalChildren > 0
                ? `${Math.round((demographicStats.totalEnrolled / demographicStats.totalChildren) * 100)}%`
                : '0%'}
            </span>
          </div>
        </div>

        {/* Not Enrolled in Sunday School */}
        <div className="bg-white rounded-xl border border-amber-200/80 bg-amber-50/20 p-3.5 shadow-xs">
          <p className="text-[11px] font-semibold text-amber-800 flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>የማይማሩ (ክትትል የሚሹ)</span>
          </p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-black text-amber-900 tabular-nums">
              {demographicStats.totalNotEnrolled}
            </span>
            <span className="text-xs font-bold text-amber-700">
              {demographicStats.totalChildren > 0
                ? `${Math.round((demographicStats.totalNotEnrolled / demographicStats.totalChildren) * 100)}%`
                : '0%'}
            </span>
          </div>
        </div>
      </div>

      {/* Chapel Breakdown Strip: Direct Chapel connection requested by user */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3.5 mb-3.5 border-b border-slate-100 gap-2">
          <div>
            <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
              <Church className="w-4 h-4 text-blue-900" />
              <span>የቻፕሎች (አጥቢያዎች) የመማር ሁኔታ ማጠቃለያ</span>
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              በየቻፕሉ ያሉ ልጆች፣ የሚማሩ፣ የማይማሩ እና የወላጅ ስልክ መገናኛ ማዕከል (በቻፕሉ ላይ ጠቅ በማድረግ አጣራ)
            </p>
          </div>
          {selectedChapelFilter !== 'all' && (
            <button
              type="button"
              onClick={() => setSelectedChapelFilter('all')}
              className="text-xs font-bold text-blue-700 hover:text-blue-900 bg-blue-50 px-2.5 py-1 rounded-lg transition self-start print:hidden"
            >
              ✕ የቻፕል ማጣሪያ አጽዳ ({selectedChapelFilter})
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {chapelStats.chapels.map((ch) => {
            const st = chapelStats.statsMap[ch];
            const isSelected = selectedChapelFilter === ch;
            const rate = st.total > 0 ? Math.round((st.enrolled / st.total) * 100) : 0;

            return (
              <div
                key={`chapel_stat_${ch}`}
                onClick={() => setSelectedChapelFilter(isSelected ? 'all' : ch)}
                className={`p-3 rounded-xl border cursor-pointer transition text-left ${
                  isSelected
                    ? 'border-blue-900 bg-blue-50/80 ring-2 ring-blue-800/30'
                    : 'border-slate-200 hover:border-slate-300 bg-slate-50/50 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <h4 className="font-extrabold text-xs text-slate-900 truncate" title={ch}>
                    {ch}
                  </h4>
                  {isSelected && <span className="text-[10px] text-blue-800 font-bold">✓</span>}
                </div>
                <div className="mt-2 flex items-baseline justify-between">
                  <span className="text-lg font-black text-slate-900 tabular-nums">{st.total}</span>
                  <span className="text-[10px] text-slate-500 font-semibold">{rate}% ይማራሉ</span>
                </div>
                <div className="mt-1 flex items-center justify-between text-[11px] font-semibold pt-1 border-t border-slate-200/60">
                  <span className="text-emerald-700 flex items-center gap-0.5">
                    <span>✓</span>
                    <span>{st.enrolled}</span>
                  </span>
                  <span className="text-amber-800 flex items-center gap-0.5">
                    <span>✕</span>
                    <span>{st.notEnrolled}</span>
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Age Cohorts Matrix Table (0-3, 4-6, 7-9, 10-12, 13-14) */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3.5 mb-3.5 border-b border-slate-100 gap-2">
          <div>
            <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-800" />
              <span>የልጆች የዕድሜ ምድቦች ስታቲስቲክስ (ከ0-3፣ ከ4-6፣ ከ7-9፣ ከ10-12 እና ከ13-14)</span>
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              በዕድሜ ምድብ፣ በጾታ (ወንድ/ሴት) እና በሰንበት ት/ቤት የመማር ሁኔታ የተተነተነ ማጠቃለያ
            </p>
          </div>
          {ageFilter !== 'all' && (
            <button
              type="button"
              onClick={() => setAgeFilter('all')}
              className="text-xs font-bold text-blue-700 hover:text-blue-900 bg-blue-50 px-2.5 py-1 rounded-lg transition self-start print:hidden"
            >
              ✕ የዕድሜ ማጣሪያ አጽዳ
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 text-center">
                <th className="py-2.5 px-3 text-left">የዕድሜ ምድብ</th>
                <th className="py-2.5 px-3 bg-blue-50/60 text-blue-900">ወንድ</th>
                <th className="py-2.5 px-3 bg-rose-50/60 text-rose-900">ሴት</th>
                <th className="py-2.5 px-3 font-extrabold text-slate-900">ድምር</th>
                <th className="py-2.5 px-3 bg-emerald-50/60 text-emerald-900">በሰንበት ት/ቤት የሚማሩ</th>
                <th className="py-2.5 px-3 bg-amber-50/60 text-amber-900">የማይማሩ</th>
                <th className="py-2.5 px-3">የመቶኛ ድርሻ (%)</th>
                <th className="py-2.5 px-3 text-right print:hidden">ማጣሪያ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-center">
              {demographicStats.cohorts.map((coh) => {
                const isSelected = ageFilter === coh.key;
                const percentage =
                  demographicStats.totalChildren > 0
                    ? Math.round((coh.total / demographicStats.totalChildren) * 100)
                    : 0;

                return (
                  <tr
                    key={coh.key}
                    onClick={() => setAgeFilter(isSelected ? 'all' : (coh.key as AgeFilter))}
                    className={`cursor-pointer transition-colors ${
                      isSelected ? 'bg-blue-50/80 font-bold' : 'hover:bg-slate-50'
                    }`}
                  >
                    <td className="py-2.5 px-3 text-left font-bold text-slate-900">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`w-2.5 h-2.5 rounded-full ${
                            coh.key === '0-3'
                              ? 'bg-purple-500'
                              : coh.key === '4-6'
                              ? 'bg-blue-500'
                              : coh.key === '7-9'
                              ? 'bg-emerald-500'
                              : coh.key === '10-12'
                              ? 'bg-amber-500'
                              : coh.key === '13-14'
                              ? 'bg-rose-500'
                              : 'bg-slate-400'
                          }`}
                        />
                        <span>{coh.label}</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 tabular-nums font-bold text-blue-900 bg-blue-50/30">
                      {coh.male}
                    </td>
                    <td className="py-2.5 px-3 tabular-nums font-bold text-rose-900 bg-rose-50/30">
                      {coh.female}
                    </td>
                    <td className="py-2.5 px-3 tabular-nums font-extrabold text-slate-900">
                      {coh.total}
                    </td>
                    <td className="py-2.5 px-3 tabular-nums font-bold text-emerald-800 bg-emerald-50/30">
                      {coh.enrolled}
                    </td>
                    <td className="py-2.5 px-3 tabular-nums font-bold text-amber-800 bg-amber-50/30">
                      {coh.notEnrolled}
                    </td>
                    <td className="py-2.5 px-3 tabular-nums font-semibold text-slate-600">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-16 bg-slate-200 rounded-full h-1.5 overflow-hidden print:hidden">
                          <div
                            className="bg-blue-900 h-1.5 rounded-full"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        <span>{percentage}%</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-right print:hidden">
                      <span className="text-[11px] text-blue-700 font-semibold hover:underline">
                        {isSelected ? '✓ ተመርጧል' : 'አሳይ →'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-slate-100 font-black border-t-2 border-slate-300 text-center text-slate-900">
                <td className="py-2.5 px-3 text-left">ጠቅላላ ድምር</td>
                <td className="py-2.5 px-3 text-blue-950 tabular-nums">{demographicStats.totalMale}</td>
                <td className="py-2.5 px-3 text-rose-950 tabular-nums">{demographicStats.totalFemale}</td>
                <td className="py-2.5 px-3 text-slate-950 tabular-nums">{demographicStats.totalChildren}</td>
                <td className="py-2.5 px-3 text-emerald-950 tabular-nums">{demographicStats.totalEnrolled}</td>
                <td className="py-2.5 px-3 text-amber-950 tabular-nums">{demographicStats.totalNotEnrolled}</td>
                <td className="py-2.5 px-3 tabular-nums">100%</td>
                <td className="py-2.5 px-3 print:hidden"></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Segmented View Filters & Sunday School Sync Hub */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm print:hidden">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Segmented Filter Buttons */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl overflow-x-auto scrollbar-thin">
            <button
              type="button"
              onClick={() => setViewFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap flex items-center gap-1.5 ${
                viewFilter === 'all'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>ሁሉም ልጆች</span>
              <span className="text-[11px] px-1.5 py-0.2 rounded-full bg-slate-200 text-slate-700">
                {churchChildren.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setViewFilter('enrolled')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap flex items-center gap-1.5 ${
                viewFilter === 'enrolled'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>በሰንበት ት/ቤት የሚማሩ</span>
              <span className="text-[11px] px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800">
                {demographicStats.totalEnrolled}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setViewFilter('not_enrolled')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap flex items-center gap-1.5 ${
                viewFilter === 'not_enrolled'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <AlertCircle className="w-3.5 h-3.5" />
              <span>የማይማሩ (ክትትል & ስልክ)</span>
              <span className="text-[11px] px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-900">
                {demographicStats.totalNotEnrolled}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setViewFilter('missing_from_church')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap flex items-center gap-1.5 ${
                viewFilter === 'missing_from_church'
                  ? 'bg-purple-700 text-white shadow-xs'
                  : 'text-purple-700 hover:text-purple-900 bg-purple-50'
              }`}
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>በቋቱ የሌሉ የሰንበት ተማሪዎች</span>
              <span className="text-[11px] px-1.5 py-0.2 rounded-full bg-purple-200 text-purple-900 font-extrabold">
                {missingFromChurchChildren.length}
              </span>
            </button>
          </div>

          {/* Quick Notice / Action */}
          {missingFromChurchChildren.length > 0 && viewFilter === 'missing_from_church' && (
            <button
              type="button"
              onClick={handleBatchImportMissing}
              className="bg-purple-700 hover:bg-purple-600 text-white text-xs font-bold px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 shrink-0 shadow-sm"
            >
              <UserCheck className="w-4 h-4" />
              <span>ሁሉንም ({missingFromChurchChildren.length}) ወደ ቋቱ አስገባ</span>
            </button>
          )}
        </div>
      </div>

      {/* Search and Column Filter Strip (for church children views) */}
      {viewFilter !== 'missing_from_church' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm print:hidden">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="በልጅ ስም፣ ወላጅ፣ ስልክ፣ ቻፕል..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 bg-slate-50 focus:bg-white"
              />
            </div>

            {/* Chapel Filter Dropdown */}
            <div className="flex items-center gap-1.5">
              <Church className="w-4 h-4 text-slate-400 shrink-0" />
              <select
                value={selectedChapelFilter}
                onChange={(e) => setSelectedChapelFilter(e.target.value)}
                className="w-full py-2 px-2.5 text-xs border border-slate-200 rounded-xl bg-white font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                <option value="all">ሁሉም ቻፕሎች (አጥቢያዎች)</option>
                {chapelStats.chapels.map((ch) => (
                  <option key={`opt_ch_${ch}`} value={ch}>
                    {ch}
                  </option>
                ))}
              </select>
            </div>

            {/* Age Filter */}
            <div className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
              <select
                value={ageFilter}
                onChange={(e) => setAgeFilter(e.target.value as AgeFilter)}
                className="w-full py-2 px-2.5 text-xs border border-slate-200 rounded-xl bg-white font-medium focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                <option value="all">ሁሉም የዕድሜ ምድቦች</option>
                <option value="0-3">ከ0 - 3 ዓመት (ጨቅላና ህፃናት)</option>
                <option value="4-6">ከ4 - 6 ዓመት (ጀማሪ ህፃናት)</option>
                <option value="7-9">ከ7 - 9 ዓመት (መካከለኛ ህፃናት)</option>
                <option value="10-12">ከ10 - 12 ዓመት (ታዳጊዎች)</option>
                <option value="13-14">ከ13 - 14 ዓመት (ታዳጊ ወጣቶች)</option>
                <option value="15+">ከ15 ዓመት በላይ</option>
              </select>
            </div>

            {/* Gender Filter */}
            <div className="flex items-center gap-1.5">
              <User className="w-4 h-4 text-slate-400 shrink-0" />
              <select
                value={genderFilter}
                onChange={(e) => setGenderFilter(e.target.value)}
                className="w-full py-2 px-2.5 text-xs border border-slate-200 rounded-xl bg-white font-medium focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                <option value="all">ሁሉም ጾታ (ወንድና ሴት)</option>
                <option value="ወ">ወንድ ብቻ</option>
                <option value="ሴ">ሴት ብቻ</option>
              </select>
            </div>

            {/* Reset / Count Indicator */}
            <div className="flex items-center justify-between gap-2 text-xs font-semibold text-slate-600">
              <span>የተገኙ፦ <strong className="text-blue-900 font-extrabold">{filteredChildren.length}</strong></span>
              {(searchTerm || ageFilter !== 'all' || genderFilter !== 'all' || selectedChapelFilter !== 'all') && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchTerm('');
                    setAgeFilter('all');
                    setGenderFilter('all');
                    setSelectedChapelFilter('all');
                  }}
                  className="text-rose-600 hover:text-rose-800 hover:underline font-bold"
                >
                  አጽዳ
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main Table: Church Children List with Direct Sunday School Link, Chapel, and Parent Phone */}
      {viewFilter !== 'missing_from_church' ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden print:border-none print:shadow-none print:rounded-none">
          <div className="overflow-x-auto print:overflow-visible">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-900 text-white uppercase text-[11px] tracking-wider print:bg-slate-800 print:text-white">
                  <th className="py-3 px-3 text-center w-12 font-bold">ተ.ቁ</th>
                  <th className="py-3 px-4 font-extrabold text-[13pt] text-white min-w-[210px]">የልጁ ሙሉ ስም</th>
                  <th className="py-3 px-3 font-bold min-w-[140px]">ቻፕል (አጥቢያ)</th>
                  <th className="py-3 px-3 text-center font-bold w-16">ጾታ</th>
                  <th className="py-3 px-3 text-center font-bold w-16">ዕድሜ</th>
                  <th className="py-3 px-3 font-bold min-w-[160px]">የሰንበት ት/ቤት የመማር ሁኔታ</th>
                  <th className="py-3 px-3 font-bold min-w-[150px]">የወላጅ/አሳዳጊ ስም</th>
                  <th className="py-3 px-3 font-bold min-w-[150px]">የወላጅ ስልክ ቁጥር</th>
                  <th className="py-3 px-3 font-bold min-w-[130px]">መኖሪያ ቀበሌ</th>
                  <th className="py-3 px-3 text-center font-bold w-24 print:hidden">እርምጃዎች</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredChildren.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-12 text-center text-slate-500">
                      <Users className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                      <p className="font-semibold text-sm">በተመረጠው መስፈርት የተገኘ ልጅ የለም!</p>
                      <p className="text-xs text-slate-400 mt-1">የፍለጋ ቃሉን ወይም ማጣሪያውን ይቀይሩ ወይም አዲስ ልጅ ይመዝግቡ።</p>
                    </td>
                  </tr>
                ) : (
                  filteredChildren.map((child, idx) => {
                    const isMale = child.gender === 'ወ';
                    const isFemale = child.gender === 'ሴ';
                    const isCopied = copiedPhoneId === child.id;

                    return (
                      <tr
                        key={child.id}
                        className="hover:bg-blue-50/40 transition-colors print:break-inside-avoid"
                      >
                        {/* Index */}
                        <td className="py-2.5 px-3 text-center font-bold text-slate-500 bg-slate-50/50 print:bg-transparent">
                          {idx + 1}
                        </td>

                        {/* Child Name (13pt Bold) */}
                        <td className="py-2.5 px-4 font-bold text-[13pt] text-slate-900 min-w-[210px] leading-normal">
                          <span>{child.name}</span>
                        </td>

                        {/* Chapel */}
                        <td className="py-2.5 px-3">
                          <span className="inline-flex items-center gap-1 font-bold text-[11px] text-blue-900 bg-blue-50/80 px-2.5 py-0.5 rounded-lg border border-blue-200/80 print:border-none print:bg-transparent print:p-0">
                            <Church className="w-3 h-3 text-blue-700 print:hidden shrink-0" />
                            <span>{child.chapel || 'ዋናው ማዕከል ቻፕል'}</span>
                          </span>
                        </td>

                        {/* Gender */}
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
                            {isMale ? 'ወንድ' : isFemale ? 'ሴት' : '-'}
                          </span>
                        </td>

                        {/* Age */}
                        <td className="py-2.5 px-3 text-center font-bold text-slate-800 tabular-nums">
                          {child.age ? `${child.age} ዓመት` : '-'}
                        </td>

                        {/* Sunday School Enrollment Status */}
                        <td className="py-2.5 px-3">
                          {child.isEnrolled ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200/80 font-bold text-[11px] print:border-none print:bg-transparent print:p-0">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600 print:hidden shrink-0" />
                              <span>ይማራል ({child.enrolledClass})</span>
                            </span>
                          ) : (
                            <div className="flex items-center gap-2">
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 text-amber-900 border border-amber-200 font-bold text-[11px] print:border-none print:bg-transparent print:p-0">
                                <AlertCircle className="w-3 h-3 text-amber-600 print:hidden shrink-0" />
                                <span>አይማርም</span>
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  setEnrollTargetChild(child);
                                  setSelectedEnrollClass(classList[0] || 'ማቆያ ክፍል');
                                }}
                                className="text-[11px] text-blue-700 hover:text-blue-900 font-bold hover:underline print:hidden flex items-center gap-0.5"
                                title="ይህን ልጅ ወደ ሰንበት ት/ቤት መዝግብ"
                              >
                                <span>መዝግብ</span>
                                <ChevronRight className="w-3 h-3" />
                              </button>
                            </div>
                          )}
                        </td>

                        {/* Parent / Guardian Name */}
                        <td className="py-2.5 px-3 text-slate-700 font-medium">
                          {child.parentName || '-'}
                        </td>

                        {/* Parent Phone Number with Quick Call & Copy */}
                        <td className="py-2.5 px-3 text-slate-800 font-mono text-[11px]">
                          {child.phone ? (
                            <div className="flex items-center gap-1.5">
                              <a
                                href={`tel:${child.phone}`}
                                className="inline-flex items-center gap-1 font-bold text-emerald-800 hover:text-emerald-950 hover:underline bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200 print:border-none print:bg-transparent print:p-0"
                                title="ደውል"
                              >
                                <PhoneCall className="w-3 h-3 text-emerald-600 print:hidden shrink-0" />
                                <span>{child.phone}</span>
                              </a>
                              <button
                                type="button"
                                onClick={() => handleCopyPhone(child.id, child.phone!)}
                                className="p-1 hover:bg-slate-200 text-slate-500 rounded print:hidden transition"
                                title="ስልክ ቅዳ"
                              >
                                {isCopied ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5 text-slate-400" />
                                )}
                              </button>
                            </div>
                          ) : (
                            <span className="text-slate-400 italic text-[11px]">- ስልክ የለም -</span>
                          )}
                        </td>

                        {/* Residence */}
                        <td className="py-2.5 px-3 text-slate-600">
                          {child.residence || child.fellowshipOrVillage || '-'}
                        </td>

                        {/* Actions */}
                        <td className="py-2.5 px-3 text-center print:hidden">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => openEditModal(child)}
                              className="p-1.5 hover:bg-slate-100 text-slate-600 hover:text-blue-700 rounded-lg transition"
                              title="አስተካክል"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (window.confirm(`"${child.name}" ከመረጃ ቋቱ ይሰረዝ?`)) {
                                  onDeleteChild(child.id);
                                }
                              }}
                              className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition"
                              title="ሰርዝ"
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
        </div>
      ) : (
        /* Special View: Sunday School Students Missing From Church Children Registry */
        <div className="bg-white rounded-2xl border border-purple-200 shadow-sm overflow-hidden">
          <div className="p-4 bg-purple-50/70 border-b border-purple-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-extrabold text-purple-950 flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-purple-700" />
                <span>በሰንበት ትምህርት ቤት የተመዘገቡ ነገር ግን በቤተክርስቲያኒቱ ቋት የሌሉ ተማሪዎች</span>
              </h3>
              <p className="text-xs text-purple-800/80 mt-0.5">
                እነዚህ ተማሪዎች በክፍል ውጤት ወይም አተንዳንስ መዝገብ ውስጥ ይገኛሉ፤ ወደ ቤተክርስቲያኒቱ የልጆች ቋት በማስገባት መረጃቸውን ሙሉ ያድርጉ።
              </p>
            </div>
            {missingFromChurchChildren.length > 0 && (
              <button
                type="button"
                onClick={handleBatchImportMissing}
                className="bg-purple-700 hover:bg-purple-600 text-white font-bold text-xs px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 shrink-0 shadow-sm"
              >
                <UserCheck className="w-4 h-4" />
                <span>ሁሉንም ({missingFromChurchChildren.length}) ወደ ቋቱ አስገባ</span>
              </button>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-purple-900 text-white uppercase text-[11px] tracking-wider">
                  <th className="py-3 px-3 text-center w-12 font-bold">ተ.ቁ</th>
                  <th className="py-3 px-4 font-extrabold text-[13pt] text-white min-w-[220px]">የተማሪው ሙሉ ስም</th>
                  <th className="py-3 px-3 font-bold min-w-[130px]">የሰንበት ት/ቤት ክፍል</th>
                  <th className="py-3 px-3 text-center font-bold w-16">ጾታ</th>
                  <th className="py-3 px-3 text-center font-bold w-16">ዕድሜ</th>
                  <th className="py-3 px-3 text-center font-bold w-36">ተግባር</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {missingFromChurchChildren.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-500">
                      <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
                      <p className="font-bold text-sm text-slate-800">ሁሉም የሰንበት ት/ቤት ተማሪዎች በቋቱ ተካተዋል!</p>
                      <p className="text-xs text-slate-400 mt-1">በሰንበት ት/ቤት ካሉት ተማሪዎች በቋቱ ያልተመዘገበ የለም።</p>
                    </td>
                  </tr>
                ) : (
                  missingFromChurchChildren.map((item, idx) => (
                    <tr key={`missing_${item.className}_${item.student.id}`} className="hover:bg-purple-50/30 transition">
                      <td className="py-2.5 px-3 text-center font-bold text-slate-500 bg-slate-50">
                        {idx + 1}
                      </td>
                      <td className="py-2.5 px-4 font-bold text-[13pt] text-slate-900 min-w-[220px]">
                        {item.student.name}
                      </td>
                      <td className="py-2.5 px-3 font-bold text-blue-900">
                        <span className="bg-blue-50 text-blue-800 px-2.5 py-0.5 rounded-lg border border-blue-200 font-bold text-[11px]">
                          {item.className}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center font-bold">
                        {item.student.gender || '-'}
                      </td>
                      <td className="py-2.5 px-3 text-center font-bold tabular-nums">
                        {item.student.age ? `${item.student.age} ዓመት` : '-'}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleImportSingleMissing(item)}
                          className="bg-purple-600 hover:bg-purple-500 text-white font-bold text-[11px] px-3 py-1.5 rounded-lg transition flex items-center gap-1 mx-auto"
                        >
                          <UserPlus className="w-3.5 h-3.5" />
                          <span>ወደ ቋቱ አስገባ</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add / Edit Child Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-blue-800" />
                <span>{editingChild ? 'የልጁን መረጃ ማስተካከያ' : 'አዲስ ልጅ መመዝገቢያ'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveChild} className="space-y-4 mt-4">
              {/* Child Full Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  የልጁ ሙሉ ስም <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="ምሳሌ፦ ዮናታን ዳዊት ታደሰ"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 font-bold text-slate-900"
                />
              </div>

              {/* Chapel Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ቻፕል (አጥቢያ ማዕከል) <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formChapel}
                  onChange={(e) => setFormChapel(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 bg-white font-bold text-slate-900"
                >
                  {chapelList.map((ch) => (
                    <option key={`ch_opt_${ch}`} value={ch}>
                      {ch}
                    </option>
                  ))}
                </select>
              </div>

              {/* Gender and Age */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">ጾታ</label>
                  <select
                    value={formGender}
                    onChange={(e) => setFormGender(e.target.value as 'ወ' | 'ሴ')}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 bg-white font-medium"
                  >
                    <option value="ወ">ወንድ (ወ)</option>
                    <option value="ሴ">ሴት (ሴ)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">ዕድሜ (ዓመት)</label>
                  <input
                    type="number"
                    min={0}
                    max={25}
                    required
                    value={formAge}
                    onChange={(e) => setFormAge(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 tabular-nums font-bold"
                  />
                </div>
              </div>

              {/* Parent Name & Phone */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">የወላጅ / አሳዳጊ ስም</label>
                  <input
                    type="text"
                    placeholder="ምሳሌ፦ ዳዊት ታደሰ"
                    value={formParent}
                    onChange={(e) => setFormParent(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    የወላጅ ስልክ ቁጥር
                  </label>
                  <input
                    type="tel"
                    placeholder="09..."
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 font-mono font-bold"
                  />
                </div>
              </div>

              {/* Residence & Fellowship/Village */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">መኖሪያ ቀበሌ / ሰፈር</label>
                  <input
                    type="text"
                    placeholder="ምሳሌ፦ ቀበሌ 01"
                    value={formResidence}
                    onChange={(e) => setFormResidence(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">ህብረት / መንደር</label>
                  <input
                    type="text"
                    placeholder="ምሳሌ፦ ቤቴል ህብረት"
                    value={formVillage}
                    onChange={(e) => setFormVillage(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">ተጨማሪ ማስታወሻ (አማራጭ)</label>
                <input
                  type="text"
                  placeholder="ማስታወሻ..."
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
                >
                  ሰርዝ
                </button>
                <button
                  type="submit"
                  className="bg-blue-900 hover:bg-blue-800 text-white font-bold text-xs px-4 py-2 rounded-xl transition shadow-xs"
                >
                  {editingChild ? 'አዘምን' : 'መዝግብ'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Enroll to Sunday School Modal */}
      {enrollTargetChild && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-emerald-700" />
                <span>ልጁን ወደ ሰንበት ት/ቤት መመዝገቢያ</span>
              </h3>
              <button
                type="button"
                onClick={() => setEnrollTargetChild(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-3.5">
              <div className="bg-emerald-50/60 p-3 rounded-xl border border-emerald-100 text-xs text-emerald-950 space-y-1">
                <p>
                  የልጁ ስም፦ <strong className="font-extrabold text-[13pt] text-slate-900 block mt-0.5">{enrollTargetChild.name}</strong>
                </p>
                <p>
                  ቻፕል፦ <strong className="text-blue-900 font-bold">{enrollTargetChild.chapel || 'ዋናው ማዕከል ቻፕል'}</strong>
                </p>
                <p>
                  ጾታ፦ <strong>{enrollTargetChild.gender === 'ወ' ? 'ወንድ' : 'ሴት'}</strong> · ዕድሜ፦ <strong>{enrollTargetChild.age || '-'} ዓመት</strong>
                </p>
                {enrollTargetChild.phone && (
                  <p>
                    የወላጅ ስልክ፦ <strong className="font-mono text-emerald-900">{enrollTargetChild.phone}</strong>
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  የሰንበት ትምህርት ቤት ክፍል ይምረጡ፦
                </label>
                <select
                  value={selectedEnrollClass}
                  onChange={(e) => setSelectedEnrollClass(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600 bg-white font-bold text-slate-900"
                >
                  {classList.map((cls) => (
                    <option key={`enroll_cls_${cls}`} value={cls}>
                      {cls}
                    </option>
                  ))}
                </select>
              </div>

              <p className="text-[11px] text-slate-500">
                ልጁ በቀጥታ በ{currentYear} ዓ.ም በተመረጠው የሰንበት ትምህርት ቤት ክፍል ውስጥ ይካተታል።
              </p>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEnrollTargetChild(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600"
                >
                  ሰርዝ
                </button>
                <button
                  type="button"
                  onClick={handleConfirmEnroll}
                  className="bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs px-4 py-2 rounded-xl transition shadow-xs flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>ወደ {selectedEnrollClass} መዝግብ</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Excel Import Modal */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-emerald-700" />
                <span>ልጆችን ከExcel (.xlsx / .csv) ፋይል ማስገቢያ</span>
              </h3>
              <button
                type="button"
                onClick={() => {
                  setIsImportModalOpen(false);
                  setImportPreview([]);
                  setImportFileName('');
                }}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 mt-4 overflow-y-auto pr-1 flex-1">
              {/* Instructions and Sample download */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs flex items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <p className="font-bold text-slate-800">ትክክለኛውን የExcel ቅጽ ይጠቀሙ</p>
                  <p className="text-slate-500 text-[11px]">
                    የExcel ሰንጠረዡ የልጁ ስም፣ ጾታ፣ ዕድሜ፣ ቻፕል፣ የወላጅ ስም እና ስልክ አምዶችን መያዝ ይችላል።
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleDownloadSampleTemplate}
                  className="bg-white hover:bg-slate-100 text-blue-900 font-bold text-xs px-3 py-1.5 rounded-lg border border-slate-300 transition shrink-0 flex items-center gap-1 shadow-2xs"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>የExcel ናሙና አውርድ</span>
                </button>
              </div>

              {/* Upload Dropzone */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-emerald-400 hover:border-emerald-600 bg-emerald-50/20 hover:bg-emerald-50/40 rounded-2xl p-6 text-center cursor-pointer transition"
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept=".xlsx, .xls, .csv"
                  className="hidden"
                />
                <FileUp className="w-10 h-10 text-emerald-700 mx-auto mb-2" />
                <p className="text-xs font-bold text-slate-800">
                  {importFileName ? `የተመረጠ ፋይል፦ ${importFileName}` : 'Excel ወይም CSV ፋይል እዚህ ይጫኑ (Click to Browse)'}
                </p>
                <p className="text-[11px] text-slate-400 mt-1">.xlsx, .xls ወይም .csv ፋይሎች ይደገፋሉ</p>
              </div>

              {/* Preview Table */}
              {importPreview.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                    <span>የተነበቡ ልጆች ቅድመ-ዕይታ ({importPreview.length} ልጆች ተገኝተዋል)</span>
                  </div>
                  <div className="max-h-60 overflow-y-auto border border-slate-200 rounded-xl">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-slate-100 text-slate-700 font-bold sticky top-0">
                        <tr>
                          <th className="py-2 px-2 text-center w-8">#</th>
                          <th className="py-2 px-3">ስም</th>
                          <th className="py-2 px-2">ቻፕል</th>
                          <th className="py-2 px-2 text-center">ጾታ</th>
                          <th className="py-2 px-2 text-center">ዕድሜ</th>
                          <th className="py-2 px-3">ወላጅ</th>
                          <th className="py-2 px-3">ስልክ</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {importPreview.slice(0, 100).map((row, idx) => (
                          <tr key={`imp_${idx}`} className="hover:bg-slate-50">
                            <td className="py-1.5 px-2 text-center text-slate-400">{idx + 1}</td>
                            <td className="py-1.5 px-3 font-bold text-slate-900">{row.name}</td>
                            <td className="py-1.5 px-2 text-blue-900 font-bold">{row.chapel || '-'}</td>
                            <td className="py-1.5 px-2 text-center font-bold">{row.gender}</td>
                            <td className="py-1.5 px-2 text-center tabular-nums">{row.age}</td>
                            <td className="py-1.5 px-3 text-slate-600">{row.parentName || '-'}</td>
                            <td className="py-1.5 px-3 font-mono text-[11px]">{row.phone || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100 mt-3">
              <button
                type="button"
                onClick={() => {
                  setIsImportModalOpen(false);
                  setImportPreview([]);
                  setImportFileName('');
                }}
                className="px-4 py-2 text-xs font-semibold text-slate-600"
              >
                ሰርዝ
              </button>
              <button
                type="button"
                disabled={importPreview.length === 0}
                onClick={handleConfirmImport}
                className="bg-emerald-700 hover:bg-emerald-600 disabled:bg-slate-300 text-white font-bold text-xs px-5 py-2 rounded-xl transition shadow-xs"
              >
                {importPreview.length > 0 ? `ሁሉንም (${importPreview.length}) አስገባ` : 'መረጃ አልተመረጠም'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

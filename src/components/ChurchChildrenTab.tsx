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
  PhoneCall,
  BookOpen,
  Briefcase
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
  onClearChurchChildren?: (chapelFilter?: string) => void;
  onBatchAddChildren: (children: Omit<ChurchChild, 'id'>[], mode?: 'append' | 'replace') => void;
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
  onClearChurchChildren,
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
  const [isClearModalOpen, setIsClearModalOpen] = useState<boolean>(false);
  const [clearTargetChapel, setClearTargetChapel] = useState<string>('all');
  const [clearConfirmWord, setClearConfirmWord] = useState<string>('');

  // Form state
  const [formName, setFormName] = useState<string>('');
  const [formGender, setFormGender] = useState<'ወ' | 'ሴ' | ''>('ወ');
  const [formAge, setFormAge] = useState<string>('5');
  const [formEducationLevel, setFormEducationLevel] = useState<string>('1ኛ ክፍል');
  const [formOccupation, setFormOccupation] = useState<string>('ተማሪ');
  const [formChapel, setFormChapel] = useState<string>(chapelList[0] || 'ዋናው ማዕከል ቻፕል');
  const [formParent, setFormParent] = useState<string>('');
  const [formPhone, setFormPhone] = useState<string>('');
  const [formResidence, setFormResidence] = useState<string>('');
  const [formVillage, setFormVillage] = useState<string>('');
  const [formNotes, setFormNotes] = useState<string>('');

  // Import preview state (General church database 0-14 filter)
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importChildrenPreview, setImportChildrenPreview] = useState<Omit<ChurchChild, 'id'>[]>([]);
  const [importAdultsSkipped, setImportAdultsSkipped] = useState<{ name: string; age: number; gender: string; reason: string }[]>([]);
  const [importTotalRows, setImportTotalRows] = useState<number>(0);
  const [importActiveTab, setImportActiveTab] = useState<'children' | 'adults'>('children');
  const [importMode, setImportMode] = useState<'append' | 'replace'>('append');
  const [importChapelFilter, setImportChapelFilter] = useState<string>('all');
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
    setFormEducationLevel('1ኛ ክፍል');
    setFormOccupation('ተማሪ');
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
    setFormEducationLevel(child.educationLevel || '1ኛ ክፍል');
    setFormOccupation(child.occupation || 'ተማሪ');
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
      educationLevel: formEducationLevel.trim() || undefined,
      occupation: formOccupation.trim() || undefined,
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
    // Sheet 1: Children list (0-14 years)
    const headers = [
      'ተ.ቁ',
      'የልጁ ሙሉ ስም',
      'ጾታ',
      'ዕድሜ',
      'የዕድሜ ምድብ',
      'የትምህርት ደረጃ',
      'የስራ ዓይነት',
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
        c.educationLevel || (numAge <= 3 ? 'ጨቅላ' : numAge <= 6 ? 'መዋዕለ ሕፃናት' : `${numAge - 6}ኛ ክፍል`),
        c.occupation || (numAge <= 3 ? 'የቤት ውስጥ' : 'ተማሪ'),
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
      { name: 'የልጆች ቋት (0-14 ዓመት)', data: [headers, ...rows] },
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
    const headers = [
      'ተ.ቁ',
      'የልጁ ሙሉ ስም',
      'ጾታ (ወ/ሴ)',
      'ዕድሜ (0-14)',
      'የትምህርት ደረጃ',
      'የስራ ዓይነት',
      'ቻፕል',
      'የወላጅ ስም',
      'የወላጅ ስልክ',
      'መኖሪያ አካባቢ',
      'ህብረት/መንደር',
      'ማስታወሻ'
    ];
    const sampleRows = [
      [1, 'ዮናታን ዳዊት', 'ወ', 2, 'ጨቅላ/ያልጀመረ', 'የቤት ውስጥ', 'ዋናው ማዕከል ቻፕል', 'ዳዊት ታደሰ', '0911223344', 'ቀበሌ 01', 'ቤቴል ህብረት', 'ጨቅላ ህፃን'],
      [2, 'ሩት ተስፋዬ', 'ሴ', 5, 'መዋዕለ ሕፃናት (KG 2)', 'ተማሪ', 'ሰላም ቻፕል', 'ተስፋዬ በቀለ', '0922334455', 'ቀበሌ 02', 'ሰላም ህብረት', ''],
      [3, 'አማኑኤል መሠረት', 'ወ', 8, '2ኛ ክፍል', 'ተማሪ', 'ቤቴል ቻፕል', 'መሠረት ሌቃ', '0933445566', 'ቀበሌ 01', 'አማኑኤል ህብረት', ''],
      [4, 'ራሔል አሸናፊ', 'ሴ', 11, '5ኛ ክፍል', 'ተማሪ', 'ሰላም ቻፕል', 'አሸናፊ ጫፋ', '0944556677', 'ቀበሌ 03', 'ጽዮን ህብረት', ''],
      [5, 'ዳዊት መስፍን', 'ወ', 14, '8ኛ ክፍል', 'ተማሪ', 'ዋናው ማዕከል ቻፕል', 'መስፍን ማንጁራ', '0955667788', 'መንደር 1', 'ቤቴል ህብረት', '']
    ];
    downloadXLSX([headers, ...sampleRows], 'የልጆች_መረጃ_መሙያ_ናሙና.xlsx', 'የልጆች መረጃ');
  };

  // Handle File Upload from General Church Database with 0-14 Child Filter
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
        const rawRows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        if (!rawRows || rawRows.length < 2) {
          alert('ፋይሉ ምንም የመረጃ መስመር አልያዘም!');
          return;
        }

        // Search for header row among first 10 rows
        let headerRowIndex = 0;
        let nameIdx = -1;
        let genderIdx = -1;
        let ageIdx = -1;
        let birthYearIdx = -1;
        let educationIdx = -1;
        let occupationIdx = -1;
        let chapelIdx = -1;
        let parentIdx = -1;
        let phoneIdx = -1;
        let residenceIdx = -1;
        let villageIdx = -1;
        let notesIdx = -1;

        for (let r = 0; r < Math.min(10, rawRows.length); r++) {
          const row = rawRows[r] || [];
          let matches = 0;
          row.forEach((col: any) => {
            const str = String(col || '').toLowerCase().trim();
            if (str.includes('ስም') || str.includes('name')) matches++;
            if (str.includes('ጾታ') || str.includes('gender') || str.includes('sex') || str === 'ወ/ሴ') matches++;
            if (str.includes('ዕድሜ') || str.includes('age') || str.includes('ትውልድ') || str.includes('ልደት')) matches++;
            if (str.includes('ትምህርት') || str.includes('ደረጃ') || str.includes('grade') || str.includes('education')) matches++;
            if (str.includes('ስራ') || str.includes('ሥራ') || str.includes('occupation') || str.includes('job')) matches++;
            if (str.includes('ቻፕል') || str.includes('chapel') || str.includes('አጥቢያ')) matches++;
            if (str.includes('ስልክ') || str.includes('phone') || str.includes('mobile')) matches++;
          });
          if (matches >= 2) {
            headerRowIndex = r;
            break;
          }
        }

        const headerRow = rawRows[headerRowIndex] || [];
        headerRow.forEach((col: any, idx: number) => {
          const str = String(col || '').toLowerCase().trim();
          if ((str.includes('ስም') || str.includes('name')) && !str.includes('ወላጅ') && !str.includes('አባት') && !str.includes('እናት') && !str.includes('parent')) {
            if (nameIdx === -1) nameIdx = idx;
          }
          if (str.includes('ጾታ') || str.includes('gender') || str.includes('sex') || str === 'ወ/ሴ') {
            if (genderIdx === -1) genderIdx = idx;
          }
          if (str.includes('ዕድሜ') || str.includes('age')) {
            if (ageIdx === -1) ageIdx = idx;
          }
          if (str.includes('ትውልድ') || str.includes('ልደት') || str.includes('birth') || str.includes('dob') || str.includes('yob')) {
            if (birthYearIdx === -1) birthYearIdx = idx;
          }
          if (str.includes('ትምህርት') || str.includes('ደረጃ') || str.includes('education') || str.includes('grade') || str.includes('level') || str.includes('የት/ደረጃ')) {
            if (educationIdx === -1) educationIdx = idx;
          }
          if (str.includes('ስራ') || str.includes('ሥራ') || str.includes('occupation') || str.includes('job') || str.includes('profession') || str.includes('work')) {
            if (occupationIdx === -1) occupationIdx = idx;
          }
          if (str.includes('ቻፕል') || str.includes('chapel') || str.includes('አጥቢያ') || str.includes('ማዕከል') || str.includes('branch')) {
            if (chapelIdx === -1) chapelIdx = idx;
          }
          if (str.includes('ወላጅ') || str.includes('አባት') || str.includes('እናት') || str.includes('አሳዳጊ') || str.includes('parent') || str.includes('guardian')) {
            if (parentIdx === -1) parentIdx = idx;
          }
          if (str.includes('ስልክ') || str.includes('phone') || str.includes('mobile') || str.includes('tel') || str.includes('cell')) {
            if (phoneIdx === -1) phoneIdx = idx;
          }
          if (str.includes('መኖሪያ') || str.includes('ቀበሌ') || str.includes('አካባቢ') || str.includes('residence')) {
            if (residenceIdx === -1) residenceIdx = idx;
          }
          if (str.includes('መንደር') || str.includes('ህብረት') || str.includes('ሰፈር') || str.includes('village') || str.includes('fellowship')) {
            if (villageIdx === -1) villageIdx = idx;
          }
          if (str.includes('ማስታወሻ') || str.includes('note') || str.includes('remark')) {
            if (notesIdx === -1) notesIdx = idx;
          }
        });

        if (nameIdx === -1) nameIdx = 0;
        if (genderIdx === -1) genderIdx = 1;
        if (ageIdx === -1 && birthYearIdx !== -1) ageIdx = birthYearIdx;
        else if (ageIdx === -1) ageIdx = 2;

        const currentEthYearNum = parseInt(currentYear, 10) || 2019;
        const currentGregYearNum = new Date().getFullYear();

        const childrenList: Omit<ChurchChild, 'id'>[] = [];
        const adultsList: { name: string; age: number; gender: string; reason: string }[] = [];
        let totalProcessed = 0;

        for (let i = headerRowIndex + 1; i < rawRows.length; i++) {
          const row = rawRows[i];
          if (!row || row.length === 0) continue;

          const rawName = String(row[nameIdx] || '').trim();
          if (!rawName || rawName === 'ተ.ቁ' || rawName === 'ስም' || rawName.includes('ድምር') || rawName.includes('ጠቅላላ')) continue;

          totalProcessed++;

          // 1. Gender detection
          const rawGender = String(genderIdx !== -1 ? row[genderIdx] || '' : '').trim();
          const gender = rawGender.startsWith('ሴ') || rawGender.toLowerCase().startsWith('f') || rawGender.toLowerCase().includes('female') ? 'ሴ' : 'ወ';

          // 2. Age detection & Calculation
          let calculatedAge = -1;
          const rawAgeVal = ageIdx !== -1 ? row[ageIdx] : undefined;
          const rawBirthVal = birthYearIdx !== -1 ? row[birthYearIdx] : undefined;

          const parseCandidate = (val: any): number => {
            if (val === undefined || val === null || val === '') return -1;
            if (typeof val === 'number') {
              if (val >= 1900 && val <= 2010) return currentGregYearNum - val;
              if (val >= 2011 && val <= 2026) return currentGregYearNum - val;
              if (val >= 1980 && val <= 2030) return Math.max(0, currentEthYearNum - val);
              return val;
            }
            const s = String(val).trim();
            const numMatch = s.match(/\d+/);
            if (numMatch) {
              const n = parseInt(numMatch[0], 10);
              if (n >= 1900 && n <= 2010) return currentGregYearNum - n;
              if (n >= 2011 && n <= 2026) return currentGregYearNum - n;
              if (n >= 1980 && n <= 2030) return Math.max(0, currentEthYearNum - n);
              return n;
            }
            return -1;
          };

          calculatedAge = parseCandidate(rawAgeVal);
          if (calculatedAge === -1 && rawBirthVal !== undefined) {
            calculatedAge = parseCandidate(rawBirthVal);
          }

          // Fallback heuristic if age was not explicit
          const rawEdu = educationIdx !== -1 && row[educationIdx] ? String(row[educationIdx]).trim() : '';
          const rawOcc = occupationIdx !== -1 && row[occupationIdx] ? String(row[occupationIdx]).trim() : '';

          if (calculatedAge === -1) {
            if (rawEdu.includes('KG') || rawEdu.includes('መዋዕለ') || rawEdu.includes('ኬጂ') || rawEdu.includes('ጨቅላ')) {
              calculatedAge = 4;
            } else if (rawEdu.includes('1ኛ')) {
              calculatedAge = 7;
            } else if (rawEdu.includes('2ኛ')) {
              calculatedAge = 8;
            } else if (rawEdu.includes('3ኛ')) {
              calculatedAge = 9;
            } else if (rawEdu.includes('4ኛ')) {
              calculatedAge = 10;
            } else if (rawEdu.includes('5ኛ')) {
              calculatedAge = 11;
            } else if (rawEdu.includes('6ኛ')) {
              calculatedAge = 12;
            } else if (rawEdu.includes('7ኛ')) {
              calculatedAge = 13;
            } else if (rawEdu.includes('8ኛ')) {
              calculatedAge = 14;
            } else if (rawOcc.includes('ተማሪ') && (parentIdx !== -1 || phoneIdx !== -1)) {
              calculatedAge = 10;
            } else {
              calculatedAge = 25; // default adult
            }
          }

          // 3. Strict 0-14 filter (Only take children 0-14 years old)
          if (calculatedAge > 14) {
            adultsList.push({
              name: rawName,
              gender,
              age: calculatedAge,
              reason: `ዕድሜው ${calculatedAge} ዓመት (ከ14 ዓመት በላይ በመሆኑ ተዘልሏል)`
            });
            continue;
          }

          // Valid child (0 to 14 years old)
          const validAge = Math.max(0, Math.min(14, calculatedAge));

          // Education Level formatting
          let educationLevel = rawEdu;
          if (!educationLevel) {
            if (validAge <= 3) educationLevel = 'ጨቅላ/ያልጀመረ';
            else if (validAge <= 6) educationLevel = `መዋዕለ ሕፃናት (KG ${Math.min(3, validAge - 3 || 1)})`;
            else if (validAge <= 14) educationLevel = `${validAge - 6}ኛ ክፍል`;
          }

          // Occupation formatting
          let occupation = rawOcc;
          if (!occupation) {
            if (validAge <= 3) occupation = 'የቤት ውስጥ';
            else occupation = 'ተማሪ';
          }

          // Chapel detection & normalization
          let chapel = chapelIdx !== -1 && row[chapelIdx] ? String(row[chapelIdx]).trim() : '';
          if (!chapel) {
            chapel = chapelList[0] || 'ዋናው ማዕከል ቻፕል';
          } else {
            const matchedCh = chapelList.find((ch) => chapel.includes(ch) || ch.includes(chapel));
            if (matchedCh) chapel = matchedCh;
          }

          const parentName = parentIdx !== -1 && row[parentIdx] ? String(row[parentIdx]).trim() : undefined;
          const phone = phoneIdx !== -1 && row[phoneIdx] ? String(row[phoneIdx]).trim() : undefined;
          const residence = residenceIdx !== -1 && row[residenceIdx] ? String(row[residenceIdx]).trim() : undefined;
          const village = villageIdx !== -1 && row[villageIdx] ? String(row[villageIdx]).trim() : undefined;
          const notes = notesIdx !== -1 && row[notesIdx] ? String(row[notesIdx]).trim() : undefined;

          childrenList.push({
            name: rawName,
            gender,
            age: validAge,
            educationLevel,
            occupation,
            chapel,
            parentName,
            phone,
            residence: residence || village,
            fellowshipOrVillage: village,
            notes,
            registeredDate: new Date().toISOString().split('T')[0]
          });
        }

        setImportTotalRows(totalProcessed);
        setImportChildrenPreview(childrenList);
        setImportAdultsSkipped(adultsList);
        setImportActiveTab('children');
      } catch (err) {
        console.error('Error parsing excel file', err);
        alert('ፋይሉን ማንበብ አልተቻለም። እባክዎ ትክክለኛ Excel ወይም CSV ፋይል መሆኑን ያረጋግጡ።');
      }
    };

    reader.readAsBinaryString(file);
  };

  // Distinct Chapels in the uploaded Excel file
  const importChapelsSummary = useMemo(() => {
    const map: { [chapel: string]: number } = {};
    importChildrenPreview.forEach((c) => {
      const ch = c.chapel || 'ዋናው ማዕከል ቻፕል';
      map[ch] = (map[ch] || 0) + 1;
    });
    return Object.entries(map).map(([name, count]) => ({ name, count }));
  }, [importChildrenPreview]);

  // Children filtered by Chapel in the Import Preview
  const displayedImportChildren = useMemo(() => {
    if (importChapelFilter === 'all') return importChildrenPreview;
    return importChildrenPreview.filter((c) => (c.chapel || 'ዋናው ማዕከል ቻፕል') === importChapelFilter);
  }, [importChildrenPreview, importChapelFilter]);

  // Confirm Import (Supports multi-chapel filter and Clear Old & Replace)
  const handleConfirmImport = () => {
    if (displayedImportChildren.length === 0) return;

    if (importMode === 'replace') {
      if (importChapelFilter === 'all') {
        onBatchAddChildren(displayedImportChildren, 'replace');
      } else {
        if (onClearChurchChildren) {
          onClearChurchChildren(importChapelFilter);
        }
        onBatchAddChildren(displayedImportChildren, 'append');
      }
    } else {
      onBatchAddChildren(displayedImportChildren, 'append');
    }

    setIsImportModalOpen(false);
    setImportChildrenPreview([]);
    setImportAdultsSkipped([]);
    setImportTotalRows(0);
    setImportChapelFilter('all');
    setImportFileName('');
  };

  // Clear Church Children data handler
  const handleExecuteClear = () => {
    if (!onClearChurchChildren) return;
    onClearChurchChildren(clearTargetChapel);
    setIsClearModalOpen(false);
    setClearConfirmWord('');
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

            {onClearChurchChildren && (
              <button
                type="button"
                onClick={() => {
                  setClearTargetChapel(selectedChapelFilter);
                  setIsClearModalOpen(true);
                }}
                className="bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs px-3 py-2 rounded-xl transition flex items-center gap-1.5 border border-rose-200/80 shadow-2xs cursor-pointer"
                title="ቀድሞ የገባውን የልጆች መረጃ ሙሉ በሙሉ ወይም በቻፕል ለይተህ አጽዳ"
              >
                <Trash2 className="w-4 h-4 text-rose-600" />
                <span>🧹 መረጃ አጽዳ</span>
              </button>
            )}
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
                  <th className="py-3 px-4 font-extrabold text-[13pt] text-white min-w-[200px]">የልጁ ሙሉ ስም</th>
                  <th className="py-3 px-3 font-bold min-w-[130px]">ቻፕል (አጥቢያ)</th>
                  <th className="py-3 px-3 text-center font-bold w-16">ጾታ</th>
                  <th className="py-3 px-3 text-center font-bold w-16">ዕድሜ</th>
                  <th className="py-3 px-3 font-bold min-w-[120px]">የትምህርት ደረጃ</th>
                  <th className="py-3 px-3 font-bold min-w-[110px]">የስራ ዓይነት</th>
                  <th className="py-3 px-3 font-bold min-w-[150px]">የሰንበት ት/ቤት የመማር ሁኔታ</th>
                  <th className="py-3 px-3 font-bold min-w-[140px]">የወላጅ/አሳዳጊ ስም</th>
                  <th className="py-3 px-3 font-bold min-w-[140px]">የወላጅ ስልክ ቁጥር</th>
                  <th className="py-3 px-3 font-bold min-w-[120px]">መኖሪያ ቀበሌ</th>
                  <th className="py-3 px-3 text-center font-bold w-24 print:hidden">እርምጃዎች</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredChildren.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="py-12 text-center text-slate-500">
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
                        <td className="py-2.5 px-4 font-bold text-[13pt] text-slate-900 min-w-[200px] leading-normal">
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

                        {/* Education Level */}
                        <td className="py-2.5 px-3">
                          <span className="inline-flex items-center gap-1 font-semibold text-[11px] text-indigo-900 bg-indigo-50/90 px-2 py-0.5 rounded-lg border border-indigo-200/70 print:border-none print:bg-transparent print:p-0">
                            <BookOpen className="w-3 h-3 text-indigo-600 print:hidden shrink-0" />
                            <span>{child.educationLevel || '-'}</span>
                          </span>
                        </td>

                        {/* Occupation */}
                        <td className="py-2.5 px-3">
                          <span className="inline-flex items-center gap-1 font-medium text-[11px] text-slate-700 bg-slate-100 px-2 py-0.5 rounded-lg print:border-none print:bg-transparent print:p-0">
                            <Briefcase className="w-3 h-3 text-slate-500 print:hidden shrink-0" />
                            <span>{child.occupation || '-'}</span>
                          </span>
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

              {/* Education Level & Occupation */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">የትምህርት ደረጃ</label>
                  <input
                    type="text"
                    placeholder="ምሳሌ፦ 1ኛ ክፍል ወይም KG"
                    value={formEducationLevel}
                    onChange={(e) => setFormEducationLevel(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">የስራ ዓይነት</label>
                  <input
                    type="text"
                    placeholder="ምሳሌ፦ ተማሪ ወይም የቤት ውስጥ"
                    value={formOccupation}
                    onChange={(e) => setFormOccupation(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 font-medium"
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

      {/* Excel Import Modal: Smart Church Database 0-14 Filter */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full p-5 sm:p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150 max-h-[92vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-3.5 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold shrink-0">
                  <FileSpreadsheet className="w-5 h-5 text-emerald-700" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">
                    ከአጠቃላይ የቤተክርስቲያን ቋት የልጆች መረጃ መጫኛ (ዕድሜ 0-14 ብቻ)
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    ከአጠቃላይ የቤተክርስቲያን አባላት ኤክሴል ፋይል ውስጥ ከ0-14 ዓመት ያሉ ልጆችን ብቻ በራሱ ለይቶ ጾታ፣ ዕድሜ፣ የትምህርት ደረጃ፣ የስራ ዓይነት፣ ቻፕል እና የወላጅ ስልክን ያካትታል።
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsImportModalOpen(false);
                  setImportChildrenPreview([]);
                  setImportAdultsSkipped([]);
                  setImportTotalRows(0);
                  setImportFileName('');
                }}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 mt-4 overflow-y-auto pr-1 flex-1">
              {/* Instructions Banner and Sample Download */}
              <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-blue-50 p-4 rounded-xl border border-emerald-200/80 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <p className="font-extrabold text-emerald-950 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>ራስ-ሰር የ0-14 ዓመት ልጆች ማጣሪያና አምድ ፈላጊ</span>
                  </p>
                  <p className="text-slate-600 text-[11px] leading-relaxed">
                    ፋይሉ የአዋቂዎችንና የልጆችን መረጃ በአንድ ላይ ቢይዝም ስርዓቱ <strong>ከ0 እስከ 14 ዓመት</strong> ያሉትን ልጆች ብቻ ለይቶ ይመርጣል፤ ከ14 ዓመት በላይ የሆኑ አዋቂዎች በራሳቸው ይዘለላሉ።
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleDownloadSampleTemplate}
                  className="bg-white hover:bg-slate-50 text-emerald-900 font-bold text-xs px-3.5 py-2 rounded-xl border border-emerald-300 transition shrink-0 flex items-center gap-1.5 shadow-2xs cursor-pointer hover:scale-[1.01]"
                  title="የተሟላ የናሙና ኤክሴል ቅጽ ያውርዱ"
                >
                  <Download className="w-4 h-4 text-emerald-700" />
                  <span>📥 የExcel ናሙና አውርድ</span>
                </button>
              </div>

              {/* Upload Dropzone */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-emerald-400 hover:border-emerald-600 bg-emerald-50/20 hover:bg-emerald-50/40 rounded-2xl p-6 text-center cursor-pointer transition group"
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept=".xlsx, .xls, .csv"
                  className="hidden"
                />
                <FileUp className="w-10 h-10 text-emerald-700 mx-auto mb-2 group-hover:scale-105 transition-transform" />
                <p className="text-xs font-bold text-slate-800">
                  {importFileName ? `የተመረጠ ፋይል፦ ${importFileName}` : 'የቤተክርስቲያን አባላት Excel ወይም CSV ፋይል እዚህ ይጫኑ (Click to Browse)'}
                </p>
                <p className="text-[11px] text-slate-500 mt-1">
                  .xlsx, .xls ወይም .csv ፋይሎች (ጾታ፣ ዕድሜ/የትውልድ ዓመት፣ የትምህርት ደረጃ፣ የስራ ዓይነት፣ ቻፕል፣ የወላጅ ስልክ)
                </p>
              </div>

              {/* Statistics & Results Strip after file is read */}
              {importTotalRows > 0 && (
                <div className="space-y-3">
                  {/* Stats Pill Matrix */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <div className="bg-slate-100 p-3 rounded-xl border border-slate-200 text-center">
                      <span className="text-[11px] text-slate-500 font-semibold block">በፋይሉ የተገኙ ጠቅላላ ሰዎች</span>
                      <strong className="text-xl font-extrabold text-slate-800 tabular-nums">{importTotalRows}</strong>
                    </div>

                    <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-200 text-center">
                      <span className="text-[11px] text-emerald-800 font-bold block flex items-center justify-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>የተመረጡ ልጆች (ከ0-14 ዓመት)</span>
                      </span>
                      <strong className="text-xl font-extrabold text-emerald-900 tabular-nums">{importChildrenPreview.length} ልጆች</strong>
                    </div>

                    <div className="bg-amber-50 p-3 rounded-xl border border-amber-200 text-center">
                      <span className="text-[11px] text-amber-800 font-bold block flex items-center justify-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                        <span>የተዘለሉ አዋቂዎች (ከ14 ዓመት በላይ)</span>
                      </span>
                      <strong className="text-xl font-extrabold text-amber-900 tabular-nums">{importAdultsSkipped.length} ሰዎች</strong>
                    </div>
                  </div>

                  {/* Tabs: Children to import VS Skipped Adults */}
                  <div className="flex items-center gap-2 border-b border-slate-200 pt-1">
                    <button
                      type="button"
                      onClick={() => setImportActiveTab('children')}
                      className={`pb-2 px-3 text-xs font-bold transition border-b-2 flex items-center gap-1.5 ${
                        importActiveTab === 'children'
                          ? 'border-emerald-600 text-emerald-900'
                          : 'border-transparent text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      <span>👶 የሚገቡ የ0-14 ዓመት ልጆች</span>
                      <span className="bg-emerald-100 text-emerald-800 px-2 py-0.2 rounded-full text-[10px]">
                        {importChildrenPreview.length}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setImportActiveTab('adults')}
                      className={`pb-2 px-3 text-xs font-bold transition border-b-2 flex items-center gap-1.5 ${
                        importActiveTab === 'adults'
                          ? 'border-amber-600 text-amber-900'
                          : 'border-transparent text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      <span>👤 የተዘለሉ አዋቂዎች (ከ14 ዓመት በላይ)</span>
                      <span className="bg-amber-100 text-amber-800 px-2 py-0.2 rounded-full text-[10px]">
                        {importAdultsSkipped.length}
                      </span>
                    </button>
                  </div>

                  {/* Tab 1: Children to Import Preview Table */}
                  {importActiveTab === 'children' && (
                    <div className="space-y-3">
                      {/* Multi-Chapel Filter Strip in Uploaded File */}
                      {importChapelsSummary.length > 0 && (
                        <div className="bg-gradient-to-r from-blue-50/70 to-indigo-50/70 p-3 rounded-xl border border-blue-200/80">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 mb-2">
                            <span className="text-xs font-extrabold text-blue-950 flex items-center gap-1.5">
                              <Filter className="w-3.5 h-3.5 text-blue-800" />
                              <span>በቻፕል ለይተህ አስገባ (በፋይሉ የተገኙ {importChapelsSummary.length} ቻፕሎች)፦</span>
                            </span>
                            {importChapelFilter !== 'all' ? (
                              <span className="text-[11px] text-blue-900 bg-blue-100 font-bold px-2.5 py-0.5 rounded-full border border-blue-200 self-start sm:self-auto">
                                የተመረጠው ቻፕል፦ {importChapelFilter} ({displayedImportChildren.length} ልጆች)
                              </span>
                            ) : (
                              <span className="text-[11px] text-slate-600 bg-white/80 font-semibold px-2 py-0.5 rounded-full border border-slate-200 self-start sm:self-auto">
                                ሁሉም ቻፕሎች በአንድ ላይ ({importChildrenPreview.length} ልጆች)
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5 flex-wrap">
                            <button
                              type="button"
                              onClick={() => setImportChapelFilter('all')}
                              className={`px-3 py-1.5 text-xs rounded-lg font-bold transition flex items-center gap-1.5 cursor-pointer ${
                                importChapelFilter === 'all'
                                  ? 'bg-blue-900 text-white shadow-xs'
                                  : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                              }`}
                            >
                              <span>የሁሉም ቻፕሎች ({importChildrenPreview.length})</span>
                            </button>

                            {importChapelsSummary.map((ch) => {
                              const isSelected = importChapelFilter === ch.name;
                              return (
                                <button
                                  key={`chapel_btn_${ch.name}`}
                                  type="button"
                                  onClick={() => setImportChapelFilter(ch.name)}
                                  className={`px-3 py-1.5 text-xs rounded-lg font-bold transition flex items-center gap-1.5 cursor-pointer ${
                                    isSelected
                                      ? 'bg-blue-900 text-white shadow-xs'
                                      : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                                  }`}
                                >
                                  <span>{ch.name}</span>
                                  <span
                                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                                      isSelected ? 'bg-blue-800 text-blue-100' : 'bg-slate-100 text-slate-700'
                                    }`}
                                  >
                                    {ch.count}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {displayedImportChildren.length === 0 ? (
                        <div className="p-8 text-center bg-slate-50 rounded-xl text-slate-500 text-xs">
                          {importChapelFilter === 'all'
                            ? 'በፋይሉ ውስጥ ከ0-14 ዓመት የሆነ ልጅ አልተገኘም! እባክዎ ፋይልዎን ያረጋግጡ።'
                            : `በ«${importChapelFilter}» ስር ከ0-14 ዓመት የተመዘገበ ልጅ አልተገኘም!`}
                        </div>
                      ) : (
                        <div className="max-h-64 overflow-y-auto border border-slate-200 rounded-xl">
                          <table className="w-full text-left text-xs border-collapse">
                            <thead className="bg-slate-900 text-white font-bold sticky top-0 text-[11px]">
                              <tr>
                                <th className="py-2 px-2 text-center w-8">#</th>
                                <th className="py-2 px-3 font-extrabold text-[12pt] text-white">የልጁ ስም</th>
                                <th className="py-2 px-2 text-center">ጾታ</th>
                                <th className="py-2 px-2 text-center">ዕድሜ</th>
                                <th className="py-2 px-2.5">የትምህርት ደረጃ</th>
                                <th className="py-2 px-2.5">የስራ ዓይነት</th>
                                <th className="py-2 px-2.5">ቻፕል</th>
                                <th className="py-2 px-2.5">የወላጅ ስም</th>
                                <th className="py-2 px-2.5">የወላጅ ስልክ</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {displayedImportChildren.map((row, idx) => (
                                <tr key={`child_prev_${idx}`} className="hover:bg-emerald-50/40">
                                  <td className="py-1.5 px-2 text-center text-slate-400">{idx + 1}</td>
                                  <td className="py-1.5 px-3 font-bold text-slate-900 text-[12pt]">{row.name}</td>
                                  <td className="py-1.5 px-2 text-center font-bold">
                                    <span
                                      className={`px-1.5 py-0.5 rounded text-[10px] ${
                                        row.gender === 'ሴ' ? 'bg-rose-100 text-rose-800' : 'bg-blue-100 text-blue-800'
                                      }`}
                                    >
                                      {row.gender}
                                    </span>
                                  </td>
                                  <td className="py-1.5 px-2 text-center font-bold tabular-nums text-slate-800">
                                    {row.age} ዓመት
                                  </td>
                                  <td className="py-1.5 px-2.5 text-indigo-900 font-semibold">{row.educationLevel || '-'}</td>
                                  <td className="py-1.5 px-2.5 text-slate-700">{row.occupation || '-'}</td>
                                  <td className="py-1.5 px-2.5 text-blue-900 font-bold">{row.chapel || '-'}</td>
                                  <td className="py-1.5 px-2.5 text-slate-600">{row.parentName || '-'}</td>
                                  <td className="py-1.5 px-2.5 font-mono text-[11px] font-bold text-emerald-900">
                                    {row.phone || '-'}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}

                      {/* Import Mode Selector with Clear Old Support */}
                      {displayedImportChildren.length > 0 && (
                        <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
                          <div>
                            <span className="font-bold text-slate-900 block">የማስገቢያ ስልት ይምረጡ፦</span>
                            <span className="text-[11px] text-slate-500">
                              {importChapelFilter === 'all'
                                ? 'ሁሉንም ቻፕሎች አሁን ባለው ላይ መጨመር ወይም ቀድሞ የነበረውን ሙሉ በሙሉ ማጽዳት ይችላሉ'
                                : `የ«${importChapelFilter}» ልጆችን ብቻ መደመር ወይም የቀድሞውን የዚህ ቻፕል መረጃ ብቻ ማጽዳት ይችላሉ`}
                            </span>
                          </div>

                          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                            <label className="flex items-center gap-1.5 cursor-pointer">
                              <input
                                type="radio"
                                name="importMode"
                                value="append"
                                checked={importMode === 'append'}
                                onChange={() => setImportMode('append')}
                                className="text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                              />
                              <span className="font-semibold text-slate-800">አሁን ባለው ቋት ላይ ጨምር (Append)</span>
                            </label>

                            <label className="flex items-center gap-1.5 cursor-pointer">
                              <input
                                type="radio"
                                name="importMode"
                                value="replace"
                                checked={importMode === 'replace'}
                                onChange={() => setImportMode('replace')}
                                className="text-rose-600 focus:ring-rose-500 cursor-pointer"
                              />
                              <span className="font-bold text-rose-800">
                                {importChapelFilter === 'all'
                                  ? '🧹 ቀድሞ የገባውን ሙሉ መረጃ አጽድተህ ተካ (Clear All & Replace)'
                                  : `🧹 የ«${importChapelFilter}» የቀድሞ መረጃ ብቻ አጽድተህ ተካ`}
                              </span>
                            </label>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Tab 2: Skipped Adults Preview Table */}
                  {importActiveTab === 'adults' && (
                    <div className="space-y-2">
                      <p className="text-[11px] text-slate-500">
                        እነዚህ አባላት ከ14 ዓመት በላይ በመሆናቸው በልጆች ቋት ውስጥ አልተካተቱም፦
                      </p>
                      {importAdultsSkipped.length === 0 ? (
                        <div className="p-6 text-center bg-slate-50 rounded-xl text-slate-500 text-xs">
                          ምንም የተዘለለ አዋቂ የለም (ሁሉም 0-14 ዓመት ናቸው)።
                        </div>
                      ) : (
                        <div className="max-h-60 overflow-y-auto border border-amber-200 rounded-xl">
                          <table className="w-full text-left text-xs border-collapse">
                            <thead className="bg-amber-100 text-amber-950 font-bold sticky top-0">
                              <tr>
                                <th className="py-2 px-2 text-center w-8">#</th>
                                <th className="py-2 px-3">የአባሉ ስም</th>
                                <th className="py-2 px-2 text-center">ጾታ</th>
                                <th className="py-2 px-2 text-center">ዕድሜ</th>
                                <th className="py-2 px-3">የተዘለለበት ምክንያት</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-amber-100">
                              {importAdultsSkipped.slice(0, 100).map((row, idx) => (
                                <tr key={`adult_${idx}`} className="hover:bg-amber-50/50">
                                  <td className="py-1.5 px-2 text-center text-slate-400">{idx + 1}</td>
                                  <td className="py-1.5 px-3 font-bold text-slate-800">{row.name}</td>
                                  <td className="py-1.5 px-2 text-center">{row.gender}</td>
                                  <td className="py-1.5 px-2 text-center font-bold tabular-nums">{row.age} ዓመት</td>
                                  <td className="py-1.5 px-3 text-amber-800 font-medium">{row.reason}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Bottom Actions */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4 border-t border-slate-100 mt-3">
              <span className="text-xs text-slate-500">
                {displayedImportChildren.length > 0 && (
                  <span>
                    ለማስገባት የተዘጋጁ፦{' '}
                    <strong className="text-emerald-900 font-extrabold">{displayedImportChildren.length} ልጆች</strong>
                    {importChapelFilter !== 'all' && (
                      <span className="text-slate-500"> (ከጠቅላላው {importChildrenPreview.length} ውስጥ)</span>
                    )}
                  </span>
                )}
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsImportModalOpen(false);
                    setImportChildrenPreview([]);
                    setImportAdultsSkipped([]);
                    setImportTotalRows(0);
                    setImportChapelFilter('all');
                    setImportFileName('');
                  }}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-xl"
                >
                  ሰርዝ
                </button>
                <button
                  type="button"
                  disabled={displayedImportChildren.length === 0}
                  onClick={handleConfirmImport}
                  className="bg-emerald-700 hover:bg-emerald-600 disabled:bg-slate-300 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition shadow-xs flex items-center gap-2 cursor-pointer hover:scale-[1.01] active:scale-95"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>
                    {displayedImportChildren.length > 0
                      ? `📥 የተጣሩትን (${displayedImportChildren.length}) ልጆች አስገባ`
                      : 'የተመረጠ ልጅ የለም'}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Clear Church Children Data Modal (ቀድሞ የገባውን መረጃ ማጽጃ) */}
      {isClearModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-rose-900 via-rose-800 to-rose-950 text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center">
                  <Trash2 className="w-5 h-5 text-amber-300" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm sm:text-base">የልጆች መረጃ ማጽጃ (Clear Registry Data)</h3>
                  <p className="text-[11px] text-rose-200">ቀድሞ የገባውን መረጃ በሙሉ ወይም በቻፕል ለይተህ አጽዳ</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsClearModalOpen(false);
                  setClearConfirmWord('');
                }}
                className="text-rose-200 hover:text-white p-1 rounded-lg hover:bg-white/10 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4">
              <div className="bg-rose-50 border border-rose-200 rounded-xl p-3.5 text-xs text-rose-900 space-y-1">
                <p className="font-bold flex items-center gap-1.5 text-rose-950">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>ይህ እርምጃ የቀደሙ የልጆች መረጃዎችን ከቋቱ ያጠፋል!</span>
                </p>
                <p className="text-[11px] text-rose-800 leading-relaxed">
                  አዲስ የExcel ፋይል ከማስገባትዎ በፊት ወይም የተሳሳቱ ምዝገባዎችን ለማስተካከል ቀድሞ የነበረውን መረጃ ማጽዳት ይችላሉ። ሆኖም በሰንበት ት/ቤት ክፍሎች የተመዘገቡ ተማሪዎች መረጃ ላይ ምንም ጉዳት አያደርስም።
                </p>
              </div>

              {/* Scope Selection */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-800 block">የማጽዳት ወሰን ይምረጡ፦</label>
                <div className="space-y-2 border border-slate-200 rounded-xl p-3 bg-slate-50/50">
                  {/* Option 1: Clear All */}
                  <label className="flex items-start gap-2.5 cursor-pointer p-2 rounded-lg hover:bg-white transition border border-transparent hover:border-slate-200">
                    <input
                      type="radio"
                      name="clearScope"
                      checked={clearTargetChapel === 'all'}
                      onChange={() => setClearTargetChapel('all')}
                      className="mt-0.5 text-rose-600 focus:ring-rose-500 cursor-pointer"
                    />
                    <div className="text-xs">
                      <span className="font-extrabold text-slate-900 block">
                        የሁሉንም ቻፕሎች መረጃ ሙሉ በሙሉ አጽዳ (ጠቅላላ {churchChildren.length} ልጆች)
                      </span>
                      <span className="text-[11px] text-slate-500">
                        በቋቱ ውስጥ ያሉትን ሁሉንም ልጆች መረጃ ሙሉ በሙሉ አጥፍቶ ባዶ ያደርገዋል።
                      </span>
                    </div>
                  </label>

                  {/* Option 2: Clear Specific Chapel */}
                  <label className="flex items-start gap-2.5 cursor-pointer p-2 rounded-lg hover:bg-white transition border border-transparent hover:border-slate-200">
                    <input
                      type="radio"
                      name="clearScope"
                      checked={clearTargetChapel !== 'all'}
                      onChange={() => {
                        const firstChapel = chapelList[0] || 'ዋናው ማዕከል ቻፕል';
                        setClearTargetChapel(firstChapel);
                      }}
                      className="mt-0.5 text-rose-600 focus:ring-rose-500 cursor-pointer"
                    />
                    <div className="text-xs flex-1">
                      <span className="font-extrabold text-slate-900 block">
                        የተመረጠውን ቻፕል መረጃ ብቻ አጽዳ
                      </span>
                      <span className="text-[11px] text-slate-500 block mb-2">
                        ሌሎች ቻፕሎች ሳይነኩ የዚህን የተመረጠ ቻፕል መረጃ ብቻ ያጸዳል።
                      </span>

                      {clearTargetChapel !== 'all' && (
                        <div className="mt-2 space-y-1.5 bg-white p-2.5 rounded-lg border border-slate-200">
                          <label className="text-[11px] font-bold text-slate-700 block">የሚጸዳውን ቻፕል ይምረጡ፦</label>
                          <select
                            value={clearTargetChapel}
                            onChange={(e) => setClearTargetChapel(e.target.value)}
                            className="w-full text-xs font-bold border border-slate-300 rounded-lg p-2 bg-white text-slate-800 focus:ring-2 focus:ring-rose-500"
                          >
                            {chapelList.map((ch) => {
                              const countInChapel = churchChildren.filter(
                                (c) => (c.chapel || 'ዋናው ማዕከል ቻፕል') === ch
                              ).length;
                              return (
                                <option key={`clear_opt_${ch}`} value={ch}>
                                  {ch} ({countInChapel} ልጆች)
                                </option>
                              );
                            })}
                          </select>
                        </div>
                      )}
                    </div>
                  </label>
                </div>
              </div>

              {/* Status summary of what will be wiped */}
              <div className="bg-slate-100 p-3 rounded-xl text-xs flex items-center justify-between">
                <span className="text-slate-600 font-semibold">የሚጠፉ ልጆች ጠቅላላ ቁጥር፦</span>
                <span className="text-sm font-black text-rose-700 tabular-nums">
                  {clearTargetChapel === 'all'
                    ? `${churchChildren.length} ልጆች (ሁሉም)`
                    : `${
                        churchChildren.filter((c) => (c.chapel || 'ዋናው ማዕከል ቻፕል') === clearTargetChapel).length
                      } ልጆች`}
                </span>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setIsClearModalOpen(false);
                  setClearConfirmWord('');
                }}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-xl transition"
              >
                ሰርዝ
              </button>

              <button
                type="button"
                onClick={handleExecuteClear}
                disabled={
                  clearTargetChapel === 'all'
                    ? churchChildren.length === 0
                    : churchChildren.filter((c) => (c.chapel || 'ዋናው ማዕከል ቻፕል') === clearTargetChapel).length === 0
                }
                className="bg-rose-600 hover:bg-rose-700 disabled:bg-slate-300 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition shadow-xs flex items-center gap-1.5 cursor-pointer hover:scale-[1.01] active:scale-95"
              >
                <Trash2 className="w-4 h-4 text-white" />
                <span>
                  {clearTargetChapel === 'all'
                    ? '🗑️ የሁሉንም ቻፕሎች መረጃ አጽዳ'
                    : `🗑️ የ«${clearTargetChapel}» መረጃን ብቻ አጽዳ`}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

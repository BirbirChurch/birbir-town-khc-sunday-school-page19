/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  GraduationCap,
  CalendarCheck2,
  Music,
  BookOpen,
  Award,
  Target,
  UserCheck,
  BookMarked,
  KeyRound,
  Users
} from 'lucide-react';
import {
  Role,
  Teacher,
  Student,
  AbsenteeRecord,
  ChoirMember,
  SpiritualMember,
  AnnualPlanItem,
  AppData,
  WeeklyAttendanceStatus
} from './types';
import { CLASS_LIST, DEFAULT_ANNUAL_PLAN } from './constants/initialData';
import { subscribeToAppData, syncAppDataToFirebase, saveToLocalStorage, countStudentsInData, exportBackupJSON } from './services/firebase';
import { generateUniqueId, sanitizeAndDeduplicateAppData } from './utils/idGenerator';
import { Header } from './components/Header';
import { LoginPortal } from './components/LoginPortal';
import { ClassesTab } from './components/ClassesTab';
import { AllStudentsMasterTab } from './components/AllStudentsMasterTab';
import { AttendanceTab } from './components/AttendanceTab';
import { ChoirTab } from './components/ChoirTab';
import { SpiritualTab } from './components/SpiritualTab';
import { TopAchieversTab } from './components/TopAchieversTab';
import { PlanReportTab } from './components/PlanReportTab';
import { TeachersTab } from './components/TeachersTab';
import { SubjectsTab } from './components/SubjectsTab';
import { PinManageTab } from './components/PinManageTab';
import { FirebaseSyncModal } from './components/FirebaseSyncModal';

export default function App() {
  const [appData, setAppData] = useState<AppData | null>(null);
  const [syncStatus, setSyncStatus] = useState<'connected' | 'saving' | 'offline' | 'error'>('connected');
  const [currentYear, setCurrentYear] = useState<string>('2019');
  const [currentUserRole, setCurrentUserRole] = useState<Role | null>(null);
  const [loggedInTeacher, setLoggedInTeacher] = useState<Teacher | null>(null);
  const [selectedClass, setSelectedClass] = useState<string>(CLASS_LIST[3]); // 1ኛ ክፍል ሀ
  const [activeTab, setActiveTab] = useState<string>('classesTab');
  const [isSyncModalOpen, setIsSyncModalOpen] = useState<boolean>(false);

  // Connect to Firebase Realtime Database and Firestore
  useEffect(() => {
    const unsubscribe = subscribeToAppData(
      (data) => {
        const sanitized = sanitizeAndDeduplicateAppData(data);
        setAppData(sanitized);
        if (sanitized.years && sanitized.years.length > 0 && !sanitized.years.includes(currentYear)) {
          setCurrentYear(sanitized.years[0]);
        }
      },
      (status) => {
        setSyncStatus(status);
      }
    );

    return () => {
      unsubscribe();
    };
  }, []);

  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const latestDataRef = useRef<AppData | null>(null);

  // Keep latestDataRef in sync with state
  useEffect(() => {
    latestDataRef.current = appData;
  }, [appData]);

  // Flush any pending unsynced changes if page is closed or reloaded
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (syncTimeoutRef.current && latestDataRef.current) {
        clearTimeout(syncTimeoutRef.current);
        syncAppDataToFirebase(latestDataRef.current);
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      if (syncTimeoutRef.current && latestDataRef.current) {
        clearTimeout(syncTimeoutRef.current);
        syncAppDataToFirebase(latestDataRef.current);
      }
    };
  }, []);

  // Instant local state update with debounced background cloud sync
  const updateAppData = useCallback(
    (updater: (prev: AppData) => AppData, options?: { immediate?: boolean }) => {
      setAppData((prev) => {
        if (!prev) return prev;
        const updated = updater(prev);
        latestDataRef.current = updated;

        // 1. Immediately save to localStorage (0ms persistence)
        saveToLocalStorage(updated);

        // 2. Debounce cloud sync to avoid freezing UI or overloading network
        if (syncTimeoutRef.current) {
          clearTimeout(syncTimeoutRef.current);
          syncTimeoutRef.current = null;
        }

        if (options?.immediate) {
          setSyncStatus('saving');
          syncAppDataToFirebase(updated)
            .then(() => setSyncStatus('connected'))
            .catch(() => setSyncStatus('offline'));
        } else {
          syncTimeoutRef.current = setTimeout(() => {
            if (latestDataRef.current) {
              setSyncStatus('saving');
              syncAppDataToFirebase(latestDataRef.current)
                .then(() => setSyncStatus('connected'))
                .catch(() => setSyncStatus('offline'));
            }
          }, 600);
        }

        return updated;
      });
    },
    []
  );

  // Handlers for Login
  const handleLoginSuccess = (role: Role, teacher?: Teacher) => {
    setCurrentUserRole(role);
    if (role === 'teacher' && teacher) {
      setLoggedInTeacher(teacher);
      setSelectedClass(teacher.assignedClass);
    } else {
      setLoggedInTeacher(null);
    }
    setActiveTab('classesTab');
  };

  const handleLogout = () => {
    setCurrentUserRole(null);
    setLoggedInTeacher(null);
    setActiveTab('classesTab');
  };

  // Add academic year
  const handleAddYear = (newYear: string) => {
    updateAppData(
      (prev) => ({
        ...prev,
        years: prev.years.includes(newYear) ? prev.years : [...prev.years, newYear]
      }),
      { immediate: true }
    );
    setCurrentYear(newYear);
  };

  // Students handlers
  const currentClassStudents = useMemo(() => {
    if (!appData) return [];
    return appData.students?.[currentYear]?.[selectedClass] || [];
  }, [appData, currentYear, selectedClass]);

  const handleUpdateStudent = (updatedStudent: Student) => {
    updateAppData((prev) => {
      const yearStudents = prev.students?.[currentYear] || {};
      const updatedYearStudents: { [cName: string]: Student[] } = {};

      Object.entries(yearStudents).forEach(([cName, sList]) => {
        updatedYearStudents[cName] = (sList || []).map((s) =>
          String(s.id) === String(updatedStudent.id) ? updatedStudent : s
        );
      });

      return {
        ...prev,
        students: {
          ...prev.students,
          [currentYear]: updatedYearStudents
        }
      };
    });
  };

  const handleAddStudent = (newStudent: Omit<Student, 'id'>) => {
    const studentWithId: Student = {
      ...newStudent,
      id: generateUniqueId()
    };

    updateAppData(
      (prev) => {
        const yearStudents = prev.students?.[currentYear] || {};
        const classStudents = yearStudents[selectedClass] || [];

        return {
          ...prev,
          students: {
            ...prev.students,
            [currentYear]: {
              ...yearStudents,
              [selectedClass]: [...classStudents, studentWithId]
            }
          }
        };
      },
      { immediate: true }
    );
  };

  const handleAddStudentToClass = (targetClass: string, newStudent: Omit<Student, 'id'>) => {
    const studentWithId: Student = {
      ...newStudent,
      id: generateUniqueId()
    };

    updateAppData(
      (prev) => {
        const yearStudents = prev.students?.[currentYear] || {};
        const classStudents = yearStudents[targetClass] || [];

        return {
          ...prev,
          students: {
            ...prev.students,
            [currentYear]: {
              ...yearStudents,
              [targetClass]: [...classStudents, studentWithId]
            }
          }
        };
      },
      { immediate: true }
    );
  };

  const handleAddStudentsBatch = (
    newStudents: Omit<Student, 'id'>[],
    targetClass?: string,
    replaceExisting?: boolean
  ) => {
    if (!newStudents.length) return;
    const destClass = targetClass || selectedClass;
    const studentsWithIds: Student[] = newStudents.map((s) => ({
      ...s,
      id: generateUniqueId()
    }));

    updateAppData(
      (prev) => {
        const yearStudents = { ...(prev.students?.[currentYear] || {}) };
        const existingClassStudents = replaceExisting ? [] : (yearStudents[destClass] || []);

        return {
          ...prev,
          students: {
            ...prev.students,
            [currentYear]: {
              ...yearStudents,
              [destClass]: [...existingClassStudents, ...studentsWithIds]
            }
          }
        };
      },
      { immediate: true }
    );
  };

  const handleAddStudentsMultiClass = (
    studentsByClass: { [className: string]: Omit<Student, 'id'>[] },
    replaceExisting?: boolean
  ) => {
    if (!Object.keys(studentsByClass).length) return;

    updateAppData(
      (prev) => {
        const yearStudents = { ...(prev.students?.[currentYear] || {}) };

        Object.entries(studentsByClass).forEach(([cName, list]) => {
          if (!list || list.length === 0) return;
          const existing = replaceExisting ? [] : (yearStudents[cName] || []);
          const withIds: Student[] = list.map((s) => ({
            ...s,
            id: generateUniqueId()
          }));
          yearStudents[cName] = [...existing, ...withIds];
        });

        return {
          ...prev,
          students: {
            ...prev.students,
            [currentYear]: yearStudents
          }
        };
      },
      { immediate: true }
    );
  };

  const handleDeleteStudent = (studentId: number | string) => {
    updateAppData(
      (prev) => {
        const yearStudents = prev.students?.[currentYear] || {};
        const updatedYearStudents: { [cName: string]: Student[] } = {};

        Object.entries(yearStudents).forEach(([cName, sList]) => {
          updatedYearStudents[cName] = (sList || []).filter(
            (s) => String(s.id) !== String(studentId)
          );
        });

        return {
          ...prev,
          students: {
            ...prev.students,
            [currentYear]: updatedYearStudents
          }
        };
      },
      { immediate: true }
    );
  };

  const handleMoveStudentClass = (
    studentId: number | string,
    sourceClass: string,
    targetClass: string
  ) => {
    if (sourceClass === targetClass) return;
    updateAppData(
      (prev) => {
        const yearStudents = { ...(prev.students?.[currentYear] || {}) };
        const srcList = yearStudents[sourceClass] || [];
        const studentToMove = srcList.find((s) => String(s.id) === String(studentId));
        if (!studentToMove) return prev;

        const newSrcList = srcList.filter((s) => String(s.id) !== String(studentId));
        const destList = yearStudents[targetClass] || [];

        return {
          ...prev,
          students: {
            ...prev.students,
            [currentYear]: {
              ...yearStudents,
              [sourceClass]: newSrcList,
              [targetClass]: [...destList, studentToMove]
            }
          }
        };
      },
      { immediate: true }
    );
  };

  const handleClearClassStudents = (className: string) => {
    updateAppData(
      (prev) => {
        const yearStudents = prev.students?.[currentYear] || {};
        return {
          ...prev,
          students: {
            ...prev.students,
            [currentYear]: {
              ...yearStudents,
              [className]: []
            }
          }
        };
      },
      { immediate: true }
    );
  };

  const handleClearClassScores = (className: string) => {
    updateAppData(
      (prev) => {
        const yearStudents = prev.students?.[currentYear] || {};
        const classStudents = yearStudents[className] || [];
        const cleared = classStudents.map((s) => ({
          ...s,
          m1: 0,
          m2: 0,
          m3: 0,
          m4: 0,
          m5: 0,
          m6: 0,
          m7: 0
        }));
        return {
          ...prev,
          students: {
            ...prev.students,
            [currentYear]: {
              ...yearStudents,
              [className]: cleared
            }
          }
        };
      },
      { immediate: true }
    );
  };

  const handleSetClassAge = (className: string, newAge: string) => {
    updateAppData(
      (prev) => {
        const yearStudents = prev.students?.[currentYear] || {};
        const classStudents = yearStudents[className] || [];
        const updatedList = classStudents.map((s) => ({
          ...s,
          age: newAge
        }));

        return {
          ...prev,
          students: {
            ...prev.students,
            [currentYear]: {
              ...yearStudents,
              [className]: updatedList
            }
          }
        };
      },
      { immediate: true }
    );
  };

  // Attendance handlers
  const handleAddAttendance = (record: Omit<AbsenteeRecord, 'id'>) => {
    const recWithId: AbsenteeRecord = {
      ...record,
      id: generateUniqueId()
    };
    updateAppData((prev) => ({
      ...prev,
      attendance: [...(prev.attendance || []), recWithId]
    }));
  };

  const handleAddAttendanceBatch = (records: Omit<AbsenteeRecord, 'id'>[]) => {
    if (!records.length) return;
    const withIds: AbsenteeRecord[] = records.map((r) => ({
      ...r,
      id: generateUniqueId()
    }));
    updateAppData((prev) => ({
      ...prev,
      attendance: [...(prev.attendance || []), ...withIds]
    }));
  };

  const handleDeleteAttendance = (id: number) => {
    updateAppData((prev) => ({
      ...prev,
      attendance: (prev.attendance || []).filter((a) => a.id !== id)
    }));
  };

  // 40-Week Structured Attendance Handlers
  const handleUpdateStudentWeeklyAttendance = (
    year: string,
    className: string,
    studentId: number | string,
    week: number,
    status: WeeklyAttendanceStatus
  ) => {
    updateAppData((prev) => {
      const yearAtt = prev.weeklyAttendance?.[year] || {};
      const classAtt = yearAtt[className] || {};
      const studentAtt = classAtt[studentId] || {};

      const updatedStudentAtt = {
        ...studentAtt,
        [week]: status
      };

      return {
        ...prev,
        weeklyAttendance: {
          ...prev.weeklyAttendance,
          [year]: {
            ...yearAtt,
            [className]: {
              ...classAtt,
              [studentId]: updatedStudentAtt
            }
          }
        }
      };
    });
  };

  const handleBatchUpdateWeeklyAttendance = (
    year: string,
    className: string,
    week: number,
    statusUpdates: { [studentId: string]: WeeklyAttendanceStatus },
    weekDate?: string
  ) => {
    updateAppData((prev) => {
      const yearAtt = prev.weeklyAttendance?.[year] || {};
      const classAtt = { ...(yearAtt[className] || {}) };

      Object.entries(statusUpdates).forEach(([sId, stat]) => {
        const studentAtt = classAtt[sId] || {};
        classAtt[sId] = {
          ...studentAtt,
          [week]: stat
        };
      });

      const updatedDates = weekDate
        ? {
            ...prev.weekDates,
            [year]: {
              ...(prev.weekDates?.[year] || {}),
              [week]: weekDate
            }
          }
        : prev.weekDates;

      return {
        ...prev,
        weekDates: updatedDates,
        weeklyAttendance: {
          ...prev.weeklyAttendance,
          [year]: {
            ...yearAtt,
            [className]: classAtt
          }
        }
      };
    });
  };

  const handleSetWeekDate = (year: string, week: number, dateStr: string) => {
    updateAppData((prev) => ({
      ...prev,
      weekDates: {
        ...prev.weekDates,
        [year]: {
          ...(prev.weekDates?.[year] || {}),
          [week]: dateStr
        }
      }
    }));
  };

  const handleClearWeekAttendance = (year: string, className: string, week: number) => {
    updateAppData((prev) => {
      const yearAtt = prev.weeklyAttendance?.[year] || {};
      const classAtt = { ...(yearAtt[className] || {}) };

      Object.keys(classAtt).forEach((sId) => {
        if (classAtt[sId] && classAtt[sId][week]) {
          const updatedStudent = { ...classAtt[sId] };
          delete updatedStudent[week];
          classAtt[sId] = updatedStudent;
        }
      });

      return {
        ...prev,
        weeklyAttendance: {
          ...prev.weeklyAttendance,
          [year]: {
            ...yearAtt,
            [className]: classAtt
          }
        }
      };
    });
  };

  // Choir handlers
  const handleAddChoirMember = (member: Omit<ChoirMember, 'id'>) => {
    const mWithId: ChoirMember = {
      ...member,
      id: generateUniqueId()
    };
    updateAppData((prev) => ({
      ...prev,
      choirMembers: [...(prev.choirMembers || []), mWithId]
    }));
  };

  const handleAddChoirMembersBatch = (members: Omit<ChoirMember, 'id'>[]) => {
    if (!members.length) return;
    const withIds: ChoirMember[] = members.map((m) => ({
      ...m,
      id: generateUniqueId()
    }));
    updateAppData((prev) => ({
      ...prev,
      choirMembers: [...(prev.choirMembers || []), ...withIds]
    }));
  };

  const handleDeleteChoirMember = (id: number) => {
    updateAppData((prev) => ({
      ...prev,
      choirMembers: (prev.choirMembers || []).filter((m) => m.id !== id)
    }));
  };

  const handleAddChoirGroup = (groupName: string) => {
    updateAppData((prev) => ({
      ...prev,
      choirGroups: [...(prev.choirGroups || []), groupName]
    }));
  };

  // Spiritual handlers
  const handleAddSpiritualMember = (member: Omit<SpiritualMember, 'id'>) => {
    const mWithId: SpiritualMember = {
      ...member,
      id: generateUniqueId()
    };
    updateAppData((prev) => ({
      ...prev,
      spiritualMembers: [...(prev.spiritualMembers || []), mWithId]
    }));
  };

  const handleAddSpiritualMembersBatch = (members: Omit<SpiritualMember, 'id'>[]) => {
    if (!members.length) return;
    const withIds: SpiritualMember[] = members.map((m) => ({
      ...m,
      id: generateUniqueId()
    }));
    updateAppData((prev) => ({
      ...prev,
      spiritualMembers: [...(prev.spiritualMembers || []), ...withIds]
    }));
  };

  const handleDeleteSpiritualMember = (id: number) => {
    updateAppData((prev) => ({
      ...prev,
      spiritualMembers: (prev.spiritualMembers || []).filter((m) => m.id !== id)
    }));
  };

  const handleAddSpiritualGroup = (groupName: string) => {
    updateAppData((prev) => ({
      ...prev,
      spiritualGroups: [...(prev.spiritualGroups || []), groupName]
    }));
  };

  // Plan handlers
  const handleUpdatePlan = (updatedPlan: AnnualPlanItem) => {
    updateAppData((prev) => ({
      ...prev,
      plans: (prev.plans || []).map((p) => (p.id === updatedPlan.id ? updatedPlan : p))
    }));
  };

  const handleAddPlan = (newPlan: Omit<AnnualPlanItem, 'id'>) => {
    const planWithId: AnnualPlanItem = {
      ...newPlan,
      id: generateUniqueId()
    };
    updateAppData((prev) => ({
      ...prev,
      plans: [...(prev.plans || []), planWithId]
    }));
  };

  const handleDeletePlan = (id: number) => {
    updateAppData((prev) => ({
      ...prev,
      plans: (prev.plans || []).filter((p) => p.id !== id)
    }));
  };

  const handleImportPlans = (newPlans: AnnualPlanItem[]) => {
    updateAppData((prev) => ({
      ...prev,
      plans: newPlans
    }));
  };

  // Teacher handlers
  const handleUpdateTeacher = (updatedTeacher: Teacher) => {
    updateAppData((prev) => ({
      ...prev,
      teachers: prev.teachers.map((t) => (t.id === updatedTeacher.id ? updatedTeacher : t))
    }));
  };

  const handleAddTeacher = (newTeacher: Omit<Teacher, 'id'>) => {
    const tWithId: Teacher = {
      ...newTeacher,
      id: generateUniqueId()
    };
    updateAppData((prev) => ({
      ...prev,
      teachers: [...prev.teachers, tWithId]
    }));
  };

  const handleDeleteTeacher = (id: number) => {
    updateAppData((prev) => ({
      ...prev,
      teachers: prev.teachers.filter((t) => t.id !== id)
    }));
  };

  // Subjects handlers
  const handleAddSubject = (subjectName: string) => {
    updateAppData((prev) => ({
      ...prev,
      subjects: [...prev.subjects, subjectName]
    }));
  };

  const handleDeleteSubject = (index: number) => {
    updateAppData((prev) => {
      const nextSubs = [...prev.subjects];
      nextSubs.splice(index, 1);
      return {
        ...prev,
        subjects: nextSubs
      };
    });
  };

  const handleUpdateClassSubjects = (newClassSubjects: { [className: string]: string[] }) => {
    updateAppData((prev) => ({
      ...prev,
      classSubjects: newClassSubjects
    }));
  };

  const handleReorderTeachers = (reorderedTeachers: Teacher[]) => {
    updateAppData((prev) => ({
      ...prev,
      teachers: reorderedTeachers
    }));
  };

  // Save Role PINs
  const handleSavePins = (adminPin: string, leaderPin: string) => {
    updateAppData((prev) => ({
      ...prev,
      pins: {
        admin: adminPin,
        leader: leaderPin
      }
    }));
  };

  if (!appData) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white p-4">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
        <h2 className="text-lg font-bold">የብርብር ከተማ ቃለ ሕይወት ቤተክርስቲያን</h2>
        <p className="text-xs text-blue-300 mt-1">ዳታቤዝ በመገናኘት ላይ ነው...</p>
      </div>
    );
  }

  // Navigation tab definitions
  const tabs = [
    { id: 'classesTab', label: 'የክፍል ደረጃዎች & ውጤት', icon: GraduationCap, roles: ['admin', 'leader', 'teacher'] },
    { id: 'allStudentsMasterTab', label: 'ሁሉንም የተመዘገቡ ተማሪዎች', icon: Users, roles: ['admin', 'leader'] },
    { id: 'attendanceTab', label: 'የተማሪዎች አተንዳንስ & መቆጣጠሪያ', icon: CalendarCheck2, roles: ['admin', 'leader', 'teacher'] },
    { id: 'choirTab', label: 'የመዘምራንና ኪነ-ጥበብ ቡድኖች', icon: Music, roles: ['admin', 'leader', 'teacher'] },
    { id: 'spiritualTab', label: 'መንፈሳዊ ትምህርት ቡድኖች', icon: BookOpen, roles: ['admin', 'leader', 'teacher'] },
    { id: 'topAchieversTab', label: 'ከ1ኛ - 3ኛ ደረጃዎች', icon: Award, roles: ['admin', 'leader', 'teacher'] },
    { id: 'planReportTab', label: 'የዓመት ዕቅድ & ሩብ ሪፖርት', icon: Target, roles: ['admin'] },
    { id: 'teachersTab', label: 'የመምህራን ዝርዝር & PIN', icon: UserCheck, roles: ['admin', 'leader'] },
    { id: 'subjectsTab', label: 'የትምህርት ዓይነቶች', icon: BookMarked, roles: ['admin', 'leader'] },
    { id: 'pinManageTab', label: 'የመግቢያ ቁልፍ ቅንብር', icon: KeyRound, roles: ['admin'] },
  ];

  const visibleTabs = tabs.filter((t) => currentUserRole && t.roles.includes(currentUserRole));

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-900 flex flex-col font-sans print:min-h-0 print:bg-white print:block">
      <Header
        currentYear={currentYear}
        years={appData?.years || ['2019']}
        onYearChange={setCurrentYear}
        onAddYear={handleAddYear}
        currentUserRole={currentUserRole}
        loggedInTeacherName={loggedInTeacher?.name}
        onLogout={handleLogout}
        syncStatus={syncStatus}
        onOpenSyncModal={() => setIsSyncModalOpen(true)}
      />

      {/* Reassurance & Fast Data Protection Banner */}
      {appData && (
        <div className="bg-gradient-to-r from-emerald-950 via-teal-900 to-slate-900 text-white px-4 py-2.5 border-b border-emerald-700/50 print:hidden text-xs shadow-sm">
          <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
              <span className="font-bold text-emerald-100">
                ✓ የሰሩት ስራ አልጠፋም! በደህንነት ተቀምጧል
              </span>
              <span className="text-emerald-300/90 hidden md:inline">
                (በስርዓቱ ውስጥ፦ {countStudentsInData(appData)} ተማሪዎች፣ {appData.teachers?.length || 0} መምህራን ተመዝግበዋል)
              </span>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => exportBackupJSON(appData)}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3 py-1 rounded-lg text-[11px] transition flex items-center gap-1 shadow"
                title="የሰሩትን ሙሉ መረጃ ወዲያውኑ ወደ ኮምፒዩተርዎ ያውርዱ"
              >
                <span>💾 ባክአፕ አውርድ (JSON)</span>
              </button>
              <button
                type="button"
                onClick={() => setIsSyncModalOpen(true)}
                className="bg-blue-800 hover:bg-blue-700 text-amber-300 font-bold px-3 py-1 rounded-lg text-[11px] transition flex items-center gap-1 border border-blue-700 shadow"
                title="የFirebase ግንኙነት ማስተካከያና የቀድሞ ስራ መፈለጊያ"
              >
                <span>⚙️ ዳታቤዝ ማስተካከያ & የቀድሞ ስራ መፈለጊያ</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 print:max-w-none print:w-full print:p-0 print:m-0">
        {!currentUserRole ? (
          <LoginPortal
            teachers={appData.teachers}
            adminPin={appData.pins?.admin || '1234'}
            leaderPin={appData.pins?.leader || '5678'}
            onLoginSuccess={handleLoginSuccess}
          />
        ) : (
          <div className="space-y-6 print:space-y-0">
            {/* Top Navigation Tabs */}
            <div className="bg-white p-2 rounded-2xl border border-slate-200/80 shadow-sm print:hidden">
              <nav className="flex space-x-1 sm:space-x-2 overflow-x-auto scrollbar-thin py-1 px-1">
                {visibleTabs.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all duration-150 ${
                        isActive
                          ? 'bg-blue-900 text-white shadow-md'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                      }`}
                    >
                      <Icon className={`w-4 h-4 ${isActive ? 'text-amber-300' : 'text-slate-400'}`} />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* Tab Contents */}
            <div>
              {activeTab === 'classesTab' && (
                <ClassesTab
                  currentYear={currentYear}
                  classList={CLASS_LIST}
                  selectedClass={selectedClass}
                  onSelectClass={setSelectedClass}
                  teachers={appData.teachers}
                  students={currentClassStudents}
                  onUpdateStudent={handleUpdateStudent}
                  onAddStudent={handleAddStudent}
                  onAddStudentsBatch={handleAddStudentsBatch}
                  onAddStudentsMultiClass={handleAddStudentsMultiClass}
                  onDeleteStudent={handleDeleteStudent}
                  onClearClassStudents={handleClearClassStudents}
                  onClearClassScores={handleClearClassScores}
                  onSetClassAge={handleSetClassAge}
                  onGoToAttendance={() => setActiveTab('attendanceTab')}
                  onGoToAllStudents={() => setActiveTab('allStudentsMasterTab')}
                  currentUserRole={currentUserRole}
                  loggedInTeacher={loggedInTeacher}
                  subjects={appData.subjects}
                  classSubjects={appData.classSubjects || {}}
                  onUpdateClassSubjects={handleUpdateClassSubjects}
                />
              )}

              {activeTab === 'allStudentsMasterTab' && (currentUserRole === 'admin' || currentUserRole === 'leader') && (
                <AllStudentsMasterTab
                  currentYear={currentYear}
                  classList={CLASS_LIST}
                  teachers={appData.teachers}
                  studentsByClass={appData.students?.[currentYear] || {}}
                  choirMembers={appData.choirMembers || []}
                  spiritualMembers={appData.spiritualMembers || []}
                  onUpdateStudent={handleUpdateStudent}
                  onAddStudentToClass={handleAddStudentToClass}
                  onDeleteStudent={handleDeleteStudent}
                  onMoveStudentClass={handleMoveStudentClass}
                  onGoToClass={(cName) => {
                    setSelectedClass(cName);
                    setActiveTab('classesTab');
                  }}
                  currentUserRole={currentUserRole}
                />
              )}

              {activeTab === 'attendanceTab' && (
                <AttendanceTab
                  currentYear={currentYear}
                  classList={CLASS_LIST}
                  studentsByClass={appData.students?.[currentYear] || {}}
                  weeklyAttendance={appData.weeklyAttendance?.[currentYear] || {}}
                  weekDates={appData.weekDates?.[currentYear] || {}}
                  attendance={appData.attendance || []}
                  onUpdateStudentWeeklyAttendance={handleUpdateStudentWeeklyAttendance}
                  onBatchUpdateWeeklyAttendance={handleBatchUpdateWeeklyAttendance}
                  onSetWeekDate={handleSetWeekDate}
                  onClearWeekAttendance={handleClearWeekAttendance}
                  onAddAttendance={handleAddAttendance}
                  onAddAttendanceBatch={handleAddAttendanceBatch}
                  onDeleteAttendance={handleDeleteAttendance}
                  onAddStudentToClass={handleAddStudentToClass}
                  onUpdateStudent={handleUpdateStudent}
                  onDeleteStudent={handleDeleteStudent}
                  onClearClassStudents={handleClearClassStudents}
                  onSetClassAge={handleSetClassAge}
                  currentUserRole={currentUserRole}
                  loggedInTeacher={loggedInTeacher}
                />
              )}

              {activeTab === 'choirTab' && (
                <ChoirTab
                  groups={appData.choirGroups || []}
                  members={appData.choirMembers || []}
                  onAddMember={handleAddChoirMember}
                  onAddMembersBatch={handleAddChoirMembersBatch}
                  onDeleteMember={handleDeleteChoirMember}
                  onAddGroup={handleAddChoirGroup}
                  currentUserRole={currentUserRole}
                />
              )}

              {activeTab === 'spiritualTab' && (
                <SpiritualTab
                  groups={appData.spiritualGroups || []}
                  members={appData.spiritualMembers || []}
                  onAddMember={handleAddSpiritualMember}
                  onAddMembersBatch={handleAddSpiritualMembersBatch}
                  onDeleteMember={handleDeleteSpiritualMember}
                  onAddGroup={handleAddSpiritualGroup}
                  currentUserRole={currentUserRole}
                />
              )}

              {activeTab === 'topAchieversTab' && (
                <TopAchieversTab
                  currentYear={currentYear}
                  classList={CLASS_LIST}
                  studentsByClass={appData.students?.[currentYear] || {}}
                />
              )}

              {activeTab === 'planReportTab' && currentUserRole === 'admin' && (
                <PlanReportTab
                  currentYear={currentYear}
                  plans={appData.plans || DEFAULT_ANNUAL_PLAN}
                  onUpdatePlan={handleUpdatePlan}
                  onAddPlan={handleAddPlan}
                  onDeletePlan={handleDeletePlan}
                  onImportPlans={handleImportPlans}
                  onGoToAllStudents={() => setActiveTab('allStudentsMasterTab')}
                  totalStudentsCount={countStudentsInData(appData)}
                />
              )}

              {activeTab === 'teachersTab' && (currentUserRole === 'admin' || currentUserRole === 'leader') && (
                <TeachersTab
                  teachers={appData.teachers}
                  classList={CLASS_LIST}
                  subjects={appData.subjects}
                  currentUserRole={currentUserRole}
                  onUpdateTeacher={handleUpdateTeacher}
                  onAddTeacher={handleAddTeacher}
                  onDeleteTeacher={handleDeleteTeacher}
                  onReorderTeachers={handleReorderTeachers}
                />
              )}

              {activeTab === 'subjectsTab' && (currentUserRole === 'admin' || currentUserRole === 'leader') && (
                <SubjectsTab
                  subjects={appData.subjects}
                  classList={CLASS_LIST}
                  classSubjects={appData.classSubjects || {}}
                  onUpdateClassSubjects={handleUpdateClassSubjects}
                  onAddSubject={handleAddSubject}
                  onDeleteSubject={handleDeleteSubject}
                  currentUserRole={currentUserRole}
                />
              )}

              {activeTab === 'pinManageTab' && currentUserRole === 'admin' && (
                <PinManageTab
                  adminPin={appData.pins?.admin || '1234'}
                  leaderPin={appData.pins?.leader || '5678'}
                  onSavePins={handleSavePins}
                />
              )}
            </div>
          </div>
        )}
      </main>

      <footer className="mt-auto py-6 border-t border-slate-200/80 bg-white text-center text-xs text-slate-500 print:hidden">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>
            © {currentYear} የብርብር ከተማ ቃለ ሕይወት ቤተክርስቲያን - የልጆች አገልግሎት ዘርፍ
          </span>
          <span className="text-[11px] text-slate-400">
            የመረጃ፣ የውጤትና የዓመት ዕቅድ ማኔጅመንት ሲስተም
          </span>
        </div>
      </footer>

      {appData && (
        <FirebaseSyncModal
          isOpen={isSyncModalOpen}
          onClose={() => setIsSyncModalOpen(false)}
          appData={appData}
          onDataRestored={(newData) => {
            setAppData(newData);
            syncAppDataToFirebase(newData);
          }}
          syncStatus={syncStatus}
        />
      )}
    </div>
  );
}

export type Role = 'admin' | 'leader' | 'teacher';

export interface Teacher {
  id: number;
  name: string;
  assignedClass: string;
  assignedSubject?: string;
  pin: string;
  phone?: string;
  order?: number;
}

export interface Student {
  id: number;
  name: string;
  age: number | string;
  gender: string;
  m1: number; // Max 10
  m2: number; // Max 10
  m3: number; // Max 10
  m4: number; // Max 20
  m5: number; // Max 10
  m6: number; // Max 10
  m7: number; // Max 30
  total?: number;
  rank?: number;
  chapel?: string; // ቻፕል
  parentName?: string; // የወላጅ ስም
  phone?: string; // የወላጅ ስልክ
}

export interface AbsenteeRecord {
  id: number;
  date: string;
  className: string;
  studentName: string;
  gender: string;
  reason: string;
}

export interface ChoirMember {
  id: number;
  name: string;
  age: number | string;
  gender: string;
  group: string;
  phone?: string;
}

export interface SpiritualMember {
  id: number;
  name: string;
  age: number | string;
  gender: string;
  group: string;
}

export interface AnnualPlanItem {
  id: number;
  task: string;
  unit: string;
  yearPlan: number | string;
  q1Plan: number | string;
  q2Plan: number | string;
  q3Plan: number | string;
  q4Plan: number | string;
  q1Done: number | string;
  q2Done: number | string;
  q3Done: number | string;
  q4Done: number | string;
  role: string;
}

export type WeeklyAttendanceStatus = 'P' | 'A' | 'E' | '';

export interface StudentWeekAttendanceMap {
  [weekNumber: number]: WeeklyAttendanceStatus;
}

export interface ClassWeeklyAttendanceMap {
  [studentId: string]: StudentWeekAttendanceMap;
}

export interface YearWeeklyAttendanceMap {
  [className: string]: ClassWeeklyAttendanceMap;
}

export interface WeeklyAttendanceData {
  [year: string]: YearWeeklyAttendanceMap;
}

export interface WeekDatesData {
  [year: string]: {
    [weekNumber: number]: string; // ISO date YYYY-MM-DD
  };
}

export interface ChurchChild {
  id: number;
  name: string; // የልጁ ሙሉ ስም
  gender: 'ወ' | 'ሴ' | string; // ጾታ
  age: number | string; // ዕድሜ
  educationLevel?: string; // የትምህርት ደረጃ (e.g., ኬጂ፣ 1ኛ ክፍል፣ 2ኛ ክፍል፣ ወዘተ)
  occupation?: string; // የስራ ዓይነት (e.g., ተማሪ፣ የቤት ውስጥ፣ ወዘተ)
  chapel?: string; // ቻፕል / አጥቢያ ማዕከል
  parentName?: string; // የወላጅ/አሳዳጊ ስም
  phone?: string; // የወላጅ ስልክ ቁጥር
  residence?: string; // መኖሪያ ቀበሌ/መንደር/ሰፈር
  fellowshipOrVillage?: string; // የህብረት/የቡድን ስም ወይም መንደር
  isBaptized?: boolean; // የተጠመቀ/ች (አማራጭ)
  notes?: string; // ማስታወሻ
  registeredDate?: string; // የተመዘገበበት ቀን
}

export interface AppData {
  years: string[];
  pins: {
    admin: string;
    leader: string;
  };
  teachers: Teacher[];
  subjects: string[];
  classSubjects?: {
    [className: string]: string[];
  };
  choirGroups: string[];
  choirMembers: ChoirMember[];
  spiritualGroups: string[];
  spiritualMembers: SpiritualMember[];
  attendance: AbsenteeRecord[];
  weeklyAttendance?: WeeklyAttendanceData;
  weekDates?: WeekDatesData;
  plans: AnnualPlanItem[];
  students: {
    [year: string]: {
      [className: string]: Student[];
    };
  };
  chapels?: string[];
  churchChildren?: ChurchChild[];
}



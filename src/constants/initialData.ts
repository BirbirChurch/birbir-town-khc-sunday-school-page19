import { AnnualPlanItem, AppData } from '../types';

export const CLASS_LIST: string[] = [
  "ማቆያ ክፍል",
  "ደረጃ 1",
  "ደረጃ 2",
  "1ኛ ክፍል ሀ",
  "1ኛ ክፍል ለ",
  "2ኛ ክፍል ሀ",
  "2ኛ ክፍል ለ",
  "3ኛ ክፍል ሀ",
  "3ኛ ክፍል ለ",
  "4ኛ ክፍል ሀ",
  "4ኛ ክፍል ለ",
  "5ኛ ክፍል ሀ",
  "5ኛ ክፍል ለ",
  "6ኛ ክፍል ሀ",
  "6ኛ ክፍል ለ",
  "7ኛ ክፍል ሀ",
  "7ኛ ክፍል ለ",
  "8ኛ ክፍል ሀ",
  "8ኛ ክፍል ለ",
  "9ኛ ክፍል ሀ",
  "9ኛ ክፍል ለ",
  "10ኛ ክፍል ሀ",
  "10ኛ ክፍል ለ",
  "11ኛ ክፍል",
  "12ኛ ክፍል"
];

export const INITIAL_TEACHERS = [
  "ስጦታ ሀብታሙ", "መሠረት ሌቃ", "መላኩ መጃ", "ማርቆስ ዶላ", "ማቴዎስ መሻ",
  "አበበ አሻንጎ", "ፍቅሩ አበበ", "መንግስቱ ፎላ", "አድሱ ሳዴቦ", "መርክን ቱቼ",
  "መለሰ ዳኘ", "ፍሬው ወ/ማሪያም", "ጌታሁን ኢሳያስ", "ሀብታሙ በዛንህ", "አስራት አማኑኤል",
  "አሸናፊ ጫፋ", "ምንተስኖት መንግስቱ", "ሄኖክ ኖኅ", "ቤዛነህ ማቴዎስ", "ማቱሳላ ጴጥሮስ",
  "ሙሉቀን ዘለቀ", "መስፍን ማንጁራ", "አለሙ ሌራ", "መብራቱ ሞላ", "አሰገደች አየለ",
  "ገነት ጋንታ", "ላቀች ላንቻሞ", "አማኑኤል", "መንግስቱ ኡባ", "ተመስጌን መርድነህ",
  "አስማማው አሳ", "ሊዲያ", "ገላትያ ደስታ"
];

export const DEFAULT_CHOIR_GROUPS = [
  "ሀ መዘምራን",
  "ለ መዘምራን",
  "ሐ መዘምራን",
  "የመዝሙር መሪዎች ቡድን",
  "ድራማና ሥነ-ጽሑፍ ቡድን",
  "ኮሪዮግራፊ ቡድን"
];

export const DEFAULT_SPIRITUAL_GROUPS = [
  "የምስራች ክለብ",
  "የመቅህማ",
  "መሠረታዊ የክርስቲያናዊ ትምህርት",
  "የመጽሐፍ ቅዱስ ጥናት ቡድን"
];

export const DEFAULT_SUBJECTS = [
  "የመጽሐፍ ቅዱስ ጥናት",
  "የክርስትና መሠረቶች",
  "መዝሙርና ምስጋና",
  "የስነ-ምግባር ትምህርት"
];

export const DEFAULT_ANNUAL_PLAN: AnnualPlanItem[] = [
  { id: 1, task: "ከልጆች አገልግሎት ኮሚቴዎች ጋር መጸለይና መወያየት", unit: "በቁጥር", yearPlan: 52, q1Plan: 13, q2Plan: 13, q3Plan: 13, q4Plan: 13, q1Done: 13, q2Done: 0, q3Done: 0, q4Done: 0, role: "አስተባባሪና ኮሚቴ" },
  { id: 2, task: "የሰንበት ትምህርት ቤት ተማሪዎች ምዝገባ ማካሄድ", unit: "በዙር", yearPlan: 1, q1Plan: 1, q2Plan: 0, q3Plan: 0, q4Plan: 0, q1Done: 1, q2Done: 0, q3Done: 0, q4Done: 0, role: "የክፍል መዝጋቢዎች" },
  { id: 3, task: "የልጆችን የጋራ አምልኮ በየሳምንቱ ማካሄድ", unit: "በቁጥር", yearPlan: 52, q1Plan: 13, q2Plan: 13, q3Plan: 13, q4Plan: 13, q1Done: 13, q2Done: 0, q3Done: 0, q4Done: 0, role: "የአምልኮ መሪዎች" },
  { id: 4, task: "የሰንበት ትምህርት ቤት መምህራን የጋራ ውይይት", unit: "በዙር", yearPlan: 4, q1Plan: 1, q2Plan: 1, q3Plan: 1, q4Plan: 1, q1Done: 1, q2Done: 0, q3Done: 0, q4Done: 0, role: "አስተባባሪው" },
  { id: 5, task: "ለሰንበት ትምህርት ቤትና ለቻፕል መምህራን ስልጠና መስጠት", unit: "በዙር", yearPlan: 2, q1Plan: 1, q2Plan: 0, q3Plan: 1, q4Plan: 0, q1Done: 1, q2Done: 0, q3Done: 0, q4Done: 0, role: "አስተባባሪና ጋባዥ መምህር" },
  { id: 6, task: "በዋናው ቤተ ክርስቲያን ለልጆች ወላጆች ስልጠና/ትምህርት መስጠት", unit: "በዙር", yearPlan: 2, q1Plan: 0, q2Plan: 1, q3Plan: 0, q4Plan: 1, q1Done: 0, q2Done: 0, q3Done: 0, q4Done: 0, role: "አስተባባሪና መጋቢዎች" },
  { id: 7, task: "በሁሉም ቻፕሎች ለወላጆች ግንዛቤ/ስልጠና መስጠት", unit: "በዙር", yearPlan: 2, q1Plan: 0, q2Plan: 1, q3Plan: 0, q4Plan: 1, q1Done: 0, q2Done: 0, q3Done: 0, q4Done: 0, role: "የቻፕል መሪዎች" },
  { id: 8, task: "ወላጆች ከልጆቻቸው ጋር እንዲጸልዩና መጽሐፍ ቅዱስ እንዲያነቡ ማበረታታት", unit: "በዙር", yearPlan: 4, q1Plan: 1, q2Plan: 1, q3Plan: 1, q4Plan: 1, q1Done: 1, q2Done: 0, q3Done: 0, q4Done: 0, role: "መምህራንና ወላጆች" },
  { id: 9, task: "ከሌሎች አጥቢያዎች ጋር የልምድ ልውውጥ ማድረግ", unit: "በዙር", yearPlan: 2, q1Plan: 0, q2Plan: 1, q3Plan: 0, q4Plan: 1, q1Done: 0, q2Done: 0, q3Done: 0, q4Done: 0, role: "አስተባባሪና ኮሚቴ" },
  { id: 10, task: "ከወጣቶችና ከሴቶች አገልግሎት ጋር የተጠናከረ ህብረት ማድረግ", unit: "በዙር", yearPlan: 4, q1Plan: 1, q2Plan: 1, q3Plan: 1, q4Plan: 1, q1Done: 1, q2Done: 0, q3Done: 0, q4Done: 0, role: "የዘርፍ መሪዎች" },
  { id: 11, task: "ልጆችን ስለ \"ወንጌል ማህበርተኝነት\" ማስተማር", unit: "በዙር", yearPlan: 4, q1Plan: 1, q2Plan: 1, q3Plan: 1, q4Plan: 1, q1Done: 1, q2Done: 0, q3Done: 0, q4Done: 0, role: "የመማሪያ ክፍል መምህራን" },
  { id: 12, task: "ልጆችን ስለ መስጠት/ስጦታ ማስተማር", unit: "በዙር", yearPlan: 4, q1Plan: 1, q2Plan: 1, q3Plan: 1, q4Plan: 1, q1Done: 1, q2Done: 0, q3Done: 0, q4Done: 0, role: "የመማሪያ ክፍል መምህራን" },
  { id: 13, task: "ልጆችን ስለ ፍቅርና ርኅራኄ ማስተማር", unit: "በዙር", yearPlan: 4, q1Plan: 1, q2Plan: 1, q3Plan: 1, q4Plan: 1, q1Done: 1, q2Done: 0, q3Done: 0, q4Done: 0, role: "የመማሪያ ክፍል መምህራን" },
  { id: 14, task: "ልጆችን በተለያዩ የአገልግሎት ቡድኖች ማደራጀትና ማሰራት (ወንጌል፣ ኳይር፣ ወዘተ)", unit: "በዙር", yearPlan: 20, q1Plan: 5, q2Plan: 5, q3Plan: 5, q4Plan: 5, q1Done: 5, q2Done: 0, q3Done: 0, q4Done: 0, role: "የቡድኑ መሪ አገልጋዮች" },
  { id: 15, task: "የልጆች ዓመታዊ በዓል (ሀገራዊ የቃለ ሕይወት የልጆች ቀን) ማክበር", unit: "በዙር", yearPlan: 1, q1Plan: 0, q2Plan: 0, q3Plan: 1, q4Plan: 0, q1Done: 0, q2Done: 0, q3Done: 0, q4Done: 0, role: "ሙሉ አገልጋዮችና ቤተ ክርስቲያን" },
  { id: 16, task: "ቲሸርት ማሳተም", unit: "በዙር", yearPlan: 1, q1Plan: 1, q2Plan: 0, q3Plan: 0, q4Plan: 0, q1Done: 1, q2Done: 0, q3Done: 0, q4Done: 0, role: "የፋይናንስ ክፍል/ኮሚቴ" },
  { id: 17, task: "የልጆች ዓመታዊ ማጠቃለያ የሽልማትና የእውቅና ቀን", unit: "በዙር", yearPlan: 1, q1Plan: 0, q2Plan: 0, q3Plan: 0, q4Plan: 1, q1Done: 0, q2Done: 0, q3Done: 0, q4Done: 0, role: "ሙሉ አገልጋዮችና ወላጆች" },
  { id: 18, task: "የልጆችን ቤት-ለቤት ጉብኝት ማድረግ", unit: "በቁጥር", yearPlan: 4, q1Plan: 1, q2Plan: 1, q3Plan: 1, q4Plan: 1, q1Done: 1, q2Done: 0, q3Done: 0, q4Done: 0, role: "መምህራን" },
  { id: 19, task: "ሰንበት ትምህርት የማይከታተሉ ልጆችን መከታተልና መምከር", unit: "በዙር", yearPlan: 4, q1Plan: 1, q2Plan: 1, q3Plan: 1, q4Plan: 1, q1Done: 1, q2Done: 0, q3Done: 0, q4Done: 0, role: "የክትትል ክፍል" },
  { id: 20, task: "መደበኛ የሰንበት ትምህርት ክፍሎችን ማስተማር", unit: "በቁጥር", yearPlan: 45, q1Plan: 11, q2Plan: 11, q3Plan: 11, q4Plan: 12, q1Done: 11, q2Done: 0, q3Done: 0, q4Done: 0, role: "የመማሪያ ክፍል መምህራን" },
  { id: 21, task: "የተለያዩ ተጨማሪ መንፈሳዊ ትምህርቶችን መስጠት", unit: "በቁጥር", yearPlan: 40, q1Plan: 10, q2Plan: 10, q3Plan: 10, q4Plan: 10, q1Done: 10, q2Done: 0, q3Done: 0, q4Done: 0, role: "መጋቢዎችና መምህራን" },
  { id: 22, task: "ከመንፈሳዊ ዘርፍ ጋር የጋራ መድረክ መፍጠር", unit: "በዙር", yearPlan: 4, q1Plan: 1, q2Plan: 1, q3Plan: 1, q4Plan: 1, q1Done: 1, q2Done: 0, q3Done: 0, q4Done: 0, role: "አስተባባሪና መንፈሳዊ ዘርፍ" },
  { id: 23, task: "የሩብ ዓመት ሪፖርት ለመንፈሳዊ ዘርፍና ለህብረት መላክ", unit: "በዙር", yearPlan: 4, q1Plan: 1, q2Plan: 1, q3Plan: 1, q4Plan: 1, q1Done: 1, q2Done: 0, q3Done: 0, q4Done: 0, role: "አስተባባሪው" },
  { id: 24, task: "የሩብ ዓመት ዕቅድ ክንውን መገምገም", unit: "በዙር", yearPlan: 4, q1Plan: 1, q2Plan: 1, q3Plan: 1, q4Plan: 1, q1Done: 1, q2Done: 0, q3Done: 0, q4Done: 0, role: "አስተባባሪና መሪዎች" }
];

export const INITIAL_APP_DATA: AppData = {
  years: ["2019", "2020", "2021", "2022", "2023", "2024", "2025", "2026", "2027", "2028", "2029", "2030"],
  pins: {
    admin: "1234",
    leader: "5678"
  },
  teachers: INITIAL_TEACHERS.map((name, index) => ({
    id: index + 1,
    name,
    assignedClass: CLASS_LIST[index % CLASS_LIST.length],
    pin: (1001 + index).toString()
  })),
  subjects: DEFAULT_SUBJECTS,
  choirGroups: DEFAULT_CHOIR_GROUPS,
  choirMembers: [],
  spiritualGroups: DEFAULT_SPIRITUAL_GROUPS,
  spiritualMembers: [],
  attendance: [],
  weeklyAttendance: {},
  weekDates: {},
  plans: DEFAULT_ANNUAL_PLAN,
  students: {}
};

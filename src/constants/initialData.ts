import { AnnualPlanItem, AppData, ChurchChild } from '../types';

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

export const DEFAULT_CHAPELS: string[] = [
  "ዋናው ማዕከል ቻፕል",
  "ቤቴል ቻፕል",
  "ሰላም ቻፕል",
  "አማኑኤል ቻፕል",
  "ጽዮን ቻፕል",
  "ገነት ቻፕል"
];

export const INITIAL_CHURCH_CHILDREN: ChurchChild[] = [
  // 0 - 3 ዓመት
  { id: 101, name: "ዮናታን ዳዊት", gender: "ወ", age: 2, educationLevel: "ጨቅላ/ያልጀመረ", occupation: "የቤት ውስጥ", chapel: "ዋናው ማዕከል ቻፕል", parentName: "ዳዊት ታደሰ", phone: "0911223344", residence: "ቀበሌ 01", fellowshipOrVillage: "ቤቴል ህብረት", notes: "ህፃን", registeredDate: "2019-01-10" },
  { id: 102, name: "ሩት ተስፋዬ", gender: "ሴ", age: 1, educationLevel: "ጨቅላ/ያልጀመረ", occupation: "የቤት ውስጥ", chapel: "ሰላም ቻፕል", parentName: "አስቴር በቀለ", phone: "0922334455", residence: "ቀበሌ 02", fellowshipOrVillage: "ሰላም ህብረት", notes: "ህፃን", registeredDate: "2019-01-12" },
  { id: 103, name: "ሰሎሞን ኤልያስ", gender: "ወ", age: 3, educationLevel: "ጨቅላ/ያልጀመረ", occupation: "የቤት ውስጥ", chapel: "አማኑኤል ቻፕል", parentName: "ኤልያስ ዮሴፍ", phone: "0933445566", residence: "አባቦ መንደር", fellowshipOrVillage: "አማኑኤል ህብረት", notes: "", registeredDate: "2019-01-15" },
  { id: 104, name: "ቤርሳቤህ ማርቆስ", gender: "ሴ", age: 2, educationLevel: "ጨቅላ/ያልጀመረ", occupation: "የቤት ውስጥ", chapel: "ጽዮን ቻፕል", parentName: "ማርቆስ ዶላ", phone: "0944556677", residence: "መንደር 3", fellowshipOrVillage: "ጽዮን ህብረት", notes: "", registeredDate: "2019-01-20" },

  // 4 - 6 ዓመት
  { id: 105, name: "ሳሙኤል ተመስጌን", gender: "ወ", age: 5, educationLevel: "መዋዕለ ሕፃናት (KG 2)", occupation: "ተማሪ", chapel: "ቤቴል ቻፕል", parentName: "ተመስጌን መርድነህ", phone: "0912345678", residence: "ቀበሌ 01", fellowshipOrVillage: "ቤቴል ህብረት", notes: "", registeredDate: "2019-01-10" },
  { id: 106, name: "ኤልሳቤጥ አበበ", gender: "ሴ", age: 6, educationLevel: "መዋዕለ ሕፃናት (KG 3)", occupation: "ተማሪ", chapel: "ዋናው ማዕከል ቻፕል", parentName: "አበበ አሻንጎ", phone: "0923456789", residence: "ቀበሌ 02", fellowshipOrVillage: "ሰላም ህብረት", notes: "", registeredDate: "2019-01-11" },
  { id: 107, name: "ዳንኤል ሙሉቀን", gender: "ወ", age: 4, educationLevel: "መዋዕለ ሕፃናት (KG 1)", occupation: "ተማሪ", chapel: "አማኑኤል ቻፕል", parentName: "ሙሉቀን ዘለቀ", phone: "0934567890", residence: "መንደር 1", fellowshipOrVillage: "አማኑኤል ህብረት", notes: "", registeredDate: "2019-01-14" },
  { id: 108, name: "ሐና ፍቅሩ", gender: "ሴ", age: 5, educationLevel: "መዋዕለ ሕፃናት (KG 2)", occupation: "ተማሪ", chapel: "ጽዮን ቻፕል", parentName: "ፍቅሩ አበበ", phone: "0945678901", residence: "ቀበሌ 03", fellowshipOrVillage: "ጽዮን ህብረት", notes: "", registeredDate: "2019-01-18" },

  // 7 - 9 ዓመት
  { id: 109, name: "አማኑኤል መሠረት", gender: "ወ", age: 8, educationLevel: "2ኛ ክፍል", occupation: "ተማሪ", chapel: "ቤቴል ቻፕል", parentName: "መሠረት ሌቃ", phone: "0956789012", residence: "ቀበሌ 01", fellowshipOrVillage: "ቤቴል ህብረት", notes: "", registeredDate: "2019-01-08" },
  { id: 110, name: "ሰላማዊት መላኩ", gender: "ሴ", age: 7, educationLevel: "1ኛ ክፍል", occupation: "ተማሪ", chapel: "ሰላም ቻፕል", parentName: "መላኩ መጃ", phone: "0967890123", residence: "መንደር 2", fellowshipOrVillage: "ሰላም ህብረት", notes: "", registeredDate: "2019-01-09" },
  { id: 111, name: "ኢዮብ ጌታሁን", gender: "ወ", age: 9, educationLevel: "3ኛ ክፍል", occupation: "ተማሪ", chapel: "ዋናው ማዕከል ቻፕል", parentName: "ጌታሁን ኢሳያስ", phone: "0978901234", residence: "ቀበሌ 02", fellowshipOrVillage: "አማኑኤል ህብረት", notes: "", registeredDate: "2019-01-15" },
  { id: 112, name: "ማርታ ሀብታሙ", gender: "ሴ", age: 8, educationLevel: "2ኛ ክፍል", occupation: "ተማሪ", chapel: "ገነት ቻፕል", parentName: "ሀብታሙ በዛንህ", phone: "0989012345", residence: "ቀበሌ 01", fellowshipOrVillage: "ጽዮን ህብረት", notes: "", registeredDate: "2019-01-19" },

  // 10 - 12 ዓመት
  { id: 113, name: "ሚካኤል አስራት", gender: "ወ", age: 11, educationLevel: "5ኛ ክፍል", occupation: "ተማሪ", chapel: "ቤቴል ቻፕል", parentName: "አስራት አማኑኤል", phone: "0911002233", residence: "ቀበሌ 03", fellowshipOrVillage: "ቤቴል ህብረት", notes: "", registeredDate: "2019-01-07" },
  { id: 114, name: "ራሔል አሸናፊ", gender: "ሴ", age: 10, educationLevel: "4ኛ ክፍል", occupation: "ተማሪ", chapel: "ሰላም ቻፕል", parentName: "አሸናፊ ጫፋ", phone: "0922113344", residence: "ቀበሌ 01", fellowshipOrVillage: "ሰላም ህብረት", notes: "", registeredDate: "2019-01-10" },
  { id: 115, name: "ዮሐንስ ምንተስኖት", gender: "ወ", age: 12, educationLevel: "6ኛ ክፍል", occupation: "ተማሪ", chapel: "አማኑኤል ቻፕል", parentName: "ምንተስኖት መንግስቱ", phone: "0933224455", residence: "ቀበሌ 02", fellowshipOrVillage: "አማኑኤል ህብረት", notes: "", registeredDate: "2019-01-16" },
  { id: 116, name: "ርብቃ ሄኖክ", gender: "ሴ", age: 11, educationLevel: "5ኛ ክፍል", occupation: "ተማሪ", chapel: "ጽዮን ቻፕል", parentName: "ሄኖክ ኖኅ", phone: "0944335566", residence: "መንደር 4", fellowshipOrVillage: "ጽዮን ህብረት", notes: "", registeredDate: "2019-01-21" },

  // 13 - 14 ዓመት
  { id: 117, name: "ዳዊት መስፍን", gender: "ወ", age: 14, educationLevel: "8ኛ ክፍል", occupation: "ተማሪ", chapel: "ዋናው ማዕከል ቻፕል", parentName: "መስፍን ማንጁራ", phone: "0955446677", residence: "ቀበሌ 01", fellowshipOrVillage: "ቤቴል ህብረት", notes: "", registeredDate: "2019-01-05" },
  { id: 118, name: "ዮዲት አለሙ", gender: "ሴ", age: 13, educationLevel: "7ኛ ክፍል", occupation: "ተማሪ", chapel: "ሰላም ቻፕል", parentName: "አለሙ ሌራ", phone: "0966557788", residence: "ቀበሌ 02", fellowshipOrVillage: "ሰላም ህብረት", notes: "", registeredDate: "2019-01-12" },
  { id: 119, name: "ናትናኤል መብራቱ", gender: "ወ", age: 13, educationLevel: "7ኛ ክፍል", occupation: "ተማሪ", chapel: "አማኑኤል ቻፕል", parentName: "መብራቱ ሞላ", phone: "0977668899", residence: "መንደር 1", fellowshipOrVillage: "አማኑኤል ህብረት", notes: "", registeredDate: "2019-01-14" },
  { id: 120, name: "ኤልሳ አሰገደች", gender: "ሴ", age: 14, educationLevel: "8ኛ ክፍል", occupation: "ተማሪ", chapel: "ገነት ቻፕል", parentName: "አሰገደች አየለ", phone: "0988779900", residence: "ቀበሌ 03", fellowshipOrVillage: "ጽዮን ህብረት", notes: "", registeredDate: "2019-01-22" }
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
  students: {},
  chapels: DEFAULT_CHAPELS,
  churchChildren: INITIAL_CHURCH_CHILDREN
};


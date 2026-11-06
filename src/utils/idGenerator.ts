/**
 * Guaranteed unique and monotonic ID generator for records (students, attendance, members, plans, etc.)
 * Prevents timestamp collision even when called many times in the same millisecond or inside tight CSV import loops.
 */

import { AppData, Student, AbsenteeRecord, ChoirMember, SpiritualMember, Teacher, AnnualPlanItem } from '../types';

let _lastUniqueId = Math.max(Date.now(), 1792849000000);

export const generateUniqueId = (): number => {
  const now = Date.now();
  _lastUniqueId = now > _lastUniqueId ? now : _lastUniqueId + 1;
  return _lastUniqueId;
};

/**
 * Sanitizes and repairs existing data to guarantee that every student, attendance record,
 * choir member, spiritual member, teacher, and annual plan item has a strictly unique, valid ID.
 * If any duplicates or invalid IDs are found (such as identical Date.now() collisions from past imports),
 * a fresh unique ID is deterministically assigned to the duplicate.
 */
export const sanitizeAndDeduplicateAppData = (data: AppData): AppData => {
  if (!data || typeof data !== 'object') return data;

  const seenIds = new Set<number>();
  let modified = false;

  const ensureUniqueId = (existingId: any): number => {
    const numId = Number(existingId);
    if (!numId || isNaN(numId) || numId <= 0 || seenIds.has(numId)) {
      modified = true;
      const newId = generateUniqueId();
      seenIds.add(newId);
      return newId;
    }
    seenIds.add(numId);
    return numId;
  };

  // 1. Sanitize students across all years and classes
  const sanitizedStudents: AppData['students'] = {};
  if (data.students && typeof data.students === 'object') {
    Object.entries(data.students).forEach(([year, classesMap]) => {
      sanitizedStudents[year] = {};
      if (classesMap && typeof classesMap === 'object') {
        Object.entries(classesMap).forEach(([className, list]) => {
          if (Array.isArray(list)) {
            sanitizedStudents[year][className] = list.map((student: Student) => {
              const checkedId = ensureUniqueId(student?.id);
              if (checkedId !== student?.id) {
                return { ...student, id: checkedId };
              }
              return student;
            });
          } else {
            sanitizedStudents[year][className] = [];
          }
        });
      }
    });
  }

  // 2. Sanitize attendance
  const sanitizedAttendance: AbsenteeRecord[] = Array.isArray(data.attendance)
    ? data.attendance.map((rec) => {
        const checkedId = ensureUniqueId(rec?.id);
        if (checkedId !== rec?.id) {
          return { ...rec, id: checkedId };
        }
        return rec;
      })
    : [];

  // 3. Sanitize choir members
  const sanitizedChoir: ChoirMember[] = Array.isArray(data.choirMembers)
    ? data.choirMembers.map((m) => {
        const checkedId = ensureUniqueId(m?.id);
        if (checkedId !== m?.id) {
          return { ...m, id: checkedId };
        }
        return m;
      })
    : [];

  // 4. Sanitize spiritual members
  const sanitizedSpiritual: SpiritualMember[] = Array.isArray(data.spiritualMembers)
    ? data.spiritualMembers.map((m) => {
        const checkedId = ensureUniqueId(m?.id);
        if (checkedId !== m?.id) {
          return { ...m, id: checkedId };
        }
        return m;
      })
    : [];

  // 5. Sanitize teachers
  const sanitizedTeachers: Teacher[] = Array.isArray(data.teachers)
    ? data.teachers.map((t) => {
        const checkedId = ensureUniqueId(t?.id);
        if (checkedId !== t?.id) {
          return { ...t, id: checkedId };
        }
        return t;
      })
    : [];

  // 6. Sanitize plans
  const sanitizedPlans: AnnualPlanItem[] = Array.isArray(data.plans)
    ? data.plans.map((p) => {
        const checkedId = ensureUniqueId(p?.id);
        if (checkedId !== p?.id) {
          return { ...p, id: checkedId };
        }
        return p;
      })
    : [];

  if (!modified) {
    return data;
  }

  return {
    ...data,
    weeklyAttendance: data.weeklyAttendance || {},
    weekDates: data.weekDates || {},
    students: sanitizedStudents,
    attendance: sanitizedAttendance,
    choirMembers: sanitizedChoir,
    spiritualMembers: sanitizedSpiritual,
    teachers: sanitizedTeachers,
    plans: sanitizedPlans
  };
};

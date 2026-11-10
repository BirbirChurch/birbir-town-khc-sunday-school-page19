import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getDatabase, ref, onValue, set, get, Database } from 'firebase/database';
import { getFirestore, doc, onSnapshot, setDoc, getDoc, Firestore, setLogLevel } from 'firebase/firestore';
import { AppData } from '../types';
import { INITIAL_APP_DATA } from '../constants/initialData';
import { sanitizeAndDeduplicateAppData } from '../utils/idGenerator';

// Suppress noisy internal Firestore unreachable backend warnings when only Realtime Database is enabled
try {
  setLogLevel('silent');
} catch {}

export interface FirebaseProjectProfile {
  id: string;
  label: string;
  config: {
    apiKey: string;
    authDomain: string;
    databaseURL: string;
    databaseURL_alt?: string;
    databaseURL_alt2?: string;
    projectId: string;
    storageBucket: string;
    messagingSenderId: string;
    appId: string;
    measurementId?: string;
  };
}

export const KNOWN_PROJECTS: FirebaseProjectProfile[] = [
  {
    id: "birbir-town-khc-child-ministry",
    label: "birbir-town-khc-child-ministry (ዋናው አዲሱ ዳታቤዝ)",
    config: {
      apiKey: "AIzaSyAruE9nGOFGkGRHs1hbRT2EmLq1hJrWSb8",
      authDomain: "birbir-town-khc-child-ministry.firebaseapp.com",
      databaseURL: "https://birbir-town-khc-child-ministry-default-rtdb.europe-west1.firebasedatabase.app",
      databaseURL_alt: "https://birbir-town-khc-child-ministry-default-rtdb.firebaseio.com",
      databaseURL_alt2: "https://birbir-town-khc-child-ministry.firebaseio.com",
      projectId: "birbir-town-khc-child-ministry",
      storageBucket: "birbir-town-khc-child-ministry.firebasestorage.app",
      messagingSenderId: "556764983235",
      appId: "1:556764983235:web:fb6fecffab48f8e6285776"
    }
  },
  {
    id: "birbir-khc-child-page",
    label: "birbir-khc-child-page",
    config: {
      apiKey: "AIzaSyCRyDJHarx0va7X5pXXP2rnGafq2eBLq9s",
      authDomain: "birbir-khc-child-page.firebaseapp.com",
      databaseURL: "https://birbir-khc-child-page-default-rtdb.europe-west1.firebasedatabase.app",
      databaseURL_alt: "https://birbir-khc-child-page-default-rtdb.firebaseio.com",
      databaseURL_alt2: "https://birbir-khc-child-page.firebaseio.com",
      projectId: "birbir-khc-child-page",
      storageBucket: "birbir-khc-child-page.firebasestorage.app",
      messagingSenderId: "44927911746",
      appId: "1:44927911746:web:e4ccfd7048a7ee1fb8aadb",
      measurementId: "G-XMQ04TVFFN"
    }
  },
  {
    id: "birbir-town-khc-child-page",
    label: "birbir-town-khc-child-page (የቀድሞው ዳታቤዝ - ስራ የነበረበት)",
    config: {
      apiKey: "AIzaSyBx7ZJxRNzjNb8Lx79R2vXjWq-MsZBPTfA",
      authDomain: "birbir-town-khc-child-page.firebaseapp.com",
      databaseURL: "https://birbir-town-khc-child-page-default-rtdb.europe-west1.firebasedatabase.app",
      databaseURL_alt: "https://birbir-town-khc-child-page-default-rtdb.firebaseio.com",
      projectId: "birbir-town-khc-child-page",
      storageBucket: "birbir-town-khc-child-page.firebasestorage.app",
      messagingSenderId: "1007927588446",
      appId: "1:1007927588446:web:b85df399e7b1b89c1d26cf"
    }
  },
  {
    id: "birbir-town-khc-bible-sc-82849",
    label: "birbir-town-khc-bible-sc-82849",
    config: {
      apiKey: "AIzaSyAnUdWOOAZhOfRtx-GfW89pz1iKrDonz_s",
      authDomain: "birbir-town-khc-bible-sc-82849.firebaseapp.com",
      databaseURL: "https://birbir-town-khc-bible-sc-82849-default-rtdb.europe-west1.firebasedatabase.app",
      databaseURL_alt: "https://birbir-town-khc-bible-sc-82849-default-rtdb.firebaseio.com",
      projectId: "birbir-town-khc-bible-sc-82849",
      storageBucket: "birbir-town-khc-bible-sc-82849.firebasestorage.app",
      messagingSenderId: "745550786105",
      appId: "1:745550786105:web:6724bcaecde6d39b1967e8"
    }
  }
];

const ACTIVE_PROJECT_STORAGE_KEY = 'birbir_active_firebase_project_id';
const LOCAL_STORAGE_KEY = 'birbir_khc_local_data';
const BACKUP_STORAGE_KEY = 'birbir_khc_safety_backup';
const DB_KEY = 'kaleheywet_data';

export const getActiveProjectId = (): string => {
  const saved = localStorage.getItem(ACTIVE_PROJECT_STORAGE_KEY);
  if (!saved || saved === 'birbir-khc-child-page') {
    return 'birbir-town-khc-child-ministry';
  }
  return saved;
};

export const setActiveProjectId = (projectId: string) => {
  localStorage.setItem(ACTIVE_PROJECT_STORAGE_KEY, projectId);
};

export const getActiveProjectProfile = (): FirebaseProjectProfile => {
  const currentId = getActiveProjectId();
  return KNOWN_PROJECTS.find((p) => p.id === currentId) || KNOWN_PROJECTS[0];
};

export const firebaseConfig = getActiveProjectProfile().config;

// Initialize Firebase App
let appInstance: FirebaseApp | null = null;
let rtdbInstance: Database | null = null;
let firestoreInstance: Firestore | null = null;

const countStudentsInData = (data: any): number => {
  if (!data?.students || typeof data.students !== 'object') return 0;
  return Object.values(data.students).reduce(
    (acc: number, classObj: any) =>
      acc + (typeof classObj === 'object' ? Object.values(classObj).reduce((cAcc: number, arr: any) => cAcc + (Array.isArray(arr) ? arr.length : 0), 0) : 0),
    0
  );
};

const initFirebaseForActiveProject = () => {
  try {
    const profile = getActiveProjectProfile();
    const appName = `app_${profile.id.replace(/[^a-zA-Z0-9]/g, '_')}`;
    
    const existing = getApps().find((a) => a.name === appName);
    appInstance = existing || initializeApp(profile.config, appName);

    // Try primary RTDB URL (europe-west1 or us)
    try {
      rtdbInstance = getDatabase(appInstance, profile.config.databaseURL);
    } catch {
      if (profile.config.databaseURL_alt) {
        try {
          rtdbInstance = getDatabase(appInstance, profile.config.databaseURL_alt);
        } catch {}
      }
    }

    try {
      firestoreInstance = getFirestore(appInstance);
    } catch {}
  } catch (err) {
    console.warn('Firebase init notice:', err);
  }
};

initFirebaseForActiveProject();

export const db = rtdbInstance;
export const firestore = firestoreInstance;

// Load stored local data with exhaustive recovery check across all potential keys in localStorage
export const loadStoredLocalData = (): AppData => {
  try {
    const candidates: any[] = [];

    // Explicit known keys
    const knownKeys = [
      LOCAL_STORAGE_KEY,
      BACKUP_STORAGE_KEY,
      'kaleheywet_data',
      'birbir_town_khc_data',
      'sunday_school_data',
      'church_data',
      'students_data'
    ];

    knownKeys.forEach((k) => {
      try {
        const item = localStorage.getItem(k);
        if (item) {
          const parsed = JSON.parse(item);
          if (parsed && typeof parsed === 'object') candidates.push(parsed);
        }
      } catch {}
    });

    // Also scan all localStorage items in case of custom or legacy keys
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && !knownKeys.includes(k) && (k.includes('birbir') || k.includes('kale') || k.includes('backup') || k.includes('student'))) {
          const item = localStorage.getItem(k);
          if (item) {
            try {
              const parsed = JSON.parse(item);
              if (parsed && typeof parsed === 'object' && (parsed.students || parsed.teachers)) {
                candidates.push(parsed);
              }
            } catch {}
          }
        }
      }
    } catch {}

    // Find candidate with most student records
    let bestSource: any = null;
    let maxStudents = -1;

    candidates.forEach((cand) => {
      const studentCount = countStudentsInData(cand);
      if (studentCount > maxStudents) {
        maxStudents = studentCount;
        bestSource = cand;
      }
    });

    const source = bestSource || candidates[0] || {};

    const rawData: AppData = {
      ...INITIAL_APP_DATA,
      ...source,
      pins: { ...INITIAL_APP_DATA.pins, ...(source.pins || {}) },
      teachers: (source.teachers && source.teachers.length > 0) ? source.teachers : INITIAL_APP_DATA.teachers,
      plans: (source.plans && source.plans.length > 0) ? source.plans : INITIAL_APP_DATA.plans,
      choirGroups: (source.choirGroups && source.choirGroups.length > 0) ? source.choirGroups : INITIAL_APP_DATA.choirGroups,
      spiritualGroups: (source.spiritualGroups && source.spiritualGroups.length > 0) ? source.spiritualGroups : INITIAL_APP_DATA.spiritualGroups,
      subjects: (source.subjects && source.subjects.length > 0) ? source.subjects : INITIAL_APP_DATA.subjects,
      classSubjects: source.classSubjects || {},
      students: source.students || {},
      attendance: source.attendance || [],
      choirMembers: source.choirMembers || [],
      spiritualMembers: source.spiritualMembers || [],
      chapels: (source.chapels && source.chapels.length > 0) ? source.chapels : INITIAL_APP_DATA.chapels || [],
      churchChildren: (source.churchChildren && source.churchChildren.length > 0) ? source.churchChildren : INITIAL_APP_DATA.churchChildren || []
    };

    return sanitizeAndDeduplicateAppData(rawData);
  } catch (e) {
    console.error('Error reading localStorage data', e);
  }
  return INITIAL_APP_DATA;
};

export const saveToLocalStorage = (data: AppData) => {
  try {
    const sanitized = sanitizeAndDeduplicateAppData(data);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(sanitized));
    // If data has actual student content, keep safety backup
    if (countStudentsInData(sanitized) > 0 || (sanitized.teachers && sanitized.teachers.length > 0)) {
      localStorage.setItem(BACKUP_STORAGE_KEY, JSON.stringify(sanitized));
    }
  } catch (e) {
    console.error('Error saving to localStorage', e);
  }
};

export interface SyncDiagnosticInfo {
  status: 'connected' | 'saving' | 'offline' | 'permission_denied' | 'error';
  projectId: string;
  projectLabel: string;
  databaseURL: string;
  lastSyncTime?: string;
  errorMessage?: string;
  totalStudentsLocal?: number;
}

export let currentDiagnostic: SyncDiagnosticInfo = {
  status: 'offline',
  projectId: getActiveProjectId(),
  projectLabel: getActiveProjectProfile().label,
  databaseURL: getActiveProjectProfile().config.databaseURL,
  totalStudentsLocal: 0
};

export const CLIENT_SESSION_ID = `client_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

export const subscribeToAppData = (
  onData: (data: AppData) => void,
  onStatusChange: (status: 'connected' | 'saving' | 'offline' | 'error', diag?: SyncDiagnosticInfo) => void
) => {
  const initialLocal = loadStoredLocalData();
  onData(initialLocal);

  initFirebaseForActiveProject();
  const profile = getActiveProjectProfile();

  let unsubRtdb: (() => void) | null = null;
  let unsubFirestore: (() => void) | null = null;

  const handleRemoteData = (val: any) => {
    if (val && typeof val === 'object') {
      // If this update was emitted by this very client session, skip re-render to prevent loopback echo and input lag
      if (val._syncMeta && val._syncMeta.clientId === CLIENT_SESSION_ID) {
        currentDiagnostic = {
          status: 'connected',
          projectId: profile.id,
          projectLabel: profile.label,
          databaseURL: profile.config.databaseURL,
          lastSyncTime: new Date().toLocaleTimeString('am-ET')
        };
        onStatusChange('connected', currentDiagnostic);
        return;
      }

      const currentLocal = loadStoredLocalData();

      // Safe per-year and per-class deep merge for students
      const mergedStudents: AppData['students'] = {};
      const localStudents = currentLocal.students || {};
      const remoteStudents = (val.students && typeof val.students === 'object') ? val.students : {};

      const allYears = Array.from(new Set([
        ...Object.keys(localStudents),
        ...Object.keys(remoteStudents)
      ]));

      allYears.forEach((yr) => {
        const localClassMap = localStudents[yr] || {};
        const remoteClassMap = remoteStudents[yr] || {};
        const allClasses = Array.from(new Set([
          ...Object.keys(localClassMap),
          ...Object.keys(remoteClassMap)
        ]));

        mergedStudents[yr] = {};
        allClasses.forEach((cls) => {
          const remoteList = Array.isArray(remoteClassMap[cls]) ? remoteClassMap[cls] : [];
          const localList = Array.isArray(localClassMap[cls]) ? localClassMap[cls] : [];
          mergedStudents[yr][cls] = remoteList.length > 0 ? remoteList : localList;
        });
      });

      // Safe non-destructive merge: do NOT overwrite non-empty local records with empty remote ones!
      const mergedData: AppData = {
        ...INITIAL_APP_DATA,
        ...currentLocal,
        ...val,
        pins: val.pins || currentLocal.pins || INITIAL_APP_DATA.pins,
        teachers: (val.teachers && val.teachers.length > 0) ? val.teachers : currentLocal.teachers,
        subjects: (val.subjects && val.subjects.length > 0) ? val.subjects : currentLocal.subjects,
        classSubjects: val.classSubjects || currentLocal.classSubjects || {},
        choirGroups: (val.choirGroups && val.choirGroups.length > 0) ? val.choirGroups : currentLocal.choirGroups,
        spiritualGroups: (val.spiritualGroups && val.spiritualGroups.length > 0) ? val.spiritualGroups : currentLocal.spiritualGroups,
        plans: (val.plans && val.plans.length > 0) ? val.plans : currentLocal.plans,
        students: Object.keys(mergedStudents).length > 0 ? mergedStudents : (currentLocal.students || {}),
        attendance: (val.attendance && val.attendance.length > 0) ? val.attendance : currentLocal.attendance,
        choirMembers: (val.choirMembers && val.choirMembers.length > 0) ? val.choirMembers : currentLocal.choirMembers,
        spiritualMembers: (val.spiritualMembers && val.spiritualMembers.length > 0) ? val.spiritualMembers : currentLocal.spiritualMembers,
        chapels: (val.chapels && val.chapels.length > 0) ? val.chapels : currentLocal.chapels || [],
        churchChildren: (val.churchChildren && val.churchChildren.length > 0) ? val.churchChildren : currentLocal.churchChildren || [],
        years: (val.years && val.years.length > 0) ? val.years : currentLocal.years
      };

      const sanitizedMerged = sanitizeAndDeduplicateAppData(mergedData);

      saveToLocalStorage(sanitizedMerged);
      onData(sanitizedMerged);

      currentDiagnostic = {
        status: 'connected',
        projectId: profile.id,
        projectLabel: profile.label,
        databaseURL: profile.config.databaseURL,
        lastSyncTime: new Date().toLocaleTimeString('am-ET')
      };
      onStatusChange('connected', currentDiagnostic);
    }
  };

  // Try Realtime Database with connection listeners
  if (rtdbInstance) {
    try {
      const dataRef = ref(rtdbInstance, DB_KEY);
      unsubRtdb = onValue(
        dataRef,
        (snapshot) => {
          const val = snapshot.val();
          if (val) {
            handleRemoteData(val);
          } else {
            // Remote is empty: upload our local data so cloud is populated!
            set(dataRef, initialLocal)
              .then(() => {
                currentDiagnostic = {
                  status: 'connected',
                  projectId: profile.id,
                  projectLabel: profile.label,
                  databaseURL: profile.config.databaseURL,
                  lastSyncTime: new Date().toLocaleTimeString('am-ET')
                };
                onStatusChange('connected', currentDiagnostic);
              })
              .catch((err) => {
                const isPermission = err?.message?.includes('PERMISSION_DENIED');
                currentDiagnostic = {
                  status: isPermission ? 'permission_denied' : 'offline',
                  projectId: profile.id,
                  projectLabel: profile.label,
                  databaseURL: profile.config.databaseURL,
                  errorMessage: err?.message
                };
                onStatusChange('offline', currentDiagnostic);
              });
          }
        },
        (error) => {
          const isPermission = error?.message?.includes('PERMISSION_DENIED');
          currentDiagnostic = {
            status: isPermission ? 'permission_denied' : 'offline',
            projectId: profile.id,
            projectLabel: profile.label,
            databaseURL: profile.config.databaseURL,
            errorMessage: isPermission
              ? 'የFirebase ፍቃድ አልተከፈተም (Permission Denied)። እባክዎ በFirebase Console ውስጥ Rules ን .read: true, .write: true ያድርጉ።'
              : error?.message
          };
          onStatusChange('offline', currentDiagnostic);
        }
      );
    } catch (err: any) {
      currentDiagnostic = {
        status: 'offline',
        projectId: profile.id,
        projectLabel: profile.label,
        databaseURL: profile.config.databaseURL,
        errorMessage: err?.message
      };
      onStatusChange('offline', currentDiagnostic);
    }
  }

  // Only try Firestore listener as fallback if Realtime Database is not present
  if (firestoreInstance && !rtdbInstance) {
    try {
      const docRef = doc(firestoreInstance, 'church_data', DB_KEY);
      unsubFirestore = onSnapshot(
        docRef,
        (snap) => {
          if (snap.exists()) {
            handleRemoteData(snap.data());
            currentDiagnostic = {
              status: 'connected',
              projectId: profile.id,
              projectLabel: profile.label,
              databaseURL: profile.config.databaseURL,
              lastSyncTime: new Date().toLocaleTimeString('am-ET'),
              totalStudentsLocal: countStudentsInData(loadStoredLocalData())
            };
            onStatusChange('connected', currentDiagnostic);
          }
        },
        () => {
          // Gracefully ignore Firestore offline / backend connection notes
          if (unsubFirestore) {
            unsubFirestore();
            unsubFirestore = null;
          }
        }
      );
    } catch {}
  }

  return () => {
    if (unsubRtdb) unsubRtdb();
    if (unsubFirestore) unsubFirestore();
  };
};

export const syncAppDataToFirebase = async (data: AppData): Promise<boolean> => {
  saveToLocalStorage(data);
  let synced = false;

  const payload = {
    ...data,
    _syncMeta: {
      clientId: CLIENT_SESSION_ID,
      timestamp: Date.now()
    }
  };

  if (rtdbInstance) {
    try {
      const dataRef = ref(rtdbInstance, DB_KEY);
      await set(dataRef, payload);
      synced = true;
      currentDiagnostic.lastSyncTime = new Date().toLocaleTimeString('am-ET');
    } catch (error: any) {
      console.warn('RTDB sync note:', error?.message);
    }
  }

  if (firestoreInstance && !rtdbInstance) {
    try {
      const docRef = doc(firestoreInstance, 'church_data', DB_KEY);
      // Timeout Firestore setDoc so it never hangs if backend is unreachable
      await Promise.race([
        setDoc(docRef, payload, { merge: true }),
        new Promise<void>((_, reject) => setTimeout(() => reject(new Error('timeout')), 2000))
      ]);
      synced = true;
    } catch {}
  }

  return synced;
};

// Scan and recover previous cloud data from other projects
export const scanAndRecoverPreviousCloudData = async (): Promise<{
  found: boolean;
  projectLabel?: string;
  projectId?: string;
  data?: AppData;
  studentCount?: number;
}> => {
  for (const proj of KNOWN_PROJECTS) {
    try {
      const tempAppName = `scanner_${proj.id.replace(/[^a-zA-Z0-9]/g, '_')}`;
      const tempApp = getApps().find((a) => a.name === tempAppName) || initializeApp(proj.config, tempAppName);

      // Try RTDB URLs
      const urls = [proj.config.databaseURL, proj.config.databaseURL_alt, proj.config.databaseURL_alt2].filter(Boolean) as string[];
      for (const u of urls) {
        try {
          const tempRtdb = getDatabase(tempApp, u);
          const dataRef = ref(tempRtdb, DB_KEY);
          // Simple timeout promise for quick probe
          const snap = await Promise.race([
            get(dataRef),
            new Promise<null>((_, reject) => setTimeout(() => reject(new Error('timeout')), 3000))
          ]);
          if (snap && snap.exists()) {
            const val = snap.val();
            const count = countStudentsInData(val);
            if (count > 0 || (val?.teachers && val.teachers.length > 0)) {
              return {
                found: true,
                projectLabel: proj.label,
                projectId: proj.id,
                data: val,
                studentCount: count
              };
            }
          }
        } catch {}
      }

      // Try Firestore
      try {
        const tempFirestore = getFirestore(tempApp);
        const docRef = doc(tempFirestore, 'church_data', DB_KEY);
        const snap = await Promise.race([
          getDoc(docRef),
          new Promise<null>((_, reject) => setTimeout(() => reject(new Error('timeout')), 3000))
        ]);
        if (snap && snap.exists()) {
          const val = snap.data();
          const count = countStudentsInData(val);
          if (count > 0 || (val?.teachers && val.teachers.length > 0)) {
            return {
              found: true,
              projectLabel: proj.label,
              projectId: proj.id,
              data: val as AppData,
              studentCount: count
            };
          }
        }
      } catch {}
    } catch {}
  }
  return { found: false };
};

export { countStudentsInData };

// Full Backup JSON Exporter
export const exportBackupJSON = (data: AppData) => {
  const jsonStr = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `የብርብር_ቃለ_ሕይወት_ሙሉ_ዳታ_${new Date().toISOString().substring(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

// Full Backup JSON Importer
export const importBackupJSON = (jsonString: string): AppData | null => {
  try {
    const parsed = JSON.parse(jsonString);
    if (parsed && typeof parsed === 'object') {
      const validData: AppData = {
        ...INITIAL_APP_DATA,
        ...parsed,
        students: parsed.students || {},
        teachers: parsed.teachers || INITIAL_APP_DATA.teachers,
        plans: parsed.plans || INITIAL_APP_DATA.plans,
        attendance: parsed.attendance || [],
        choirMembers: parsed.choirMembers || [],
        spiritualMembers: parsed.spiritualMembers || []
      };
      saveToLocalStorage(validData);
      syncAppDataToFirebase(validData);
      return validData;
    }
  } catch (err) {
    console.error('Import backup failed:', err);
  }
  return null;
};

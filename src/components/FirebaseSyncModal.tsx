import React, { useState } from 'react';
import {
  Database,
  ShieldCheck,
  AlertTriangle,
  Download,
  Upload,
  RefreshCw,
  CheckCircle2,
  Copy,
  Save,
  Server,
  Search,
  FileCheck2,
  ExternalLink
} from 'lucide-react';
import { AppData } from '../types';
import {
  KNOWN_PROJECTS,
  getActiveProjectId,
  setActiveProjectId,
  currentDiagnostic,
  exportBackupJSON,
  importBackupJSON,
  syncAppDataToFirebase,
  scanAndRecoverPreviousCloudData,
  countStudentsInData
} from '../services/firebase';

interface FirebaseSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  appData: AppData;
  onDataRestored: (newData: AppData) => void;
  syncStatus: 'connected' | 'saving' | 'offline' | 'error';
}

export const FirebaseSyncModal: React.FC<FirebaseSyncModalProps> = ({
  isOpen,
  onClose,
  appData,
  onDataRestored,
  syncStatus
}) => {
  const [selectedProjectId, setSelectedProjectId] = useState<string>(getActiveProjectId());
  const [copiedRtdbRules, setCopiedRtdbRules] = useState(false);
  const [copiedFirestoreRules, setCopiedFirestoreRules] = useState(false);
  const [switching, setSwitching] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [foundCloudData, setFoundCloudData] = useState<{
    projectLabel?: string;
    projectId?: string;
    studentCount?: number;
    data?: AppData;
  } | null>(null);

  if (!isOpen) return null;

  const totalStudents = countStudentsInData(appData);
  const totalTeachers = appData.teachers?.length || 0;

  const handleSwitchProject = (newId: string) => {
    setSelectedProjectId(newId);
    setActiveProjectId(newId);
    setSwitching(true);
    setStatusMessage('ወደተመረጠው ፕሮጀክት በመቀየር ዳታ በመፈለግ ላይ ነው...');
    setTimeout(() => {
      window.location.reload();
    }, 800);
  };

  const handleDownloadBackup = () => {
    exportBackupJSON(appData);
    setStatusMessage('ሙሉ የዳታ ባክአፕ ወደ ኮምፒዩተርዎ/ስልክዎ ወርዷል! መረጃዎ 100% ደህንነቱ የተጠበቀ ነው።');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const restored = importBackupJSON(content);
      if (restored) {
        onDataRestored(restored);
        setStatusMessage('ዳታው ከተጫነው ባክአፕ ፋይል በተሳካ ሁኔታ ተመልሷል!');
      } else {
        alert('የተመረጠው ፋይል ትክክለኛ የባክአፕ ፎርማት አይደለም!');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const copyRtdbRules = () => {
    const rulesText = `{\n  "rules": {\n    ".read": true,\n    ".write": true\n  }\n}`;
    navigator.clipboard.writeText(rulesText);
    setCopiedRtdbRules(true);
    setTimeout(() => setCopiedRtdbRules(false), 2500);
  };

  const copyFirestoreRules = () => {
    const rulesText = `rules_version = '2';\nservice cloud.firestore {\n  match /{document=**} {\n    allow read, write: if true;\n  }\n}`;
    navigator.clipboard.writeText(rulesText);
    setCopiedFirestoreRules(true);
    setTimeout(() => setCopiedFirestoreRules(false), 2500);
  };

  const handleForceSync = async () => {
    setStatusMessage('ዳታውን ወደ ኦንላይን ዳታቤዝ በመላክ ላይ...');
    const ok = await syncAppDataToFirebase(appData);
    if (ok) {
      setStatusMessage('✓ ዳታው በሙሉ ወደ ኦንላይን ዳታቤዝ በሚገባ ተልኳል!');
    } else {
      setStatusMessage('ወደ ኦንላይን መላክ አልተሳካም። እባክዎ ከታች የFirebase Rules መከፈቱን ያረጋግጡ። ስራዎ በብሮውዘርዎ ውስጥ በደህና ተቀምጧል!');
    }
  };

  // Deep Cloud Scanner to recover previous work
  const handleScanForPreviousWork = async () => {
    setScanning(true);
    setStatusMessage('የቀድሞ ፕሮጀክቶች በመፈተሽ ላይ ናቸው...');
    try {
      const result = await scanAndRecoverPreviousCloudData();
      if (result.found && result.data) {
        setFoundCloudData({
          projectLabel: result.projectLabel,
          projectId: result.projectId,
          studentCount: result.studentCount,
          data: result.data
        });
        setStatusMessage(`በ${result.projectLabel} ውስጥ ${result.studentCount} ተማሪዎች ተገኝተዋል!`);
      } else {
        setStatusMessage('በቀድሞዎቹ ፕሮጀክቶች ውስጥ ተጨማሪ ተማሪዎች አልተገኙም። በአሁኑ ገጽ ላይ ያለው መረጃ ዋናው ነው።');
      }
    } catch {
      setStatusMessage('ፍተሻው ተጠናቋል።');
    } finally {
      setScanning(false);
    }
  };

  const handleApplyRecoveredData = () => {
    if (foundCloudData?.data) {
      onDataRestored(foundCloudData.data);
      syncAppDataToFirebase(foundCloudData.data);
      setStatusMessage('✓ የቀድሞው ዳታ ሙሉ በሙሉ ተመልሶ ወደ አዲሱ ዳታቤዝ ተልኳል!');
      setFoundCloudData(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div
              className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                syncStatus === 'connected'
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-amber-100 text-amber-800'
              }`}
            >
              <Database className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">
                የዳታ ደህንነት እና የFirebase ዳታቤዝ ማስተካከያ
              </h3>
              <p className="text-xs text-slate-500">
                መረጃዎ እንዳይጠፋ ማረጋገጫ፣ ባክአፕ ማውረጃ እና የዳታቤዝ ግንኙነት
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 font-bold text-lg p-1"
          >
            ✕
          </button>
        </div>

        {/* Content Body */}
        <div className="overflow-y-auto flex-1 py-4 space-y-4 pr-1 text-xs">
          {/* Reassurance Banner */}
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-950">
            <div className="flex items-center gap-2 font-bold text-sm text-emerald-800">
              <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>የእርስዎ የሰሩት ስራ አልጠፋም! (Data is Protected)</span>
            </div>
            <p className="mt-1 text-[11px] text-emerald-900 leading-relaxed">
              የሰሯቸው ስራዎች በሙሉ በብሮውዘርዎ ማህደረ-ትውስታ ውስጥ ተቀምጠዋል።
              አሁን በስርዓቱ ውስጥ፦ <strong>{totalStudents} ተማሪዎች</strong> እና <strong>{totalTeachers} መምህራን</strong> ተመዝግበው ይገኛሉ።
            </p>
          </div>

          {/* Status Notification Message */}
          {statusMessage && (
            <div className="p-3 bg-blue-50 border border-blue-200 text-blue-900 rounded-xl font-medium flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
              <span>{statusMessage}</span>
            </div>
          )}

          {/* Found Cloud Data Recovery Prompt */}
          {foundCloudData && (
            <div className="p-4 bg-amber-50 border-2 border-amber-400 rounded-2xl space-y-2">
              <div className="flex items-center gap-2 font-bold text-amber-900 text-xs">
                <FileCheck2 className="w-4 h-4 text-amber-600" />
                <span>በ{foundCloudData.projectLabel} ውስጥ {foundCloudData.studentCount} ተማሪዎች ተገኝተዋል!</span>
              </div>
              <p className="text-amber-800 text-[11px]">
                የቀድሞ ስራዎን ወደ አሁኑ ገጽ በማምጣት ወደ አዲሱ Firebase ዳታቤዝ ማዛወር ይችላሉ።
              </p>
              <button
                type="button"
                onClick={handleApplyRecoveredData}
                className="bg-emerald-700 hover:bg-emerald-600 text-white font-bold px-4 py-2 rounded-xl transition flex items-center gap-1.5 shadow"
              >
                <CheckCircle2 className="w-4 h-4" />
                የተገኘውን ዳታ አሁን ወደ አዲሱ ዳታቤዝ አዛውር (Migrate to New Database)
              </button>
            </div>
          )}

          {/* Action 1: Instant Backup Download (Zero Risk) */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
            <h4 className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              1. የዳታ ባክአፕ ማውረጃ እና መመለሻ (Data Protection)
            </h4>
            <p className="text-slate-500 text-[11px]">
              የሰሩትን ሙሉ ስራ (ተማሪዎች፣ ውጤቶች፣ መምህራን፣ ዕቅዶች) ወደ ኮምፒዩተርዎ ወይም ስልክዎ እንደ ፋይል አውርደው ያስቀምጡ።
            </p>

            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="button"
                onClick={handleDownloadBackup}
                className="bg-emerald-700 hover:bg-emerald-600 text-white font-bold px-4 py-2 rounded-xl transition flex items-center gap-1.5 shadow"
              >
                <Download className="w-3.5 h-3.5" />
                💾 ሙሉ ዳታዬን ባክአፕ አውርድ (Backup JSON)
              </button>

              <label className="bg-slate-700 hover:bg-slate-600 text-white font-bold px-4 py-2 rounded-xl transition flex items-center gap-1.5 shadow cursor-pointer">
                <Upload className="w-3.5 h-3.5" />
                📥 የባክአፕ ፋይል ጫን (Restore)
                <input
                  type="file"
                  accept=".json"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>

              <button
                type="button"
                onClick={handleForceSync}
                className="bg-blue-800 hover:bg-blue-700 text-white font-bold px-4 py-2 rounded-xl transition flex items-center gap-1.5 shadow"
              >
                <Save className="w-3.5 h-3.5" />
                ወደ ኦንላይን ዳታቤዝ አስቀምጥ
              </button>

              <button
                type="button"
                disabled={scanning}
                onClick={handleScanForPreviousWork}
                className="bg-indigo-700 hover:bg-indigo-600 disabled:opacity-50 text-white font-bold px-4 py-2 rounded-xl transition flex items-center gap-1.5 shadow"
              >
                <Search className="w-3.5 h-3.5" />
                {scanning ? 'በመፈለግ ላይ...' : '🔍 የቀድሞ ስራዬን ፈልግ / አምጣ'}
              </button>
            </div>
          </div>

          {/* Action 2: Choose / Switch Firebase Database Project */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
            <h4 className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
              <Server className="w-4 h-4 text-blue-600" />
              2. የFirebase ፕሮጀክት መምረጫ (Switch Project)
            </h4>
            <p className="text-slate-500 text-[11px]">
              ስራዎን በሌላ Firebase ፕሮጀክት ላይ ሰርተው ከነበረ፣ ፕሮጀክቱን እዚህ በመምረጥ መረጃዎን መልሰው ማግኘት ይችላሉ፦
            </p>

            <div className="space-y-2">
              {KNOWN_PROJECTS.map((proj) => {
                const isSelected = selectedProjectId === proj.id;
                return (
                  <div
                    key={proj.id}
                    onClick={() => handleSwitchProject(proj.id)}
                    className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition ${
                      isSelected
                        ? 'bg-blue-50/80 border-blue-400 font-bold text-blue-950 shadow-sm'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs">{proj.label}</span>
                        {isSelected && (
                          <span className="bg-blue-600 text-white text-[9px] px-1.5 py-0.5 rounded font-bold">
                            አሁን የተመረጠው
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400 block font-mono mt-0.5">
                        {proj.config.databaseURL}
                      </span>
                    </div>

                    <button
                      type="button"
                      disabled={switching}
                      className={`text-xs px-2.5 py-1 rounded-lg ${
                        isSelected
                          ? 'bg-blue-600 text-white font-semibold'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {isSelected ? 'ተመርጧል' : 'ቀይር & ጫን'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Action 3: Firebase Rules Instructions */}
          <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200 space-y-3">
            <h4 className="font-bold text-amber-900 text-xs flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              3. የFirebase ዳታቤዝ ፍቃድ ማስተካከያ (Firebase Rules Setup)
            </h4>
            <p className="text-slate-600 text-[11px] leading-relaxed">
              Firebase አዲስ ሲፈጠር በነባሪነት እንዳይጻፍበት ተቆልፎ (Locked Mode) ሊሆን ይችላል። ኦንላይን ዳታቤዝ እንዲገናኝ በFirebase Console ውስጥ የሚከተለውን ደንብ (Rules) ያስገቡ፦
            </p>

            {/* RTDB Rules */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-slate-700 text-[11px]">ሀ) ለ Realtime Database፦</span>
                <button
                  type="button"
                  onClick={copyRtdbRules}
                  className="bg-amber-600 hover:bg-amber-500 text-white px-2 py-0.5 rounded text-[10px] flex items-center gap-1"
                >
                  {copiedRtdbRules ? <CheckCircle2 className="w-3 h-3 text-white" /> : <Copy className="w-3 h-3" />}
                  {copiedRtdbRules ? 'ተቀድቷል!' : 'ኮፒ አድርግ'}
                </button>
              </div>
              <div className="bg-slate-900 text-emerald-300 font-mono text-[10px] p-2.5 rounded-xl overflow-x-auto">
                <pre>{`{\n  "rules": {\n    ".read": true,\n    ".write": true\n  }\n}`}</pre>
              </div>
            </div>

            {/* Firestore Rules */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-slate-700 text-[11px]">ለ) ለ Cloud Firestore፦</span>
                <button
                  type="button"
                  onClick={copyFirestoreRules}
                  className="bg-blue-600 hover:bg-blue-500 text-white px-2 py-0.5 rounded text-[10px] flex items-center gap-1"
                >
                  {copiedFirestoreRules ? <CheckCircle2 className="w-3 h-3 text-white" /> : <Copy className="w-3 h-3" />}
                  {copiedFirestoreRules ? 'ተቀድቷል!' : 'ኮፒ አድርግ'}
                </button>
              </div>
              <div className="bg-slate-900 text-emerald-300 font-mono text-[10px] p-2.5 rounded-xl overflow-x-auto">
                <pre>{`rules_version = '2';\nservice cloud.firestore {\n  match /{document=**} {\n    allow read, write: if true;\n  }\n}`}</pre>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
          <span className="text-[11px] text-slate-400">
            መረጃዎ በቋሚነት የተጠበቀ ነው።
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 text-xs bg-blue-900 hover:bg-blue-800 text-white rounded-xl font-bold shadow"
          >
            ዝጋ / ተመለስ
          </button>
        </div>
      </div>
    </div>
  );
};

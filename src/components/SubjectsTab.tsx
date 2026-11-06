import React, { useState } from 'react';
import { BookOpen, Plus, Trash2, CheckCircle2, CheckSquare, Square, Layers, Sparkles, Printer, Download, Upload } from 'lucide-react';
import { Role } from '../types';
import { downloadCSV, readCSVFile } from '../utils/csv';

interface SubjectsTabProps {
  subjects: string[];
  classList: string[];
  classSubjects?: { [className: string]: string[] };
  onUpdateClassSubjects?: (classSubjects: { [className: string]: string[] }) => void;
  onAddSubject: (subjectName: string) => void;
  onDeleteSubject: (index: number) => void;
  currentUserRole: Role | null;
}

export const SubjectsTab: React.FC<SubjectsTabProps> = ({
  subjects,
  classList,
  classSubjects = {},
  onUpdateClassSubjects,
  onAddSubject,
  onDeleteSubject,
  currentUserRole
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [newSubject, setNewSubject] = useState('');
  const [assigningSubject, setAssigningSubject] = useState<string | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<'subjects' | 'byClass'>('subjects');
  const [selectedClassForView, setSelectedClassForView] = useState<string>(classList[0]);

  const isAdmin = currentUserRole === 'admin';

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubject.trim()) {
      alert('እባክዎ የትምህርቱን ስም ያስገቡ!');
      return;
    }
    onAddSubject(newSubject.trim());
    setNewSubject('');
    setShowAddModal(false);
  };

  const handleExportCSV = () => {
    let csv = '\uFEFFተ.ቁ,የትምህርት ዓይነት,የተመደበባቸው ክፍሎች ብዛት,የተመደቡባቸው ክፍሎች ዝርዝር\n';
    subjects.forEach((s, idx) => {
      const assignedClassesList = classList.filter((c) => (classSubjects[c] || []).includes(s));
      csv += `${idx + 1},"${s}",${assignedClassesList.length},"${assignedClassesList.join('፣ ')}"\n`;
    });
    downloadCSV(csv, 'የትምህርት_ዓይነቶች_ዝርዝር.csv');
  };

  const handleImportCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const rows = await readCSVFile(file);
      if (rows.length <= 1) {
        alert('የተመረጠው ፋይል ባዶ ወይም ትክክለኛ የኤክሴል/CSV ፎርማት አይደለም!');
        return;
      }

      let count = 0;
      const startIdx = (rows[0][0]?.includes('ተ.ቁ') || rows[0][1]?.includes('ትምህርት') || rows[0][0]?.includes('ትምህርት')) ? 1 : 0;

      for (let i = startIdx; i < rows.length; i++) {
        const cols = rows[i];
        if (!cols || cols.length < 1) continue;

        const subjectVal = (cols[1] || cols[0] || '').trim();
        if (subjectVal && !subjects.includes(subjectVal)) {
          onAddSubject(subjectVal);
          count++;
        }
      }

      alert(`✓ ${count} አዳዲስ የትምህርት ዓይነቶች ከኤክሴል/CSV በተሳካ ሁኔታ ተጭነዋል!`);
    } catch {
      alert('ፋይሉን ማንበብ አልተሳካም።');
    }
    e.target.value = '';
  };

  // Check how many classes have this subject
  const getAssignedCount = (subjectName: string) => {
    let count = 0;
    Object.values(classSubjects).forEach((subs) => {
      if (subs && subs.includes(subjectName)) count++;
    });
    return count;
  };

  // Toggle subject for a specific class
  const toggleSubjectForClass = (className: string, subjectName: string) => {
    if (!onUpdateClassSubjects) return;
    const current = classSubjects[className] || [];
    let updated: string[];
    if (current.includes(subjectName)) {
      updated = current.filter((s) => s !== subjectName);
    } else {
      updated = [...current, subjectName];
    }
    onUpdateClassSubjects({
      ...classSubjects,
      [className]: updated
    });
  };

  // Batch toggle subject to classes
  const handleAssignPreset = (subjectName: string, targetClasses: string[]) => {
    if (!onUpdateClassSubjects) return;
    const newClassSubjects = { ...classSubjects };
    targetClasses.forEach((c) => {
      const current = newClassSubjects[c] || [];
      if (!current.includes(subjectName)) {
        newClassSubjects[c] = [...current, subjectName];
      }
    });
    onUpdateClassSubjects(newClassSubjects);
  };

  const handleRemoveSubjectFromAll = (subjectName: string) => {
    if (!onUpdateClassSubjects) return;
    const newClassSubjects = { ...classSubjects };
    Object.keys(newClassSubjects).forEach((c) => {
      newClassSubjects[c] = (newClassSubjects[c] || []).filter((s) => s !== subjectName);
    });
    onUpdateClassSubjects(newClassSubjects);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Printable Sheet Header */}
      <div className="hidden print:block text-center pb-4 mb-4 border-b border-slate-300">
        <h1 className="text-xl font-bold">የብርብር ከተማ ቃለ ሕይወት ቤተክርስቲያን</h1>
        <h2 className="text-base font-semibold">የልጆች አገልግሎት ዘርፍ - የትምህርት ዓይነቶች እና የክፍሎች ምደባ</h2>
        <div className="flex justify-between text-xs mt-2 font-medium">
          <span>ጠቅላላ ትምህርቶች፦ {subjects.length}</span>
        </div>
      </div>

      {/* Top Controls Card */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm print:hidden">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-5 mb-5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">
                የትምህርት ዓይነቶች እና የክፍሎች ምደባ
              </h3>
              <p className="text-xs text-slate-500">
                የሰንበት ት/ቤት ትምህርቶች መዝገብ እና ለክፍሎች የመመደቢያ ሰሌዳ
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-semibold">
              <button
                type="button"
                onClick={() => setActiveSubTab('subjects')}
                className={`px-3 py-1.5 rounded-lg transition ${
                  activeSubTab === 'subjects' ? 'bg-white text-blue-900 shadow-sm' : 'text-slate-600'
                }`}
              >
                የትምህርት ዓይነቶች
              </button>
              <button
                type="button"
                onClick={() => setActiveSubTab('byClass')}
                className={`px-3 py-1.5 rounded-lg transition ${
                  activeSubTab === 'byClass' ? 'bg-white text-blue-900 shadow-sm' : 'text-slate-600'
                }`}
              >
                በክፍል ደረጃ ምረጥ
              </button>
            </div>

            <button
              onClick={() => window.print()}
              className="bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold px-3 py-2 rounded-xl transition flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              ማተሚያ (Print / PDF)
            </button>

            <button
              onClick={handleExportCSV}
              className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-3 py-2 rounded-xl transition flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              Excel አውርድ
            </button>

            {isAdmin && (
              <>
                <label className="bg-teal-700 hover:bg-teal-600 text-white text-xs font-semibold px-3 py-2 rounded-xl transition flex items-center gap-1.5 shadow-sm cursor-pointer">
                  <Upload className="w-3.5 h-3.5" />
                  Excel ጫን
                  <input
                    type="file"
                    accept=".xlsx,.xls,.csv,.txt"
                    onChange={handleImportCSV}
                    className="hidden"
                  />
                </label>

                <button
                  onClick={() => setShowAddModal(true)}
                  className="bg-blue-800 hover:bg-blue-700 text-white text-xs font-semibold px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" />
                  + አዲስ ትምህርት
                </button>
              </>
            )}
          </div>
        </div>

        {/* Tab 1: Subjects List with Quick Class Assignment */}
        {activeSubTab === 'subjects' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {subjects.map((sub, idx) => {
                const assignedCount = getAssignedCount(sub);
                return (
                  <div
                    key={idx}
                    className="flex flex-col justify-between p-4 rounded-2xl bg-slate-50 border border-slate-200/90 hover:bg-blue-50/40 hover:border-blue-300 transition"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <span className="w-7 h-7 rounded-full bg-blue-100 text-blue-900 font-bold text-xs flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <div>
                          <h4 className="font-bold text-slate-900 text-sm">{sub}</h4>
                          <span className="text-[11px] text-slate-500 font-medium">
                            የተመደበባቸው ክፍሎች፦{' '}
                            <strong className="text-teal-700 font-bold">{assignedCount}</strong>
                          </span>
                        </div>
                      </div>

                      {isAdmin && (
                        <button
                          onClick={() => {
                            if (confirm(`"${sub}" የሚለውን ትምህርት መሰረዝ ይፈልጋሉ?`)) {
                              onDeleteSubject(idx);
                            }
                          }}
                          className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-white transition"
                          title="ትምህርት ሰርዝ"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    <div className="mt-3 pt-3 border-t border-slate-200/60 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => setAssigningSubject(sub)}
                        className="text-xs font-semibold bg-teal-50 text-teal-800 hover:bg-teal-100 px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 border border-teal-200"
                      >
                        <Layers className="w-3.5 h-3.5" />
                        ለክፍሎች መድብ ({assignedCount})
                      </button>

                      <span className="text-[11px] text-slate-400 italic">
                        {assignedCount === 0 ? 'ገና አልተመደበም' : `${assignedCount} ክፍሎች`}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tab 2: By Class View - Easily check off which subjects a class takes */}
        {activeSubTab === 'byClass' && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
              <label className="text-xs font-bold text-slate-700">ክፍል ይምረጡ፦</label>
              <select
                value={selectedClassForView}
                onChange={(e) => setSelectedClassForView(e.target.value)}
                className="bg-white border border-slate-300 text-slate-800 text-xs font-semibold rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                {classList.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <span className="text-xs text-slate-500">
                ለዚህ ክፍል የሚሰጡ ትምህርቶችን ምልክት (Check) ያድርጉ
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              {subjects.map((sub, i) => {
                const isChecked = (classSubjects[selectedClassForView] || []).includes(sub);
                return (
                  <label
                    key={i}
                    onClick={() => isAdmin && toggleSubjectForClass(selectedClassForView, sub)}
                    className={`flex items-center justify-between p-3.5 rounded-xl border transition cursor-pointer ${
                      isChecked
                        ? 'bg-teal-50/80 border-teal-300 text-teal-900 font-bold'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      {isChecked ? (
                        <CheckSquare className="w-5 h-5 text-teal-700" />
                      ) : (
                        <Square className="w-5 h-5 text-slate-400" />
                      )}
                      <span className="text-xs font-medium">{sub}</span>
                    </div>

                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        isChecked ? 'bg-teal-200/80 text-teal-800' : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {isChecked ? 'የተመደበ' : 'ያልተመደበ'}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Modal to Assign Selected Subject across All/Selected Classes */}
      {assigningSubject && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] flex flex-col">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3 mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-teal-600" />
                  "{assigningSubject}" ለክፍሎች መመደቢያ
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  ይህንን ትምህርት የሚወስዱ የክፍል ደረጃዎችን ይምረጡ
                </p>
              </div>
              <button
                onClick={() => setAssigningSubject(null)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {/* Quick Presets */}
            {isAdmin && (
              <div className="flex flex-wrap gap-1.5 pb-3 mb-3 border-b border-slate-100 text-xs">
                <span className="font-semibold text-slate-500 self-center mr-1">ፈጣን ምርጫ፦</span>
                <button
                  type="button"
                  onClick={() => handleAssignPreset(assigningSubject, classList)}
                  className="bg-blue-50 text-blue-800 hover:bg-blue-100 px-2.5 py-1 rounded-lg font-medium border border-blue-200"
                >
                  ለሁሉም ክፍሎች (25)
                </button>
                <button
                  type="button"
                  onClick={() =>
                    handleAssignPreset(
                      assigningSubject,
                      classList.filter((c) => c.includes('1ኛ') || c.includes('2ኛ') || c.includes('3ኛ') || c.includes('4ኛ'))
                    )
                  }
                  className="bg-teal-50 text-teal-800 hover:bg-teal-100 px-2.5 py-1 rounded-lg font-medium border border-teal-200"
                >
                  ለ1ኛ - 4ኛ ብቻ
                </button>
                <button
                  type="button"
                  onClick={() =>
                    handleAssignPreset(
                      assigningSubject,
                      classList.filter((c) => c.includes('5ኛ') || c.includes('6ኛ') || c.includes('7ኛ') || c.includes('8ኛ'))
                    )
                  }
                  className="bg-indigo-50 text-indigo-800 hover:bg-indigo-100 px-2.5 py-1 rounded-lg font-medium border border-indigo-200"
                >
                  ለ5ኛ - 8ኛ ብቻ
                </button>
                <button
                  type="button"
                  onClick={() =>
                    handleAssignPreset(
                      assigningSubject,
                      classList.filter((c) => c.includes('9ኛ') || c.includes('10ኛ') || c.includes('11ኛ') || c.includes('12ኛ'))
                    )
                  }
                  className="bg-amber-50 text-amber-800 hover:bg-amber-100 px-2.5 py-1 rounded-lg font-medium border border-amber-200"
                >
                  ለ9ኛ - 12ኛ ብቻ
                </button>
                <button
                  type="button"
                  onClick={() => handleRemoveSubjectFromAll(assigningSubject)}
                  className="bg-rose-50 text-rose-700 hover:bg-rose-100 px-2.5 py-1 rounded-lg font-medium border border-rose-200"
                >
                  ሁሉንም አንሳ
                </button>
              </div>
            )}

            {/* Checkboxes List */}
            <div className="overflow-y-auto flex-1 pr-1 grid grid-cols-2 sm:grid-cols-3 gap-2 py-2">
              {classList.map((cName) => {
                const isSelected = (classSubjects[cName] || []).includes(assigningSubject);
                return (
                  <button
                    key={cName}
                    type="button"
                    disabled={!isAdmin}
                    onClick={() => toggleSubjectForClass(cName, assigningSubject)}
                    className={`flex items-center gap-2 p-2.5 rounded-xl text-xs font-semibold text-left transition border ${
                      isSelected
                        ? 'bg-teal-600 text-white border-teal-700 shadow-sm'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {isSelected ? (
                      <CheckCircle2 className="w-4 h-4 shrink-0 text-white" />
                    ) : (
                      <Square className="w-4 h-4 shrink-0 text-slate-400" />
                    )}
                    <span className="truncate">{cName}</span>
                  </button>
                );
              })}
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setAssigningSubject(null)}
                className="px-5 py-2 text-xs bg-blue-900 hover:bg-blue-800 text-white rounded-xl font-bold shadow"
              >
                ተጠናቋል
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Subject Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900 mb-2">አዲስ ትምህርት ጨምር</h3>
            <form onSubmit={handleAddSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  የትምህርቱ ስም፦
                </label>
                <input
                  type="text"
                  value={newSubject}
                  onChange={(e) => setNewSubject(e.target.value)}
                  placeholder="ምሳሌ፡ የሐዋርያት ሥራ ጥናት"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-600"
                  autoFocus
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-xl font-medium"
                >
                  ሰርዝ
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs bg-blue-800 hover:bg-blue-700 text-white rounded-xl font-semibold shadow"
                >
                  ጨምር
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

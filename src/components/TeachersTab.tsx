import React, { useState, useMemo } from 'react';
import {
  UserCheck,
  UserPlus,
  Trash2,
  Search,
  KeyRound,
  Eye,
  EyeOff,
  ArrowUpDown,
  ChevronUp,
  ChevronDown,
  BookOpen,
  Printer,
  Download,
  Upload
} from 'lucide-react';
import { Teacher, Role } from '../types';
import { downloadCSV, readCSVFile } from '../utils/csv';

interface TeachersTabProps {
  teachers: Teacher[];
  classList: string[];
  subjects: string[];
  currentUserRole: Role | null;
  onUpdateTeacher: (teacher: Teacher) => void;
  onAddTeacher: (teacher: Omit<Teacher, 'id'>) => void;
  onDeleteTeacher: (id: number) => void;
  onReorderTeachers?: (teachers: Teacher[]) => void;
}

export const TeachersTab: React.FC<TeachersTabProps> = ({
  teachers,
  classList,
  subjects,
  currentUserRole,
  onUpdateTeacher,
  onAddTeacher,
  onDeleteTeacher,
  onReorderTeachers
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPins, setShowPins] = useState(false);
  const [sortBy, setSortBy] = useState<'class' | 'name' | 'id'>('class');

  // Form states
  const [name, setName] = useState('');
  const [assignedClass, setAssignedClass] = useState(classList[0]);
  const [assignedSubject, setAssignedSubject] = useState(subjects[0] || 'አጠቃላይ');
  const [pin, setPin] = useState('');

  const isAdmin = currentUserRole === 'admin';

  // Sort teachers in orderly sequence
  const sortedTeachers = useMemo(() => {
    const list = [...teachers];
    if (sortBy === 'class') {
      return list.sort((a, b) => {
        const indexA = classList.indexOf(a.assignedClass);
        const indexB = classList.indexOf(b.assignedClass);
        const safeA = indexA === -1 ? 999 : indexA;
        const safeB = indexB === -1 ? 999 : indexB;
        if (safeA !== safeB) return safeA - safeB;
        return a.name.localeCompare(b.name, 'am');
      });
    } else if (sortBy === 'name') {
      return list.sort((a, b) => a.name.localeCompare(b.name, 'am'));
    } else {
      return list.sort((a, b) => (a.order ?? a.id) - (b.order ?? b.id));
    }
  }, [teachers, sortBy, classList]);

  const filteredTeachers = sortedTeachers.filter((t) =>
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.assignedClass.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (t.assignedSubject && t.assignedSubject.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleNameBlur = (teacher: Teacher, newName: string) => {
    if (newName.trim() && newName !== teacher.name) {
      onUpdateTeacher({ ...teacher, name: newName.trim() });
    }
  };

  const handleClassChange = (teacher: Teacher, newClass: string) => {
    onUpdateTeacher({ ...teacher, assignedClass: newClass });
  };

  const handleSubjectChange = (teacher: Teacher, newSubject: string) => {
    onUpdateTeacher({ ...teacher, assignedSubject: newSubject });
  };

  const handlePinChange = (teacher: Teacher, newPin: string) => {
    onUpdateTeacher({ ...teacher, pin: newPin.trim() });
  };

  const handleMove = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= sortedTeachers.length) return;

    const updated = [...sortedTeachers];
    const [moved] = updated.splice(index, 1);
    updated.splice(targetIndex, 0, moved);

    // Assign explicit order indices
    const withOrder = updated.map((t, idx) => ({ ...t, order: idx + 1 }));
    if (onReorderTeachers) {
      onReorderTeachers(withOrder);
    } else {
      withOrder.forEach((t) => onUpdateTeacher(t));
    }
    setSortBy('id'); // Switch to custom sequence view
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('እባክዎን የመምህሩን ሙሉ ስም ያስገቡ!');
      return;
    }
    const finalPin = pin.trim() || Math.floor(1000 + Math.random() * 9000).toString();
    onAddTeacher({
      name: name.trim(),
      assignedClass,
      assignedSubject,
      pin: finalPin,
      order: teachers.length + 1
    });

    setName('');
    setPin('');
    setShowAddModal(false);
  };

  const handleExportCSV = () => {
    let csv = '\uFEFFተ.ቁ,የመምህሩ ሙሉ ስም,የተመደበበት ክፍል,የተመደበበት ትምህርት,ስልክ ቁጥር' + (isAdmin ? ',የግል PIN\n' : '\n');
    filteredTeachers.forEach((t, idx) => {
      csv += `${idx + 1},"${t.name}","${t.assignedClass}","${t.assignedSubject || 'አጠቃላይ'}","${t.phone || ''}"` + (isAdmin ? `,"${t.pin}"\n` : '\n');
    });
    downloadCSV(csv, 'የመምህራን_ዝርዝር_መዝገብ.csv');
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
      const startIdx = (rows[0][0]?.includes('ተ.ቁ') || rows[0][1]?.includes('ስም')) ? 1 : 0;

      for (let i = startIdx; i < rows.length; i++) {
        const cols = rows[i];
        if (!cols || cols.length < 2) continue;

        const nameVal = cols[1] || cols[0] || '';
        const classVal = cols[2] || classList[0];
        const subjectVal = cols[3] || 'አጠቃላይ';
        const phoneVal = cols[4] || '';
        const pinVal = cols[5] || Math.floor(1000 + Math.random() * 9000).toString();

        if (nameVal.trim()) {
          onAddTeacher({
            name: nameVal.trim(),
            assignedClass: classVal.trim(),
            assignedSubject: subjectVal.trim(),
            phone: phoneVal.trim(),
            pin: pinVal.trim(),
            order: teachers.length + count + 1
          });
          count++;
        }
      }

      alert(`✓ ${count} መምህራን ከኤክሴል/CSV በተሳካ ሁኔታ ተጭነዋል!`);
    } catch {
      alert('ፋይሉን ማንበብ አልተሳካም።');
    }
    e.target.value = '';
  };

  return (
    <div className="space-y-6">
      {/* Printable Sheet Header */}
      <div className="hidden print:block text-center pb-4 mb-4 border-b border-slate-300">
        <h1 className="text-xl font-bold">የብርብር ከተማ ቃለ ሕይወት ቤተክርስቲያን</h1>
        <h2 className="text-base font-semibold">የልጆች አገልግሎት ዘርፍ - የመምህራን መዝገብና ምደባ</h2>
        <div className="flex justify-between text-xs mt-2 font-medium">
          <span>ጠቅላላ መምህራን፦ {filteredTeachers.length}</span>
        </div>
      </div>

      {/* Controls Header */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm print:hidden">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-teal-700" />
              የመምህራን ዝርዝር፣ የተመደቡበት ክፍል፣ ትምህርት እና የግል PIN
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              ጠቅላላ መምህራን፦ <strong className="text-teal-900 font-bold">{teachers.length}</strong> | 
              በቅደም ተከተል የተደራጁ
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Sorting Sequence Selector */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs">
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-500" />
              <span className="font-semibold text-slate-600">ቅደም ተከተል፦</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-transparent font-bold text-slate-800 focus:outline-none cursor-pointer"
              >
                <option value="class">በክፍል ደረጃ (ማቆያ - 12ኛ)</option>
                <option value="name">በመምህር ስም (ሀ - ፐ)</option>
                <option value="id">በተራ ቁጥር / በብጁ</option>
              </select>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="መምህር / ክፍል / ትምህርት..."
                className="pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-600 w-48"
              />
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
                  type="button"
                  onClick={() => setShowPins(!showPins)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold px-3 py-2 rounded-xl transition flex items-center gap-1.5"
                >
                  {showPins ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  {showPins ? 'PIN ደብቅ' : 'PIN አሳይ'}
                </button>

                <button
                  onClick={() => setShowAddModal(true)}
                  className="bg-teal-700 hover:bg-teal-600 text-white text-xs font-semibold px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 shadow-sm"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  + አዲስ መምህር ጨምር
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Teachers Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="bg-slate-100/90 text-slate-700 font-bold border-b border-slate-200 uppercase tracking-wider text-center">
                <th className="py-3 px-2 border-r border-slate-200 w-12">ተ.ቁ</th>
                <th className="py-3 px-4 border-r border-slate-200 text-left min-w-[170px]">
                  የመምህር ስም
                </th>
                <th className="py-3 px-4 border-r border-slate-200 min-w-[150px]">
                  የተመደበበት ክፍል
                </th>
                <th className="py-3 px-4 border-r border-slate-200 min-w-[170px]">
                  የሚያስተምሩት የትምህርት ዓይነት
                </th>
                <th className="py-3 px-3 border-r border-slate-200 w-28">የግል PIN</th>
                {isAdmin && <th className="py-3 px-2 print:hidden w-28">ቅደም ተከተል / ተግባር</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-center">
              {filteredTeachers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    ምንም መምህር አልተገኘም።
                  </td>
                </tr>
              ) : (
                filteredTeachers.map((t, idx) => (
                  <tr key={`teach_${t.id || 't'}_${idx}`} className="hover:bg-slate-50 transition">
                    <td className="py-2.5 px-2 border-r border-slate-200 text-slate-500 font-medium">
                      {idx + 1}
                    </td>

                    {/* Teacher Name */}
                    <td className="py-2.5 px-4 border-r border-slate-200 text-left font-bold text-slate-900">
                      {isAdmin ? (
                        <input
                          type="text"
                          defaultValue={t.name}
                          onBlur={(e) => handleNameBlur(t, e.target.value)}
                          className="w-full bg-transparent border-b border-transparent hover:border-slate-300 focus:border-teal-600 focus:bg-white px-1 py-0.5 rounded text-xs outline-none"
                        />
                      ) : (
                        <span>{t.name}</span>
                      )}
                    </td>

                    {/* Assigned Class */}
                    <td className="py-2.5 px-4 border-r border-slate-200">
                      {isAdmin ? (
                        <select
                          value={t.assignedClass}
                          onChange={(e) => handleClassChange(t, e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-teal-600"
                        >
                          {classList.map((c) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className="font-semibold text-slate-800">{t.assignedClass}</span>
                      )}
                    </td>

                    {/* Assigned Subject */}
                    <td className="py-2.5 px-4 border-r border-slate-200">
                      {isAdmin ? (
                        <select
                          value={t.assignedSubject || 'አጠቃላይ'}
                          onChange={(e) => handleSubjectChange(t, e.target.value)}
                          className="w-full bg-teal-50/50 border border-teal-200 text-teal-900 rounded-lg px-2.5 py-1 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-teal-600"
                        >
                          <option value="አጠቃላይ">አጠቃላይ / ሁሉም</option>
                          {subjects.map((sub) => (
                            <option key={sub} value={sub}>
                              {sub}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-teal-800 font-medium bg-teal-50 px-2 py-0.5 rounded-md">
                          <BookOpen className="w-3 h-3 text-teal-600" />
                          {t.assignedSubject || 'አጠቃላይ'}
                        </span>
                      )}
                    </td>

                    {/* PIN */}
                    <td className="py-2.5 px-3 border-r border-slate-200 font-mono">
                      {isAdmin ? (
                        <input
                          type={showPins ? 'text' : 'password'}
                          value={t.pin}
                          onChange={(e) => handlePinChange(t, e.target.value)}
                          className="w-20 text-center bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs font-mono font-bold focus:outline-none focus:ring-1 focus:ring-teal-600"
                        />
                      ) : (
                        <span className="text-slate-400">••••</span>
                      )}
                    </td>

                    {/* Order Controls & Actions */}
                    {isAdmin && (
                      <td className="py-2 px-2 print:hidden">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleMove(idx, 'up')}
                            disabled={idx === 0}
                            className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent"
                            title="ወደ ላይ ውሰድ"
                          >
                            <ChevronUp className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMove(idx, 'down')}
                            disabled={idx === filteredTeachers.length - 1}
                            className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent"
                            title="ወደ ታች አውርድ"
                          >
                            <ChevronDown className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => {
                              if (confirm(`${t.name} የተባሉትን መምህር መሰረዝ ይፈልጋሉ?`)) {
                                onDeleteTeacher(t.id);
                              }
                            }}
                            className="text-rose-600 hover:text-rose-800 p-1 rounded hover:bg-rose-50 transition ml-1"
                            title="መምህር ሰርዝ"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Teacher Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900 mb-1">አዲስ መምህር መዝግብ</h3>
            <p className="text-xs text-slate-500 mb-4">የመምህር መረጃ፣ ክፍል፣ ትምህርት እና የግል PIN</p>

            <form onSubmit={handleAddSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  የመምህሩ ሙሉ ስም፦
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="ሙሉ ስም ያስገቡ"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-teal-600"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  የሚመደቡበት ክፍል፦
                </label>
                <select
                  value={assignedClass}
                  onChange={(e) => setAssignedClass(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-teal-600 bg-white"
                >
                  {classList.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  የሚያስተምሩት የትምህርት ዓይነት፦
                </label>
                <select
                  value={assignedSubject}
                  onChange={(e) => setAssignedSubject(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-teal-600 bg-white"
                >
                  <option value="አጠቃላይ">አጠቃላይ / ሁሉም</option>
                  {subjects.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  የግል PIN (ባዶ ከተተወ በራሱ ይመረጣል)፦
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    placeholder="ምሳሌ፡ 2034"
                    className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-teal-600 font-mono"
                  />
                </div>
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
                  className="px-4 py-2 text-xs bg-teal-700 hover:bg-teal-600 text-white rounded-xl font-semibold shadow"
                >
                  መዝግብ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

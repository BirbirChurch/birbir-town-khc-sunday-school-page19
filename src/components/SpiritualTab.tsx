import React, { useState } from 'react';
import { BookOpen, UserPlus, FolderPlus, Trash2, Download, Upload, Printer } from 'lucide-react';
import { SpiritualMember, Role } from '../types';
import { downloadCSV, readCSVFile } from '../utils/csv';

interface SpiritualTabProps {
  groups: string[];
  members: SpiritualMember[];
  onAddMember: (member: Omit<SpiritualMember, 'id'>) => void;
  onAddMembersBatch?: (members: Omit<SpiritualMember, 'id'>[]) => void;
  onDeleteMember: (id: number) => void;
  onAddGroup: (groupName: string) => void;
  currentUserRole: Role | null;
}

export const SpiritualTab: React.FC<SpiritualTabProps> = ({
  groups,
  members,
  onAddMember,
  onAddMembersBatch,
  onDeleteMember,
  onAddGroup,
  currentUserRole
}) => {
  const [selectedGroup, setSelectedGroup] = useState<string>(groups[0] || 'የምስራች ክለብ');
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [showGroupModal, setShowGroupModal] = useState(false);

  // Form states
  const [name, setName] = useState('');
  const [age, setAge] = useState('11');
  const [gender, setGender] = useState('ወ');
  const [newGroupName, setNewGroupName] = useState('');

  const filteredMembers = members.filter((m) => m.group === selectedGroup);

  const handleAddMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('እባክዎን የተማሪውን ሙሉ ስም ያስገቡ!');
      return;
    }
    onAddMember({
      name: name.trim(),
      age: age.trim() || '11',
      gender,
      group: selectedGroup
    });
    setName('');
    setAge('11');
    setShowMemberModal(false);
  };

  const handleAddGroupSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim()) {
      alert('እባክዎ የትምህርት ቡድኑን ስም ያስገቡ!');
      return;
    }
    onAddGroup(newGroupName.trim());
    setSelectedGroup(newGroupName.trim());
    setNewGroupName('');
    setShowGroupModal(false);
  };

  const handleExportCSV = () => {
    let csv = '\uFEFFተ.ቁ,ሙሉ ስም,ዕድሜ,ፆታ,የትምህርት ቡድን\n';
    filteredMembers.forEach((m, idx) => {
      csv += `${idx + 1},"${m.name}",${m.age},${m.gender},"${m.group}"\n`;
    });
    downloadCSV(csv, `${selectedGroup}_ተማሪዎች_ዝርዝር.csv`);
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

      const startIdx = (rows[0][0]?.includes('ተ.ቁ') || rows[0][1]?.includes('ስም')) ? 1 : 0;
      const membersToImport: Omit<SpiritualMember, 'id'>[] = [];

      for (let i = startIdx; i < rows.length; i++) {
        const cols = rows[i];
        if (!cols || cols.length < 2) continue;

        const nameVal = cols[1] || cols[0] || '';
        const ageVal = cols[2] || '11';
        const genderVal = cols[3] === 'ሴ' || cols[3]?.toLowerCase() === 'f' ? 'ሴ' : 'ወ';
        const groupVal = cols[4] || selectedGroup;

        if (nameVal.trim()) {
          membersToImport.push({
            name: nameVal.trim(),
            age: ageVal,
            gender: genderVal,
            group: groupVal
          });
        }
      }

      if (membersToImport.length > 0) {
        if (onAddMembersBatch) {
          onAddMembersBatch(membersToImport);
        } else {
          membersToImport.forEach((m) => onAddMember(m));
        }
      }

      alert(`✓ ${membersToImport.length} መንፈሳዊ ትምህርት ተማሪዎች ከኤክሴል/CSV በተሳካ ሁኔታ ተጭነዋል!`);
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
        <h2 className="text-base font-semibold">የልጆች አገልግሎት ዘርፍ - መንፈሳዊ ትምህርት ቡድኖች ተማሪዎች መዝገብ</h2>
        <div className="flex justify-between text-xs mt-2 font-medium">
          <span>ትምህርት፦ {selectedGroup}</span>
          <span>ጠቅላላ ተማሪዎች፦ {filteredMembers.length}</span>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm print:hidden">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <BookOpen className="w-5 h-5 text-teal-600" />
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">
                የትምህርት ቡድን ይምረጡ፦
              </label>
              <select
                value={selectedGroup}
                onChange={(e) => setSelectedGroup(e.target.value)}
                className="bg-slate-50 border border-slate-300 text-slate-800 text-sm font-semibold rounded-xl px-3.5 py-2 focus:outline-none focus:ring-2 focus:ring-teal-600"
              >
                {groups.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </div>
            <div className="pt-5">
              <span className="px-3 py-1.5 bg-teal-50 border border-teal-200 text-teal-800 text-xs font-bold rounded-xl">
                የተማሪዎች ብዛት፦ {filteredMembers.length}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowMemberModal(true)}
              className="bg-teal-700 hover:bg-teal-600 text-white text-xs font-semibold px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 shadow-sm"
            >
              <UserPlus className="w-3.5 h-3.5" />
              + አዲስ ተማሪ/አባል አስገባ
            </button>

            {currentUserRole === 'admin' && (
              <button
                onClick={() => setShowGroupModal(true)}
                className="bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 shadow-sm"
              >
                <FolderPlus className="w-3.5 h-3.5" />
                + አዲስ ትምህርት ፍጠር
              </button>
            )}

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
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden print:border-none print:shadow-none print:overflow-visible">
        <div className="overflow-x-auto print:overflow-visible">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="bg-slate-100/90 text-slate-700 font-bold border-b border-slate-200 uppercase tracking-wider text-center">
                <th className="py-3 px-3 border-r border-slate-200 w-12">ተ.ቁ</th>
                <th className="py-3 px-4 border-r border-slate-200 text-left">ስም</th>
                <th className="py-3 px-3 border-r border-slate-200 w-16">ዕድሜ</th>
                <th className="py-3 px-3 border-r border-slate-200 w-16">ፆታ</th>
                <th className="py-3 px-4 border-r border-slate-200">የትምህርት ቡድን</th>
                <th className="py-3 px-3 print:hidden w-16">ተግባር</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-center">
              {filteredMembers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    በዚህ የትምህርት ቡድን ውስጥ እስካሁን የተመዘገበ ተማሪ የለም።
                  </td>
                </tr>
              ) : (
                filteredMembers.map((m, idx) => (
                  <tr key={`spir_${m.id || 'm'}_${idx}`} className="hover:bg-slate-50 transition">
                    <td className="py-2.5 px-3 border-r border-slate-200 text-slate-500 font-medium">
                      {idx + 1}
                    </td>
                    <td className="py-2.5 px-4 border-r border-slate-200 text-left font-bold text-slate-900">
                      {m.name}
                    </td>
                    <td className="py-2.5 px-3 border-r border-slate-200">{m.age}</td>
                    <td className="py-2.5 px-3 border-r border-slate-200">
                      <span
                        className={`font-semibold ${
                          m.gender === 'ወ'
                            ? 'text-blue-600'
                            : m.gender === 'ሴ'
                            ? 'text-rose-600'
                            : 'text-slate-400'
                        }`}
                      >
                        {m.gender || '-'}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 border-r border-slate-200 font-semibold text-teal-800">
                      {m.group}
                    </td>
                    <td className="py-2.5 px-3 print:hidden">
                      <button
                        onClick={() => {
                          if (confirm(`${m.name} የተባለውን ተማሪ መሰረዝ ይፈልጋሉ?`)) {
                            onDeleteMember(m.id);
                          }
                        }}
                        className="text-rose-600 hover:text-rose-800 p-1 rounded hover:bg-rose-50 transition"
                        title="ተማሪ ሰርዝ"
                      >
                        <Trash2 className="w-4 h-4 mx-auto" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Member Modal */}
      {showMemberModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900 mb-1">አዲስ ተማሪ አስገባ</h3>
            <p className="text-xs text-slate-500 mb-4">ትምህርት፦ {selectedGroup}</p>

            <form onSubmit={handleAddMember} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  የተማሪው ሙሉ ስም፦
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

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    ዕድሜ፦
                  </label>
                  <select
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-teal-600 bg-white font-bold cursor-pointer"
                  >
                    <option value="">- ይምረጡ -</option>
                    {Array.from({ length: 14 }, (_, i) => i + 4).map((a) => (
                      <option key={`spirit_age_opt_${a}`} value={String(a)}>
                        {a} ዓመት
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    ፆታ፦
                  </label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-teal-600 bg-white"
                  >
                    <option value="ወ">ወንድ (ወ)</option>
                    <option value="ሴ">ሴት (ሴ)</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowMemberModal(false)}
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

      {/* Add Group Modal */}
      {showGroupModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900 mb-2">አዲስ መንፈሳዊ ትምህርት ፍጠር</h3>
            <form onSubmit={handleAddGroupSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  የትምህርቱ / የክለቡ ስም፦
                </label>
                <input
                  type="text"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  placeholder="ምሳሌ፡ የመጽሐፍ ቅዱስ ዕውቀት ክበብ"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
                  autoFocus
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowGroupModal(false)}
                  className="px-4 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-xl font-medium"
                >
                  ሰርዝ
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-semibold shadow"
                >
                  ፍጠር
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

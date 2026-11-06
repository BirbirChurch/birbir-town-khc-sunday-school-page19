import React, { useState } from 'react';
import { Music, UserPlus, FolderPlus, Trash2, Download, Upload, Printer } from 'lucide-react';
import { ChoirMember, Role } from '../types';
import { downloadCSV, readCSVFile } from '../utils/csv';

interface ChoirTabProps {
  groups: string[];
  members: ChoirMember[];
  onAddMember: (member: Omit<ChoirMember, 'id'>) => void;
  onAddMembersBatch?: (members: Omit<ChoirMember, 'id'>[]) => void;
  onDeleteMember: (id: number) => void;
  onAddGroup: (groupName: string) => void;
  currentUserRole: Role | null;
}

export const ChoirTab: React.FC<ChoirTabProps> = ({
  groups,
  members,
  onAddMember,
  onAddMembersBatch,
  onDeleteMember,
  onAddGroup,
  currentUserRole
}) => {
  const [selectedGroup, setSelectedGroup] = useState<string>(groups[0] || 'ሀ መዘምራን');
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [showGroupModal, setShowGroupModal] = useState(false);

  // Form states
  const [name, setName] = useState('');
  const [age, setAge] = useState('10');
  const [gender, setGender] = useState('ሴ');
  const [phone, setPhone] = useState('');
  const [newGroupName, setNewGroupName] = useState('');

  const filteredMembers = members.filter((m) => m.group === selectedGroup);

  const handleAddMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('እባክዎን የአባሉን ሙሉ ስም ያስገቡ!');
      return;
    }
    onAddMember({
      name: name.trim(),
      age: age.trim() || '10',
      gender,
      group: selectedGroup,
      phone: phone.trim()
    });
    setName('');
    setAge('10');
    setPhone('');
    setShowMemberModal(false);
  };

  const handleAddGroupSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim()) {
      alert('እባክዎ የቡድኑን ስም ያስገቡ!');
      return;
    }
    onAddGroup(newGroupName.trim());
    setSelectedGroup(newGroupName.trim());
    setNewGroupName('');
    setShowGroupModal(false);
  };

  const handleExportCSV = () => {
    let csv = '\uFEFFተ.ቁ,ሙሉ ስም,ዕድሜ,ፆታ,ቡድን,ስልክ ቁጥር\n';
    filteredMembers.forEach((m, idx) => {
      csv += `${idx + 1},"${m.name}",${m.age},${m.gender},"${m.group}","${m.phone || ''}"\n`;
    });
    downloadCSV(csv, `${selectedGroup}_አባላት_ዝርዝር.csv`);
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
      const membersToImport: Omit<ChoirMember, 'id'>[] = [];

      for (let i = startIdx; i < rows.length; i++) {
        const cols = rows[i];
        if (!cols || cols.length < 2) continue;

        const nameVal = cols[1] || cols[0] || '';
        const ageVal = cols[2] || '10';
        const genderVal = cols[3] === 'ሴ' || cols[3]?.toLowerCase() === 'f' ? 'ሴ' : 'ወ';
        const groupVal = cols[4] || selectedGroup;
        const phoneVal = cols[5] || '';

        if (nameVal.trim()) {
          membersToImport.push({
            name: nameVal.trim(),
            age: ageVal,
            gender: genderVal,
            group: groupVal,
            phone: phoneVal
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

      alert(`✓ ${membersToImport.length} የመዘምራን አባላት ከኤክሴል/CSV በተሳካ ሁኔታ ተጭነዋል!`);
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
        <h2 className="text-base font-semibold">የልጆች አገልግሎት ዘርፍ - የመዘምራንና ኪነ-ጥበብ አባላት ዝርዝር</h2>
        <div className="flex justify-between text-xs mt-2 font-medium">
          <span>ቡድን፦ {selectedGroup}</span>
          <span>ጠቅላላ አባላት፦ {filteredMembers.length}</span>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm print:hidden">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <Music className="w-5 h-5 text-indigo-600" />
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">
                የቡድን ዓይነት ይምረጡ፦
              </label>
              <select
                value={selectedGroup}
                onChange={(e) => setSelectedGroup(e.target.value)}
                className="bg-slate-50 border border-slate-300 text-slate-800 text-sm font-semibold rounded-xl px-3.5 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-600"
              >
                {groups.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </div>
            <div className="pt-5">
              <span className="px-3 py-1.5 bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-bold rounded-xl">
                አባላት፦ {filteredMembers.length}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowMemberModal(true)}
              className="bg-indigo-700 hover:bg-indigo-600 text-white text-xs font-semibold px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 shadow-sm"
            >
              <UserPlus className="w-3.5 h-3.5" />
              + አዲስ አባል አስገባ
            </button>

            {currentUserRole === 'admin' && (
              <button
                onClick={() => setShowGroupModal(true)}
                className="bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 shadow-sm"
              >
                <FolderPlus className="w-3.5 h-3.5" />
                + አዲስ ቡድን ፍጠር
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

      {/* Roster Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden print:border-none print:shadow-none print:overflow-visible">
        <div className="overflow-x-auto print:overflow-visible">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="bg-slate-100/90 text-slate-700 font-bold border-b border-slate-200 uppercase tracking-wider text-center">
                <th className="py-3 px-3 border-r border-slate-200 w-12">ተ.ቁ</th>
                <th className="py-3 px-4 border-r border-slate-200 text-left">ስም</th>
                <th className="py-3 px-3 border-r border-slate-200 w-16">ዕድሜ</th>
                <th className="py-3 px-3 border-r border-slate-200 w-16">ፆታ</th>
                <th className="py-3 px-4 border-r border-slate-200">ቡድን</th>
                <th className="py-3 px-4 border-r border-slate-200">ስልክ ቁጥር</th>
                <th className="py-3 px-3 print:hidden w-16">ተግባር</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-center">
              {filteredMembers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    በዚህ ቡድን ውስጥ እስካሁን የተመዘገበ አባል የለም።
                  </td>
                </tr>
              ) : (
                filteredMembers.map((m, idx) => (
                  <tr key={`choir_${m.id || 'm'}_${idx}`} className="hover:bg-slate-50 transition">
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
                    <td className="py-2.5 px-4 border-r border-slate-200 font-semibold text-indigo-700">
                      {m.group}
                    </td>
                    <td className="py-2.5 px-4 border-r border-slate-200 text-slate-600 font-mono text-[11px]">
                      {m.phone || '-'}
                    </td>
                    <td className="py-2.5 px-3 print:hidden">
                      <button
                        onClick={() => {
                          if (confirm(`${m.name} የተባለውን አባል መሰረዝ ይፈልጋሉ?`)) {
                            onDeleteMember(m.id);
                          }
                        }}
                        className="text-rose-600 hover:text-rose-800 p-1 rounded hover:bg-rose-50 transition"
                        title="አባል ሰርዝ"
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
            <h3 className="text-lg font-bold text-slate-900 mb-1">አዲስ አባል አስገባ</h3>
            <p className="text-xs text-slate-500 mb-4">ቡድን፦ {selectedGroup}</p>

            <form onSubmit={handleAddMember} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  የአባሉ ሙሉ ስም፦
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="ሙሉ ስም ያስገቡ"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-600"
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
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-600 bg-white font-bold cursor-pointer"
                  >
                    <option value="">- ይምረጡ -</option>
                    {Array.from({ length: 14 }, (_, i) => i + 4).map((a) => (
                      <option key={`choir_age_opt_${a}`} value={String(a)}>
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
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-600 bg-white"
                  >
                    <option value="ሴ">ሴት (ሴ)</option>
                    <option value="ወ">ወንድ (ወ)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  ስልክ / የወላጅ ስልክ (አማራጭ)፦
                </label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="09..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-600"
                />
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
                  className="px-4 py-2 text-xs bg-indigo-700 hover:bg-indigo-600 text-white rounded-xl font-semibold shadow"
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
            <h3 className="text-lg font-bold text-slate-900 mb-2">አዲስ የመዘምራን ቡድን ፍጠር</h3>
            <form onSubmit={handleAddGroupSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  የቡድኑ ስም፦
                </label>
                <input
                  type="text"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  placeholder="ምሳሌ፡ መዘምራን መ"
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

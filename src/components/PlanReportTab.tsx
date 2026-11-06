import React, { useState } from 'react';
import { Target, Plus, Download, Upload, Trash2, Printer, CheckCircle, BarChart3, Users } from 'lucide-react';
import { AnnualPlanItem } from '../types';
import { downloadCSV, parseCSVLine, readCSVFile } from '../utils/csv';

interface PlanReportTabProps {
  currentYear: string;
  plans: AnnualPlanItem[];
  onUpdatePlan: (plan: AnnualPlanItem) => void;
  onAddPlan: (plan: Omit<AnnualPlanItem, 'id'>) => void;
  onDeletePlan: (id: number) => void;
  onImportPlans: (plans: AnnualPlanItem[]) => void;
  onGoToAllStudents?: () => void;
  totalStudentsCount?: number;
}

export const PlanReportTab: React.FC<PlanReportTabProps> = ({
  currentYear,
  plans,
  onUpdatePlan,
  onAddPlan,
  onDeletePlan,
  onImportPlans,
  onGoToAllStudents,
  totalStudentsCount
}) => {
  const [selectedQuarter, setSelectedQuarter] = useState<'q1' | 'q2' | 'q3' | 'q4'>('q1');
  const [showAddModal, setShowAddModal] = useState(false);

  // Form states
  const [task, setTask] = useState('');
  const [unit, setUnit] = useState('በቁጥር');
  const [yearPlan, setYearPlan] = useState('12');
  const [role, setRole] = useState('አስተባባሪው');

  const quarterLabels: Record<'q1' | 'q2' | 'q3' | 'q4', string> = {
    q1: '1ኛ ሩብ ዓመት (ሐምሌ - መስከረም)',
    q2: '2ኛ ሩብ ዓመት (ጥቅምት - ታህሳስ)',
    q3: '3ኛ ሩብ ዓመት (ጥር - መጋቢት)',
    q4: '4ኛ ሩብ ዓመት (ሚያዝያ - ሰኔ)'
  };

  const planKey = `${selectedQuarter}Plan` as 'q1Plan' | 'q2Plan' | 'q3Plan' | 'q4Plan';
  const doneKey = `${selectedQuarter}Done` as 'q1Done' | 'q2Done' | 'q3Done' | 'q4Done';

  // Overall quarter completion rate
  const totalQuarterPlan = plans.reduce((sum, p) => sum + (Number(p[planKey]) || 0), 0);
  const totalQuarterDone = plans.reduce((sum, p) => sum + (Number(p[doneKey]) || 0), 0);
  const progressPercent = totalQuarterPlan > 0 ? Math.min(100, Math.round((totalQuarterDone / totalQuarterPlan) * 100)) : 0;

  const handleDoneChange = (p: AnnualPlanItem, val: string) => {
    const num = Math.max(0, parseFloat(val) || 0);
    onUpdatePlan({
      ...p,
      [doneKey]: num
    });
  };

  const handleFieldChange = (p: AnnualPlanItem, field: keyof AnnualPlanItem, val: string) => {
    onUpdatePlan({
      ...p,
      [field]: val
    });
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!task.trim()) {
      alert('እባክዎ የታቀደውን ዋና ተግባር ያስገቡ!');
      return;
    }
    const yPlanNum = parseFloat(yearPlan) || 1;
    const quarterShare = Math.round(yPlanNum / 4) || 1;

    onAddPlan({
      task: task.trim(),
      unit: unit.trim() || 'በቁጥር',
      yearPlan: yPlanNum,
      q1Plan: quarterShare,
      q2Plan: quarterShare,
      q3Plan: quarterShare,
      q4Plan: quarterShare,
      q1Done: 0,
      q2Done: 0,
      q3Done: 0,
      q4Done: 0,
      role: role.trim() || 'አስተባባሪው'
    });

    setTask('');
    setYearPlan('12');
    setShowAddModal(false);
  };

  const handleExportCSV = () => {
    let csv = `\uFEFFተ.ቁ,የታቀዱ ዋና ዋና ተግባራት,መለኪያ,የዓመት ዕቅድ,የሩብ ዕቅድ (${quarterLabels[selectedQuarter]}),ክንውን,ኃላፊነት ያለበት አካል\n`;
    plans.forEach((p, idx) => {
      csv += `${idx + 1},"${p.task}","${p.unit}",${p.yearPlan},${p[planKey]},${p[doneKey]},"${p.role}"\n`;
    });
    downloadCSV(csv, `የልጆች_አገልግሎት_${currentYear}_${selectedQuarter}_ዕቅድና_ክንውን.csv`);
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

      const imported: AnnualPlanItem[] = [];
      const startIdx = (rows[0][0]?.includes('ተ.ቁ') || rows[0][1]?.includes('ተግባር')) ? 1 : 0;

      for (let i = startIdx; i < rows.length; i++) {
        const cols = rows[i];
        if (!cols || cols.length < 2) continue;

        const taskText = cols[1] || cols[0] || `ተግባር ${i}`;
        const unitText = cols[2] || 'በቁጥር';
        const yPlan = parseFloat(cols[3]) || 1;
        const qPlan = cols[4] ? parseFloat(cols[4]) || Math.round(yPlan / 4) : Math.round(yPlan / 4);
        const qDone = cols[5] ? parseFloat(cols[5]) || 0 : 0;
        const roleText = cols[6] || 'አስተባባሪው';

        if (taskText.trim()) {
          imported.push({
            id: Date.now() + i,
            task: taskText.trim(),
            unit: unitText.trim(),
            yearPlan: yPlan,
            q1Plan: qPlan,
            q2Plan: qPlan,
            q3Plan: qPlan,
            q4Plan: qPlan,
            q1Done: selectedQuarter === 'q1' ? qDone : 0,
            q2Done: selectedQuarter === 'q2' ? qDone : 0,
            q3Done: selectedQuarter === 'q3' ? qDone : 0,
            q4Done: selectedQuarter === 'q4' ? qDone : 0,
            role: roleText.trim()
          });
        }
      }

      if (imported.length > 0) {
        onImportPlans(imported);
        alert(`✓ ${imported.length} የታቀዱ ተግባራት ከ Excel/CSV ፋይል በተሳካ ሁኔታ ተጭነዋል!`);
      }
    } catch {
      alert('ፋይሉን ማንበብ አልተቻለም። እባክዎ ትክክለኛ የኤክሴል ወይም CSV ፎርማት መሆኑን ያረጋግጡ።');
    }
    e.target.value = '';
  };

  return (
    <div className="space-y-6">
      {/* Printable Sheet Header */}
      <div className="hidden print:block text-center pb-4 mb-4 border-b border-slate-300">
        <h1 className="text-xl font-bold">የብርብር ከተማ ቃለ ሕይወት ቤተ ክርስቲያን</h1>
        <h2 className="text-base font-semibold">
          የ{currentYear} ዓ/ም የልጆች አገልግሎት ዘርፍ ዓመታዊ ዕቅድና ክንውን ሪፖርት
        </h2>
        <div className="flex justify-between text-xs mt-2 font-medium">
          <span>ወቅት፦ {quarterLabels[selectedQuarter]}</span>
          <span>ጠቅላላ የታቀዱ ተግባራት፦ {plans.length}</span>
        </div>
      </div>

      {/* Top Banner & Quarter Tabs */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm print:hidden">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
              <Target className="w-5 h-5 text-blue-700" />
              የ{currentYear} ዓ/ም የብርብር ከተማ ቃለ ሕይወት ቤተ ክርስቲያን የልጆች አገልግሎት ዘርፍ ዕቅድና ክንውን
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              የታቀዱ ዋና ዋና ተግባራት፣ የሩብ ዓመት ክንውንና ኃላፊነት ያለበት አካል መዝገብ
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {onGoToAllStudents && (
              <button
                type="button"
                onClick={onGoToAllStudents}
                className="bg-indigo-900 hover:bg-indigo-800 text-white text-xs font-bold px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 shadow cursor-pointer border border-indigo-700"
                title="ሁሉንም የተመዘገቡ ተማሪዎች ማስተር ገጽ ክፈት"
              >
                <Users className="w-3.5 h-3.5 text-amber-300" />
                <span>👥 የተመዘገቡ ተማሪዎች ማስተር ({totalStudentsCount || 0})</span>
              </button>
            )}

            <button
              onClick={() => setShowAddModal(true)}
              className="bg-blue-800 hover:bg-blue-700 text-white text-xs font-semibold px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              + አዲስ ተግባር ጨምር
            </button>

            <button
              onClick={() => window.print()}
              className="bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold px-3 py-2 rounded-xl transition flex items-center gap-1.5 shadow-sm"
            >
              <Printer className="w-3.5 h-3.5" />
              ማተሚያ
            </button>

            <button
              onClick={handleExportCSV}
              className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-3 py-2 rounded-xl transition flex items-center gap-1.5 shadow-sm"
            >
              <Download className="w-3.5 h-3.5" />
              Excel / CSV
            </button>

            <label className="bg-indigo-700 hover:bg-indigo-600 text-white text-xs font-semibold px-3 py-2 rounded-xl transition flex items-center gap-1.5 shadow-sm cursor-pointer">
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

        {/* Quarter Selection Pills & Progress */}
        <div className="mt-5 pt-5 border-t border-slate-100 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          <div className="flex flex-wrap gap-2">
            {(['q1', 'q2', 'q3', 'q4'] as const).map((q) => (
              <button
                key={q}
                onClick={() => setSelectedQuarter(q)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                  selectedQuarter === q
                    ? 'bg-blue-800 text-white shadow-md'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <span>{quarterLabels[q]}</span>
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3 bg-blue-50/60 border border-blue-200/60 px-4 py-2 rounded-xl">
            <BarChart3 className="w-4 h-4 text-blue-700 shrink-0" />
            <div className="text-xs">
              <span className="text-slate-600">የሩብ ዓመቱ ክንውን፦ </span>
              <strong className="text-blue-900 font-extrabold">{totalQuarterDone}</strong> / {totalQuarterPlan}
              <span className="ml-2 font-bold text-emerald-700">({progressPercent}%)</span>
            </div>
            <div className="w-24 bg-slate-200 h-2 rounded-full overflow-hidden shrink-0">
              <div
                className="bg-emerald-600 h-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Plan Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="bg-slate-100/90 text-slate-700 font-bold border-b border-slate-200 uppercase tracking-wider text-center">
                <th className="py-3 px-2 border-r border-slate-200 w-12">ተ.ቁ</th>
                <th className="py-3 px-4 border-r border-slate-200 min-w-[260px] text-left">
                  የታቀዱ ዋና ዋና ተግባራት
                </th>
                <th className="py-3 px-3 border-r border-slate-200 w-20">መለኪያ</th>
                <th className="py-3 px-3 border-r border-slate-200 w-24">የዓመት ዕቅድ</th>
                <th className="py-3 px-3 border-r border-slate-200 w-24 bg-blue-50/40">የሩብ ዕቅድ</th>
                <th className="py-3 px-3 border-r border-slate-200 w-24 bg-emerald-50/50 text-emerald-900">
                  ክንውን
                </th>
                <th className="py-3 px-4 border-r border-slate-200 text-left min-w-[150px]">
                  ኃላፊነት ያለበት አካል
                </th>
                <th className="py-3 px-3 print:hidden w-16">ተግባር</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-center">
              {plans.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    ምንም የታቀደ ተግባር አልተገኘም።
                  </td>
                </tr>
              ) : (
                plans.map((p, idx) => {
                  const qPlan = Number(p[planKey]) || 0;
                  const qDone = Number(p[doneKey]) || 0;
                  const isCompleted = qPlan > 0 && qDone >= qPlan;

                  return (
                    <tr
                      key={`plan_${p.id || 'p'}_${idx}`}
                      className={`hover:bg-slate-50 transition ${
                        isCompleted ? 'bg-emerald-50/20' : ''
                      }`}
                    >
                      <td className="py-2.5 px-2 border-r border-slate-200 text-slate-500 font-medium">
                        {idx + 1}
                      </td>

                      {/* Task Name */}
                      <td className="py-2.5 px-4 border-r border-slate-200 text-left font-semibold text-slate-900">
                        <input
                          type="text"
                          value={p.task}
                          onChange={(e) => handleFieldChange(p, 'task', e.target.value)}
                          className="w-full bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-600 focus:bg-white px-1 py-0.5 rounded text-xs outline-none font-medium"
                        />
                      </td>

                      {/* Unit */}
                      <td className="py-2.5 px-2 border-r border-slate-200 text-slate-700">
                        <input
                          type="text"
                          value={p.unit}
                          onChange={(e) => handleFieldChange(p, 'unit', e.target.value)}
                          className="w-16 text-center bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-600 focus:bg-white px-1 py-0.5 rounded text-xs outline-none"
                        />
                      </td>

                      {/* Year Plan */}
                      <td className="py-2.5 px-2 border-r border-slate-200 font-semibold text-slate-800">
                        <input
                          type="number"
                          value={p.yearPlan}
                          onChange={(e) => handleFieldChange(p, 'yearPlan', e.target.value)}
                          className="w-16 text-center bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-600 focus:bg-white px-1 py-0.5 rounded text-xs outline-none"
                        />
                      </td>

                      {/* Quarter Plan */}
                      <td className="py-2.5 px-2 border-r border-slate-200 bg-blue-50/20 font-bold text-blue-900">
                        <input
                          type="number"
                          value={p[planKey]}
                          onChange={(e) => handleFieldChange(p, planKey, e.target.value)}
                          className="w-16 text-center bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-600 focus:bg-white px-1 py-0.5 rounded text-xs outline-none font-bold"
                        />
                      </td>

                      {/* Quarter Done */}
                      <td className="py-2 px-2 border-r border-slate-200 bg-emerald-50/30">
                        <input
                          type="number"
                          value={p[doneKey]}
                          onChange={(e) => handleDoneChange(p, e.target.value)}
                          className="w-16 text-center py-1 rounded border border-emerald-300 focus:border-emerald-600 focus:bg-white font-extrabold text-emerald-900 bg-white"
                          min="0"
                        />
                      </td>

                      {/* Role / Responsible */}
                      <td className="py-2.5 px-4 border-r border-slate-200 text-left text-slate-700">
                        <input
                          type="text"
                          value={p.role}
                          onChange={(e) => handleFieldChange(p, 'role', e.target.value)}
                          className="w-full bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-600 focus:bg-white px-1 py-0.5 rounded text-xs outline-none"
                        />
                      </td>

                      {/* Actions */}
                      <td className="py-2.5 px-2 print:hidden">
                        <button
                          onClick={() => {
                            if (confirm(`ይህንን የታቀደ ተግባር መሰረዝ ይፈልጋሉ?`)) {
                              onDeletePlan(p.id);
                            }
                          }}
                          className="text-rose-600 hover:text-rose-800 p-1 rounded hover:bg-rose-50 transition"
                          title="ተግባር ሰርዝ"
                        >
                          <Trash2 className="w-4 h-4 mx-auto" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Official Signatures Box */}
      <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-6 flex flex-col md:flex-row justify-between gap-6 text-sm text-slate-800 shadow-sm">
        <div className="border-l-4 border-blue-800 pl-4">
          <p className="font-bold text-slate-900">ዕቅድ አዘጋጅ፦</p>
          <p className="font-semibold text-blue-900 mt-1">ወ/ዊ ገላትያ ደስታ</p>
          <p className="text-xs text-slate-500">የልጆች አገልግሎት አስተባባሪ</p>
          <p className="text-xs text-slate-400 mt-3">ፊርማ፦ _______________________</p>
        </div>

        <div className="border-l-4 border-amber-600 pl-4">
          <p className="font-bold text-slate-900">ዕቅድ አጽዳቂ፦</p>
          <p className="font-semibold text-amber-900 mt-1">መጋቢ ጉጃ ኡባ</p>
          <p className="text-xs text-slate-500">የመንፈሳዊ ዘርፍ አስተባባሪ</p>
          <p className="text-xs text-slate-400 mt-3">ፊርማ፦ _______________________</p>
        </div>
      </div>

      {/* Add Plan Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900 mb-2">አዲስ የታቀደ ተግባር ጨምር</h3>
            <form onSubmit={handleAddSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  የታቀደው ዋና ተግባር፦
                </label>
                <textarea
                  value={task}
                  onChange={(e) => setTask(e.target.value)}
                  placeholder="የተግባሩን ዝርዝር ያስገቡ..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-600 h-20"
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    መለኪያ፦
                  </label>
                  <input
                    type="text"
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    placeholder="በቁጥር / በዙር"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    የዓመት ዕቅድ (ብዛት)፦
                  </label>
                  <input
                    type="number"
                    value={yearPlan}
                    onChange={(e) => setYearPlan(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-600"
                    min="1"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  ኃላፊነት ያለበት አካል፦
                </label>
                <input
                  type="text"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  placeholder="ምሳሌ፡ አስተባባሪና ኮሚቴ"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-600"
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

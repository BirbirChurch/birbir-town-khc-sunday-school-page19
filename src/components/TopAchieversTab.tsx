import React, { useState } from 'react';
import { Award, Printer, Download, Filter, Trophy } from 'lucide-react';
import { Student } from '../types';
import { downloadCSV } from '../utils/csv';

interface TopAchieversTabProps {
  currentYear: string;
  classList: string[];
  studentsByClass: { [className: string]: Student[] };
}

export const TopAchieversTab: React.FC<TopAchieversTabProps> = ({
  currentYear,
  classList,
  studentsByClass
}) => {
  const [classFilter, setClassFilter] = useState('all');

  // Compute top 3 for each class
  const topList: {
    className: string;
    rank: number;
    name: string;
    gender: string;
    age: number | string;
    total: number;
  }[] = [];

  classList.forEach((cName) => {
    const list = studentsByClass[cName] || [];
    const withTotals = list.map((s) => ({
      ...s,
      total:
        (Number(s.m1) || 0) +
        (Number(s.m2) || 0) +
        (Number(s.m3) || 0) +
        (Number(s.m4) || 0) +
        (Number(s.m5) || 0) +
        (Number(s.m6) || 0) +
        (Number(s.m7) || 0)
    }));

    const sorted = [...withTotals]
      .filter((s) => s.total > 0)
      .sort((a, b) => b.total - a.total)
      .slice(0, 3);
    sorted.forEach((s, idx) => {
      topList.push({
        className: cName,
        rank: idx + 1,
        name: s.name,
        gender: s.gender,
        age: s.age,
        total: s.total
      });
    });
  });

  const filtered = classFilter === 'all' ? topList : topList.filter((item) => item.className === classFilter);

  const handleExportCSV = () => {
    let csv = '\uFEFFክፍል,ደረጃ,የተማሪው ስም,ፆታ,ዕድሜ,ውጤት (100)\n';
    filtered.forEach((item) => {
      csv += `"${item.className}",${item.rank}ኛ,"${item.name}",${item.gender},${item.age},${item.total}\n`;
    });
    downloadCSV(csv, `ከ1ኛ_እስከ_3ኛ_የወጡ_${currentYear}_ዓ_ም.csv`);
  };

  return (
    <div className="space-y-6">
      {/* Printable Sheet Header */}
      <div className="hidden print:block text-center pb-4 mb-4 border-b border-slate-300">
        <h1 className="text-xl font-bold">የብርብር ከተማ ቃለ ሕይወት ቤተክርስቲያን</h1>
        <h2 className="text-base font-semibold">
          የልጆች አገልግሎት ዘርፍ - ከ1ኛ እስከ 3ኛ የወጡ ተማሪዎች ክብር መዝገብ
        </h2>
        <div className="flex justify-between text-xs mt-2 font-medium">
          <span>የትምህርት ዘመን፦ {currentYear} ዓ/ም</span>
          <span>ጠቅላላ ተሸላሚዎች፦ {filtered.length} ተማሪዎች</span>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm print:hidden">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">
                ከየክፍሉ ከደረጃ 1 እስከ 3 የወጡ ተሸላሚ ተማሪዎች ዝርዝር (Top 3)
              </h3>
              <p className="text-xs text-slate-500">
                የ{currentYear} ዓ/ም የትምህርት ዘመን የላቀ ውጤት ያመጡ ተማሪዎች
              </p>
            </div>
          </div>

          {/* Info Banner clarifying Top 3 scope */}
          <div className="w-full md:w-auto bg-amber-50/90 border border-amber-200 text-amber-900 rounded-xl px-3 py-1.5 text-xs">
            💡 <strong>ማስታወሻ፦</strong> ይህ ገጽ ለሽልማት <strong>ከ1ኛ እስከ 3ኛ የወጡትን 3 ተማሪዎች</strong> ብቻ ያሳያል። የክፍሉን ሙሉ ተማሪዎች ለማየት ወይም አዲስ ተማሪዎችን ለማስገባት <strong>"ክፍሎች"</strong> ወይም <strong>"አተንዳንስ"</strong> የሚለውን ትር ይጠቀሙ።
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-400" />
              <select
                value={classFilter}
                onChange={(e) => setClassFilter(e.target.value)}
                className="bg-slate-50 border border-slate-300 text-slate-800 text-xs font-semibold rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="all">ሁሉም ክፍሎች ({classList.length})</option>
                {classList.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={() => window.print()}
              className="bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold px-3 py-2 rounded-xl transition flex items-center gap-1.5 shadow-sm"
            >
              <Printer className="w-3.5 h-3.5" />
              ማተሚያ (Print)
            </button>

            <button
              onClick={handleExportCSV}
              className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-3 py-2 rounded-xl transition flex items-center gap-1.5 shadow-sm"
            >
              <Download className="w-3.5 h-3.5" />
              Excel / CSV
            </button>
          </div>
        </div>
      </div>

      {/* Achievers Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden print:border-none print:shadow-none print:overflow-visible">
        <div className="overflow-x-auto print:overflow-visible">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="bg-slate-100/90 text-slate-700 font-bold border-b border-slate-200 uppercase tracking-wider text-center">
                <th className="py-3 px-3 border-r border-slate-200 w-12">ተ.ቁ</th>
                <th className="py-3 px-4 border-r border-slate-200 w-36">ክፍል</th>
                <th className="py-3 px-3 border-r border-slate-200 w-24">ደረጃ</th>
                <th className="py-3 px-4 border-r border-slate-200 text-left">የተማሪው ስም</th>
                <th className="py-3 px-3 border-r border-slate-200 w-16">ፆታ</th>
                <th className="py-3 px-3 border-r border-slate-200 w-16">ዕድሜ</th>
                <th className="py-3 px-4 font-extrabold text-slate-900 w-28 bg-amber-50/50">
                  ውጤት (100)
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-center">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    ምንም የተመዘገበ ውጤት አልተገኘም።
                  </td>
                </tr>
              ) : (
                filtered.map((item, idx) => (
                  <tr key={`top_${item.className}_${item.rank}_${idx}`} className="hover:bg-slate-50 transition">
                    <td className="py-2.5 px-3 border-r border-slate-200 text-slate-500 font-medium">
                      {idx + 1}
                    </td>
                    <td className="py-2.5 px-4 border-r border-slate-200 font-bold text-blue-900">
                      {item.className}
                    </td>
                    <td className="py-2.5 px-3 border-r border-slate-200">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold text-xs ${
                          item.rank === 1
                            ? 'bg-amber-100 text-amber-800 border border-amber-300'
                            : item.rank === 2
                            ? 'bg-slate-200 text-slate-800 border border-slate-300'
                            : 'bg-orange-100 text-orange-800 border border-orange-300'
                        }`}
                      >
                        <Award className="w-3.5 h-3.5" />
                        {item.rank}ኛ
                      </span>
                    </td>
                    <td className="py-2.5 px-4 border-r border-slate-200 text-left font-bold text-[13pt] text-slate-900 min-w-[200px]">
                      {item.name}
                    </td>
                    <td className="py-2.5 px-3 border-r border-slate-200">
                      <span
                        className={`font-semibold ${
                          item.gender === 'ወ'
                            ? 'text-blue-600'
                            : item.gender === 'ሴ'
                            ? 'text-rose-600'
                            : 'text-slate-400'
                        }`}
                      >
                        {item.gender || '-'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 border-r border-slate-200 text-slate-600">
                      {item.age}
                    </td>
                    <td className="py-2.5 px-4 font-black text-amber-700 bg-amber-50/20 text-sm">
                      {item.total} / 100
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Printable Signature Section */}
      <div className="hidden print:flex justify-between pt-10 text-xs font-semibold text-slate-800">
        <div>
          <p>የልጆች አገልግሎት አስተባባሪ፦ ወ/ዊ ገላትያ ደስታ</p>
          <p className="mt-2">ፊርማ፦ _________________ ቀን፦ ___________</p>
        </div>
        <div>
          <p>የመንፈሳዊ ዘርፍ አስተባባሪ፦ መጋቢ ጉጃ ኡባ</p>
          <p className="mt-2">ፊርማ፦ _________________ ቀን፦ ___________</p>
        </div>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { LogOut, Calendar, Database, Shield, User, Plus } from 'lucide-react';
import { Role } from '../types';

interface HeaderProps {
  currentYear: string;
  years: string[];
  onYearChange: (year: string) => void;
  onAddYear: (year: string) => void;
  currentUserRole: Role | null;
  loggedInTeacherName?: string;
  onLogout: () => void;
  syncStatus: 'connected' | 'saving' | 'offline' | 'error';
  onOpenSyncModal?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentYear,
  years,
  onYearChange,
  onAddYear,
  currentUserRole,
  loggedInTeacherName,
  onLogout,
  syncStatus,
  onOpenSyncModal
}) => {
  const [showAddYearModal, setShowAddYearModal] = useState(false);
  const [newYearInput, setNewYearInput] = useState('');

  const handleAddYearSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newYearInput.trim()) {
      onAddYear(newYearInput.trim());
      setNewYearInput('');
      setShowAddYearModal(false);
    }
  };

  const getRoleLabel = () => {
    if (currentUserRole === 'admin') return 'ዋና አስተባባሪ (Admin)';
    if (currentUserRole === 'leader') return 'የሰንበት ት/ቤት መሪ (Leader)';
    if (currentUserRole === 'teacher') return `መምህር፦ ${loggedInTeacherName || ''}`;
    return 'ያልገቡ';
  };

  return (
    <>
      <header className="bg-gradient-to-r from-slate-900 via-blue-950 to-blue-900 text-white shadow-lg print:hidden border-b border-blue-800/40">
        <div className="max-w-7xl mx-auto px-4 py-5 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center space-x-4 text-center sm:text-left">
              <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center shadow-inner shrink-0">
                <span className="text-2xl font-bold text-amber-300">✝</span>
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-white flex items-center gap-2 justify-center sm:justify-start">
                  የብርብር ከተማ ቃለ ሕይወት ቤተክርስቲያን
                </h1>
                <p className="text-blue-200 text-xs sm:text-sm font-medium mt-0.5">
                  የልጆች አገልግሎት ዘርፍ የውጤት፣ የመረጃና የዕቅድ ማኔጅመንት ሥርዓት
                </p>
              </div>
            </div>

            {/* Status & Sync Badge */}
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap justify-center">
              <button
                type="button"
                onClick={onOpenSyncModal}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold backdrop-blur-md transition-all hover:scale-105 cursor-pointer shadow-sm ${
                  syncStatus === 'connected'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30'
                    : syncStatus === 'saving'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30'
                    : 'bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500/30'
                }`}
                title="የዳታቤዝ ሁኔታን ለማየትና ባክአፕ ለማውረድ ይጫኑ"
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    syncStatus === 'connected'
                      ? 'bg-emerald-400 animate-pulse'
                      : syncStatus === 'saving'
                      ? 'bg-amber-400 animate-spin'
                      : 'bg-rose-400'
                  }`}
                />
                <Database className="w-3.5 h-3.5" />
                <span>
                  {syncStatus === 'connected'
                    ? 'ኦንላይን ዳታቤዝ ተገናኝቷል'
                    : syncStatus === 'saving'
                    ? 'በመመዝገብ ላይ...'
                    : 'ከመስመር ውጭ (የተቀመጠ)'}
                </span>
              </button>

              <button
                type="button"
                onClick={onOpenSyncModal}
                className="bg-blue-800/80 hover:bg-blue-700 text-amber-300 border border-blue-700/60 text-xs px-3 py-1.5 rounded-xl font-bold transition flex items-center gap-1.5 shadow"
                title="የዳታ ባክአፕ ማውረጃና የFirebase ማስተካከያ"
              >
                <span>💾 ዳታቤዝ & ባክአፕ</span>
              </button>
            </div>
          </div>
        </div>

        {/* Sub-bar with academic year and user account control */}
        <div className="bg-slate-900/80 backdrop-blur border-t border-blue-900/50 px-4 py-2.5 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3 text-sm">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-amber-400" />
              <span className="font-semibold text-slate-200">የትምህርት ዘመን፦</span>
              <select
                value={currentYear}
                onChange={(e) => onYearChange(e.target.value)}
                className="bg-slate-800 text-white border border-slate-700 rounded-md px-3 py-1 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                {years.map((y) => (
                  <option key={y} value={y} className="bg-slate-800 text-white">
                    {y} ዓ/ም
                  </option>
                ))}
              </select>

              {currentUserRole === 'admin' && (
                <button
                  onClick={() => setShowAddYearModal(true)}
                  className="bg-amber-600 hover:bg-amber-500 text-white text-xs px-2.5 py-1 rounded-md font-medium transition flex items-center gap-1 shadow-sm"
                  title="አዲስ ዓመተ ምህረት ጨምር"
                >
                  <Plus className="w-3.5 h-3.5" />
                  አዲስ ዓ/ም
                </button>
              )}
            </div>

            <div className="flex items-center gap-3">
              {currentUserRole ? (
                <>
                  <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-blue-900/60 border border-blue-700/60 text-slate-200 text-xs font-medium">
                    {currentUserRole === 'admin' ? (
                      <Shield className="w-3.5 h-3.5 text-amber-400" />
                    ) : (
                      <User className="w-3.5 h-3.5 text-cyan-400" />
                    )}
                    <span>{getRoleLabel()}</span>
                  </div>
                  <button
                    onClick={onLogout}
                    className="flex items-center gap-1 bg-rose-600/90 hover:bg-rose-500 text-white text-xs px-3 py-1.5 rounded-md font-semibold transition shadow"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    ውጣ
                  </button>
                </>
              ) : (
                <span className="text-xs text-slate-400 italic">እባክዎ መግቢያዎን ይምረጡ</span>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Add Year Modal */}
      {showAddYearModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-sm w-full p-6 shadow-2xl text-slate-800 border border-slate-100">
            <h3 className="text-lg font-bold text-slate-900 mb-2">አዲስ የትምህርት ዘመን ጨምር</h3>
            <p className="text-xs text-slate-500 mb-4">
              ለምሳሌ: 2020፣ 2021 ወይም ተፈላጊውን የትምህርት ዘመን ያስገቡ።
            </p>
            <form onSubmit={handleAddYearSubmit}>
              <input
                type="text"
                value={newYearInput}
                onChange={(e) => setNewYearInput(e.target.value)}
                placeholder="ምሳሌ፡ 2025"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-blue-600"
                autoFocus
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddYearModal(false)}
                  className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  ሰርዝ
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm bg-blue-700 hover:bg-blue-600 text-white rounded-lg font-semibold"
                >
                  መዝግብ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

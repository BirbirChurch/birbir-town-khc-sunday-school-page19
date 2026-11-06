import React, { useState } from 'react';
import { KeyRound, Shield, Users, CheckCircle2, Eye, EyeOff } from 'lucide-react';

interface PinManageTabProps {
  adminPin: string;
  leaderPin: string;
  onSavePins: (adminPin: string, leaderPin: string) => void;
}

export const PinManageTab: React.FC<PinManageTabProps> = ({
  adminPin,
  leaderPin,
  onSavePins
}) => {
  const [newAdminPin, setNewAdminPin] = useState(adminPin);
  const [newLeaderPin, setNewLeaderPin] = useState(leaderPin);
  const [showAdminPin, setShowAdminPin] = useState(false);
  const [showLeaderPin, setShowLeaderPin] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAdminPin.trim() || !newLeaderPin.trim()) {
      alert('እባክዎን ሁለቱንም የPIN ቁጥሮች ያስገቡ!');
      return;
    }
    onSavePins(newAdminPin.trim(), newLeaderPin.trim());
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="max-w-lg mx-auto">
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/80 shadow-sm">
        <div className="flex items-center gap-3 pb-5 mb-5 border-b border-slate-100">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <KeyRound className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">
              የአስተባባሪ እና መሪዎች PIN ቅንብር
            </h3>
            <p className="text-xs text-slate-500">
              የዋና አስተባባሪ እና የሰንበት ት/ቤት መሪዎች መግቢያ ቁልፍ ይቀይሩ
            </p>
          </div>
        </div>

        {savedSuccess && (
          <div className="mb-5 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>የአስተባባሪ እና የመሪዎች PIN በሚገባ ተቀይሯል!</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-blue-700" />
              የዋና አስተባባሪ አዲስ PIN፦
            </label>
            <div className="relative">
              <input
                type={showAdminPin ? 'text' : 'password'}
                value={newAdminPin}
                onChange={(e) => setNewAdminPin(e.target.value)}
                placeholder="አስተባባሪ PIN"
                className="w-full px-3.5 py-2.5 pr-10 border border-slate-300 rounded-xl text-sm font-mono font-semibold focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
              <button
                type="button"
                onClick={() => setShowAdminPin(!showAdminPin)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showAdminPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
              <Users className="w-4 h-4 text-teal-700" />
              የሰንበት ት/ቤት መሪዎች አዲስ PIN፦
            </label>
            <div className="relative">
              <input
                type={showLeaderPin ? 'text' : 'password'}
                value={newLeaderPin}
                onChange={(e) => setNewLeaderPin(e.target.value)}
                placeholder="መሪዎች PIN"
                className="w-full px-3.5 py-2.5 pr-10 border border-slate-300 rounded-xl text-sm font-mono font-semibold focus:outline-none focus:ring-2 focus:ring-teal-600"
              />
              <button
                type="button"
                onClick={() => setShowLeaderPin(!showLeaderPin)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showLeaderPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-blue-800 hover:bg-blue-700 text-white font-semibold py-2.5 px-4 rounded-xl shadow-md transition duration-200 text-sm"
          >
            አዲስ PIN መዝግብ
          </button>
        </form>
      </div>
    </div>
  );
};

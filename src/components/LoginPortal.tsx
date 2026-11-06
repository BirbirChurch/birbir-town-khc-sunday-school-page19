import React, { useState } from 'react';
import { Shield, Users, GraduationCap, Lock, ArrowLeft, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { Role, Teacher } from '../types';

interface LoginPortalProps {
  teachers: Teacher[];
  adminPin: string;
  leaderPin: string;
  onLoginSuccess: (role: Role, teacher?: Teacher) => void;
}

export const LoginPortal: React.FC<LoginPortalProps> = ({
  teachers,
  adminPin,
  leaderPin,
  onLoginSuccess
}) => {
  const [activeRole, setActiveRole] = useState<Role | null>(null);
  const [selectedTeacherId, setSelectedTeacherId] = useState<number>(teachers[0]?.id || 1);
  const [enteredPin, setEnteredPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSelectRole = (role: Role) => {
    setActiveRole(role);
    setEnteredPin('');
    setErrorMsg('');
    if (role === 'teacher' && teachers.length > 0) {
      setSelectedTeacherId(teachers[0].id);
    }
  };

  const handleBack = () => {
    setActiveRole(null);
    setEnteredPin('');
    setErrorMsg('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const pin = enteredPin.trim();

    if (!pin) {
      setErrorMsg('እባክዎን የPIN ቁጥር ያስገቡ!');
      return;
    }

    if (activeRole === 'admin') {
      if (pin === adminPin) {
        onLoginSuccess('admin');
      } else {
        setErrorMsg('የተሳሳተ የአስተባባሪ PIN ቁጥር ነው!');
      }
    } else if (activeRole === 'leader') {
      if (pin === leaderPin) {
        onLoginSuccess('leader');
      } else {
        setErrorMsg('የተሳሳተ የመሪዎች PIN ቁጥር ነው!');
      }
    } else if (activeRole === 'teacher') {
      const teacher = teachers.find((t) => t.id === Number(selectedTeacherId));
      if (teacher && teacher.pin === pin) {
        onLoginSuccess('teacher', teacher);
      } else {
        setErrorMsg('የተሳሳተ የመምህር PIN ቁጥር ነው!');
      }
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-10 px-4 sm:px-6">
      {!activeRole ? (
        <div>
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-800 tracking-tight">
              እባክዎን የመግቢያ ገጽዎን ይምረጡ
            </h2>
            <p className="text-sm text-slate-500 mt-2">
              ወደ አገልግሎት ማኔጅመንቱ ሲስተም ለመግባት ተገቢውን ሚና ይምረጡ
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Admin Portal Card */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm hover:shadow-xl hover:border-blue-500/50 transition-all duration-200 flex flex-col justify-between group">
              <div>
                <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center mb-5 group-hover:scale-105 group-hover:bg-blue-600 group-hover:text-white transition duration-200 shadow-sm">
                  <Shield className="w-7 h-7" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">የአስተባባሪ ገጽ</h3>
                <p className="text-slate-600 text-sm leading-relaxed mb-6">
                  ሙሉ መቆጣጠሪያ፣ ዓመታዊ ዕቅድና ሩብ ዓመት ሪፖርት ማስተዳደሪያ፣ መምህራን እና PIN ቅንብር።
                </p>
              </div>
              <button
                onClick={() => handleSelectRole('admin')}
                className="w-full bg-blue-800 hover:bg-blue-700 text-white font-semibold py-2.5 px-4 rounded-xl shadow transition duration-200"
              >
                በአስተባባሪነት ግባ
              </button>
            </div>

            {/* Leader Portal Card */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm hover:shadow-xl hover:border-teal-500/50 transition-all duration-200 flex flex-col justify-between group">
              <div>
                <div className="w-14 h-14 rounded-2xl bg-teal-50 text-teal-700 flex items-center justify-center mb-5 group-hover:scale-105 group-hover:bg-teal-600 group-hover:text-white transition duration-200 shadow-sm">
                  <Users className="w-7 h-7" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">የሰንበት ት/ቤት መሪዎች ገጽ</h3>
                <p className="text-slate-600 text-sm leading-relaxed mb-6">
                  የመሪዎች መከታተያ፣ ውጤትና የቀሪዎች ሪፖርት፣ የመዘምራንና መንፈሳዊ ቡድኖች መቆጣጠሪያ።
                </p>
              </div>
              <button
                onClick={() => handleSelectRole('leader')}
                className="w-full bg-teal-700 hover:bg-teal-600 text-white font-semibold py-2.5 px-4 rounded-xl shadow transition duration-200"
              >
                በመሪነት ግባ
              </button>
            </div>

            {/* Teacher Portal Card */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm hover:shadow-xl hover:border-amber-500/50 transition-all duration-200 flex flex-col justify-between group">
              <div>
                <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center mb-5 group-hover:scale-105 group-hover:bg-amber-600 group-hover:text-white transition duration-200 shadow-sm">
                  <GraduationCap className="w-7 h-7" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">የመምህራን ገጽ</h3>
                <p className="text-slate-600 text-sm leading-relaxed mb-6">
                  በግል መግቢያ ቁልፍ (PIN) በመግባት ለተመደቡበት ክፍል ውጤትና የተማሪ መረጃ መመዝገቢያ።
                </p>
              </div>
              <button
                onClick={() => handleSelectRole('teacher')}
                className="w-full bg-amber-600 hover:bg-amber-500 text-white font-semibold py-2.5 px-4 rounded-xl shadow transition duration-200"
              >
                በመምህርነት ግባ
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Login Form Card */
        <div className="max-w-md mx-auto bg-white rounded-2xl p-8 border border-slate-200 shadow-xl">
          <button
            onClick={handleBack}
            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 font-semibold mb-6 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            ወደ ምርጫ ገጽ ተመለስ
          </button>

          <div className="text-center mb-6">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center mb-3">
              <Lock className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-slate-900">
              {activeRole === 'admin'
                ? 'የአስተባባሪ መግቢያ'
                : activeRole === 'leader'
                ? 'የሰንበት ት/ቤት መሪዎች መግቢያ'
                : 'የመምህራን መግቢያ'}
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              {activeRole === 'admin'
                ? 'የአስተባባሪ ምስጢር ቁጥር (PIN) ያስገቡ (ነባሪ: 1234)'
                : activeRole === 'leader'
                ? 'የመሪዎች ምስጢር ቁጥር (PIN) ያስገቡ (ነባሪ: 5678)'
                : 'ስምዎን መርጠው የግል PIN ያስገቡ (ነባሪ: 1001-1033)'}
            </p>
          </div>

          {errorMsg && (
            <div className="mb-5 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {activeRole === 'teacher' && (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  መምህር ይምረጡ፦
                </label>
                <select
                  value={selectedTeacherId}
                  onChange={(e) => setSelectedTeacherId(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition"
                >
                  {[...teachers]
                    .sort((a, b) => a.name.localeCompare(b.name, 'am'))
                    .map((t, idx) => (
                      <option key={`teach_opt_${t.id}_${idx}`} value={t.id}>
                        {t.name} ({t.assignedClass}{t.assignedSubject ? ` - ${t.assignedSubject}` : ''})
                      </option>
                    ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                የምስጢር ቁጥር (PIN)፦
              </label>
              <div className="relative">
                <input
                  type={showPin ? 'text' : 'password'}
                  value={enteredPin}
                  onChange={(e) => setEnteredPin(e.target.value)}
                  placeholder="PIN ቁጥር ያስገቡ"
                  className="w-full px-3.5 py-2.5 pr-10 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white tracking-widest"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPin(!showPin)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
                >
                  {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="w-full mt-2 bg-blue-800 hover:bg-blue-700 text-white font-semibold py-2.5 px-4 rounded-xl shadow-md transition duration-200"
            >
              ግባ
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

import React from 'react';
import { Check, X } from 'lucide-react';

interface PasswordStrengthMeterProps {
  password: string;
  show: boolean;
}

export const PasswordStrengthMeter: React.FC<PasswordStrengthMeterProps> = ({ password, show }) => {
  if (!show) return null;

  const requirements = [
    { label: 'At least 8 characters', met: password.length >= 8 },
    { label: 'One uppercase letter', met: /[A-Z]/.test(password) },
    { label: 'One lowercase letter', met: /[a-z]/.test(password) },
    { label: 'One number', met: /\d/.test(password) },
  ];

  const metCount = requirements.filter(r => r.met).length;
  const strength = metCount === 0 ? 0 : metCount <= 1 ? 1 : metCount <= 2 ? 2 : metCount <= 3 ? 3 : 4;

  const strengthLabels = ['', 'Weak', 'Fair', 'Good', 'Strong'];
  const strengthColors = ['bg-slate-700', 'bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-emerald-500'];
  const strengthTextColors = ['text-slate-500', 'text-red-400', 'text-orange-400', 'text-yellow-400', 'text-emerald-400'];

  return (
    <div className="space-y-3 animate-in fade-in slide-in-from-top-1 duration-200">
      {/* Strength Bar */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Password Strength</span>
          <span className={`text-[9px] font-black uppercase tracking-widest ${strengthTextColors[strength]}`}>
            {strengthLabels[strength]}
          </span>
        </div>
        <div className="flex gap-1">
          {[1, 2, 3, 4].map((level) => (
            <div
              key={level}
              className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                level <= strength ? strengthColors[strength] : 'bg-white/10'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Requirements Checklist */}
      <div className="space-y-2">
        {requirements.map((req, index) => (
          <div
            key={index}
            className={`flex items-center gap-2 text-[10px] transition-colors duration-200 ${
              req.met ? 'text-emerald-400' : 'text-slate-500'
            }`}
          >
            <div className={`w-4 h-4 rounded-full flex items-center justify-center transition-all duration-200 ${
              req.met ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/5 text-slate-600'
            }`}>
              {req.met ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
            </div>
            <span className="font-medium">{req.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

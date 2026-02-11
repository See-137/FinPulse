/**
 * CookieConsent Component
 * GDPR/CCPA compliant cookie consent banner.
 * Gates Meta Pixel behind explicit opt-in.
 *
 * Behaviour:
 * - Shows banner on first visit (consent not yet stored)
 * - "Accept" → stores consent, initialises Meta Pixel
 * - "Decline" → stores decline, Pixel never loads
 * - Choice persists in localStorage; banner never re-shows unless cleared
 */

import React, { useState, useEffect } from 'react';
import { Cookie, X } from 'lucide-react';
import { getConsent, setConsent, type ConsentChoice } from '../services/analytics';

export const CookieConsent: React.FC = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Only show if user hasn't made a choice yet
    const existing: ConsentChoice = getConsent();
    if (existing === null) {
      // Small delay so the banner doesn't flash on initial render
      const timer = setTimeout(() => setVisible(true), 1500);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, []);

  if (!visible) return null;

  const handleAccept = () => {
    setConsent('accepted');
    setVisible(false);
  };

  const handleDecline = () => {
    setConsent('declined');
    setVisible(false);
  };

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-md z-[60] animate-slide-up">
      <div className="bg-[#151921] border border-white/10 rounded-2xl p-5 shadow-2xl backdrop-blur-xl">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-[#00e5ff]/10 rounded-xl shrink-0">
            <Cookie className="w-5 h-5 text-[#00e5ff]" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-bold text-white">Cookie Preferences</h3>
              <button
                onClick={handleDecline}
                className="p-1 hover:bg-white/10 rounded-lg transition-colors"
                aria-label="Dismiss cookie banner"
              >
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed mb-4">
              We use analytics cookies to measure ad performance and improve your experience.
              No personal data is sold. You can change your preference anytime in Settings.
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={handleAccept}
                className="px-4 py-2 bg-[#00e5ff] text-black text-xs font-bold rounded-lg hover:opacity-90 transition-opacity"
              >
                Accept
              </button>
              <button
                onClick={handleDecline}
                className="px-4 py-2 bg-white/5 text-slate-300 text-xs font-bold rounded-lg hover:bg-white/10 transition-colors border border-white/10"
              >
                Decline
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CookieConsent;

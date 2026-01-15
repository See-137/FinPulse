/**
 * FinPulse V2: Changelog Modal Component
 * Shows "What's New" on first visit after version update
 */

import React, { useState, useEffect } from 'react';
import { X, Sparkles, Bug, Zap, ChevronRight } from 'lucide-react';
import { ChangelogEntry, NOTIFICATION_STORAGE_KEYS } from '../types/notifications';
import { useLanguage } from '../i18n';
import { componentLogger } from '../services/logger';

interface ChangelogModalProps {
  isOpen: boolean;
  onClose: () => void;
  changelog: ChangelogEntry;
}

export const ChangelogModal: React.FC<ChangelogModalProps> = ({ isOpen, onClose, changelog }) => {
  const { t, isRTL } = useLanguage();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div 
        className={`relative w-full max-w-lg bg-white dark:bg-[#151921] rounded-3xl shadow-2xl border border-slate-200 dark:border-white/10 overflow-hidden animate-in zoom-in-95 duration-300 ${isRTL ? 'rtl' : 'ltr'}`}
      >
        {/* Header with gradient */}
        <div className="relative bg-gradient-to-br from-[#00e5ff]/20 via-blue-500/10 to-purple-500/10 p-6 pb-8">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors"
          >
            <X className="w-5 h-5 text-slate-600 dark:text-slate-300" />
          </button>
          
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 rounded-2xl bg-[#00e5ff]/20 border border-[#00e5ff]/30">
              <Sparkles className="w-6 h-6 text-[#00e5ff]" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-900 dark:text-white">
                {t('changelog.whatsNew')}
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Version {changelog.version} • {new Date(changelog.releaseDate).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto custom-scrollbar">
          {/* Features */}
          {changelog.features.length > 0 && (
            <section>
              <h3 className="flex items-center gap-2 text-sm font-black uppercase tracking-wider text-[#00e5ff] mb-3">
                <Sparkles className="w-4 h-4" />
                {t('changelog.newFeatures')}
              </h3>
              <ul className="space-y-2">
                {changelog.features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-slate-700 dark:text-slate-300">
                    <ChevronRight className="w-4 h-4 text-[#00e5ff] mt-0.5 shrink-0" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Bug Fixes */}
          {changelog.bugFixes && changelog.bugFixes.length > 0 && (
            <section>
              <h3 className="flex items-center gap-2 text-sm font-black uppercase tracking-wider text-green-500 mb-3">
                <Bug className="w-4 h-4" />
                {t('changelog.bugFixes')}
              </h3>
              <ul className="space-y-2">
                {changelog.bugFixes.map((fix, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-slate-700 dark:text-slate-300">
                    <ChevronRight className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                    <span>{fix}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Improvements */}
          {changelog.improvements && changelog.improvements.length > 0 && (
            <section>
              <h3 className="flex items-center gap-2 text-sm font-black uppercase tracking-wider text-purple-500 mb-3">
                <Zap className="w-4 h-4" />
                {t('changelog.improvements')}
              </h3>
              <ul className="space-y-2">
                {changelog.improvements.map((improvement, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-slate-700 dark:text-slate-300">
                    <ChevronRight className="w-4 h-4 text-purple-500 mt-0.5 shrink-0" />
                    <span>{improvement}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 pt-0">
          <button
            onClick={onClose}
            className="w-full py-3 px-6 rounded-2xl bg-gradient-to-r from-[#00e5ff] to-blue-500 text-black font-bold text-sm hover:opacity-90 transition-opacity"
          >
            {t('changelog.gotIt')}
          </button>
        </div>
      </div>
    </div>
  );
};

// Hook to manage changelog visibility
export const useChangelog = () => {
  const [showChangelog, setShowChangelog] = useState(false);
  const [currentChangelog, setCurrentChangelog] = useState<ChangelogEntry | null>(null);

  useEffect(() => {
    const checkChangelog = async () => {
      try {
        // Fetch changelogs from static file
        const response = await fetch('/changelogs.json');
        const data = await response.json();
        const latestChangelog = data.changelogs[0] as ChangelogEntry;

        if (!latestChangelog) return;

        // Check if user has seen this version
        const lastSeenVersion = localStorage.getItem(NOTIFICATION_STORAGE_KEYS.LAST_SEEN_CHANGELOG);
        
        if (lastSeenVersion !== latestChangelog.version) {
          setCurrentChangelog(latestChangelog);
          setShowChangelog(true);
        }
      } catch (error) {
        componentLogger.error('Failed to load changelog:', error);
      }
    };

    // Small delay to let the app load first
    const timer = setTimeout(checkChangelog, 1000);
    return () => clearTimeout(timer);
  }, []);

  const dismissChangelog = () => {
    if (currentChangelog) {
      localStorage.setItem(NOTIFICATION_STORAGE_KEYS.LAST_SEEN_CHANGELOG, currentChangelog.version);
    }
    setShowChangelog(false);
  };

  return {
    showChangelog,
    currentChangelog,
    dismissChangelog
  };
};

export default ChangelogModal;

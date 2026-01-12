import React from 'react';
import { ExternalLink } from 'lucide-react';

interface FooterProps {
  onNavigate?: (route: string) => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  const handleClick = (route: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    if (onNavigate) {
      onNavigate(route);
    } else {
      window.location.hash = route;
    }
  };

  return (
    <footer className="border-t border-slate-200 dark:border-white/10 bg-white/50 dark:bg-[#0b0e14]/50 backdrop-blur-sm mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Links */}
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm">
            <a
              href="#terms"
              onClick={handleClick('terms')}
              className="text-slate-600 dark:text-slate-400 hover:text-[#00e5ff] transition-colors font-medium"
            >
              Terms of Service
            </a>
            <a
              href="#privacy"
              onClick={handleClick('privacy')}
              className="text-slate-600 dark:text-slate-400 hover:text-[#00e5ff] transition-colors font-medium"
            >
              Privacy Policy
            </a>
            <a
              href="#accessibility"
              onClick={handleClick('accessibility')}
              className="text-slate-600 dark:text-slate-400 hover:text-[#00e5ff] transition-colors font-medium"
            >
              Accessibility
            </a>
            <a
              href="mailto:support@finpulse.me"
              className="text-slate-600 dark:text-slate-400 hover:text-[#00e5ff] transition-colors font-medium inline-flex items-center gap-1"
            >
              Contact
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          {/* Copyright */}
          <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
            <span>© {new Date().getFullYear()} FinPulse</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

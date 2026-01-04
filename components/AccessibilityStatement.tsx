import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { Logo } from '../constants';

interface AccessibilityStatementProps {
  onBack: () => void;
}

export const AccessibilityStatement: React.FC<AccessibilityStatementProps> = ({ onBack }) => {
  return (
    <div className="min-h-screen bg-[#0b0e14] text-white p-8">
      <div className="max-w-3xl mx-auto">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-cyan-400 mb-8 hover:underline"
        >
          <ArrowLeft className="w-4 h-4" /> Back to FinPulse
        </button>

        <Logo className="h-10 mb-8" />

        <h1 className="text-4xl font-black mb-2">Accessibility Statement</h1>
        <p className="text-slate-400 mb-8">Last updated: January 4, 2026</p>

        <div className="prose prose-invert prose-slate max-w-none space-y-6">
          <section>
            <h2 className="text-xl font-bold text-cyan-400">Our Commitment</h2>
            <p className="text-slate-300">
              FinPulse is committed to ensuring digital accessibility for people with disabilities. 
              We are continually improving the user experience for everyone and applying the 
              relevant accessibility standards.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-cyan-400">Conformance Status</h2>
            <p className="text-slate-300">
              FinPulse partially conforms with WCAG 2.1 level AA. "Partially conforms" means 
              that some parts of the content do not fully conform to the accessibility standard. 
              We are actively working to achieve full compliance.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-cyan-400">Accessibility Features</h2>
            <ul className="list-disc list-inside text-slate-300 ml-4 space-y-2">
              <li>Keyboard navigation support for all interactive elements</li>
              <li>Screen reader compatibility (tested with NVDA, JAWS, VoiceOver)</li>
              <li>High contrast color schemes for better readability</li>
              <li>Scalable text that respects browser font size settings</li>
              <li>Clear focus indicators for keyboard navigation</li>
              <li>ARIA labels for assistive technologies</li>
              <li>Alternative text for images and icons</li>
              <li>Responsive design that works across devices</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-cyan-400">Known Limitations</h2>
            <p className="text-slate-300">
              We are aware of the following accessibility limitations and are working to address them:
            </p>
            <ul className="list-disc list-inside text-slate-300 ml-4 space-y-2">
              <li>Some dynamic charts may not be fully accessible to screen readers</li>
              <li>Real-time price updates may not announce changes to screen readers</li>
              <li>Some third-party content (market data) may have limited accessibility</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-cyan-400">Technical Specifications</h2>
            <ul className="list-disc list-inside text-slate-300 ml-4 space-y-2">
              <li><strong>Supported Browsers:</strong> Chrome, Firefox, Safari, Edge (latest versions)</li>
              <li><strong>Technologies:</strong> HTML5, CSS3, JavaScript (React), ARIA</li>
              <li><strong>Keyboard Navigation:</strong> Full support with visible focus indicators</li>
              <li><strong>Screen Readers:</strong> Tested with NVDA (Windows), JAWS (Windows), VoiceOver (macOS/iOS)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-cyan-400">Feedback</h2>
            <p className="text-slate-300">
              We welcome your feedback on the accessibility of FinPulse. If you encounter 
              accessibility barriers, please contact us:
            </p>
            <ul className="list-disc list-inside text-slate-300 ml-4 space-y-2">
              <li>Email: <a href="mailto:accessibility@finpulse.me" className="text-cyan-400 hover:underline">accessibility@finpulse.me</a></li>
              <li>General Support: <a href="mailto:support@finpulse.me" className="text-cyan-400 hover:underline">support@finpulse.me</a></li>
            </ul>
            <p className="text-slate-300 mt-4">
              We try to respond to accessibility feedback within 5 business days.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-cyan-400">Assessment Method</h2>
            <p className="text-slate-300">
              FinPulse's accessibility has been assessed using a combination of:
            </p>
            <ul className="list-disc list-inside text-slate-300 ml-4 space-y-2">
              <li>Self-evaluation using WCAG 2.1 guidelines</li>
              <li>Automated testing tools (axe DevTools, WAVE)</li>
              <li>Manual testing with screen readers</li>
              <li>Keyboard-only navigation testing</li>
              <li>Color contrast analysis</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-cyan-400">Continuous Improvement</h2>
            <p className="text-slate-300">
              We are committed to ongoing accessibility improvements. Our roadmap includes:
            </p>
            <ul className="list-disc list-inside text-slate-300 ml-4 space-y-2">
              <li>Regular accessibility audits</li>
              <li>User testing with people with disabilities</li>
              <li>Training for our development team on accessibility best practices</li>
              <li>Integration of accessibility testing in our development workflow</li>
            </ul>
          </section>

          <section className="mt-8 pt-6 border-t border-white/10">
            <p className="text-xs text-slate-500">
              This accessibility statement was created on January 4, 2026, and will be 
              reviewed and updated regularly as we continue to improve our accessibility.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { Logo } from '../constants';

interface AccessibilityStatementProps {
  onBack: () => void;
}

export const AccessibilityStatement: React.FC<AccessibilityStatementProps> = ({ onBack }) => {
  return (
    <div className="fixed inset-0 overflow-y-auto bg-[#0b0e14] text-white p-8 z-50">
      <div className="max-w-3xl mx-auto pb-8">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-cyan-400 mb-8 hover:underline focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2 focus:ring-offset-[#0b0e14] rounded"
          aria-label="Go back to FinPulse"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden="true" /> Back to FinPulse
        </button>

        <Logo className="h-10 mb-8" />

        <h1 className="text-4xl font-black mb-2">Accessibility Statement</h1>
        <p className="text-slate-400 mb-8">Effective Date: January 8, 2026 | Last Updated: January 8, 2026</p>

        <div className="prose prose-invert prose-slate max-w-none space-y-6">
          <section aria-labelledby="commitment-heading">
            <h2 id="commitment-heading" className="text-xl font-bold text-cyan-400">Our Commitment to Accessibility</h2>
            <p className="text-slate-300">
              FinPulse Technologies ("FinPulse," "we," "us," or "our") is committed to ensuring digital accessibility 
              for people of all abilities. We believe that everyone should have equal access to financial information 
              and portfolio tracking tools, regardless of disability.
            </p>
            <p className="text-slate-300 mt-2">
              We are continually improving the user experience for everyone by applying the relevant accessibility 
              standards and investing in accessible design practices.
            </p>
          </section>

          <section aria-labelledby="standards-heading">
            <h2 id="standards-heading" className="text-xl font-bold text-cyan-400">Accessibility Standards</h2>
            <p className="text-slate-300">
              FinPulse aims to conform to the following accessibility standards:
            </p>
            <ul className="list-disc list-inside text-slate-300 ml-4 space-y-2">
              <li><strong>Web Content Accessibility Guidelines (WCAG) 2.1 Level AA</strong> — The international standard for web accessibility, published by the World Wide Web Consortium (W3C)</li>
              <li><strong>WCAG 2.2 Level AA</strong> — We are actively working toward compliance with the latest WCAG 2.2 guidelines</li>
              <li><strong>Americans with Disabilities Act (ADA)</strong> — U.S. federal civil rights law prohibiting discrimination against individuals with disabilities</li>
              <li><strong>European Accessibility Act (EAA)</strong> — EU directive (2019/882) ensuring accessibility of products and services</li>
              <li><strong>EN 301 549</strong> — European standard for digital accessibility of ICT products and services</li>
              <li><strong>Section 508 of the Rehabilitation Act</strong> — U.S. federal accessibility requirements</li>
            </ul>
          </section>

          <section aria-labelledby="conformance-heading">
            <h2 id="conformance-heading" className="text-xl font-bold text-cyan-400">Conformance Status</h2>
            <p className="text-slate-300">
              FinPulse <strong>partially conforms</strong> to WCAG 2.1 Level AA. "Partially conforms" means that 
              some parts of the content do not fully conform to the accessibility standard.
            </p>
            <div className="mt-4 p-4 bg-cyan-500/10 border border-cyan-500/30 rounded-xl">
              <p className="text-slate-300">
                <strong>Our Goal:</strong> We are actively working toward full WCAG 2.1 Level AA compliance 
                and have established an accessibility roadmap with target milestones throughout 2026.
              </p>
            </div>
          </section>

          <section aria-labelledby="features-heading">
            <h2 id="features-heading" className="text-xl font-bold text-cyan-400">Accessibility Features</h2>
            <p className="text-slate-300">FinPulse includes the following accessibility features:</p>
            
            <h3 className="text-lg font-semibold text-white mt-4">Keyboard Navigation</h3>
            <ul className="list-disc list-inside text-slate-300 ml-4 space-y-2">
              <li>Full keyboard navigation support for all interactive elements</li>
              <li>Logical tab order following visual layout</li>
              <li>Skip navigation links to bypass repetitive content</li>
              <li>Keyboard shortcuts for common actions</li>
              <li>Visible focus indicators on all focusable elements</li>
            </ul>

            <h3 className="text-lg font-semibold text-white mt-4">Screen Reader Compatibility</h3>
            <ul className="list-disc list-inside text-slate-300 ml-4 space-y-2">
              <li>Semantic HTML structure with proper heading hierarchy</li>
              <li>ARIA labels and landmarks for assistive technologies</li>
              <li>Alternative text for all meaningful images and icons</li>
              <li>Form labels and error messages associated with inputs</li>
              <li>Live regions for dynamic content updates</li>
              <li>Tested with NVDA (Windows), JAWS (Windows), VoiceOver (macOS/iOS), and TalkBack (Android)</li>
            </ul>

            <h3 className="text-lg font-semibold text-white mt-4">Visual Accessibility</h3>
            <ul className="list-disc list-inside text-slate-300 ml-4 space-y-2">
              <li>Color contrast ratios meeting WCAG AA standards (minimum 4.5:1 for normal text, 3:1 for large text)</li>
              <li>Information not conveyed by color alone</li>
              <li>Scalable text that respects browser font size settings (up to 200%)</li>
              <li>Support for browser zoom up to 400%</li>
              <li>Responsive design adapting to various screen sizes</li>
              <li>Reduced motion option respecting prefers-reduced-motion</li>
            </ul>

            <h3 className="text-lg font-semibold text-white mt-4">Cognitive Accessibility</h3>
            <ul className="list-disc list-inside text-slate-300 ml-4 space-y-2">
              <li>Clear and consistent navigation patterns</li>
              <li>Descriptive link text and button labels</li>
              <li>Error prevention and clear error messages</li>
              <li>Consistent terminology throughout the interface</li>
              <li>Help text and tooltips for complex features</li>
            </ul>
          </section>

          <section aria-labelledby="limitations-heading">
            <h2 id="limitations-heading" className="text-xl font-bold text-cyan-400">Known Limitations</h2>
            <p className="text-slate-300">
              Despite our best efforts, some areas of FinPulse have known accessibility limitations:
            </p>
            <ul className="list-disc list-inside text-slate-300 ml-4 space-y-2">
              <li><strong>Interactive Charts:</strong> Some dynamic financial charts may not be fully accessible to screen readers. We provide data tables as an alternative where possible.</li>
              <li><strong>Real-time Price Updates:</strong> Live price changes may not announce to screen readers automatically. Users can manually refresh to hear updated values.</li>
              <li><strong>Third-party Content:</strong> Some embedded market data from third-party providers may have limited accessibility.</li>
              <li><strong>PDF Reports:</strong> Some exported reports may not be fully accessible. We are working on accessible export formats.</li>
              <li><strong>Complex Data Visualizations:</strong> Portfolio pie charts and performance graphs have limited screen reader support.</li>
            </ul>
            <p className="text-slate-300 mt-4">
              We are actively working to address these limitations and welcome feedback on prioritization.
            </p>
          </section>

          <section aria-labelledby="technical-heading">
            <h2 id="technical-heading" className="text-xl font-bold text-cyan-400">Technical Specifications</h2>
            <p className="text-slate-300">FinPulse relies on the following technologies for accessibility:</p>
            <ul className="list-disc list-inside text-slate-300 ml-4 space-y-2">
              <li><strong>HTML5:</strong> Semantic markup for structure</li>
              <li><strong>CSS3:</strong> Styling with accessibility considerations</li>
              <li><strong>JavaScript (React):</strong> Interactive functionality with ARIA support</li>
              <li><strong>WAI-ARIA 1.2:</strong> Accessible Rich Internet Applications specification</li>
            </ul>
            
            <h3 className="text-lg font-semibold text-white mt-4">Supported Browsers</h3>
            <ul className="list-disc list-inside text-slate-300 ml-4 space-y-2">
              <li>Google Chrome (latest 2 versions)</li>
              <li>Mozilla Firefox (latest 2 versions)</li>
              <li>Apple Safari (latest 2 versions)</li>
              <li>Microsoft Edge (latest 2 versions)</li>
            </ul>

            <h3 className="text-lg font-semibold text-white mt-4">Tested Assistive Technologies</h3>
            <ul className="list-disc list-inside text-slate-300 ml-4 space-y-2">
              <li>NVDA (NonVisual Desktop Access) — Windows</li>
              <li>JAWS (Job Access With Speech) — Windows</li>
              <li>VoiceOver — macOS and iOS</li>
              <li>TalkBack — Android</li>
              <li>Windows Narrator — Windows</li>
              <li>Dragon NaturallySpeaking — Voice control</li>
            </ul>
          </section>

          <section aria-labelledby="assessment-heading">
            <h2 id="assessment-heading" className="text-xl font-bold text-cyan-400">Assessment Methods</h2>
            <p className="text-slate-300">
              FinPulse's accessibility has been assessed using:
            </p>
            <ul className="list-disc list-inside text-slate-300 ml-4 space-y-2">
              <li>Self-evaluation against WCAG 2.1 Level AA success criteria</li>
              <li>Automated testing tools: axe DevTools, WAVE, Lighthouse, Pa11y</li>
              <li>Manual testing with keyboard-only navigation</li>
              <li>Screen reader testing (NVDA, VoiceOver, JAWS)</li>
              <li>Color contrast analysis using WebAIM Contrast Checker</li>
              <li>User testing with individuals with disabilities (ongoing)</li>
            </ul>
          </section>

          <section aria-labelledby="feedback-heading">
            <h2 id="feedback-heading" className="text-xl font-bold text-cyan-400">Feedback & Contact</h2>
            <p className="text-slate-300">
              We welcome your feedback on the accessibility of FinPulse. If you encounter any accessibility 
              barriers or have suggestions for improvement, please contact us:
            </p>
            <ul className="list-disc list-inside text-slate-300 ml-4 space-y-2">
              <li>Accessibility Team: <a href="mailto:accessibility@finpulse.me" className="text-cyan-400 hover:underline focus:outline-none focus:ring-2 focus:ring-cyan-400">accessibility@finpulse.me</a></li>
              <li>General Support: <a href="mailto:support@finpulse.me" className="text-cyan-400 hover:underline focus:outline-none focus:ring-2 focus:ring-cyan-400">support@finpulse.me</a></li>
            </ul>
            <p className="text-slate-300 mt-4">
              When contacting us about accessibility issues, please include:
            </p>
            <ul className="list-disc list-inside text-slate-300 ml-4 space-y-2">
              <li>The web address (URL) where you encountered the issue</li>
              <li>A description of the problem</li>
              <li>The assistive technology you were using (if applicable)</li>
              <li>Your browser and operating system</li>
            </ul>
            <p className="text-slate-300 mt-4">
              <strong>Response Time:</strong> We aim to respond to accessibility feedback within 5 business days 
              and will work to resolve reported issues as quickly as possible.
            </p>
          </section>

          <section aria-labelledby="enforcement-heading">
            <h2 id="enforcement-heading" className="text-xl font-bold text-cyan-400">Enforcement & Complaints</h2>
            <p className="text-slate-300">
              If you are not satisfied with our response to your accessibility concern, you may escalate:
            </p>
            <ul className="list-disc list-inside text-slate-300 ml-4 space-y-2">
              <li><strong>United States:</strong> File a complaint with the U.S. Department of Justice, Civil Rights Division, or the Office for Civil Rights</li>
              <li><strong>European Union:</strong> Contact your national enforcement body under the European Accessibility Act or the Web Accessibility Directive</li>
              <li><strong>United Kingdom:</strong> Contact the Equality and Human Rights Commission (EHRC)</li>
            </ul>
          </section>

          <section aria-labelledby="roadmap-heading">
            <h2 id="roadmap-heading" className="text-xl font-bold text-cyan-400">Accessibility Roadmap</h2>
            <p className="text-slate-300">
              We are committed to continuous accessibility improvement. Our roadmap includes:
            </p>
            <ul className="list-disc list-inside text-slate-300 ml-4 space-y-2">
              <li><strong>Q1 2026:</strong> Complete WCAG 2.1 Level AA audit and remediation plan</li>
              <li><strong>Q2 2026:</strong> Implement accessible alternatives for all charts and visualizations</li>
              <li><strong>Q3 2026:</strong> User testing with disability advocacy groups</li>
              <li><strong>Q4 2026:</strong> Begin WCAG 2.2 Level AA compliance assessment</li>
              <li><strong>Ongoing:</strong> Accessibility training for all development team members</li>
              <li><strong>Ongoing:</strong> Integration of automated accessibility testing in CI/CD pipeline</li>
            </ul>
          </section>

          <section aria-labelledby="updates-heading">
            <h2 id="updates-heading" className="text-xl font-bold text-cyan-400">Statement Updates</h2>
            <p className="text-slate-300">
              This accessibility statement is reviewed and updated quarterly, or when significant changes 
              are made to FinPulse. The statement was last reviewed on January 8, 2026.
            </p>
          </section>

          <section className="mt-8 pt-6 border-t border-white/10">
            <p className="text-xs text-slate-500">
              FinPulse Technologies • Accessibility Statement Version 2.0 • January 8, 2026
            </p>
            <p className="text-xs text-slate-500 mt-2">
              This statement was prepared using the W3C Accessibility Statement Generator and customized for FinPulse.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { Logo } from '../constants';

interface LegalPageProps {
  onBack: () => void;
}

const LegalPageWrapper: React.FC<{ children: React.ReactNode; onBack: () => void }> = ({ children, onBack }) => (
  <div className="fixed inset-0 overflow-y-auto bg-[#0b0e14] text-white p-8 z-50">
    <div className="max-w-3xl mx-auto pb-8">
      <button onClick={onBack} className="flex items-center gap-2 text-cyan-400 mb-8 hover:underline" aria-label="Go back to FinPulse">
        <ArrowLeft className="w-4 h-4" aria-hidden="true" /> Back to FinPulse
      </button>
      <Logo className="h-10 mb-8" />
      {children}
    </div>
  </div>
);

export const TermsOfService: React.FC<LegalPageProps> = ({ onBack }) => (
  <LegalPageWrapper onBack={onBack}>
    <h1 className="text-4xl font-black mb-2">Terms of Service</h1>
    <p className="text-slate-400 mb-8">Effective Date: January 8, 2026 | Last Updated: January 8, 2026</p>
    
    <div className="prose prose-invert prose-slate max-w-none space-y-6">
      <section>
        <h2 className="text-xl font-bold text-cyan-400">1. Agreement to Terms</h2>
        <p className="text-slate-300">By accessing or using FinPulse ("Service," "Platform," or "we/us/our"), operated by FinPulse Technologies, you ("User," "you," or "your") agree to be bound by these Terms of Service ("Terms"). If you disagree with any part of these Terms, you must immediately discontinue use of the Service.</p>
        <p className="text-slate-300 mt-2">These Terms constitute a legally binding agreement between you and FinPulse Technologies. By creating an account, you represent that you are at least 18 years of age (or the age of legal majority in your jurisdiction) and have the legal capacity to enter into this agreement.</p>
      </section>

      <section>
        <h2 className="text-xl font-bold text-cyan-400">2. Description of Service</h2>
        <p className="text-slate-300">FinPulse is a Software as a Service (SaaS) portfolio tracking and financial analytics platform that enables users to monitor cryptocurrency, stock, and commodity investments. The Service includes:</p>
        <ul className="list-disc list-inside text-slate-300 ml-4">
          <li>Real-time and delayed price tracking for cryptocurrencies, stocks, and commodities</li>
          <li>AI-powered market insights and analysis (powered by Google Gemini)</li>
          <li>Community features for sharing investment strategies</li>
          <li>Portfolio analytics, reporting, and visualization tools</li>
          <li>Multi-device synchronization and secure data storage</li>
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-bold text-cyan-400">3. Subscription Plans & Pricing</h2>
        <p className="text-slate-300">FinPulse offers tiered subscription plans:</p>
        <ul className="list-disc list-inside text-slate-300 ml-4">
          <li><strong>Free Tier:</strong> Stocks & crypto tracking, up to 8 assets, 5 AI queries/day, basic community access</li>
          <li><strong>ProPulse ($9.90 USD/month):</strong> Includes commodities (gold, oil, etc.), up to 20 assets, 10 AI queries/day, CSV exports</li>
          <li><strong>SuperPulse ($29.90 USD/month):</strong> Premium analytics, up to 50 assets, 50 AI queries/day, priority support, ad-free experience</li>
        </ul>
        <p className="text-slate-300 mt-2">Prices are subject to change with 30 days' notice to existing subscribers. Pricing displayed excludes applicable taxes, which will be calculated at checkout based on your location.</p>
      </section>

      <section>
        <h2 className="text-xl font-bold text-cyan-400">4. Payment Terms & Billing</h2>
        <p className="text-slate-300">Payments are processed securely through Paddle.com Market Limited ("Paddle"), our Merchant of Record, or Stripe, Inc. ("Stripe"). By subscribing to a paid plan, you acknowledge and agree:</p>
        <ul className="list-disc list-inside text-slate-300 ml-4">
          <li>You authorize recurring monthly or annual charges to your payment method</li>
          <li>All prices are displayed in USD unless otherwise specified; local currency conversion may apply</li>
          <li>Billing occurs on the same calendar date each billing cycle</li>
          <li>Failed payments may result in service interruption after a 7-day grace period</li>
          <li>You can cancel your subscription anytime via Account Settings; access continues until the end of the current billing period</li>
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-bold text-cyan-400">5. Refund Policy</h2>
        <p className="text-slate-300">We offer a <strong>14-day money-back guarantee</strong> for all new paid subscriptions. To request a refund:</p>
        <ul className="list-disc list-inside text-slate-300 ml-4">
          <li>Contact <a href="mailto:billing@finpulse.me" className="text-cyan-400 hover:underline">billing@finpulse.me</a> within 14 days of your initial purchase</li>
          <li>Provide your account email and reason for refund</li>
          <li>Refunds are processed to the original payment method within 5-10 business days</li>
        </ul>
        <p className="text-slate-300 mt-2">After 14 days, refunds are issued on a case-by-case basis at our discretion. Refunds for annual plans are prorated based on unused months.</p>
      </section>

      <section>
        <h2 className="text-xl font-bold text-cyan-400">6. User Accounts & Responsibilities</h2>
        <p className="text-slate-300">As a user of FinPulse, you agree to:</p>
        <ul className="list-disc list-inside text-slate-300 ml-4">
          <li>Provide accurate, current, and complete registration information</li>
          <li>Maintain the confidentiality and security of your account credentials</li>
          <li>Notify us immediately of any unauthorized account access</li>
          <li>Use the Service only for lawful purposes and in compliance with all applicable laws</li>
          <li>Not attempt to reverse engineer, decompile, or exploit the Service</li>
          <li>Not use automated systems (bots, scrapers) to access the Service without authorization</li>
          <li>Not share, resell, or redistribute your account access</li>
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-bold text-cyan-400">7. Intellectual Property</h2>
        <p className="text-slate-300">The Service, including all content, features, functionality, software, designs, and trademarks, is owned by FinPulse Technologies and protected by international copyright, trademark, and intellectual property laws. You are granted a limited, non-exclusive, non-transferable license to use the Service for personal, non-commercial purposes during your subscription term.</p>
      </section>

      <section>
        <h2 className="text-xl font-bold text-cyan-400">8. Financial Disclaimer</h2>
        <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl">
          <p className="text-slate-300"><strong className="text-amber-400">⚠️ IMPORTANT:</strong> FinPulse does NOT provide financial, investment, tax, or legal advice. All information, data, analytics, and AI-generated content provided through the Service is for <strong>educational and informational purposes only</strong>.</p>
          <p className="text-slate-300 mt-2">We are not registered investment advisors, broker-dealers, or financial planners. The Service should not be construed as a recommendation to buy, sell, or hold any security or financial instrument.</p>
          <p className="text-slate-300 mt-2"><strong>Always conduct your own research and consult with qualified licensed professionals before making any investment decisions.</strong> Past performance does not guarantee future results. Investing involves risk, including potential loss of principal.</p>
        </div>
      </section>

      <section>
        <h2 className="text-xl font-bold text-cyan-400">9. Service Availability & Modifications</h2>
        <p className="text-slate-300">We strive for 99.9% uptime but do not guarantee uninterrupted service. We reserve the right to:</p>
        <ul className="list-disc list-inside text-slate-300 ml-4">
          <li>Modify, suspend, or discontinue any part of the Service with reasonable notice</li>
          <li>Perform scheduled maintenance (typically during off-peak hours with advance notice)</li>
          <li>Update features, pricing, and functionality to improve the Service</li>
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-bold text-cyan-400">10. Limitation of Liability</h2>
        <p className="text-slate-300">TO THE MAXIMUM EXTENT PERMITTED BY LAW, FINPULSE TECHNOLOGIES SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING BUT NOT LIMITED TO:</p>
        <ul className="list-disc list-inside text-slate-300 ml-4">
          <li>Loss of profits, revenue, data, or business opportunities</li>
          <li>Investment losses based on information from the Service</li>
          <li>Service interruptions or data breaches beyond our reasonable control</li>
          <li>Third-party actions or content</li>
        </ul>
        <p className="text-slate-300 mt-2">Our total aggregate liability shall not exceed the greater of (a) the amount you paid us in the 12 months preceding the claim, or (b) $100 USD.</p>
      </section>

      <section>
        <h2 className="text-xl font-bold text-cyan-400">11. Indemnification</h2>
        <p className="text-slate-300">You agree to indemnify, defend, and hold harmless FinPulse Technologies, its officers, directors, employees, and agents from any claims, damages, losses, or expenses (including reasonable legal fees) arising from your use of the Service, violation of these Terms, or infringement of any third-party rights.</p>
      </section>

      <section>
        <h2 className="text-xl font-bold text-cyan-400">12. Termination</h2>
        <p className="text-slate-300">We may suspend or terminate your account immediately if you:</p>
        <ul className="list-disc list-inside text-slate-300 ml-4">
          <li>Violate these Terms or any applicable laws</li>
          <li>Engage in fraudulent, abusive, or harmful behavior</li>
          <li>Fail to pay subscription fees after the grace period</li>
        </ul>
        <p className="text-slate-300 mt-2">Upon termination, your right to access the Service ceases immediately. You may export your data before termination via Account Settings.</p>
      </section>

      <section>
        <h2 className="text-xl font-bold text-cyan-400">13. Governing Law & Dispute Resolution</h2>
        <p className="text-slate-300">These Terms are governed by the laws of the State of Delaware, United States, without regard to conflict of law principles. Any disputes shall be resolved through binding arbitration in accordance with the American Arbitration Association rules, except that either party may seek injunctive relief in court for intellectual property violations.</p>
        <p className="text-slate-300 mt-2"><strong>EU Users:</strong> Nothing in these Terms affects your statutory rights under applicable EU consumer protection laws.</p>
      </section>

      <section>
        <h2 className="text-xl font-bold text-cyan-400">14. Accessibility Commitment</h2>
        <p className="text-slate-300">FinPulse is committed to ensuring accessibility for all users. We strive to comply with WCAG 2.1 Level AA standards and applicable accessibility laws including the Americans with Disabilities Act (ADA) and the European Accessibility Act (EAA). See our <a href="#accessibility" className="text-cyan-400 hover:underline">Accessibility Statement</a> for details.</p>
      </section>

      <section>
        <h2 className="text-xl font-bold text-cyan-400">15. Privacy</h2>
        <p className="text-slate-300">Your privacy is important to us. Please review our <a href="#privacy" className="text-cyan-400 hover:underline">Privacy Policy</a> to understand how we collect, use, and protect your information. By using the Service, you consent to our data practices as described in the Privacy Policy.</p>
      </section>

      <section>
        <h2 className="text-xl font-bold text-cyan-400">16. Changes to Terms</h2>
        <p className="text-slate-300">We reserve the right to modify these Terms at any time. For material changes, we will provide at least 30 days' notice via email or in-app notification. Your continued use of the Service after the effective date constitutes acceptance of the updated Terms.</p>
      </section>

      <section>
        <h2 className="text-xl font-bold text-cyan-400">17. Severability</h2>
        <p className="text-slate-300">If any provision of these Terms is found to be unenforceable, the remaining provisions will continue in full force and effect.</p>
      </section>

      <section>
        <h2 className="text-xl font-bold text-cyan-400">18. Contact Information</h2>
        <p className="text-slate-300">For questions about these Terms, contact us:</p>
        <ul className="list-disc list-inside text-slate-300 ml-4">
          <li>General Support: <a href="mailto:support@finpulse.me" className="text-cyan-400 hover:underline">support@finpulse.me</a></li>
          <li>Billing Inquiries: <a href="mailto:billing@finpulse.me" className="text-cyan-400 hover:underline">billing@finpulse.me</a></li>
          <li>Legal Notices: <a href="mailto:legal@finpulse.me" className="text-cyan-400 hover:underline">legal@finpulse.me</a></li>
        </ul>
      </section>

      <section className="mt-8 pt-6 border-t border-white/10">
        <p className="text-xs text-slate-500">
          FinPulse Technologies • Effective: January 8, 2026 • Version 2.0
        </p>
      </section>
    </div>
  </LegalPageWrapper>
);

export const PrivacyPolicy: React.FC<LegalPageProps> = ({ onBack }) => (
  <LegalPageWrapper onBack={onBack}>
    <h1 className="text-4xl font-black mb-2">Privacy Policy</h1>
    <p className="text-slate-400 mb-8">Effective Date: January 8, 2026 | Last Updated: January 8, 2026</p>
    
    <div className="prose prose-invert prose-slate max-w-none space-y-6">
      <section>
        <p className="text-slate-300">FinPulse Technologies ("FinPulse," "we," "us," or "our") respects your privacy and is committed to protecting your personal data. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our portfolio tracking platform ("Service").</p>
        <p className="text-slate-300 mt-2">This policy complies with the General Data Protection Regulation (GDPR), the California Consumer Privacy Act (CCPA), the California Privacy Rights Act (CPRA), and other applicable data protection laws.</p>
      </section>

      <section>
        <h2 className="text-xl font-bold text-cyan-400">1. Information We Collect</h2>
        <h3 className="text-lg font-semibold text-white mt-4">1.1 Information You Provide Directly</h3>
        <ul className="list-disc list-inside text-slate-300 ml-4">
          <li><strong>Account Information:</strong> Name, email address, and password (hashed)</li>
          <li><strong>Profile Data:</strong> Display name, preferences, timezone, and currency settings</li>
          <li><strong>Portfolio Data:</strong> Assets, quantities, purchase prices, and transaction history you enter</li>
          <li><strong>Payment Information:</strong> Processed and stored by our payment processors (Paddle/Stripe); we do not store full card numbers</li>
          <li><strong>Communications:</strong> Support tickets, feedback, and correspondence with our team</li>
          <li><strong>Community Content:</strong> Posts, comments, and strategies you share publicly</li>
        </ul>
        
        <h3 className="text-lg font-semibold text-white mt-4">1.2 Information Collected Automatically</h3>
        <ul className="list-disc list-inside text-slate-300 ml-4">
          <li><strong>Device Information:</strong> Browser type, operating system, device identifiers</li>
          <li><strong>Usage Data:</strong> Features accessed, pages viewed, actions taken, timestamps</li>
          <li><strong>Log Data:</strong> IP address, access times, error logs, referring URLs</li>
          <li><strong>Location Data:</strong> General geographic location derived from IP address (not precise GPS)</li>
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-bold text-cyan-400">2. How We Use Your Information</h2>
        <p className="text-slate-300">We process your data based on the following legal bases (GDPR Article 6):</p>
        <ul className="list-disc list-inside text-slate-300 ml-4">
          <li><strong>Contract Performance:</strong> To provide, maintain, and improve the Service</li>
          <li><strong>Legitimate Interests:</strong> To analyze usage, prevent fraud, and enhance security</li>
          <li><strong>Consent:</strong> For marketing communications (you can opt out anytime)</li>
          <li><strong>Legal Obligations:</strong> To comply with laws and respond to legal requests</li>
        </ul>
        <p className="text-slate-300 mt-2">Specifically, we use your information to:</p>
        <ul className="list-disc list-inside text-slate-300 ml-4">
          <li>Create and manage your account</li>
          <li>Process subscriptions and payments</li>
          <li>Provide AI-powered insights (queries are processed but not stored with personal identifiers)</li>
          <li>Send transactional emails (password resets, billing receipts)</li>
          <li>Send promotional communications (with your consent)</li>
          <li>Respond to support requests</li>
          <li>Detect and prevent fraud and abuse</li>
          <li>Improve our Service through aggregated analytics</li>
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-bold text-cyan-400">3. Data Sharing & Third Parties</h2>
        <p className="text-slate-300"><strong>We do NOT sell your personal data.</strong> We share data only with:</p>
        <ul className="list-disc list-inside text-slate-300 ml-4">
          <li><strong>Paddle / Stripe:</strong> Payment processing (PCI-DSS compliant)</li>
          <li><strong>Amazon Web Services (AWS):</strong> Cloud infrastructure and data storage (US-East region)</li>
          <li><strong>AWS Cognito:</strong> Authentication and user management</li>
          <li><strong>Google (Gemini AI):</strong> AI features — queries are sent without personal identifiers</li>
          <li><strong>Cloudflare:</strong> CDN, DDoS protection, and performance optimization</li>
        </ul>
        <p className="text-slate-300 mt-2">We require all third-party processors to maintain appropriate security measures and process data only as instructed.</p>
      </section>

      <section>
        <h2 className="text-xl font-bold text-cyan-400">4. Cookies & Tracking Technologies</h2>
        <p className="text-slate-300">We use the following categories of cookies:</p>
        <ul className="list-disc list-inside text-slate-300 ml-4">
          <li><strong>Strictly Necessary:</strong> Authentication tokens, session management, security cookies (cannot be disabled)</li>
          <li><strong>Functional:</strong> User preferences (theme, language, currency)</li>
          <li><strong>Analytics:</strong> Aggregated usage statistics to improve the Service (anonymized)</li>
          <li><strong>Marketing:</strong> Meta Pixel for advertising attribution and campaign optimization (opt-in only)</li>
        </ul>
        <p className="text-slate-300 mt-2">Marketing cookies (Meta Pixel) are loaded <strong>only after you provide explicit consent</strong> via our cookie banner. You can withdraw consent at any time through your browser settings or by clearing site data. We do NOT sell your personal data or use it for cross-site behavioral advertising beyond campaign attribution.</p>
      </section>

      <section>
        <h2 className="text-xl font-bold text-cyan-400">5. Data Security</h2>
        <p className="text-slate-300">We implement industry-standard security measures:</p>
        <ul className="list-disc list-inside text-slate-300 ml-4">
          <li>TLS 1.3 encryption for all data in transit</li>
          <li>AES-256 encryption for data at rest</li>
          <li>Secure authentication via AWS Cognito with bcrypt password hashing</li>
          <li>Regular security audits and penetration testing</li>
          <li>Access controls and principle of least privilege</li>
          <li>Multi-factor authentication (MFA) available for all accounts</li>
        </ul>
        <p className="text-slate-300 mt-2">While we strive to protect your data, no system is 100% secure. Please use a strong, unique password and enable MFA.</p>
      </section>

      <section>
        <h2 className="text-xl font-bold text-cyan-400">6. Data Retention</h2>
        <ul className="list-disc list-inside text-slate-300 ml-4">
          <li><strong>Active Accounts:</strong> Data retained while your account is active</li>
          <li><strong>Deleted Accounts:</strong> Personal data deleted within 30 days; backups purged within 90 days</li>
          <li><strong>Legal Holds:</strong> Data may be retained longer if required by law or for dispute resolution</li>
          <li><strong>Anonymized Data:</strong> Aggregated, non-identifiable data may be retained indefinitely for analytics</li>
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-bold text-cyan-400">7. Your Privacy Rights</h2>
        
        <h3 className="text-lg font-semibold text-white mt-4">7.1 Rights Under GDPR (EU/EEA/UK Residents)</h3>
        <ul className="list-disc list-inside text-slate-300 ml-4">
          <li><strong>Right of Access:</strong> Obtain a copy of your personal data</li>
          <li><strong>Right to Rectification:</strong> Correct inaccurate or incomplete data</li>
          <li><strong>Right to Erasure:</strong> Request deletion of your data ("right to be forgotten")</li>
          <li><strong>Right to Restrict Processing:</strong> Limit how we use your data</li>
          <li><strong>Right to Data Portability:</strong> Receive your data in a structured, machine-readable format</li>
          <li><strong>Right to Object:</strong> Object to processing based on legitimate interests</li>
          <li><strong>Right to Withdraw Consent:</strong> Withdraw consent at any time without affecting prior processing</li>
          <li><strong>Right to Lodge a Complaint:</strong> File a complaint with your local data protection authority</li>
        </ul>

        <h3 className="text-lg font-semibold text-white mt-4">7.2 Rights Under CCPA/CPRA (California Residents)</h3>
        <ul className="list-disc list-inside text-slate-300 ml-4">
          <li><strong>Right to Know:</strong> Request disclosure of personal information collected, used, and shared</li>
          <li><strong>Right to Delete:</strong> Request deletion of your personal information</li>
          <li><strong>Right to Correct:</strong> Request correction of inaccurate information</li>
          <li><strong>Right to Opt-Out:</strong> Opt-out of "sale" or "sharing" of personal information (we do not sell your data)</li>
          <li><strong>Right to Non-Discrimination:</strong> We will not discriminate against you for exercising your rights</li>
        </ul>

        <div className="mt-4 p-4 bg-cyan-500/10 border border-cyan-500/30 rounded-xl">
          <h3 className="font-bold text-cyan-400 mb-2">How to Exercise Your Rights</h3>
          <p className="text-slate-300 mb-2">
            <strong>Self-Service Options:</strong><br/>
            • <strong>Download My Data:</strong> Settings → Account → "Download My Data" (JSON export)<br/>
            • <strong>Delete Account:</strong> Settings → Account → "Delete Account" (permanent, irreversible)
          </p>
          <p className="text-slate-300">
            <strong>Contact Us:</strong><br/>
            • Email: <a href="mailto:privacy@finpulse.me" className="text-cyan-400 hover:underline">privacy@finpulse.me</a><br/>
            • Data Protection Officer: <a href="mailto:dpo@finpulse.me" className="text-cyan-400 hover:underline">dpo@finpulse.me</a>
          </p>
          <p className="text-slate-300 mt-2">We will respond to verified requests within 30 days (GDPR) or 45 days (CCPA).</p>
        </div>
      </section>

      <section>
        <h2 className="text-xl font-bold text-cyan-400">8. International Data Transfers</h2>
        <p className="text-slate-300">Your data may be transferred to and processed in the United States. For transfers from the EU/EEA/UK, we rely on:</p>
        <ul className="list-disc list-inside text-slate-300 ml-4">
          <li>Standard Contractual Clauses (SCCs) approved by the European Commission</li>
          <li>Data Processing Agreements with all third-party processors</li>
          <li>Additional safeguards as required by applicable law</li>
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-bold text-cyan-400">9. Children's Privacy</h2>
        <p className="text-slate-300">FinPulse is not intended for users under 18 years of age. We do not knowingly collect personal information from children. If you believe a child has provided us with personal data, please contact us immediately at <a href="mailto:privacy@finpulse.me" className="text-cyan-400 hover:underline">privacy@finpulse.me</a>.</p>
      </section>

      <section>
        <h2 className="text-xl font-bold text-cyan-400">10. Changes to This Policy</h2>
        <p className="text-slate-300">We may update this Privacy Policy periodically. For material changes, we will notify you via email or in-app notification at least 30 days before the changes take effect. Your continued use of the Service constitutes acceptance of the updated policy.</p>
      </section>

      <section>
        <h2 className="text-xl font-bold text-cyan-400">11. Contact Us</h2>
        <p className="text-slate-300">For privacy-related inquiries:</p>
        <ul className="list-disc list-inside text-slate-300 ml-4">
          <li>Privacy Team: <a href="mailto:privacy@finpulse.me" className="text-cyan-400 hover:underline">privacy@finpulse.me</a></li>
          <li>Data Protection Officer: <a href="mailto:dpo@finpulse.me" className="text-cyan-400 hover:underline">dpo@finpulse.me</a></li>
          <li>General Support: <a href="mailto:support@finpulse.me" className="text-cyan-400 hover:underline">support@finpulse.me</a></li>
        </ul>
      </section>

      <section className="mt-8 pt-6 border-t border-white/10">
        <p className="text-xs text-slate-500">
          FinPulse Technologies • Effective: January 8, 2026 • Version 2.0
        </p>
      </section>
    </div>
  </LegalPageWrapper>
);

export const PricingPage: React.FC<LegalPageProps> = ({ onBack }) => (
  <div className="fixed inset-0 overflow-y-auto bg-[#0b0e14] text-white p-8 z-50">
    <div className="max-w-5xl mx-auto pb-8">
      <button onClick={onBack} className="flex items-center gap-2 text-cyan-400 mb-8 hover:underline" aria-label="Go back to FinPulse">
        <ArrowLeft className="w-4 h-4" aria-hidden="true" /> Back to FinPulse
      </button>
      <Logo className="h-10 mb-8" />
      <h1 className="text-4xl font-black mb-2 text-center">Simple, Transparent Pricing</h1>
      <p className="text-slate-400 mb-12 text-center">Choose the plan that fits your investment tracking needs</p>
      
      <div className="grid md:grid-cols-3 gap-8">
        {/* Free Plan */}
        <div className="bg-white/5 border border-white/10 rounded-3xl p-8" role="article" aria-labelledby="free-plan-title">
          <h3 id="free-plan-title" className="text-xl font-bold mb-2">Free</h3>
          <div className="text-4xl font-black mb-4">$0<span className="text-lg text-slate-400">/mo</span></div>
          <p className="text-slate-400 text-sm mb-6">Perfect for getting started</p>
          <ul className="space-y-3 mb-8" aria-label="Free plan features">
            <li className="flex items-center gap-2 text-slate-300"><span className="text-emerald-400" aria-hidden="true">✓</span> Up to 8 assets</li>
            <li className="flex items-center gap-2 text-slate-300"><span className="text-emerald-400" aria-hidden="true">✓</span> 5 AI queries/day</li>
            <li className="flex items-center gap-2 text-slate-300"><span className="text-emerald-400" aria-hidden="true">✓</span> Stocks & Crypto tracking</li>
            <li className="flex items-center gap-2 text-slate-300"><span className="text-emerald-400" aria-hidden="true">✓</span> Basic analytics</li>
            <li className="flex items-center gap-2 text-slate-300"><span className="text-emerald-400" aria-hidden="true">✓</span> Community access</li>
            <li className="flex items-center gap-2 text-slate-500"><span aria-hidden="true">✗</span> <span className="line-through">Commodities (Gold, Oil)</span></li>
          </ul>
          <button className="w-full py-3 bg-white/10 rounded-xl font-bold hover:bg-white/20 transition-colors" aria-label="Get started with Free plan">Get Started Free</button>
        </div>

        {/* ProPulse Plan */}
        <div className="bg-gradient-to-b from-cyan-500/10 to-blue-500/10 border-2 border-cyan-500/50 rounded-3xl p-8 relative" role="article" aria-labelledby="propulse-plan-title">
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-cyan-500 text-black text-xs font-bold px-4 py-1 rounded-full">MOST POPULAR</div>
          <h3 id="propulse-plan-title" className="text-xl font-bold mb-2">ProPulse</h3>
          <div className="text-4xl font-black mb-4">$9.90<span className="text-lg text-slate-400">/mo</span></div>
          <p className="text-slate-400 text-sm mb-6">For active investors</p>
          <ul className="space-y-3 mb-8" aria-label="ProPulse plan features">
            <li className="flex items-center gap-2 text-slate-300"><span className="text-emerald-400" aria-hidden="true">✓</span> Up to 20 assets</li>
            <li className="flex items-center gap-2 text-slate-300"><span className="text-emerald-400" aria-hidden="true">✓</span> 10 AI queries/day</li>
            <li className="flex items-center gap-2 text-slate-300"><span className="text-emerald-400" aria-hidden="true">✓</span> Commodities (Gold, Oil, etc.)</li>
            <li className="flex items-center gap-2 text-slate-300"><span className="text-emerald-400" aria-hidden="true">✓</span> CSV exports</li>
            <li className="flex items-center gap-2 text-slate-300"><span className="text-emerald-400" aria-hidden="true">✓</span> Multi-device sync</li>
            <li className="flex items-center gap-2 text-slate-300"><span className="text-emerald-400" aria-hidden="true">✓</span> Everything in Free</li>
          </ul>
          <button className="w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-xl font-bold hover:opacity-90 transition-opacity" aria-label="Upgrade to ProPulse plan for $9.90 per month">Upgrade to ProPulse</button>
        </div>

        {/* SuperPulse Plan */}
        <div className="bg-gradient-to-b from-purple-500/10 to-pink-500/10 border border-purple-500/30 rounded-3xl p-8" role="article" aria-labelledby="superpulse-plan-title">
          <h3 id="superpulse-plan-title" className="text-xl font-bold mb-2">SuperPulse</h3>
          <div className="text-4xl font-black mb-4">$29.90<span className="text-lg text-slate-400">/mo</span></div>
          <p className="text-slate-400 text-sm mb-6">For serious portfolio managers</p>
          <ul className="space-y-3 mb-8" aria-label="SuperPulse plan features">
            <li className="flex items-center gap-2 text-slate-300"><span className="text-emerald-400" aria-hidden="true">✓</span> Up to 50 assets</li>
            <li className="flex items-center gap-2 text-slate-300"><span className="text-emerald-400" aria-hidden="true">✓</span> 50 AI queries/day</li>
            <li className="flex items-center gap-2 text-slate-300"><span className="text-emerald-400" aria-hidden="true">✓</span> Premium analytics</li>
            <li className="flex items-center gap-2 text-slate-300"><span className="text-emerald-400" aria-hidden="true">✓</span> Priority support</li>
            <li className="flex items-center gap-2 text-slate-300"><span className="text-emerald-400" aria-hidden="true">✓</span> Ad-free experience</li>
            <li className="flex items-center gap-2 text-slate-300"><span className="text-emerald-400" aria-hidden="true">✓</span> Everything in ProPulse</li>
          </ul>
          <button className="w-full py-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl font-bold hover:opacity-90 transition-opacity" aria-label="Upgrade to SuperPulse plan for $29.90 per month">Go SuperPulse</button>
        </div>
      </div>

      <div className="mt-12 text-center text-slate-400 text-sm space-y-4">
        <p className="font-medium">✓ 14-day money-back guarantee • Cancel anytime • No hidden fees</p>
        <p>All prices in USD. Taxes may apply based on your location.</p>
        <p>Payments securely processed by <a href="https://paddle.com" target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline">Paddle</a> or <a href="https://stripe.com" target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline">Stripe</a></p>
      </div>

      <div className="mt-12 bg-white/5 border border-white/10 rounded-2xl p-6">
        <h2 className="text-lg font-bold mb-4">Frequently Asked Questions</h2>
        <div className="space-y-4">
          <div>
            <h3 className="font-semibold text-cyan-400">Can I change plans anytime?</h3>
            <p className="text-slate-300 text-sm">Yes! You can upgrade or downgrade at any time. Changes take effect at your next billing cycle.</p>
          </div>
          <div>
            <h3 className="font-semibold text-cyan-400">What payment methods do you accept?</h3>
            <p className="text-slate-300 text-sm">We accept all major credit cards, PayPal, and select regional payment methods through our payment processors.</p>
          </div>
          <div>
            <h3 className="font-semibold text-cyan-400">Is my payment information secure?</h3>
            <p className="text-slate-300 text-sm">Absolutely. We never see or store your full card details. All payments are processed by PCI-DSS compliant processors.</p>
          </div>
        </div>
      </div>
    </div>
  </div>
);

// Default export for lazy loading
export const LegalPages = { TermsOfService, PrivacyPolicy, PricingPage };
export default LegalPages;

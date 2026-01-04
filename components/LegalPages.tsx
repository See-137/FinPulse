import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { Logo } from '../constants';

interface LegalPageProps {
  onBack: () => void;
}

export const TermsOfService: React.FC<LegalPageProps> = ({ onBack }) => (
  <div className="min-h-screen bg-[#0b0e14] text-white p-8">
    <div className="max-w-3xl mx-auto">
      <button onClick={onBack} className="flex items-center gap-2 text-cyan-400 mb-8 hover:underline">
        <ArrowLeft className="w-4 h-4" /> Back to FinPulse
      </button>
      <Logo className="h-10 mb-8" />
      <h1 className="text-4xl font-black mb-2">Terms of Service</h1>
      <p className="text-slate-400 mb-8">Last updated: January 4, 2026</p>
      
      <div className="prose prose-invert prose-slate max-w-none space-y-6">
        <section>
          <h2 className="text-xl font-bold text-cyan-400">1. Agreement to Terms</h2>
          <p className="text-slate-300">By accessing or using FinPulse ("Service"), you agree to be bound by these Terms of Service. If you disagree with any part of the terms, you may not access the Service.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-cyan-400">2. Description of Service</h2>
          <p className="text-slate-300">FinPulse is a portfolio tracking platform that allows users to monitor cryptocurrency and stock investments. The Service includes:</p>
          <ul className="list-disc list-inside text-slate-300 ml-4">
            <li>Real-time price tracking for crypto and stocks</li>
            <li>AI-powered market insights</li>
            <li>Community features for sharing strategies</li>
            <li>Portfolio analytics and reporting</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold text-cyan-400">3. Subscription Plans</h2>
          <p className="text-slate-300">FinPulse offers the following plans:</p>
          <ul className="list-disc list-inside text-slate-300 ml-4">
            <li><strong>Free:</strong> Stocks & crypto tracking, up to 8 assets, 5 AI queries/day</li>
            <li><strong>ProPulse ($9.90/month):</strong> Add commodities, up to 20 assets, 10 AI queries/day</li>
            <li><strong>SuperPulse ($29.90/month):</strong> Premium analytics, up to 50 assets, 50 AI queries/day</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold text-cyan-400">4. Payment Terms</h2>
          <p className="text-slate-300">Payments are processed securely through Paddle.com, our Merchant of Record. By subscribing to a paid plan:</p>
          <ul className="list-disc list-inside text-slate-300 ml-4">
            <li>You authorize recurring monthly charges</li>
            <li>Prices are in USD and include applicable taxes</li>
            <li>Billing occurs on the same date each month</li>
            <li>You can cancel anytime from your account settings</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold text-cyan-400">5. Refund Policy</h2>
          <p className="text-slate-300">We offer a 14-day money-back guarantee for all paid subscriptions. If you're not satisfied, contact support@finpulse.me within 14 days of your purchase for a full refund. After 14 days, refunds are issued on a case-by-case basis.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-cyan-400">6. User Responsibilities</h2>
          <p className="text-slate-300">You agree to:</p>
          <ul className="list-disc list-inside text-slate-300 ml-4">
            <li>Provide accurate account information</li>
            <li>Maintain the security of your account</li>
            <li>Not use the Service for illegal purposes</li>
            <li>Not attempt to reverse engineer or hack the Service</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold text-cyan-400">7. Disclaimer</h2>
          <p className="text-slate-300"><strong>FinPulse does NOT provide financial advice.</strong> All information provided is for educational and informational purposes only. We are not licensed financial advisors. Always do your own research and consult with qualified professionals before making investment decisions.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-cyan-400">8. Limitation of Liability</h2>
          <p className="text-slate-300">FinPulse shall not be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use of the Service. Our total liability is limited to the amount you paid us in the past 12 months.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-cyan-400">9. Privacy</h2>
          <p className="text-slate-300">Your privacy is important to us. Please review our Privacy Policy at <a href="/privacy" className="text-cyan-400 hover:underline">finpulse.me/privacy</a> to understand how we collect and use your information.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-cyan-400">10. Changes to Terms</h2>
          <p className="text-slate-300">We reserve the right to modify these terms at any time. We will notify users of significant changes via email or in-app notification.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-cyan-400">11. Contact</h2>
          <p className="text-slate-300">For questions about these Terms, contact us at: <a href="mailto:support@finpulse.me" className="text-cyan-400 hover:underline">support@finpulse.me</a></p>
        </section>
      </div>
    </div>
  </div>
);

export const PrivacyPolicy: React.FC<LegalPageProps> = ({ onBack }) => (
  <div className="min-h-screen bg-[#0b0e14] text-white p-8">
    <div className="max-w-3xl mx-auto">
      <button onClick={onBack} className="flex items-center gap-2 text-cyan-400 mb-8 hover:underline">
        <ArrowLeft className="w-4 h-4" /> Back to FinPulse
      </button>
      <Logo className="h-10 mb-8" />
      <h1 className="text-4xl font-black mb-2">Privacy Policy</h1>
      <p className="text-slate-400 mb-8">Last updated: January 4, 2026</p>
      
      <div className="prose prose-invert prose-slate max-w-none space-y-6">
        <section>
          <h2 className="text-xl font-bold text-cyan-400">1. Information We Collect</h2>
          <p className="text-slate-300">We collect information you provide directly:</p>
          <ul className="list-disc list-inside text-slate-300 ml-4">
            <li>Account information (name, email)</li>
            <li>Portfolio data you enter (assets, quantities)</li>
            <li>Payment information (processed by Paddle)</li>
            <li>Communications with our support team</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold text-cyan-400">2. Automatically Collected Information</h2>
          <ul className="list-disc list-inside text-slate-300 ml-4">
            <li>Device information and browser type</li>
            <li>IP address and general location</li>
            <li>Usage data and feature interactions</li>
            <li>Cookies for session management</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold text-cyan-400">3. How We Use Your Information</h2>
          <ul className="list-disc list-inside text-slate-300 ml-4">
            <li>To provide and maintain the Service</li>
            <li>To process payments and subscriptions</li>
            <li>To send important updates and notifications</li>
            <li>To improve our Service and develop new features</li>
            <li>To respond to support requests</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold text-cyan-400">4. Data Sharing</h2>
          <p className="text-slate-300">We do NOT sell your personal data. We share data only with:</p>
          <ul className="list-disc list-inside text-slate-300 ml-4">
            <li><strong>Paddle:</strong> Payment processing</li>
            <li><strong>AWS:</strong> Cloud infrastructure</li>
            <li><strong>Google (Gemini):</strong> AI features (anonymized queries)</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold text-cyan-400">5. Data Security</h2>
          <p className="text-slate-300">We implement industry-standard security measures including encryption in transit (TLS), secure authentication via AWS Cognito, and regular security audits.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-cyan-400">6. Your Rights</h2>
          <p className="text-slate-300">You have the right to:</p>
          <ul className="list-disc list-inside text-slate-300 ml-4">
            <li>Access your personal data</li>
            <li>Correct inaccurate data</li>
            <li>Delete your account and data</li>
            <li>Export your portfolio data</li>
            <li>Opt out of marketing communications</li>
          </ul>
          <p className="text-slate-300 mt-4">
            <strong>GDPR (EU residents):</strong> You have additional rights under the General Data Protection Regulation, including the right to data portability and the right to object to processing.
          </p>
          <p className="text-slate-300 mt-2">
            <strong>CCPA (California residents):</strong> You have the right to know what personal information is collected, request deletion, and opt-out of the "sale" of personal information (we do not sell your data).
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-cyan-400">7. Data Retention</h2>
          <p className="text-slate-300">We retain your data as long as your account is active. Upon account deletion, we remove your personal data within 90 days, except where required by law for compliance, dispute resolution, or fraud prevention.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-cyan-400">8. Cookies & Tracking</h2>
          <p className="text-slate-300">We use essential cookies for:</p>
          <ul className="list-disc list-inside text-slate-300 ml-4">
            <li><strong>Authentication:</strong> Session management and login state</li>
            <li><strong>Preferences:</strong> Theme, language, and currency settings</li>
            <li><strong>Security:</strong> Fraud prevention and secure access</li>
          </ul>
          <p className="text-slate-300 mt-4">
            We do not use third-party advertising cookies or tracking pixels. You can manage cookies through your browser settings.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-cyan-400">9. International Data Transfers</h2>
          <p className="text-slate-300">
            Your data may be transferred to and processed in the United States and other countries where our service providers operate. We ensure appropriate safeguards are in place to protect your data in accordance with this Privacy Policy and applicable law.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-cyan-400">10. Contact</h2>
          <p className="text-slate-300">For privacy concerns, contact: <a href="mailto:privacy@finpulse.me" className="text-cyan-400 hover:underline">privacy@finpulse.me</a></p>
          <p className="text-slate-300 mt-2">To exercise your rights under GDPR or CCPA, email: <a href="mailto:dpo@finpulse.me" className="text-cyan-400 hover:underline">dpo@finpulse.me</a></p>
        </section>
      </div>
    </div>
  </div>
);

export const PricingPage: React.FC<LegalPageProps> = ({ onBack }) => (
  <div className="min-h-screen bg-[#0b0e14] text-white p-8">
    <div className="max-w-5xl mx-auto">
      <button onClick={onBack} className="flex items-center gap-2 text-cyan-400 mb-8 hover:underline">
        <ArrowLeft className="w-4 h-4" /> Back to FinPulse
      </button>
      <Logo className="h-10 mb-8" />
      <h1 className="text-4xl font-black mb-2 text-center">Simple, Transparent Pricing</h1>
      <p className="text-slate-400 mb-12 text-center">Choose the plan that fits your trading style</p>
      
      <div className="grid md:grid-cols-3 gap-8">
        {/* Free Plan */}
        <div className="bg-white/5 border border-white/10 rounded-3xl p-8">
          <h3 className="text-xl font-bold mb-2">Free</h3>
          <div className="text-4xl font-black mb-4">$0<span className="text-lg text-slate-400">/mo</span></div>
          <ul className="space-y-3 mb-8">
            <li className="flex items-center gap-2 text-slate-300">✓ Up to 8 assets</li>
            <li className="flex items-center gap-2 text-slate-300">✓ 5 AI queries/day</li>
            <li className="flex items-center gap-2 text-slate-300">✓ Stocks & Crypto tracking</li>
            <li className="flex items-center gap-2 text-slate-300">✓ Basic analytics</li>
            <li className="flex items-center gap-2 text-slate-300">✓ Community access</li>
            <li className="flex items-center gap-2 text-slate-400">✗ Commodities (Gold, Oil)</li>
          </ul>
          <button className="w-full py-3 bg-white/10 rounded-xl font-bold">Get Started Free</button>
        </div>

        {/* ProPulse Plan */}
        <div className="bg-gradient-to-b from-cyan-500/10 to-blue-500/10 border-2 border-cyan-500/50 rounded-3xl p-8 relative">
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-cyan-500 text-black text-xs font-bold px-4 py-1 rounded-full">MOST POPULAR</div>
          <h3 className="text-xl font-bold mb-2">ProPulse</h3>
          <div className="text-4xl font-black mb-4">$9.90<span className="text-lg text-slate-400">/mo</span></div>
          <ul className="space-y-3 mb-8">
            <li className="flex items-center gap-2 text-slate-300">✓ Up to 20 assets</li>
            <li className="flex items-center gap-2 text-slate-300">✓ 10 AI queries/day</li>
            <li className="flex items-center gap-2 text-slate-300">✓ Commodities (Gold, Oil, etc.)</li>
            <li className="flex items-center gap-2 text-slate-300">✓ CSV exports</li>
            <li className="flex items-center gap-2 text-slate-300">✓ Everything in Free</li>
          </ul>
          <button className="w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-xl font-bold">Upgrade to ProPulse</button>
        </div>

        {/* SuperPulse Plan */}
        <div className="bg-gradient-to-b from-purple-500/10 to-pink-500/10 border border-purple-500/30 rounded-3xl p-8">
          <h3 className="text-xl font-bold mb-2">SuperPulse</h3>
          <div className="text-4xl font-black mb-4">$29.90<span className="text-lg text-slate-400">/mo</span></div>
          <ul className="space-y-3 mb-8">
            <li className="flex items-center gap-2 text-slate-300">✓ Up to 50 assets</li>
            <li className="flex items-center gap-2 text-slate-300">✓ 50 AI queries/day</li>
            <li className="flex items-center gap-2 text-slate-300">✓ Premium analytics</li>
            <li className="flex items-center gap-2 text-slate-300">✓ Priority support</li>
            <li className="flex items-center gap-2 text-slate-300">✓ Ad-free experience</li>
            <li className="flex items-center gap-2 text-slate-300">✓ Everything in ProPulse</li>
          </ul>
          <button className="w-full py-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl font-bold">Go SuperPulse</button>
        </div>
      </div>

      <div className="mt-12 text-center text-slate-400 text-sm">
        <p>All plans include a 14-day money-back guarantee • Cancel anytime</p>
        <p className="mt-2">Payments securely processed by Stripe</p>
      </div>
    </div>
  </div>
);

// Default export for lazy loading
export default { TermsOfService, PrivacyPolicy, PricingPage };

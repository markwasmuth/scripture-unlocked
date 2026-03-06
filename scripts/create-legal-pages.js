const fs = require('fs');
const path = require('path');

const privacyDir = path.join(__dirname, '../src/app/privacy-policy');
const termsDir = path.join(__dirname, '../src/app/terms');

fs.mkdirSync(privacyDir, { recursive: true });
fs.mkdirSync(termsDir, { recursive: true });

const privacyPage = `import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy — Scripture Unlocked',
  description: 'Privacy Policy for Scripture Unlocked',
};

export default function PrivacyPolicy() {
  return (
    <main style={{ maxWidth: '720px', margin: '0 auto', padding: '2rem 1.5rem', fontFamily: 'system-ui, sans-serif', color: '#1a1a2e', lineHeight: 1.7 }}>
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.8rem', fontWeight: 700, color: '#1a1a2e' }}>Privacy Policy</h1>
        <p style={{ color: '#666' }}>Scripture Unlocked · Last updated: March 2026</p>
      </div>

      <section>
        <h2>1. Information We Collect</h2>
        <p>Scripture Unlocked collects minimal information necessary to provide the service:</p>
        <ul>
          <li><strong>Usage data:</strong> Anonymous analytics about which studies are viewed and features used.</li>
          <li><strong>Device data:</strong> Standard technical data (device type, OS version) collected by our hosting provider.</li>
          <li><strong>No account required:</strong> The app does not require account creation. We do not collect names, email addresses, or personal identifiers unless you voluntarily contact us.</li>
        </ul>
      </section>

      <section>
        <h2>2. How We Use Information</h2>
        <p>We use collected information solely to:</p>
        <ul>
          <li>Improve app performance and content quality</li>
          <li>Understand which Bible studies and features are most helpful</li>
          <li>Diagnose technical issues</li>
        </ul>
        <p>We do not sell, rent, or share your data with third parties for marketing purposes.</p>
      </section>

      <section>
        <h2>3. Third-Party Services</h2>
        <p>Scripture Unlocked uses the following third-party services:</p>
        <ul>
          <li><strong>Anthropic Claude API:</strong> Powers AI-generated Bible commentary and Q&amp;A. Text you submit for study is processed by Anthropic. See <a href="https://www.anthropic.com/privacy" target="_blank" rel="noopener">Anthropic&apos;s Privacy Policy</a>.</li>
          <li><strong>ElevenLabs:</strong> Powers the &quot;Listen&quot; audio mode. Text is sent to ElevenLabs for text-to-speech conversion. See <a href="https://elevenlabs.io/privacy-policy" target="_blank" rel="noopener">ElevenLabs&apos; Privacy Policy</a>.</li>
          <li><strong>Vercel:</strong> Hosts the app. Standard server logs may be retained per Vercel&apos;s policy.</li>
        </ul>
      </section>

      <section>
        <h2>4. Data Retention</h2>
        <p>We do not store Bible study queries or chat conversations on our servers beyond the immediate session. No conversation history is retained after your session ends.</p>
      </section>

      <section>
        <h2>5. Children&apos;s Privacy</h2>
        <p>Scripture Unlocked is designed for general audiences including families. We do not knowingly collect personal information from children under 13. If you believe we have inadvertently collected such information, contact us immediately.</p>
      </section>

      <section>
        <h2>6. Your Rights</h2>
        <p>Since we collect minimal identifying information, there is little personal data to access, correct, or delete. If you have concerns, contact us at the address below.</p>
      </section>

      <section>
        <h2>7. Changes to This Policy</h2>
        <p>We may update this Privacy Policy from time to time. We will post the updated policy on this page with a revised date.</p>
      </section>

      <section>
        <h2>8. Contact</h2>
        <p>Questions about this policy? Contact us at:<br />
        <strong>Smart Brands Inc.</strong><br />
        Email: <a href="mailto:support@scriptureunlocked.app">support@scriptureunlocked.app</a></p>
      </section>

      <div style={{ marginTop: '3rem', paddingTop: '1.5rem', borderTop: '1px solid #eee', textAlign: 'center', color: '#888', fontSize: '0.9rem' }}>
        <p><em>&quot;Never follow me. Follow the Word of God.&quot;</em></p>
        <p>&copy; 2026 Scripture Unlocked &middot; Smart Brands Inc.</p>
      </div>
    </main>
  );
}
`;

const termsPage = `import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Service — Scripture Unlocked',
  description: 'Terms of Service for Scripture Unlocked',
};

export default function TermsOfService() {
  return (
    <main style={{ maxWidth: '720px', margin: '0 auto', padding: '2rem 1.5rem', fontFamily: 'system-ui, sans-serif', color: '#1a1a2e', lineHeight: 1.7 }}>
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.8rem', fontWeight: 700, color: '#1a1a2e' }}>Terms of Service</h1>
        <p style={{ color: '#666' }}>Scripture Unlocked · Last updated: March 2026</p>
      </div>

      <section>
        <h2>1. Acceptance of Terms</h2>
        <p>By using Scripture Unlocked (&quot;the App&quot;), you agree to these Terms of Service. If you do not agree, do not use the App.</p>
      </section>

      <section>
        <h2>2. Description of Service</h2>
        <p>Scripture Unlocked is an interactive Bible study application that provides AI-powered commentary, verse exploration, and audio narration through biblical avatars (Moses, Elijah, Deborah). The App is intended to supplement — not replace — personal Bible study and pastoral guidance.</p>
      </section>

      <section>
        <h2>3. AI-Generated Content Disclaimer</h2>
        <p>Scripture Unlocked uses artificial intelligence to generate Bible commentary, explanations, and Q&amp;A responses. This content:</p>
        <ul>
          <li>Is for educational and devotional purposes only</li>
          <li>Is <strong>not</strong> official theological doctrine</li>
          <li>May contain errors or interpretive perspectives — always verify against Scripture</li>
          <li>Does not constitute pastoral, legal, or professional advice</li>
        </ul>
        <p>We encourage users to read the Bible directly and consult their church leaders for authoritative guidance.</p>
      </section>

      <section>
        <h2>4. Acceptable Use</h2>
        <p>You agree to use the App for lawful, personal, and educational purposes only. You may not:</p>
        <ul>
          <li>Use the App to generate content that is abusive, defamatory, or harmful</li>
          <li>Attempt to reverse-engineer, scrape, or exploit the App&apos;s APIs</li>
          <li>Use the App in any way that violates applicable law</li>
        </ul>
      </section>

      <section>
        <h2>5. Intellectual Property</h2>
        <p>The Scripture Unlocked name, logo, avatar designs, and original content are owned by Smart Brands Inc. Bible text (KJV) is in the public domain. AI-generated commentary is provided for personal use and may not be reproduced for commercial purposes without permission.</p>
      </section>

      <section>
        <h2>6. Limitation of Liability</h2>
        <p>Scripture Unlocked is provided &quot;as is&quot; without warranties of any kind. Smart Brands Inc. is not liable for any damages arising from your use of the App, reliance on AI-generated content, or service interruptions.</p>
      </section>

      <section>
        <h2>7. Modifications</h2>
        <p>We reserve the right to modify these Terms at any time. Continued use of the App after changes constitutes acceptance of the updated Terms.</p>
      </section>

      <section>
        <h2>8. Governing Law</h2>
        <p>These Terms are governed by the laws of the State of North Carolina, United States.</p>
      </section>

      <section>
        <h2>9. Contact</h2>
        <p>Questions about these Terms? Contact us at:<br />
        <strong>Smart Brands Inc.</strong><br />
        Email: <a href="mailto:support@scriptureunlocked.app">support@scriptureunlocked.app</a></p>
      </section>

      <div style={{ marginTop: '3rem', paddingTop: '1.5rem', borderTop: '1px solid #eee', textAlign: 'center', color: '#888', fontSize: '0.9rem' }}>
        <p><em>&quot;Never follow me. Follow the Word of God.&quot;</em></p>
        <p>&copy; 2026 Scripture Unlocked &middot; Smart Brands Inc.</p>
      </div>
    </main>
  );
}
`;

fs.writeFileSync(path.join(privacyDir, 'page.tsx'), privacyPage, 'utf8');
fs.writeFileSync(path.join(termsDir, 'page.tsx'), termsPage, 'utf8');
console.log('Written: src/app/privacy-policy/page.tsx');
console.log('Written: src/app/terms/page.tsx');

import type { Metadata } from 'next';

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

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sources & Acknowledgments — Scripture Unlocked',
  description: 'Study sources, reference tools, and acknowledgments for Scripture Unlocked',
};

export default function Sources() {
  return (
    <main style={{ maxWidth: '720px', margin: '0 auto', padding: '2rem 1.5rem', fontFamily: 'Georgia, serif', color: '#F5F0E0', lineHeight: 1.8, background: '#14142E', minHeight: '100vh' }}>
      <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
        <a href="/" style={{ color: '#D4AE39', textDecoration: 'none', fontSize: '0.85rem' }}>← Back to Scripture Unlocked</a>
        <h1 style={{ fontSize: '1.8rem', fontWeight: 700, color: '#D4AE39', marginTop: '1rem', fontFamily: 'Playfair Display SC, serif' }}>Sources & Acknowledgments</h1>
        <p style={{ color: '#F5F0E0', opacity: 0.6, fontSize: '0.9rem' }}>Scripture Unlocked · 2026</p>
      </div>

      {/* Disclaimer */}
      <section style={{ background: 'rgba(212, 174, 57, 0.08)', border: '1px solid rgba(212, 174, 57, 0.2)', borderRadius: '12px', padding: '1.5rem', marginBottom: '2rem' }}>
        <p style={{ fontSize: '1rem', fontStyle: 'italic', textAlign: 'center', margin: 0 }}>
          Never trust any man&apos;s interpretation — including what you read here — without checking it against God&apos;s Word yourself. Open your Bible. Read the verses. Let the Holy Spirit teach you. Every teacher is fallible. Only God&apos;s Word is infallible. We are all just students trying to be what God created us to be.
        </p>
      </section>

      {/* Primary Authority */}
      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.3rem', color: '#D4AE39', borderBottom: '1px solid rgba(212, 174, 57, 0.2)', paddingBottom: '0.5rem' }}>The Foundation</h2>
        <p>
          God&apos;s Word is the ultimate authority — and the Holy Spirit is your teacher. The <strong>King James Version</strong> is the most faithful English translation of the original Hebrew and Greek manuscripts, and it is the foundation of every study in this app. No man&apos;s interpretation supersedes what God said.
        </p>
      </section>

      {/* Study Tools */}
      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.3rem', color: '#D4AE39', borderBottom: '1px solid rgba(212, 174, 57, 0.2)', paddingBottom: '0.5rem' }}>Study Tools</h2>
        <p style={{ marginBottom: '1rem' }}>The following trusted reference works help unlock what God said in the original Hebrew and Greek. These are the tools that serious students of God&apos;s Word have relied on for generations:</p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '8px', padding: '1rem' }}>
            <strong style={{ color: '#D4AE39' }}>Strong&apos;s Exhaustive Concordance</strong>
            <p style={{ margin: '0.25rem 0 0', fontSize: '0.9rem', opacity: 0.85 }}>The original Hebrew and Greek definitions behind every English word in the KJV. When you see a Strong&apos;s number in the study, it points you to what God actually said in the original language.</p>
          </div>

          <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '8px', padding: '1rem' }}>
            <strong style={{ color: '#D4AE39' }}>The Companion Bible by E.W. Bullinger</strong>
            <p style={{ margin: '0.25rem 0 0', fontSize: '0.9rem', opacity: 0.85 }}>Structural notes, figures of speech, and textual analysis that illuminate the original text. One of the most trusted reference works in verse-by-verse Bible study.</p>
          </div>

          <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '8px', padding: '1rem' }}>
            <strong style={{ color: '#D4AE39' }}>Green&apos;s Interlinear Bible</strong>
            <p style={{ margin: '0.25rem 0 0', fontSize: '0.9rem', opacity: 0.85 }}>Word-for-word original Hebrew and Greek text alongside the English translation, allowing the student to see exactly what was written.</p>
          </div>

          <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '8px', padding: '1rem' }}>
            <strong style={{ color: '#D4AE39' }}>Smith&apos;s Bible Dictionary</strong>
            <p style={{ margin: '0.25rem 0 0', fontSize: '0.9rem', opacity: 0.85 }}>Historical, geographical, and cultural context for places, people, and customs referenced throughout Scripture.</p>
          </div>

          <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '8px', padding: '1rem' }}>
            <strong style={{ color: '#D4AE39' }}>Webster&apos;s 1828 Dictionary</strong>
            <p style={{ margin: '0.25rem 0 0', fontSize: '0.9rem', opacity: 0.85 }}>Original English word definitions as they were understood when the KJV was translated — the closest English dictionary to the translators&apos; intent.</p>
          </div>
        </div>
      </section>

      {/* Acknowledgment */}
      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.3rem', color: '#D4AE39', borderBottom: '1px solid rgba(212, 174, 57, 0.2)', paddingBottom: '0.5rem' }}>Acknowledgment</h2>
        <p>
          The verse-by-verse, chapter-by-chapter approach to studying God&apos;s Word used in this app was learned from the teachings of <strong>Pastor Arnold Murray</strong> and <strong>Shepherd&apos;s Chapel</strong> in Gravette, Arkansas.
        </p>
        <p>
          We are deeply grateful to Pastor Murray and his church for bringing God&apos;s Word together in a way that taught us and so many others how to read Scripture for ourselves — line upon line, precept upon precept. Pastor Murray used these same trusted study tools — Strong&apos;s Concordance, the Companion Bible, Smith&apos;s Bible Dictionary, Green&apos;s Interlinear — to teach ordinary people how to study God&apos;s Word at a level that had been reserved for seminary students.
        </p>
        <p>
          We are all just students of the Word, doing our best to be what God created us to be. The focus of this app is not on any man. It is on God and His Word.
        </p>
      </section>

      {/* About Scripture Unlocked */}
      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.3rem', color: '#D4AE39', borderBottom: '1px solid rgba(212, 174, 57, 0.2)', paddingBottom: '0.5rem' }}>About Scripture Unlocked</h2>
        <p>
          Scripture Unlocked is built by <strong>Mark Wasmuth</strong> — a student of God&apos;s Word, not a pastor, not a scholar. Just a man who believes that every person should be able to open their Bible and understand what God said, without needing a middleman.
        </p>
        <p>
          This app uses AI technology to help organize, cross-reference, and present verse-by-verse Bible study in a way that is accessible to everyone. The AI does not create theology — it helps structure and present what is already in God&apos;s Word, guided by the study tools and teaching approach listed above.
        </p>
        <p style={{ fontStyle: 'italic', textAlign: 'center', marginTop: '1.5rem', color: '#D4AE39' }}>
          &ldquo;BE who God made you. DO what He commanded. HAVE what He promised.&rdquo;
        </p>
      </section>

      {/* Footer */}
      <footer style={{ textAlign: 'center', paddingTop: '1.5rem', borderTop: '1px solid rgba(212, 174, 57, 0.15)', fontSize: '0.8rem', opacity: 0.5 }}>
        <p>&copy; 2026 Scripture Unlocked. All rights reserved.</p>
        <div style={{ marginTop: '0.5rem' }}>
          <a href="/privacy-policy" style={{ color: '#D4AE39', textDecoration: 'none', marginRight: '1rem' }}>Privacy Policy</a>
          <a href="/terms" style={{ color: '#D4AE39', textDecoration: 'none' }}>Terms of Service</a>
        </div>
      </footer>
    </main>
  );
}

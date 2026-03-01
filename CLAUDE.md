# CLAUDE.md — Scripture Unlocked Developer Brief

## Project Overview

**Scripture Unlocked** is an interactive Bible study web + mobile app created by Mark Wasmuth. It uses AI avatars to teach the Bible verse-by-verse, with a Q&A feature powered by Claude and text-to-speech via ElevenLabs.

**Live URLs:**
- https://scriptureunlocked.app (production)
- https://scripture-unlocked.vercel.app (Vercel default)

**Repo:** https://github.com/markwasmuth/scripture-unlocked

---

## Tech Stack

| Layer | Tech |
|-------|------|
| Framework | Next.js 14 + TypeScript |
| Styling | Tailwind CSS + inline styles |
| Mobile | Capacitor 6 (iOS/Android wrapping) |
| AI Q&A | Anthropic Claude API |
| Text-to-Speech | ElevenLabs API |
| Hosting | Vercel (static export) |
| Future Auth | Supabase (Phase 3) |

**Build mode:** `output: "export"` in next.config.js — static HTML export for Capacitor compatibility. No server-side rendering. No API routes (yet).

---

## File Structure

```
scripture-unlocked/
├── src/
│   ├── app/
│   │   ├── layout.tsx          # Root layout, metadata, viewport
│   │   └── page.tsx            # Imports BibleStudy component
│   ├── components/
│   │   └── BibleStudy.tsx      # Main UI component (needs full v2 migration)
│   ├── lib/
│   │   ├── brand.ts            # BRAND colors + BRAND_META constants
│   │   └── voices.ts           # Avatar configs with full system prompts
│   └── styles/
│       └── globals.css         # Tailwind directives, CSS vars, safe area
├── public/
│   └── manifest.json           # PWA manifest
├── capacitor.config.ts         # iOS/Android config
├── next.config.js              # Static export config
├── tailwind.config.js          # Brand colors in Tailwind theme
├── tsconfig.json               # Strict mode, @/* path alias
├── package.json                # Dependencies
├── ROADMAP.md                  # 4-phase launch plan
└── README.md                   # Project overview
```

---

## Brand Design System

### Colors
| Token | Hex | Usage |
|-------|-----|-------|
| Scripture Gold | `#D4AE39` | Primary brand, Moses accent |
| Midnight Navy | `#14142E` | Backgrounds |
| Elijah Red | `#8B1A1A` | Elijah accent |
| Deborah Teal | `#0E7C6B` | Deborah accent |
| Cream | `#F5F0E0` | Light text backgrounds |
| Parchment | `#FAF6ED` | Study reader background |

### Typography
- **Logo/Headers:** Playfair Display SC
- **Body:** Georgia, serif
- **UI Elements:** System serif stack

### Brand Constants (brand.ts)
- `BRAND` — all color tokens
- `BRAND_META` — name, tagline, closing tagline, copyright, creator, bundleId

---

## The Three Avatars

Scripture Unlocked uses three AI teaching avatars. Each has a distinct personality, teaching style, and system prompt defined in `voices.ts`.

### Moses 📜
- **Style:** Patient, educational, verse-by-verse
- **Accent:** Gold `#D4AE39`
- **Role:** Primary teacher. Line-upon-line exposition.
- **Tone:** Like a teacher who walked with God face to face.

### Elijah 🔥
- **Style:** Confrontational, exposing deception
- **Accent:** Red `#8B1A1A`
- **Role:** Challenges religious tradition. Exposes false teaching.
- **Tone:** Fire, urgency, zero tolerance for manipulation.

### Deborah ⚖️
- **Style:** Warm authority, family-focused
- **Accent:** Teal `#0E7C6B`
- **Role:** Female teaching voice. Family application. Highlights women in Scripture.
- **Tone:** Patient warmth with quiet strength and precision.

### Avatar Rules
- All avatars use **KJV exclusively** (King James Version)
- All provide **Strong's Concordance numbers** for Hebrew/Greek word studies
- All capitalize pronouns for God (He, Him, His)
- All teach the **BE-DO-HAVE framework**: BE (identity) → DO (action) → HAVE (results)
- All reference: TheSeason.org, Companion Bible, Smith's Bible Dictionary, Webster's 1828 Dictionary
- Never denominational — let Scripture interpret Scripture
- Each avatar includes a `systemPrompt` in voices.ts — this is passed to the Claude API

---

## Core Theological Frameworks

These are taught across all avatars. Do not modify or contradict these:

1. **BE-DO-HAVE** (Genesis 1:28) — God's order: identity before activity. Religion inverts this to DO-BE-HAVE.
2. **Two Seeds / Two Trees** (Genesis 3:15) — seed of the woman vs. seed of the serpent
3. **The Key of David** — Adamic bloodline preserved for Messiah (Adam→Shem→Abraham→David→Jesus)
4. **Mathematics of God** — biblical numbers carry specific meaning
5. **Fig Tree Generation** — Jeremiah 24, Matthew 24, parable of the tares
6. **Words Create Reality** — Genesis 1, God spoke creation into existence
7. **Speaker Distinction** — not every word recorded in Scripture is a word God commanded
8. **Covenant vs. Contract** — God's covenant sealed by blood and oath, not human performance

---

## What Needs to Be Built

### Priority 1: Full UI Migration
The current `BibleStudy.tsx` is a scaffold. A full v2 React app exists (originally built as a single-file artifact) that needs to be migrated into proper TypeScript components:

**Components to create:**
- `VoiceSelector.tsx` — Avatar picker (Moses/Elijah/Deborah tabs)
- `StudyReader.tsx` — Verse-by-verse study display with verse highlighting
- `ChatPanel.tsx` — Q&A input + response display with avatar personality
- `ElijahDeepDive.tsx` — Expansion panel (take any verse, re-teach with Elijah's fire)
- `FamilyStudy.tsx` — Family study generator (simplify studies for families)
- `AudioPlayer.tsx` — ElevenLabs TTS integration ("Listen" button)

### Priority 2: Content Data Structure
Bible study content should be stored as **static JSON files** in a `/src/data/` or `/content/` directory.

**Suggested schema per chapter:**
```typescript
interface BibleStudy {
  book: string;           // "Genesis"
  chapter: number;        // 1
  title: string;          // "In the Beginning — The Restoration of Earth"
  avatar: string;         // "moses"
  verses: Verse[];
  applicationSummary: string;
}

interface Verse {
  number: number;
  text: string;           // Full KJV text
  commentary: string;     // Spoken-style teaching commentary
  strongsRefs?: StrongsRef[];
  crossRefs?: string[];   // e.g., ["John 1:1", "Hebrews 11:3"]
}

interface StrongsRef {
  word: string;           // "God"
  number: string;         // "H430"
  definition: string;     // "Elohim — plural, meaning God in His fullness"
}
```

**Content available:** Genesis chapters 1-8 exist as .docx studies. These need to be converted to JSON.

### Priority 3: API Integration
- **Claude API:** Send user questions + avatar system prompt → get response
- **ElevenLabs API:** Send text → get audio stream for playback
- Both need environment variables: `ANTHROPIC_API_KEY`, `ELEVENLABS_API_KEY`
- Since we're using static export, API calls must happen client-side or through a separate API endpoint (Vercel Serverless Functions or Supabase Edge Functions)

**Important:** Static export (`output: "export"`) means NO `/api/` routes in Next.js. You'll need to either:
1. Remove `output: "export"` and use Next.js API routes on Vercel, OR
2. Keep static export and call Claude/ElevenLabs directly from the client (requires proxy for API key security), OR
3. Use Vercel Serverless Functions separately

### Priority 4: Mobile (Capacitor)
- Config is in `capacitor.config.ts`
- `npm run cap:sync` builds and syncs to native projects
- iOS: Xcode required
- Android: Android Studio required
- App ID: `com.scriptureunlocked.app`

---

## Environment Variables

```env
ANTHROPIC_API_KEY=sk-ant-...
ELEVENLABS_API_KEY=...
NEXT_PUBLIC_APP_URL=https://scriptureunlocked.app
```

Set these in Vercel → Settings → Environment Variables.

---

## Design Principles

1. **Dark theme** — Navy background (`#14142E`), gold accents, cream text
2. **Reverent but modern** — serif fonts, no flashy UI. Think ancient scroll meets clean app.
3. **Mobile-first** — designed for phone reading. Safe area insets handled in CSS.
4. **Accessible** — high contrast gold-on-navy, readable font sizes
5. **Fast** — static export, minimal JS, no heavy frameworks beyond React

---

## Key Taglines (use in UI)

- **Tagline:** "God's Word. Your Blueprint for Living."
- **Closing:** "BE who God made you. DO what He commanded. HAVE what He promised."
- **Declaration:** "Never follow me. Follow the Word of God."

---

## What NOT to Do

- ❌ Don't change avatar system prompts without explicit approval
- ❌ Don't use any Bible version other than KJV
- ❌ Don't add denominational theology
- ❌ Don't use `output: "standalone"` or SSR without discussion (breaks Capacitor)
- ❌ Don't add authentication yet (Phase 3)
- ❌ Don't install heavy UI libraries (no Material UI, Chakra, etc.)
- ❌ Don't change brand colors or fonts

---

## Commands

```bash
npm run dev          # Local development server
npm run build        # Production build (static export to /out)
npm run lint         # ESLint
npm run cap:sync     # Build + sync to native projects
npm run cap:open:ios # Open in Xcode
npm run cap:open:android # Open in Android Studio
```

---

## Owner

**Mark Wasmuth** — mark@scriptureunlocked.app
Scripture Unlocked © 2026

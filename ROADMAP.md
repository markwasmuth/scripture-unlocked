# Scripture Unlocked — Production Launch Roadmap

## Current Status: Repo Created ✅

**Repo:** `scripture-unlocked` on GitHub (private)
**Stack:** Next.js 14 / TypeScript / Tailwind / Capacitor 6
**Avatars:** Moses, Elijah, Deborah

---

## PHASE 1: Web App (Weeks 1-2)
**Goal:** Live web app at scriptureunlocked.app

### 1.1 GitHub + Vercel Deploy
- [ ] Push repo to GitHub
- [ ] Connect to Vercel (auto-deploys on push)
- [ ] Purchase domain (scriptureunlocked.app — $15/yr on Vercel)
- [ ] Set environment variables (Anthropic API key, ElevenLabs key)
- [ ] SSL auto-configured by Vercel

### 1.2 Migrate Full UI from v2 Artifact
- [ ] Convert Scripture_Unlocked_v2.jsx → TypeScript components
- [ ] Break into proper component structure:
  - `VoiceSelector.tsx` — Avatar picker
  - `StudyReader.tsx` — Verse-by-verse study display
  - `ChatPanel.tsx` — Q&A with avatar AI
  - `ElijahDeepDive.tsx` — Expansion panel
  - `FamilyStudy.tsx` — Family study generator
  - `AudioPlayer.tsx` — ElevenLabs TTS integration
- [ ] Add Genesis 1-8 content as JSON data files
- [ ] Wire Anthropic Claude API for live Q&A
- [ ] Wire ElevenLabs for "Listen" mode

### 1.3 Content Pipeline
- [ ] Create JSON schema for Bible study content
- [ ] Convert existing Moses studies (Genesis 1-8) to JSON
- [ ] Build admin tool or script to convert .docx studies → JSON
- [ ] Plan content roadmap: Genesis → Revelation

---

## PHASE 2: Mobile Apps (Weeks 3-5)
**Goal:** iOS App Store + Google Play submissions

### 2.1 Capacitor Setup
- [ ] `npm run cap:add:ios` and `cap:add:android`
- [ ] Configure splash screen (navy bg, gold logo)
- [ ] Configure app icon (1024x1024 — Scripture Unlocked emblem)
- [ ] Test on physical devices (iOS + Android)
- [ ] Handle safe area insets (already CSS'd)

### 2.2 Apple App Store
- [ ] Apple Developer Account ($99/yr) — already pursuing
- [ ] App Store Connect: Create app listing
- [ ] Screenshots: 6.7" (iPhone 15 Pro Max), 6.5", 5.5"
- [ ] iPad screenshots if supporting tablet
- [ ] App description, keywords, category (Education > Reference)
- [ ] Privacy policy URL (required)
- [ ] Build with Xcode → Archive → Upload
- [ ] Submit for review (typically 24-48 hrs)

### 2.3 Google Play Store
- [ ] Google Play Console ($25 one-time) — already pursuing
- [ ] Create app listing
- [ ] Screenshots: Phone + 7" tablet + 10" tablet
- [ ] Content rating questionnaire
- [ ] Privacy policy URL (required)
- [ ] Sign APK/AAB with keystore
- [ ] Internal testing track first → Production
- [ ] Submit for review (typically same-day to 7 days)

### 2.4 App Store Requirements (Both)
- [ ] Privacy Policy page on website
- [ ] Terms of Service page on website
- [ ] Support email address
- [ ] Age rating: 4+ / Everyone (educational content)
- [ ] Category: Education or Books & Reference

---

## PHASE 3: Features & Scale (Weeks 6-10)
**Goal:** Engagement, retention, growth

### 3.1 User Accounts
- [ ] Supabase auth (email, Google, Apple Sign-In)
- [ ] Save reading progress
- [ ] Bookmark verses
- [ ] Chat history per user

### 3.2 Content Expansion
- [ ] Full Old Testament studies (Moses format)
- [ ] Topical studies (Elijah format) — Tithing, Rapture, Christmas
- [ ] Family study guides (Deborah format)
- [ ] Search across all studies

### 3.3 Push Notifications
- [ ] Daily verse notifications
- [ ] New study alerts
- [ ] Reading reminders

### 3.4 Monetization (Optional)
- [ ] Free tier: Limited studies + Q&A
- [ ] Premium: Full library + unlimited Q&A + audio
- [ ] In-app purchases via App Store / Google Play
- [ ] Or: Keep free, monetize through coaching/courses

### 3.5 Analytics
- [ ] Vercel Analytics (web)
- [ ] Firebase Analytics (mobile)
- [ ] Track: studies read, Q&A usage, avatar preference, retention

---

## PHASE 4: YouTube Integration (Weeks 10+)
**Goal:** Connect app to existing YouTube audience

- [ ] Embed YouTube videos alongside studies
- [ ] "Watch the teaching" → YouTube link for each chapter
- [ ] Cross-promote: YouTube → App, App → YouTube
- [ ] QR code in YouTube descriptions → App Store links

---

## Domains (Confirmed)

| Domain | Status | Role |
|--------|--------|------|
| scriptureunlocked.app | ✅ OWNED | Primary app domain |
| scripturesunlocked.com | ✅ OWNED | Redirect / landing page |
| scriptureunlocked.com | ❌ Someone else | Not ours |

**GitHub:** https://github.com/markwasmuth/scripture-unlocked

---

## Key Decisions Needed

1. **Domain** — which one(s) to purchase?
2. **Auth provider** — Supabase? Firebase? Clerk?
3. **Free vs. paid** — full free ministry or freemium model?
4. **API costs** — Claude API for Q&A will cost per conversation. Budget?
5. **Content priority** — which books/topics to load first after Genesis?

---

*"Never follow me. Follow the Word of God."*
*© 2026 Scripture Unlocked*

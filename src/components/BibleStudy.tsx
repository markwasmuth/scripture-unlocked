// ═══════════════════════════════════════════════════════════════
// SCRIPTURE UNLOCKED — Main Bible Study Component
// ═══════════════════════════════════════════════════════════════
// Orchestrates all sub-components: VoiceSelector, BookSelector,
// StudyReader, ChatPanel, AudioPlayer, and StrongsModal.
// Two-tab layout: Study (read) and Ask (Q&A with avatar).
// Created by Mark Wasmuth | Scripture Unlocked | 2026
// ═══════════════════════════════════════════════════════════════

"use client";

import { useState, useCallback } from "react";
import { BRAND, BRAND_META } from "@/lib/brand";
import { VOICES, DEFAULT_VOICE } from "@/lib/voices";
import type { AvatarId, VerseRow } from "@/lib/api";

import VoiceSelector from "./VoiceSelector";
import BookSelector from "./BookSelector";
import StudyReader from "./StudyReader";
import ChatPanel from "./ChatPanel";
import AudioPlayer, { getAudioPlayer } from "./AudioPlayer";
import StrongsModal from "./StrongsModal";

type Tab = "study" | "ask";

export default function BibleStudy() {
  // ── Core State ──
  const [activeVoice, setActiveVoice] = useState<AvatarId>(
    DEFAULT_VOICE as AvatarId
  );
  const [selectedBookId, setSelectedBookId] = useState<number | null>(null);
  const [selectedBookName, setSelectedBookName] = useState<string | null>(null);
  const [selectedChapter, setSelectedChapter] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("study");
  const [activeStrongsRef, setActiveStrongsRef] = useState<string | null>(null);
  const [activeVerse, setActiveVerse] = useState<VerseRow | null>(null);

  const voice = VOICES[activeVoice];

  // ── Handlers ──

  const handleBookSelect = useCallback(
    (bookId: number, bookName: string, chapter: number) => {
      setSelectedBookId(bookId);
      setSelectedBookName(bookName);
      setSelectedChapter(chapter);
      setActiveTab("study");
      setActiveVerse(null);
    },
    []
  );

  const handleStrongsClick = useCallback((ref: string) => {
    setActiveStrongsRef(ref);
  }, []);

  const handleVerseSelect = useCallback((verse: VerseRow) => {
    setActiveVerse(verse);
  }, []);

  const handleListen = useCallback((text: string, label: string) => {
    const player = getAudioPlayer();
    if (player) {
      player.play(text, label);
    }
  }, []);

  // Build verse context string for the ChatPanel
  const verseContext =
    activeVerse && selectedBookName
      ? `${selectedBookName} ${activeVerse.chapter}:${activeVerse.verse_number} — "${activeVerse.verse_text}"`
      : selectedBookName && selectedChapter
      ? `${selectedBookName} chapter ${selectedChapter}`
      : undefined;

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-navy via-[#0d1b3e] to-brand-navy text-white font-body">
      {/* ═══ Header ═══ */}
      <header className="text-center pt-8 pb-4 px-4 border-b border-brand-gold/10">
        <h1 className="font-display text-brand-gold text-2xl sm:text-3xl tracking-[0.15em] uppercase">
          {BRAND_META.name}
        </h1>
        <p className="text-brand-gold/50 text-xs sm:text-sm mt-1 font-body">
          {BRAND_META.tagline}
        </p>
      </header>

      {/* ═══ Voice Selector ═══ */}
      <VoiceSelector selected={activeVoice} onSelect={setActiveVoice} />

      {/* ═══ Navigation Bar (Book Selector + Tabs) ═══ */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-brand-gold/10">
        {/* Book Selector */}
        <BookSelector
          onSelect={handleBookSelect}
          currentBook={selectedBookName ?? undefined}
          currentChapter={selectedChapter ?? undefined}
        />

        {/* Study / Ask Tabs */}
        <div className="flex bg-brand-cream/5 rounded-lg p-0.5">
          <button
            onClick={() => setActiveTab("study")}
            className={`px-3 py-1.5 rounded-md text-xs font-display uppercase tracking-wider transition-all ${
              activeTab === "study"
                ? "text-brand-navy shadow-sm"
                : "text-brand-cream/50 hover:text-brand-cream/70"
            }`}
            style={
              activeTab === "study"
                ? { backgroundColor: voice.accent, color: BRAND.navy }
                : undefined
            }
          >
            📖 Study
          </button>
          <button
            onClick={() => setActiveTab("ask")}
            className={`px-3 py-1.5 rounded-md text-xs font-display uppercase tracking-wider transition-all ${
              activeTab === "ask"
                ? "text-brand-navy shadow-sm"
                : "text-brand-cream/50 hover:text-brand-cream/70"
            }`}
            style={
              activeTab === "ask"
                ? { backgroundColor: voice.accent, color: BRAND.navy }
                : undefined
            }
          >
            💬 Ask
          </button>
        </div>
      </div>

      {/* ═══ Main Content ═══ */}
      <main className="pb-24">
        {activeTab === "study" ? (
          // ── Study Tab ──
          selectedBookId && selectedBookName && selectedChapter ? (
            <StudyReader
              bookId={selectedBookId}
              bookName={selectedBookName}
              chapter={selectedChapter}
              accentColor={voice.accent}
              onStrongsClick={handleStrongsClick}
              onVerseSelect={handleVerseSelect}
            />
          ) : (
            // ── Welcome / Empty State ──
            <div className="flex flex-col items-center justify-center py-20 px-6 gap-6">
              <span className="text-5xl">{voice.icon}</span>
              <div className="text-center max-w-md">
                <h2
                  className="font-display text-lg sm:text-xl mb-2"
                  style={{ color: voice.accent }}
                >
                  Welcome to Scripture Unlocked
                </h2>
                <p className="text-brand-cream/50 text-sm font-body leading-relaxed">
                  Select a book and chapter above to begin your verse-by-verse
                  study, or switch to the <strong>Ask</strong> tab to ask{" "}
                  {voice.name} a question about Scripture.
                </p>
              </div>

              {/* Quick Questions as conversation starters */}
              <div className="flex flex-wrap gap-2 justify-center mt-2 max-w-lg">
                {voice.quickQuestions.slice(0, 3).map((q, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveTab("ask")}
                    className="text-xs font-body px-3 py-1.5 rounded-full
                               transition-colors hover:brightness-125"
                    style={{
                      backgroundColor: `${voice.accent}10`,
                      color: `${voice.accent}CC`,
                      border: `1px solid ${voice.accent}25`,
                    }}
                  >
                    {q}
                  </button>
                ))}
              </div>

              {/* Verse context hint */}
              {activeVerse && (
                <div
                  className="mt-4 px-4 py-2 rounded-lg text-xs font-body"
                  style={{
                    backgroundColor: `${voice.accent}08`,
                    border: `1px solid ${voice.accent}15`,
                    color: `${voice.accent}90`,
                  }}
                >
                  📌 Active verse: {selectedBookName}{" "}
                  {activeVerse.chapter}:{activeVerse.verse_number}
                </div>
              )}

              {/* Listen to verse */}
              {activeVerse && (
                <button
                  onClick={() =>
                    handleListen(
                      activeVerse.verse_text,
                      `${selectedBookName} ${activeVerse.chapter}:${activeVerse.verse_number}`
                    )
                  }
                  className="flex items-center gap-2 text-xs font-body px-4 py-2 rounded-lg
                             transition-colors hover:brightness-110"
                  style={{
                    backgroundColor: `${voice.accent}15`,
                    color: voice.accent,
                    border: `1px solid ${voice.accent}25`,
                  }}
                >
                  <span>🔊</span>
                  <span>Listen to this verse</span>
                </button>
              )}
            </div>
          )
        ) : (
          // ── Ask Tab ──
          <ChatPanel
            avatar={activeVoice}
            verseContext={verseContext}
            accentColor={voice.accent}
            onListen={handleListen}
          />
        )}
      </main>

      {/* ═══ Footer ═══ */}
      <footer className="text-center py-6 px-4 border-t border-brand-gold/10">
        <p
          className="font-body text-xs italic"
          style={{ color: `${voice.accent}50` }}
        >
          {BRAND_META.closing}
        </p>
        <p className="text-brand-cream/20 text-[10px] mt-2 font-body">
          {BRAND_META.copyright}
        </p>
      </footer>

      {/* ═══ Strong's Modal (overlays everything) ═══ */}
      <StrongsModal
        reference={activeStrongsRef}
        accentColor={voice.accent}
        onClose={() => setActiveStrongsRef(null)}
        onListen={handleListen}
      />

      {/* ═══ Audio Player (floating bar) ═══ */}
      <AudioPlayer accentColor={voice.accent} />
    </div>
  );
}

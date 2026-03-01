// ═══════════════════════════════════════════════════════════════
// SCRIPTURE UNLOCKED — Main Bible Study Component
// ═══════════════════════════════════════════════════════════════
// Orchestrates all sub-components: VoiceSelector, BookSelector,
// StudyReader, ChatPanel, AudioPlayer, and StrongsModal.
// Three interaction modes: Text (read), Listen (audio study),
// and Talk (Q&A with avatar).
// Created by Mark Wasmuth | Scripture Unlocked | 2026
// ═══════════════════════════════════════════════════════════════

"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { BRAND, BRAND_META } from "@/lib/brand";
import { VOICES, DEFAULT_VOICE } from "@/lib/voices";
import { askAvatar } from "@/lib/api";
import type { AvatarId, VerseRow } from "@/lib/api";

import VoiceSelector from "./VoiceSelector";
import BookSelector from "./BookSelector";
import StudyReader from "./StudyReader";
import ChatPanel from "./ChatPanel";
import AudioPlayer, { getAudioPlayer } from "./AudioPlayer";
import StrongsModal from "./StrongsModal";

export type InteractionMode = "text" | "listen" | "talk";

const MODE_CONFIG: { id: InteractionMode; icon: string; label: string }[] = [
  { id: "text", icon: "📖", label: "Text" },
  { id: "listen", icon: "🔊", label: "Listen" },
  { id: "talk", icon: "💬", label: "Talk" },
];

export default function BibleStudy() {
  // ── Core State ──
  const [activeVoice, setActiveVoice] = useState<AvatarId>(
    DEFAULT_VOICE as AvatarId
  );
  const [selectedBookId, setSelectedBookId] = useState<number | null>(null);
  const [selectedBookName, setSelectedBookName] = useState<string | null>(null);
  const [selectedChapter, setSelectedChapter] = useState<number | null>(null);
  const [mode, setMode] = useState<InteractionMode>("text");
  const [activeStrongsRef, setActiveStrongsRef] = useState<string | null>(null);
  const [activeVerse, setActiveVerse] = useState<VerseRow | null>(null);

  // ── Listen-Mode Mic State ──
  const [isListeningMic, setIsListeningMic] = useState(false);
  const [isMicProcessing, setIsMicProcessing] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  const voice = VOICES[activeVoice];

  // ── Handlers ──

  const handleBookSelect = useCallback(
    (bookId: number, bookName: string, chapter: number) => {
      setSelectedBookId(bookId);
      setSelectedBookName(bookName);
      setSelectedChapter(chapter);
      // Switch to text mode when selecting a new book/chapter
      if (mode === "talk") setMode("text");
      setActiveVerse(null);
    },
    [mode]
  );

  const handleModeChange = useCallback((newMode: InteractionMode) => {
    setMode(newMode);
  }, []);

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

  // ── Listen-Mode Mic: push-to-talk in Listen mode ──
  const handleListenModeMicToggle = useCallback(() => {
    // Stop if already listening
    if (isListeningMic && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListeningMic(false);
      return;
    }

    // Check browser support
    const SpeechRecognition =
      (window as /* eslint-disable-next-line @typescript-eslint/no-explicit-any */ any).SpeechRecognition ||
      (window as /* eslint-disable-next-line @typescript-eslint/no-explicit-any */ any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setMicError("Speech recognition not supported in this browser.");
      setTimeout(() => setMicError(null), 3000);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-US";
    recognitionRef.current = recognition;

    recognition.onstart = () => {
      setIsListeningMic(true);
      setMicError(null);
    };

    recognition.onresult = async (event: SpeechRecognitionEvent) => {
      const transcript = event.results[0][0].transcript;
      setIsListeningMic(false);
      setIsMicProcessing(true);

      try {
        // Build verse context for the avatar
        const context =
          activeVerse && selectedBookName
            ? `${selectedBookName} ${activeVerse.chapter}:${activeVerse.verse_number} — "${activeVerse.verse_text}"`
            : selectedBookName && selectedChapter
            ? `${selectedBookName} chapter ${selectedChapter}`
            : undefined;

        // Ask the avatar
        const response = await askAvatar({
          avatar: activeVoice,
          message: transcript,
          verseContext: context,
          mode: "normal",
        });

        // Play the response as audio
        const player = getAudioPlayer();
        if (player) {
          player.play(response, `${voice.name} responds`);
        }
      } catch (err) {
        console.error("Listen mode mic error:", err);
        setMicError("Couldn't get a response. Try again.");
        setTimeout(() => setMicError(null), 3000);
      } finally {
        setIsMicProcessing(false);
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error("Speech recognition error:", event.error);
      if (event.error !== "aborted") {
        setMicError("Couldn't hear you. Tap the mic and try again.");
        setTimeout(() => setMicError(null), 3000);
      }
      setIsListeningMic(false);
    };

    recognition.onend = () => setIsListeningMic(false);
    recognition.start();
  }, [isListeningMic, activeVoice, activeVerse, selectedBookName, selectedChapter, voice.name]);

  // Clean up speech recognition on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  // Build verse context string for the ChatPanel
  const verseContext =
    activeVerse && selectedBookName
      ? `${selectedBookName} ${activeVerse.chapter}:${activeVerse.verse_number} — "${activeVerse.verse_text}"`
      : selectedBookName && selectedChapter
      ? `${selectedBookName} chapter ${selectedChapter}`
      : undefined;

  // Text & Listen both show the StudyReader
  const showReader = mode === "text" || mode === "listen";

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

      {/* ═══ Navigation Bar ═══ */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-brand-gold/10 gap-2">
        {/* Left: Voice Dropdown + Book Selector */}
        <div className="flex items-center gap-1 sm:gap-2 min-w-0">
          <VoiceSelector selected={activeVoice} onSelect={setActiveVoice} />
          <span className="text-brand-gold/20 text-sm hidden sm:inline">│</span>
          <BookSelector
            onSelect={handleBookSelect}
            currentBook={selectedBookName ?? undefined}
            currentChapter={selectedChapter ?? undefined}
          />
        </div>

        {/* Right: Mode Toggle (Text / Listen / Talk) */}
        <div className="flex bg-brand-cream/5 rounded-lg p-0.5 shrink-0">
          {MODE_CONFIG.map((m) => (
            <button
              key={m.id}
              onClick={() => handleModeChange(m.id)}
              className={`px-2 sm:px-3 py-1.5 rounded-md text-xs font-display uppercase tracking-wider transition-all ${
                mode === m.id
                  ? "text-brand-navy shadow-sm"
                  : "text-brand-cream/50 hover:text-brand-cream/70"
              }`}
              style={
                mode === m.id
                  ? { backgroundColor: voice.accent, color: BRAND.navy }
                  : undefined
              }
              aria-pressed={mode === m.id}
            >
              <span className="mr-1">{m.icon}</span>
              <span className="hidden sm:inline">{m.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ═══ Main Content ═══ */}
      <main className="pb-24">
        {showReader ? (
          // ── Text / Listen Mode ──
          selectedBookId && selectedBookName && selectedChapter ? (
            <StudyReader
              bookId={selectedBookId}
              bookName={selectedBookName}
              chapter={selectedChapter}
              accentColor={voice.accent}
              mode={mode as "text" | "listen"}
              onStrongsClick={handleStrongsClick}
              onVerseSelect={handleVerseSelect}
              onListen={handleListen}
              onModeChange={handleModeChange}
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
                  study, or switch to <strong>Talk</strong> mode to ask{" "}
                  {voice.name} a question about Scripture.
                </p>
              </div>

              {/* Quick Questions as conversation starters */}
              <div className="flex flex-wrap gap-2 justify-center mt-2 max-w-lg">
                {voice.quickQuestions.slice(0, 3).map((q, i) => (
                  <button
                    key={i}
                    onClick={() => setMode("talk")}
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
          // ── Talk Mode ──
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

      {/* ═══ Listen Mode — Floating Mic FAB ═══ */}
      {mode === "listen" && selectedBookId && (
        <div className="fixed bottom-20 right-4 z-40 flex flex-col items-center gap-2">
          {/* Error Toast */}
          {micError && (
            <div
              className="px-3 py-1.5 rounded-lg text-[11px] font-body max-w-[200px]
                         text-center shadow-lg animate-fadeIn"
              style={{
                backgroundColor: "rgba(220, 38, 38, 0.9)",
                color: "#fff",
              }}
            >
              {micError}
            </div>
          )}

          {/* Processing indicator */}
          {isMicProcessing && (
            <div
              className="px-3 py-1.5 rounded-lg text-[11px] font-body shadow-lg animate-fadeIn"
              style={{
                backgroundColor: `${voice.accent}20`,
                color: voice.accent,
                border: `1px solid ${voice.accent}30`,
              }}
            >
              {voice.name} is thinking…
            </div>
          )}

          {/* Mic Button */}
          <button
            onClick={handleListenModeMicToggle}
            disabled={isMicProcessing}
            className={`w-14 h-14 rounded-full flex items-center justify-center
                       shadow-2xl transition-all
                       disabled:opacity-50 disabled:cursor-not-allowed
                       hover:scale-105 active:scale-95
                       ${isListeningMic ? "animate-pulse" : ""}`}
            style={{
              backgroundColor: isListeningMic
                ? "#dc2626"
                : isMicProcessing
                ? `${voice.accent}40`
                : voice.accent,
              color: isListeningMic ? "#fff" : BRAND.navy,
              boxShadow: isListeningMic
                ? "0 0 20px rgba(220, 38, 38, 0.5)"
                : `0 4px 20px ${voice.accent}40`,
            }}
            aria-label={
              isListeningMic
                ? "Stop listening"
                : isMicProcessing
                ? "Processing..."
                : "Ask a question"
            }
          >
            {isMicProcessing ? (
              // Spinner while processing
              <div
                className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin"
                style={{ borderColor: voice.accent, borderTopColor: "transparent" }}
              />
            ) : (
              // Mic icon
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="w-6 h-6"
              >
                <path d="M8.25 4.5a3.75 3.75 0 117.5 0v8.25a3.75 3.75 0 11-7.5 0V4.5z" />
                <path d="M6 10.5a.75.75 0 01.75.75v1.5a5.25 5.25 0 1010.5 0v-1.5a.75.75 0 011.5 0v1.5a6.751 6.751 0 01-6 6.709V21h3a.75.75 0 010 1.5h-7.5a.75.75 0 010-1.5h3v-1.541A6.751 6.751 0 015.25 12.75v-1.5a.75.75 0 01.75-.75z" />
              </svg>
            )}
          </button>

          {/* Label */}
          {!isListeningMic && !isMicProcessing && (
            <span
              className="text-[10px] font-body uppercase tracking-wider"
              style={{ color: `${voice.accent}80` }}
            >
              Ask
            </span>
          )}
          {isListeningMic && (
            <span className="text-[10px] font-body uppercase tracking-wider text-red-400">
              Listening…
            </span>
          )}
        </div>
      )}

      {/* ═══ Audio Player (floating bar) ═══ */}
      <AudioPlayer accentColor={voice.accent} />
    </div>
  );
}

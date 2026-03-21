// ═══════════════════════════════════════════════════════════════
// SCRIPTURE UNLOCKED — StudyReader Component
// ═══════════════════════════════════════════════════════════════
// Verse-by-verse study display. Tap a verse to expand its
// commentary, Strong's references, and cross-references.
// Supports Text mode (silent reading) and Listen mode (audio).
// Three commentary levels: Light, Medium, In-Depth.
// ═══════════════════════════════════════════════════════════════

"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { getStudy, getVersesByChapter } from "@/lib/api";
import type { StudyRow, VerseRow } from "@/lib/api";
import type { InteractionMode } from "./BibleStudy";

// ── Commentary Level Types ───────────────────────────────────

export type CommentaryLevel = "light" | "medium" | "in-depth";

const COMMENTARY_LEVELS: {
  id: CommentaryLevel;
  label: string;
  icon: string;
}[] = [
  { id: "light", label: "Light", icon: "○" },
  { id: "medium", label: "Medium", icon: "◐" },
  { id: "in-depth", label: "In-Depth", icon: "●" },
];

/**
 * Clean attribution/boilerplate text from The Season study content.
 * Removes: "This Bible Study is written by Roger Christopherson..." headers,
 * URL references, copyright footers, and navigation links.
 */
function cleanTheSeasonText(text: string): string {
  if (!text) return text;
  let t = text;

  // Remove "THE FIRST/SECOND BOOK OF MOSES..." chapter headings
  t = t.replace(/^THE [A-Z]+ BOOK OF [A-Z]+[^"]*[""][^""]*[""]\s*/i, '');
  t = t.replace(/^[A-Z ]+Chapter \d+\s*[""][^""]*[""]\s*/i, '');

  // Remove attribution header (appears at start of introductions)
  t = t.replace(/This Bible Study is written by Roger Christopherson[^.]*\.\s*/gi, '');
  t = t.replace(/and it[''']?s transcription\s*\/?\s*location is provided by[^\s]*\s*/gi, '');
  t = t.replace(/http[s]?:\/\/www\.theseason\.org[^\s]*\s*/gi, '');
  t = t.replace(/http[s]?:\/\/[^\s]+\s*/gi, '');

  // Remove copyright footer
  t = t.replace(/PLEASE NOTE:[^]*?written consent\./gi, '');
  t = t.replace(/©\s*\d{4}[^.]*theseason[^.]*\.\s*/gi, '');
  t = t.replace(/Webmaster\s*/gi, '');

  // Remove chapter navigation links
  t = t.replace(/Last Chapter[^]*?Next Chapter[^\n]*/gi, '');
  t = t.replace(/Old Testament[^]*?Return to all Books[^\n]*/gi, '');
  t = t.replace(/New Testament[^]*?Home[^\n]*/gi, '');
  t = t.replace(/Plough[^]*?Seeds[^]*?Vine[^\n]*/gi, '');

  // Remove "end Companion Bible excerpt" markers
  t = t.replace(/end Companion Bible excerpt\s*/gi, '');
  t = t.replace(/Excerpt from The Companion Bible[^:]*:\s*/gi, '');

  // Clean up extra whitespace
  t = t.replace(/\n{3,}/g, '\n\n').trim();

  return t;
}

/**
 * Strip the leading verse-text quote that The Season commentary always starts with.
 * Pattern: "Verse text here." followed by the actual commentary.
 * We remove everything up to and including the first closing quote/period pair.
 */
function stripLeadingVerseQuote(commentary: string, verseText: string): string {
  if (!commentary) return commentary;

  // Try exact match: starts with opening quote + verse text
  const stripped = commentary.trim();

  // Pattern 1: starts with opening quote — find the closing quote and take what follows
  // e.g. "In the beginning God created..." There are two bodies mentioned...
  if (/^["\u201c]/.test(stripped)) {
    const closeIdx = stripped.search(/["\u201d](?!\s*["\u201d])/);
    if (closeIdx > 5 && closeIdx < stripped.length - 50) {
      const afterQuote = stripped.slice(closeIdx + 1).replace(/^[.\s]+/, '').trim();
      if (afterQuote.length > 50) return afterQuote;
    }
  }

  // Pattern 2: starts with the verse text verbatim (with or without quotes)
  const clean = verseText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const versePattern = new RegExp(`^["\u201c]?${clean}["\u201d]?\\s*`, 'i');
  const result = stripped.replace(versePattern, '').trim();
  if (result.length > 50 && result.length < stripped.length) return result;

  // Pattern 3: if commentary starts with a quoted sentence (any text in quotes at start)
  const quoteBlock = stripped.match(/^[""\u201c][^"\u201d]{10,200}["\u201d]\s*/);
  if (quoteBlock) {
    const afterBlock = stripped.slice(quoteBlock[0].length).trim();
    if (afterBlock.length > 50) return afterBlock;
  }

  return stripped;
}

/**
 * Truncate commentary to approximate line counts (100 chars/line).
 * Light   → 2 lines  (~200 chars)
 * Medium  → 5 lines  (~500 chars)
 * In-Depth→ 10 lines (~1000 chars)
 * If the text is naturally shorter, show it all without a "read more" link.
 */
const DEPTH_CHAR_LIMITS: Record<CommentaryLevel, number> = {
  light:    200,
  medium:   500,
  "in-depth": 1000,
};

function truncateCommentary(
  text: string,
  level: CommentaryLevel
): { text: string; truncated: boolean } {
  if (!text) return { text: "", truncated: false };

  const limit = DEPTH_CHAR_LIMITS[level];

  if (text.length <= limit) {
    return { text, truncated: false };
  }

  // Break at last sentence boundary before the limit
  const slice = text.slice(0, limit);
  const lastSentence = slice.search(/[^.!?]*[.!?][^.!?]*$/);
  const cut = lastSentence > limit * 0.6 ? lastSentence + 1 : limit;

  return { text: text.slice(0, cut).trimEnd() + "…", truncated: true };
}

// ── Props ────────────────────────────────────────────────────

interface StudyReaderProps {
  bookId: number;
  bookName: string;
  chapter: number;
  accentColor: string;
  mode: "text" | "listen";
  /** Verse currently being read aloud — used for highlighting */
  playingVerseNumber?: number;
  /** Live audio playback position for sentence-level text highlighting */
  audioProgress?: { currentTime: number; duration: number } | null;
  /** Whether to show teaching/commentary inline under each verse */
  showTeaching?: boolean;
  onStrongsClick?: (ref: string) => void;
  onVerseSelect?: (verse: VerseRow) => void;
  onListen?: (text: string, label: string, verseNumber?: number) => void;
  onModeChange?: (mode: InteractionMode) => void;
  /** Called when verses finish loading so parent can drive auto-continue */
  onVersesLoaded?: (verses: VerseRow[]) => void;
}

// ── Helpers ──────────────────────────────────────────────────

/** Parse Strong's references from either a flat string "H430, H1254"
 *  or a JSON array of objects [{word, number, definition}] */
function parseStrongsRefs(refs: string | object | null): string[] {
  if (!refs) return [];

  // If it's already an array (enrichment format)
  if (Array.isArray(refs)) {
    return refs
      .map((r: { number?: string }) => r.number || "")
      .filter((n: string) => /^[HG]\d+$/i.test(n))
      .map((n: string) => n.toUpperCase());
  }

  // If it's a string that looks like JSON, parse it first
  if (typeof refs === "string" && refs.startsWith("[")) {
    try {
      const parsed = JSON.parse(refs);
      if (Array.isArray(parsed)) {
        return parsed
          .map((r: { number?: string }) => r.number || "")
          .filter((n: string) => /^[HG]\d+$/i.test(n))
          .map((n: string) => n.toUpperCase());
      }
    } catch { /* fall through to flat string parsing */ }
  }

  // Flat string format: "H430, H1254, G2316"
  if (typeof refs === "string") {
    return refs
      .split(/[,;\s]+/)
      .map((r) => r.trim())
      .filter((r) => /^[HG]\d+$/i.test(r))
      .map((r) => r.toUpperCase());
  }

  return [];
}

/** Parse cross-references from a flat string "John 1:1; Hebrews 11:3"
 *  or a JSON array, or null (cross-refs now live in their own table) */
function parseCrossRefs(refs: string | object | null): string[] {
  if (!refs) return [];

  // If it's already an array
  if (Array.isArray(refs)) {
    return refs
      .map((r: string | { to_verse?: string; reason?: string }) =>
        typeof r === "string" ? r : r.to_verse || ""
      )
      .filter(Boolean);
  }

  // If it's a string that looks like JSON
  if (typeof refs === "string" && refs.startsWith("[")) {
    try {
      const parsed = JSON.parse(refs);
      if (Array.isArray(parsed)) {
        return parsed
          .map((r: string | { to_verse?: string }) =>
            typeof r === "string" ? r : r.to_verse || ""
          )
          .filter(Boolean);
      }
    } catch { /* fall through */ }
  }

  // Flat string format
  if (typeof refs === "string") {
    return refs
      .split(/[;]+/)
      .map((r) => r.trim())
      .filter(Boolean);
  }

  return [];
}

// ── Sentence Highlighting Helpers ─────────────────────────────

/** Split text into sentences (preserving punctuation) */
function splitIntoSentences(text: string): string[] {
  // Match sentences ending with .!? (including trailing space)
  // or any trailing text without terminal punctuation
  const parts = text.match(/[^.!?]+[.!?]+(?:\s|$)|[^.!?]+$/g);
  return parts ? parts.map((s) => s.trim()).filter(Boolean) : [text];
}

/** Count whitespace-delimited words */
function countWords(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

/**
 * Render text with progressive sentence-level highlighting.
 * `progress` is 0→1 representing how far through this text block
 * the audio has progressed.
 */
function HighlightedText({
  text,
  progress,
  accentColor,
}: {
  text: string;
  progress: number; // 0 to 1
  accentColor: string;
}) {
  const sentences = useMemo(() => splitIntoSentences(text), [text]);
  const wordCounts = useMemo(
    () => sentences.map((s) => countWords(s)),
    [sentences]
  );
  const totalWords = useMemo(
    () => wordCounts.reduce((a, b) => a + b, 0),
    [wordCounts]
  );

  // Build cumulative boundaries: [0, frac1, frac2, ..., 1]
  const boundaries = useMemo(() => {
    const b: number[] = [0];
    let cum = 0;
    for (const wc of wordCounts) {
      cum += wc;
      b.push(totalWords > 0 ? cum / totalWords : 1);
    }
    return b;
  }, [wordCounts, totalWords]);

  return (
    <>
      {sentences.map((sentence, i) => {
        const start = boundaries[i];
        const end = boundaries[i + 1];

        // Determine state: read, active, or unread
        let style: React.CSSProperties;
        if (progress >= end) {
          // Already read
          style = { color: "var(--text-secondary)" };
        } else if (progress >= start) {
          // Currently being read — highlight with accent
          style = {
            color: accentColor,
            textShadow: `0 0 8px ${accentColor}50`,
            transition: "color 0.3s, text-shadow 0.3s",
          };
        } else {
          // Not yet read — dimmed
          style = { color: "var(--text-muted)" };
        }

        return (
          <span key={i} style={style}>
            {sentence}
            {i < sentences.length - 1 ? " " : ""}
          </span>
        );
      })}
    </>
  );
}

// ── Component ────────────────────────────────────────────────

export default function StudyReader({
  bookId,
  bookName,
  chapter,
  accentColor,
  mode,
  showTeaching = true,
  playingVerseNumber,
  audioProgress,
  onStrongsClick,
  onVerseSelect,
  onListen,
  onModeChange,
  onVersesLoaded,
}: StudyReaderProps) {
  const [study, setStudy] = useState<StudyRow | null>(null);
  const [verses, setVerses] = useState<VerseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Set-based expansion: listen mode keeps multiple verses open,
  // text mode clears and toggles a single verse
  const [expandedVerses, setExpandedVerses] = useState<Set<number>>(new Set());
  const [activeToolTab, setActiveToolTab] = useState<Record<number, string>>({});
  const verseRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const onVersesLoadedRef = useRef(onVersesLoaded);
  useEffect(() => { onVersesLoadedRef.current = onVersesLoaded; }, [onVersesLoaded]);

  // Load study + verses when book/chapter changes
  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      setExpandedVerses(new Set());

      try {
        const [studyData, verseData] = await Promise.all([
          getStudy(bookId, chapter),
          getVersesByChapter(bookId, chapter),
        ]);

        if (cancelled) return;

        setStudy(studyData);
        setVerses(verseData);

        // Notify parent so it can drive auto-continue
        if (verseData.length > 0) {
          onVersesLoadedRef.current?.(verseData);
        }

        if (verseData.length === 0) {
          setError("No verses found for this chapter.");
        }
      } catch (err) {
        if (!cancelled) {
          setError("Failed to load chapter. Please try again.");
          console.error(err);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [bookId, chapter]);

  // ── Verse Click: expand + play audio in listen mode ──
  const handleVerseClick = useCallback(
    (verse: VerseRow) => {
      // In listen mode, clicking a verse plays audio AND accumulates expansion
      if (mode === "listen") {
        const label = `${bookName} ${verse.chapter}:${verse.verse_number}`;
        const text = verse.commentary
          ? `${verse.verse_text}\n\n${verse.commentary}`
          : verse.verse_text;
        onListen?.(text, label, verse.verse_number);

        // Add to expanded set (keep previous verses open)
        setExpandedVerses((prev) => {
          const next = new Set(prev);
          next.add(verse.verse_number);
          return next;
        });
      } else {
        // Text mode: toggle single verse (collapse others)
        setExpandedVerses((prev) => {
          if (prev.has(verse.verse_number)) {
            return new Set(); // collapse
          }
          return new Set([verse.verse_number]); // expand only this one
        });
      }

      onVerseSelect?.(verse);
    },
    [mode, bookName, onListen, onVerseSelect]
  );

  const handleStrongsClick = useCallback(
    (ref: string, e: React.MouseEvent) => {
      e.stopPropagation();
      onStrongsClick?.(ref);
    },
    [onStrongsClick]
  );

  const handleListenVerse = useCallback(
    (verse: VerseRow, e: React.MouseEvent) => {
      e.stopPropagation();
      const label = `${bookName} ${verse.chapter}:${verse.verse_number}`;
      const text = verse.commentary
        ? `${verse.verse_text}\n\n${verse.commentary}`
        : verse.verse_text;
      onListen?.(text, label, verse.verse_number);

      // Also expand this verse in listen mode
      if (mode === "listen") {
        setExpandedVerses((prev) => {
          const next = new Set(prev);
          next.add(verse.verse_number);
          return next;
        });
      }
    },
    [bookName, onListen, mode]
  );

  // ── Auto-scroll & expand when parent drives playback ──
  useEffect(() => {
    if (playingVerseNumber == null) return;

    // Expand the playing verse (accumulate in listen mode)
    setExpandedVerses((prev) => {
      const next = new Set(prev);
      next.add(playingVerseNumber);
      return next;
    });

    // Smooth-scroll the playing verse into view
    const el = verseRefs.current.get(playingVerseNumber);
    if (el) {
      // Small delay so the expansion animation has started
      setTimeout(() => {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 100);
    }
  }, [playingVerseNumber]);

  // ── Loading State ──
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin"
          style={{ borderColor: 'var(--gold)', borderTopColor: 'transparent' }} />
        <p className="font-lora text-sm" style={{ color: 'var(--text-muted)' }}>
          Loading {bookName} {chapter}...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-16 px-4">
        <p className="text-sm" style={{ color: '#dc2626' }}>{error}</p>
        <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
          This chapter may not have study content yet.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-3xl mx-auto px-4 sm:px-8 py-6">
      {/* ── Floating Mode Indicator (Listen) ── */}
      {mode === "listen" && (
        <div
          className="sticky top-0 z-20 flex items-center justify-center gap-2
                     py-2 mb-3 rounded-lg text-xs font-display uppercase tracking-wider"
          style={{
            backgroundColor: `${accentColor}12`,
            color: accentColor,
            border: `1px solid ${accentColor}20`,
          }}
        >
          <span>🔊</span>
          <span>Listen Mode — Tap any verse to hear it</span>
          <button
            onClick={() => onModeChange?.("text")}
            className="ml-2 px-2 py-0.5 rounded text-[10px] transition-colors
                       hover:bg-brand-cream/10"
            style={{
              border: `1px solid ${accentColor}30`,
              color: accentColor,
            }}
          >
            Switch to Text
          </button>
        </div>
      )}

      {/* ── Chapter Header ── */}
      <header className="mb-4 text-center">
        <div className="font-inter text-xs tracking-wide mb-1" style={{ color: 'var(--text-muted)' }}>
          {bookName} &mdash; King James Version (KJV)
        </div>
        {study?.title ? (
          <h2 className="chapter-title" style={{ fontSize: 'clamp(20px, 4vw, 28px)' }}>{study.title}</h2>
        ) : (
          <h2 className="chapter-title" style={{ fontSize: 'clamp(20px, 4vw, 28px)' }}>{bookName} {chapter}</h2>
        )}
      </header>

      {/* ── Chapter Introduction Card ── */}
      {study?.introduction && (() => {
        const cleanIntro = cleanTheSeasonText(study.introduction);
        return cleanIntro.length > 0 ? (
          <div className="chapter-intro-card mb-4">
            <div className="chapter-intro-label">Chapter Overview</div>
            <p className="chapter-intro-text">{cleanIntro.substring(0, 500)}{cleanIntro.length > 500 ? '…' : ''}</p>
          </div>
        ) : null;
      })()}

      {/* Show Teaching toggle moved to options bar in BibleStudy.tsx */}

      {/* ── Verse List ── */}
      <div className="space-y-1">
        {verses.map((verse) => {
          // Commentary always visible — depth tabs control length, not visibility
          const isExpanded = true;
          const isPlaying = playingVerseNumber === verse.verse_number;
          const strongsRefs = parseStrongsRefs(verse.strongs_refs);
          const crossRefs = parseCrossRefs(verse.cross_refs);
          const hasExtras =
            verse.commentary ||
            strongsRefs.length > 0 ||
            crossRefs.length > 0;

          // Clean attribution boilerplate, then strip leading verse-text quote
          const cleanedCommentary = verse.commentary
            ? stripLeadingVerseQuote(cleanTheSeasonText(verse.commentary), verse.verse_text)
            : null;
          const commentaryData = cleanedCommentary
            ? { text: cleanedCommentary, truncated: false }
            : null;

          // Compute per-section progress for sentence highlighting
          const verseWords = countWords(verse.verse_text);
          const comWords = isPlaying && verse.commentary
            ? countWords(verse.commentary)
            : 0;
          const totalAudioWords = verseWords + comWords;
          const verseFraction =
            totalAudioWords > 0 ? verseWords / totalAudioWords : 1;

          // Map global audio progress → verse progress and commentary progress
          const globalProgress =
            isPlaying && audioProgress && audioProgress.duration > 0
              ? audioProgress.currentTime / audioProgress.duration
              : 0;

          // verseProgress: 0→1 within the verse portion of audio
          const verseProgress =
            verseFraction > 0
              ? Math.min(1, globalProgress / verseFraction)
              : 0;

          // commentaryProgress: 0→1 within the commentary portion
          const commentaryProgress =
            globalProgress > verseFraction && verseFraction < 1
              ? Math.min(
                  1,
                  (globalProgress - verseFraction) / (1 - verseFraction)
                )
              : 0;

          return (
            <div
              key={verse.id}
              ref={(el) => {
                if (el) verseRefs.current.set(verse.verse_number, el);
              }}
            >
              {/* ── Verse Row ── */}
              <div
                className="py-4"
                style={{ borderBottom: '1px solid var(--separator)' }}
              >
                {/* Verse text with superscript number */}
                <div style={{ fontFamily: "Georgia, 'Playfair Display', serif", fontSize: 'clamp(16px, 3.5vw, 18px)', lineHeight: 1.75, color: 'var(--text-primary)' }}>
                  <span className="font-inter font-bold text-[13px] mr-1.5 align-super" style={{ color: 'var(--gold)' }}>
                    {verse.verse_number}
                  </span>
                  {isPlaying && audioProgress ? (
                    <HighlightedText
                      text={verse.verse_text}
                      progress={verseProgress}
                      accentColor={accentColor}
                    />
                  ) : (
                    verse.verse_text
                  )}

                  {/* Now Playing indicator in Listen mode */}
                  {mode === "listen" && isPlaying && (
                    <span
                      className="ml-2 inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold animate-pulse align-middle"
                      style={{ backgroundColor: `${accentColor}20`, color: accentColor, fontFamily: "'Inter', sans-serif" }}
                    >
                      ▶ Playing
                    </span>
                  )}

                  {/* Listen button in listen mode */}
                  {mode === "listen" && !isPlaying && (
                    <button
                      onClick={(e) => handleListenVerse(verse, e)}
                      className="ml-2 inline-block p-1 rounded-full transition-colors align-middle"
                      style={{ color: accentColor }}
                      aria-label={`Listen to verse ${verse.verse_number}`}
                    >
                      🔊
                    </button>
                  )}
                </div>

                {/* Teaching — shows automatically when showTeaching is on */}
                {showTeaching && commentaryData && (
                  <div className="mt-3 ml-6" style={{
                    borderLeft: '3px solid var(--gold)',
                    paddingLeft: '16px',
                  }}>
                    {/* Speaker badge */}
                    {verse.speaker_type && (
                      <div className="mb-1.5">
                        <span className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold" style={{
                          fontFamily: "'Inter', sans-serif",
                          background: verse.speaker_type === 'god_direct' ? 'rgba(27,58,107,0.1)' : 'var(--bg-elevated)',
                          color: verse.speaker_type === 'god_direct' ? 'var(--gold)' : 'var(--text-muted)',
                        }}>
                          {verse.speaker_type === 'god_direct' ? 'God Speaking' :
                           verse.speaker_type === 'narrator' ? 'Narrator' :
                           verse.speaker_type === 'prophetic' ? 'Prophetic' :
                           verse.speaker_type === 'mixed' ? 'Mixed' :
                           verse.speaker_type}
                        </span>
                      </div>
                    )}

                    <p className="commentary-text whitespace-pre-line">
                      {isPlaying && audioProgress ? (
                        <HighlightedText
                          text={commentaryData.text}
                          progress={commentaryProgress}
                          accentColor={accentColor}
                        />
                      ) : (
                        commentaryData.text
                      )}
                    </p>

                    {/* Strong's inline */}
                    {strongsRefs.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-3">
                        {strongsRefs.map((ref) => (
                          <button key={ref} onClick={(e) => handleStrongsClick(ref, e)} className="strongs-badge">{ref}</button>
                        ))}
                      </div>
                    )}

                    {/* Cross-refs inline */}
                    {crossRefs.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        <span className="text-[11px] font-inter" style={{ color: 'var(--text-muted)' }}>See also:</span>
                        {crossRefs.map((ref, i) => (
                          <span key={i} className="text-xs font-lora" style={{ color: 'var(--gold)' }}>
                            {ref}{i < crossRefs.length - 1 && " · "}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Listen to commentary */}
                    {mode === "listen" && verse.commentary && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onListen?.(verse.commentary!, `${bookName} ${verse.chapter}:${verse.verse_number} — Commentary`, verse.verse_number);
                        }}
                        className="mt-3 flex items-center gap-1.5 text-[11px] px-3 py-1.5 rounded transition-colors"
                        style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--gold)', border: '1px solid var(--bg-border)', fontFamily: "'Inter', sans-serif" }}
                      >
                        🔊 Listen to commentary
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Old tools panel removed — teaching shows inline above */}
            </div>
          );
        })}
      </div>

      {/* ── Chapter Footer ── */}
      <div className="flex justify-between items-center mt-8 pt-4" style={{ borderTop: '1px solid var(--bg-border)' }}>
        <p className="font-inter text-[11px]" style={{ color: 'var(--text-muted)' }}>
          {verses.length} verses
        </p>
        <div className="ornament flex-none" style={{ fontSize: '11px' }}>
          <span style={{ color: 'var(--text-muted)', fontFamily: 'Inter, sans-serif' }}>{bookName} {chapter}</span>
          <span style={{ color: 'var(--gold)' }}>✦</span>
        </div>
      </div>
    </div>
  );
}

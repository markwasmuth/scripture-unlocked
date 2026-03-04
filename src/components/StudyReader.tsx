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
 * Truncate commentary based on the selected depth level.
 * Light  → first 1-2 sentences
 * Medium → first paragraph (or ~150 words)
 * In-Depth → full text (no truncation)
 */
function truncateCommentary(
  text: string,
  level: CommentaryLevel
): { text: string; truncated: boolean } {
  if (level === "in-depth" || !text) {
    return { text, truncated: false };
  }

  const sentences = text.match(/[^.!?]*[.!?]+/g) ?? [];

  if (level === "light") {
    // First sentence only
    if (sentences.length > 1 && sentences[0]) {
      return { text: sentences[0].trim(), truncated: true };
    }
    // Fallback: cap at 40 words
    const words = text.split(/\s+/);
    if (words.length > 40) {
      return { text: words.slice(0, 40).join(" ") + "…", truncated: true };
    }
    return { text, truncated: false };
  }

  // Medium: first 3 sentences or ~60 words — whichever is shorter
  if (sentences.length > 3) {
    const medText = sentences.slice(0, 3).join("").trim();
    return { text: medText, truncated: true };
  }

  const words = text.split(/\s+/);
  if (words.length > 60) {
    return { text: words.slice(0, 60).join(" ") + "…", truncated: true };
  }

  return { text, truncated: false };
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
  onStrongsClick?: (ref: string) => void;
  onVerseSelect?: (verse: VerseRow) => void;
  onListen?: (text: string, label: string, verseNumber?: number) => void;
  onModeChange?: (mode: InteractionMode) => void;
  /** Called when verses finish loading so parent can drive auto-continue */
  onVersesLoaded?: (verses: VerseRow[]) => void;
}

// ── Helpers ──────────────────────────────────────────────────

/** Parse Strong's references from a string like "H430, H1254, G2316" */
function parseStrongsRefs(refs: string | null): string[] {
  if (!refs) return [];
  return refs
    .split(/[,;\s]+/)
    .map((r) => r.trim())
    .filter((r) => /^[HG]\d+$/i.test(r))
    .map((r) => r.toUpperCase());
}

/** Parse cross-references from a string like "John 1:1; Hebrews 11:3" */
function parseCrossRefs(refs: string | null): string[] {
  if (!refs) return [];
  return refs
    .split(/[;]+/)
    .map((r) => r.trim())
    .filter(Boolean);
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
  const [commentaryLevel, setCommentaryLevel] =
    useState<CommentaryLevel>("in-depth");
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
    <div className="w-full max-w-3xl mx-auto px-4 sm:px-6 py-4">
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
      <header className="mb-2">
        <div className="flex items-center justify-between">
          <h2 className="font-cinzel font-semibold text-xl sm:text-2xl tracking-wide" style={{ color: 'var(--gold-bright)' }}>
            {bookName} {chapter}
          </h2>
        </div>
        {/* Ornamental divider */}
        <div className="ornament my-3">
          <div className="ornament-line" />
          ✦
          <div className="ornament-line" />
        </div>
      </header>

      {/* ── Chapter Introduction Card ── */}
      {study?.introduction && (
        <div className="chapter-intro-card mb-4">
          <div className="chapter-intro-label">Chapter Overview</div>
          <p className="chapter-intro-text">{study.introduction.substring(0, 400)}{study.introduction.length > 400 ? '…' : ''}</p>
        </div>
      )}

      {/* ── Commentary Depth Tabs ── */}
      <div className="flex items-center gap-3 mb-4 px-1">
        <span className="font-inter text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Depth:</span>
        <div className="depth-tabs">
          {COMMENTARY_LEVELS.map((level) => (
            <button
              key={level.id}
              onClick={() => setCommentaryLevel(level.id)}
              className={`depth-tab${commentaryLevel === level.id ? ' active' : ''}`}
            >
              {level.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Verse List ── */}
      <div className="space-y-1">
        {verses.map((verse) => {
          const isExpanded = expandedVerses.has(verse.verse_number);
          const isPlaying = playingVerseNumber === verse.verse_number;
          const strongsRefs = parseStrongsRefs(verse.strongs_refs);
          const crossRefs = parseCrossRefs(verse.cross_refs);
          const hasExtras =
            verse.commentary ||
            strongsRefs.length > 0 ||
            crossRefs.length > 0;

          // Apply commentary truncation
          // When a verse is playing, show full commentary (user hears full text)
          const commentaryData = verse.commentary
            ? truncateCommentary(
                verse.commentary,
                isPlaying ? "in-depth" : commentaryLevel
              )
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
              onClick={() => handleVerseClick(verse)}
              className={`verse-container${isPlaying ? ' active' : isExpanded ? ' active' : ''}`}
              style={{
                borderLeftColor: isPlaying
                  ? 'var(--gold)'
                  : isExpanded
                  ? 'rgba(212,168,67,0.5)'
                  : 'transparent',
              }}
              role="button"
              tabIndex={0}
              aria-expanded={isExpanded}
              aria-label={`Verse ${verse.verse_number}${isPlaying ? " (now playing)" : ""}`}
            >
              {/* ── Verse Text Row ── */}
              <div className="flex items-start gap-2">
                <p className="font-lora text-base sm:text-[17px] leading-[1.8] flex-1 transition-colors duration-300"
                   style={{ color: 'var(--text-primary)' }}>
                  <span className="font-cinzel font-bold text-[12px] mr-1.5 align-super" style={{ color: 'var(--gold)' }}>
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
                </p>

                {/* Now Playing indicator OR Speaker icon in Listen mode */}
                {mode === "listen" && (
                  isPlaying ? (
                    <span
                      className="shrink-0 mt-1 px-2 py-1 rounded-full text-[10px] font-display
                                 uppercase tracking-wider animate-pulse"
                      style={{
                        backgroundColor: `${accentColor}20`,
                        color: accentColor,
                        border: `1px solid ${accentColor}40`,
                      }}
                    >
                      ▶ Playing
                    </span>
                  ) : (
                    <button
                      onClick={(e) => handleListenVerse(verse, e)}
                      className="shrink-0 mt-1 p-1.5 rounded-full transition-colors
                                 hover:bg-brand-cream/10"
                      style={{ color: accentColor }}
                      aria-label={`Listen to verse ${verse.verse_number}`}
                      title="Listen to this verse"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                        className="w-4 h-4"
                      >
                        <path d="M10 3.75a.75.75 0 00-1.264-.546L5.203 6H3.667a.75.75 0 00-.7.48A6.985 6.985 0 002.5 9.25c0 .966.195 1.886.467 2.77a.75.75 0 00.7.48h1.537l3.532 2.796A.75.75 0 0010 14.75V3.75z" />
                        <path d="M11.305 4.882a.75.75 0 10-.61 1.37 4.002 4.002 0 010 5.997.75.75 0 00.61 1.37 5.502 5.502 0 000-8.737z" />
                        <path d="M13.56 3.27a.75.75 0 10-.52 1.409 7.002 7.002 0 010 9.143.75.75 0 00.52 1.408 8.502 8.502 0 000-11.96z" />
                      </svg>
                    </button>
                  )
                )}
              </div>

              {/* ── Expand Hint ── */}
              {hasExtras && !isExpanded && (
                <p className="text-[10px] mt-1 font-inter" style={{ color: 'var(--text-muted)' }}>
                  tap to expand commentary
                </p>
              )}

              {/* ── Expanded Content ── */}
              {isExpanded && hasExtras && (
                <div className="mt-3 space-y-3 animate-fadeIn">
                  {/* Commentary */}
                  {commentaryData && (
                    <div className="commentary-panel">
                      <div className="commentary-label">Moses Explains</div>
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

                      {/* "Read full commentary" if truncated */}
                      {commentaryData.truncated && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setCommentaryLevel("in-depth");
                          }}
                          className="mt-1.5 text-[11px] font-inter transition-colors"
                          style={{ color: 'var(--gold)' }}
                        >
                          ▸ Read full commentary
                        </button>
                      )}

                      {/* Listen to commentary in listen mode */}
                      {mode === "listen" && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onListen?.(
                              verse.commentary!,
                              `${bookName} ${verse.chapter}:${verse.verse_number} — Commentary`,
                              verse.verse_number
                            );
                          }}
                          className="mt-2 flex items-center gap-1.5 text-[11px] font-body
                                     px-2 py-1 rounded transition-colors hover:brightness-125"
                          style={{
                            backgroundColor: `${accentColor}10`,
                            color: accentColor,
                          }}
                        >
                          🔊 Listen to commentary
                        </button>
                      )}
                    </div>
                  )}

                  {/* Strong's References */}
                  {strongsRefs.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      <span className="font-inter text-[10px] uppercase tracking-wider mr-1 self-center" style={{ color: 'var(--text-muted)' }}>
                        Strong&apos;s:
                      </span>
                      {strongsRefs.map((ref) => (
                        <button
                          key={ref}
                          onClick={(e) => handleStrongsClick(ref, e)}
                          className="explain-pill"
                        >
                          {ref}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Cross-References */}
                  {crossRefs.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      <span className="font-inter text-[10px] uppercase tracking-wider mr-1 self-center" style={{ color: 'var(--text-muted)' }}>
                        See also:
                      </span>
                      {crossRefs.map((ref, i) => (
                        <span key={i} className="font-lora text-xs italic" style={{ color: 'var(--text-secondary)' }}>
                          {ref}{i < crossRefs.length - 1 && ","}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}
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

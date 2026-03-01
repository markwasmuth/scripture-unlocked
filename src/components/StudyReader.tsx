// ═══════════════════════════════════════════════════════════════
// SCRIPTURE UNLOCKED — StudyReader Component
// ═══════════════════════════════════════════════════════════════
// Verse-by-verse study display. Tap a verse to expand its
// commentary, Strong's references, and cross-references.
// Supports Text mode (silent reading) and Listen mode (audio).
// Three commentary levels: Light, Medium, In-Depth.
// ═══════════════════════════════════════════════════════════════

"use client";

import { useState, useEffect, useCallback, useRef } from "react";
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

  if (level === "light") {
    // First 1-2 sentences: find the end of the 2nd sentence
    const sentences = text.match(/[^.!?]*[.!?]+/g);
    if (sentences && sentences.length > 2) {
      const lightText = sentences.slice(0, 2).join("").trim();
      return { text: lightText, truncated: true };
    }
    return { text, truncated: false };
  }

  // Medium: first paragraph (up to first double newline) or ~150 words
  const paragraphBreak = text.indexOf("\n\n");
  if (paragraphBreak > 0 && paragraphBreak < text.length - 2) {
    return { text: text.substring(0, paragraphBreak).trim(), truncated: true };
  }

  const words = text.split(/\s+/);
  if (words.length > 150) {
    return { text: words.slice(0, 150).join(" ") + "…", truncated: true };
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

// ── Component ────────────────────────────────────────────────

export default function StudyReader({
  bookId,
  bookName,
  chapter,
  accentColor,
  mode,
  playingVerseNumber,
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
        <div
          className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin"
          style={{
            borderColor: `${accentColor}40`,
            borderTopColor: "transparent",
          }}
        />
        <p className="text-brand-cream/50 text-sm font-body">
          Loading {bookName} {chapter}...
        </p>
      </div>
    );
  }

  // ── Error State ──
  if (error) {
    return (
      <div className="text-center py-16 px-4">
        <p className="text-red-400/80 text-sm font-body">{error}</p>
        <p className="text-brand-cream/30 text-xs mt-2">
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
      <header className="text-center mb-4">
        <h2
          className="font-display text-xl sm:text-2xl tracking-wide"
          style={{ color: accentColor }}
        >
          {bookName} {chapter}
        </h2>
        {study?.title && (
          <p className="text-brand-cream/60 font-body text-sm mt-1 italic">
            {study.title}
          </p>
        )}
        {study?.introduction && (
          <p className="text-brand-cream/50 font-body text-xs mt-3 max-w-lg mx-auto leading-relaxed">
            {study.introduction}
          </p>
        )}
      </header>

      {/* ── Commentary Level Toggle ── */}
      <div className="flex items-center justify-center gap-1 mb-4">
        <span className="text-brand-cream/30 text-[10px] uppercase tracking-wider mr-2 font-display">
          Commentary:
        </span>
        {COMMENTARY_LEVELS.map((level) => (
          <button
            key={level.id}
            onClick={() => setCommentaryLevel(level.id)}
            className={`px-2.5 py-1 rounded-md text-[11px] font-body transition-all ${
              commentaryLevel === level.id
                ? "shadow-sm"
                : "text-brand-cream/40 hover:text-brand-cream/60"
            }`}
            style={
              commentaryLevel === level.id
                ? {
                    backgroundColor: `${accentColor}20`,
                    color: accentColor,
                    border: `1px solid ${accentColor}40`,
                  }
                : { border: "1px solid transparent" }
            }
          >
            <span className="mr-1">{level.icon}</span>
            {level.label}
          </button>
        ))}
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
          const commentaryData = verse.commentary
            ? truncateCommentary(verse.commentary, commentaryLevel)
            : null;

          return (
            <div
              key={verse.id}
              ref={(el) => {
                if (el) verseRefs.current.set(verse.verse_number, el);
              }}
              onClick={() => handleVerseClick(verse)}
              className={`
                rounded-lg transition-all duration-200 cursor-pointer
                border-l-2 px-4 py-3
                ${
                  isPlaying
                    ? "bg-brand-cream/[0.05]"
                    : isExpanded
                    ? "bg-brand-cream/[0.03]"
                    : "hover:bg-brand-cream/[0.02]"
                }
              `}
              style={{
                borderLeftColor: isPlaying
                  ? accentColor
                  : isExpanded
                  ? `${accentColor}80`
                  : "transparent",
                boxShadow: isPlaying
                  ? `0 0 15px ${accentColor}15, inset 0 0 15px ${accentColor}08`
                  : "none",
              }}
              role="button"
              tabIndex={0}
              aria-expanded={isExpanded}
              aria-label={`Verse ${verse.verse_number}${isPlaying ? " (now playing)" : ""}`}
            >
              {/* ── Verse Text Row ── */}
              <div className="flex items-start gap-2">
                <p
                  className={`font-body text-sm sm:text-base leading-relaxed flex-1 transition-colors duration-300 ${
                    isPlaying ? "text-brand-cream" : "text-brand-cream/90"
                  }`}
                >
                  <span
                    className="font-display text-xs mr-1.5 align-super"
                    style={{ color: accentColor }}
                  >
                    {verse.verse_number}
                  </span>
                  {verse.verse_text}
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
                <p className="text-brand-cream/20 text-[10px] mt-1 font-body">
                  tap to expand commentary
                </p>
              )}

              {/* ── Expanded Content ── */}
              {isExpanded && hasExtras && (
                <div className="mt-3 space-y-3 animate-fadeIn">
                  {/* Commentary */}
                  {commentaryData && (
                    <div
                      className="pl-3 border-l"
                      style={{ borderLeftColor: `${accentColor}30` }}
                    >
                      <p className="text-brand-cream/70 text-sm font-body leading-relaxed whitespace-pre-line">
                        {commentaryData.text}
                      </p>

                      {/* "Read full commentary" if truncated */}
                      {commentaryData.truncated && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setCommentaryLevel("in-depth");
                          }}
                          className="mt-1.5 text-[11px] font-body transition-colors hover:brightness-125"
                          style={{ color: `${accentColor}90` }}
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
                      <span className="text-brand-cream/30 text-[10px] uppercase tracking-wider mr-1 self-center">
                        Strong&apos;s:
                      </span>
                      {strongsRefs.map((ref) => (
                        <button
                          key={ref}
                          onClick={(e) => handleStrongsClick(ref, e)}
                          className="px-2 py-0.5 rounded text-[11px] font-body
                                     transition-colors hover:brightness-125"
                          style={{
                            backgroundColor: `${accentColor}15`,
                            color: accentColor,
                            border: `1px solid ${accentColor}30`,
                          }}
                        >
                          {ref}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Cross-References */}
                  {crossRefs.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      <span className="text-brand-cream/30 text-[10px] uppercase tracking-wider mr-1 self-center">
                        See also:
                      </span>
                      {crossRefs.map((ref, i) => (
                        <span
                          key={i}
                          className="text-brand-cream/50 text-xs font-body italic"
                        >
                          {ref}
                          {i < crossRefs.length - 1 && ","}
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

      {/* ── Chapter Navigation ── */}
      <div className="flex justify-between items-center mt-8 pt-4 border-t border-brand-gold/10">
        <p className="text-brand-cream/30 text-xs font-body">
          {verses.length} verses
        </p>
        <p
          className="text-xs font-body italic"
          style={{ color: `${accentColor}60` }}
        >
          {bookName} {chapter}
        </p>
      </div>
    </div>
  );
}

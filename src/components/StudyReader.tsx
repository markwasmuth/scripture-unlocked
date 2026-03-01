// ═══════════════════════════════════════════════════════════════
// SCRIPTURE UNLOCKED — StudyReader Component
// ═══════════════════════════════════════════════════════════════
// Verse-by-verse study display. Tap a verse to expand its
// commentary, Strong's references, and cross-references.
// The "scroll" — the core reading experience.
// ═══════════════════════════════════════════════════════════════

"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { getStudy, getVersesByChapter } from "@/lib/api";
import type { StudyRow, VerseRow } from "@/lib/api";

interface StudyReaderProps {
  bookId: number;
  bookName: string;
  chapter: number;
  accentColor: string;
  onStrongsClick?: (ref: string) => void;
  onVerseSelect?: (verse: VerseRow) => void;
}

/** Parse Strong's references from a string like "H430, H1254, G2316" */
function parseStrongsRefs(refs: string | null): string[] {
  if (!refs) return [];
  return refs
    .split(/[,;\s]+/)
    .map((r) => r.trim())
    .filter((r) => /^[HG]\d+$/i.test(r))
    .map((r) => r.toUpperCase());
}

/** Parse cross-references from a string like "John 1:1, Hebrews 11:3" */
function parseCrossRefs(refs: string | null): string[] {
  if (!refs) return [];
  return refs
    .split(/[;]+/)
    .map((r) => r.trim())
    .filter(Boolean);
}

export default function StudyReader({
  bookId,
  bookName,
  chapter,
  accentColor,
  onStrongsClick,
  onVerseSelect,
}: StudyReaderProps) {
  const [study, setStudy] = useState<StudyRow | null>(null);
  const [verses, setVerses] = useState<VerseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedVerse, setExpandedVerse] = useState<number | null>(null);
  const verseRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  // Load study + verses when book/chapter changes
  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      setExpandedVerse(null);

      try {
        const [studyData, verseData] = await Promise.all([
          getStudy(bookId, chapter),
          getVersesByChapter(bookId, chapter),
        ]);

        if (cancelled) return;

        setStudy(studyData);
        setVerses(verseData);

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

  const handleVerseClick = useCallback(
    (verse: VerseRow) => {
      setExpandedVerse((prev) =>
        prev === verse.verse_number ? null : verse.verse_number
      );
      onVerseSelect?.(verse);
    },
    [onVerseSelect]
  );

  const handleStrongsClick = useCallback(
    (ref: string, e: React.MouseEvent) => {
      e.stopPropagation();
      onStrongsClick?.(ref);
    },
    [onStrongsClick]
  );

  // ── Loading State ──
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <div
          className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin"
          style={{ borderColor: `${accentColor}40`, borderTopColor: "transparent" }}
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
      {/* ── Chapter Header ── */}
      <header className="text-center mb-6">
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

      {/* ── Verse List ── */}
      <div className="space-y-1">
        {verses.map((verse) => {
          const isExpanded = expandedVerse === verse.verse_number;
          const strongsRefs = parseStrongsRefs(verse.strongs_refs);
          const crossRefs = parseCrossRefs(verse.cross_refs);
          const hasExtras =
            verse.commentary || strongsRefs.length > 0 || crossRefs.length > 0;

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
                  isExpanded
                    ? "bg-brand-cream/[0.03]"
                    : "hover:bg-brand-cream/[0.02]"
                }
              `}
              style={{
                borderLeftColor: isExpanded ? accentColor : "transparent",
              }}
              role="button"
              tabIndex={0}
              aria-expanded={isExpanded}
              aria-label={`Verse ${verse.verse_number}`}
            >
              {/* ── Verse Text ── */}
              <p className="font-body text-sm sm:text-base leading-relaxed text-brand-cream/90">
                <span
                  className="font-display text-xs mr-1.5 align-super"
                  style={{ color: accentColor }}
                >
                  {verse.verse_number}
                </span>
                {verse.verse_text}
              </p>

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
                  {verse.commentary && (
                    <div
                      className="pl-3 border-l"
                      style={{ borderLeftColor: `${accentColor}30` }}
                    >
                      <p className="text-brand-cream/70 text-sm font-body leading-relaxed whitespace-pre-line">
                        {verse.commentary}
                      </p>
                    </div>
                  )}

                  {/* Strong's References */}
                  {strongsRefs.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      <span className="text-brand-cream/30 text-[10px] uppercase tracking-wider mr-1 self-center">
                        Strong's:
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

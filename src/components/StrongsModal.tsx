// ═══════════════════════════════════════════════════════════════
// SCRIPTURE UNLOCKED — StrongsModal Component
// ═══════════════════════════════════════════════════════════════
// Slide-up panel showing Strong's Concordance entry details.
// Appears when a user taps an H/G number badge in the study.
// ═══════════════════════════════════════════════════════════════

"use client";

import { useState, useEffect } from "react";
import { getStrongsHebrew, getStrongsGreek } from "@/lib/api";
import type { StrongsEntry } from "@/lib/api";

interface StrongsModalProps {
  reference: string | null; // e.g., "H430" or "G2316"
  accentColor: string;
  onClose: () => void;
  onListen?: (text: string, label: string) => void;
}

export default function StrongsModal({
  reference,
  accentColor,
  onClose,
  onListen,
}: StrongsModalProps) {
  const [entry, setEntry] = useState<StrongsEntry | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!reference) {
      setEntry(null);
      return;
    }

    let cancelled = false;

    async function lookup() {
      setLoading(true);
      setError(null);

      try {
        const isHebrew = reference!.toUpperCase().startsWith("H");
        const result = isHebrew
          ? await getStrongsHebrew(reference!)
          : await getStrongsGreek(reference!);

        if (cancelled) return;

        if (result) {
          setEntry(result);
        } else {
          setError(`No entry found for ${reference}`);
        }
      } catch (err) {
        if (!cancelled) {
          setError("Failed to look up this reference.");
          console.error(err);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    lookup();
    return () => {
      cancelled = true;
    };
  }, [reference]);

  if (!reference) return null;

  const isHebrew = reference.toUpperCase().startsWith("H");
  const language = isHebrew ? "Hebrew" : "Greek";

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40 animate-fadeIn"
        onClick={onClose}
      />

      {/* Modal Panel */}
      <div
        className="fixed bottom-0 left-0 right-0 z-50 animate-slideUp
                   bg-brand-navy border-t rounded-t-2xl shadow-2xl
                   max-h-[60vh] overflow-y-auto"
        style={{ borderTopColor: `${accentColor}30` }}
      >
        {/* Handle bar */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 rounded-full bg-brand-cream/20" />
        </div>

        <div className="px-5 pb-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <span
                className="text-xs font-display uppercase tracking-wider"
                style={{ color: accentColor }}
              >
                Strong's {language}
              </span>
              <h3 className="text-brand-cream font-display text-lg">
                {reference.toUpperCase()}
              </h3>
            </div>
            <button
              onClick={onClose}
              className="text-brand-cream/40 hover:text-brand-cream/70 transition-colors
                         w-8 h-8 flex items-center justify-center rounded-full
                         hover:bg-brand-cream/10"
              aria-label="Close"
            >
              ✕
            </button>
          </div>

          {/* Loading */}
          {loading && (
            <div className="flex items-center gap-2 py-6 justify-center">
              <div
                className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin"
                style={{
                  borderColor: `${accentColor}40`,
                  borderTopColor: "transparent",
                }}
              />
              <span className="text-brand-cream/50 text-sm">
                Looking up {reference}...
              </span>
            </div>
          )}

          {/* Error */}
          {error && (
            <p className="text-red-400/80 text-sm text-center py-4">{error}</p>
          )}

          {/* Entry Content */}
          {entry && (
            <div className="space-y-4">
              {/* Original Word */}
              <div>
                <span className="text-brand-cream/40 text-[10px] uppercase tracking-wider block mb-1">
                  Original Word
                </span>
                <p className="text-brand-cream text-xl font-body">
                  {entry.word}
                </p>
                {entry.transliteration && (
                  <p className="text-brand-cream/60 text-sm italic mt-0.5">
                    {entry.transliteration}
                    {entry.pronunciation && (
                      <span className="text-brand-cream/40">
                        {" "}
                        ({entry.pronunciation})
                      </span>
                    )}
                  </p>
                )}
              </div>

              {/* Definition */}
              <div>
                <span className="text-brand-cream/40 text-[10px] uppercase tracking-wider block mb-1">
                  Definition
                </span>
                <p className="text-brand-cream/80 text-sm font-body leading-relaxed">
                  {entry.definition}
                </p>
              </div>

              {/* KJV Usage */}
              {entry.kjv_usage && (
                <div>
                  <span className="text-brand-cream/40 text-[10px] uppercase tracking-wider block mb-1">
                    KJV Usage
                  </span>
                  <p className="text-brand-cream/60 text-sm font-body italic">
                    {entry.kjv_usage}
                  </p>
                </div>
              )}

              {/* Listen Button */}
              {onListen && (
                <button
                  onClick={() => {
                    const ttsText = `Strong's number ${reference}. The ${language} word ${entry.transliteration || entry.word}. Definition: ${entry.definition}`;
                    onListen(ttsText, `${reference} — ${entry.word}`);
                  }}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg
                             text-sm font-body transition-colors hover:brightness-110"
                  style={{
                    backgroundColor: `${accentColor}15`,
                    color: accentColor,
                    border: `1px solid ${accentColor}25`,
                  }}
                >
                  <span>🔊</span>
                  <span>Listen to definition</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

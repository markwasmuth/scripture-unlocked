// ═══════════════════════════════════════════════════════════════
// SCRIPTURE UNLOCKED — VoiceSelector (Compact Dropdown)
// ═══════════════════════════════════════════════════════════════
// Compact dropdown for choosing the teaching avatar.
// Shows icon + name in a small trigger button; expands to list
// all three voices with accent color indicators.
// ═══════════════════════════════════════════════════════════════

"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { VOICES } from "@/lib/voices";
import type { AvatarId } from "@/lib/api";

interface VoiceSelectorProps {
  selected: AvatarId;
  onSelect: (avatar: AvatarId) => void;
}

const AVATAR_ORDER: AvatarId[] = ["moses", "elijah", "deborah"];

export default function VoiceSelector({ selected, onSelect }: VoiceSelectorProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const voice = VOICES[selected];

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const handleSelect = useCallback(
    (id: AvatarId) => {
      onSelect(id);
      setOpen(false);
    },
    [onSelect]
  );

  return (
    <div ref={containerRef} className="relative">
      {/* ── Trigger Button ── */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg
                   text-sm font-display tracking-wide transition-colors
                   hover:bg-brand-cream/5"
        style={{ color: voice.accent }}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Voice: ${voice.name}. Click to change.`}
      >
        <span className="text-base">{voice.icon}</span>
        <span className="uppercase">{voice.name}</span>
        {/* Chevron */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className={`w-4 h-4 transition-transform ${open ? "rotate-180" : ""}`}
        >
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {/* ── Dropdown Menu ── */}
      {open && (
        <div
          className="absolute top-full left-0 mt-1 z-50
                     bg-brand-navy border border-brand-gold/20 rounded-lg
                     shadow-xl shadow-black/30 overflow-hidden min-w-[160px]"
          role="listbox"
          aria-label="Select teaching voice"
        >
          {AVATAR_ORDER.map((id) => {
            const v = VOICES[id];
            const isActive = selected === id;

            return (
              <button
                key={id}
                role="option"
                aria-selected={isActive}
                onClick={() => handleSelect(id)}
                className={`
                  w-full flex items-center gap-2.5 px-3 py-2.5 text-left
                  transition-colors text-sm font-body
                  ${isActive ? "bg-brand-cream/[0.06]" : "hover:bg-brand-cream/[0.04]"}
                `}
              >
                {/* Accent dot */}
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: v.accent }}
                />
                {/* Icon + Name */}
                <span className="text-base">{v.icon}</span>
                <span
                  className="font-display uppercase tracking-wide text-xs"
                  style={{ color: isActive ? v.accent : "rgba(245, 240, 224, 0.7)" }}
                >
                  {v.name}
                </span>
                {/* Check mark for active */}
                {isActive && (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className="w-4 h-4 ml-auto"
                    style={{ color: v.accent }}
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

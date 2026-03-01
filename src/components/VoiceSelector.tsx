// ═══════════════════════════════════════════════════════════════
// SCRIPTURE UNLOCKED — VoiceSelector Component
// ═══════════════════════════════════════════════════════════════
// Avatar picker: Moses (Gold), Elijah (Red), Deborah (Teal).
// Each avatar has a distinct teaching personality and accent color.
// ═══════════════════════════════════════════════════════════════

"use client";

import { VOICES, DEFAULT_VOICE } from "@/lib/voices";
import type { AvatarId } from "@/lib/api";

interface VoiceSelectorProps {
  selected: AvatarId;
  onSelect: (avatar: AvatarId) => void;
}

const AVATAR_ORDER: AvatarId[] = ["moses", "elijah", "deborah"];

export default function VoiceSelector({ selected, onSelect }: VoiceSelectorProps) {
  return (
    <div className="flex gap-2 sm:gap-3 justify-center py-4">
      {AVATAR_ORDER.map((id) => {
        const voice = VOICES[id];
        const isActive = selected === id;

        return (
          <button
            key={id}
            onClick={() => onSelect(id)}
            className={`
              relative flex flex-col items-center gap-1 px-4 py-3 rounded-xl
              transition-all duration-200 ease-out
              border-2 min-w-[100px] sm:min-w-[120px]
              ${isActive
                ? "border-current shadow-lg scale-105"
                : "border-transparent opacity-60 hover:opacity-90 hover:scale-102"
              }
            `}
            style={{
              color: voice.accent,
              backgroundColor: isActive ? voice.accentBg : "transparent",
            }}
            aria-pressed={isActive}
            aria-label={`Select ${voice.name} — ${voice.subtitle}`}
          >
            {/* Avatar Icon */}
            <span className="text-2xl sm:text-3xl" role="img" aria-hidden="true">
              {voice.icon}
            </span>

            {/* Name */}
            <span
              className={`
                font-display text-sm sm:text-base font-bold tracking-wide uppercase
                ${isActive ? "" : "text-brand-cream"}
              `}
              style={isActive ? { color: voice.accent } : undefined}
            >
              {voice.name}
            </span>

            {/* Subtitle */}
            <span className="text-xs text-brand-cream/60">
              {voice.subtitle}
            </span>

            {/* Active indicator dot */}
            {isActive && (
              <span
                className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full"
                style={{ backgroundColor: voice.accent }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}

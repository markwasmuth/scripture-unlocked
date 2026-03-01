"use client";

// ═══════════════════════════════════════════════════════════════
// SCRIPTURE UNLOCKED — Main Bible Study Component
// Created by Mark Wasmuth | Scripture Unlocked | 2026
// ═══════════════════════════════════════════════════════════════

import { useState, useRef, useEffect } from "react";
import { BRAND, BRAND_META } from "@/lib/brand";
import { VOICES, ELIJAH_EXPANSION_PROMPT, DEFAULT_VOICE } from "@/lib/voices";
import type { Voice } from "@/lib/voices";

// TODO: Migrate full v2 component from Scripture_Unlocked_v2.jsx
// This is the production scaffold — full interactive study app goes here

export default function BibleStudy() {
  const [activeVoice, setActiveVoice] = useState<string>(DEFAULT_VOICE);
  const voice = VOICES[activeVoice];

  return (
    <div
      style={{
        minHeight: "100vh",
        background: `linear-gradient(135deg, ${BRAND.navy} 0%, ${BRAND.navyMid} 50%, ${BRAND.navy} 100%)`,
        color: BRAND.white,
        fontFamily: "Georgia, serif",
      }}
    >
      {/* Header */}
      <header
        style={{
          textAlign: "center",
          padding: "2rem 1rem 1rem",
          borderBottom: `1px solid rgba(212, 174, 57, 0.2)`,
        }}
      >
        <h1
          style={{
            fontFamily: "'Playfair Display SC', Georgia, serif",
            color: BRAND.gold,
            fontSize: "1.8rem",
            letterSpacing: "0.15em",
            marginBottom: "0.25rem",
          }}
        >
          {BRAND_META.name.toUpperCase()}
        </h1>
        <p style={{ color: BRAND.goldDim, fontSize: "0.85rem", opacity: 0.8 }}>
          {BRAND_META.tagline}
        </p>
      </header>

      {/* Voice Selector */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: "0.75rem",
          padding: "1.5rem 1rem",
        }}
      >
        {Object.values(VOICES).map((v) => (
          <button
            key={v.id}
            onClick={() => setActiveVoice(v.id)}
            style={{
              background:
                activeVoice === v.id
                  ? v.accent
                  : "rgba(255, 255, 255, 0.05)",
              color:
                activeVoice === v.id ? BRAND.navy : "rgba(255,255,255,0.6)",
              border: `1px solid ${
                activeVoice === v.id ? v.accent : "rgba(255,255,255,0.15)"
              }`,
              borderRadius: "12px",
              padding: "0.75rem 1.25rem",
              cursor: "pointer",
              fontFamily: "Georgia, serif",
              fontSize: "0.9rem",
              fontWeight: activeVoice === v.id ? 700 : 400,
              transition: "all 0.2s ease",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "0.25rem",
              minWidth: "100px",
            }}
          >
            <span style={{ fontSize: "1.4rem" }}>{v.icon}</span>
            <span>{v.name}</span>
            <span
              style={{
                fontSize: "0.7rem",
                opacity: 0.8,
              }}
            >
              {v.subtitle}
            </span>
          </button>
        ))}
      </div>

      {/* Active Voice Info */}
      <div
        style={{
          textAlign: "center",
          padding: "1rem 2rem",
          maxWidth: "600px",
          margin: "0 auto",
        }}
      >
        <p
          style={{
            color: voice.accent,
            fontStyle: "italic",
            fontSize: "0.95rem",
            lineHeight: 1.6,
          }}
        >
          {voice.emptyStateText}
        </p>
      </div>

      {/* Quick Questions */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          gap: "0.5rem",
          padding: "1rem 1.5rem 2rem",
          maxWidth: "700px",
          margin: "0 auto",
        }}
      >
        {voice.quickQuestions.map((q, i) => (
          <button
            key={i}
            style={{
              background: voice.accentBg,
              color: voice.accent,
              border: `1px solid ${voice.accent}33`,
              borderRadius: "20px",
              padding: "0.5rem 1rem",
              fontSize: "0.8rem",
              cursor: "pointer",
              fontFamily: "Georgia, serif",
              transition: "all 0.2s ease",
            }}
          >
            {q}
          </button>
        ))}
      </div>

      {/* Build Status */}
      <div
        style={{
          textAlign: "center",
          padding: "3rem 2rem",
          borderTop: `1px solid rgba(212, 174, 57, 0.1)`,
        }}
      >
        <p style={{ color: BRAND.goldDim, fontSize: "0.8rem", opacity: 0.5 }}>
          v1.0.0 — Production build in progress
        </p>
        <p
          style={{
            color: BRAND.gold,
            fontStyle: "italic",
            fontSize: "0.85rem",
            marginTop: "1rem",
            opacity: 0.6,
          }}
        >
          {BRAND_META.closing}
        </p>
      </div>
    </div>
  );
}

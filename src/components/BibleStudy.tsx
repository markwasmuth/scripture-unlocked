"use client";
import { useState } from "react";
import { BRAND, APP_INFO } from "@/lib/brand";
import { VOICES, DEFAULT_VOICE } from "@/lib/voices";
export default function BibleStudy() {
  const [activeVoice, setActiveVoice] = useState(DEFAULT_VOICE);
  const voice = VOICES[activeVoice];
  const icons: Record<string, string> = { moses: "\uD83D\uDCDC", elijah: "\uD83D\uDD25", deborah: "\u2696\uFE0F" };
  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #14142E 0%, #0d1b3e 50%, #14142E 100%)", color: "#FFFFFF", fontFamily: "Georgia, serif" }}>
      <header style={{ textAlign: "center", padding: "2rem 1rem 1rem", borderBottom: "1px solid rgba(212,174,57,0.2)" }}>
        <h1 style={{ fontFamily: "'Playfair Display SC', Georgia, serif", color: "#D4AE39", fontSize: "1.8rem", letterSpacing: "0.15em", marginBottom: "0.25rem" }}>SCRIPTURE UNLOCKED</h1>
        <p style={{ color: "#B8962E", fontSize: "0.85rem", opacity: 0.8 }}>{APP_INFO.tagline}</p>
      </header>
      <div style={{ display: "flex", justifyContent: "center", gap: "0.75rem", padding: "1.5rem 1rem" }}>
        {Object.values(VOICES).map((v) => (
          <button key={v.id} onClick={() => setActiveVoice(v.id)} style={{ background: activeVoice === v.id ? v.accent : "rgba(255,255,255,0.05)", color: activeVoice === v.id ? "#14142E" : "rgba(255,255,255,0.6)", border: "1px solid " + (activeVoice === v.id ? v.accent : "rgba(255,255,255,0.15)"), borderRadius: "12px", padding: "0.75rem 1.25rem", cursor: "pointer", fontFamily: "Georgia, serif", fontSize: "0.9rem", fontWeight: activeVoice === v.id ? 700 : 400, display: "flex", flexDirection: "column" as const, alignItems: "center", gap: "0.25rem", minWidth: "100px" }}>
            <span style={{ fontSize: "1.4rem" }}>{icons[v.id]}</span>
            <span>{v.name}</span>
            <span style={{ fontSize: "0.7rem", opacity: 0.8 }}>{v.subtitle}</span>
          </button>
        ))}
      </div>
      <div style={{ textAlign: "center", padding: "1rem 2rem", maxWidth: "600px", margin: "0 auto" }}>
        <p style={{ color: voice.accent, fontStyle: "italic", fontSize: "0.95rem", lineHeight: 1.6 }}>{voice.emptyStateText}</p>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap" as const, justifyContent: "center", gap: "0.5rem", padding: "1rem 1.5rem 2rem", maxWidth: "700px", margin: "0 auto" }}>
        {voice.quickQuestions.map((q: string, i: number) => (
          <button key={i} style={{ background: voice.accentBg, color: voice.accent, border: "1px solid " + voice.accent + "33", borderRadius: "20px", padding: "0.5rem 1rem", fontSize: "0.8rem", cursor: "pointer", fontFamily: "Georgia, serif" }}>{q}</button>
        ))}
      </div>
      <div style={{ textAlign: "center", padding: "3rem 2rem", borderTop: "1px solid rgba(212,174,57,0.1)" }}>
        <p style={{ color: "#B8962E", fontSize: "0.8rem", opacity: 0.5 }}>v1.0.0 — Production build in progress</p>
        <p style={{ color: "#D4AE39", fontStyle: "italic", fontSize: "0.85rem", marginTop: "1rem", opacity: 0.6 }}>{APP_INFO.closingTagline}</p>
      </div>
    </div>
  );
}

/**
 * Scripture Unlocked — Brand Design Tokens
 * Single source of truth for all colors, fonts, and brand values.
 */

export const BRAND = {
  gold: '#D4AE39',
  goldDim: '#B8962E',
  goldGlow: 'rgba(212, 174, 57, 0.15)',
  navy: '#14142E',
  navyLight: '#1a1a3e',
  navyMid: '#0d1b3e',
  white: '#FFFFFF',
  cream: '#F5F0E0',
  parchment: '#FAF6ED',
  charcoal: '#1F2937',

  moses: { accent: '#D4AE39', bg: 'rgba(212, 174, 57, 0.15)' },
  elijah: { accent: '#8B1A1A', bg: 'rgba(139, 26, 26, 0.08)', glow: 'rgba(139, 26, 26, 0.15)' },
  deborah: { accent: '#0E7C6B', bg: 'rgba(14, 124, 107, 0.08)' },

  reader: { green: '#166534', greenBg: '#DCFCE7' },
  discussion: { yellow: '#F59E0B', yellowBg: 'rgba(245, 158, 11, 0.08)' },
} as const;

export const BRAND_META = {
  name: 'Scripture Unlocked',
  tagline: "God's Word. Your Blueprint for Living.",
  closing: 'BE who God made you. DO what He commanded. HAVE what He promised.',
  declaration: 'Never follow me. Follow the Word of God.',
  copyright: '© 2026 Scripture Unlocked. All rights reserved.',
  creator: 'Mark Wasmuth',
  bundleId: 'com.scriptureunlocked.app',
} as const;
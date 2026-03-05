// ═══════════════════════════════════════════════════════════════
// SCRIPTURE UNLOCKED — AudioPlayer Component
// ═══════════════════════════════════════════════════════════════
// Floating mini-bar TTS player. Converts text to speech via
// ElevenLabs Edge Function, plays audio with simple controls.
// Single-track: new audio stops the previous track.
//
// CHUNKING: ElevenLabs caps requests at ~5000 chars. Long
// verse+commentary text is split at sentence boundaries into
// ≤2500-char chunks and played sequentially to prevent the
// mid-sentence cutoff bug in Listen mode.
// ═══════════════════════════════════════════════════════════════

"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { textToSpeech } from "@/lib/api";

interface AudioPlayerProps {
  accentColor: string;
  /** ElevenLabs voice ID for the active avatar */
  voiceId?: string;
  /** Called when audio finishes naturally (for auto-continue) */
  onEnd?: () => void;
  /** Called when user manually stops playback */
  onStop?: () => void;
  /** Called on audio timeupdate with current playback position (for text highlighting) */
  onProgress?: (info: { currentTime: number; duration: number }) => void;
}

interface AudioState {
  isPlaying: boolean;
  isLoading: boolean;
  label: string;
  progress: number;
  chunkIndex: number;
  totalChunks: number;
  error: string | null;
}

// Expose imperative methods via a ref-like pattern using a callback
export interface AudioPlayerHandle {
  play: (text: string, label?: string) => void;
  stop: () => void;
  pause: () => void;
}

// We'll use a module-level ref so the main BibleStudy component can trigger playback
let playerInstance: AudioPlayerHandle | null = null;

export function getAudioPlayer(): AudioPlayerHandle | null {
  return playerInstance;
}

// ── Text Chunking ────────────────────────────────────────────

const MAX_CHUNK_CHARS = 2400;

/**
 * Split text into chunks of at most MAX_CHUNK_CHARS characters,
 * breaking at sentence boundaries (. ! ?) when possible.
 * This prevents ElevenLabs API truncation on long commentary.
 */
function chunkText(text: string): string[] {
  if (!text || text.trim().length === 0) return [];

  // If short enough, no splitting needed
  if (text.length <= MAX_CHUNK_CHARS) return [text.trim()];

  const chunks: string[] = [];
  let remaining = text.trim();

  while (remaining.length > MAX_CHUNK_CHARS) {
    // Find the last sentence boundary within MAX_CHUNK_CHARS
    const slice = remaining.slice(0, MAX_CHUNK_CHARS);
    // Match last sentence-ending punctuation followed by whitespace or end
    const sentenceEnd = slice.search(/[.!?][^.!?]*$/);

    let cutAt: number;
    if (sentenceEnd > MAX_CHUNK_CHARS * 0.5) {
      // Cut after the punctuation mark
      cutAt = sentenceEnd + 1;
    } else {
      // No good sentence break — cut at last whitespace
      const lastSpace = slice.lastIndexOf(" ");
      cutAt = lastSpace > MAX_CHUNK_CHARS * 0.5 ? lastSpace : MAX_CHUNK_CHARS;
    }

    chunks.push(remaining.slice(0, cutAt).trim());
    remaining = remaining.slice(cutAt).trim();
  }

  if (remaining.length > 0) chunks.push(remaining);

  return chunks.filter((c) => c.length > 0);
}

// ── Component ────────────────────────────────────────────────

export default function AudioPlayer({ accentColor, voiceId, onEnd, onStop, onProgress }: AudioPlayerProps) {
  const [state, setState] = useState<AudioState>({
    isPlaying: false,
    isLoading: false,
    label: "",
    progress: 0,
    chunkIndex: 0,
    totalChunks: 1,
    error: null,
  });

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Chunk queue state — stored in refs so async callbacks always see current values
  const chunksRef = useRef<string[]>([]);
  const currentChunkRef = useRef<number>(0);
  const labelRef = useRef<string>("");
  const stoppedRef = useRef<boolean>(false);

  // Keep callback refs fresh without re-creating play/stop
  const onEndRef = useRef(onEnd);
  const onStopRef = useRef(onStop);
  const onProgressRef = useRef(onProgress);
  useEffect(() => { onEndRef.current = onEnd; }, [onEnd]);
  useEffect(() => { onStopRef.current = onStop; }, [onStop]);
  useEffect(() => { onProgressRef.current = onProgress; }, [onProgress]);

  // Clean up audio and object URL
  const cleanup = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.removeAttribute("src");
      audioRef.current = null;
    }
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
  }, []);

  // Track playback progress for progress bar
  const trackProgress = useCallback(() => {
    if (!audioRef.current) return;

    const audio = audioRef.current;
    const chunkIdx = currentChunkRef.current;
    const totalChunks = chunksRef.current.length;

    if (audio.duration && audio.duration > 0) {
      // Overall progress = completed chunks + fraction of current chunk
      const chunkFraction = audio.currentTime / audio.duration;
      const overall = totalChunks > 0
        ? ((chunkIdx + chunkFraction) / totalChunks) * 100
        : chunkFraction * 100;

      setState((s) => ({ ...s, progress: Math.min(100, overall) }));
    }

    if (!audio.paused && !audio.ended) {
      animFrameRef.current = requestAnimationFrame(trackProgress);
    }
  }, []);

  // Stop current playback
  const stop = useCallback(() => {
    stoppedRef.current = true;
    chunksRef.current = [];
    cleanup();
    setState({
      isPlaying: false,
      isLoading: false,
      label: "",
      progress: 0,
      chunkIndex: 0,
      totalChunks: 1,
      error: null,
    });
  }, [cleanup]);

  // Pause current playback (without clearing state — allows resume)
  const pause = useCallback(() => {
    if (audioRef.current && !audioRef.current.paused) {
      audioRef.current.pause();
    }
  }, []);

  // Play a single chunk by index
  const playChunk = useCallback(
    async (chunkIdx: number) => {
      if (stoppedRef.current) return;

      const chunks = chunksRef.current;
      if (chunkIdx >= chunks.length) {
        // All chunks done — fire onEnd
        setState((s) => ({ ...s, isPlaying: false, progress: 100 }));
        if (onEndRef.current) {
          onEndRef.current();
        } else {
          setTimeout(() => stop(), 2000);
        }
        return;
      }

      currentChunkRef.current = chunkIdx;
      const totalChunks = chunks.length;
      const chunkText = chunks[chunkIdx];
      const label = labelRef.current;

      setState((s) => ({
        ...s,
        isLoading: true,
        isPlaying: false,
        chunkIndex: chunkIdx,
        totalChunks,
        label: totalChunks > 1
          ? `${label} (${chunkIdx + 1}/${totalChunks})`
          : label || "Loading audio...",
      }));

      try {
        // Clean up previous audio
        cleanup();

        const blob = await textToSpeech({ text: chunkText, voice_id: voiceId });

        // Check if stopped while awaiting
        if (stoppedRef.current) return;

        const url = URL.createObjectURL(blob);
        objectUrlRef.current = url;

        const audio = new Audio(url);
        audioRef.current = audio;

        audio.addEventListener("playing", () => {
          if (!stoppedRef.current) {
            setState((s) => ({ ...s, isPlaying: true, isLoading: false }));
            trackProgress();
          }
        });

        audio.addEventListener("pause", () => {
          setState((s) => ({ ...s, isPlaying: false }));
        });

        audio.addEventListener("ended", () => {
          if (stoppedRef.current) return;
          // Advance to next chunk
          playChunk(chunkIdx + 1);
        });

        // Report playback position for text highlighting
        audio.addEventListener("timeupdate", () => {
          if (audio.duration > 0 && !stoppedRef.current) {
            onProgressRef.current?.({
              currentTime: audio.currentTime,
              duration: audio.duration,
            });
          }
        });

        audio.addEventListener("error", () => {
          if (!stoppedRef.current) {
            setState((s) => ({
              ...s,
              isPlaying: false,
              isLoading: false,
              error: "Audio playback failed",
            }));
          }
        });

        setState((s) => ({
          ...s,
          label: totalChunks > 1
            ? `${label} (${chunkIdx + 1}/${totalChunks})`
            : label || "Playing...",
        }));

        await audio.play();
      } catch (err) {
        if (!stoppedRef.current) {
          console.error("TTS chunk error:", err);
          setState((s) => ({
            ...s,
            isLoading: false,
            error: "Failed to generate audio. Try again.",
          }));
        }
      }
    },
    [cleanup, stop, trackProgress, voiceId]
  );

  // Play new text (entry point — splits into chunks then plays from chunk 0)
  const play = useCallback(
    async (text: string, label?: string) => {
      // Signal any in-flight chunk to abort
      stoppedRef.current = true;
      cleanup();

      // Build chunk queue
      const chunks = chunkText(text);
      if (chunks.length === 0) return;

      chunksRef.current = chunks;
      currentChunkRef.current = 0;
      labelRef.current = label || "";
      stoppedRef.current = false;

      setState({
        isPlaying: false,
        isLoading: true,
        label: label || "Loading audio...",
        progress: 0,
        chunkIndex: 0,
        totalChunks: chunks.length,
        error: null,
      });

      // Start playing from first chunk
      await playChunk(0);
    },
    [cleanup, playChunk]
  );

  // Toggle play/pause
  const togglePlayPause = useCallback(() => {
    if (!audioRef.current) return;

    if (audioRef.current.paused) {
      audioRef.current.play();
      trackProgress();
    } else {
      audioRef.current.pause();
    }
  }, [trackProgress]);

  // Register the player instance
  useEffect(() => {
    playerInstance = { play, stop, pause };
    return () => {
      playerInstance = null;
      stoppedRef.current = true;
      cleanup();
    };
  }, [play, stop, pause, cleanup]);

  // Don't render if nothing is happening
  if (!state.isLoading && !state.isPlaying && !state.error && state.progress === 0) {
    return null;
  }

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 pb-safe"
      style={{
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}
    >
      <div
        className="mx-4 mb-4 rounded-xl border shadow-2xl backdrop-blur-sm
                   flex items-center gap-3 px-4 py-3"
        style={{
          backgroundColor: "rgba(20, 20, 46, 0.95)",
          borderColor: `${accentColor}30`,
        }}
      >
        {/* Play/Pause or Loading */}
        {state.isLoading ? (
          <div
            className="w-8 h-8 shrink-0 border-2 border-t-transparent rounded-full animate-spin"
            style={{
              borderColor: `${accentColor}40`,
              borderTopColor: "transparent",
            }}
          />
        ) : (
          <button
            onClick={togglePlayPause}
            className="w-8 h-8 shrink-0 rounded-full flex items-center justify-center
                       transition-colors hover:brightness-110"
            style={{ backgroundColor: `${accentColor}20`, color: accentColor }}
            aria-label={state.isPlaying ? "Pause" : "Play"}
          >
            {state.isPlaying ? (
              // Pause icon
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                <path d="M5.75 3a.75.75 0 00-.75.75v12.5c0 .414.336.75.75.75h1.5a.75.75 0 00.75-.75V3.75A.75.75 0 007.25 3h-1.5zM12.75 3a.75.75 0 00-.75.75v12.5c0 .414.336.75.75.75h1.5a.75.75 0 00.75-.75V3.75a.75.75 0 00-.75-.75h-1.5z" />
              </svg>
            ) : (
              // Play icon
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
              </svg>
            )}
          </button>
        )}

        {/* Label + Progress */}
        <div className="flex-1 min-w-0">
          <p className="text-brand-cream/80 text-xs font-body truncate">
            {state.error || state.label}
          </p>
          {/* Progress bar */}
          {!state.error && (
            <div className="mt-1.5 h-1 rounded-full bg-brand-cream/10 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${state.progress}%`,
                  backgroundColor: accentColor,
                }}
              />
            </div>
          )}
          {/* Chunk indicator for long texts */}
          {!state.error && state.totalChunks > 1 && (
            <p className="text-[10px] mt-0.5 font-inter" style={{ color: `${accentColor}70` }}>
              Part {state.chunkIndex + 1} of {state.totalChunks}
            </p>
          )}
        </div>

        {/* Stop button */}
        <button
          onClick={() => {
            stop();
            onStopRef.current?.();
          }}
          className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center
                     text-brand-cream/40 hover:text-brand-cream/70 transition-colors"
          aria-label="Stop"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
          </svg>
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// SCRIPTURE UNLOCKED — AudioPlayer Component
// ═══════════════════════════════════════════════════════════════
// Floating mini-bar TTS player. Converts text to speech via
// ElevenLabs Edge Function, plays audio with simple controls.
// Single-track: new audio stops the previous track.
// ═══════════════════════════════════════════════════════════════

"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { textToSpeech } from "@/lib/api";

interface AudioPlayerProps {
  accentColor: string;
  /** Called when audio finishes naturally (for auto-continue) */
  onEnd?: () => void;
  /** Called when user manually stops playback */
  onStop?: () => void;
}

interface AudioState {
  isPlaying: boolean;
  isLoading: boolean;
  label: string;
  progress: number;
  error: string | null;
}

// Expose imperative methods via a ref-like pattern using a callback
export interface AudioPlayerHandle {
  play: (text: string, label?: string) => void;
  stop: () => void;
}

// We'll use a module-level ref so the main BibleStudy component can trigger playback
let playerInstance: AudioPlayerHandle | null = null;

export function getAudioPlayer(): AudioPlayerHandle | null {
  return playerInstance;
}

export default function AudioPlayer({ accentColor, onEnd, onStop }: AudioPlayerProps) {
  const [state, setState] = useState<AudioState>({
    isPlaying: false,
    isLoading: false,
    label: "",
    progress: 0,
    error: null,
  });

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Keep callback refs fresh without re-creating play/stop
  const onEndRef = useRef(onEnd);
  const onStopRef = useRef(onStop);
  useEffect(() => { onEndRef.current = onEnd; }, [onEnd]);
  useEffect(() => { onStopRef.current = onStop; }, [onStop]);

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

  // Track playback progress
  const trackProgress = useCallback(() => {
    if (!audioRef.current) return;

    const audio = audioRef.current;
    if (audio.duration && audio.duration > 0) {
      setState((s) => ({
        ...s,
        progress: (audio.currentTime / audio.duration) * 100,
      }));
    }

    if (!audio.paused && !audio.ended) {
      animFrameRef.current = requestAnimationFrame(trackProgress);
    }
  }, []);

  // Stop current playback
  const stop = useCallback(() => {
    cleanup();
    setState({
      isPlaying: false,
      isLoading: false,
      label: "",
      progress: 0,
      error: null,
    });
  }, [cleanup]);

  // Play new text
  const play = useCallback(
    async (text: string, label?: string) => {
      // Stop any current playback
      cleanup();

      setState({
        isPlaying: false,
        isLoading: true,
        label: label || "Loading audio...",
        progress: 0,
        error: null,
      });

      try {
        // Get audio blob from ElevenLabs via Edge Function
        const blob = await textToSpeech({ text });
        const url = URL.createObjectURL(blob);
        objectUrlRef.current = url;

        const audio = new Audio(url);
        audioRef.current = audio;

        // Set up event listeners
        audio.addEventListener("playing", () => {
          setState((s) => ({ ...s, isPlaying: true, isLoading: false }));
          trackProgress();
        });

        audio.addEventListener("pause", () => {
          setState((s) => ({ ...s, isPlaying: false }));
        });

        audio.addEventListener("ended", () => {
          setState((s) => ({
            ...s,
            isPlaying: false,
            progress: 100,
          }));
          // If there's an onEnd callback (auto-continue), call it
          // Otherwise auto-hide after 2s
          if (onEndRef.current) {
            onEndRef.current();
          } else {
            setTimeout(() => {
              stop();
            }, 2000);
          }
        });

        audio.addEventListener("error", () => {
          setState((s) => ({
            ...s,
            isPlaying: false,
            isLoading: false,
            error: "Audio playback failed",
          }));
        });

        setState((s) => ({ ...s, label: label || "Playing..." }));
        await audio.play();
      } catch (err) {
        console.error("TTS error:", err);
        setState((s) => ({
          ...s,
          isLoading: false,
          error: "Failed to generate audio. Try again.",
        }));
      }
    },
    [cleanup, stop, trackProgress]
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
    playerInstance = { play, stop };
    return () => {
      playerInstance = null;
      cleanup();
    };
  }, [play, stop, cleanup]);

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

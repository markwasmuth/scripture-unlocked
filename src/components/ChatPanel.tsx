// ═══════════════════════════════════════════════════════════════
// SCRIPTURE UNLOCKED — ChatPanel Component
// ═══════════════════════════════════════════════════════════════
// Q&A panel: ask any avatar a question about Scripture.
// Streams Claude responses in real-time. Maintains conversation
// history for follow-up questions.
// ═══════════════════════════════════════════════════════════════

"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { askAvatar } from "@/lib/api";
import { VOICES } from "@/lib/voices";
import type { AvatarId, ChatMessage } from "@/lib/api";

interface ChatPanelProps {
  avatar: AvatarId;
  verseContext?: string; // Current verse being studied
  accentColor: string;
  onListen?: (text: string, label: string) => void;
}

export default function ChatPanel({
  avatar,
  verseContext,
  accentColor,
  onListen,
}: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const voice = VOICES[avatar];

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Reset conversation when avatar changes
  useEffect(() => {
    setMessages([]);
    setError(null);
  }, [avatar]);

  // Auto-resize textarea
  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setInput(e.target.value);
      // Reset height then set to scrollHeight
      e.target.style.height = "auto";
      e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
    },
    []
  );

  const handleSubmit = useCallback(
    async (question?: string) => {
      const text = question || input.trim();
      if (!text || isLoading) return;

      setInput("");
      setError(null);

      // Reset textarea height
      if (inputRef.current) {
        inputRef.current.style.height = "auto";
      }

      // Add user message
      const userMessage: ChatMessage = { role: "user", content: text };
      const updatedHistory = [...messages, userMessage];
      setMessages(updatedHistory);
      setIsLoading(true);

      try {
        // Call the avatar API (non-streaming for reliability)
        const response = await askAvatar({
          avatar,
          message: text,
          conversationHistory: updatedHistory.slice(-10), // Last 10 messages for context
          verseContext,
          mode: "normal",
        });

        const assistantMessage: ChatMessage = {
          role: "assistant",
          content: response,
        };
        setMessages((prev) => [...prev, assistantMessage]);
      } catch (err) {
        console.error("Chat error:", err);
        setError(
          err instanceof Error
            ? err.message
            : "Failed to get a response. Please try again."
        );
      } finally {
        setIsLoading(false);
      }
    },
    [input, isLoading, messages, avatar, verseContext]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit]
  );

  const handleQuickQuestion = useCallback(
    (question: string) => {
      handleSubmit(question);
    },
    [handleSubmit]
  );

  const clearChat = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  // ── Speech-to-Text (Mic button) ──
  const toggleListening = useCallback(() => {
    // Stop if already listening
    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
      return;
    }

    // Check browser support
    const SpeechRecognition =
      (window as /* eslint-disable-next-line @typescript-eslint/no-explicit-any */ any).SpeechRecognition ||
      (window as /* eslint-disable-next-line @typescript-eslint/no-explicit-any */ any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setError("Speech recognition is not supported in this browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    recognitionRef.current = recognition;

    recognition.onstart = () => {
      setIsListening(true);
      setInterimTranscript("");
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = "";
      let final = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          final += t;
        } else {
          interim += t;
        }
      }
      // Show live interim text so user can see what's being heard
      setInterimTranscript(interim);
      // Commit final text to input
      if (final) {
        setInput((prev) => (prev ? `${prev} ${final}` : final));
        setInterimTranscript("");
        // Auto-resize textarea
        setTimeout(() => {
          if (inputRef.current) {
            inputRef.current.style.height = "auto";
            inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 120)}px`;
          }
        }, 0);
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error("Speech recognition error:", event.error);
      if (event.error !== "aborted") {
        setError("Couldn't hear you. Tap the mic and try again.");
      }
      setIsListening(false);
      setInterimTranscript("");
    };

    recognition.onend = () => {
      setIsListening(false);
      setInterimTranscript("");
    };

    recognition.start();
  }, [isListening]);

  // Clean up recognition on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  return (
    <div className="flex flex-col h-full max-h-[70vh] min-h-[400px]">
      {/* ── Messages Area ── */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
        {/* Empty State */}
        {messages.length === 0 && !isLoading && (
          <div className="flex flex-col items-center justify-center h-full gap-4 py-8">
            <span className="text-4xl">{voice.icon}</span>
            <p
              className="text-sm font-body text-center max-w-sm leading-relaxed italic"
              style={{ color: `${accentColor}90` }}
            >
              {voice.emptyStateText}
            </p>

            {/* Quick Questions */}
            <div className="flex flex-wrap gap-2 justify-center mt-2 max-w-md">
              {voice.quickQuestions.map((q, i) => (
                <button
                  key={i}
                  onClick={() => handleQuickQuestion(q)}
                  className="text-xs font-body px-3 py-1.5 rounded-full
                             transition-colors hover:brightness-125"
                  style={{
                    backgroundColor: `${accentColor}10`,
                    color: `${accentColor}CC`,
                    border: `1px solid ${accentColor}25`,
                  }}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Message Bubbles */}
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${
              msg.role === "user" ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={`
                max-w-[85%] sm:max-w-[75%] rounded-xl px-4 py-3
                font-body text-sm leading-relaxed
                ${
                  msg.role === "user"
                    ? "bg-brand-cream/10 text-brand-cream/90 rounded-br-sm"
                    : "rounded-bl-sm"
                }
              `}
              style={
                msg.role === "assistant"
                  ? {
                      backgroundColor: `${accentColor}10`,
                      borderLeft: `2px solid ${accentColor}40`,
                    }
                  : undefined
              }
            >
              {msg.role === "assistant" && (
                <span className="text-xs font-display uppercase tracking-wider block mb-1.5"
                  style={{ color: accentColor }}
                >
                  {voice.icon} {voice.name}
                </span>
              )}
              <div className="whitespace-pre-line">{msg.content}</div>
              {/* Listen button on assistant messages */}
              {msg.role === "assistant" && onListen && (
                <button
                  onClick={() => onListen(msg.content, `${voice.name}'s response`)}
                  className="flex items-center gap-1.5 mt-2 text-[11px] font-body
                             px-2.5 py-1 rounded-md transition-colors hover:brightness-125"
                  style={{
                    backgroundColor: `${accentColor}12`,
                    color: `${accentColor}BB`,
                    border: `1px solid ${accentColor}20`,
                  }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                    <path d="M10 3.75a.75.75 0 00-1.264-.546L4.703 7H3.167a.75.75 0 00-.7.48A6.985 6.985 0 002 10c0 .887.165 1.737.468 2.52.111.29.39.48.7.48h1.535l4.033 3.796A.75.75 0 0010 16.25V3.75zM15.95 5.05a.75.75 0 00-1.06 1.061 5.5 5.5 0 010 7.778.75.75 0 001.06 1.06 7 7 0 000-9.899z" />
                    <path d="M13.829 7.172a.75.75 0 00-1.061 1.06 2.5 2.5 0 010 3.536.75.75 0 001.06 1.06 4 4 0 000-5.656z" />
                  </svg>
                  Listen
                </button>
              )}
            </div>
          </div>
        ))}

        {/* Loading Indicator */}
        {isLoading && (
          <div className="flex justify-start">
            <div
              className="rounded-xl rounded-bl-sm px-4 py-3"
              style={{ backgroundColor: `${accentColor}10` }}
            >
              <span
                className="text-xs font-display uppercase tracking-wider block mb-1.5"
                style={{ color: accentColor }}
              >
                {voice.icon} {voice.name}
              </span>
              <div className="flex items-center gap-1.5">
                <span
                  className="text-sm font-body italic"
                  style={{ color: `${accentColor}80` }}
                >
                  {voice.loadingText}
                </span>
                <span className="flex gap-1">
                  {[0, 1, 2].map((j) => (
                    <span
                      key={j}
                      className="w-1.5 h-1.5 rounded-full animate-pulse"
                      style={{
                        backgroundColor: accentColor,
                        animationDelay: `${j * 200}ms`,
                      }}
                    />
                  ))}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="text-center py-2">
            <p className="text-red-400/80 text-xs font-body">{error}</p>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* ── Listening Status Banner ── */}
      {isListening && (
        <div
          className="mx-4 mb-2 rounded-xl px-4 py-3 flex flex-col gap-1.5"
          style={{
            backgroundColor: `${accentColor}12`,
            border: `1px solid ${accentColor}35`,
          }}
        >
          {/* Status row */}
          <div className="flex items-center gap-2">
            {/* Pulsing mic dot */}
            <span
              className="w-2.5 h-2.5 rounded-full animate-pulse flex-shrink-0"
              style={{ backgroundColor: "#ef4444" }}
            />
            <span
              className="text-xs font-display uppercase tracking-widest"
              style={{ color: accentColor }}
            >
              Listening…
            </span>
            <button
              onClick={toggleListening}
              className="ml-auto text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-md"
              style={{
                color: `${accentColor}80`,
                border: `1px solid ${accentColor}30`,
              }}
            >
              Done
            </button>
          </div>
          {/* Live transcript */}
          <p
            className="text-sm font-body min-h-[20px] italic leading-snug"
            style={{ color: interimTranscript ? `${accentColor}CC` : `${accentColor}40` }}
          >
            {interimTranscript || "Speak now — I'm hearing you…"}
          </p>
        </div>
      )}

      {/* ── Input Area ── */}
      <div className="border-t border-brand-gold/10 px-4 py-3">
        {/* Clear chat button (when messages exist) */}
        {messages.length > 0 && (
          <div className="flex justify-end mb-2">
            <button
              onClick={clearChat}
              className="text-brand-cream/30 hover:text-brand-cream/50
                         text-[10px] uppercase tracking-wider transition-colors"
            >
              Clear conversation
            </button>
          </div>
        )}

        <div className="flex gap-2 items-end">
          <textarea
            ref={inputRef}
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={`Ask ${voice.name} a question...`}
            rows={1}
            className="flex-1 bg-brand-cream/5 border border-brand-gold/15
                       rounded-xl px-4 py-2.5 text-sm font-body
                       text-brand-cream/90 placeholder:text-brand-cream/30
                       focus:outline-none focus:border-brand-gold/40
                       resize-none overflow-hidden transition-colors"
            disabled={isLoading}
          />

          {/* Mic button — speech-to-text */}
          <button
            onClick={toggleListening}
            disabled={isLoading}
            className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center
                       transition-all disabled:opacity-30 disabled:cursor-not-allowed
                       hover:brightness-110 ${isListening ? "animate-pulse" : ""}`}
            style={{
              backgroundColor: isListening ? `${accentColor}40` : `${accentColor}15`,
              color: isListening ? accentColor : `${accentColor}80`,
              border: isListening ? `2px solid ${accentColor}` : "2px solid transparent",
            }}
            aria-label={isListening ? "Stop listening" : "Speak your question"}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="w-5 h-5"
            >
              <path d="M8.25 4.5a3.75 3.75 0 117.5 0v8.25a3.75 3.75 0 11-7.5 0V4.5z" />
              <path d="M6 10.5a.75.75 0 01.75.75v1.5a5.25 5.25 0 1010.5 0v-1.5a.75.75 0 011.5 0v1.5a6.751 6.751 0 01-6 6.709V21h3a.75.75 0 010 1.5h-7.5a.75.75 0 010-1.5h3v-1.541A6.751 6.751 0 015.25 12.75v-1.5a.75.75 0 01.75-.75z" />
            </svg>
          </button>

          {/* Send button */}
          <button
            onClick={() => handleSubmit()}
            disabled={!input.trim() || isLoading}
            className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center
                       transition-all disabled:opacity-30 disabled:cursor-not-allowed
                       hover:brightness-110"
            style={{
              backgroundColor: input.trim() ? accentColor : `${accentColor}20`,
              color: input.trim() ? "#14142E" : `${accentColor}60`,
            }}
            aria-label="Send message"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="w-5 h-5"
            >
              <path d="M3.105 2.289a.75.75 0 00-.826.95l1.414 4.925A1.5 1.5 0 005.135 9.25h6.115a.75.75 0 010 1.5H5.135a1.5 1.5 0 00-1.442 1.086l-1.414 4.926a.75.75 0 00.826.95 28.896 28.896 0 0015.293-7.154.75.75 0 000-1.115A28.897 28.897 0 003.105 2.289z" />
            </svg>
          </button>
        </div>

        <p className="text-brand-cream/20 text-[10px] mt-2 text-center font-body">
          Tap 🎤 to speak or type • Shift+Enter for new line • KJV only
        </p>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// SCRIPTURE UNLOCKED — BookSelector Component
// ═══════════════════════════════════════════════════════════════
// Two-step picker: choose a book → choose a chapter.
// Fetches live data from Supabase. Groups books by testament.
// ═══════════════════════════════════════════════════════════════

"use client";

import { useState, useEffect, useCallback } from "react";
import { getBooks } from "@/lib/api";
import type { BookRow } from "@/lib/api";
import { BRAND } from "@/lib/brand";

interface BookSelectorProps {
  onSelect: (bookId: number, bookName: string, chapter: number) => void;
  currentBook?: string;
  currentChapter?: number;
}

type Testament = "OT" | "NT" | "AP" | "PS";

const TESTAMENT_LABELS: Record<Testament, string> = {
  OT: "Old Testament",
  NT: "New Testament",
  AP: "Apocrypha",
  PS: "Pseudepigrapha",
};

const TESTAMENT_ORDER: Testament[] = ["OT", "NT", "AP", "PS"];

export default function BookSelector({
  onSelect,
  currentBook,
  currentChapter,
}: BookSelectorProps) {
  const [books, setBooks] = useState<BookRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedBook, setSelectedBook] = useState<BookRow | null>(null);
  const [activeTestament, setActiveTestament] = useState<Testament>("OT");
  const [isOpen, setIsOpen] = useState(false);

  // Fetch books on mount
  useEffect(() => {
    async function loadBooks() {
      try {
        const data = await getBooks();
        setBooks(data);
      } catch (err) {
        setError("Failed to load books");
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadBooks();
  }, []);

  // Group books by testament
  const booksByTestament = books.reduce<Record<Testament, BookRow[]>>(
    (acc, book) => {
      const t = book.testament as Testament;
      if (!acc[t]) acc[t] = [];
      acc[t].push(book);
      return acc;
    },
    { OT: [], NT: [], AP: [], PS: [] }
  );

  const handleBookClick = useCallback((book: BookRow) => {
    setSelectedBook(book);
  }, []);

  const handleChapterClick = useCallback(
    (chapter: number) => {
      if (!selectedBook) return;
      onSelect(selectedBook.id, selectedBook.name, chapter);
      setIsOpen(false);
      setSelectedBook(null);
    },
    [selectedBook, onSelect]
  );

  const handleBack = useCallback(() => {
    setSelectedBook(null);
  }, []);

  // Current selection display
  const displayText = currentBook
    ? `${currentBook} ${currentChapter ?? ""}`
    : "Select a Book";

  return (
    <div className="relative">
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 rounded-lg
                   bg-brand-navy border border-brand-gold/30
                   hover:border-brand-gold/60 transition-colors
                   text-brand-cream font-body text-sm sm:text-base"
      >
        <span className="text-brand-gold">📖</span>
        <span>{displayText}</span>
        <span className="text-brand-gold/60 text-xs ml-1">
          {isOpen ? "▲" : "▼"}
        </span>
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div
          className="absolute top-full left-0 mt-2 w-[340px] sm:w-[400px] max-h-[70vh]
                     bg-brand-navy border border-brand-gold/20 rounded-xl shadow-2xl
                     overflow-hidden z-50"
        >
          {loading ? (
            <div className="p-8 text-center text-brand-cream/60">
              Loading books...
            </div>
          ) : error ? (
            <div className="p-8 text-center text-red-400">{error}</div>
          ) : selectedBook ? (
            /* ── Chapter Grid ── */
            <div>
              <button
                onClick={handleBack}
                className="w-full flex items-center gap-2 px-4 py-3
                           text-brand-gold hover:bg-brand-gold/10 transition-colors
                           border-b border-brand-gold/10 text-sm"
              >
                <span>←</span>
                <span>Back to Books</span>
              </button>
              <div className="px-4 py-3 border-b border-brand-gold/10">
                <h3 className="text-brand-cream font-display text-base">
                  {selectedBook.name}
                </h3>
                <p className="text-brand-cream/40 text-xs mt-0.5">
                  {selectedBook.total_chapters} chapters
                </p>
              </div>
              <div className="p-3 overflow-y-auto max-h-[50vh]">
                <div className="grid grid-cols-6 sm:grid-cols-8 gap-1.5">
                  {Array.from(
                    { length: selectedBook.total_chapters },
                    (_, i) => i + 1
                  ).map((ch) => (
                    <button
                      key={ch}
                      onClick={() => handleChapterClick(ch)}
                      className={`
                        w-full aspect-square rounded-lg text-sm font-body
                        flex items-center justify-center transition-all
                        ${
                          currentBook === selectedBook.name &&
                          currentChapter === ch
                            ? "bg-brand-gold text-brand-navy font-bold"
                            : "bg-brand-gold/5 text-brand-cream/70 hover:bg-brand-gold/20 hover:text-brand-cream"
                        }
                      `}
                    >
                      {ch}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            /* ── Book List ── */
            <div>
              {/* Testament Tabs */}
              <div className="flex border-b border-brand-gold/10">
                {TESTAMENT_ORDER.map((t) => {
                  if (booksByTestament[t].length === 0) return null;
                  return (
                    <button
                      key={t}
                      onClick={() => setActiveTestament(t)}
                      className={`
                        flex-1 px-2 py-2.5 text-xs sm:text-sm font-display transition-colors
                        ${
                          activeTestament === t
                            ? "text-brand-gold border-b-2 border-brand-gold"
                            : "text-brand-cream/40 hover:text-brand-cream/70"
                        }
                      `}
                    >
                      {t}
                    </button>
                  );
                })}
              </div>

              {/* Book Grid */}
              <div className="p-3 overflow-y-auto max-h-[55vh]">
                <p className="text-brand-cream/30 text-xs mb-2 px-1">
                  {TESTAMENT_LABELS[activeTestament]}
                </p>
                <div className="grid grid-cols-2 gap-1.5">
                  {booksByTestament[activeTestament].map((book) => (
                    <button
                      key={book.id}
                      onClick={() => handleBookClick(book)}
                      className={`
                        text-left px-3 py-2 rounded-lg text-sm transition-all
                        ${
                          currentBook === book.name
                            ? "bg-brand-gold/20 text-brand-gold"
                            : "text-brand-cream/70 hover:bg-brand-gold/10 hover:text-brand-cream"
                        }
                      `}
                    >
                      <span className="block truncate">{book.name}</span>
                      <span className="text-[10px] opacity-40">
                        {book.total_chapters} ch
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

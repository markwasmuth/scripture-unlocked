// ═══════════════════════════════════════════════════════════════
// SCRIPTURE UNLOCKED — API Helper Functions
// ═══════════════════════════════════════════════════════════════
// Client-side functions for calling Edge Functions and querying
// the Supabase database. All API keys are stored server-side
// in Supabase Secrets — never exposed to the browser.
// ═══════════════════════════════════════════════════════════════

import { supabase } from "./supabase";

// ── Types ────────────────────────────────────────────────────

export type AvatarId = "moses" | "elijah" | "deborah";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface AskAvatarParams {
  avatar: AvatarId;
  message: string;
  conversationHistory?: ChatMessage[];
  verseContext?: string;
  mode?: "normal" | "expansion";
  model?: string;
  stream?: boolean;
}

export interface TTSParams {
  text: string;
  voice_id?: string;
  model_id?: string;
  output_format?: string;
  stability?: number;
  similarity_boost?: number;
}

export interface BookRow {
  id: number;
  name: string;
  name_short: string;
  name_tts: string;
  testament: "OT" | "NT" | "AP" | "PS";
  book_order: number;
  total_chapters: number;
}

export interface StudyRow {
  id: number;
  book_id: number;
  chapter: number;
  title: string;
  introduction: string | null;
  introduction_tts: string | null;
  source_url: string | null;
  avatar: string | null;
}

export interface VerseRow {
  id: number;
  study_id: number;
  book_id: number;
  chapter: number;
  verse_number: number;
  verse_text: string;
  verse_text_tts: string | null;
  commentary: string | null;
  commentary_tts: string | null;
  cross_refs: string | null;
  strongs_refs: string | object | null;
  speaker_type: string | null;
  connects_to_previous: string | null;
  god_principle: string | null;
}

export interface StrongsEntry {
  id: number;
  strongs_number: string;
  word: string;
  transliteration: string;
  pronunciation: string;
  definition: string;
  kjv_usage: string;
}

export interface SmithsEntry {
  id: number;
  term: string;
  definition: string;
}

export interface WebstersEntry {
  id: number;
  word: string;
  part_of_speech: string | null;
  definition: string;
}

export interface CompanionAppendix {
  id: number;
  appendix_number: string;
  title: string;
  content: string;
  scripture_refs: string[] | null;
}

// ── Ask Avatar (Claude API via Edge Function) ────────────────

/**
 * Send a question to an avatar and get a streaming response.
 * Returns a ReadableStream for real-time text display.
 */
export async function askAvatarStream(
  params: AskAvatarParams
): Promise<ReadableStream<Uint8Array> | null> {
  const { data, error } = await supabase.functions.invoke("ask-avatar", {
    body: { ...params, stream: true },
  });

  if (error) {
    console.error("askAvatarStream error:", error);
    throw new Error(error.message || "Failed to get avatar response");
  }

  // The response from invoke with streaming is the raw Response
  // We need to handle this differently
  return data;
}

/**
 * Send a question to an avatar and get the full response at once.
 * Simpler than streaming — good for short answers.
 */
export async function askAvatar(
  params: AskAvatarParams
): Promise<string> {
  const { data, error } = await supabase.functions.invoke("ask-avatar", {
    body: { ...params, stream: false },
  });

  if (error) {
    console.error("askAvatar error:", error);
    throw new Error(error.message || "Failed to get avatar response");
  }

  // Claude API non-streaming response format
  if (data?.content?.[0]?.text) {
    return data.content[0].text;
  }

  throw new Error("Unexpected response format from avatar");
}

// ── Text-to-Speech (ElevenLabs via Edge Function) ────────────

/**
 * Convert text to speech audio.
 * Returns an audio Blob that can be played with new Audio(URL.createObjectURL(blob)).
 *
 * NOTE: We use fetch() directly instead of supabase.functions.invoke()
 * because the Supabase JS SDK doesn't handle binary audio responses
 * correctly — it tries to parse the response as JSON by default,
 * which corrupts the MP3 data. Direct fetch + .blob() works reliably.
 */
export async function textToSpeech(params: TTSParams): Promise<Blob> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Missing Supabase environment variables");
  }

  const response = await fetch(
    `${supabaseUrl}/functions/v1/text-to-speech`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${supabaseAnonKey}`,
        apikey: supabaseAnonKey,
      },
      body: JSON.stringify(params),
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    console.error("textToSpeech error:", response.status, errorData);
    throw new Error(
      (errorData as { error?: string }).error || `TTS failed with status ${response.status}`
    );
  }

  return await response.blob();
}

/**
 * Play text as audio using ElevenLabs TTS.
 * Returns the HTMLAudioElement for playback control.
 */
export async function playText(
  text: string,
  voiceId?: string
): Promise<HTMLAudioElement> {
  const blob = await textToSpeech({ text, voice_id: voiceId });
  const url = URL.createObjectURL(blob);
  const audio = new Audio(url);

  // Clean up the URL when audio finishes
  audio.addEventListener("ended", () => URL.revokeObjectURL(url));
  audio.addEventListener("error", () => URL.revokeObjectURL(url));

  await audio.play();
  return audio;
}

// ── Database Queries ─────────────────────────────────────────

/** Get all books, optionally filtered by testament */
export async function getBooks(testament?: "OT" | "NT" | "AP" | "PS"): Promise<BookRow[]> {
  let query = supabase
    .from("books")
    .select("*")
    .order("book_order", { ascending: true });

  if (testament) {
    query = query.eq("testament", testament);
  }

  const { data, error } = await query;
  if (error) throw new Error(`Failed to fetch books: ${error.message}`);
  return data || [];
}

/** Get a single book by name */
export async function getBookByName(name: string): Promise<BookRow | null> {
  const { data, error } = await supabase
    .from("books")
    .select("*")
    .eq("name", name)
    .single();

  if (error) return null;
  return data;
}

/** Get all studies for a book */
export async function getStudies(bookId: number): Promise<StudyRow[]> {
  const { data, error } = await supabase
    .from("studies")
    .select("*")
    .eq("book_id", bookId)
    .order("chapter", { ascending: true });

  if (error) throw new Error(`Failed to fetch studies: ${error.message}`);
  return data || [];
}

/** Get a specific study by book and chapter */
export async function getStudy(
  bookId: number,
  chapter: number
): Promise<StudyRow | null> {
  const { data, error } = await supabase
    .from("studies")
    .select("*")
    .eq("book_id", bookId)
    .eq("chapter", chapter)
    .single();

  if (error) return null;
  return data;
}

/** Get all verses for a study */
export async function getVerses(studyId: number): Promise<VerseRow[]> {
  const { data, error } = await supabase
    .from("verses")
    .select("*")
    .eq("study_id", studyId)
    .order("verse_number", { ascending: true });

  if (error) throw new Error(`Failed to fetch verses: ${error.message}`);
  return data || [];
}

/** Get verses by book and chapter (without needing study ID) */
export async function getVersesByChapter(
  bookId: number,
  chapter: number
): Promise<VerseRow[]> {
  const { data, error } = await supabase
    .from("verses")
    .select("*")
    .eq("book_id", bookId)
    .eq("chapter", chapter)
    .order("verse_number", { ascending: true });

  if (error) throw new Error(`Failed to fetch verses: ${error.message}`);
  return data || [];
}

/** Get a single verse */
export async function getVerse(
  bookId: number,
  chapter: number,
  verseNumber: number
): Promise<VerseRow | null> {
  const { data, error } = await supabase
    .from("verses")
    .select("*")
    .eq("book_id", bookId)
    .eq("chapter", chapter)
    .eq("verse_number", verseNumber)
    .single();

  if (error) return null;
  return data;
}

// ── Strong's Concordance ─────────────────────────────────────

/** Look up a Hebrew Strong's number */
export async function getStrongsHebrew(
  number: string
): Promise<StrongsEntry | null> {
  // Normalize: ensure it starts with H
  const normalized = number.toUpperCase().startsWith("H")
    ? number.toUpperCase()
    : `H${number}`;

  const { data, error } = await supabase
    .from("strongs_hebrew")
    .select("*")
    .eq("strongs_number", normalized)
    .single();

  if (error) return null;
  return data;
}

/** Look up a Greek Strong's number */
export async function getStrongsGreek(
  number: string
): Promise<StrongsEntry | null> {
  // Normalize: ensure it starts with G
  const normalized = number.toUpperCase().startsWith("G")
    ? number.toUpperCase()
    : `G${number}`;

  const { data, error } = await supabase
    .from("strongs_greek")
    .select("*")
    .eq("strongs_number", normalized)
    .single();

  if (error) return null;
  return data;
}

/** Search Strong's entries by keyword in definition */
export async function searchStrongs(
  keyword: string,
  language: "hebrew" | "greek" = "hebrew"
): Promise<StrongsEntry[]> {
  const table = language === "hebrew" ? "strongs_hebrew" : "strongs_greek";

  const { data, error } = await supabase
    .from(table)
    .select("*")
    .ilike("definition", `%${keyword}%`)
    .limit(20);

  if (error) throw new Error(`Failed to search Strong's: ${error.message}`);
  return data || [];
}

// ── Dictionaries ─────────────────────────────────────────────

/** Look up a term in Smith's Bible Dictionary */
export async function lookupSmiths(term: string): Promise<SmithsEntry | null> {
  const { data, error } = await supabase
    .from("smiths_dictionary")
    .select("*")
    .ilike("term", term)
    .single();

  if (error) return null;
  return data;
}

/** Look up a word in Webster's 1828 Dictionary */
export async function lookupWebsters(
  word: string
): Promise<WebstersEntry | null> {
  const { data, error } = await supabase
    .from("websters_1828")
    .select("*")
    .ilike("word", word)
    .single();

  if (error) return null;
  return data;
}

/** Search Smith's Bible Dictionary entries */
export async function searchSmiths(
  keyword: string
): Promise<SmithsEntry[]> {
  const { data, error } = await supabase
    .from("smiths_dictionary")
    .select("*")
    .ilike("term", `%${keyword}%`)
    .limit(20);

  if (error)
    throw new Error(`Failed to search Smith's: ${error.message}`);
  return data || [];
}

/** Search Webster's 1828 Dictionary entries */
export async function searchWebsters(
  keyword: string
): Promise<WebstersEntry[]> {
  const { data, error } = await supabase
    .from("websters_1828")
    .select("*")
    .ilike("word", `%${keyword}%`)
    .limit(20);

  if (error)
    throw new Error(`Failed to search Webster's: ${error.message}`);
  return data || [];
}

// ── Companion Bible ──────────────────────────────────────────

/** Get a Companion Bible appendix by number */
export async function getAppendix(
  appendixNumber: string
): Promise<CompanionAppendix | null> {
  const { data, error } = await supabase
    .from("companion_appendixes")
    .select("*")
    .eq("appendix_number", appendixNumber)
    .single();

  if (error) return null;
  return data;
}

/** Search Companion Bible appendixes by keyword (returns summary without full content) */
export async function searchAppendixes(
  keyword: string
): Promise<Pick<CompanionAppendix, "id" | "appendix_number" | "title">[]> {
  const { data, error } = await supabase
    .from("companion_appendixes")
    .select("id, appendix_number, title")
    .or(`title.ilike.%${keyword}%,content.ilike.%${keyword}%`)
    .limit(20);

  if (error)
    throw new Error(`Failed to search appendixes: ${error.message}`);
  return data || [];
}

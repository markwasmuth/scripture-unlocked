"""
Scripture Unlocked — Data Pipeline
===================================
Loads TheSeason.org Bible studies + Strong's Concordance into Supabase.
Generates both display text and TTS-ready (ElevenLabs-friendly) versions.

Usage:
    python scripts/load_bible_data.py

Requires:
    pip install supabase python-dotenv
"""

import json
import re
import os
import sys
import time
import io
from pathlib import Path

# Fix Windows console encoding for emoji/unicode
if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
SUPABASE_URL = "https://dnocwcqyjltjertilfff.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRub2N3Y3F5amx0amVydGlsZmZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIzNjc2OTMsImV4cCI6MjA4Nzk0MzY5M30.HLPi3pjqHQd2bi3YQjE2r_X_b6ypBj6f7yeYzeV04Ko"

DATA_DIR = Path("E:/OneDrive/Documents/Business/10 AI Business incuding Bible, Airplane,/Bible Study AP & AI/Custom AIs and GPT")
SEASON_JSON = DATA_DIR / "The Season" / "data_out" / "theseason_cleaned.json"
STRONGS_HEBREW = DATA_DIR / "Strongs Concordance" / "strongs_hebrew_only.json"
STRONGS_GREEK = DATA_DIR / "Strongs Concordance" / "strongs_greek_only.json"


# ---------------------------------------------------------------------------
# Book name mapping: Season data key → database book name
# ---------------------------------------------------------------------------
BOOK_MAP = {
    "genesis": "Genesis", "exodus": "Exodus", "leviticus": "Leviticus",
    "numbers": "Numbers", "deut": "Deuteronomy", "joshua": "Joshua",
    "judges": "Judges", "ruth": "Ruth",
    "1samuel": "1 Samuel", "2samuel": "2 Samuel",
    "1kings": "1 Kings", "2kings": "2 Kings",
    "i_chronicles": "1 Chronicles", "ii_chronicles": "2 Chronicles",
    "ezra": "Ezra", "nehemiah": "Nehemiah", "esther": "Esther",
    "job": "Job", "psalms": "Psalms", "proverbs": "Proverbs",
    "ecclesiastes": "Ecclesiastes", "song": "Song of Solomon",
    "isaiah": "Isaiah", "jeremiah": "Jeremiah", "lamentations": "Lamentations",
    "ezekiel": "Ezekiel", "daniel": "Daniel",
    "hosea": "Hosea", "joel": "Joel", "amos": "Amos", "obadiah": "Obadiah",
    "jonah": "Jonah", "micah": "Micah", "nahum": "Nahum",
    "habakkuk": "Habakkuk", "zephaniah": "Zephaniah", "haggai": "Haggai",
    "zechariah": "Zechariah", "malachi": "Malachi",
    "matthew": "Matthew", "mark": "Mark", "luke": "Luke", "john": "John",
    "acts": "Acts", "romans": "Romans",
    "1corin": "1 Corinthians", "2corin": "2 Corinthians",
    "galatians": "Galatians", "ephesians": "Ephesians",
    "philippians": "Philippians", "colossians": "Colossians",
    "1thess": "1 Thessalonians", "2thess": "2 Thessalonians",
    "1timothy": "1 Timothy", "2timothy": "2 Timothy",
    "titus": "Titus", "philemon": "Philemon", "hebrews": "Hebrews",
    "james": "James",
    "1peter": "1 Peter", "2peter": "2 Peter",
    "1john": "1 John", "2john": "2 John", "3john": "3 John",
    "jude": "Jude", "revelation": "Revelation",
}


# ===========================================================================
# TTS SANITIZER — Makes text ElevenLabs-friendly
# ===========================================================================
class TTSSanitizer:
    """
    Transforms raw Bible study text into clean spoken-word format
    for ElevenLabs text-to-speech. Handles:
    - Strong's reference numbers (H430, G2316)
    - Bible verse references (Gen 3:15, II Kings 4:1)
    - Roman numerals in book names (I, II, III)
    - Abbreviations (KJV, vs., cf., i.e., e.g.)
    - Formatting artifacts (newlines, HTML, smart quotes)
    - Numbers and special characters
    """

    # Roman numeral book prefixes → spoken form
    ROMAN_BOOKS = {
        "I ": "First ", "II ": "Second ", "III ": "Third ",
        "1 ": "First ", "2 ": "Second ", "3 ": "Third ",
    }

    # Bible book abbreviations → full spoken names
    BOOK_ABBREVS = {
        r'\bGen\.?\b': 'Genesis', r'\bExod\.?\b': 'Exodus',
        r'\bLev\.?\b': 'Leviticus', r'\bNum\.?\b': 'Numbers',
        r'\bDeut\.?\b': 'Deuteronomy', r'\bJosh\.?\b': 'Joshua',
        r'\bJudg\.?\b': 'Judges', r'\bProv\.?\b': 'Proverbs',
        r'\bEccl\.?\b': 'Ecclesiastes', r'\bIsa\.?\b': 'Isaiah',
        r'\bJer\.?\b': 'Jeremiah', r'\bLam\.?\b': 'Lamentations',
        r'\bEzek\.?\b': 'Ezekiel', r'\bDan\.?\b': 'Daniel',
        r'\bHos\.?\b': 'Hosea', r'\bObad\.?\b': 'Obadiah',
        r'\bMic\.?\b': 'Micah', r'\bNah\.?\b': 'Nahum',
        r'\bHab\.?\b': 'Habakkuk', r'\bZeph\.?\b': 'Zephaniah',
        r'\bHag\.?\b': 'Haggai', r'\bZech\.?\b': 'Zechariah',
        r'\bMal\.?\b': 'Malachi',
        r'\bMatt\.?\b': 'Matthew', r'\bRom\.?\b': 'Romans',
        r'\bCor\.?\b': 'Corinthians', r'\bGal\.?\b': 'Galatians',
        r'\bEph\.?\b': 'Ephesians', r'\bPhil\.?\b': 'Philippians',
        r'\bCol\.?\b': 'Colossians', r'\bThess\.?\b': 'Thessalonians',
        r'\bTim\.?\b': 'Timothy', r'\bPhlm\.?\b': 'Philemon',
        r'\bHeb\.?\b': 'Hebrews', r'\bJas\.?\b': 'James',
        r'\bPet\.?\b': 'Peter', r'\bRev\.?\b': 'Revelation',
        r'\bPs\.?\b': 'Psalms', r'\bSam\.?\b': 'Samuel',
        r'\bKgs\.?\b': 'Kings', r'\bChr\.?\b': 'Chronicles',
        r'\bNeh\.?\b': 'Nehemiah', r'\bEsth\.?\b': 'Esther',
    }

    # Common abbreviations → spoken form
    ABBREVIATIONS = {
        r'\bKJV\b': 'King James Version',
        r'\bOT\b': 'Old Testament',
        r'\bNT\b': 'New Testament',
        r'\bi\.e\.': 'that is',
        r'\be\.g\.': 'for example',
        r'\bcf\.': 'compare with',
        r'\bvs\.': 'verse',
        r'\bv\.\s*(\d)': r'verse \1',
        r'\bvv\.': 'verses',
        r'\bch\.': 'chapter',
        r'\bSt\.': 'Saint',
        r'\betc\.': 'etcetera',
        r'\bDr\.': 'Doctor',
        r'\bMr\.': 'Mister',
        r'\bMrs\.': 'Missus',
    }

    @classmethod
    def sanitize(cls, text: str) -> str:
        """Full sanitization pipeline for TTS output."""
        if not text:
            return ""

        result = text

        # Step 1: Remove HTML tags
        result = re.sub(r'<[^>]+>', '', result)

        # Step 2: Normalize whitespace (newlines, tabs, multiple spaces)
        result = result.replace('\n', ' ').replace('\r', ' ').replace('\t', ' ')
        result = re.sub(r'\s{2,}', ' ', result)

        # Step 3: Fix smart quotes and special characters
        result = result.replace('\u201c', '"').replace('\u201d', '"')  # smart double quotes
        result = result.replace('\u2018', "'").replace('\u2019', "'")  # smart single quotes
        result = result.replace('\u2014', ' — ')   # em dash
        result = result.replace('\u2013', ' – ')   # en dash
        result = result.replace('\u2026', '...')    # ellipsis character
        result = result.replace('\xa0', ' ')        # non-breaking space

        # Step 4: Expand Strong's references BEFORE other number processing
        # H430 → "Strong's Hebrew number 430"
        result = re.sub(
            r'\bH(\d+)\b',
            lambda m: f"Strong's Hebrew number {m.group(1)}",
            result
        )
        # G2316 → "Strong's Greek number 2316"
        result = re.sub(
            r'\bG(\d+)\b',
            lambda m: f"Strong's Greek number {m.group(1)}",
            result
        )
        # OT:1961 or OT: 1961 format from Strong's inline refs
        result = re.sub(
            r'\bOT:\s*(\d+)\b',
            lambda m: f"Old Testament Strong's number {m.group(1)}",
            result
        )
        result = re.sub(
            r'\bNT:\s*(\d+)\b',
            lambda m: f"New Testament Strong's number {m.group(1)}",
            result
        )

        # Step 5: Expand Bible book abbreviations
        for pattern, replacement in cls.BOOK_ABBREVS.items():
            result = re.sub(pattern, replacement, result, flags=re.IGNORECASE)

        # Step 6: Handle Roman numeral book names
        # "I Corinthians" → "First Corinthians", "II Kings" → "Second Kings"
        result = re.sub(r'\bIII\s+', 'Third ', result)
        result = re.sub(r'\bII\s+', 'Second ', result)
        # Be careful with "I " — only replace when followed by a book name
        book_names = '(?:Samuel|Kings|Chronicles|Corinthians|Thessalonians|Timothy|Peter|John)'
        result = re.sub(rf'\bI\s+({book_names})', r'First \1', result)

        # Step 7: Expand verse references
        # "Genesis 3:15" → "Genesis chapter 3, verse 15"
        result = re.sub(
            r'(\b[A-Z][a-z]+(?:\s[A-Z][a-z]+)?)\s+(\d+):(\d+)(?:-(\d+))?',
            lambda m: cls._expand_verse_ref(m),
            result
        )

        # Step 8: Expand common abbreviations
        for pattern, replacement in cls.ABBREVIATIONS.items():
            result = re.sub(pattern, replacement, result)

        # Step 9: Handle parenthetical references
        # Remove bare parentheses but keep content
        result = result.replace('(', ', ').replace(')', ', ')

        # Step 10: Handle brackets — usually contain translation notes
        # [tohu] → "tohu"
        result = re.sub(r'\[([^\]]+)\]', r'\1', result)

        # Step 11: Handle semicolons in verse lists
        # "Genesis 1:1; 2:3; 3:15" — semicolons become natural pauses
        result = result.replace(';', '.')

        # Step 12: Clean up quotation marks for natural speech
        result = re.sub(r'"\s*([^"]+)\s*"', r'quote, \1, end quote', result)

        # Step 13: Handle ellipses — make them natural pauses
        result = re.sub(r'\.{3,}', '.', result)

        # Step 14: Handle numbers that should be spoken naturally
        # Year numbers: 1961 should stay as "nineteen sixty-one" (ElevenLabs handles this)
        # But Strong's dictionary numbers like "1961" in isolation need context
        # (Already handled in Step 4)

        # Step 15: Handle slashes
        result = result.replace('/', ' or ')

        # Step 16: Final cleanup
        result = re.sub(r'\s{2,}', ' ', result)  # collapse multiple spaces
        result = re.sub(r'\s+([.,!?])', r'\1', result)  # fix space before punctuation
        result = re.sub(r'([.,!?])\s*([.,!?])', r'\1', result)  # fix double punctuation
        result = result.strip()

        return result

    @classmethod
    def _expand_verse_ref(cls, match):
        """Expand a Bible verse reference for TTS."""
        book = match.group(1)
        chapter = match.group(2)
        verse_start = match.group(3)
        verse_end = match.group(4)

        if verse_end:
            return f"{book} chapter {chapter}, verses {verse_start} through {verse_end}"
        else:
            return f"{book} chapter {chapter}, verse {verse_start}"

    @classmethod
    def sanitize_verse_text(cls, text: str) -> str:
        """Lighter sanitization for KJV verse text (mostly clean already)."""
        if not text:
            return ""
        result = text
        result = result.replace('\n', ' ').replace('\r', ' ')
        result = re.sub(r'\s{2,}', ' ', result)
        result = result.strip()
        return result


# ===========================================================================
# DATA LOADING FUNCTIONS
# ===========================================================================

def load_strongs(supabase, filepath: Path, table: str):
    """Load Strong's Concordance entries into Supabase."""
    print(f"\n📖 Loading Strong's data from {filepath.name}...")

    with open(filepath, 'r', encoding='utf-8') as f:
        entries = json.load(f)

    print(f"   Found {len(entries)} entries")
    sanitizer = TTSSanitizer()

    batch = []
    for i, entry in enumerate(entries):
        row = {
            "strongs_number": entry.get("strongs_number", ""),
            "word": entry.get("original_word", ""),
            "transliteration": entry.get("transliteration", ""),
            "pronunciation": entry.get("pronunciation", ""),
            "definition": entry.get("definition", ""),
            "definition_tts": sanitizer.sanitize(entry.get("definition", "")),
            "kjv_usage": entry.get("kjv_usage", ""),
        }
        batch.append(row)

        # Insert in batches of 500
        if len(batch) >= 500:
            supabase.table(table).upsert(batch, on_conflict="strongs_number").execute()
            print(f"   ✓ Loaded {i + 1}/{len(entries)}")
            batch = []

    # Final batch
    if batch:
        supabase.table(table).upsert(batch, on_conflict="strongs_number").execute()
    print(f"   ✅ Done — {len(entries)} entries loaded into {table}")


def get_book_ids(supabase) -> dict:
    """Fetch all books and return name→id mapping."""
    result = supabase.table("books").select("id, name").execute()
    return {row["name"]: row["id"] for row in result.data}


def parse_chapter_content(entry: dict, sanitizer: TTSSanitizer):
    """
    Parse a Season entry into structured verses with commentary.

    The Season data has:
    - verse_text: array of {verse, text} for KJV text
    - content: full chapter commentary as one big string

    We need to:
    1. Extract each verse's KJV text
    2. Extract the commentary that follows each verse quote
    3. Generate TTS versions of both
    """
    verse_texts = entry.get("verse_text", [])
    full_content = entry.get("content", "")

    verses = []

    if not verse_texts:
        # Some entries may not have structured verse_text
        # Store the full content as a single entry
        return [{
            "verse_number": 1,
            "verse_text": "",
            "verse_text_tts": "",
            "commentary": full_content[:10000] if full_content else "",
            "commentary_tts": sanitizer.sanitize(full_content[:10000]) if full_content else "",
        }]

    # Build a map of verse numbers to their KJV text
    verse_map = {}
    for vt in verse_texts:
        vnum = vt.get("verse")
        text = vt.get("text", "")
        if vnum is not None:
            # Clean the verse text
            clean_text = text.replace('\n', ' ').strip()
            clean_text = re.sub(r'\s{2,}', ' ', clean_text)
            if vnum in verse_map:
                # Some verses appear split — concatenate
                verse_map[vnum] += " " + clean_text
            else:
                verse_map[vnum] = clean_text

    # Now try to extract per-verse commentary from the full content
    # The content typically quotes a verse then provides commentary
    # This is a best-effort extraction
    sorted_verses = sorted(verse_map.keys())

    for vnum in sorted_verses:
        vtext = verse_map[vnum]

        # Try to find commentary for this verse in the full content
        # Look for patterns like the verse text followed by commentary
        commentary = ""

        # Simple approach: search for the verse number pattern in content
        # and extract text until the next verse number
        patterns = [
            rf'{entry.get("chapter", "")}:{vnum}\b',
            rf'verse\s+{vnum}\b',
        ]

        for pattern in patterns:
            match = re.search(pattern, full_content, re.IGNORECASE)
            if match:
                start = match.start()
                # Find the next verse reference
                next_verse = vnum + 1
                next_patterns = [
                    rf'{entry.get("chapter", "")}:{next_verse}\b',
                    rf'verse\s+{next_verse}\b',
                ]
                end = len(full_content)
                for np in next_patterns:
                    next_match = re.search(np, full_content[start + 10:], re.IGNORECASE)
                    if next_match:
                        end = start + 10 + next_match.start()
                        break

                commentary = full_content[start:end].strip()
                # Remove the verse reference itself from the start
                commentary = re.sub(rf'^{re.escape(str(entry.get("chapter", "")))}:{vnum}\s*', '', commentary)
                break

        # If no per-verse commentary found, use empty (full content stored at study level)
        verses.append({
            "verse_number": vnum,
            "verse_text": vtext,
            "verse_text_tts": sanitizer.sanitize_verse_text(vtext),
            "commentary": commentary[:8000] if commentary else "",
            "commentary_tts": sanitizer.sanitize(commentary[:8000]) if commentary else "",
        })

    return verses


def load_season_data(supabase, season_path: Path):
    """Load TheSeason.org Bible studies into Supabase."""
    print(f"\n📜 Loading TheSeason.org data...")

    with open(season_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    entries = data["entries"]
    print(f"   Found {len(entries)} chapter entries across {data.get('total_entries', '?')} total")

    book_ids = get_book_ids(supabase)
    sanitizer = TTSSanitizer()

    loaded = 0
    skipped = 0
    errors = []

    for i, entry in enumerate(entries):
        book_key = entry.get("book", "")
        chapter = entry.get("chapter")
        content = entry.get("content", "")
        source_url = f"https://www.theseason.org/{book_key}/{book_key}{chapter}.htm"

        # Map to our book name
        book_name = BOOK_MAP.get(book_key)
        if not book_name:
            skipped += 1
            errors.append(f"Unknown book key: {book_key}")
            continue

        book_id = book_ids.get(book_name)
        if not book_id:
            skipped += 1
            errors.append(f"Book not in DB: {book_name}")
            continue

        if not chapter:
            skipped += 1
            continue

        try:
            # Extract introduction (first ~500 chars of content before verse commentary)
            intro = ""
            if content:
                # Take text up to the first verse reference
                intro_match = re.search(r'\d+:\d+', content)
                if intro_match and intro_match.start() > 50:
                    intro = content[:intro_match.start()].strip()[:2000]
                elif len(content) > 100:
                    intro = content[:500].strip()

            # Insert study record
            study_data = {
                "book_id": book_id,
                "chapter": chapter,
                "title": f"{book_name} Chapter {chapter}",
                "introduction": intro,
                "introduction_tts": sanitizer.sanitize(intro) if intro else "",
                "source_url": source_url,
                "avatar": "moses",
            }

            study_result = supabase.table("studies").upsert(
                study_data,
                on_conflict="book_id,chapter"
            ).execute()

            if not study_result.data:
                errors.append(f"Failed to insert study: {book_name} {chapter}")
                continue

            study_id = study_result.data[0]["id"]

            # Parse verses
            parsed_verses = parse_chapter_content(entry, sanitizer)

            # Insert verses in batch
            verse_rows = []
            for v in parsed_verses:
                verse_rows.append({
                    "study_id": study_id,
                    "book_id": book_id,
                    "chapter": chapter,
                    "verse_number": v["verse_number"],
                    "verse_text": v["verse_text"],
                    "verse_text_tts": v["verse_text_tts"],
                    "commentary": v["commentary"],
                    "commentary_tts": v["commentary_tts"],
                })

            if verse_rows:
                supabase.table("verses").upsert(
                    verse_rows,
                    on_conflict="book_id,chapter,verse_number"
                ).execute()

            loaded += 1
            if loaded % 50 == 0:
                print(f"   ✓ Loaded {loaded}/{len(entries)} chapters ({book_name} {chapter})")

        except Exception as e:
            errors.append(f"{book_name} {chapter}: {str(e)[:100]}")
            continue

    print(f"\n   ✅ Done — {loaded} chapters loaded, {skipped} skipped")
    if errors[:10]:
        print(f"   ⚠️  First errors: {errors[:10]}")


# ===========================================================================
# MAIN
# ===========================================================================
def main():
    print("=" * 60)
    print("  Scripture Unlocked — Data Pipeline")
    print("=" * 60)

    # Check for supabase package
    try:
        from supabase import create_client
    except ImportError:
        print("\n❌ Missing dependency. Run:")
        print("   pip install supabase python-dotenv")
        sys.exit(1)

    # Connect to Supabase
    print(f"\n🔌 Connecting to Supabase...")
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
    print(f"   ✓ Connected to {SUPABASE_URL}")

    # Verify books table
    books = supabase.table("books").select("id, name").execute()
    print(f"   ✓ {len(books.data)} books in database")

    # Load Strong's Concordance
    load_strongs(supabase, STRONGS_HEBREW, "strongs_hebrew")
    load_strongs(supabase, STRONGS_GREEK, "strongs_greek")

    # Load Season Bible studies
    load_season_data(supabase, SEASON_JSON)

    # Summary
    print("\n" + "=" * 60)
    print("  PIPELINE COMPLETE")
    print("=" * 60)

    studies = supabase.table("studies").select("id", count="exact").execute()
    verses = supabase.table("verses").select("id", count="exact").execute()
    hebrew = supabase.table("strongs_hebrew").select("id", count="exact").execute()
    greek = supabase.table("strongs_greek").select("id", count="exact").execute()

    print(f"  📊 Studies:        {studies.count}")
    print(f"  📊 Verses:         {verses.count}")
    print(f"  📊 Strong's Heb:   {hebrew.count}")
    print(f"  📊 Strong's Grk:   {greek.count}")
    print()


if __name__ == "__main__":
    main()

"""
Scripture Unlocked — Reference Data Pipeline
==============================================
Loads Smith's Bible Dictionary, Webster's 1828, Companion Bible appendixes,
Apocrypha, and Book of Enoch into Supabase.

Usage:
    python scripts/load_reference_data.py

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
SMITHS_JSON = DATA_DIR / "Smiths Bible Dictionary" / "smiths_bible_dictionary_cleaned.json"
WEBSTERS_JSON = DATA_DIR / "Webster 1828" / "websters_1828_biblical.json"
COMPANION_JSON = DATA_DIR / "Companion Bible" / "companion_out" / "companion_bible_cleaned.json"
APOCRYPHA_TXT = DATA_DIR / "Apocrypha" / "Apocrypha.txt"


# ===========================================================================
# TTS SANITIZER — Makes text ElevenLabs-friendly
# ===========================================================================
class TTSSanitizer:
    """
    Transforms raw reference text into clean spoken-word format
    for ElevenLabs text-to-speech.
    """

    # Roman numeral mapping for book names
    ROMAN_MAP = {
        'I': 'First', 'II': 'Second', 'III': 'Third', 'IV': 'Fourth',
        '1': 'First', '2': 'Second', '3': 'Third', '4': 'Fourth',
    }

    # Common abbreviations
    ABBREVIATIONS = {
        'Gen.': 'Genesis', 'Ex.': 'Exodus', 'Lev.': 'Leviticus',
        'Num.': 'Numbers', 'Deut.': 'Deuteronomy', 'Josh.': 'Joshua',
        'Judg.': 'Judges', 'Sam.': 'Samuel', 'Chron.': 'Chronicles',
        'Neh.': 'Nehemiah', 'Est.': 'Esther', 'Ps.': 'Psalms',
        'Prov.': 'Proverbs', 'Eccl.': 'Ecclesiastes', 'Isa.': 'Isaiah',
        'Jer.': 'Jeremiah', 'Lam.': 'Lamentations', 'Ezek.': 'Ezekiel',
        'Dan.': 'Daniel', 'Hos.': 'Hosea', 'Ob.': 'Obadiah',
        'Mic.': 'Micah', 'Nah.': 'Nahum', 'Hab.': 'Habakkuk',
        'Zeph.': 'Zephaniah', 'Hag.': 'Haggai', 'Zech.': 'Zechariah',
        'Mal.': 'Malachi', 'Matt.': 'Matthew', 'Mk.': 'Mark',
        'Lk.': 'Luke', 'Jn.': 'John', 'Rom.': 'Romans',
        'Cor.': 'Corinthians', 'Gal.': 'Galatians', 'Eph.': 'Ephesians',
        'Phil.': 'Philippians', 'Col.': 'Colossians',
        'Thess.': 'Thessalonians', 'Tim.': 'Timothy', 'Heb.': 'Hebrews',
        'Jas.': 'James', 'Pet.': 'Peter', 'Rev.': 'Revelation',
        'cf.': 'compare', 'i.e.': 'that is', 'e.g.': 'for example',
        'vs.': 'versus', 'etc.': 'and so forth', 'v.': 'verse',
        'vv.': 'verses', 'ch.': 'chapter', 'B.C.': 'B C',
        'A.D.': 'A D', 'KJV': 'King James Version',
        'A.V.': 'Authorized Version', 'R.V.': 'Revised Version',
        'SBD': "Smith's Bible Dictionary", 'N.T.': 'New Testament',
        'O.T.': 'Old Testament',
    }

    @classmethod
    def sanitize(cls, text: str) -> str:
        """Full sanitization pipeline for TTS."""
        if not text:
            return ""

        result = text

        # Strip HTML tags
        result = re.sub(r'<[^>]+>', '', result)

        # Remove page references like "Page 566"
        result = re.sub(r'\bPage\s+\d+\b', '', result)

        # Expand Bible reference patterns: (Genesis 8:4) → Genesis chapter 8, verse 4
        result = re.sub(
            r'\((\d?\s*[A-Z][a-z]+)\s+(\d+):(\d+)\)',
            lambda m: f"({m.group(1)} chapter {m.group(2)}, verse {m.group(3)})",
            result
        )

        # Expand inline refs like Gen 3:15
        result = re.sub(
            r'(\b[A-Z][a-z]+\.?\s+)(\d+):(\d+)',
            lambda m: f"{m.group(1)}chapter {m.group(2)}, verse {m.group(3)}",
            result
        )

        # Expand verse-only references like {1:3} → chapter 1, verse 3
        result = re.sub(
            r'\{(\d+):(\d+)\}',
            lambda m: f"chapter {m.group(1)}, verse {m.group(2)}",
            result
        )

        # Replace abbreviations
        for abbr, full in cls.ABBREVIATIONS.items():
            result = result.replace(abbr, full)

        # Expand Strong's references: H430, G2316
        result = re.sub(
            r'\bH(\d+)\b',
            lambda m: f"Strong's Hebrew number {m.group(1)}",
            result
        )
        result = re.sub(
            r'\bG(\d+)\b',
            lambda m: f"Strong's Greek number {m.group(1)}",
            result
        )

        # Clean up parenthetical references (keep content, remove parens)
        result = re.sub(r'\(([^)]{1,30})\)', r', \1,', result)

        # Smart quotes → straight
        result = result.replace('\u201c', '"').replace('\u201d', '"')
        result = result.replace('\u2018', "'").replace('\u2019', "'")
        result = result.replace('\u2014', ', ').replace('\u2013', ' to ')

        # Clean multiple spaces, newlines
        result = re.sub(r'\s+', ' ', result).strip()

        # Remove double commas, fix punctuation
        result = re.sub(r',\s*,', ',', result)
        result = re.sub(r'\s+([.,;:])', r'\1', result)

        return result


# ===========================================================================
# SUPABASE CLIENT
# ===========================================================================
def get_supabase():
    """Initialize Supabase client."""
    from supabase import create_client
    return create_client(SUPABASE_URL, SUPABASE_KEY)


def upsert_batch(supabase, table: str, rows: list, batch_size: int = 500):
    """Insert rows in batches with rate limiting."""
    total = len(rows)
    for i in range(0, total, batch_size):
        batch = rows[i:i + batch_size]
        supabase.table(table).insert(batch).execute()
        loaded = min(i + batch_size, total)
        print(f"   \u2713 Loaded {loaded}/{total}")
        if loaded < total:
            time.sleep(0.3)


# ===========================================================================
# SMITH'S BIBLE DICTIONARY
# ===========================================================================
def load_smiths(supabase):
    """Load Smith's Bible Dictionary into smiths_dictionary table."""
    print(f"\n\U0001f4d6 Loading Smith's Bible Dictionary...")

    with open(SMITHS_JSON, 'r', encoding='utf-8') as f:
        data = json.load(f)

    entries = data.get('entries', [])
    print(f"   Found {len(entries)} entries")

    sanitizer = TTSSanitizer()

    rows = []
    for entry in entries:
        term = entry.get('term', '').strip()
        definition = entry.get('definition', '').strip()
        if not term or not definition:
            continue

        rows.append({
            'term': term,
            'definition': definition,
            'definition_tts': sanitizer.sanitize(definition),
            'source': entry.get('source', "Smith's Bible Dictionary (1863)")
        })

    upsert_batch(supabase, 'smiths_dictionary', rows)
    print(f"   \u2705 Done -- {len(rows)} entries loaded into smiths_dictionary")
    return len(rows)


# ===========================================================================
# WEBSTER'S 1828 BIBLICAL DICTIONARY
# ===========================================================================
def load_websters(supabase):
    """Load Webster's 1828 Biblical Dictionary into websters_1828 table."""
    print(f"\n\U0001f4d6 Loading Webster's 1828 Biblical Dictionary...")

    with open(WEBSTERS_JSON, 'r', encoding='utf-8') as f:
        data = json.load(f)

    entries = data.get('entries', [])
    print(f"   Found {len(entries)} entries")

    sanitizer = TTSSanitizer()

    rows = []
    for entry in entries:
        word = entry.get('word', '').strip()
        definition = entry.get('definition', '').strip()
        if not word or not definition:
            continue

        rows.append({
            'word': word,
            'part_of_speech': entry.get('part_of_speech', ''),
            'definition': definition,
            'definition_tts': sanitizer.sanitize(definition),
            'source': entry.get('source', "Webster's American Dictionary 1828")
        })

    upsert_batch(supabase, 'websters_1828', rows)
    print(f"   \u2705 Done -- {len(rows)} entries loaded into websters_1828")
    return len(rows)


# ===========================================================================
# COMPANION BIBLE APPENDIXES
# ===========================================================================
def load_companion(supabase):
    """Parse and load the 198 Companion Bible appendix titles."""
    print(f"\n\U0001f4d6 Loading Companion Bible Appendixes...")

    with open(COMPANION_JSON, 'r', encoding='utf-8') as f:
        data = json.load(f)

    # The JSON only has the appendix listing (table of contents).
    # Parse the actual appendix titles from the content.
    all_content = ""
    for entry in data.get('entries', []):
        content = entry.get('content', '')
        if content:
            all_content += " " + content

    # Parse individual appendix titles using regex
    # Pattern: number. Appendix number: Title
    appendix_pattern = re.compile(
        r'(?:^|\s)(\d+)\.\s*Appendix\s+(\d+[A-Za-z]?):\s*(.+?)(?=\s*\d+\.\s*Appendix|\s*$)',
        re.MULTILINE
    )

    # More reliable: match "Appendix N:" patterns
    simpler_pattern = re.compile(
        r'Appendix\s+(\d+[A-Za-z]?):\s*(.+?)(?=\s*(?:\d+\.\s*)?Appendix\s+\d|$)'
    )

    matches = simpler_pattern.findall(all_content)

    # Deduplicate by appendix number
    seen = set()
    appendixes = []
    for num_str, title in matches:
        key = num_str.strip()
        if key in seen:
            continue
        seen.add(key)

        title_clean = title.strip()
        # Remove trailing numbers/noise
        title_clean = re.sub(r'\s+\d+$', '', title_clean)

        appendixes.append({
            'appendix_number': key,  # TEXT: "1", "2", ..., "179", "179A"
            'title': title_clean,
            'content': None,  # Full content not available in this dataset
            'content_tts': None,
            'source': 'Companion Bible by E.W. Bullinger'
        })

    print(f"   Found {len(appendixes)} unique appendix entries")

    if appendixes:
        upsert_batch(supabase, 'companion_appendixes', appendixes, batch_size=200)

    print(f"   \u2705 Done -- {len(appendixes)} appendix entries loaded")
    return len(appendixes)


# ===========================================================================
# APOCRYPHA PARSER
# ===========================================================================

# Apocrypha books in order of appearance in the text file
APOCRYPHA_BOOKS = [
    {"name": "Tobit",               "abbrev": "Tob",   "chapters": 14, "name_tts": "Tobit"},
    {"name": "Judith",              "abbrev": "Jdt",   "chapters": 16, "name_tts": "Judith"},
    {"name": "Esther (Greek)",      "abbrev": "EstG",  "chapters": 16, "name_tts": "Esther, Greek additions"},
    {"name": "Wisdom of Solomon",   "abbrev": "Wis",   "chapters": 19, "name_tts": "Wisdom of Solomon"},
    {"name": "Sirach",              "abbrev": "Sir",   "chapters": 51, "name_tts": "Sirach"},
    {"name": "Baruch",              "abbrev": "Bar",   "chapters": 5,  "name_tts": "Baruch"},
    {"name": "Letter of Jeremiah",  "abbrev": "LJe",   "chapters": 1,  "name_tts": "Letter of Jeremiah"},
    {"name": "Prayer of Azariah",   "abbrev": "PrAz",  "chapters": 1,  "name_tts": "Prayer of Azariah"},
    {"name": "Susanna",             "abbrev": "Sus",   "chapters": 1,  "name_tts": "Susanna"},
    {"name": "Bel and the Dragon",  "abbrev": "Bel",   "chapters": 1,  "name_tts": "Bel and the Dragon"},
    {"name": "1 Maccabees",         "abbrev": "1Mac",  "chapters": 16, "name_tts": "First Maccabees"},
    {"name": "2 Maccabees",         "abbrev": "2Mac",  "chapters": 15, "name_tts": "Second Maccabees"},
    {"name": "1 Esdras",            "abbrev": "1Esd",  "chapters": 9,  "name_tts": "First Ezdras"},
    {"name": "2 Esdras",            "abbrev": "2Esd",  "chapters": 16, "name_tts": "Second Ezdras"},
    {"name": "Prayer of Manasseh",  "abbrev": "PrMan", "chapters": 1,  "name_tts": "Prayer of Manasseh"},
]

# Ordered list of header patterns to find in the text file.
# Each entry: (pattern_to_match, canonical_name, match_mode)
#   match_mode: "exact"  = line.strip() == pattern
#               "startswith" = line.strip().startswith(pattern)
#               "contains" = pattern in line.strip()
APOCRYPHA_HEADERS_ORDERED = [
    ("Tobit",                                              "Tobit",              "exact"),
    ("Judith",                                             "Judith",             "exact"),
    ("Esther (Greek)",                                     "Esther (Greek)",     "exact"),
    ("Wisdom",                                             "Wisdom of Solomon",  "exact"),
    ("Sirach (Ecclesiasticus)",                             "Sirach",             "exact"),
    ("Baruch",                                             "Baruch",             "exact"),
    ("Letter of Jeremiah",                                 "Letter of Jeremiah", "exact"),
    ("Prayer of Azariah and the Song of the Three Jews",   "Prayer of Azariah",  "exact"),
    ("Susanna",                                            "Susanna",            "exact"),
    ("Bel and the Dragon",                                 "Bel and the Dragon", "exact"),
    ("1 Maccabees",                                        "1 Maccabees",        "exact"),
    ("2 Maccabees",                                        "2 Maccabees",        "exact"),
    ("1 Esdras",                                           "1 Esdras",           "exact"),
    ("2 Esdras",                                           "2 Esdras",           "exact"),
    ("Prayer of Manass",                                   "Prayer of Manasseh", "startswith"),
]

# Verse marker regex: handles {1:1}, { 1:1 }, { 1 :4 }, etc.
VERSE_MARKER_RE = re.compile(r'\{\s*(\d+)\s*:\s*(\d+)\s*\}')


def _line_matches_header(stripped: str, pattern: str, mode: str) -> bool:
    """Check if a stripped line matches a book header pattern."""
    if mode == "exact":
        return stripped == pattern
    elif mode == "startswith":
        return stripped.startswith(pattern)
    elif mode == "contains":
        return pattern in stripped
    return False


def _find_book_start_lines(lines: list, apocrypha_start: int) -> list:
    """
    Two-pass approach to find where each Apocrypha book starts.

    Pass 1: For each book header, scan forward from apocrypha_start to find
    the FIRST line that matches the header AND has verse markers within
    a generous lookahead (300 lines).

    Returns list of (line_number, canonical_name) sorted by line_number.
    """
    found = []

    for pattern, canonical, mode in APOCRYPHA_HEADERS_ORDERED:
        best_line = None

        for i in range(apocrypha_start, len(lines)):
            stripped = lines[i].strip()
            if not stripped:
                continue

            # Special case: "Page NNN BookName" format (Prayer of Manasseh)
            page_stripped = re.sub(r'^Page\s+\d+\s*', '', stripped).strip()

            if _line_matches_header(stripped, pattern, mode) or \
               _line_matches_header(page_stripped, pattern, mode):
                # Verify this is the actual book start (not a running header
                # in the middle of verse content) by checking for verse markers
                # within a generous lookahead window
                lookahead = '\n'.join(lines[i:i + 300])
                if VERSE_MARKER_RE.search(lookahead):
                    # Make sure this line isn't already assigned to a previous book
                    # and comes after any previously found book
                    min_line = max(f[0] for f in found) if found else 0
                    if i > min_line:
                        best_line = i
                        break

        if best_line is not None:
            found.append((best_line, canonical))

    # Sort by line number
    found.sort(key=lambda x: x[0])
    return found


def parse_apocrypha(filepath: str) -> dict:
    """
    Parse the Apocrypha text file into structured book/chapter/verse data.

    Strategy:
      1. Find where the Apocrypha section begins (line with "Tobit" as a book header)
      2. Find the start line for each book using ordered header matching
      3. Extract text blocks between consecutive book starts
      4. Parse {chapter:verse} markers from each text block

    Returns:
        dict: {book_name: {chapter_num: {verse_num: text}}}
    """
    print(f"\n\U0001f4dc Parsing Apocrypha text file...")

    with open(filepath, 'r', encoding='utf-8') as f:
        lines = f.read().split('\n')

    # --- Pass 1: Find the Apocrypha section ---
    # Look for the first standalone "Tobit" line that's in the actual content
    # (not the table of contents). The TOC entries have "..." page numbers.
    apocrypha_start = None
    for i, line in enumerate(lines):
        stripped = line.strip()
        if stripped == "Tobit":
            # Verify it's the content header (has verse markers nearby)
            lookahead = '\n'.join(lines[i:i + 50])
            if VERSE_MARKER_RE.search(lookahead):
                apocrypha_start = i
                break

    if apocrypha_start is None:
        print("   \u274c Could not find Apocrypha section start!")
        return {}

    print(f"   Found Apocrypha section at line {apocrypha_start}")

    # --- Pass 2: Find each book's start line ---
    book_starts = _find_book_start_lines(lines, apocrypha_start)
    print(f"   Found {len(book_starts)} book boundaries")

    # Find where Apocrypha ends (New Testament starts)
    apocrypha_end = len(lines)
    for i in range(book_starts[-1][0] if book_starts else apocrypha_start, len(lines)):
        stripped = lines[i].strip()
        if stripped == "Matthew":
            lookahead = '\n'.join(lines[i:i + 50])
            if VERSE_MARKER_RE.search(lookahead):
                apocrypha_end = i
                break

    # --- Pass 3: Extract text blocks for each book ---
    book_texts = {}
    for idx, (start_line, canonical) in enumerate(book_starts):
        if idx + 1 < len(book_starts):
            end_line = book_starts[idx + 1][0]
        else:
            end_line = apocrypha_end
        book_texts[canonical] = '\n'.join(lines[start_line:end_line])

    # --- Pass 4: Parse verse markers from each text block ---
    parsed = {}

    for book_name, text in book_texts.items():
        chapters = {}

        # Find all verse markers: {N:M} with optional spaces
        markers = list(VERSE_MARKER_RE.finditer(text))

        for j, m in enumerate(markers):
            chap = int(m.group(1))
            verse = int(m.group(2))

            # Extract text from end of this marker to start of next marker
            text_start = m.end()
            if j + 1 < len(markers):
                text_end = markers[j + 1].start()
            else:
                text_end = len(text)

            verse_text = text[text_start:text_end].strip()

            # Clean the verse text
            verse_text = VERSE_MARKER_RE.sub('', verse_text)  # Remove stray markers
            verse_text = re.sub(r'Page\s+\d+', '', verse_text)  # Remove page numbers
            # Remove running book headers (standalone book name lines)
            for _, bk_name, _ in APOCRYPHA_HEADERS_ORDERED:
                # Only remove if it's a standalone occurrence (whole line)
                verse_text = re.sub(
                    r'\n\s*' + re.escape(bk_name) + r'\s*\n', '\n', verse_text
                )
            verse_text = re.sub(r'\s+', ' ', verse_text).strip()

            if not verse_text:
                continue

            if chap not in chapters:
                chapters[chap] = {}
            chapters[chap][verse] = verse_text

        if chapters:
            parsed[book_name] = chapters
            total_verses = sum(len(vs) for vs in chapters.values())
            print(f"   \u2713 {book_name}: {len(chapters)} chapters, {total_verses} verses")

    return parsed


def load_apocrypha(supabase):
    """Parse the Apocrypha and load into books/studies/verses tables."""
    print(f"\n\U0001f4dc Loading Apocrypha into Supabase...")

    # Parse the text file
    parsed = parse_apocrypha(str(APOCRYPHA_TXT))

    if not parsed:
        print("   \u274c No Apocrypha data parsed!")
        return 0, 0

    sanitizer = TTSSanitizer()

    # Get current max book_order from books table
    result = supabase.table('books').select('book_order').order('book_order', desc=True).limit(1).execute()
    max_sort = result.data[0]['book_order'] if result.data else 66

    total_studies = 0
    total_verses = 0

    for book_info in APOCRYPHA_BOOKS:
        book_name = book_info['name']
        if book_name not in parsed:
            print(f"   \u26a0 {book_name} not found in parsed data, skipping")
            continue

        chapters = parsed[book_name]
        max_sort += 1

        # Insert into books table
        # name_tts: pronunciation-friendly version for ElevenLabs TTS
        tts_name = book_info.get('name_tts', book_name)
        book_row = {
            'name': book_name,
            'name_short': book_info['abbrev'],
            'name_tts': tts_name,
            'testament': 'AP',
            'total_chapters': len(chapters),
            'book_order': max_sort
        }

        book_result = supabase.table('books').insert(book_row).execute()
        book_id = book_result.data[0]['id']

        # Insert studies (one per chapter)
        for chap_num in sorted(chapters.keys()):
            verses_data = chapters[chap_num]

            study_row = {
                'book_id': book_id,
                'chapter': chap_num,
                'title': f"{book_name} {chap_num}",
                'avatar': 'moses',
            }

            study_result = supabase.table('studies').insert(study_row).execute()
            study_id = study_result.data[0]['id']
            total_studies += 1

            # Insert verses
            verse_rows = []
            for verse_num in sorted(verses_data.keys()):
                vtext = verses_data[verse_num]
                vtext_tts = sanitizer.sanitize(vtext) if vtext else None
                verse_rows.append({
                    'study_id': study_id,
                    'book_id': book_id,
                    'chapter': chap_num,
                    'verse_number': verse_num,
                    'verse_text': vtext,
                    'verse_text_tts': vtext_tts,
                })

            if verse_rows:
                # Batch insert verses
                for i in range(0, len(verse_rows), 500):
                    batch = verse_rows[i:i + 500]
                    supabase.table('verses').insert(batch).execute()

                total_verses += len(verse_rows)

        print(f"   \u2713 {book_name}: {len(chapters)} chapters, "
              f"{sum(len(v) for v in chapters.values())} verses")
        time.sleep(0.2)

    print(f"\n   \u2705 Apocrypha complete -- {total_studies} studies, {total_verses} verses")
    return total_studies, total_verses


# ===========================================================================
# BOOK OF ENOCH (sourced from public domain R.H. Charles 1917 translation)
# ===========================================================================
# The Book of Enoch structure: 108 chapters
ENOCH_SECTIONS = {
    "The Book of the Watchers": list(range(1, 37)),       # Chapters 1-36
    "The Book of Parables": list(range(37, 72)),           # Chapters 37-71
    "The Astronomical Book": list(range(72, 83)),          # Chapters 72-82
    "The Book of Dream Visions": list(range(83, 91)),      # Chapters 83-90
    "The Epistle of Enoch": list(range(91, 109)),          # Chapters 91-108
}


def fetch_book_of_enoch():
    """
    Fetch the Book of Enoch from a public domain source.
    Uses Sacred Texts (sacred-texts.com) R.H. Charles 1917 translation.
    Returns dict: {chapter: {verse: text}}
    """
    print(f"\n\U0001f4dc Sourcing Book of Enoch (R.H. Charles, 1917)...")
    print(f"   Fetching from local structured data or web source...")

    # First, check if we have a local cached version
    enoch_cache = DATA_DIR / "Book of Enoch" / "enoch_structured.json"
    if enoch_cache.exists():
        print(f"   Found cached version at {enoch_cache}")
        with open(enoch_cache, 'r', encoding='utf-8') as f:
            return json.load(f)

    # If no cache, we'll create a minimal placeholder structure
    # The Book of Enoch needs to be sourced separately
    print(f"   \u26a0 No local Book of Enoch data found.")
    print(f"   Creating placeholder structure for 108 chapters...")
    print(f"   \u2139 To load actual content, place 'enoch_structured.json' in:")
    print(f"     {DATA_DIR / 'Book of Enoch' / ''}")
    print(f"   Expected format: {{\"1\": {{\"1\": \"verse text\", ...}}, ...}}")

    return None


def load_book_of_enoch(supabase):
    """Load Book of Enoch into the database."""
    enoch_data = fetch_book_of_enoch()

    if enoch_data is None:
        print(f"   \u26a0 Skipping Book of Enoch -- no structured data available")
        print(f"   Run the Enoch sourcing script first:")
        print(f"     python scripts/source_enoch.py")
        return 0, 0

    # Get current max book_order
    result = supabase.table('books').select('book_order').order('book_order', desc=True).limit(1).execute()
    max_sort = result.data[0]['book_order'] if result.data else 80

    # Insert into books table
    book_row = {
        'name': 'Book of Enoch',
        'name_short': 'Enoch',
        'name_tts': 'Book of Enoch',
        'testament': 'PS',  # Pseudepigrapha
        'total_chapters': len(enoch_data),
        'book_order': max_sort + 1
    }

    book_result = supabase.table('books').insert(book_row).execute()
    book_id = book_result.data[0]['id']

    sanitizer = TTSSanitizer()
    total_studies = 0
    total_verses = 0

    for chap_str in sorted(enoch_data.keys(), key=int):
        chap_num = int(chap_str)
        verses = enoch_data[chap_str]

        study_row = {
            'book_id': book_id,
            'chapter': chap_num,
            'title': f"Enoch {chap_num}",
            'avatar': 'moses',
        }

        study_result = supabase.table('studies').insert(study_row).execute()
        study_id = study_result.data[0]['id']
        total_studies += 1

        verse_rows = []
        for verse_str in sorted(verses.keys(), key=int):
            vtext = verses[verse_str].strip()
            if not vtext:
                continue
            vtext_tts = sanitizer.sanitize(vtext) if vtext else None
            verse_rows.append({
                'study_id': study_id,
                'book_id': book_id,
                'chapter': chap_num,
                'verse_number': int(verse_str),
                'verse_text': vtext,
                'verse_text_tts': vtext_tts,
            })

        if verse_rows:
            for i in range(0, len(verse_rows), 500):
                batch = verse_rows[i:i + 500]
                supabase.table('verses').insert(batch).execute()
            total_verses += len(verse_rows)

        if chap_num % 20 == 0:
            print(f"   \u2713 Loaded {chap_num}/{len(enoch_data)} chapters")

    print(f"\n   \u2705 Book of Enoch complete -- {total_studies} studies, {total_verses} verses")
    return total_studies, total_verses


# ===========================================================================
# MAIN PIPELINE
# ===========================================================================
def main():
    print("=" * 60)
    print("  Scripture Unlocked \u2014 Reference Data Pipeline")
    print("=" * 60)

    # Connect to Supabase
    print(f"\n\U0001f50c Connecting to Supabase...")
    supabase = get_supabase()
    print(f"   \u2713 Connected to {SUPABASE_URL}")

    # Track totals
    totals = {}

    # Helper: check if a table has data
    def table_count(name: str) -> int:
        r = supabase.table(name).select('id', count='exact').limit(1).execute()
        return r.count if r.count else 0

    # 1. Smith's Bible Dictionary
    existing = table_count('smiths_dictionary')
    if existing > 0:
        print(f"\n\U0001f4d6 Smith's Bible Dictionary: {existing} entries already loaded, skipping")
        totals['smiths'] = existing
    else:
        try:
            totals['smiths'] = load_smiths(supabase)
        except Exception as e:
            print(f"   \u274c Error loading Smith's: {e}")
            totals['smiths'] = 0

    # 2. Webster's 1828
    existing = table_count('websters_1828')
    if existing > 0:
        print(f"\n\U0001f4d6 Webster's 1828: {existing} entries already loaded, skipping")
        totals['websters'] = existing
    else:
        try:
            totals['websters'] = load_websters(supabase)
        except Exception as e:
            print(f"   \u274c Error loading Webster's: {e}")
            totals['websters'] = 0

    # 3. Companion Bible Appendixes
    existing = table_count('companion_appendixes')
    if existing > 0:
        print(f"\n\U0001f4d6 Companion Appendixes: {existing} entries already loaded, skipping")
        totals['companion'] = existing
    else:
        try:
            totals['companion'] = load_companion(supabase)
        except Exception as e:
            print(f"   \u274c Error loading Companion: {e}")
            totals['companion'] = 0

    # 4. Apocrypha
    ap_check = supabase.table('books').select('id', count='exact').eq('testament', 'AP').execute()
    if ap_check.count and ap_check.count > 0:
        print(f"\n\U0001f4dc Apocrypha: {ap_check.count} books already loaded, skipping")
        totals['apocrypha_studies'] = ap_check.count
        totals['apocrypha_verses'] = 0  # not re-counted
    else:
        try:
            ap_studies, ap_verses = load_apocrypha(supabase)
            totals['apocrypha_studies'] = ap_studies
            totals['apocrypha_verses'] = ap_verses
        except Exception as e:
            print(f"   \u274c Error loading Apocrypha: {e}")
            import traceback
            traceback.print_exc()
            totals['apocrypha_studies'] = 0
            totals['apocrypha_verses'] = 0

    # 5. Book of Enoch
    en_check = supabase.table('books').select('id', count='exact').eq('testament', 'PS').execute()
    if en_check.count and en_check.count > 0:
        print(f"\n\U0001f4dc Book of Enoch: already loaded, skipping")
        totals['enoch_studies'] = en_check.count
        totals['enoch_verses'] = 0
    else:
        try:
            en_studies, en_verses = load_book_of_enoch(supabase)
            totals['enoch_studies'] = en_studies
            totals['enoch_verses'] = en_verses
        except Exception as e:
            print(f"   \u274c Error loading Enoch: {e}")
            totals['enoch_studies'] = 0
            totals['enoch_verses'] = 0

    # Summary
    print("\n" + "=" * 60)
    print("  REFERENCE PIPELINE COMPLETE")
    print("=" * 60)
    print(f"  \U0001f4ca Smith's Dictionary:    {totals.get('smiths', 0)}")
    print(f"  \U0001f4ca Webster's 1828:        {totals.get('websters', 0)}")
    print(f"  \U0001f4ca Companion Appendixes:  {totals.get('companion', 0)}")
    print(f"  \U0001f4ca Apocrypha Studies:     {totals.get('apocrypha_studies', 0)}")
    print(f"  \U0001f4ca Apocrypha Verses:      {totals.get('apocrypha_verses', 0)}")
    print(f"  \U0001f4ca Enoch Studies:         {totals.get('enoch_studies', 0)}")
    print(f"  \U0001f4ca Enoch Verses:          {totals.get('enoch_verses', 0)}")
    print()


if __name__ == "__main__":
    main()

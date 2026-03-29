#!/usr/bin/env node
/**
 * sanitize_db.js — Gita Press JSON Sanitizer
 *
 * Input:  gita_final_db.json  (raw, 667 verse records)
 * Output: gita_sanitized_db.json  (clean ASCII, DB-ready)
 *
 * Pipeline (per verse text field):
 *   P1 — Strip leading page-header bleed (pre-dict, raw OCR form)
 *   P2 — Apply OCR correction dictionary (longest-match-first)
 *   P3 — Strip mid-text page-header bleed (post-dict, normalized form)
 *   P4 — Sever leading Sanskrit OCR garbage tokens
 *   P5 — Strip all remaining non-printable / non-ASCII characters
 *   P6 — Collapse redundant whitespace
 *
 * Run:
 *   node sanitize_db.js [input.json] [output.json]
 */

'use strict';
const fs = require('fs');

// ─── CONFIG ──────────────────────────────────────────────────────────────────

const INPUT_FILE  = process.argv[2] || 'gita_final_db.json';
const OUTPUT_FILE = process.argv[3] || 'gita_sanitized_db.json';

// ─── OCR CORRECTION DICTIONARY ───────────────────────────────────────────────
//
// Rules:
//   1. Entries are sorted longest-key-first at runtime — longer strings replace
//      before their substrings, preventing partial clobbering.
//      e.g. "Bh∂¶ma" (Bhishma) must replace before "Bh∂ma" (Bhima).
//   2. Punctuation/typography artifacts are listed last (short keys).
//   3. Plural forms before singular ("PåƒŒavas" before "PåƒŒava").

const OCR_DICTIONARY = {
  // ── People ────────────────────────────────────────────────────────────────
  "Dhætarå¶¢raí":   "Dhritarashtra'", // possessive form — longest, must be first
  "Dhætarå¶¢ra":    "Dhritarashtra",
  "Dhæ¶¢adyumna":   "Dhrishtadyumna",
  "Yudhi¶¢hira":    "Yudhishthira",
  "Bhµuri‹ravå":    "Bhurishrava",
  "A‹vatthåmå":     "Ashvatthama",
  "Droƒåcårya":     "Dronacharya",  // compound before base
  "Dhæ¶¢aketu":     "Dhrishtaketu",
  "Yudhåmanyu":     "Yudhamanyu",
  "Uttamaujå":      "Uttamauja",
  "›ikhaƒŒ∂":       "Shikhandi",
  "Subhadrå":       "Subhadra",
  "Draupad∂":       "Draupadi",
  "Kæ¶ƒa":          "Krishna",
  "Sa¤jaya":        "Sanjaya",
  "Bh∂¶ma":         "Bhishma",    // Bhishma — MUST come before Bh∂ma (Bhima)
  "Bh∂ma":          "Bhima",      // Bhima — different character entirely
  "Vikarƒa":        "Vikarna",
  "Cekitåna":       "Cekitana",
  "Såtyaki":        "Satyaki",
  "Virå¢a":         "Virata",
  "Hanumån":        "Hanuman",
  "Ke‹ava":         "Keshava",
  "Droƒa":          "Drona",
  "Karƒa":          "Karna",
  "Kæpa":           "Kripa",
  "Kunt∂":          "Kunti",
  "Væ¶ƒi":          "Vrishni",
  "›aibya":         "Shaibya",

  // ── Places & Objects ──────────────────────────────────────────────────────
  "Kuruk¶etra":     "Kurukshetra",
  "Maƒipu¶paka":    "Manipushpaka",
  "Bhagavadg∂tå":   "Bhagavad Gita",
  "På¤cajanya":     "Pancajanya",
  "GåƒŒ∂va":        "Gandiva",
  "Sugho¶a":        "Sughosha",
  "PauƒŒra":        "Paundra",
  "Kå‹∂":           "Kashi",

  // ── Sanskrit Concepts — Compound / plural forms first ─────────────────────
  "Mahårath∂s":     "Maharathis",  // plural before singular
  "Mahårath∂":      "Maharathi",
  "Bråhmaƒas":      "Brahmanas",
  "Bråhmaƒa":       "Brahmana",
  "Brahmaƒa":       "Brahmana",
  "PåƒŒavas":       "Pandavas",    // plural before singular
  "PåƒŒava":        "Pandava",
  "PåƒŒu":          "Pandu",
  "Yog∂s":          "Yogis",       // plural before singular
  "Yog∂":           "Yogi",
  "Guƒas":          "Gunas",
  "Guƒa":           "Guna",
  "›åstras":        "Shastras",
  "›åstra":         "Shastra",
  "Karmak¶etra":    "Karmakshetra",
  "Så∆khyayoga":    "Sankhyayoga",
  "Dhyånayoga":     "Dhyanayoga",
  "Karmayog∂":      "Karmayogi",
  "J¤ånayoga":      "Jnanayoga",
  "K¶etraj¤a":      "Kshetrajna",
  "Puru¶ottama":    "Purushottama",
  "Nirvi‹e¶a":      "Nirvishesha",
  "Vij¤åna":        "Vijnana",
  "Sannyås∂":       "Sannyasi",
  "Sannyåsa":       "Sannyasa",
  "K¶atriya":       "Kshatriya",
  "K¶etra":         "Kshetra",
  "Nirguƒa":        "Nirguna",
  "Saguƒa":         "Saguna",
  "Så∆khya":        "Sankhya",
  "Sa≈såra":        "Samsara",
  "Sa∆kalpa":       "Sankalpa",
  "Prakæti":        "Prakriti",
  "Vai‹vånara":     "Vaishvanara",
  "Såttvika":       "Sattvika",
  "Råjasika":       "Rajasika",
  "Tåmasika":       "Tamasika",
  "Karmayoga":      "Karmayoga",
  "Brahmavid":      "Brahmavid",
  "Vedånta":        "Vedanta",
  "J∂våtmå":        "Jivatma",
  "Puru¶a":         "Purusha",
  "Vai‹ya":         "Vaishya",
  "›µudra":         "Shudra",
  "Å‹rama":         "Ashrama",
  "Varƒa":          "Varna",
  "J¤åna":          "Jnana",
  "Pråƒa":          "Prana",
  "Apåna":          "Apana",
  "Tyåga":          "Tyaga",
  "Yaj¤a":          "Yajna",
  "Saguƒa":         "Saguna",
  "Tarpaƒa":        "Tarpana",
  "Havya":          "Havya",
  "Vedic":          "Vedic",
  "Vedas":          "Vedas",
  "Å‹rama":         "Ashrama",
  "›r∂":            "Sri",
  "OÀ":             "OM",

  // ── Typography / Punctuation OCR artifacts ────────────────────────────────
  "ì":  '"',    // mangled open double-quote
  "î":  '"',    // mangled close double-quote
  "ó":  "-",    // mangled em-dash
  "ñ":  "-",    // mangled en-dash
  "ë":  "'",    // mangled open single-quote
  "í":  "'",    // mangled close single-quote / apostrophe
};

// Sort entries by key length descending — guarantees longest-match-first
// This prevents e.g. "Bh∂ma" matching inside "Bh∂¶ma" before the full token is replaced.
const SORTED_ENTRIES = Object.entries(OCR_DICTIONARY)
  .sort((a, b) => b[0].length - a[0].length);

// ─── SANITIZER ───────────────────────────────────────────────────────────────

/**
 * Determines the index of the first "English" token in a word array.
 * A token qualifies as English if:
 *   - It contains at least one lowercase [a-z] letter
 *   - At least 50% of its characters are alphabetic
 *   - It contains at least 2 alphabetic characters
 * This threshold rejects short OCR artifacts like "l-" or "cU" that contain
 * lowercase letters but are not English words.
 */
function findEnglishStart(words) {
  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    const letters = word.replace(/[^a-zA-Z]/g, '');
    const isEnglish = letters.length >= 2
      && letters.length / Math.max(word.length, 1) >= 0.5
      && /[a-z]/.test(word);

    if (isEnglish) {
      // Back up one token if the preceding word is a valid standalone English token
      // (handles cases like "I fear", "A great king", "O Arjuna")
      const LEAD_WORDS = new Set(['I','A','O','An','It','In','He','Of','As','At','By','To','No']);
      if (i > 0 && LEAD_WORDS.has(words[i - 1])) {
        return i - 1;
      }
      return i;
    }
  }
  return 0;
}

/**
 * Sanitizes a single verse text string through the 6-pass pipeline.
 * @param {string} raw - The raw text from the parsed JSON
 * @returns {string} - Clean, printable ASCII string
 */
function sanitizeText(raw) {
  if (!raw) return raw;
  let text = raw;

  // P1: Strip leading page-header bleed (pre-dictionary, raw OCR form)
  //     Catches: "22 Bhagavadg∂tå [Ch. 1 ..."
  text = text.replace(/^\d{1,3}\s*Bhagavadg[^\[]*\[Ch\.?\s*\d+\]?\s*/i, '');

  // P2: Apply OCR correction dictionary (longest-match-first order)
  for (const [bad, good] of SORTED_ENTRIES) {
    text = text.split(bad).join(good);
  }

  // P3: Strip mid-text page-header bleed (post-dictionary, normalized form)
  //     Catches: "168 Bhagavad Gita [Ch. 15 creatures..."
  //     These appear when Sanskrit garbage precedes the header, making P1's
  //     ^ anchor miss it. Runs after P2 so target is the normalized string.
  text = text.replace(/\d{1,3}\s*Bhagavad Gita\s*\[Ch\.?\s*\d+\]?\s*/gi, '');

  // P4: Sever leading Sanskrit OCR garbage
  //     Tokenize, find first genuine English word, slice off everything before it.
  const words = text.split(/\s+/).filter(Boolean);
  const startIdx = findEnglishStart(words);
  if (startIdx > 0) {
    text = words.slice(startIdx).join(' ');
    // Strip any stray leading punctuation left after the slice
    text = text.replace(/^[^A-Za-z0-9"'(]+/, '');
  }

  // P5: Strip all remaining non-ASCII / non-printable characters
  //     Anything not in standard printable ASCII range [0x20–0x7E] is removed.
  text = text.replace(/[^\x20-\x7E]/g, '');

  // P6: Collapse redundant whitespace introduced by prior passes
  return text.replace(/ {2,}/g, ' ').trim();
}

// ─── MAIN ────────────────────────────────────────────────────────────────────

function main() {
  if (!fs.existsSync(INPUT_FILE)) {
    console.error(`\nError: Input file not found: "${INPUT_FILE}"`);
    console.error('Usage: node sanitize_db.js [input.json] [output.json]\n');
    process.exit(1);
  }

  console.log(`\nReading: ${INPUT_FILE}`);
  const raw = JSON.parse(fs.readFileSync(INPUT_FILE, 'utf8'));

  let modifiedCount  = 0;
  let warningCount   = 0;
  const warnings     = [];

  const sanitizedVerses = raw.verses.map(verse => {
    const cleanText    = sanitizeText(verse.text);
    const cleanSpeaker = sanitizeText(verse.speaker);

    if (cleanText !== verse.text || cleanSpeaker !== verse.speaker) {
      modifiedCount++;
    }

    // Warn if any non-ASCII still remains after sanitization (should be zero)
    if (/[^\x20-\x7E]/.test(cleanText)) {
      warningCount++;
      warnings.push({ ref: `Ch.${verse.chapter}:${verse.verse}`, text: cleanText.slice(0, 80) });
    }

    return {
      chapter:  verse.chapter,
      verse:    verse.verse,
      verseEnd: verse.verseEnd,
      speaker:  cleanSpeaker,
      text:     cleanText,
    };
  });

  // ── Output ─────────────────────────────────────────────────────────────────
  const output = {
    meta: {
      ...raw.meta,
      sanitized:   true,
      sanitizedAt: new Date().toISOString(),
      dictionaryEntries: SORTED_ENTRIES.length,
    },
    verses: sanitizedVerses,
  };

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2), 'utf8');

  // ── Report ─────────────────────────────────────────────────────────────────
  console.log('\n=== Sanitization Report ===');
  console.log(`  Total verses processed : ${sanitizedVerses.length}`);
  console.log(`  Verses modified        : ${modifiedCount}`);
  console.log(`  Dictionary entries     : ${SORTED_ENTRIES.length}`);
  console.log(`  Residual warnings      : ${warningCount}`);

  if (warnings.length > 0) {
    console.warn('\n  ⚠ Verses with residual non-ASCII (manual review needed):');
    for (const w of warnings) {
      console.warn(`    [${w.ref}] ${w.text}`);
    }
  } else {
    console.log('\n  ✓ All verses are clean printable ASCII.');
  }

  console.log(`\n  Output written to: ${OUTPUT_FILE}\n`);
}

main();

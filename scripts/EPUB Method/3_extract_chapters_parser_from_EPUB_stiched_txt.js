// extract_chapters_parser.js — v4 (fix: OCR alias for Ch3 "ITI" → "III")
'use strict';

const fs   = require('fs');
const path = require('path');

const INPUT_FILE  = path.resolve(__dirname, '..', 'assets', 'gita_full_text.txt');
const OUTPUT_FILE = path.resolve(__dirname, '..', 'assets', 'gita_parsed.json');

// ─── Roman numeral parser ──────────────────────────────────────────────────

function parseRomanOrInt(s) {
  s = s.trim().toUpperCase();
  if (/^\d+$/.test(s)) return parseInt(s, 10);
  const roman = { I:1, V:5, X:10, L:50, C:100, D:500, M:1000 };
  let total = 0, prev = 0;
  for (const ch of [...s].reverse()) {
    const v = roman[ch] ?? 0;
    total += v < prev ? -v : v;
    prev = v;
  }
  return total;
}

// ─── Noise filter ──────────────────────────────────────────────────────────

function isNoiseLine(line) {
  const t = line.trim();
  if (t.length < 5) return true;
  const letters = (t.match(/[a-zA-Z\u00C0-\u024F]/g) || []).length;
  return (letters / t.length) < 0.35;
}

// ─── Chapter boundary detection ───────────────────────────────────────────
//
// Strategy: collect ALL "Chapter X" hits. For each chapter number 1–18,
// find the candidate with the LARGEST delta (most text after it). This is
// the real chapter, not the TOC/Synopsis/colophon mention.
//
// OCR ALIAS MAP: The EPUB OCR frequently corrupts specific Roman numerals.
// Known corruptions confirmed in this file:
//   "ITI" → III  (Chapter 3)
// The alias regex is a SECONDARY pass — only used when the primary pass
// finds no candidates for a given chapter number.

const OCR_ALIASES = {
  3: /\bChapter\s+ITI\b/gi,
};

function findChapterBoundaries(text) {
  const regex = /\bChapter\s+((?:[IVXLC]+|\d+))\b/gi;
  const allMatches = [];
  let m;

  // Primary pass — standard Roman/Arabic numerals
  while ((m = regex.exec(text)) !== null) {
    const n = parseRomanOrInt(m[1]);
    if (n >= 1 && n <= 18) allMatches.push({ chapter: n, index: m.index });
  }

  // Compute delta for each hit (distance to next "Chapter X" occurrence)
  for (let i = 0; i < allMatches.length; i++) {
    const cur  = allMatches[i];
    const next = allMatches[i + 1];
    cur.delta = next ? next.index - cur.index : text.length - cur.index;
  }

  // Group by chapter number
  const hits = {};
  for (const hit of allMatches) {
    (hits[hit.chapter] = hits[hit.chapter] || []).push(hit);
  }

  // Secondary pass — OCR alias fallback for chapters with zero primary hits
  for (const [chNum, aliasRe] of Object.entries(OCR_ALIASES)) {
    const n = parseInt(chNum, 10);
    if (hits[n] && hits[n].length) continue; // primary hit found — skip

    aliasRe.lastIndex = 0;
    const aliasMatches = [];
    while ((m = aliasRe.exec(text)) !== null) {
      aliasMatches.push({ chapter: n, index: m.index, delta: 0 });
    }

    if (!aliasMatches.length) {
      console.warn(`  ⚠  No hit found for Chapter ${n} (including OCR aliases)`);
      continue;
    }

    // Recompute deltas for alias hits against the global allMatches pool
    for (const hit of aliasMatches) {
      const after = allMatches.filter(x => x.index > hit.index);
      hit.delta = after.length ? after[0].index - hit.index : text.length - hit.index;
    }

    console.log(`  🔧  Chapter ${n} recovered via OCR alias (found ${aliasMatches.length} hit(s))`);
    hits[n] = aliasMatches;
  }

  // For each chapter number, pick the candidate with the largest delta.
  const bestPerChapter = [];
  for (let n = 1; n <= 18; n++) {
    const candidates = hits[n] || [];
    if (!candidates.length) {
      console.warn(`  ⚠  No hit found for Chapter ${n}`);
      continue;
    }
    const best = candidates.reduce((a, b) => a.delta > b.delta ? a : b);
    bestPerChapter.push(best);
  }

  // Sort by index and enforce sequential ordering
  bestPerChapter.sort((a, b) => a.index - b.index);

  const ordered = [];
  let minIndex = 0;
  for (const candidate of bestPerChapter) {
    if (candidate.index > minIndex) {
      ordered.push(candidate);
      minIndex = candidate.index;
    } else {
      console.warn(`  ⚠  Chapter ${candidate.chapter} at index ${candidate.index} is out of order — skipping`);
    }
  }

  return ordered;
}

// ─── Verse terminal detection ──────────────────────────────────────────────

function extractVerseNums(line) {
  if (/second\s+half|first\s+half/i.test(line)) return null;

  const rangeM = line.match(/\(\s*(\d{1,3})\s*[—\-–]\s*(\d{1,3})\s*\)\s*$/);
  if (rangeM) {
    const [from, to] = [parseInt(rangeM[1]), parseInt(rangeM[2])];
    if (to > from && to - from < 20) {
      return Array.from({ length: to - from + 1 }, (_, i) => from + i);
    }
  }

  const singleM = line.match(/\(\s*(\d{1,3})\s*\)\s*$/);
  if (singleM) {
    const n = parseInt(singleM[1]);
    if (n >= 1 && n <= 78) return [n];
  }

  return null;
}

// ─── Speaker detection ─────────────────────────────────────────────────────

const SPEAKER_PATTERNS = [
  { re: /\bDhr[tṭ]ar[aā][sṣ][tṭ]ra\s+said\s*:/i,  name: 'Dhrtarastra'  },
  { re: /\bSa[nñṅ]jaya\s+said\s*:/i,               name: 'Sanjaya'      },
  { re: /\bArjuna\s+said\s*:/i,                     name: 'Arjuna'       },
  { re: /\bSr[iī]\s+Bhagav[aā]n\s+said\s*:/i,      name: 'Sri Bhagavan' },
  { re: /\bSr[iī]\s+Kr[sṣ][nṇ]a\s+said\s*:/i,      name: 'Sri Krsna'    },
];

function detectSpeaker(line) {
  for (const { re, name } of SPEAKER_PATTERNS) {
    if (re.test(line)) return name;
  }
  return null;
}

// ─── Chapter text parser ───────────────────────────────────────────────────
//
// The file is a single-line EPUB export ("1 lines" in diagnostic output).
// There are no \n characters — the entire text is one continuous string.
//
// Fix: split AFTER every verse-terminal marker (N) or (N-M) using a
// lookbehind, so each segment ends with its own verse number intact and
// extractVerseNums() still fires correctly.
//
// Backwards compatible: if the file ever gains real newlines, the outer
// split(/\r\n|\r|\n/) handles that first.

function parseChapterText(chapterNum, rawText) {
  const segments = rawText
    .split(/\r\n|\r|\n/)
    .flatMap(chunk =>
      chunk.split(/(?<=\(\s*\d{1,3}(?:\s*[—\-–]\s*\d{1,3})?\s*\))\s+/)
    )
    .map(s => s.trim())
    .filter(s => s.length > 0);

  const verses = [];
  let currentSpeaker = null;
  let buffer = [];

  function flushBuffer(verseNums) {
    if (!buffer.length) return;
    const text = buffer.join(' ').replace(/\s{2,}/g, ' ').trim();
    const wordCount = text.split(/\s+/).filter(w => /[a-zA-Z]{3,}/.test(w)).length;
    if (wordCount >= 4) {
      verses.push({ verse: verseNums, speaker: currentSpeaker, text });
    }
    buffer = [];
  }

  for (const line of segments) {
    if (/^Text\s+\d/.test(line))                     continue; // ① page-range header
    if (/^(?:\d+\s+)?Bhagavadgita\b/.test(line))     continue; // ② running page header
    if (/Thus[,\s].*Upanisad.*ends the/i.test(line)) {         // ③ chapter colophon
      flushBuffer(null);
      continue;
    }
    if (isNoiseLine(line)) continue;                           // ④ symbol/OCR noise

    const spk = detectSpeaker(line);
    if (spk) {                                                 // ⑤ speaker line
      flushBuffer(null);
      currentSpeaker = spk;
      const rest = line.replace(/^.*?\bsaid\s*:\s*/i, '').trim();
      if (rest.length > 5) buffer.push(rest);
      continue;
    }

    buffer.push(line);                                         // ⑥ accumulate

    const verseNums = extractVerseNums(line);
    if (verseNums) flushBuffer(verseNums);                     // ⑦ flush on terminal
  }

  flushBuffer(null); // catch trailing content after last verse
  return verses;
}

// ─── Chapter titles ────────────────────────────────────────────────────────

function chapterTitle(n) {
  return [
    '',
    'The Yoga of Dejection of Arjuna',
    'Sankhyayoga (The Yoga of Knowledge)',
    'Karmayoga (The Yoga of Action)',
    'The Yoga of Knowledge as well as the Disciplines of Action and Knowledge',
    'The Yoga of Action and Knowledge',
    'The Yoga of Self-Control',
    'The Yoga of Jnana and Vijnana',
    'The Yoga of the Indestructible Brahma',
    'The Yoga of Sovereign Science and the Sovereign Secret',
    'The Yoga of Divine Glories',
    'The Yoga of the Vision of the Universal Form',
    'The Yoga of Devotion',
    'The Yoga of Discrimination between the Field and the Knower of the Field',
    'The Yoga of Division of Three Gunas',
    'The Yoga of the Supreme Person',
    'The Yoga of Division between the Divine and the Demoniacal Properties',
    'The Yoga of the Division of the Threefold Faith',
    'The Yoga of Liberation through the Path of Knowledge and Self-Surrender',
  ][n] ?? `Chapter ${n}`;
}

// ─── Main ──────────────────────────────────────────────────────────────────

function parseGita() {
  console.log('📖  Reading file…');
  const fullText = fs.readFileSync(INPUT_FILE, 'utf-8');
  console.log(`    ${fullText.length.toLocaleString()} chars, ${fullText.split('\n').length.toLocaleString()} lines\n`);

  console.log('📌  Locating chapter boundaries…');
  const boundaries = findChapterBoundaries(fullText);

  console.log('\n  Ch │ Index       │ Delta       │ Status');
  console.log('─────┼─────────────┼─────────────┼────────');
  boundaries.forEach((b, i) => {
    const next  = boundaries[i + 1];
    const delta = next ? next.index - b.index : fullText.length - b.index;
    const flag  = delta < 2000 ? ' ⚠ small' : '';
    console.log(
      `  ${String(b.chapter).padStart(2)} │ ${String(b.index).padStart(11)} │ ${String(delta).padStart(11)} │${flag}`
    );
  });

  if (boundaries.length !== 18) {
    console.error(`\n❌  Expected 18 chapters, got ${boundaries.length}. Aborting.`);
    process.exit(1);
  }

  console.log('\n📝  Parsing chapters…\n');
  const gitaData = { chapters: [] };

  for (let i = 0; i < boundaries.length; i++) {
    const { chapter, index } = boundaries[i];
    const end    = boundaries[i + 1]?.index ?? fullText.length;
    const raw    = fullText.slice(index, end);
    const verses = parseChapterText(chapter, raw);

    process.stdout.write(`  Chapter ${String(chapter).padStart(2)} → ${verses.length} verses`);
    if (verses.length === 0) process.stdout.write(' ⚠ EMPTY');
    console.log();

    gitaData.chapters.push({
      chapter,
      title:       chapterTitle(chapter),
      verse_count: verses.length,
      verses,
    });
  }

  const total = gitaData.chapters.reduce((s, c) => s + c.verse_count, 0);
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(gitaData, null, 2), 'utf-8');
  console.log(`\n✅  Done → ${OUTPUT_FILE}`);
  console.log(`    Total verse blocks: ${total}`);
}

parseGita();
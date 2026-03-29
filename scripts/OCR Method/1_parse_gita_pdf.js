#!/usr/bin/env node
/**
 * Gita Press PDF Text Cleaner
 * * Strategy: Exploits ASCII ratio heuristic to filter OCR garbage.
 * Extracts English lines, normalizes speaker names, and uses terminal 
 * verse markers (N) or (N-M) to chunk the text into structured JSON.
 */

const fs = require('fs');

// ─── CONFIG ──────────────────────────────────────────────────────────────────

const ASCII_THRESHOLD = 0.55;

const PAGE_NOISE_PATTERNS = [
  /^Bhagavadg.*?\[Ch\.?\s*\d/i,
  /^Text\s+\d+/i,
  /^\d+\s*$/,
  /^Z\s*$/,
  /^❖\s*$/,
  /^_{2,}/, // Catch random formatting underscores
];

const ROMAN_TO_INT = {
  I:1, II:2, III:3, IV:4, V:5, VI:6, VII:7, VIII:8, IX:9, X:10,
  XI:11, XII:12, XIII:13, XIV:14, XV:15, XVI:16, XVII:17, XVIII:18
};

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function asciiRatio(str) {
  if (!str.length) return 1;
  let asciiCount = 0;
  // Standard for-loop avoids the memory overhead of array spreading [...str]
  for (let i = 0; i < str.length; i++) {
    if (str.charCodeAt(i) < 128) asciiCount++;
  }
  return asciiCount / str.length;
}

function isEnglishLine(line) {
  return asciiRatio(line.trim()) >= ASCII_THRESHOLD;
}

function isPageNoise(line) {
  const trimmed = line.trim();
  return PAGE_NOISE_PATTERNS.some(p => p.test(trimmed));
}

function normalizeSpeaker(text) {
  // Already-clean patterns
  if (/^(Sri Bhagavan|Dhritarashtra|Sanjaya|Arjuna) said/i.test(text)) return text;

  if (/Bhagav/i.test(text) && /said/i.test(text)) {
    return text.replace(/.*?(said\s*:?)(.*)$/i, "Sri Bhagavan $1 $2").trim();
  }
  if (/Dh[^a-z]{0,5}tar/i.test(text) && /said/i.test(text)) {
    return text.replace(/.*?(said\s*:?)(.*)$/i, "Dhritarashtra $1 $2").trim();
  }
  if (/sa[^a-z]{0,3}j[^a]{0,3}ya/i.test(text) && /said/i.test(text)) {
    return text.replace(/.*?(said\s*:?)(.*)$/i, "Sanjaya $1 $2").trim();
  }
  return text;
}

function cleanLine(line) {
  return line
    .trim()
    .replace(/[\u0900-\u097F\u0A00-\u0A7F\u2018-\u201F]/g, "") // Clear Devanagari blocks + curly quotes
    .replace(/\s{2,}/g, " ") // Collapse multi-spaces
    .trim();
}

function parseVerseMarker(marker) {
  // Trim prevents strict anchor regex failure from captured trailing spaces
  const simple = marker.trim().match(/^\((\d+)(?:[ó\-](\d+))?\)$/);
  if (simple) {
    return {
      start: parseInt(simple[1], 10),
      end: simple[2] ? parseInt(simple[2], 10) : parseInt(simple[1], 10),
    };
  }
  return null;
}

// ─── MAIN PARSER ─────────────────────────────────────────────────────────────

function parseGitaText(rawText) {
  const lines = rawText.split('\n');
  const results = [];
  let currentChapter = 0;
  let englishBuffer = [];

  function flushBuffer(verseInfo) {
    if (!englishBuffer.length) return;

    let rawEnglish = englishBuffer
      .filter(l => !isPageNoise(l))
      .map(cleanLine)
      .filter(Boolean)
      .join(" ");

    // Explicitly strip the terminal marker from the final text payload
    rawEnglish = rawEnglish.replace(/\s*\(\d+(?:[ó\-]\d+)?\)\s*$/, "").trim();

    if (!rawEnglish) {
      englishBuffer = [];
      return;
    }

    let speaker = null;
    const speakerMatch = rawEnglish.match(/^((?:Sri Bhagavan|Dhritarashtra|Sanjaya|Arjuna)\s+said\s*:?)\s*/i);
    if (speakerMatch) {
      speaker = speakerMatch[1].replace(/\s*:?\s*$/, "").trim();
      rawEnglish = rawEnglish.slice(speakerMatch[0].length).trim();
    }

    results.push({
      chapter: currentChapter,
      verse: verseInfo.start,
      verseEnd: verseInfo.end > verseInfo.start ? verseInfo.end : null,
      speaker: speaker,
      text: rawEnglish,
    });

    englishBuffer = [];
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) continue;

    // 1. Chapter Header Detection
    const chapterMatch = trimmed.match(/^Chapter\s+(I|II|III|IV|V|VI|VII|VIII|IX|X|XI|XII|XIII|XIV|XV|XVI|XVII|XVIII)\s*$/i);
    if (chapterMatch) {
      currentChapter = ROMAN_TO_INT[chapterMatch[1].toUpperCase()] || currentChapter;
      englishBuffer = []; // Reset buffer on new chapter
      continue;
    }

    if (currentChapter === 0) continue; // Ignore intro/preface pages

    // 2. Extract Standalone Verse Markers
    const standaloneMarker = trimmed.match(/^\((\d+(?:[ó\-]\d+)?)\)$/);
    if (standaloneMarker) {
      const verseInfo = parseVerseMarker(standaloneMarker[0]);
      if (verseInfo) {
        flushBuffer(verseInfo);
      }
      continue;
    }

    // 3. Skip Page Noise & Non-English OCR Garbage
    if (isPageNoise(trimmed) || !isEnglishLine(trimmed)) continue;

    // 4. Process Valid English Line
    const normalized = normalizeSpeaker(trimmed);
    englishBuffer.push(normalized);

    // 5. Check for Inline Verse Marker on the processed line
    const inlineMarker = normalized.match(/\(\d+(?:[ó\-]\d+)?\)\s*$/);
    if (inlineMarker) {
      const verseInfo = parseVerseMarker(inlineMarker[0]);
      if (verseInfo) {
        flushBuffer(verseInfo);
      }
    }
  }

  return results;
}

// ─── ENTRY POINT ─────────────────────────────────────────────────────────────

function main() {
  const inputPath = process.argv[2] || "Gitapress-Gita-English.txt";
  const outputPath = process.argv[3] || "gita_final_db.json";

  if (!fs.existsSync(inputPath)) {
    console.error(`Input file not found: ${inputPath}`);
    console.error("Usage: node parse_gita_pdf.js <input_text_file> [output_json]");
    process.exit(1);
  }

  console.log(`Reading: ${inputPath}`);
  const rawText = fs.readFileSync(inputPath, "utf8");

  console.log("Parsing...");
  const verses = parseGitaText(rawText);

  // Stats
  const byChapter = {};
  for (const v of verses) {
    byChapter[v.chapter] = (byChapter[v.chapter] || 0) + 1;
  }

  console.log(`\n=== Parse Results ===`);
  console.log(`Total verse records: ${verses.length}`);
  for (let c = 1; c <= 18; c++) {
    console.log(`  Chapter ${c}: ${byChapter[c] || 0} verses`);
  }

  // Write output
  fs.writeFileSync(outputPath, JSON.stringify({ 
    meta: {
      source: "Gita Press English Translation",
      parser: "ascii-ratio-heuristic",
      totalVerses: verses.length,
      byChapter,
    },
    verses 
  }, null, 2));

  console.log(`\nOutput written to: ${outputPath}`);

  // Sample output
  console.log("\n=== Sample Output ===");
  const samples = verses.filter(v => v.chapter === 1).slice(0, 3)
    .concat(verses.filter(v => v.chapter === 2).slice(0, 2));

  for (const v of samples) {
    console.log(`\nCh.${v.chapter} v.${v.verse}${v.verseEnd ? "-" + v.verseEnd : ""} [${v.speaker || "—"}]`);
    console.log(`  "${v.text.slice(0, 100)}..."`);
  }
}

main();
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import Database from 'better-sqlite3';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = path.resolve(__dirname, '../../assets/gita.db');
const JSON_PATH = path.resolve(
  __dirname,
  '../../assets/OCR Extraction/3_gita_sanitized_db.json'
);

// Maps JSON speaker strings → normalized DB speaker values
// DB column stores lowercase single-name values (arjuna, krishna, sanjaya, dhritarashtra)
const SPEAKER_NORMALIZE_MAP = {
  'Sri Bhagavan said': 'krishna',
  'Arjuna said': 'arjuna',
  'Sanjaya said': 'sanjaya',
  'Dhritarashtra said': 'dhritarashtra',
};

function formatVerseLabel(chapter, verseStart, verseEnd) {
  const base = `${chapter}.${verseStart}`;
  if (verseEnd !== null && verseEnd !== verseStart) {
    return `${chapter}.${verseStart}-${chapter}.${verseEnd}`;
  }
  return base;
}

function run() {
  if (!fs.existsSync(DB_PATH)) {
    throw new Error(`DB not found at: ${DB_PATH}`);
  }
  if (!fs.existsSync(JSON_PATH)) {
    throw new Error(`JSON not found at: ${JSON_PATH}`);
  }

  const db = new Database(DB_PATH);
  const rawData = fs.readFileSync(JSON_PATH, 'utf-8');
  const { verses } = JSON.parse(rawData);

  // Step 1: Add columns if they don't already exist
  const columns = db
    .prepare('PRAGMA table_info(verses)')
    .all()
    .map(c => c.name);

  if (!columns.includes('translation_eng')) {
    db.prepare('ALTER TABLE verses ADD COLUMN translation_eng TEXT').run();
    console.log('✓ Added column: translation_eng');
  } else {
    console.log('• Column translation_eng already exists, skipping ALTER.');
  }

  // Step 2: Build update + speaker-check statements
  const updateTranslation = db.prepare(
    `UPDATE verses SET translation_eng = ? WHERE chapter_id = ? AND verse_number = ?`
  );

  const getVerse = db.prepare(
    `SELECT id, speaker FROM verses WHERE chapter_id = ? AND verse_number = ?`
  );

  let updated = 0;
  let skipped = 0;
  const speakerMismatches = [];
  const notFoundInDb = [];

  const migrate = db.transaction(() => {
    for (const v of verses) {
      const chapterId = `ch_${v.chapter}`; 
      const verseStart = v.verse;
      const verseEnd = v.verseEnd ?? v.verse;

      const label = formatVerseLabel(v.chapter, verseStart, v.verseEnd ?? null);
      const translationText = `${label} ${v.text}`;

      const jsonSpeakerRaw = v.speaker;
      const jsonSpeakerNormalized = jsonSpeakerRaw
        ? (SPEAKER_NORMALIZE_MAP[jsonSpeakerRaw] ?? jsonSpeakerRaw.toLowerCase())
        : null;

      for (let vn = verseStart; vn <= verseEnd; vn++) {
        const row = getVerse.get(chapterId, vn);

        if (!row) {
          notFoundInDb.push({ chapter: v.chapter, verse: vn });
          continue; // Keep scanning to find ALL missing rows before aborting
        }

        const dbSpeaker = row.speaker?.toLowerCase().trim() ?? null;
        if (jsonSpeakerNormalized && dbSpeaker && jsonSpeakerNormalized !== dbSpeaker) {
          speakerMismatches.push({
            chapter: v.chapter,
            verse: vn,
            db: dbSpeaker,
            json: jsonSpeakerNormalized,
            raw: jsonSpeakerRaw,
          });
        }

        updateTranslation.run(translationText, chapterId, vn);
        updated++;
      }
    }

    // STRICT ENFORCEMENT: If any anomalies were found, throw an error to trigger an automatic rollback.
    if (notFoundInDb.length > 0 || speakerMismatches.length > 0) {
      throw new Error("DATA_ANOMALY");
    }
  });

  // Execute with a try/catch to handle the deliberate rollback gracefully
  try {
    migrate();
    console.log(`\n✓ JSON Migration complete and committed.`);
    console.log(`  Rows updated:        ${updated}`);
  } catch (err) {
    if (err.message === "DATA_ANOMALY") {
      console.log(`\n❌ MIGRATION ABORTED: Transaction rolled back due to data anomalies.`);
      
      if (notFoundInDb.length > 0) {
        console.log(`\n⚠ Verse numbers in JSON not found in DB (${notFoundInDb.length}):`);
        for (const { chapter, verse } of notFoundInDb) {
          console.log(`  Ch ${chapter}:${verse}`);
        }
      }

      if (speakerMismatches.length > 0) {
        console.log(`\n⚠ Speaker mismatches (${speakerMismatches.length}) — DB vs JSON:`);
        console.table(speakerMismatches);
      }
    } else {
      console.log(`\n❌ MIGRATION FAILED: SQL or System Error. Transaction rolled back.`);
      console.error(err);
    }
    
    // Stop execution if migration failed so we don't run the NULL check on old data
    db.close();
    process.exit(1); 
  }

  // Step 4: Null audit — which rows still have no translation after migration
  const nullRows = db
    .prepare(
      'SELECT chapter_id, verse_number FROM verses WHERE translation_eng IS NULL'
    )
    .all();

  if (nullRows.length > 0) {
    console.log(`\n⚠ Rows with NULL translation_eng (${nullRows.length}):`);
    for (const r of nullRows) {
      console.log(`  Ch ${r.chapter_id}:${r.verse_number}`);
    }
  } else {
    console.log('  NULL check:          ✓ No rows without a translation.');
  }

  db.close();
}

run();

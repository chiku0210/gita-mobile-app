const Database = require('better-sqlite3');
const fs = require('fs');

async function seedDatabase() {
    console.log('Initializing gita_full.db...');
    const db = new Database('gita_full.db');
    
    // We will store all fetched data here to archive it at the end
    const rawArchive = [];

    try {
        // 1. Create the Relational Schema
        db.exec(`
            DROP TABLE IF EXISTS translations_fts;
            DROP TABLE IF EXISTS translations;
            DROP TABLE IF EXISTS verses;
            DROP TABLE IF EXISTS chapters;

            CREATE TABLE chapters (
                id TEXT PRIMARY KEY,
                chapter_number INTEGER NOT NULL,
                verses_count INTEGER NOT NULL,
                name_sanskrit TEXT NOT NULL,
                name_english TEXT,
                name_transliteration TEXT,
                meaning_en TEXT,
                meaning_hi TEXT,
                summary_en TEXT,
                summary_hi TEXT
            );

            CREATE TABLE verses (
                id TEXT PRIMARY KEY,
                chapter_id TEXT NOT NULL,
                verse_number INTEGER NOT NULL,
                text_sanskrit TEXT NOT NULL,
                text_romanized TEXT,
                FOREIGN KEY (chapter_id) REFERENCES chapters(id)
            );

            CREATE TABLE translations (
                id TEXT PRIMARY KEY,
                verse_id TEXT NOT NULL,
                author_code TEXT NOT NULL,
                author_name TEXT NOT NULL,
                et TEXT, -- English Translation
                ec TEXT, -- English Commentary
                ht TEXT, -- Hindi Translation
                hc TEXT, -- Hindi Commentary
                sc TEXT, -- Sanskrit Commentary
                FOREIGN KEY (verse_id) REFERENCES verses(id)
            );

            -- FTS5 Search Index for all translations and commentaries
            CREATE VIRTUAL TABLE translations_fts USING fts5(
                author_name,
                et, ec, ht, hc, sc,
                content='translations'
            );
        `);
        console.log('Schema created. Relational tables ready.');

        const insertChapter = db.prepare(`
            INSERT INTO chapters (id, chapter_number, verses_count, name_sanskrit, name_english, name_transliteration, meaning_en, meaning_hi, summary_en, summary_hi) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        const insertVerse = db.prepare(`
            INSERT INTO verses (id, chapter_id, verse_number, text_sanskrit, text_romanized) 
            VALUES (?, ?, ?, ?, ?)
        `);

        const insertTranslation = db.prepare(`
            INSERT INTO translations (id, verse_id, author_code, author_name, et, ec, ht, hc, sc) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        const authors = [
            'tej', 'siva', 'purohit', 'chinmay', 'san', 'adi', 'gambir', 
            'madhav', 'anand', 'rams', 'raman', 'abhinav', 'sankar', 
            'jaya', 'vallabh', 'ms', 'srid', 'dhan', 'neel', 'puru', 'venkat'
        ];

        // 2. Fetch Chapters
        console.log('Fetching Chapters Metadata...');
        const chaptersRes = await fetch('https://vedicscriptures.github.io/chapters');
        const chaptersData = await chaptersRes.json();

        rawArchive.push({ endpoint: '/chapters', data: chaptersData });

        // Synchronous Transaction for Chapters
        db.transaction(() => {
            for (const ch of chaptersData) {
                insertChapter.run(
                    `ch_${ch.chapter_number}`,
                    ch.chapter_number,
                    ch.verses_count,
                    ch.name || null,
                    ch.translation || null,
                    ch.transliteration || null,
                    ch.meaning ? ch.meaning.en : null,
                    ch.meaning ? ch.meaning.hi : null,
                    ch.summary ? ch.summary.en : null,
                    ch.summary ? ch.summary.hi : null
                );
            }
        })();
        console.log(`Seeded 18 Chapters.`);

        // 3. Fetch ALL Verses Sequentially & Insert Safely
        console.log('Fetching all 700 verses sequentially. This will take about 30-45 seconds...');
        
        let totalVerses = 0;
        let totalTranslations = 0;

        // Wrap the DB insertion in a reusable synchronous transaction function
        const insertChapterVerses = db.transaction((versesData) => {
            for (const item of versesData) {
                const chapterId = `ch_${item.chapter}`;
                const verseId = `${item.chapter}_${item.verse}`;
                
                insertVerse.run(
                    verseId,
                    chapterId,
                    item.verse,
                    item.slok ? item.slok.trim() : '',
                    item.transliteration ? item.transliteration.trim() : ''
                );
                totalVerses++;

                for (const authorCode of authors) {
                    if (item[authorCode]) {
                        const t = item[authorCode];
                        const translationId = `${verseId}_${authorCode}`;
                        
                        insertTranslation.run(
                            translationId,
                            verseId,
                            authorCode,
                            t.author || 'Unknown',
                            t.et ? t.et.trim() : null,
                            t.ec ? t.ec.trim() : null,
                            t.ht ? t.ht.trim() : null,
                            t.hc ? t.hc.trim() : null,
                            t.sc ? t.sc.trim() : null
                        );
                        totalTranslations++;
                    }
                }
            }
        });

        for (const ch of chaptersData) {
            process.stdout.write(`\rFetching & Seeding Chapter ${ch.chapter_number}/18...`);
            
            const currentChapterVerses = [];

            // PHASE A: Async Fetching (Outside Transaction)
            for (let v = 1; v <= ch.verses_count; v++) {
                const res = await fetch(`https://vedicscriptures.github.io/slok/${ch.chapter_number}/${v}`);
                const item = await res.json();
                
                currentChapterVerses.push(item);
                rawArchive.push({ endpoint: `/slok/${ch.chapter_number}/${v}`, data: item });
                
                // 20ms delay to prevent socket hangups on the API server
                await new Promise(resolve => setTimeout(resolve, 20)); 
            }

            // PHASE B: Sync Database Insertion (Inside Transaction)
            insertChapterVerses(currentChapterVerses);
        }

        console.log(`\n\nSuccessfully seeded ${totalVerses} verses.`);
        console.log(`Successfully seeded ${totalTranslations} translation/commentary records.`);

        // Save the raw archive to disk
        fs.writeFileSync('raw_api_dump.json', JSON.stringify(rawArchive, null, 2));
        console.log('Raw API data archived to raw_api_dump.json');

        // 4. Rebuild Search Index
        console.log('\nBuilding Full-Text Search (FTS5) Index for all commentaries...');
        db.exec(`INSERT INTO translations_fts(translations_fts) VALUES('rebuild');`);
        
        console.log('\n✅ Database creation complete! All data scraped successfully into gita_full.db');

    } catch (error) {
        console.error('\n❌ Error during seeding:', error);
    } finally {
        db.close();
        console.log('Database connection closed.');
    }
}

seedDatabase();
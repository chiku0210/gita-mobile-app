#!/usr/bin/env python3
"""
add_speaker.py

Adds a `speaker` column to the verses table in assets/gita.db
using the exhaustive ground-truth speaker map for all 701 verses.

Run from project root:
  python3 scripts/add_speaker.py

Validates final counts against known totals:
  Krishna: 574, Arjuna: 86, Sanjaya: 40, Dhritarashtra: 1
"""

import sqlite3
import sys

DB_PATH = 'assets/gita.db'


def build_speaker_map():
    m = {}

    def assign(chapter, verses, speaker):
        for v in verses:
            m[(chapter, v)] = speaker

    # Chapter 1 (47 verses)
    assign(1, [1], 'dhritarashtra')
    assign(1, list(range(2, 21)) + list(range(24, 28)) + [47], 'sanjaya')
    assign(1, list(range(21, 24)) + list(range(28, 47)), 'arjuna')

    # Chapter 2 (72 verses)
    assign(2, [1] + list(range(9, 11)), 'sanjaya')
    assign(2, [2, 3] + list(range(11, 54)) + list(range(55, 73)), 'krishna')
    assign(2, list(range(4, 9)) + [54], 'arjuna')

    # Chapter 3 (43 verses)
    assign(3, [1, 2, 36], 'arjuna')
    assign(3, list(range(3, 36)) + list(range(37, 44)), 'krishna')

    # Chapter 4 (42 verses)
    assign(4, list(range(1, 4)) + list(range(5, 43)), 'krishna')
    assign(4, [4], 'arjuna')

    # Chapter 5 (29 verses)
    assign(5, [1], 'arjuna')
    assign(5, list(range(2, 30)), 'krishna')

    # Chapter 6 (47 verses)
    assign(6, list(range(1, 33)) + [35, 36] + list(range(40, 48)), 'krishna')
    assign(6, [33, 34, 37, 38, 39], 'arjuna')

    # Chapter 7 (30 verses)
    assign(7, list(range(1, 31)), 'krishna')

    # Chapter 8 (28 verses)
    assign(8, [1, 2], 'arjuna')
    assign(8, list(range(3, 29)), 'krishna')

    # Chapter 9 (34 verses)
    assign(9, list(range(1, 35)), 'krishna')

    # Chapter 10 (42 verses)
    assign(10, list(range(1, 12)) + list(range(19, 43)), 'krishna')
    assign(10, list(range(12, 19)), 'arjuna')

    # Chapter 11 (55 verses)
    assign(11, list(range(1, 5)) + list(range(15, 32)) + list(range(36, 47)) + [51], 'arjuna')
    assign(11, list(range(5, 9)) + list(range(32, 35)) + list(range(47, 50)) + list(range(52, 56)), 'krishna')
    assign(11, list(range(9, 15)) + [35, 50], 'sanjaya')

    # Chapter 12 (20 verses)
    assign(12, [1], 'arjuna')
    assign(12, list(range(2, 21)), 'krishna')

    # Chapter 13 (35 verses — 701-verse variant)
    assign(13, [1], 'arjuna')
    assign(13, list(range(2, 36)), 'krishna')

    # Chapter 14 (27 verses)
    assign(14, list(range(1, 21)) + list(range(22, 28)), 'krishna')
    assign(14, [21], 'arjuna')

    # Chapter 15 (20 verses)
    assign(15, list(range(1, 21)), 'krishna')

    # Chapter 16 (24 verses)
    assign(16, list(range(1, 25)), 'krishna')

    # Chapter 17 (28 verses)
    assign(17, [1], 'arjuna')
    assign(17, list(range(2, 29)), 'krishna')

    # Chapter 18 (78 verses)
    assign(18, [1, 73], 'arjuna')
    assign(18, list(range(2, 73)), 'krishna')
    assign(18, list(range(74, 79)), 'sanjaya')

    return m


def validate_map(speaker_map):
    counts = {}
    for speaker in speaker_map.values():
        counts[speaker] = counts.get(speaker, 0) + 1

    expected = {
        'krishna':        574,
        'arjuna':          86,
        'sanjaya':         40,
        'dhritarashtra':    1,
    }

    print('Speaker map validation:')
    all_ok = True
    for speaker, exp in expected.items():
        actual = counts.get(speaker, 0)
        status = '✅' if actual == exp else '❌'
        print(f'  {status} {speaker:16s} expected={exp:3d}  got={actual:3d}')
        if actual != exp:
            all_ok = False

    total_exp    = sum(expected.values())
    total_actual = sum(counts.values())
    status = '✅' if total_actual == total_exp else '❌'
    print(f'  {status} {"TOTAL":16s} expected={total_exp:3d}  got={total_actual:3d}')

    if not all_ok:
        print('\n❌ Map validation failed. Aborting.')
        sys.exit(1)
    print('\n✅ Map validation passed.\n')


def apply_to_db(speaker_map):
    conn = sqlite3.connect(DB_PATH)
    cur  = conn.cursor()

    try:
        cur.execute('ALTER TABLE verses ADD COLUMN speaker TEXT')
        print("Added 'speaker' column.")
    except sqlite3.OperationalError:
        print("Column 'speaker' already exists — updating values.")

    cur.execute('SELECT id FROM verses')
    db_ids = [row[0] for row in cur.fetchall()]

    updates = []
    missing = []

    for verse_id in db_ids:
        parts = verse_id.split('_')
        if len(parts) != 2:
            missing.append(verse_id)
            continue
        ch, v = int(parts[0]), int(parts[1])
        speaker = speaker_map.get((ch, v))
        if speaker:
            updates.append((speaker, verse_id))
        else:
            missing.append(verse_id)

    if missing:
        print(f'⚠️  {len(missing)} verse IDs not found in map: {missing[:10]}')

    cur.executemany('UPDATE verses SET speaker = ? WHERE id = ?', updates)
    conn.commit()

    cur.execute('SELECT speaker, COUNT(*) FROM verses GROUP BY speaker ORDER BY COUNT(*) DESC')
    print('Final DB distribution:')
    for row in cur.fetchall():
        print(f'  {str(row[0]):16s}: {row[1]}')

    cur.execute('SELECT COUNT(*) FROM verses WHERE speaker IS NULL')
    nulls = cur.fetchone()[0]
    print(f'\n✅ Done. {nulls} NULL speakers remaining.' if nulls == 0 else f'\n⚠️ {nulls} verses still NULL.')
    conn.close()


if __name__ == '__main__':
    print(f'DB: {DB_PATH}\n')
    speaker_map = build_speaker_map()
    validate_map(speaker_map)
    apply_to_db(speaker_map)

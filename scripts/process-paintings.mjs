/* ============================================================================
 *  P R O C E S S   P A I N T I N G S
 *  ----------------------------------------------------------------------------
 *  Converts the hand-culled recovered paintings into the numbered .webp
 *  sequence the flipbook viewer reads (assets/img/paintings/0.webp …).
 *
 *  Source files in recovered/ are COPIED, never moved or deleted — the recovery
 *  output stays intact. Re-run any time after editing the order below; it
 *  overwrites the numbered webp set.
 *
 *  Order is purely aesthetic (the viewer shows no captions). Edit PAINTINGS to
 *  reorder or add/remove pieces, then re-run `node scripts/process-paintings.mjs`
 *  and update `count`/`start` on the include in _layouts/visual-art.html.
 * ========================================================================== */

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT       = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC_DIR    = join(ROOT, 'assets/img/paintings/recovered');
const OUT_DIR    = join(ROOT, 'assets/img/paintings');
const QUALITY    = '82';

// Ordered slugs (without extension) from recovered/ — paintings only.
const PAINTINGS = [
    'dense-rehab',
    'eating',
    'ghosts',
    'happy-blobs',
    'momma',
    'peacock',
    'pipes',
    'politics',
    'shoe-nose',
    'snile',
];

if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });

PAINTINGS.forEach((slug, i) => {
    const src = join(SRC_DIR, `${slug}.jpg`);
    const out = join(OUT_DIR, `${i}.webp`);
    if (!existsSync(src)) {
        console.error(`! missing source: ${src}`);
        process.exit(1);
    }
    // cwebp reads the source and writes a fresh file — the original is untouched.
    execFileSync('cwebp', ['-q', QUALITY, src, '-o', out], { stdio: 'inherit' });
    console.log(`✓ ${slug}.jpg → ${i}.webp`);
});

console.log(`\nDone — ${PAINTINGS.length} paintings written to assets/img/paintings/`);

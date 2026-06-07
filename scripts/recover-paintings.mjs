// R E C O V E R  P A I N T I N G S //
// Pulls images of Joey's old artwork from the web and stages every candidate
// into one folder for manual culling. Two source types, auto-detected per seed:
//
//   • Tumblr blog  (host ends in tumblr.com) — scraped via the no-auth read API
//     (/api/read/json), grabbing the highest-res photo (photo-url-1280) of every
//     photo post, paginated through the whole blog.
//
//   • Any other domain — crawled through the Internet Archive (Wayback Machine):
//     pull the CDX capture index, collect captured images directly, then parse
//     the distinct old HTML snapshots for <img>/srcset/<a>/CSS-url() references
//     and download each that has a real 200 capture (via the `id_` raw modifier,
//     so we get the unmodified original). Referenced-but-unarchived URLs are
//     logged to the manifest so you can see what's genuinely lost.
//
// All sources share one staging folder, dedup by SHA-256, and one manifest.json.
//
// Usage:
//   node scripts/recover-paintings.mjs                          # default seeds
//   node scripts/recover-paintings.mjs nmlstyl.tumblr.com example.com
//
// Note: Instagram/Twitter are auth-walled and not scraped here — export your own
// data archive from those platforms and drop the images into the staging folder.
//
// Output lands in assets/img/paintings/_staging/ — raw, unprocessed candidates.
// Cull by hand, then run the WebP/numbering step separately for the live viewer.

import { mkdir, writeFile, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';

// Seeds crawled when no CLI args are given. Recognised forms:
//   deviantart:USER   — DeviantArt gallery via the no-auth RSS backend
//   *.tumblr.com      — Tumblr blog via the no-auth read API
//   anything else     — domain crawled through the Wayback Machine
const DEFAULT_SEEDS = ['deviantart:nmlstyl', 'deviantart:joeym', 'nmlstyl.tumblr.com', 'joeymariano.com'];

const CDX = 'https://web.archive.org/cdx/search/cdx';
const WB = 'https://web.archive.org/web';
const OUT_DIR = path.join(process.cwd(), 'assets', 'img', 'paintings', '_staging');

const IMG_EXT = /\.(jpe?g|png|gif|webp|bmp|tiff?|svg)(\?|$)/i;
const MAX_HTML_SNAPSHOTS = 80;   // safety cap on distinct pages parsed per domain
const MIN_BYTES = 1024;          // skip sub-1KB files (spacers, broken captures)
const REQUEST_GAP_MS = 150;      // be polite to web.archive.org

// Obvious site chrome we never want staged. Curation is otherwise "keep all".
const JUNK = [/favicon\.ico$/i, /glyphicons/i, /sprite/i, /\bspacer\b/i];

const sleep = ms => new Promise(r => setTimeout(r, ms));

// Strip scheme, :80/:443, leading www. and lowercase the host so URLs captured
// as http://www.x:80/p and https://x/p collapse to one key. Path stays as-is —
// it can be case-sensitive on the origin server.
function normUrl(u) {
    try {
        const url = new URL(u);
        const host = url.host.replace(/^www\./i, '').replace(/:(80|443)$/, '');
        return host.toLowerCase() + url.pathname + url.search;
    } catch {
        return u;
    }
}

async function cdxAll(domain) {
    const url = `${CDX}?url=${encodeURIComponent(domain)}&matchType=domain&output=json`
        + `&fl=timestamp,original,mimetype,statuscode,digest,length&filter=statuscode:200`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`CDX ${domain}: HTTP ${res.status}`);
    const rows = await res.json();
    if (!Array.isArray(rows) || rows.length < 2) return [];
    const [header, ...data] = rows;
    return data.map(r => Object.fromEntries(header.map((h, i) => [h, r[i]])));
}

// Among all 200 captures of one URL, prefer the largest payload (best-quality
// version), breaking ties toward the most recent capture.
function bestCapture(captures) {
    return captures.slice().sort((a, b) => {
        const la = Number(a.length) || 0, lb = Number(b.length) || 0;
        if (lb !== la) return lb - la;
        return Number(b.timestamp) - Number(a.timestamp);
    })[0];
}

function rawUrl(cap) {
    return `${WB}/${cap.timestamp}id_/${cap.original}`;
}

// Pull every image URL referenced by an old page's HTML: <img src/srcset>,
// <a href> ending in an image extension, and CSS background url(). Relative
// links resolve against the page's *original* URL (id_ HTML is unrewritten).
function parseRefs(html, baseUrl) {
    const out = new Set();
    const add = raw => {
        if (!raw) return;
        try { out.add(new URL(raw.trim(), baseUrl).href); } catch { /* ignore */ }
    };
    for (const m of html.matchAll(/<img\b[^>]*?\bsrc\s*=\s*["']([^"']+)["']/gi)) add(m[1]);
    for (const m of html.matchAll(/\bsrcset\s*=\s*["']([^"']+)["']/gi)) {
        for (const part of m[1].split(',')) add(part.trim().split(/\s+/)[0]);
    }
    for (const m of html.matchAll(/<a\b[^>]*?\bhref\s*=\s*["']([^"']+)["']/gi)) {
        if (IMG_EXT.test(m[1])) add(m[1]);
    }
    for (const m of html.matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/gi)) {
        if (IMG_EXT.test(m[1])) add(m[1]);
    }
    return [...out];
}

// Derive a readable staged filename from a URL (host + path, flattened). Falls
// back to sanitising the raw string when it isn't a parseable URL.
function safeName(s) {
    let base = s;
    try { const u = new URL(s); base = u.host + u.pathname; } catch { /* not a URL */ }
    return base.replace(/[^a-z0-9._-]+/gi, '__').replace(/^_+|_+$/g, '') || 'image';
}

// Shared sink for every source type: fetch bytes, drop junk/tiny/duplicate, save
// to staging, and record in the manifest. `meta` carries per-image provenance:
//   { source, sourceUrl, fileName?, extra? }
// Returns 'saved' | 'skipped' | 'missing'.
async function stage(url, ctx, meta) {
    if (JUNK.some(rx => rx.test(url))) return 'skipped';
    try {
        const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
        if (!res.ok) return 'missing';
        const buf = Buffer.from(await res.arrayBuffer());
        if (buf.length < MIN_BYTES) return 'skipped';

        const sha = createHash('sha256').update(buf).digest('hex');
        if (ctx.seenSha.has(sha)) return 'skipped';   // same image, different URL
        ctx.seenSha.add(sha);

        const name = meta.fileName || safeName(meta.sourceUrl || url);
        const rel = meta.subdir ? path.join(meta.subdir, name) : name;
        if (!ctx.existing.has(rel)) {
            if (meta.subdir) await mkdir(path.join(OUT_DIR, meta.subdir), { recursive: true });
            await writeFile(path.join(OUT_DIR, rel), buf);
            ctx.existing.add(rel);
        }
        ctx.manifest.push({
            file: rel, source: meta.source, sourceUrl: meta.sourceUrl || url,
            fetchUrl: url, bytes: buf.length, sha256: sha, ...(meta.extra || {}),
        });
        return 'saved';
    } catch (err) {
        console.warn(`  ! ${url}: ${err.message}`);
        return 'missing';
    }
}

// Scrape every photo (highest available resolution) from a Tumblr blog via the
// classic no-auth read API, paginating through all posts.
async function crawlTumblr(host, ctx) {
    const blog = `https://${host}`;
    const PAGE = 50;
    let start = 0, total = Infinity, saved = 0, skipped = 0;
    while (start < total) {
        const res = await fetch(`${blog}/api/read/json?num=${PAGE}&start=${start}`,
            { headers: { 'User-Agent': 'Mozilla/5.0' } });
        if (!res.ok) { console.warn(`  ! ${host} start=${start}: HTTP ${res.status}`); break; }
        const text = await res.text();
        // Response is `var tumblr_api_read = {…};` — strip the JS wrapper.
        const json = JSON.parse(text.replace(/^var tumblr_api_read = /, '').replace(/;\s*$/, ''));
        total = json['posts-total'] ?? 0;
        const posts = json.posts || [];
        if (!posts.length) break;
        for (const post of posts) {
            // Photosets carry a `photos` array; single photos use top-level keys.
            const photos = (post.photos && post.photos.length) ? post.photos : [post];
            for (const p of photos) {
                const url = p['photo-url-1280'] || p['photo-url-500'];
                if (!url) continue;
                const r = await stage(url, ctx, {
                    source: `tumblr:${host}`,
                    sourceUrl: url,
                    subdir: `tumblr-${host}`,
                    extra: { postUrl: post.url, date: post['date-gmt'] },
                });
                if (r === 'saved') saved++; else if (r === 'skipped') skipped++;
                await sleep(REQUEST_GAP_MS);
            }
        }
        console.log(`  ${host}: ${Math.min(start + posts.length, total)}/${total} posts processed`);
        start += PAGE;
    }
    console.log(`  ${host}: saved ${saved}, skipped ${skipped}`);
}

// Crawl one domain through the Wayback Machine: index captures, parse old HTML
// for image references, then stage every reference that has a real 200 capture.
async function crawlWayback(domain, ctx) {
    console.log(`\nCDX: ${domain}`);
    const rows = await cdxAll(domain);
    console.log(`  ${rows.length} captures (status 200)`);

    const captureMap = new Map();   // normUrl -> [captures]
    const referenced = new Set();   // normUrl of every image to attempt
    const htmlCaptures = [];        // distinct HTML pages to parse
    const seenHtmlDigest = new Set();

    for (const cap of rows) {
        const key = normUrl(cap.original);
        if (!captureMap.has(key)) captureMap.set(key, []);
        captureMap.get(key).push(cap);

        if ((cap.mimetype || '').startsWith('image/')) referenced.add(key);
        else if ((cap.mimetype || '') === 'text/html' && !seenHtmlDigest.has(cap.digest)) {
            seenHtmlDigest.add(cap.digest);
            htmlCaptures.push(cap);
        }
    }

    const pages = htmlCaptures.slice(0, MAX_HTML_SNAPSHOTS);
    if (htmlCaptures.length > MAX_HTML_SNAPSHOTS) {
        console.log(`  ! ${htmlCaptures.length} HTML pages — parsing first ${MAX_HTML_SNAPSHOTS} (raise MAX_HTML_SNAPSHOTS to go deeper)`);
    }
    console.log(`  parsing ${pages.length} HTML snapshots for image references...`);
    for (const cap of pages) {
        try {
            const res = await fetch(rawUrl(cap));
            if (!res.ok) continue;
            const html = await res.text();
            for (const ref of parseRefs(html, cap.original)) {
                if (IMG_EXT.test(ref)) referenced.add(normUrl(ref));
            }
        } catch (err) {
            console.warn(`  ! ${cap.original}: ${err.message}`);
        }
        await sleep(REQUEST_GAP_MS);
    }
    console.log(`  ${referenced.size} unique image references; downloading archived copies...`);

    let saved = 0;
    for (const key of referenced) {
        const caps = captureMap.get(key);
        if (!caps) { ctx.missing.push(key); continue; }   // referenced but never archived
        const cap = bestCapture(caps);
        const r = await stage(rawUrl(cap), ctx, {
            source: `wayback:${domain}`,
            sourceUrl: cap.original,
            subdir: `wayback-${domain}`,
            extra: { timestamp: cap.timestamp, mimetype: cap.mimetype },
        });
        if (r === 'saved') saved++;
        else if (r === 'missing') ctx.missing.push(key);
        await sleep(REQUEST_GAP_MS);
    }
    console.log(`  ${domain}: saved ${saved}`);
}

function slugify(s) {
    return (s || '').toLowerCase().replace(/&#?\w+;/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

// Scrape a whole DeviantArt gallery via the public RSS backend. Each <item>
// carries several <media:content> URLs; the one WITHOUT a /v1/ transform segment
// is the unmodified original (full resolution), so we prefer that.
async function crawlDeviantArt(user, ctx) {
    const subdir = `deviantart-${user}`;   // each gallery lands in its own folder
    console.log(`\nDeviantArt: ${user}  -> ${subdir}/`);
    let offset = 0, saved = 0, skipped = 0;
    for (;;) {
        const url = `https://backend.deviantart.com/rss.xml?type=deviation&q=by%3A${encodeURIComponent(user)}&offset=${offset}`;
        const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
        if (!res.ok) { console.warn(`  ! ${user} offset=${offset}: HTTP ${res.status}`); break; }
        const xml = await res.text();
        const items = xml.split('<item>').slice(1);
        if (!items.length) break;

        for (const item of items) {
            const title = (item.match(/<title>([^<]*)<\/title>/) || [])[1] || '';
            const urls = [...item.matchAll(/<media:content\b[^>]*\burl="([^"]+)"/g)].map(m => m[1]);
            // Original = the media URL that isn't a /v1/fill or /v1/fit derivative.
            const full = urls.find(u => !/\/v1\/(fill|fit)\//.test(u)) || urls[0];
            if (!full) continue;
            const ext = (full.split('?')[0].match(/\.(jpe?g|png|gif)$/i) || [, 'jpg'])[1];
            const r = await stage(full, ctx, {
                source: `deviantart:${user}`,
                sourceUrl: `https://www.deviantart.com/${user}`,
                fileName: `${slugify(title) || offset}.${ext}`,
                subdir,
                extra: { title },
            });
            if (r === 'saved') saved++; else if (r === 'skipped') skipped++;
            await sleep(REQUEST_GAP_MS);
        }
        console.log(`  ${user}: ${offset + items.length} deviations processed`);
        offset += items.length;
    }
    console.log(`  ${user}: saved ${saved}, skipped ${skipped}`);
}

async function main() {
    const seeds = process.argv.slice(2).length ? process.argv.slice(2) : DEFAULT_SEEDS;
    await mkdir(OUT_DIR, { recursive: true });

    // Shared context across all seeds: dedup set, manifest, missing list, and the
    // set of already-staged files (lets the script resume / re-run cheaply).
    const ctx = {
        existing: new Set(await readdir(OUT_DIR).catch(() => [])),
        seenSha: new Set(),
        manifest: [],
        missing: [],
    };

    for (const seed of seeds) {
        if (seed.startsWith('deviantart:')) {
            await crawlDeviantArt(seed.slice('deviantart:'.length), ctx);
        } else if (/(^|\.)tumblr\.com$/i.test(new URL(`https://${seed}`).host)) {
            await crawlTumblr(new URL(`https://${seed}`).host, ctx);
        } else {
            await crawlWayback(seed, ctx);
        }
    }

    ctx.manifest.sort((a, b) => b.bytes - a.bytes);   // biggest (likely best) first
    await writeFile(
        path.join(OUT_DIR, 'manifest.json'),
        JSON.stringify({ seeds, generated: new Date().toISOString(), saved: ctx.manifest, missing: ctx.missing.sort() }, null, 2) + '\n'
    );

    console.log(`\nDone. Staged ${ctx.manifest.length} image(s) total.`);
    console.log(`${ctx.missing.length} referenced image(s) had no recoverable copy (see manifest "missing").`);
    console.log(`Staged in: ${path.relative(process.cwd(), OUT_DIR)}/  — cull, then run the WebP step.`);
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});

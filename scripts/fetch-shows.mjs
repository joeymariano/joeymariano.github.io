// F E T C H  S H O W S //
// Pulls concert listings from the Bandsintown Artist Events API for each act
// (nmlstyl + animal style) and merges them into an append-only archive at
// _data/shows.json. Run on a daily schedule by .github/workflows/fetch-shows.yml.
//
// Why an archive: Bandsintown's `date=past` endpoint only returns a limited
// window, so played shows eventually drop off the API. The committed JSON is the
// source of truth — entries accrue and never disappear, and the site renders from
// it at build time, so shows survive even when Bandsintown is unreachable.
//
// Bandsintown app_ids are scoped to a single artist profile, so each act has its
// own key. Set one env var per act (see `appIdEnv` below); any act whose key is
// unset is skipped, so the others still update. BANDSINTOWN_APP_ID is honored as
// a shared fallback for local one-off runs.

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

const API_BASE = 'https://rest.bandsintown.com/artists';
const ARCHIVE = path.join(process.cwd(), '_data', 'shows.json');

// Each act carries a palette accent (the site's blue / red / yellow) and the env
// var holding its Bandsintown app_id.
const ARTISTS = [
    { name: 'nmlstyl',      label: 'nmlstyl',      accent: '#3B82F6', appIdEnv: 'BANDSINTOWN_APP_ID_NMLSTYL' },
    { name: 'animal style', label: 'animal style', accent: '#EF4444', appIdEnv: 'BANDSINTOWN_APP_ID_ANIMAL_STYLE' },
];

function appIdFor(artist) {
    return process.env[artist.appIdEnv] || process.env.BANDSINTOWN_APP_ID || '';
}

function formatLocation(venue) {
    if (!venue) return '';
    const parts = [venue.city, venue.region || venue.country].filter(Boolean);
    return parts.length ? parts.join(', ') : (venue.location || '');
}

// Bandsintown appends the app_id (our API key) plus tracking params to event
// URLs. The archive is committed and rendered into public HTML, so strip those —
// the key must never land in the static site.
function cleanUrl(u) {
    try {
        const url = new URL(u);
        for (const p of ['app_id', 'came_from', 'utm_medium', 'utm_source', 'utm_campaign']) {
            url.searchParams.delete(p);
        }
        return url.toString();
    } catch {
        return u;
    }
}

function eventLink(ev) {
    if (Array.isArray(ev.offers)) {
        const offer = ev.offers.find(o => o.url);
        if (offer) return cleanUrl(offer.url);
    }
    return cleanUrl(ev.url || '');
}

// Flatten Bandsintown's event shape down to just what the page renders. Keeps the
// committed archive small and the Liquid template simple.
function normalize(ev, artist) {
    return {
        id: String(ev.id ?? `${artist.name}-${ev.datetime}`),
        artist: artist.label,
        accent: artist.accent,
        datetime: ev.datetime,
        venue: (ev.venue && ev.venue.name) || ev.title || 'TBA',
        location: formatLocation(ev.venue),
        url: eventLink(ev),
    };
}

async function fetchEvents(artist, appId, past) {
    const url = `${API_BASE}/${encodeURIComponent(artist.name)}/events`
        + `?app_id=${encodeURIComponent(appId)}${past ? '&date=past' : ''}`;
    const res = await fetch(url);
    if (!res.ok) {
        console.warn(`  ! ${artist.label} ${past ? 'past' : 'upcoming'}: HTTP ${res.status}`);
        return [];
    }
    const data = await res.json();
    // The API returns an object (e.g. { errorMessage }) instead of an array on error.
    if (!Array.isArray(data)) return [];
    return data.map(ev => normalize(ev, artist));
}

// The two acts are the same project, so a gig can appear under both profiles.
// Collapse those: when a non-nmlstyl event shares a date + venue with an nmlstyl
// event, drop it — nmlstyl always wins an overlap.
function dedupePreferNmlstyl(shows) {
    const key = s => `${(s.datetime || '').slice(0, 10)}|${(s.venue || '').trim().toLowerCase()}`;
    const nmlstylKeys = new Set(shows.filter(s => s.artist === 'nmlstyl').map(key));
    return shows.filter(s => s.artist === 'nmlstyl' || !nmlstylKeys.has(key(s)));
}

async function loadArchive() {
    try {
        const parsed = JSON.parse(await readFile(ARCHIVE, 'utf8'));
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return []; // missing or unreadable archive — start fresh
    }
}

async function main() {
    const existing = await loadArchive();
    const byId = new Map(existing.map(s => [s.id, s]));
    const before = byId.size;

    for (const artist of ARTISTS) {
        const appId = appIdFor(artist);
        if (!appId) {
            console.log(`  ${artist.label}: no key set (${artist.appIdEnv}) — skipping`);
            continue;
        }
        for (const past of [false, true]) {
            const events = await fetchEvents(artist, appId, past);
            // Overwrite keeps still-listed shows current (e.g. ticket links);
            // shows no longer returned simply persist from the archive untouched.
            for (const ev of events) byId.set(ev.id, ev);
            console.log(`  ${artist.label} ${past ? 'past' : 'upcoming'}: ${events.length}`);
        }
    }

    const merged = dedupePreferNmlstyl([...byId.values()]).sort(
        (a, b) => new Date(a.datetime) - new Date(b.datetime)
    );

    await mkdir(path.dirname(ARCHIVE), { recursive: true });
    await writeFile(ARCHIVE, JSON.stringify(merged, null, 2) + '\n');
    console.log(`Archive: ${before} -> ${merged.length} shows`);
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});

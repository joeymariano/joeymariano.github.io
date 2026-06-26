# ![joeymariano portfolio](/portfolio.png)

## JOEY MARIANO'S PORTFOLIO

### TECHNOLOGIES USED:
> ![Jekyll 4.3.4](https://img.shields.io/badge/Jekyll%204.3.4-purple?style=for-the-badge)
> 
> ![Static Badge](https://img.shields.io/badge/TailwindCSS%203.3.3-pink?style=for-the-badge)

### 🏛 Architecture

- jekyll handles the content system using markdown, containerization and code partitions
- npm used to load tailwind styles w/ css post processing
- custom github workflow for building, deploying and configuring jekyll w/ tailwind
- dns configured to joeymariano.com

---

### 🛠 Local Development

```sh
npm ci            # install the PostCSS / Tailwind toolchain
npm run serve     # build + serve locally with live reload
npm run build     # one-off production build
```

Both `serve` and `build` set `JEKYLL_ENV=production`, which runs PostCSS one-shot per file. This deliberately avoids `jekyll-postcss`'s development mode, where it spawns a PostCSS server on `localhost:8124` with a ~10s connection timeout — the first Tailwind compile can exceed that on a cold start and abort a bare `bundle exec jekyll build`. (The only difference in production mode is that `cssnano` minifies the CSS, which is harmless locally.)

---

### 🃏 Card System

Most pages are powered by a shared card component. Cards live in `_cards/` as individual markdown files:

```yaml
---
title: "Card Title"
image: filename.jpg          # loaded from /assets/img/
alt: "Description"           # optional — alt text (defaults to title)
round_image: true            # true = circular, false = rounded rect
category: home code music    # space-separated — controls which pages show this card
size: 1x                     # 1x = single column, 2x = double column
music: filename.mp3          # optional — enables the inline media player
video: filename.mp4          # optional — autoplaying muted loop (poster = image)
link: "https://example.com"  # optional — canonical URL in the card's JSON-LD
---
Card content in markdown.
```

Layouts render a section by calling `_card-grid.html` with a `categories` list (and optional `reversed`); it loops `site.cards`, filters by category, and passes each whole record to `_card.html`. `_card.html` renders a 4:3 image (or `video`), a CSS squiggle divider, a ring-badge title, and markdown content, and emits JSON-LD (`@type` is `VisualArtwork` for art cards, `MusicRecording` for music, else `CreativeWork`). Cards with a `music:` value get an inline audio controller via `_media-controller.html`.

---

### 🏠 Home Page (`/`)

Layout: `_layouts/home.html` — source: `index.markdown`

Renders all cards where `category` contains `home` in a responsive 1→2→4 column grid.

---

### 💻 Code / Tech Page (`/tech`)

Layout: `_layouts/code.html` — source: `tech.md`

Renders all cards where `category` contains `code` or `tech` under a "Tech Related" heading. Same responsive grid as home.

---

### 🎵 Music Page (`/music`)

Layout: `_layouts/music.html` — source: `music.md`

Sections, top to bottom:
- **Upcoming Shows** — `_live-shows.html mode="upcoming"` (hidden when there are none)
- **Samples** — cards with `category: mediaplayer`, each with an inline audio player
- **Discography** — Albums and Compilations & Appearances from `_data/discography.yml`, rendered via `_release.html` as horizontal scrollable timelines
- **Past Shows** — `_live-shows.html mode="past"`
- **Music Related** — cards with `category: music` or `show`, rendered as standard cards

---

### 🎨 Visual Art Page (`/visual-art`)

Layout: `_layouts/visual-art.html` — source: `visual-art.md`

Two sections:
- **Black Book** — an inline PDF viewer (`_includes/_black-book.html`) with prev/next page buttons, constrained to half-width on large screens
- **Visual Work** — cards with `category: art` or `design` in the standard responsive grid

---

### 📄 Resume Page

The resume page (`/resume`) is a fully interactive Jekyll page with a live PDF export feature.

#### Content Structure

Experience entries live in `_jobs/` as individual markdown files with frontmatter:

```yaml
title: "Job Title"
company: "Company Name"
date: YYYY-MM-DD
tags: [tag1, tag2]
location: "City, State"
link: "https://company-website.com"   # makes company name a clickable link
```

Education entries live in `_data/education.yml`:

```yaml
- school: "School Name"
  degree: "Degree"
  years: "YYYY - YYYY"
  color: "blue-500"
  url: "https://school-website.com"   # makes school name a clickable link
  details:
    - "bullet point"
```

Skills are defined in the `resume.markdown` frontmatter with optional wiki links:

```yaml
skills:
  - name: "JavaScript"
    category: "tech"          # tech | arts | misc — also sets the pill color (tech=blue, arts=red, misc=amber)
    wiki: "https://en.wikipedia.org/wiki/JavaScript"
```

The pill's drop-shadow color is derived from `category` in `_layouts/resume.html` (no per-skill `color:` field).

#### Links System

- **Company names** — each job's company name links to its official website (via `link:` frontmatter)
- **Inline bullet links** — specific project names, tools, and references within bullet points are wrapped in `<a>` tags with `class="text-blue-400 hover:text-blue-200 transition duration-150"`
- **Skills** — every skill links to its Wikipedia article, same inherited text color, no additional styling
- **Education** — school names link to their official pages (via `url:` field in education.yml)

---

### 🖨 PDF Generator

The PDF export button uses [jsPDF](https://github.com/parallax/jsPDF) loaded from CDN. It **reads the live rendered DOM** rather than the markdown source, so whatever appears on the page is exactly what goes into the PDF.

#### How it parses the resume

**Header** — renders name, email pill, and site URL pill. Loads a circular-cropped headshot from `/assets/img/joey-profile.jpg`.

**Font** — fetches Roboto Mono (Regular + Bold) from the Google Fonts GitHub CDN and embeds it as a TTF in the PDF. Falls back to Helvetica if the fetch fails.

**Experience** — queries all `.job-entry` DOM elements and groups them by company:
- Companies with multiple entries (BRDG Studios, Knabe Labs) are condensed into a single block with the company name as a header and each contract listed beneath it
- Only the **5 most recent company groups** are included
- Company names with a `link:` value render as direct inline clickable links in the PDF
- Inline bullet links are collected from the content `<p>` tag and rendered as color-coded pill buttons below each entry

**Education** — queries `#education-content .grid`. School names with a `url:` value are rendered as direct inline clickable links.

**Skills** — queries `#skills-container` by category (`tech`, `arts`, `misc`). Skills are laid out word-by-word with position tracking so that each skill name with a `wiki:` URL gets an invisible clickable hit area placed precisely over its rendered text in the PDF.

**PDF Metadata** — sets `title`, `author`, `subject`, `keywords`, and `creator` properties including all skills and role keywords for ATS and AI parser compatibility. Also adds a document outline (bookmarks) for Bio, Experience, Education, and Skills sections.

---

### ✨ Interactions & Animations

Small interactive details run across every page, built in vanilla JS under `assets/js/` and styled via `assets/css/style.css` (a thin manifest that `@import`s partials from `assets/css/partials/`). The JS is split by concern: `scripts.js` (menu, audio players, skill sort, fades), `image-modal.js` (lightbox), `black-book.js` (sketchbook viewer), `led-tracer.js` (LED border), `footer-utils.js` (card copy + email), and `utils.js` (shared `window.Site` helpers). The modal/copy markup lives in `_includes/_footer.html`; the behavior is in those JS files. Animation timings that mirror CSS (menu collapse, modal close) are read from the stylesheet at runtime rather than hard-coded.

#### Image Modal

Clicking any card image opens a fullscreen lightbox with a matching curved frame. Controls cluster left-to-right: `[←] [→] [×]`. Prev/next cycle through visible images on the page; open/close uses a wipe transition synced to the modal mask.

#### Card Copy Button

Each card has a small floating copy button (bottom-right) that copies the card's text contents to the clipboard, swapping to a green checkmark on success. Music cards add bottom padding so the icon doesn't overlap the inline audio controller.

#### PDF Generate Button

The `/resume` "Generate PDF" button uses a typewriter expand/collapse animation with sparkle pseudo-elements while jsPDF builds the document. The original `content`-in-`@keyframes` approach was reverted to static sparkle glyphs to avoid a `jekyll-postcss` shell-quoting bug in CI.

#### Skill Sort (FLIP)

On `/resume`, the skill sort buttons (tech / arts / misc) re-order skill pills with a FLIP-style glide — first/last positions are measured and a transform animates the delta so pills physically slide rather than jump.

#### Header Ribbon Ticker

The header title runs a stepped ribbon ticker animation. On mobile the title centers and scales with viewport width, sits on one line with the hamburger, and the hamburger icon animates into an X on menu open.

#### Black Book Skip-Ahead Nav

`/visual-art` page-turn buttons are non-blocking: rapid clicks skip ahead instead of queuing, so navigation stays responsive on large PDFs.

#### Load Sequencing

To prevent layout jumps and out-of-order reveals:
- Card image space is reserved before the image loads, then each card fades in once its image finishes loading
- Section headers fade in first, then cards stagger in DOM order
- On `/visual-art`, heading renders first, then the viewer skeleton, then cards
- The contact-section animation fires via `IntersectionObserver` once scroll completes

---

### 🖼 Images & Accessibility

Images under `/assets/img/` are compressed for scroll performance, with high-resolution originals preserved under `/assets/img/high_quality/`. Card images use `loading="lazy"` + `decoding="async"`, and non-decorative images (header/footer logos, job icons, resume skills, black-book sketches, cards) carry `alt` attributes. Page metadata (`description`, Open Graph, Twitter card) is set per layout via `_head.html`.

---

### ⚠️ Known Issues

#### `assets/css/style.css` must be pure ASCII

The CI build uses `jekyll-postcss` 0.5.0, which shells out the entire CSS payload as a single-quoted JSON argument to a Node helper. That handoff is fragile and breaks on:

- **Literal single quotes** (`'`) anywhere in the file — even inside comments. JSON does not escape `'`, so any `'` in the CSS terminates the shell argument early. This has bit comment apostrophes (`Tailwind's`) as well as `'⊕ '` style string values.
- **Non-ASCII bytes** (`→`, `⊕`, em-dashes, smart quotes, etc.), even inside comments. Exactly one pre-existing `→` was tolerated by coincidence; adding a second tipped it over with `syntax error near unexpected token '('`.

**Rule of thumb:** keep `assets/css/style.css` 100% ASCII, double-quoted only. After editing, verify with:

```sh
grep -n $'[^ -~\t]' assets/css/style.css   # non-ASCII — should be empty (portable; macOS grep lacks -P)
grep -n  "'"        assets/css/style.css   # apostrophes — should be empty
```

For glyphs that *need* to appear visually:

- **In property values:** use CSS escape sequences. `content: "\00B7";` and `content: "\002295";` both work. Use double quotes around the string.
- **For bullets like `⊕`:** apply via JS that sets the inline `style=` on the element after render. `assets/js/footer-utils.js` does this for `.card-contents li` — moving that rule into CSS will break CI.

#### PDF sparkle keyframes

The "Generate PDF" button's sparkle animation was originally implemented with `content:` swaps inside `@keyframes`. That also triggered the `jekyll-postcss` shell-quoting bug in CI, so the keyframes were reverted to static glyph swaps. See `#pdf-btn::before/::after` rules in `style.css`.

---

### 📜 License

This software is licensed under the [MIT] license (https://github.com/jekyll/jekyll/blob/master/LICENSE) © [joey mariano](https://joeymariano.github.io).

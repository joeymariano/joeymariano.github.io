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

---

### 🃏 Card System

Most pages are powered by a shared card component. Cards live in `_cards/` as individual markdown files:

```yaml
---
title: "Card Title"
image: filename.jpg          # loaded from /assets/img/
round_image: true            # true = circular, false = rounded rect
category: home code music    # space-separated — controls which pages show this card
size: 1x                     # 1x = single column, 2x = double column
music: filename.mp3          # optional — enables the inline media player
---
Card content in markdown.
```

The `_card.html` include renders each card with a 4:3 image, a CSS squiggle divider, a ring-badge title, and markdown content. Cards with a `music:` value get an inline audio controller via `_media-controller.html`.

---

### 🏠 Home Page (`/`)

Layout: `_layouts/home.html` — source: `index.markdown`

Renders all cards where `category` contains `home` in a responsive 1→2→4 column grid.

---

### 💻 Code / Tech Page (`/code`)

Layout: `_layouts/code.html` — source: `code.md`

Renders all cards where `category` contains `code` or `tech` under a "Tech Related" heading. Same responsive grid as home.

---

### 🎵 Music Page (`/music`)

Layout: `_layouts/music.html` — source: `music.md`

Two sections:
- **Recordings** — cards with `category: mediaplayer`, each renders with an inline audio player
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
    color: "#3B82F6"
    category: "tech"          # tech | arts | misc
    wiki: "https://en.wikipedia.org/wiki/JavaScript"
```

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

### 📜 License

This software is licensed under the [MIT] license (https://github.com/jekyll/jekyll/blob/master/LICENSE) © [joey mariano](https://joeymariano.github.io).

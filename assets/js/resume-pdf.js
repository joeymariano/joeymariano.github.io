/* ============================================================================
 *  R E S U M E   P D F   G E N E R A T O R
 *  ----------------------------------------------------------------------------
 *  Renders the live resume page into a downloadable PDF on the client.
 *  Reads from the DOM (jobs, education, skills, bio) so the PDF stays in sync
 *  with the site without a separate data source.
 *
 *  Depends on jsPDF (loaded via <script> tag in _layouts/resume.html).
 * ========================================================================== */


/* ----------------------------------------------------------------------------
 *  B U T T O N   I N T E R A C T I O N
 *  Wires the "↓ PDF" button to the generator and runs the typewriter animation
 *  while the PDF builds. The minimum 1.8s sparkle keeps the animation from
 *  feeling jumpy on fast machines.
 * -------------------------------------------------------------------------- */

document.addEventListener('DOMContentLoaded', function () {
    const btn = document.getElementById('pdf-btn');
    if (!btn) return;

    const stepDelay = 50; // ms between typewriter characters

    function wait(ms) {
        return new Promise(function (r) { setTimeout(r, ms); });
    }

    async function typeText(el, target) {
        for (const ch of target) {
            el.textContent += ch;
            await wait(stepDelay);
        }
    }

    // Measure the final "↓ PDF" width while the button is still in its
    // generating state — used to know when to stop deleting characters.
    function measureTargetW() {
        const clone = btn.cloneNode(false);
        clone.style.position = 'absolute';
        clone.style.visibility = 'hidden';
        clone.style.left = '-9999px';
        clone.style.top = '0';
        clone.style.transition = 'none';
        clone.classList.add('is-generating');
        clone.textContent = '↓ PDF';
        btn.parentNode.appendChild(clone);
        const w = clone.offsetWidth;
        clone.remove();
        return w;
    }

    btn.addEventListener('click', async function () {
        btn.disabled = true;

        const pdfPromise = generateResumePDF();
        const minSparkle = wait(1800);

        btn.textContent = '';
        btn.classList.add('is-generating');
        await typeText(btn, ' g e n e r a t i n g ');

        try { await Promise.all([pdfPromise, minSparkle]); } catch (e) {}

        // Untype: delete chars one-by-one until the button matches "↓ PDF" width.
        const targetW = measureTargetW();
        while (btn.textContent.length > 0 && btn.offsetWidth > targetW) {
            btn.textContent = btn.textContent.slice(0, -1);
            await wait(stepDelay);
        }
        btn.textContent = '↓ PDF';
        btn.classList.remove('is-generating');
        btn.disabled = false;
    });
});


/* ----------------------------------------------------------------------------
 *  A S S E T   L O A D E R S
 *  Font + headshot fetching used by the PDF generator.
 * -------------------------------------------------------------------------- */

// Chunked base64 encode — large font buffers blow the call stack if passed
// straight to String.fromCharCode(...bytes).
function bufToBase64(buf) {
    const bytes = new Uint8Array(buf);
    let binary = '';
    for (let i = 0; i < bytes.length; i += 8192) {
        binary += String.fromCharCode.apply(null, bytes.subarray(i, i + 8192));
    }
    return btoa(binary);
}

// Try a list of mirror URLs and return the first successful arraybuffer.
async function fetchTTF(urls) {
    for (const url of urls) {
        try {
            const res = await fetch(url);
            if (!res.ok) continue;
            return await res.arrayBuffer();
        } catch (e) { /* try next */ }
    }
    return null;
}

// Load the headshot, crop it to a centered circle, and return a JPEG data URL.
// JPEG (not PNG) because PDF file size matters more than transparency here —
// we pre-fill white so the corners outside the circle blend into the page.
function loadHeadshot() {
    return new Promise(function (resolve) {
        const img = new Image();
        img.crossOrigin = 'anonymous';

        img.onload = function () {
            const src = Math.min(img.naturalWidth, img.naturalHeight);
            const OUT = 300; // renders at ~75pt in the PDF — 300px is plenty

            const canvas = document.createElement('canvas');
            canvas.width  = OUT;
            canvas.height = OUT;
            const ctx = canvas.getContext('2d');

            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, OUT, OUT);
            ctx.beginPath();
            ctx.arc(OUT / 2, OUT / 2, OUT / 2, 0, Math.PI * 2);
            ctx.clip();
            ctx.drawImage(
                img,
                (img.naturalWidth  - src) / 2,
                (img.naturalHeight - src) / 2,
                src, src,
                0, 0, OUT, OUT
            );
            resolve(canvas.toDataURL('image/jpeg', 0.85));
        };

        img.onerror = function () { resolve(null); };
        img.src = '/assets/img/joey-profile.jpg';
    });
}

// Load Roboto Mono from a few CDN mirrors and register it with jsPDF.
// Falls back to Helvetica if every mirror fails.
async function loadRobotoFont(doc) {
    const base = 'https://raw.githubusercontent.com/google/fonts/main/apache/robotomono/';
    const variants = [
        {
            style: 'normal',
            urls: [
                base + 'static/RobotoMono-Regular.ttf',
                base + 'RobotoMono-Regular.ttf',
                'https://cdn.jsdelivr.net/gh/google/fonts/apache/robotomono/static/RobotoMono-Regular.ttf'
            ]
        },
        {
            style: 'bold',
            urls: [
                base + 'static/RobotoMono-Bold.ttf',
                base + 'RobotoMono-Bold.ttf',
                'https://cdn.jsdelivr.net/gh/google/fonts/apache/robotomono/static/RobotoMono-Bold.ttf'
            ]
        }
    ];

    let anyLoaded = false;
    for (const v of variants) {
        const buf = await fetchTTF(v.urls);
        if (!buf) continue;
        const b64 = bufToBase64(buf);
        doc.addFileToVFS('RM-' + v.style + '.ttf', b64);
        doc.addFont('RM-' + v.style + '.ttf', 'RobotoMono', v.style);
        anyLoaded = true;
    }

    try { doc.setFont('RobotoMono', 'normal'); return anyLoaded; }
    catch (e) { return false; }
}


/* ----------------------------------------------------------------------------
 *  M A I N   G E N E R A T O R
 *  Builds the entire PDF: metadata → header → bio → experience → education
 *  → skills → footer → outline.
 * -------------------------------------------------------------------------- */

async function generateResumePDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: 'pt', format: 'letter' });

    // ── Page geometry ───────────────────────────────────────────────────────
    const margin = 50;
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const colW  = pageW - margin * 2;
    let y = margin;

    // ── Palette (matches the site's red/green/blue accent system) ───────────
    const BLUE  = [59, 130, 246];
    const RED   = [239, 68, 68];
    const GREEN = [34, 197, 94];
    const DARK  = [30, 30, 30];
    const MID   = [90, 90, 90];
    const LIGHT = [140, 140, 140];


    /* ── P D F   M E T A D A T A ─────────────────────────────────────────────
     * Invisible to humans, but read by AI parsers, ATS systems, and search
     * indexers. Pulled live from the DOM so it stays in sync with the page.
     * ----------------------------------------------------------------------- */

    const techSkills = Array.from(document.querySelectorAll('#skills-container [data-category="tech"]'))
        .map(function (n) { return n.textContent.trim(); });

    const now   = new Date();
    const stamp = now.getFullYear()
                  + '-' + String(now.getMonth() + 1).padStart(2, '0')
                  + '-' + String(now.getDate()).padStart(2, '0')
                  + '_' + String(now.getHours()).padStart(2, '0')
                  + String(now.getMinutes()).padStart(2, '0');

    const roleTerms = [
        'Creative Technologist', 'Creative Technology', 'Artist Technologist',
        'Tech Artist', 'Interdisciplinary Technologist', 'Arts and Technology',
        'Creative Coder', 'Artist Educator', 'Multimedia Technologist'
    ];

    const siteUrls = [
        'https://joeymariano.com',
        'https://joeymariano.com/resume',
        'https://joeymariano.com/visual-art',
        'https://joeymariano.com/music',
        'https://joeymariano.com/tech'
    ];

    doc.setProperties({
        title:    'Ms. Joey Mariano — Creative Technologist — Resume',
        author:   'Ms. Joey Mariano',
        subject:  'Creative Technologist, Artist, and Educator. 26+ years integrating arts and technology. Interactive resume with sortable skills, animated portfolio, visual art, and music: https://joeymariano.com/resume',
        keywords: [
            roleTerms.join(', '),
            techSkills.slice(0, 12).join(', '),
            'interactive resume, animated portfolio, creative coding, generative art, multimedia, installation, sound design, game audio, educator',
            siteUrls.join(', ')
        ].join(', '),
        creator:  'Joey Mariano — joeymariano.com/resume (interactive version with sortable skills, animations, art, and music)',
        creationDate: now,
    });

    // Document language — helps AI parsers pick the right locale.
    doc.internal.write('/Lang (en-US)');

    // Outline entries are added after sections render, once we know page numbers.
    const outline = doc.outline;
    const sectionPages = {};

    // Kick off font + headshot in parallel — both are network-bound.
    const [robotoLoaded, headshot] = await Promise.all([loadRobotoFont(doc), loadHeadshot()]);
    const fontName = robotoLoaded ? 'RobotoMono' : 'helvetica';


    /* ── L O W - L E V E L   D R A W I N G   H E L P E R S ─────────────────── */

    function setFont(size, color, bold) {
        doc.setFontSize(size);
        doc.setTextColor(...color);
        try { doc.setFont(fontName, bold ? 'bold' : 'normal'); }
        catch (e) { doc.setFont('helvetica', bold ? 'bold' : 'normal'); }
    }

    function textBlock(text, x, startY, maxW, size, color, bold) {
        setFont(size, color, bold);
        const lines = doc.splitTextToSize(text, maxW);
        doc.text(lines, x, startY);
        return startY + lines.length * (size * 1.35);
    }

    // Place an invisible clickable rectangle over text that's already rendered.
    function pdfLink(x, baselineY, w, fontSize, url) {
        doc.link(x, baselineY - fontSize * 0.82, w, fontSize * 1.1, { url: url });
    }

    // Extract <a> tags from a DOM element.
    function domLinks(el) {
        return Array.from(el.querySelectorAll('a'))
            .map(function (a) { return { text: a.textContent.trim(), href: a.href }; })
            .filter(function (l) { return l.text && l.href; });
    }

    const RGB = [RED, GREEN, BLUE];

    // Draw a small rounded-rectangle "pill" button with a clickable link.
    // Takes a TEXT BASELINE y — box position is derived from it so pills align
    // perfectly with surrounding text.
    function pillBtn(label, bx, baselineY, color, url, fontSize) {
        const fs  = fontSize || 7;
        const pad = 3;
        const r   = 2.5;

        setFont(fs, DARK, false);
        const tw = doc.getTextWidth(label);
        const bw = tw + pad * 2;
        const bh = fs + 5;
        const by = baselineY - (bh + fs * 0.5) / 2;

        doc.setDrawColor(...color);
        doc.setLineWidth(1);
        doc.roundedRect(bx, by, bw, bh, r, r, 'S');

        setFont(fs, DARK, false);
        doc.text(label, bx + pad, baselineY);
        doc.link(bx, by, bw, bh, { url: url });

        return bw;
    }

    // Render a list of links as inline pills, wrapping only when needed.
    function renderLinks(links, x, startY, maxW) {
        let cy = startY;
        let cx = x;
        const gap = 5;
        const fs = 7;
        const pad = 3;

        links.forEach(function (l, i) {
            setFont(fs, DARK, false);
            const tw = doc.getTextWidth(l.text);
            const bw = tw + pad * 2;

            if (cx > x && cx + bw > x + maxW) {
                cy += 12;
                cx = x;
            }
            cy = checkBreak(cy, 14);
            pillBtn(l.text, cx, cy, RGB[i % 3], l.href, fs);
            cx += bw + gap;
        });
        return cy + 10;
    }

    // Add a new page if `needed` more pt won't fit on the current page.
    function checkBreak(currentY, needed) {
        if (currentY + needed > pageH - margin) {
            doc.addPage();
            return margin;
        }
        return currentY;
    }

    // Render an element's <li> children as "• text" lines at (x, startY), each
    // wrapped to `width`. Returns the y after the last bullet. Single-column
    // sections (Education/Honors) pass paginate=true to break across pages; the
    // horizontally-scrolled job columns pass false.
    function renderBullets(container, x, width, startY, paginate) {
        let yy = startY;
        container.querySelectorAll('li').forEach(function (li) {
            const raw = li.textContent.replace(/⊕/g, '').trim();
            if (!raw) return;
            if (paginate) yy = checkBreak(yy, 16);
            setFont(8.5, LIGHT, false);
            const lines = doc.splitTextToSize('• ' + raw, width);
            doc.text(lines, x, yy);
            yy += lines.length * 11 + 2;
        });
        return yy;
    }

    // Section header: colored rule + bold label. Includes 60pt headroom so a
    // heading can't be orphaned alone at the bottom of a page.
    function sectionHeader(label, currentY, color) {
        currentY = checkBreak(currentY, 60);
        doc.setDrawColor(...color);
        doc.setLineWidth(1);
        doc.line(margin, currentY, pageW - margin, currentY);
        currentY += 14;
        return textBlock(label, margin, currentY, colW, 11, color, true) + 6;
    }


    /* ── H E A D E R ─────────────────────────────────────────────────────────
     * Headshot + name + contact pills + tri-color rule.
     * Everything is positioned relative to the name baseline so the
     * headshot height matches the text block exactly.
     * ----------------------------------------------------------------------- */

    // Email is assembled from char codes to slow down naive scrapers.
    const email = window.Site.contactEmail();

    const imgTop        = y;
    const nameFs        = 26;
    const headerPillFs  = 8.5;
    const nameBaseline  = imgTop + 28;
    const nameCapTop    = nameBaseline - nameFs * 0.72;
    const btnBaseline   = imgTop + 60;
    const pillBh        = headerPillFs + 5;
    const pillBoxBot    = btnBaseline + pillBh - (pillBh + headerPillFs * 0.5) / 2;
    const imgDrawY      = nameCapTop;
    const imgSize       = pillBoxBot - nameCapTop;
    const textX         = headshot ? margin + imgSize + 12 : margin;
    const textW         = colW - (headshot ? imgSize + 12 : 0);

    if (headshot) {
        doc.addImage(headshot, 'JPEG', margin, imgDrawY, imgSize, imgSize);
    }

    setFont(nameFs, DARK, true);
    doc.text('Ms. Joey Mariano', textX, nameBaseline);
    const siteW = pillBtn('joeymariano.com', textX, btnBaseline, RED, 'https://joeymariano.com', headerPillFs);
    pillBtn(email, textX + siteW + 5, btnBaseline, GREEN, 'mailto:' + email, headerPillFs);

    y = pillBoxBot + 10;

    // Tri-color rule under the header.
    const lineW = pageW - margin * 2;
    const segW  = lineW / 3;
    doc.setLineWidth(2);
    doc.setDrawColor(...RED);
    doc.line(margin,            y, margin + segW,     y);
    doc.setDrawColor(...GREEN);
    doc.line(margin + segW,     y, margin + segW * 2, y);
    doc.setDrawColor(...BLUE);
    doc.line(margin + segW * 2, y, margin + lineW,    y);
    y += 18;


    /* ── B I O ─────────────────────────────────────────────────────────────── */

    const bioEl = document.getElementById('pdf-bio');
    if (bioEl) {
        const paras = Array.from(bioEl.querySelectorAll('p'))
            .map(function (p) { return p.textContent.trim(); })
            .filter(function (t) { return t.length > 0; });
        const bioText  = paras.join('  ');
        const bioLinks = domLinks(bioEl);

        if (bioText) {
            sectionPages['Bio'] = doc.internal.getCurrentPageInfo().pageNumber;
            y = sectionHeader('BIO', y, MID);
            y = textBlock(bioText, margin, y, colW, 9.5, MID, false);
            if (bioLinks.length) y = renderLinks(bioLinks, margin, y + 2, colW);
            y += 10;
        }
    }


    /* ── E X P E R I E N C E   ( T W O   C O L U M N S ) ───────────────────── */

    sectionPages['Experience'] = doc.internal.getCurrentPageInfo().pageNumber;
    y = sectionHeader('EXPERIENCE', y, BLUE);

    const gap   = 20;
    const halfW = (colW - gap) / 2;
    const colX  = [margin, margin + halfW + gap];
    const colY  = [y, y];

    // Render a single job entry into a column.
    function renderJob(job, cx, startY, cw) {
        let cy = startY;
        const title       = (job.querySelector('h3')   || {}).textContent || '';
        const date        = (job.querySelector('time') || {}).textContent || '';
        const company     = (job.dataset.company || '').trim();
        const client      = (job.dataset.client  || '').trim();
        const companyLink = (job.dataset.companyLink || '').trim();
        const clientLink  = (job.dataset.clientLink  || '').trim();

        // Title
        setFont(10, DARK, true);
        const titleLines = doc.splitTextToSize(title.trim(), cw);
        doc.text(titleLines, cx, cy);
        cy += titleLines.length * 13;

        // Date
        setFont(8, LIGHT, false);
        doc.text(date.trim(), cx, cy);
        cy += 11;

        // Company [/ Client]
        if (company) {
            setFont(9, MID, false);
            doc.text(company, cx, cy);
            if (companyLink) pdfLink(cx, cy, doc.getTextWidth(company), 9, companyLink);

            if (client) {
                const sep    = ' / ';
                const sepX   = cx + doc.getTextWidth(company);
                doc.text(sep, sepX, cy);
                const clientX = sepX + doc.getTextWidth(sep);
                doc.text(client, clientX, cy);
                if (clientLink) pdfLink(clientX, cy, doc.getTextWidth(client), 9, clientLink);
            }
            cy += 11;
        }

        // Bullet list (or fall back to a paragraph if no bullets)
        const bullets = job.querySelectorAll('li');
        cy = renderBullets(job, cx + 6, cw - 8, cy, false);

        if (!bullets.length) {
            const para  = (job.querySelector('p') || {}).textContent || '';
            const clean = para.replace(/⊕/g, '').trim();
            if (clean) {
                setFont(8.5, LIGHT, false);
                const lines = doc.splitTextToSize(clean, cw - 8);
                doc.text(lines, cx + 6, cy);
                cy += lines.length * 11;
            }
        }

        // Inline links from the job description
        const jobLinks = domLinks(job.querySelector('p') || job);
        if (jobLinks.length) cy = renderLinks(jobLinks, cx + 6, cy, cw - 8);

        return cy + 10;
    }

    // Render multiple jobs from the same company under a shared company heading.
    function renderGroupedJobs(companyName, jobList, cx, startY, cw) {
        let cy = startY;

        // Company heading (shared across the group)
        setFont(9, MID, false);
        doc.text(companyName, cx, cy);
        const companyLink = (jobList[0].dataset.companyLink || '').trim();
        if (companyLink) {
            pdfLink(cx, cy, doc.getTextWidth(companyName), 9, companyLink);
        }
        cy += 13;

        jobList.forEach(function (job) {
            const title      = (job.querySelector('h3')   || {}).textContent || '';
            const date       = (job.querySelector('time') || {}).textContent || '';
            const client     = (job.dataset.client || '').trim();
            const clientLink = (job.dataset.clientLink || '').trim();

            setFont(10, DARK, true);
            const titleLines = doc.splitTextToSize(title.trim(), cw);
            doc.text(titleLines, cx + 4, cy);
            cy += titleLines.length * 13;

            if (client) {
                setFont(8.5, MID, false);
                doc.text(client, cx + 4, cy);
                if (clientLink) pdfLink(cx + 4, cy, doc.getTextWidth(client), 8.5, clientLink);
                cy += 11;
            }

            setFont(8, LIGHT, false);
            doc.text(date.trim(), cx + 4, cy);
            cy += 11;

            cy = renderBullets(job, cx + 10, cw - 12, cy, false);

            const jLinks = domLinks(job.querySelector('p') || job);
            if (jLinks.length) cy = renderLinks(jLinks, cx + 10, cy, cw - 12);
            cy += 4;
        });

        return cy + 6;
    }

    // Only jobs flagged `pdf_include: true` in their frontmatter are included.
    // Grouping reads `data-company` so we don't have to regex job titles.
    const jobs = Array.from(document.querySelectorAll('.job-entry[data-pdf-include="true"]'));
    const jobSeen = {};
    const jobGroups = [];
    jobs.forEach(function (job) {
        const key = (job.dataset.company || '').trim();
        if (!jobSeen[key]) {
            jobSeen[key] = { key: key, jobs: [] };
            jobGroups.push(jobSeen[key]);
        }
        jobSeen[key].jobs.push(job);
    });

    // Alternate jobs left/right; start a new page if neither column has room.
    jobGroups.forEach(function (group, i) {
        const col = i % 2;
        const cx  = colX[col];
        const neededY = colY[col] + 60;
        if (neededY > pageH - margin) {
            doc.addPage();
            colY[0] = margin;
            colY[1] = margin;
        }
        colY[col] = group.jobs.length === 1
            ? renderJob(group.jobs[0], cx, colY[col], halfW)
            : renderGroupedJobs(group.key, group.jobs, cx, colY[col], halfW);
    });

    y = Math.max(colY[0], colY[1]) + 8;

    // CTA pill — sends PDF readers back to the live interactive version.
    const ctaLabel = 'More Experience History =>';
    const ctaFs    = 10;
    const ctaBaseY = y + ctaFs + 2;
    pillBtn(ctaLabel, margin, ctaBaseY, BLUE, 'https://joeymariano.com/resume', ctaFs);
    y = ctaBaseY + 12;

    // Page rule: Education + Skills always start on a fresh page.
    doc.addPage();
    y = margin;


    /* ── E D U C A T I O N ─────────────────────────────────────────────────── */

    sectionPages['Education'] = doc.internal.getCurrentPageInfo().pageNumber;
    y = sectionHeader('EDUCATION', y, RED);

    const eduGrid = document.querySelector('#education-content .grid');
    if (eduGrid) {
        const entries = eduGrid.children;
        for (let i = 0; i < entries.length; i++) {
            const entry  = entries[i];
            y = checkBreak(y, 60);

            const school = (entry.querySelector('h3') || {}).textContent || '';
            const degree = (entry.querySelector('h2') || {}).textContent || '';
            const ps     = entry.querySelectorAll('p');
            const years  = ps.length ? ps[0].textContent.trim() : '';

            // School (linked if there's an <a> inside the heading)
            setFont(10, DARK, true);
            const schoolText = school.trim();
            doc.text(schoolText, margin, y);
            const schoolAnchor = entry.querySelector('h3 a');
            if (schoolAnchor && schoolAnchor.href) {
                pdfLink(margin, y, doc.getTextWidth(schoolText), 10, schoolAnchor.href);
            }
            y += 13;

            y = textBlock(degree.trim(), margin, y, colW, 9, MID, false);
            if (years) y = textBlock(years, margin, y, colW, 8, LIGHT, false);

            // Bullets
            y = renderBullets(entry, margin + 8, colW - 12, y, true);

            y += 10;
        }
    }


    /* ── H O N O R S   &   A W A R D S ─────────────────────────────────────── */

    const honorsGrid = document.querySelector('#honors-content .grid');
    if (honorsGrid && honorsGrid.children.length) {
        sectionPages['Honors'] = doc.internal.getCurrentPageInfo().pageNumber;
        y = sectionHeader('HONORS & AWARDS', y, BLUE);

        const awards = honorsGrid.children;
        for (let i = 0; i < awards.length; i++) {
            const award = awards[i];
            y = checkBreak(y, 50);

            const title  = (award.querySelector('h3') || {}).textContent || '';
            const issuer = (award.querySelector('h2') || {}).textContent || '';
            const assocEl = award.querySelector('p');
            const assoc  = assocEl ? assocEl.textContent.trim() : '';

            // Title (linked if there's an <a> inside the heading)
            setFont(10, DARK, true);
            const titleText = title.trim();
            doc.text(titleText, margin, y);
            const anchor = award.querySelector('h3 a');
            if (anchor && anchor.href) {
                pdfLink(margin, y, doc.getTextWidth(titleText), 10, anchor.href);
            }
            y += 13;

            if (issuer.trim()) y = textBlock(issuer.trim(), margin, y, colW, 9, MID, false);
            if (assoc)         y = textBlock(assoc, margin, y, colW, 8, LIGHT, false);

            y = renderBullets(award, margin + 8, colW - 12, y, true);

            y += 10;
        }
    }


    /* ── S K I L L S ───────────────────────────────────────────────────────── */

    sectionPages['Skills'] = doc.internal.getCurrentPageInfo().pageNumber;
    y = sectionHeader('SKILLS', y, GREEN);

    const categories = [
        { key: 'tech', label: 'Tech',         color: BLUE  },
        { key: 'arts', label: 'Arts & Music', color: RED   },
        { key: 'misc', label: 'Misc',         color: GREEN }
    ];

    categories.forEach(function (cat) {
        const nodes = document.querySelectorAll(
            '#skills-container [data-category="' + cat.key + '"]'
        );
        if (!nodes.length) return;

        y = checkBreak(y, 24);

        // Colored category label
        setFont(8.5, cat.color, true);
        doc.text(cat.label + ': ', margin, y);
        const labelW = doc.getTextWidth(cat.label + ': ');
        setFont(8.5, LIGHT, false);

        const skills = Array.from(nodes).map(function (n) {
            const a = n.querySelector('a');
            return { name: n.textContent.trim(), href: a ? a.href : null };
        });

        // Flow skills inline, wrapping at the right margin.
        const startX = margin + labelW;
        const maxX   = margin + colW;
        const lineH  = 11;
        let cx = startX;
        let lineY = y;

        skills.forEach(function (skill, idx) {
            const suffix = idx < skills.length - 1 ? ', ' : '';
            const word   = skill.name + suffix;
            const wordW  = doc.getTextWidth(word);

            if (cx + wordW > maxX && cx > startX) {
                lineY += lineH;
                lineY = checkBreak(lineY, lineH);
                cx = startX;
            }
            doc.text(word, cx, lineY);
            if (skill.href) {
                pdfLink(cx, lineY, doc.getTextWidth(skill.name), 8.5, skill.href);
            }
            cx += wordW;
        });

        y = lineY + lineH + 6;
    });


    /* ── E X P L O R E - M O R E   F O O T E R ─────────────────────────────── */
    // Extra crawlable links for AI agents and ATS systems.

    const footerLinks = [
        { text: 'Interactive Resume', url: 'https://joeymariano.com/resume',     color: BLUE  },
        { text: 'Visual Art',         url: 'https://joeymariano.com/visual-art', color: RED   },
        { text: 'Music',              url: 'https://joeymariano.com/music',      color: GREEN },
        { text: 'Code',               url: 'https://joeymariano.com/tech',       color: BLUE  },
        { text: 'joeymariano.com',    url: 'https://joeymariano.com',            color: RED   }
    ];
    const footerFs = 8.5;
    y = checkBreak(y + 8, 24);
    let footerX = margin;
    footerLinks.forEach(function (link) {
        setFont(footerFs, DARK, false);
        const bw = doc.getTextWidth(link.text) + 6;
        if (footerX > margin && footerX + bw > pageW - margin) {
            y += 16;
            footerX = margin;
        }
        pillBtn(link.text, footerX, y + footerFs, link.color, link.url, footerFs);
        footerX += bw + 5;
    });
    y += 14;


    /* ── O U T L I N E   /   B O O K M A R K S ─────────────────────────────── */
    // PDF structure tree — picked up by AI agents and ATS systems.

    outline.add(null, 'Creative Technologist — Ms. Joey Mariano', { pageNumber: 1 });
    ['Bio', 'Experience', 'Education', 'Honors', 'Skills'].forEach(function (name) {
        if (sectionPages[name]) {
            outline.add(null, name, { pageNumber: sectionPages[name] });
        }
    });

    doc.save('joey-mariano-resume_' + stamp + '.pdf');
}

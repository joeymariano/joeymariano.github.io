/* ============================================================================
 *  F O O T E R   U T I L S
 *  ----------------------------------------------------------------------------
 *  Three small site-wide behaviors that the footer include is responsible for:
 *    1. Copy-card-to-clipboard button on every card
 *    2. Email obfuscation (assemble from char codes at runtime)
 *    3. Tailwind classes applied to markdown-rendered card content
 * ========================================================================== */


/* ── C O P Y   C A R D ─────────────────────────────────────────────────────── */

document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('.copy-card-btn').forEach(function (btn) {
        btn.addEventListener('click', async function () {
            const card      = btn.closest('.striped-div');
            const img       = card.querySelector('img');
            const titleEl   = card.querySelector('.card-title');
            const contentEl = card.querySelector('.card-contents');

            const imgSrc    = img ? img.src : '';
            // Inline `max-width:100%` here is correct: it goes into the clipboard payload,
            // which lands in apps that don't have our Tailwind classes available.
            const imgHtml   = imgSrc ? '<img src="' + imgSrc + '" style="max-width:100%;"><br><br>' : '';
            const titleHtml = titleEl   ? '<h2>' + titleEl.textContent.trim() + '</h2>' : '';
            const bodyHtml  = contentEl ? contentEl.innerHTML : '';
            const plainText = (titleEl   ? titleEl.textContent.trim() + '\n\n' : '') +
                              (contentEl ? contentEl.textContent.trim() : '');

            try {
                await navigator.clipboard.write([
                    new ClipboardItem({
                        'text/html':  new Blob([imgHtml + titleHtml + bodyHtml], { type: 'text/html' }),
                        'text/plain': new Blob([plainText], { type: 'text/plain' }),
                    })
                ]);

                // Flash the check icon for 1.5s, then revert to the copy icon.
                btn.querySelector('.copy-icon').classList.add('hidden');
                btn.querySelector('.check-icon').classList.remove('hidden');
                setTimeout(function () {
                    btn.querySelector('.copy-icon').classList.remove('hidden');
                    btn.querySelector('.check-icon').classList.add('hidden');
                }, 1500);
            } catch (e) {
                console.warn('Copy failed', e);
            }
        });
    });
});


/* ── E M A I L   O B F U S C A T I O N ──────────────────────────────────────
 * Built from char codes at runtime to slow down naive scrapers in the page
 * source. Wires up the contact link in the footer.
 * -------------------------------------------------------------------------- */

document.addEventListener('DOMContentLoaded', function () {
    const email = window.Site.contactEmail();

    const link = document.getElementById('email');
    if (!link) return;

    link.href = 'mailto:' + email;
    link.textContent = email;
    link.className = 'text-blue-500 hover:text-blue-300 transition duration-150';
});


/* ── M A R K D O W N   ->   T A I L W I N D   C L A S S E S ─────────────────
 * Card content is rendered from markdown, so the elements arrive without our
 * styling classes. Walk each `.card-contents` block and decorate the elements
 * inside (including the ⊕ list bullet — see note inline).
 * -------------------------------------------------------------------------- */

document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('.card-contents').forEach(function (content) {
        content.querySelectorAll('blockquote').forEach(function (el) {
            el.classList.add('border-l-4', 'border-gray-700', 'pl-4', 'italic', 'my-4', 'text-gray-300');
        });
        content.querySelectorAll('ul').forEach(function (el) {
            el.classList.add('list-disc', 'pl-6', 'my-2', 'space-y-1', 'text-gray-500', 'text-left');
        });
        content.querySelectorAll('li').forEach(function (el) {
            el.classList.add('mb-1', 'ml-2');
            // ⊕ bullet is set in JS rather than CSS because the jekyll-postcss
            // build pipeline can't handle the non-ASCII byte in style.css.
            el.setAttribute('style', "list-style-type: '⊕ ';");
        });
        content.querySelectorAll('a').forEach(function (el) {
            el.classList.add('text-blue-400', 'hover:text-blue-200', 'transition', 'duration-150');
            el.setAttribute('target', '_blank');
        });
        content.querySelectorAll('p').forEach(function (el) {
            el.classList.add('pb-4');
        });
    });
});

/* ============================================================================
 *  F L I P B O O K   P A G E - T U R N E R
 *  ----------------------------------------------------------------------------
 *  A two-image viewer: clicking prev/next plays a clip-path wipe between the
 *  current page and the next one. One engine drives every flipbook on the page
 *  (Black Book, Paintings, …) — each `[data-flipbook]` element is initialised
 *  independently, so multiple viewers coexist without colliding.
 *
 *  Markup lives in _includes/_flipbook.html; the prev/next buttons live there
 *  too. The image modal (image-modal.js) mirrors the wipe in fullscreen book
 *  mode via the shared `window.flipbookWipeImages` helper and the
 *  `flipbook:wipestart` event.
 * ========================================================================== */

(function () {
    const WIPE_MS = 400;


    /* ── W I P E   A N I M A T I O N ────────────────────────────────────────
     * Wipes any (pageImg, wipeImg) pair from current → newImgUrl using a
     * clip-path slide. Pure and instance-agnostic, so the image modal reuses it
     * on its own image elements via `window.flipbookWipeImages`.
     * ----------------------------------------------------------------------- */

    function wipeImages(pageImg, wipeImg, opts) {
        const newImgUrl = opts.newImgUrl;
        const startClip = opts.startClip;

        wipeImg.style.transition = 'none';
        wipeImg.style.opacity    = '0';
        wipeImg.style.clipPath   = startClip;
        wipeImg.src              = newImgUrl;

        // Double-RAF so the browser commits the "start" state before we start the transition.
        requestAnimationFrame(function () {
            requestAnimationFrame(function () {
                wipeImg.style.opacity    = '1';
                wipeImg.style.transition = 'clip-path ' + WIPE_MS + 'ms cubic-bezier(.77,0,.175,1)';
                wipeImg.style.clipPath   = 'inset(0 0% 0 0%)';
            });
        });

        // When the wipe finishes, swap the base image and fade the wipe layer back
        // out — but keep the (fully-revealed) wipe covering the base until the base
        // has actually decoded the new src. Otherwise the base can show the previous
        // page for a frame as the swap lands; harmless for the edge-to-edge Black
        // Book, but a visible snap for letterboxed paintings of differing shapes.
        setTimeout(function () {
            function reveal() {
                wipeImg.style.transition = 'opacity 0.01s';
                wipeImg.style.opacity    = '0';
            }
            pageImg.src = newImgUrl;
            if (pageImg.decode) pageImg.decode().then(reveal).catch(reveal);
            else reveal();
        }, WIPE_MS);
    }

    window.flipbookWipeImages = wipeImages;


    /* ── P E R - I N S T A N C E   S E T U P ────────────────────────────────
     * Each flipbook gets its own preloader, click-queue and page counter. The
     * page <img> carries the config (id, count, ext); siblings are found by id.
     * ----------------------------------------------------------------------- */

    function initFlipbook(pageImg) {
        const id    = pageImg.dataset.flipbook;
        const count = parseInt(pageImg.dataset.count, 10);
        const ext   = pageImg.dataset.ext || 'webp';

        const wipeImg  = document.getElementById(id + '-wipe');
        const prevBtn  = document.getElementById(id + '-prev');
        const nextBtn  = document.getElementById(id + '-next');
        const skeleton = document.getElementById(id + '-skeleton');

        if (!wipeImg || !prevBtn || !nextBtn || !count) return;

        // Strip the trailing "<n>.<ext>" off the rendered src to get the folder URL,
        // and read the initial page number from the same place.
        const tail    = new RegExp('(\\d+)\\.' + ext + '$');
        const match   = pageImg.src.match(tail);
        let pageNumber = match ? parseInt(match[1], 10) : 0;
        const baseUrl  = pageImg.src.replace(tail, '');


        /* ── P R E L O A D — block the nav buttons until every page is cached,
         * so the user never sees a half-loaded wipe. ─────────────────────── */

        let loadedCount = 0;

        function setButtonsDisabled(disabled) {
            // Disabled dimming is handled by Tailwind's `disabled:opacity-40` on the buttons.
            prevBtn.disabled = disabled;
            nextBtn.disabled = disabled;
        }

        setButtonsDisabled(true);

        for (let i = 0; i < count; i++) {
            const img = new window.Image();
            img.src = baseUrl + i + '.' + ext;
            img.onload = img.onerror = function () {
                loadedCount++;
                if (loadedCount === count) {
                    setButtonsDisabled(false);
                    if (skeleton) skeleton.classList.add('loaded');
                }
            };
        }


        /* ── C L I C K   Q U E U E — a single pending target accumulates clicks
         * during a wipe; when the current wipe finishes we jump straight to the
         * latest target. Lets the user skim quickly. ─────────────────────── */

        let pendingTarget = null;
        let isAnimating = false;

        function startNextWipe() {
            if (pendingTarget === null || pendingTarget === pageNumber) {
                isAnimating = false;
                pendingTarget = null;
                return;
            }

            isAnimating = true;
            const target    = pendingTarget;
            const direction = target > pageNumber ? 'next' : 'prev';
            const startClip = direction === 'next' ? 'inset(0 0% 0 100%)' : 'inset(0 100% 0 0)';
            const newImgUrl = baseUrl + target + '.' + ext;
            const detail    = { id: id, newImgUrl: newImgUrl, startClip: startClip, direction: direction, newPageNumber: target };

            // Broadcast so listeners (e.g. the image modal) can mirror the wipe.
            document.dispatchEvent(new CustomEvent('flipbook:wipestart', { detail: detail }));

            wipeImages(pageImg, wipeImg, detail);

            setTimeout(function () {
                pageNumber = target;
                startNextWipe();
            }, WIPE_MS);
        }

        function requestPage(delta) {
            const base   = pendingTarget !== null ? pendingTarget : pageNumber;
            const target = Math.max(0, Math.min(count - 1, base + delta));
            if (target === pageNumber && pendingTarget === null) return;
            pendingTarget = target;
            if (!isAnimating) startNextWipe();
        }

        prevBtn.addEventListener('click', function () { requestPage(-1); });
        nextBtn.addEventListener('click', function () { requestPage(1);  });
    }

    document.querySelectorAll('[data-flipbook]').forEach(initFlipbook);
})();

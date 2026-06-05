/* ============================================================================
 *  B L A C K   B O O K   P A G E - T U R N E R
 *  ----------------------------------------------------------------------------
 *  A two-image viewer for the sketchbook on /visual-art. Clicking prev/next
 *  plays a clip-path wipe between the current page and the next one.
 *
 *  Markup lives in _includes/_black-book.html; the prev/next buttons are
 *  defined in _layouts/visual-art.html.
 * ========================================================================== */

(function () {
    const NUM_PAGES = 40;
    const WIPE_MS   = 400;
    let pageNumber  = 13; // initial page shown on load

    const blackBookPage = document.getElementById('black-book-page');
    const blackBookWipe = document.getElementById('black-book-wipe');
    const prevBtn       = document.getElementById('prev-page');
    const nextBtn       = document.getElementById('next-page');
    const skeleton      = document.getElementById('bb-skeleton');

    if (!blackBookPage || !blackBookWipe || !prevBtn || !nextBtn) return;

    // baseUrl is rendered by Liquid from the parent include — this file is a
    // plain JS asset, so we derive it from the current page's image instead.
    const baseUrl = blackBookPage.src.replace(/\d+\.webp$/, '');


    /* ── P R E L O A D ──────────────────────────────────────────────────────
     * Block the nav buttons until every page is cached, so the user never
     * sees a half-loaded wipe.
     * ----------------------------------------------------------------------- */

    const imageCache = {};
    let loadedCount = 0;

    function setButtonsDisabled(disabled) {
        // Disabled dimming is handled by Tailwind's `disabled:opacity-40` on the buttons.
        prevBtn.disabled = disabled;
        nextBtn.disabled = disabled;
    }

    setButtonsDisabled(true);

    for (let i = 0; i < NUM_PAGES; i++) {
        const img = new window.Image();
        img.src = baseUrl + i + '.webp';
        img.onload = img.onerror = function () {
            imageCache[i] = img;
            loadedCount++;
            if (loadedCount === NUM_PAGES) {
                setButtonsDisabled(false);
                if (skeleton) skeleton.classList.add('loaded');
            }
        };
    }


    /* ── W I P E   A N I M A T I O N ────────────────────────────────────────
     * Wipes any (pageImg, wipeImg) pair from current → newImgUrl using a
     * clip-path slide. Exposed on `window` so the image modal can drive a
     * parallel wipe on its own image elements.
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

        // When the wipe finishes, swap the base image and fade the wipe layer back out.
        setTimeout(function () {
            pageImg.src = newImgUrl;
            wipeImg.style.transition = 'opacity 0.01s';
            wipeImg.style.opacity    = '0';
        }, WIPE_MS);
    }

    window.blackBookWipeImages = wipeImages;


    /* ── C L I C K   Q U E U E ──────────────────────────────────────────────
     * A single pending target accumulates clicks during a wipe — when the
     * current wipe finishes we jump straight to the latest target. Lets the
     * user skim quickly without waiting for each page individually.
     * ----------------------------------------------------------------------- */

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
        const newImgUrl = baseUrl + target + '.webp';
        const detail    = { newImgUrl: newImgUrl, startClip: startClip, direction: direction, newPageNumber: target };

        // Broadcast so listeners (e.g. the image modal) can mirror the wipe.
        document.dispatchEvent(new CustomEvent('blackbook:wipestart', { detail: detail }));

        wipeImages(blackBookPage, blackBookWipe, detail);

        setTimeout(function () {
            pageNumber = target;
            startNextWipe();
        }, WIPE_MS);
    }

    function requestPage(delta) {
        const base   = pendingTarget !== null ? pendingTarget : pageNumber;
        const target = Math.max(0, Math.min(NUM_PAGES - 1, base + delta));
        if (target === pageNumber && pendingTarget === null) return;
        pendingTarget = target;
        if (!isAnimating) startNextWipe();
    }

    prevBtn.addEventListener('click', function () { requestPage(-1); });
    nextBtn.addEventListener('click', function () { requestPage(1);  });
})();

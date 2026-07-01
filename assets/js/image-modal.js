/* ============================================================================
 *  I M A G E   M O D A L
 *  ----------------------------------------------------------------------------
 *  Click any card image (or a flipbook page) to open an expanded view with
 *  optional audio mirror and flipbook page-turn controls (book mode).
 *
 *  Markup lives in _includes/_footer.html (#image-modal and friends).
 * ========================================================================== */

document.addEventListener('DOMContentLoaded', function () {
    const Site      = window.Site;
    const modal     = document.getElementById('image-modal');
    const modalImg  = document.getElementById('image-modal-img');
    const modalWipe = document.getElementById('image-modal-wipe');
    const controls  = document.getElementById('image-modal-controls');
    const closeBtn  = document.getElementById('image-modal-close');
    const modalVideo = document.getElementById('image-modal-video');
    if (!modal || !modalImg || !closeBtn) return;


    /* ── M U S I C   P L A Y E R   M I R R O R ──────────────────────────────
     * The modal can host a clone of a card's <audio> control bar.  Audio is
     * not duplicated — we bind to the original element so playback continues
     * uninterrupted when the modal closes.
     * ----------------------------------------------------------------------- */

    const musicBar       = document.getElementById('image-modal-music');
    const musicPlay      = document.getElementById('image-modal-music-playpause');
    const musicSeek      = document.getElementById('image-modal-music-seekbar');
    const musicTime      = document.getElementById('image-modal-music-time');
    const musicPlayIcon  = musicPlay ? musicPlay.querySelector('.image-modal-play-icon')  : null;
    const musicPauseIcon = musicPlay ? musicPlay.querySelector('.image-modal-pause-icon') : null;

    let detachAudio = null;

    function unbindAudio() {
        if (detachAudio) detachAudio();
        detachAudio = null;
        if (musicBar) musicBar.classList.add('hidden');
        modal.classList.remove('has-music');
    }

    // Mirror a card's <audio> onto the modal's bar via the shared controller.
    // No need to stop other tracks here: the single-track invariant in scripts.js
    // (a `play` listener on every audio) pauses every other one the moment this
    // starts, so the modal can never leave another song playing under it.
    function bindAudio(audio) {
        unbindAudio();
        if (!audio || !musicBar || !musicPlay || !musicSeek || !musicTime) return;
        modal.classList.add('has-music');
        detachAudio = Site.bindAudioControls(audio, {
            playPause: musicPlay,
            seekbar:   musicSeek,
            timeLabel: musicTime,
            playIcon:  musicPlayIcon,
            pauseIcon: musicPauseIcon,
        });
        musicBar.classList.remove('hidden');
    }


    /* ── B O O K   M O D E ──────────────────────────────────────────────────
     * When a flipbook page image opens, temporarily move that flipbook's
     * prev/next buttons into the modal's control cluster, then return them on
     * close. `activeFlipbook` tracks which instance (Black Book, Paintings, …)
     * is open so the wipe mirror and tap zones target the right one.
     * ----------------------------------------------------------------------- */

    let bookMode = false;
    let buttonsHome = null;
    let activeFlipbook = null;
    let bookAspect = null;   // width/height of the open flipbook's frame

    // "2500/1817" → 1.3758, "1/1" → 1. Falls back to square on bad input.
    function parseAspect(str) {
        const parts = (str || '').split('/');
        const w = parseFloat(parts[0]);
        const h = parseFloat(parts[1]);
        return (w && h) ? w / h : 1;
    }

    function enterBookMode(flipbookId) {
        const prevBtn = document.getElementById(flipbookId + '-prev');
        const nextBtn = document.getElementById(flipbookId + '-next');
        const pageImg = document.getElementById(flipbookId + '-page');
        if (!prevBtn || !nextBtn || !controls) return;
        bookMode = true;
        activeFlipbook = flipbookId;
        bookAspect = parseAspect(pageImg && pageImg.dataset.aspect);
        // Book mode mirrors the inline viewer: a fixed frame at the flipbook's
        // aspect ratio with the page letterboxed inside (object-contain). The box
        // never resizes per page, so turning to a differently-shaped painting
        // can't snap or distort — it just re-letterboxes. Both image layers fit.
        modalImg.style.objectFit  = 'contain';
        if (modalWipe) modalWipe.style.objectFit = 'contain';
        buttonsHome = prevBtn.parentElement;
        // Order in the modal: prev, next, X — insert each before the close button.
        controls.insertBefore(prevBtn, closeBtn);
        controls.insertBefore(nextBtn, closeBtn);
    }

    function exitBookMode() {
        if (!bookMode) return;
        const prevBtn = document.getElementById(activeFlipbook + '-prev');
        const nextBtn = document.getElementById(activeFlipbook + '-next');
        if (buttonsHome && prevBtn && nextBtn) {
            buttonsHome.appendChild(prevBtn);
            buttonsHome.appendChild(nextBtn);
        }
        // Restore size-to-image behaviour for card images.
        modalImg.style.objectFit = '';
        if (modalWipe) modalWipe.style.objectFit = '';
        bookMode = false;
        buttonsHome = null;
        activeFlipbook = null;
        bookAspect = null;
    }


    /* ── S I Z I N G   +   C O R N E R   R A D I U S ──────────────────────── */

    // Fit the image inside the modal's padded box while preserving aspect ratio.
    // We measure the modal element itself (position:fixed; inset-0) rather than
    // window.innerWidth/innerHeight: on mobile the window dimensions track the
    // *visual* viewport, which jumps when the URL bar shows/hides — that made the
    // image expand and jump right after a page-turn wipe. The fixed modal box
    // tracks the stable layout viewport instead. Subtracting the real padding
    // also keeps the computed size from exceeding the content area (which would
    // otherwise get clamped by `max-width:100%` and distort the aspect ratio).
    function fitTo(el, nw, nh, vector) {
        if (!nw || !nh) { nw = nh = 1; } // unknown intrinsic dims → square fallback
        const cs   = getComputedStyle(modal);
        const padX = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight);
        const padY = parseFloat(cs.paddingTop)  + parseFloat(cs.paddingBottom);
        const vw = modal.clientWidth  - padX;
        const vh = modal.clientHeight - padY;
        const ratio = nw / nh;
        let w, h;
        if (vw / ratio <= vh) { w = vw; h = vw / ratio; }
        else                  { h = vh; w = vh * ratio; }
        // Don't upscale past the source resolution — enlarging media beyond its
        // natural pixels just makes it blurry. Cap to 100% and let it sit centered.
        // (Skipped when natural dims are unknown, which read as the 1×1 fallback.)
        // Vector sources (SVG) scale without blur, so let them fill the box: an SVG
        // with a viewBox reports its viewBox size as naturalWidth/Height (e.g. 128px
        // pixel art), which would otherwise clamp the modal image down to that size.
        if (!vector && nw > 1 && w > nw) { w = nw; h = nh; }
        el.style.width  = w + 'px';
        el.style.height = h + 'px';
    }

    // SVGs are vector; match .svg before any query string or fragment.
    function isSvgSrc(src) { return /\.svg(\?|#|$)/i.test(src || ''); }

    function fitImage() {
        fitTo(modalImg, modalImg.naturalWidth, modalImg.naturalHeight,
              isSvgSrc(modalImg.currentSrc || modalImg.src));
    }
    function fitVideo() { fitTo(modalVideo, modalVideo.videoWidth, modalVideo.videoHeight); }

    // Book mode: size the frame to the flipbook's aspect ratio (not the current
    // image's), so the box is constant across page turns. `vector: true` lets it
    // fill the viewport regardless of any single page's pixel size — object-contain
    // preserves each page's own aspect within the fixed box.
    function fitBookBox() {
        fitTo(modalImg, bookAspect, 1, true);
    }

    // Mirror the source image's rounded-X class onto the modal image so the
    // modal matches the card's corner radius (full-round vs 3xl, etc).
    function setRoundClass(el, roundClass) {
        Array.from(el.classList).forEach(function (c) {
            if (c.indexOf('rounded-') === 0) el.classList.remove(c);
        });
        el.classList.add(roundClass);
    }

    function getRoundClass(img) {
        for (var i = 0; i < img.classList.length; i++) {
            var c = img.classList[i];
            if (c.indexOf('rounded-') === 0) return c;
        }
        return 'rounded-3xl';
    }


    /* ── O P E N   /   C L O S E ───────────────────────────────────────────── */

    // Stop and detach the modal video, returning the modal to image mode.
    function hideModalVideo() {
        if (!modalVideo) return;
        modalVideo.pause();
        modalVideo.removeAttribute('src');
        modalVideo.load();           // release the buffered media
        modalVideo.classList.add('hidden');
        modalImg.classList.remove('hidden');
    }

    // Flip the modal into its open state (shared by image + video opens).
    function showModal() {
        modal.classList.remove('is-closing');
        modal.classList.add('is-open');
        modal.setAttribute('aria-hidden', 'false');
        document.body.classList.add('modal-open');
    }

    // Open a card's <video> in the modal (muted, looping, capped at 100%).
    function openModalVideo(src, label, roundClass) {
        if (!modalVideo) return;
        unbindAudio();               // videos carry no audio mirror
        setRoundClass(modalVideo, roundClass);
        modalImg.classList.add('hidden');
        modalVideo.classList.remove('hidden');
        modalVideo.setAttribute('aria-label', label || '');
        modalVideo.src = src;

        showModal();

        modalVideo.play().catch(function () { /* autoplay may be deferred */ });
        if (modalVideo.videoWidth) fitVideo();
        else modalVideo.addEventListener('loadedmetadata', fitVideo, { once: true });

        trapFocus();
    }

    function openModal(src, alt, roundClass, flipbookId, audio) {
        hideModalVideo();
        setRoundClass(modalImg, roundClass);
        if (modalWipe) setRoundClass(modalWipe, roundClass);

        modalImg.src = src;
        modalImg.alt = alt || '';

        if (flipbookId) enterBookMode(flipbookId);

        // Mirror the source card's audio (or hide the bar if none).
        if (audio) bindAudio(audio);
        else       unbindAudio();

        showModal();

        // Book mode uses a fixed aspect-ratio frame (constant across page turns);
        // card images size the box to the image itself.
        if (bookMode) {
            fitBookBox();
        } else if (modalImg.complete && modalImg.naturalWidth) {
            fitImage();
        } else {
            modalImg.addEventListener('load', fitImage, { once: true });
        }

        // a11y: capture previous focus, then trap focus inside the modal.
        trapFocus();
    }

    function closeModal() {
        exitBookMode();
        releaseFocus();

        // Swap to the closing state in one tick: the X spins out (~0.2s), then the
        // modal wipes back up (CSS delays the clip-path transition so the X goes first).
        modal.classList.remove('is-open');
        modal.classList.add('is-closing');
        modal.setAttribute('aria-hidden', 'true');
        document.body.classList.remove('modal-open');

        if (modalVideo) modalVideo.pause(); // stop playback as the modal wipes away

        // After the wipe finishes: detach the audio mirror (music keeps playing in
        // the source card), reset state, clear the src. Deferred so the player bar
        // stays visible and updating while the modal wipes away, instead of popping
        // out instantly. The wait is the CSS close transition itself (duration +
        // delay), read from the element now that `is-closing` is applied — no
        // hard-coded ms to keep in sync. Reduced-motion sets transition:none → 0ms.
        const closeMs = Site.transitionMs(modal);
        setTimeout(function () {
            if (modal.classList.contains('is-open')) return; // reopened mid-close
            unbindAudio();
            hideModalVideo();
            modal.classList.remove('is-closing');
            modalImg.src = '';
        }, closeMs);
    }


    /* ── T R I G G E R S   ( click any card image to open ) ──────────────── */

    // `cursor-zoom-in` lives on the image markup; the a11y/click wiring needs JS.
    document.querySelectorAll('.striped-div img, .flipbook-page').forEach(function (img) {
        Site.makeActivatable(img, 'Open expanded view: ' + (img.alt || 'image'), function () {
            const card = img.closest('.striped-div');
            const cardAudio = card ? card.querySelector('.audio') : null;
            openModal(img.src, img.alt, getRoundClass(img), img.dataset.flipbook, cardAudio);
        });
    });

    // Card <video>s open in the modal too (e.g. the live-visuals card).
    document.querySelectorAll('.striped-div video').forEach(function (vid) {
        vid.classList.add('cursor-zoom-in');
        Site.makeActivatable(vid, 'Open expanded view: video', function () {
            openModalVideo(vid.currentSrc || vid.src, vid.getAttribute('aria-label'), getRoundClass(vid));
        });
    });


    /* ── F O C U S   T R A P ────────────────────────────────────────────────
     * Delegated to the shared Site.trapFocus. The only modal-specific rule is
     * skipping the music bar's controls while it's hidden — passed as a filter.
     * ----------------------------------------------------------------------- */

    let releaseModalFocus = null;

    function trapFocus() {
        releaseModalFocus = Site.trapFocus(modal, {
            initialFocus: closeBtn,
            filter: function (el) {
                const inMusic = el.closest('#image-modal-music');
                return !(inMusic && inMusic.classList.contains('hidden'));
            },
        });
    }

    function releaseFocus() {
        if (releaseModalFocus) { releaseModalFocus(); releaseModalFocus = null; }
    }


    /* ── F L I P B O O K   W I P E   M I R R O R ─────────────────────────────
     * When the open flipbook turns a page, mirror the wipe on the modal image.
     * Ignore events from other flipbook instances on the page.
     * ----------------------------------------------------------------------- */

    document.addEventListener('flipbook:wipestart', function (e) {
        if (!bookMode || e.detail.id !== activeFlipbook) return;
        if (!modal.classList.contains('is-open')) return;
        if (typeof window.flipbookWipeImages === 'function' && modalWipe) {
            window.flipbookWipeImages(modalImg, modalWipe, e.detail);
        }
    });


    /* ── B O O K - M O D E   T A P   Z O N E S ───────────────────────────────
     * In book mode, the left half of the modal image acts as prev and the right
     * half as next. We forward to the open flipbook's prev/next buttons so the
     * wipe, click-queue, and all page-turn logic stay exactly as-is. Only active
     * while a flipbook is open; otherwise clicking the image does nothing.
     * ----------------------------------------------------------------------- */

    modalImg.addEventListener('click', function (e) {
        if (!bookMode) return;
        const rect = modalImg.getBoundingClientRect();
        const onLeft = (e.clientX - rect.left) < rect.width / 2;
        const btn = document.getElementById(activeFlipbook + (onLeft ? '-prev' : '-next'));
        if (btn) btn.click();
    });


    /* ── G L O B A L   L I S T E N E R S ────────────────────────────────── */

    window.addEventListener('resize', function () {
        if (!modal.classList.contains('is-open')) return;
        if (modalVideo && !modalVideo.classList.contains('hidden')) fitVideo();
        else if (bookMode) fitBookBox();
        else fitImage();
    });

    closeBtn.addEventListener('click', closeModal);
    modal.addEventListener('click', function (e) {
        if (e.target === modal) closeModal();
    });
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && modal.classList.contains('is-open')) closeModal();
    });
});

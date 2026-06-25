/* ============================================================================
 *  I M A G E   M O D A L
 *  ----------------------------------------------------------------------------
 *  Click any card image (or the Black Book page) to open an expanded view
 *  with optional audio mirror and Black-Book page-turn controls.
 *
 *  Markup lives in _includes/_footer.html (#image-modal and friends).
 * ========================================================================== */

document.addEventListener('DOMContentLoaded', function () {
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

    let boundAudio = null;
    let boundListeners = null;

    function unbindAudio() {
        if (boundAudio && boundListeners) {
            boundAudio.removeEventListener('play',       boundListeners.onPlay);
            boundAudio.removeEventListener('pause',      boundListeners.onPause);
            boundAudio.removeEventListener('timeupdate', boundListeners.onTime);
        }
        boundAudio = null;
        boundListeners = null;
        if (musicBar) musicBar.classList.add('hidden');
        modal.classList.remove('has-music');
    }

    function bindAudio(audio) {
        unbindAudio();
        if (!audio || !musicBar || !musicPlay || !musicSeek || !musicTime) return;

        boundAudio = audio;
        modal.classList.add('has-music');

        function updateIcons() {
            if (audio.paused) {
                musicPlayIcon.classList.remove('hidden');
                musicPauseIcon.classList.add('hidden');
                musicPlay.setAttribute('aria-label', 'Play');
            } else {
                musicPlayIcon.classList.add('hidden');
                musicPauseIcon.classList.remove('hidden');
                musicPlay.setAttribute('aria-label', 'Pause');
            }
        }

        function updateTime() {
            musicSeek.value = (audio.currentTime / audio.duration) * 100 || 0;
            const m = Math.floor(audio.currentTime / 60);
            const s = Math.floor(audio.currentTime % 60).toString().padStart(2, '0');
            musicTime.textContent = m + ':' + s;
        }

        updateIcons();
        updateTime();
        audio.addEventListener('play',       updateIcons);
        audio.addEventListener('pause',      updateIcons);
        audio.addEventListener('timeupdate', updateTime);
        boundListeners = { onPlay: updateIcons, onPause: updateIcons, onTime: updateTime };
        musicBar.classList.remove('hidden');
    }

    if (musicPlay) musicPlay.addEventListener('click', function () {
        if (!boundAudio) return;
        // Just toggle. The single-track invariant in scripts.js (an `play`
        // listener on every audio) pauses every other track the moment this
        // one starts, so the modal can never leave another song playing under it.
        if (boundAudio.paused) boundAudio.play();
        else                   boundAudio.pause();
    });

    if (musicSeek) musicSeek.addEventListener('input', function () {
        if (!boundAudio || !boundAudio.duration) return;
        boundAudio.currentTime = (musicSeek.value / 100) * boundAudio.duration;
    });


    /* ── B O O K   M O D E ──────────────────────────────────────────────────
     * When the Black Book page image opens, temporarily move its prev/next
     * buttons into the modal's control cluster, then return them on close.
     * ----------------------------------------------------------------------- */

    let bookMode = false;
    let buttonsHome = null;

    function enterBookMode() {
        const prevBtn = document.getElementById('prev-page');
        const nextBtn = document.getElementById('next-page');
        if (!prevBtn || !nextBtn || !controls) return;
        bookMode = true;
        buttonsHome = prevBtn.parentElement;
        // Order in the modal: prev, next, X — insert each before the close button.
        controls.insertBefore(prevBtn, closeBtn);
        controls.insertBefore(nextBtn, closeBtn);
    }

    function exitBookMode() {
        if (!bookMode) return;
        const prevBtn = document.getElementById('prev-page');
        const nextBtn = document.getElementById('next-page');
        if (buttonsHome && prevBtn && nextBtn) {
            buttonsHome.appendChild(prevBtn);
            buttonsHome.appendChild(nextBtn);
        }
        bookMode = false;
        buttonsHome = null;
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

    // Open a card's <video> in the modal (muted, looping, capped at 100%).
    function openModalVideo(src, label, roundClass) {
        if (!modalVideo) return;
        unbindAudio();               // videos carry no audio mirror
        setRoundClass(modalVideo, roundClass);
        modalImg.classList.add('hidden');
        modalVideo.classList.remove('hidden');
        modalVideo.setAttribute('aria-label', label || '');
        modalVideo.src = src;

        modal.classList.remove('is-closing');
        modal.classList.add('is-open');
        modal.setAttribute('aria-hidden', 'false');
        document.body.classList.add('modal-open');

        modalVideo.play().catch(function () { /* autoplay may be deferred */ });
        if (modalVideo.videoWidth) fitVideo();
        else modalVideo.addEventListener('loadedmetadata', fitVideo, { once: true });

        trapFocus();
    }

    function openModal(src, alt, roundClass, isBookMode, audio) {
        hideModalVideo();
        setRoundClass(modalImg, roundClass);
        if (modalWipe) setRoundClass(modalWipe, roundClass);

        modalImg.src = src;
        modalImg.alt = alt || '';

        if (isBookMode) enterBookMode();

        // Mirror the source card's audio (or hide the bar if none).
        if (audio) bindAudio(audio);
        else       unbindAudio();

        modal.classList.remove('is-closing');
        modal.classList.add('is-open');
        modal.setAttribute('aria-hidden', 'false');
        document.body.classList.add('modal-open');

        if (modalImg.complete && modalImg.naturalWidth) fitImage();
        else modalImg.addEventListener('load', fitImage, { once: true });

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

        // After the full X-out + wipe sequence (~0.5s): detach the audio mirror
        // (music keeps playing in the source card), reset state, clear the src.
        // unbindAudio is deferred to here so the player bar stays visible and keeps
        // updating while the modal wipes away, instead of popping out instantly.
        setTimeout(function () {
            if (modal.classList.contains('is-open')) return; // reopened mid-close
            unbindAudio();
            hideModalVideo();
            modal.classList.remove('is-closing');
            modalImg.src = '';
        }, 500);
    }


    /* ── T R I G G E R S   ( click any card image to open ) ──────────────── */

    document.querySelectorAll('.striped-div img, #black-book-page').forEach(function (img) {
        // `cursor-zoom-in` lives on the image markup; a11y wiring stays here since it needs JS.
        img.setAttribute('tabindex', '0');
        img.setAttribute('role', 'button');
        if (!img.getAttribute('aria-label')) {
            img.setAttribute('aria-label', 'Open expanded view: ' + (img.alt || 'image'));
        }

        img.addEventListener('click', function () {
            const card = img.closest('.striped-div');
            const cardAudio = card ? card.querySelector('.audio') : null;
            openModal(img.src, img.alt, getRoundClass(img), img.id === 'black-book-page', cardAudio);
        });

        img.addEventListener('keydown', function (e) {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                img.click();
            }
        });
    });

    // Card <video>s open in the modal too (e.g. the live-visuals card).
    document.querySelectorAll('.striped-div video').forEach(function (vid) {
        vid.classList.add('cursor-zoom-in');
        vid.setAttribute('tabindex', '0');
        vid.setAttribute('role', 'button');
        if (!vid.getAttribute('aria-label')) {
            vid.setAttribute('aria-label', 'Open expanded view: video');
        }

        vid.addEventListener('click', function () {
            openModalVideo(vid.currentSrc || vid.src, vid.getAttribute('aria-label'), getRoundClass(vid));
        });

        vid.addEventListener('keydown', function (e) {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                vid.click();
            }
        });
    });


    /* ── F O C U S   T R A P ────────────────────────────────────────────────
     * Keep keyboard focus inside the modal while open; remember where focus
     * was before we opened so we can restore it on close.
     * ----------------------------------------------------------------------- */

    let prevFocus = null;
    let trapHandler = null;

    function focusablesInModal() {
        return Array.from(modal.querySelectorAll(
            'button:not([disabled]), [href], input:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )).filter(function (el) {
            const inMusic = el.closest('#image-modal-music');
            if (inMusic && inMusic.classList.contains('hidden')) return false;
            return true;
        });
    }

    function trapFocus() {
        prevFocus = document.activeElement;
        trapHandler = function (e) {
            if (e.key !== 'Tab') return;
            const items = focusablesInModal();
            if (!items.length) return;
            const first = items[0];
            const last  = items[items.length - 1];
            if (e.shiftKey && document.activeElement === first) {
                e.preventDefault();
                last.focus();
            } else if (!e.shiftKey && document.activeElement === last) {
                e.preventDefault();
                first.focus();
            }
        };
        modal.addEventListener('keydown', trapHandler);
        try { closeBtn.focus(); } catch (e) { /* ignore */ }
    }

    function releaseFocus() {
        if (trapHandler) {
            modal.removeEventListener('keydown', trapHandler);
            trapHandler = null;
        }
        const target = prevFocus;
        prevFocus = null;
        if (target && typeof target.focus === 'function') {
            try { target.focus(); } catch (e) { /* ignore */ }
        }
    }


    /* ── B L A C K - B O O K   W I P E   M I R R O R ─────────────────────────
     * When the Black Book turns a page, broadcast the wipe so the modal can
     * play the same animation on its own image.
     * ----------------------------------------------------------------------- */

    document.addEventListener('blackbook:wipestart', function (e) {
        if (!bookMode || !modal.classList.contains('is-open')) return;
        if (typeof window.blackBookWipeImages === 'function' && modalWipe) {
            window.blackBookWipeImages(modalImg, modalWipe, e.detail);
        }
    });


    /* ── B O O K - M O D E   T A P   Z O N E S ───────────────────────────────
     * In book mode, the left half of the modal image acts as prev and the right
     * half as next. We forward to the existing prev/next buttons so the wipe,
     * click-queue, and all page-turn logic stay exactly as-is. Only active while
     * the Black Book is open; otherwise clicking the image does nothing.
     * ----------------------------------------------------------------------- */

    modalImg.addEventListener('click', function (e) {
        if (!bookMode) return;
        const rect = modalImg.getBoundingClientRect();
        const onLeft = (e.clientX - rect.left) < rect.width / 2;
        const btn = document.getElementById(onLeft ? 'prev-page' : 'next-page');
        if (btn) btn.click();
    });


    /* ── G L O B A L   L I S T E N E R S ────────────────────────────────── */

    window.addEventListener('resize', function () {
        if (!modal.classList.contains('is-open')) return;
        if (modalVideo && !modalVideo.classList.contains('hidden')) fitVideo();
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

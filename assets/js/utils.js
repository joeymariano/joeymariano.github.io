/* ============================================================================
 *  S I T E   U T I L S   ( window.Site )
 *  ----------------------------------------------------------------------------
 *  Small shared helpers used across the site's scripts. There's no bundler —
 *  files are served raw — so this is a plain global namespace (mirroring the
 *  existing window.blackBookWipeImages bridge). It's loaded in _head.html just
 *  before scripts.js, so every later script (deferred or not) can rely on it.
 *
 *  Consumers alias it once at the top of their scope:  const Site = window.Site;
 * ========================================================================== */
(function () {
    'use strict';

    /* ── T I M E ───────────────────────────────────────────────────────────── */

    // Seconds → "m:ss" (e.g. 75 → "1:15"). NaN/undefined read as 0:00.
    function formatTime(seconds) {
        const s = Math.max(0, Math.floor(seconds || 0));
        return Math.floor(s / 60) + ':' + (s % 60).toString().padStart(2, '0');
    }


    /* ── A U D I O   C O N T R O L S ────────────────────────────────────────
     * Wire one <audio> to a play/pause button, seekbar and time label. Used by
     * the per-card players (scripts.js) and the modal's mirrored bar
     * (image-modal.js). Returns a detach() that removes every listener it added
     * — the modal re-binds as it opens different cards, so it needs a clean
     * teardown; the static card players simply ignore the return value.
     *
     * els: { playPause, seekbar, timeLabel, playIcon, pauseIcon }
     * ----------------------------------------------------------------------- */

    function bindAudioControls(audio, els) {
        const playPause = els.playPause, seekbar = els.seekbar, timeLabel = els.timeLabel,
              playIcon  = els.playIcon,  pauseIcon = els.pauseIcon;
        if (!audio || !playPause || !seekbar || !timeLabel || !playIcon || !pauseIcon) {
            return function () {};
        }

        function updateIcons() {
            const playing = !audio.paused;
            playIcon.classList.toggle('hidden', playing);
            pauseIcon.classList.toggle('hidden', !playing);
            playPause.setAttribute('aria-label', playing ? 'Pause' : 'Play');
        }

        function updateTime() {
            seekbar.value = (audio.currentTime / audio.duration) * 100 || 0;
            timeLabel.textContent = formatTime(audio.currentTime);
        }

        function onPlayPause() {
            if (audio.paused) audio.play();
            else              audio.pause();
        }

        function onSeek() {
            if (audio.duration) audio.currentTime = (seekbar.value / 100) * audio.duration;
        }

        updateIcons();
        updateTime();
        audio.addEventListener('play',       updateIcons);
        audio.addEventListener('pause',      updateIcons);
        audio.addEventListener('timeupdate', updateTime);
        playPause.addEventListener('click',  onPlayPause);
        seekbar.addEventListener('input',    onSeek);

        return function detach() {
            audio.removeEventListener('play',       updateIcons);
            audio.removeEventListener('pause',      updateIcons);
            audio.removeEventListener('timeupdate', updateTime);
            playPause.removeEventListener('click',  onPlayPause);
            seekbar.removeEventListener('input',    onSeek);
        };
    }


    /* ── A 1 1 Y :   M A K E   A C T I V A T A B L E ────────────────────────
     * Turn a non-button element (img, video, …) into a keyboard-operable
     * button: focusable, announced as a button, and triggered by Enter/Space
     * as well as click. aria-label is only set if one isn't already present.
     * ----------------------------------------------------------------------- */

    function makeActivatable(el, label, onActivate) {
        if (!el) return;
        el.setAttribute('tabindex', '0');
        el.setAttribute('role', 'button');
        if (!el.getAttribute('aria-label')) el.setAttribute('aria-label', label || '');
        el.addEventListener('click', onActivate);
        el.addEventListener('keydown', function (e) {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                el.click();
            }
        });
    }


    /* ── O N C E   I N   V I E W ─────────────────────────────────────────────
     * Run callback the first time el scrolls into view, then stop observing.
     * Falls back to running immediately where IntersectionObserver is missing.
     * ----------------------------------------------------------------------- */

    function onceInView(el, callback, options) {
        if (!el) return;
        if (!('IntersectionObserver' in window)) { callback(); return; }
        const io = new IntersectionObserver(function (entries, obs) {
            if (entries[0].isIntersecting) { obs.disconnect(); callback(); }
        }, options);
        io.observe(el);
    }


    /* ── C O N T A C T   E M A I L ───────────────────────────────────────────
     * Assembled from char codes at call time to slow down naive scrapers that
     * read the page/source. Single source of truth for joey@joeymariano.com.
     * ----------------------------------------------------------------------- */

    function contactEmail() {
        return String.fromCharCode(
            106, 111, 101, 121,               // 'joey'
            64,                               // '@'
            106, 111, 101, 121,               // 'joey'
            109, 97, 114, 105, 97, 110, 111,  // 'mariano'
            46,                               // '.'
            99, 111, 109                      // 'com'
        );
    }


    window.Site = {
        formatTime: formatTime,
        bindAudioControls: bindAudioControls,
        makeActivatable: makeActivatable,
        onceInView: onceInView,
        contactEmail: contactEmail,
    };
})();

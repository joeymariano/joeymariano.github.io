document.addEventListener('DOMContentLoaded', () => {
    const Site = window.Site;

    // A 1 1 Y // — make the skip-link target programmatically focusable
    const fadeContent = document.getElementById('fadeContent');
    if (fadeContent && !fadeContent.hasAttribute('tabindex')) {
        fadeContent.setAttribute('tabindex', '-1');
    }

    // M E N U //
    const menuBtn = document.getElementById('menu-btn');
    const menu = document.getElementById('menu');

    menuBtn.addEventListener('click', function() {
        if (menu.classList.contains('show')) {
            menu.classList.remove('show');
            menuBtn.classList.remove('is-open');
            // Defer `hidden` until the collapse transition finishes. The duration
            // is read from the CSS at click time (it's viewport-dependent — only
            // the mobile breakpoint animates #menu), so there's no JS-side number
            // to keep in sync with the stylesheet.
            setTimeout(() => menu.classList.add('hidden'), Site.transitionMs(menu));
        } else {
            menu.classList.remove('hidden');
            menuBtn.classList.add('is-open');
            setTimeout(() => menu.classList.add('show'));
        }
    });
    
    // C O N T A C T  L I N K //
    const contactNavLink = document.getElementById('contact-nav-link');

    if (contactNavLink) {
        contactNavLink.addEventListener('click', function(e) {
            e.preventDefault();
            const footer = document.querySelector('footer');
            const contactSpan = document.getElementById('contact-blink');
            // Scroll to the very bottom of the page (where the contact info sits),
            // not just the footer's top edge. Mirrors the top-button's scrollTo.
            window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' });

            // wait until footer is fully in view before triggering animation
            Site.onceInView(footer, () => {
                if (!contactSpan) return;
                contactSpan.classList.remove('contact-blink');
                void contactSpan.offsetWidth; // force reflow to restart animation
                contactSpan.classList.add('contact-blink');
                // Drop the class when the CSS glow finishes — no duration to track.
                contactSpan.addEventListener('animationend',
                    () => contactSpan.classList.remove('contact-blink'), { once: true });
            }, { threshold: 0.9 });
        });
    }

    // T O P  B U T T O N //
    const topButton = document.getElementById('top-button');
    if (topButton) {
        topButton.addEventListener('click', () => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }
    
    
    // A U D I O -- P L A Y E R //
    const audios = document.getElementsByClassName('audio');

    // Each player finds its own controls within its .media-controller, so a
    // player never depends on the DOM order of six parallel class collections.
    // Empty HTMLCollection is fine — the loop just no-ops.
    for (const audio of audios) {
        const ctrl = audio.closest('.media-controller');
        if (!ctrl) continue;
        const playPause   = ctrl.querySelector('.playPause');
        const seekbar     = ctrl.querySelector('.seekbar');
        const currentTime = ctrl.querySelector('.currentTime');
        const playIcon    = ctrl.querySelector('.playIcon');
        const pauseIcon   = ctrl.querySelector('.pauseIcon');

        if (playPause && seekbar && currentTime && playIcon && pauseIcon) {
            // Card players live for the page lifetime, so the detach() is ignored.
            Site.bindAudioControls(audio, {
                playPause, seekbar, timeLabel: currentTime, playIcon, pauseIcon,
            });
        }
    }

    // S I N G L E - T R A C K  I N V A R I A N T //
    // The one rule that guarantees "never more than one song at a time": the
    // instant ANY audio starts, pause and rewind every other one. Every play
    // trigger — card buttons, the image modal's mirrored controls, anything
    // added later — funnels through the element's own `play` event, so no
    // single trigger has to remember to stop the others, and none can leave
    // two tracks overlapping.
    for (let i = 0; i < audios.length; i++) {
        audios[i].addEventListener('play', () => {
            for (let j = 0; j < audios.length; j++) {
                if (audios[j] !== audios[i]) {
                    audios[j].pause();
                    audios[j].currentTime = 0;
                }
            }
        });
    }

    
    // E X P E R I E N C E  U I //
    const jobBtnBack = document.getElementById('job-btn-back');
    const jobBtnForward = document.getElementById('job-btn-forward');
    const jobScroller = document.getElementById('job-scroller');
    let previousOrder = [];

    const SCROLL_THROTTLE_MS = 500;

    if (jobBtnBack && jobScroller) {
        jobBtnBack.addEventListener('click', throttle(() => snapJobScroller(-1), SCROLL_THROTTLE_MS));
    }

    if (jobBtnForward && jobScroller) {
        jobBtnForward.addEventListener('click', throttle(() => snapJobScroller(1), SCROLL_THROTTLE_MS));
    }

    // Leading-edge throttle: fires once, then ignores calls within `delay` ms.
    function throttle(fn, delay) {
        let lastCall = 0;
        return function(...args) {
            const now = Date.now();
            if (now - lastCall < delay) return;
            lastCall = now;
            fn.apply(this, args);
        };
    }
    
    function getJobEntryWidth() {
        const jobEntry = jobScroller ? jobScroller.querySelector('.job-entry') : null;
        if (jobEntry) return jobEntry.offsetWidth;
        return window.innerWidth / 4;
    }

    function getSnappedScrollLeft(direction = 0) {
        if (!jobScroller) return 0;
        const jobWidth = getJobEntryWidth();
        let snapIndex = Math.round(jobScroller.scrollLeft / jobWidth);
        if (direction === -1) snapIndex = Math.max(0, snapIndex - 1);
        if (direction === 1)  snapIndex = snapIndex + 1;
        return snapIndex * jobWidth;
    }

    function snapJobScroller(direction = 0) {
        if (!jobScroller) return;
        jobScroller.scrollTo({ left: getSnappedScrollLeft(direction), behavior: 'smooth' });
    }
    
    
    // S K I L L  S O R T I N G //
    const skillDivs = document.querySelectorAll('[data-category]');
    const buttons = [
        { id: 'randomButton', category: 'random' },
        { id: 'techButton', category: 'tech' },
        { id: 'artsButton', category: 'arts' },
        { id: 'miscButton', category: 'misc' },
    ];

    buttons.forEach(btn => {
        const button = document.getElementById(btn.id);
        if (button) {
            button.addEventListener('click', function() {
                const container = document.getElementById('skills-container');
                flipReorder(container, () => {
                    if (btn.id === 'randomButton') {
                        skillDivs.forEach(div => div.style.display = '');
                        const arr = Array.from(skillDivs);
                        if (previousOrder.length === 0) previousOrder = arr.slice();
                        getDerangement(previousOrder).forEach(div => container.appendChild(div));
                    } else {
                        showSkillsByCategory(btn.category);
                    }
                });
            });
        }
    });

    // FLIP: keep tiles visible and glide them from old to new positions on reorder
    function flipReorder(container, reorderFn) {
        const items = Array.from(container.children);
        const before = new Map();
        items.forEach(el => before.set(el, el.getBoundingClientRect()));
        reorderFn();
        items.forEach(el => {
            const b = before.get(el);
            const a = el.getBoundingClientRect();
            const dx = b.left - a.left;
            const dy = b.top - a.top;
            if (dx === 0 && dy === 0) return;
            el.style.transition = 'none';
            el.style.transform = `translate(${dx}px, ${dy}px)`;
        });
        void container.offsetWidth; // force reflow before starting the transition
        items.forEach(el => {
            el.style.transition = 'transform 750ms cubic-bezier(0.2, 0.7, 0.2, 1)';
            el.style.transform = '';
        });
    }

    showAllSkills();

    function showAllSkills() {
        skillDivs.forEach(div => div.style.display = '');
    }

    function showSkillsByCategory(category) {
        const container = document.getElementById('skills-container');
        const categorized = [];
        const others = [];
        skillDivs.forEach(div => {
            if (div.getAttribute('data-category') === category) categorized.push(div);
            else                                                others.push(div);
        });
        categorized.concat(others).forEach(div => container.appendChild(div));
    }

    // "Random" must visibly move every tile, i.e. produce a derangement (no
    // element keeps its original index). Sattolo's algorithm — a Fisher-Yates
    // variant whose inner pick is [0, i) instead of [0, i] — yields a uniformly
    // random single cycle, which by construction has no fixed point. One pass,
    // unbiased, no retry loop.
    function getDerangement(arr) {
        const out = arr.slice();
        for (let i = out.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * i);   // 0 ≤ j < i  (note: not ≤ i)
            [out[i], out[j]] = [out[j], out[i]];
        }
        return out;
    }
    
    
    // A W A R D  S T A R  B O U N C E
    // Each honors-section star does a little Panel-de-Pon landing bounce the
    // first time it scrolls into view, staggered left-to-right.
    document.querySelectorAll('.award-star').forEach((star, i) => {
        star.style.setProperty('--bounce-delay', (i * 0.1) + 's');
        Site.onceInView(star, () => star.classList.add('bounce'), { threshold: 0.6 });
    });

    // S T A G G E R E D  F A D E - I N
    // Each card waits for both its stagger delay AND its image to load before becoming visible
    document.querySelectorAll('.fade-in-item').forEach((el, i) => {
        const img = el.querySelector('img');
        const delayPromise = new Promise(resolve => setTimeout(resolve, i * 80));

        if (img && !img.complete) {
            const imgPromise = new Promise(resolve => {
                img.addEventListener('load', resolve);
                img.addEventListener('error', resolve); // show card even if image fails
            });
            Promise.all([delayPromise, imgPromise]).then(() => el.classList.add('visible'));
        } else {
            delayPromise.then(() => el.classList.add('visible'));
        }
    });
});




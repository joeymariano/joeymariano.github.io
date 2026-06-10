document.addEventListener('DOMContentLoaded', () => {
    // A 1 1 Y // — make the skip-link target programmatically focusable
    const fadeContent = document.getElementById('fadeContent');
    if (fadeContent && !fadeContent.hasAttribute('tabindex')) {
        fadeContent.setAttribute('tabindex', '-1');
    }

    // M E N U //
    const menuBtn = document.getElementById('menu-btn');
    const menu = document.getElementById('menu');
    const duration = 400; // must match #menu transition in style.css

    menuBtn.addEventListener('click', function() {
        if (menu.classList.contains('show')) {
            menu.classList.remove('show');
            menuBtn.classList.remove('is-open');
            // Defer `hidden` until the collapse transition finishes.
            setTimeout(() => menu.classList.add('hidden'), duration);
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
            footer.scrollIntoView({ behavior: 'smooth' });

            // wait until footer is fully in view before triggering animation
            const observer = new IntersectionObserver((entries) => {
                if (entries[0].isIntersecting) {
                    observer.disconnect();
                    if (contactSpan) {
                        contactSpan.classList.remove('contact-blink');
                        void contactSpan.offsetWidth; // force reflow to restart animation
                        contactSpan.classList.add('contact-blink');
                        setTimeout(() => contactSpan.classList.remove('contact-blink'), 4000);
                    }
                }
            }, { threshold: 0.9 });

            observer.observe(footer);
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
    const playPauses = document.getElementsByClassName('playPause');
    const seekbars = document.getElementsByClassName('seekbar');
    const currentTimes = document.getElementsByClassName('currentTime');
    const playIcons = document.getElementsByClassName('playIcon');
    const pauseIcons = document.getElementsByClassName('pauseIcon');

    // Empty HTMLCollection is fine — the loop just no-ops.
    for (let i = 0; i < audios.length; i++) {
        const audio = audios[i];
        const playPause = playPauses[i];
        const seekbar = seekbars[i];
        const currentTime = currentTimes[i];
        const playIcon = playIcons[i];
        const pauseIcon = pauseIcons[i];

        if (audio && playPause && seekbar && currentTime && playIcon && pauseIcon) {
            playPause.addEventListener('click', () => {
                if (audio.paused) audio.play();
                else              audio.pause();
            });

            audio.addEventListener('play', () => {
                playIcon.classList.add('hidden');
                pauseIcon.classList.remove('hidden');
                playPause.setAttribute('aria-label', 'Pause');
            });
            audio.addEventListener('pause', () => {
                playIcon.classList.remove('hidden');
                pauseIcon.classList.add('hidden');
                playPause.setAttribute('aria-label', 'Play');
            });

            audio.addEventListener('timeupdate', () => {
                seekbar.value = (audio.currentTime / audio.duration) * 100 || 0;
                const minutes = Math.floor(audio.currentTime / 60);
                const seconds = Math.floor(audio.currentTime % 60).toString().padStart(2, '0');
                currentTime.textContent = `${minutes}:${seconds}`;
            });

            seekbar.addEventListener('input', () => {
                audio.currentTime = (seekbar.value / 100) * audio.duration;
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

    // Random shuffle that's guaranteed to be a derangement (no element keeps its
    // original index), so a "Random" click visibly reorders every tile.
    function getDerangement(arr) {
        let deranged;
        let attempts = 0;
        do {
            deranged = arr.slice().sort(() => Math.random() - 0.5);
            attempts++;
        } while (deranged.some((el, idx) => el === arr[idx]) && attempts < 100);
        return deranged;
    }
    
    
    // A W A R D  S T A R  B O U N C E
    // Each honors-section star does a little Panel-de-Pon landing bounce the
    // first time it scrolls into view, staggered left-to-right.
    const awardStars = document.querySelectorAll('.award-star');
    if (awardStars.length && 'IntersectionObserver' in window) {
        const starObserver = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (!entry.isIntersecting) return;
                entry.target.classList.add('bounce');
                starObserver.unobserve(entry.target);
            });
        }, { threshold: 0.6 });
        awardStars.forEach((star, i) => {
            star.style.setProperty('--bounce-delay', (i * 0.1) + 's');
            starObserver.observe(star);
        });
    }

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




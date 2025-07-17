document.addEventListener('DOMContentLoaded', () => {
    
    
    // M E N U //
    const menuBtn = document.getElementById('menu-btn');
    const menu = document.getElementById('menu');
    
    if (menuBtn && menu) {
        menuBtn.addEventListener('click', () => {
            if (menu.classList.contains('hidden')) {
                menu.classList.remove('hidden');
                setTimeout(() => menu.classList.add('visible'), 10);
            } else {
                menu.classList.remove('visible');
                setTimeout(() => menu.classList.add('hidden'), 500);
            }
            menuBtn.setAttribute('aria-expanded', !menu.classList.contains('hidden'));
        });
    }
    
    
    // A U D I O -- P L A Y E R //
    const audios = document.getElementsByClassName('audio');
    const playPauses = document.getElementsByClassName('playPause');
    const seekbars = document.getElementsByClassName('seekbar');
    const currentTimes = document.getElementsByClassName('currentTime');
    const playIcons = document.getElementsByClassName('playIcon');
    const pauseIcons = document.getElementsByClassName('pauseIcon');

    // 'if (audios)' prevents errors from occuring since not every card page has a 'music' entry
    if (audios) {
        // iteration over all the audio instances
        for (let i = 0; i < audios.length; i++) {
            const audio = audios[i];
            const playPause = playPauses[i];
            const seekbar = seekbars[i];
            const currentTime = currentTimes[i];
            const playIcon = playIcons[i];
            const pauseIcon = pauseIcons[i];
            
            if (audio && playPause && seekbar && currentTime && playIcon && pauseIcon) {
                playPause.addEventListener('click', () => {
                    // Always stop all tracks before playing a new one
                    for (let j = 0; j < audios.length; j++) {
                        if (j !== i) {
                            audios[j].pause();
                            audios[j].currentTime = 0; // Optionally reset time
                        }
                    }
                    if (audio.paused) {
                        audio.play();
                    } else {
                        audio.pause();
                    }
                });
                
                // Sync icon when play/pause state changes
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
                    let minutes = Math.floor(audio.currentTime / 60);
                    let seconds = Math.floor(audio.currentTime % 60).toString().padStart(2, '0');
                    currentTime.textContent = `${minutes}:${seconds}`;
                });
                
                seekbar.addEventListener('input', () => {
                    audio.currentTime = (seekbar.value / 100) * audio.duration;
                });
            }
        }
    }

    
    // E X P E R I E N C E  U I //
    const jobBtnBack = document.getElementById('job-btn-back');
    const jobBtnForward = document.getElementById('job-btn-forward');
    const jobScroller = document.getElementById('job-scroller');
    // Keep track of previous order
    let previousOrder = [];

    // Debounce value in milliseconds
    const DEBOUNCE_DELAY = 500; // Change this value as needed

    // Attach event listeners
    if (jobBtnBack && jobScroller) {
        jobBtnBack.addEventListener('click', debounce(() => {
            snapJobScroller(-1); // Snap to previous job
        }, DEBOUNCE_DELAY));
    }
    
    if (jobBtnForward && jobScroller) {
        jobBtnForward.addEventListener('click', debounce(() => {
            snapJobScroller(1); // Snap to next job
        }, DEBOUNCE_DELAY));
    }
    
    // Helper to debounce rapid clicks
    function debounce(fn, delay) {
        let lastCall = 0;
        return function(...args) {
            const now = Date.now();
            if (now - lastCall < delay) return;
            lastCall = now;
            fn.apply(this, args);
        };
    }
    
    // Get the width of a job entry (responsive)
    function getJobEntryWidth() {
        const jobEntry = jobScroller ? jobScroller.querySelector('.job-entry') : null;
        if (jobEntry) {
            return jobEntry.offsetWidth;
        }
        // fallback to window width / 4 if no jobEntry found
        return window.innerWidth / 4;
    }
    
    // Calculate the snapped scroll position
    function getSnappedScrollLeft(direction = 0) {
        if (!jobScroller) return 0;
        const jobWidth = getJobEntryWidth();
        const currentScroll = jobScroller.scrollLeft;
        // Find the nearest job start position
        let snapIndex = Math.round(currentScroll / jobWidth);
        if (direction === -1) snapIndex = Math.max(0, snapIndex - 1); // Back
        if (direction === 1) snapIndex = snapIndex + 1; // Forward
        return snapIndex * jobWidth;
    }
    
    // Snap scroll function
    function snapJobScroller(direction = 0) {
        if (jobScroller) {
            const snapLeft = getSnappedScrollLeft(direction);
            jobScroller.scrollTo({ left: snapLeft, behavior: 'smooth' });
        }
    }
    
    
    // S K I L L  S O R T I N G //
    const skillDivs = document.querySelectorAll('[data-category]');
    const buttons = [
        { id: 'randomButton', category: 'random' },
        { id: 'techButton', category: 'tech' },
        { id: 'artsButton', category: 'arts' },
        { id: 'miscButton', category: 'misc' },
    ];
    let previousSkillOrder = [];

    // Hook up button listeners
    buttons.forEach(btn => {
        const button = document.getElementById(btn.id);
        if (button) {
            button.addEventListener('click', function() {
                if (btn.id === 'randomButton') {
                    skillDivs.forEach(div => div.style.display = ''); // Make sure all are visible
                    const parent = skillDivs[0].parentNode;
                    const arr = Array.from(skillDivs);
                    // Initialize previousOrder if empty
                    if (previousOrder.length === 0) {
                        previousOrder = arr.slice();
                    }
                    // Get a deranged order
                    const newOrder = getDerangement(previousOrder);
                    // Reorder in DOM
                    newOrder.forEach(div => parent.appendChild(div));
                    // Update previousOrder
                    previousSkillOrder = newOrder;
                } else {
                    showSkillsByCategory(btn.category);
                }
            });
        }
    });

    // Optionally show all skills on page load
    showAllSkills();

    // Show all skills (helper)
    function showAllSkills() {
        skillDivs.forEach(div => div.style.display = '');
    }
    
    function showSkillsByCategory(category) {
        const container = document.getElementById('skills-container'); // adjust if your container ID differs
        
        // Separate skillDivs into chosen category and others
        const categorized = [];
        const others = [];
        skillDivs.forEach(div => {
            if (div.getAttribute('data-category') === category) {
                categorized.push(div);
            } else {
                others.push(div);
            }
        });
        // Append categorized first, then others
        categorized.concat(others).forEach(div => {
            container.appendChild(div);
        });
    }
    
    function getDerangement(arr) {
        // Generate a random permutation that is a derangement (no element stays in the same position)
        let deranged;
        let attempts = 0;
        do {
            deranged = arr.slice().sort(() => Math.random() - 0.5);
            attempts++;
            // If any element stays in its old position, rerun
        } while (deranged.some((el, idx) => el === arr[idx]) && attempts < 100);
        return deranged;
    }
    
    
    // Add fade effects based on first boot or subsequent page loads
    // if (isFirstBoot()) {
    //     fadeIn(firstBootFade); // Special fade-in for first boot
    //     markFirstBootComplete(); // Mark the first boot as completed
    // } else {
    //     fadeContentElements.forEach(fadeIn); // Regular fade-in for content
    // }
    
    // Add fade-out functionality on page unload
    // window.addEventListener('beforeunload', () => {
    //     fadeContentElements.forEach((element) => {
    //         element.style.opacity = 0; // Fade out content before navigation
    //     });
    // });
    
    // Function to check if it's the first boot of the app
    // function isFirstBoot() {
    //     return !localStorage.getItem('appHasBooted');
    // }

    // Function to mark the first boot as completed
    // function markFirstBootComplete() {
    //     localStorage.setItem('appHasBooted', 'true');
    // }

    // Function to handle fade-in effect
    // function fadeIn(element) {
    //     if (!element) return; // Exit if the element doesn't exist
    //
    //     element.style.opacity = 0; // Ensure opacity starts at 0
    //     element.style.transition = "opacity .6s ease-in-out"; // Longer duration and smoother easing
    //
    //     // Delay to ensure the transition applies
    //     setTimeout(() => {
    //         element.style.opacity = 1; // Fade to full opacity
    //     }, 10);
    // }
});




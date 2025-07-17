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

    
    // right now scrolling works where it detects the width of the job and scrolls left or right based on that
    // measurement. i would like it to work the same way however snap so that everything always lines up like the
    // default layout.
    // E X P E R I E N C E  U I //
    const jobBtnBack= document.getElementById('job-btn-back');
    const jobBtnForward = document.getElementById('job-btn-forward');
    const jobScroller = document.getElementById('job-scroller');

    // Debounce value in milliseconds
    const DEBOUNCE_DELAY = 500; // Change this value as needed

    // job buttons
    if (jobBtnBack && jobScroller) {
        jobBtnBack.addEventListener('click', debounce(() => {
            const scrollAmount = getJobEntryWidth();
            jobScroller.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
        }, DEBOUNCE_DELAY));
    }
    
    if (jobBtnForward && jobScroller) {
        jobBtnForward.addEventListener('click', debounce(() => {
            const scrollAmount = getJobEntryWidth();
            jobScroller.scrollBy({ left: scrollAmount, behavior: 'smooth' });
        }, DEBOUNCE_DELAY));
    }
    
    // Debounce helper
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
    
    
    // S K I L L  S O R T I N G //
    const skillDivs = document.querySelectorAll('[data-category]');
    const buttons = [
        { id: 'randomButton', category: 'random' },
        { id: 'techButton', category: 'tech' },
        { id: 'artsButton', category: 'arts' },
        { id: 'miscButton', category: 'misc' },
    ];
    
    // Show all skills (helper)
    function showAllSkills() {
        skillDivs.forEach(div => div.style.display = '');
    }
    
    // Filter skills by category
    function showSkillsByCategory(category) {
        skillDivs.forEach(div => {
            if (div.getAttribute('data-category') === category) {
                div.style.display = '';
            } else {
                div.style.display = 'none';
            }
        });
    }
    
    // Hook up button listeners
    buttons.forEach(btn => {
        const button = document.getElementById(btn.id);
        if (button) {
            button.addEventListener('click', function() {
                if (btn.id === 'randomButton') {
                    // Pick a random skill to show
                    skillDivs.forEach(div => div.style.display = 'none');
                    const arr = Array.from(skillDivs);
                    const randomDiv = arr[Math.floor(Math.random() * arr.length)];
                    if (randomDiv) randomDiv.style.display = '';
                } else {
                    showSkillsByCategory(btn.category);
                }
            });
        }
    });
    
    // Optionally show all skills on page load
    showAllSkills();
    

    
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
});



// Function to check if it's the first boot of the app
function isFirstBoot() {
    return !localStorage.getItem('appHasBooted');
}

// Function to mark the first boot as completed
function markFirstBootComplete() {
    localStorage.setItem('appHasBooted', 'true');
}

// Function to handle fade-in effect
function fadeIn(element) {
    if (!element) return; // Exit if the element doesn't exist
    
    element.style.opacity = 0; // Ensure opacity starts at 0
    element.style.transition = "opacity .6s ease-in-out"; // Longer duration and smoother easing
    
    // Delay to ensure the transition applies
    setTimeout(() => {
        element.style.opacity = 1; // Fade to full opacity
    }, 10);
}
document.addEventListener('DOMContentLoaded', () => {
    // audio player stuff
    
    const audio = document.getElementById('audio');
    const playPause = document.getElementById('playPause');
    const seekbar = document.getElementById('seekbar');
    const currentTime = document.getElementById('currentTime');
    const playIcon = document.getElementById('playIcon');
    const pauseIcon = document.getElementById('pauseIcon');
    
    playPause.addEventListener('click', () => {
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
        console.log("switch 1!")
    });
    audio.addEventListener('pause', () => {
        playIcon.classList.remove('hidden');
        pauseIcon.classList.add('hidden');
        playPause.setAttribute('aria-label', 'Play');
        console.log("switch 2!")
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
    
    // ui stuff
    
    const menuBtn = document.getElementById('menu-btn');
    const menu = document.getElementById('menu');
    const jobBtnBack = document.getElementById('job-btn-back');
    const jobBtnForward = document.getElementById('job-btn-forward');
    const jobScroller = document.getElementById('job-scroller');
    const fadeContentElements = document.querySelectorAll('.fade-content'); // Only elements with fade-content class
    const firstBootFade = document.getElementById('firstBootFade');
    
    if (menuBtn && menu) {
        menuBtn.addEventListener('click', () => {
            if (menu.classList.contains('hidden')) {
                menu.classList.remove('hidden');
                setTimeout(() => menu.classList.add('visible'), 10); // Short delay to trigger transition
            } else {
                menu.classList.remove('visible');
                setTimeout(() => menu.classList.add('hidden'), 500); // Matches transition duration
            }
            menuBtn.setAttribute('aria-expanded', !menu.classList.contains('hidden')); // Update accessibility attribute
        });
    }
    
    if (jobBtnBack && jobScroller) {
        jobBtnBack.addEventListener('click', () => {
            jobScroller.scrollBy({ left: -384, behavior: 'smooth' });
        });
    }
    
    if (jobBtnForward && jobScroller) {
        jobBtnForward.addEventListener('click', () => {
            jobScroller.scrollBy({ left: 384, behavior: 'smooth' });
        });
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
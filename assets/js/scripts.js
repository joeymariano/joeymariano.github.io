// Navbar script

document.addEventListener('DOMContentLoaded', () => {
    const menuBtn = document.getElementById('menu-btn');
    const menu = document.getElementById('menu');
    const jobBtnBack = document.getElementById('job-btn-back');
    const jobBtnForward = document.getElementById('job-btn-forward');
    const jobScroller = document.getElementById('job-scroller');
    
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
    
    // Add fadeIn functionality
    fadeIn();
    
    // Add fadeOut functionality on page unload
    window.addEventListener('beforeunload', () => {
        const fade = document.getElementById("body");
        if (fade) {
            fade.style.opacity = 0; // Fade out before navigation
        }
    });
});

function fadeIn() {
    const fade = document.getElementById("body");
    if (!fade) return; // Exit if the element doesn't exist
    
    fade.style.opacity = 0; // Ensure opacity starts at 0
    fade.style.transition = "opacity .4s ease-in-out"; // Longer duration and smoother easing
    
    // Delay to ensure the transition applies
    setTimeout(() => {
        fade.style.opacity = 1; // Fade to full opacity
    }, 10);
}
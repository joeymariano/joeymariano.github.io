document.addEventListener('DOMContentLoaded', () => {
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
    if (isFirstBoot()) {
        fadeIn(firstBootFade); // Special fade-in for first boot
        markFirstBootComplete(); // Mark the first boot as completed
    } else {
        fadeContentElements.forEach(fadeIn); // Regular fade-in for content
    }
    
    // Add fade-out functionality on page unload
    window.addEventListener('beforeunload', () => {
        fadeContentElements.forEach((element) => {
            element.style.opacity = 0; // Fade out content before navigation
        });
    });
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
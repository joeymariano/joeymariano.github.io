// navbar script

document.addEventListener('DOMContentLoaded', () => {
    const menuBtn = document.getElementById('menu-btn');
    const menu = document.getElementById('menu');
    const jobBtnBack = document.getElementById('job-btn-back');
    const jobBtnForward = document.getElementById('job-btn-forward');
    const jobScroller = document.getElementById('job-scroller');

    menuBtn.addEventListener('click', () => {
        if (menu.classList.contains('hidden')) {
            menu.classList.remove('hidden');
            setTimeout(() => menu.classList.add('visible'), 10); // Short delay to trigger transition
        } else {
            menu.classList.remove('visible');
            setTimeout(() => menu.classList.add('hidden'), 500); // Matches transition duration
        }
    });

    jobBtnBack.addEventListener('click', () => {
        jobScroller.scrollBy({ left: -384, behavior: 'smooth' });
    });
    jobBtnForward.addEventListener('click', () => {
        jobScroller.scrollBy({ left: 384, behavior: 'smooth' });
    });
});

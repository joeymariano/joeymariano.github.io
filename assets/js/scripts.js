// navbar script

document.addEventListener('DOMContentLoaded', () => {
  const menuBtn = document.getElementById('menu-btn');
  const menu = document.getElementById('menu');

  menuBtn.addEventListener('click', () => {
    if (menu.classList.contains('hidden')) {
      menu.classList.remove('hidden');
      setTimeout(() => menu.classList.add('visible'), 10); // Short delay to trigger transition
    } else {
      menu.classList.remove('visible');
      setTimeout(() => menu.classList.add('hidden'), 300); // Matches transition duration
    }
  });
});

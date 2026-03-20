// ===== Theme Switcher =====
(function() {
  'use strict';

  var THEMES = [
    { id: 'catppuccin-mocha', name: 'Catppuccin Mocha', color: '#89b4fa' },
    { id: 'github-dark',      name: 'GitHub Dark',      color: '#58a6ff' },
    { id: 'nord',             name: 'Nord',             color: '#88c0d0' },
    { id: 'dracula',          name: 'Dracula',          color: '#bd93f9' },
    { id: 'solarized-dark',   name: 'Solarized Dark',   color: '#268bd2' },
    { id: 'one-dark',         name: 'One Dark',         color: '#61afef' },
    { id: 'catppuccin-latte', name: 'Catppuccin Latte', color: '#dce0e8' }
  ];

  var STORAGE_KEY = 'devtools-theme';

  function getStoredTheme() {
    try { return localStorage.getItem(STORAGE_KEY); } catch(e) { return null; }
  }

  function storeTheme(id) {
    try { localStorage.setItem(STORAGE_KEY, id); } catch(e) {}
  }

  function applyTheme(id) {
    document.documentElement.setAttribute('data-theme', id);
    storeTheme(id);

    // Update active dot
    var container = document.getElementById('themeSwitcher');
    if (!container) return;
    var dots = container.querySelectorAll('.theme-dot');
    dots.forEach(function(dot) {
      dot.classList.toggle('active', dot.getAttribute('data-theme-id') === id);
    });
  }

  function init() {
    var container = document.getElementById('themeSwitcher');
    if (!container) return;

    // Build dots
    THEMES.forEach(function(t) {
      var dot = document.createElement('div');
      dot.className = 'theme-dot';
      dot.setAttribute('data-theme-id', t.id);
      dot.setAttribute('title', t.name);
      dot.style.background = t.color;
      dot.addEventListener('click', function() {
        applyTheme(t.id);
      });
      container.appendChild(dot);
    });

    // Restore saved theme
    var saved = getStoredTheme();
    applyTheme(saved || 'catppuccin-latte');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

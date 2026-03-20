// ===== DevTools: Tab switching + shared utilities =====
(function() {
  'use strict';

  // --- Tab routing configuration ---
  const TAB_ROUTES = {
    'json-viewer': 'tab-json-viewer',
    'json-diff': 'tab-json-diff',
    'base64': 'tab-base64',
    'url-codec': 'tab-url-codec',
    'timestamp': 'tab-timestamp'
  };

  // Reverse mapping: tab-id -> route
  const TAB_ID_TO_ROUTE = {};
  Object.keys(TAB_ROUTES).forEach(function(route) {
    TAB_ID_TO_ROUTE[TAB_ROUTES[route]] = route;
  });

  // --- Initialize with URL ---
  function initializeTabFromUrl() {
    const path = window.location.pathname;
    const parts = path.split('/').filter(p => p.length > 0);
    const lastPart = parts[parts.length - 1];

    // Check if the last part is a valid tab route
    if (TAB_ROUTES[lastPart]) {
      switchToTab(lastPart);
    } else {
      // Default to first tab (json-viewer)
      switchToTab('json-viewer');
    }
  }

  // --- Switch to a specific tab by route ---
  function switchToTab(route) {
    if (!TAB_ROUTES[route]) {
      console.warn('Invalid tab route:', route);
      return;
    }

    const tabId = TAB_ROUTES[route];
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    // Update active states
    tabBtns.forEach(function(b) { b.classList.remove('active'); });
    tabContents.forEach(function(tc) { tc.classList.remove('active'); });

    // Activate the target tab
    document.querySelector(`[data-tab="${tabId}"]`).classList.add('active');
    document.getElementById(tabId).classList.add('active');

    // Update URL without page reload
    updateUrl(route);
  }

  // --- Update browser URL ---
  function updateUrl(route) {
    // Get the base path (everything except the last route segment)
    const parts = window.location.pathname.split('/').filter(p => p.length > 0);
    parts.pop(); // Remove the last route segment
    const newPath = '/' + parts.join('/') + '/' + route;
    window.history.pushState({ tab: route }, '', newPath);
  }

  // --- Tab switching from button clicks ---
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');

  tabBtns.forEach(function(btn) {
    btn.addEventListener('click', function() {
      const targetId = btn.getAttribute('data-tab');
      const route = TAB_ID_TO_ROUTE[targetId];
      if (route) {
        switchToTab(route);
      }
    });
  });

  // --- Handle browser back/forward ---
  window.addEventListener('popstate', function(event) {
    if (event.state && event.state.tab) {
      switchToTab(event.state.tab);
    }
  });

  // --- Initialize on page load ---
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeTabFromUrl);
  } else {
    initializeTabFromUrl();
  }

  // --- Shared utilities on window.DevTools ---
  window.DevTools = {
    // HTML escape
    esc: function(s) {
      return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    },

    // Debounce: returns a debounced function
    debounce: function(fn, ms) {
      var timer;
      return function() {
        var args = arguments;
        var ctx = this;
        clearTimeout(timer);
        timer = setTimeout(function() { fn.apply(ctx, args); }, ms);
      };
    },

    // Copy to clipboard with button feedback
    copyToClipboard: function(text, btn) {
      if (!text) return;
      navigator.clipboard.writeText(text).then(function() {
        if (btn) {
          var orig = btn.textContent;
          btn.textContent = '已复制!';
          setTimeout(function() { btn.textContent = orig; }, 1500);
        }
      });
    },

    // Generic panel resizer initializer
    initResizer: function(resizerEl, panelEl, containerEl) {
      var isResizing = false;
      resizerEl.addEventListener('mousedown', function(e) {
        isResizing = true;
        resizerEl.classList.add('active');
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
        e.preventDefault();
      });
      document.addEventListener('mousemove', function(e) {
        if (!isResizing) return;
        var rect = containerEl.getBoundingClientRect();
        var ratio = (e.clientX - rect.left) / rect.width;
        var clamped = Math.max(0.15, Math.min(0.85, ratio));
        panelEl.style.flex = 'none';
        panelEl.style.width = (clamped * 100) + '%';
      });
      document.addEventListener('mouseup', function() {
        if (isResizing) {
          isResizing = false;
          resizerEl.classList.remove('active');
          document.body.style.cursor = '';
          document.body.style.userSelect = '';
        }
      });
    }
  };
})();

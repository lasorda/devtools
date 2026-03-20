// ===== Timestamp — auto convert on input, prefill current time =====
(function() {
  'use strict';

  var debounce = DevTools.debounce;

  var liveEl = document.getElementById('tsLive');
  var toggleMs = document.getElementById('tsToggleMs');
  var inputStamp = document.getElementById('tsInputStamp');
  var resultDate = document.getElementById('tsResultDate');
  var inputDate = document.getElementById('tsInputDate');
  var resultStamp = document.getElementById('tsResultStamp');

  function pad(n) { return String(n).padStart(2, '0'); }

  function formatDate(d) {
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) +
      ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds());
  }

  // Live timestamp display
  var liveTimer = null;

  function updateLive() {
    var now = Date.now();
    liveEl.textContent = toggleMs.checked ? now : Math.floor(now / 1000);
  }

  function startLive() {
    updateLive();
    liveTimer = setInterval(updateLive, 1000);
  }

  function stopLive() {
    if (liveTimer) { clearInterval(liveTimer); liveTimer = null; }
  }

  var tabEl = document.getElementById('tab-timestamp');
  var observer = new MutationObserver(function() {
    if (tabEl.classList.contains('active')) { startLive(); } else { stopLive(); }
  });
  observer.observe(tabEl, { attributes: true, attributeFilter: ['class'] });
  if (tabEl.classList.contains('active')) startLive();

  toggleMs.addEventListener('change', function() {
    updateLive();
    convertStampToDate();
    convertDateToStamp();
  });

  // Prefill current time into both inputs
  function prefillNow() {
    var now = new Date();
    var ts = toggleMs.checked ? now.getTime() : Math.floor(now.getTime() / 1000);
    inputStamp.value = ts;
    inputDate.value = formatDate(now);
    convertStampToDate();
    convertDateToStamp();
  }

  // Auto-convert: timestamp → date
  function convertStampToDate() {
    var raw = inputStamp.value.trim();
    if (!raw) { resultDate.textContent = '—'; inputStamp.classList.remove('error-border'); return; }
    var ts = Number(raw);
    if (isNaN(ts)) {
      inputStamp.classList.add('error-border');
      resultDate.textContent = '无效的时间戳';
      return;
    }
    inputStamp.classList.remove('error-border');
    var ms = ts;
    if (!toggleMs.checked) {
      ms = ts > 1e12 ? ts : ts * 1000;
    }
    var d = new Date(ms);
    if (isNaN(d.getTime())) {
      resultDate.textContent = '无效的时间戳';
      return;
    }
    resultDate.textContent = formatDate(d);
  }

  // Auto-convert: date → timestamp
  function convertDateToStamp() {
    var raw = inputDate.value.trim();
    if (!raw) { resultStamp.textContent = '—'; inputDate.classList.remove('error-border'); return; }
    var d = new Date(raw);
    if (isNaN(d.getTime())) {
      inputDate.classList.add('error-border');
      resultStamp.textContent = '无效的日期格式';
      return;
    }
    inputDate.classList.remove('error-border');
    resultStamp.textContent = toggleMs.checked ? d.getTime() : Math.floor(d.getTime() / 1000);
  }

  var autoStampToDate = debounce(convertStampToDate, 300);
  var autoDateToStamp = debounce(convertDateToStamp, 300);

  inputStamp.addEventListener('input', autoStampToDate);
  inputDate.addEventListener('input', autoDateToStamp);

  // Prefill on first tab activation
  var prefilled = false;
  var prefillObserver = new MutationObserver(function() {
    if (!prefilled && tabEl.classList.contains('active')) {
      prefilled = true;
      prefillNow();
    }
  });
  prefillObserver.observe(tabEl, { attributes: true, attributeFilter: ['class'] });
})();

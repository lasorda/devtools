// ===== Base64 — toggle encode/decode, auto on input =====
(function() {
  'use strict';

  var debounce = DevTools.debounce;

  var inputEl = document.getElementById('b64Input');
  var outputEl = document.getElementById('b64Output');
  var toggleDecode = document.getElementById('b64ToggleDecode');
  var btnCopy = document.getElementById('b64BtnCopy');
  var btnClear = document.getElementById('b64BtnClear');
  var resizerEl = document.getElementById('b64Resizer');
  var inputPanel = document.getElementById('b64InputPanel');
  var mainEl = document.querySelector('#tab-base64 .main');

  function b64Encode(str) {
    try {
      return btoa(unescape(encodeURIComponent(str)));
    } catch (e) {
      return '编码错误: ' + e.message;
    }
  }

  function b64Decode(str) {
    try {
      return decodeURIComponent(escape(atob(str.trim())));
    } catch (e) {
      return '解码错误: ' + e.message;
    }
  }

  function process() {
    var text = inputEl.value;
    if (!text) { outputEl.value = ''; return; }
    if (toggleDecode.checked) {
      outputEl.value = b64Decode(text);
    } else {
      outputEl.value = b64Encode(text);
    }
  }

  var autoProcess = debounce(process, 200);

  inputEl.addEventListener('input', autoProcess);
  toggleDecode.addEventListener('change', process);

  btnCopy.addEventListener('click', function() {
    DevTools.copyToClipboard(outputEl.value, btnCopy);
  });

  btnClear.addEventListener('click', function() {
    inputEl.value = '';
    outputEl.value = '';
  });

  DevTools.initResizer(resizerEl, inputPanel, mainEl);
})();

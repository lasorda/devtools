// ===== URL Encode/Decode — toggle mode, auto on input =====
(function() {
  'use strict';

  var debounce = DevTools.debounce;

  var inputEl = document.getElementById('urlInput');
  var outputEl = document.getElementById('urlOutput');
  var toggleDecode = document.getElementById('urlToggleDecode');
  var toggleComponent = document.getElementById('urlToggleComponent');
  var btnCopy = document.getElementById('urlBtnCopy');
  var btnClear = document.getElementById('urlBtnClear');
  var resizerEl = document.getElementById('urlResizer');
  var inputPanel = document.getElementById('urlInputPanel');
  var mainEl = document.querySelector('#tab-url-codec .main');

  function process() {
    var text = inputEl.value;
    if (!text) { outputEl.value = ''; return; }
    var isDecode = toggleDecode.checked;
    var useComponent = toggleComponent.checked;
    try {
      if (isDecode) {
        outputEl.value = useComponent ? decodeURIComponent(text) : decodeURI(text);
      } else {
        outputEl.value = useComponent ? encodeURIComponent(text) : encodeURI(text);
      }
    } catch (e) {
      outputEl.value = (isDecode ? '解码' : '编码') + '错误: ' + e.message;
    }
  }

  var autoProcess = debounce(process, 200);

  inputEl.addEventListener('input', autoProcess);
  toggleDecode.addEventListener('change', process);
  toggleComponent.addEventListener('change', process);

  btnCopy.addEventListener('click', function() {
    DevTools.copyToClipboard(outputEl.value, btnCopy);
  });

  btnClear.addEventListener('click', function() {
    inputEl.value = '';
    outputEl.value = '';
  });

  DevTools.initResizer(resizerEl, inputPanel, mainEl);
})();

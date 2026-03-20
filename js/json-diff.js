// ===== JSON Diff — auto compare on input =====
(function() {
  'use strict';

  var esc = DevTools.esc;
  var debounce = DevTools.debounce;

  var inputLeft = document.getElementById('diffInputLeft');
  var inputRight = document.getElementById('diffInputRight');
  var btnSwap = document.getElementById('diffBtnSwap');
  var btnClear = document.getElementById('diffBtnClear');
  var statsEl = document.getElementById('diffStats');
  var resultEl = document.getElementById('diffResult');
  var diffResizer = document.getElementById('diffResizer');
  var diffLeftPanel = inputLeft.closest('.panel');
  var diffInputsContainer = document.querySelector('.diff-inputs');

  // Deep diff algorithm
  function deepDiff(a, b, path) {
    if (path === undefined) path = '$';
    var diffs = [];

    var typeA = a === null ? 'null' : Array.isArray(a) ? 'array' : typeof a;
    var typeB = b === null ? 'null' : Array.isArray(b) ? 'array' : typeof b;

    if (typeA !== typeB) {
      diffs.push({ path: path, type: 'modified', oldVal: a, newVal: b });
      return diffs;
    }

    if (typeA !== 'object' && typeA !== 'array') {
      if (a !== b) {
        diffs.push({ path: path, type: 'modified', oldVal: a, newVal: b });
      }
      return diffs;
    }

    if (typeA === 'array') {
      var maxLen = Math.max(a.length, b.length);
      for (var i = 0; i < maxLen; i++) {
        var childPath = path + '[' + i + ']';
        if (i >= a.length) {
          diffs.push({ path: childPath, type: 'added', newVal: b[i] });
        } else if (i >= b.length) {
          diffs.push({ path: childPath, type: 'removed', oldVal: a[i] });
        } else {
          diffs = diffs.concat(deepDiff(a[i], b[i], childPath));
        }
      }
      return diffs;
    }

    var allKeys = {};
    var keysA = Object.keys(a);
    var keysB = Object.keys(b);
    var k;
    for (k = 0; k < keysA.length; k++) allKeys[keysA[k]] = true;
    for (k = 0; k < keysB.length; k++) allKeys[keysB[k]] = true;

    var sortedKeys = Object.keys(allKeys).sort();
    for (k = 0; k < sortedKeys.length; k++) {
      var key = sortedKeys[k];
      var childPath2 = path + '.' + key;
      var inA = a.hasOwnProperty(key);
      var inB = b.hasOwnProperty(key);
      if (inA && !inB) {
        diffs.push({ path: childPath2, type: 'removed', oldVal: a[key] });
      } else if (!inA && inB) {
        diffs.push({ path: childPath2, type: 'added', newVal: b[key] });
      } else {
        diffs = diffs.concat(deepDiff(a[key], b[key], childPath2));
      }
    }

    return diffs;
  }

  function truncateVal(val) {
    var s = JSON.stringify(val);
    if (s && s.length > 120) return s.substring(0, 120) + '…';
    return s;
  }

  function renderDiff(diffs) {
    if (diffs.length === 0) {
      statsEl.innerHTML = '<span style="color:var(--string-color)">✓ 两个 JSON 完全一致</span>';
      resultEl.innerHTML = '<span class="placeholder" style="color:var(--string-color)">没有差异</span>';
      return;
    }

    var added = 0, removed = 0, modified = 0;
    for (var i = 0; i < diffs.length; i++) {
      if (diffs[i].type === 'added') added++;
      else if (diffs[i].type === 'removed') removed++;
      else if (diffs[i].type === 'modified') modified++;
    }

    statsEl.innerHTML =
      '<span class="stat-added">+ 新增 ' + added + '</span>' +
      '<span class="stat-removed">− 删除 ' + removed + '</span>' +
      '<span class="stat-modified">~ 修改 ' + modified + '</span>' +
      '<span style="color:var(--text-muted)">共 ' + diffs.length + ' 处差异</span>';

    var html = '';
    for (var j = 0; j < diffs.length; j++) {
      var d = diffs[j];
      var cls = 'diff-' + d.type;
      html += '<div class="diff-entry ' + cls + '">';
      html += '<span class="diff-path">' + esc(d.path) + '</span>';

      if (d.type === 'added') {
        html += '<span class="diff-value">+ ' + esc(truncateVal(d.newVal)) + '</span>';
      } else if (d.type === 'removed') {
        html += '<span class="diff-value">− ' + esc(truncateVal(d.oldVal)) + '</span>';
      } else if (d.type === 'modified') {
        html += '<span class="diff-value">' + esc(truncateVal(d.oldVal)) + '</span>';
        html += '<span class="diff-arrow">→</span>';
        html += '<span class="diff-value">' + esc(truncateVal(d.newVal)) + '</span>';
      }

      html += '</div>';
    }
    resultEl.innerHTML = html;
  }

  // Auto compare when both sides have content
  function doCompare() {
    var rawLeft = inputLeft.value.trim();
    var rawRight = inputRight.value.trim();

    if (!rawLeft && !rawRight) {
      statsEl.innerHTML = '<span style="color:var(--text-muted)">在两侧输入 JSON 自动对比</span>';
      resultEl.innerHTML = '<span class="placeholder">对比结果将在此显示...</span>';
      return;
    }

    if (!rawLeft || !rawRight) {
      statsEl.innerHTML = '<span style="color:var(--text-muted)">等待两侧都输入 JSON...</span>';
      resultEl.innerHTML = '';
      return;
    }

    var objLeft, objRight;
    try {
      objLeft = JSON.parse(rawLeft);
    } catch (e) {
      statsEl.innerHTML = '<span style="color:var(--error)">左侧 JSON 解析错误: ' + esc(e.message) + '</span>';
      resultEl.innerHTML = '';
      return;
    }
    try {
      objRight = JSON.parse(rawRight);
    } catch (e) {
      statsEl.innerHTML = '<span style="color:var(--error)">右侧 JSON 解析错误: ' + esc(e.message) + '</span>';
      resultEl.innerHTML = '';
      return;
    }

    var diffs = deepDiff(objLeft, objRight);
    renderDiff(diffs);
  }

  var autoCompare = debounce(doCompare, 400);

  // Auto compare on input
  inputLeft.addEventListener('input', autoCompare);
  inputRight.addEventListener('input', autoCompare);

  btnSwap.addEventListener('click', function() {
    var tmp = inputLeft.value;
    inputLeft.value = inputRight.value;
    inputRight.value = tmp;
    doCompare();
  });

  btnClear.addEventListener('click', function() {
    inputLeft.value = '';
    inputRight.value = '';
    statsEl.innerHTML = '<span style="color:var(--text-muted)">在两侧输入 JSON 自动对比</span>';
    resultEl.innerHTML = '<span class="placeholder">对比结果将在此显示...</span>';
  });

  // Resizer
  DevTools.initResizer(diffResizer, diffLeftPanel, diffInputsContainer);
})();

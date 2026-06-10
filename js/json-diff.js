// ===== JSON Diff — auto compare on input =====
(function() {
  'use strict';

  var esc = DevTools.esc;
  var debounce = DevTools.debounce;

  // BigInt marker: must match the one in json-viewer.js
  var BIGINT_PREFIX = '\x00BIGINT:';
  var BIGINT_PREFIX_JSON = '\\u0000BIGINT:';

  // Custom JSON parser that preserves large integers (same logic as json-viewer.js)
  function preserveBigInts(raw) {
    var result = '';
    var inString = false;
    var stringChar = '';
    var i = 0;
    while (i < raw.length) {
      var ch = raw[i];
      if (inString) {
        result += ch;
        if (ch === '\\') {
          i++;
          if (i < raw.length) result += raw[i];
        } else if (ch === stringChar) {
          inString = false;
        }
        i++;
      } else {
        if (ch === '"' || ch === "'") {
          inString = true;
          stringChar = ch;
          result += ch;
          i++;
        } else if (ch === '-' || (ch >= '0' && ch <= '9')) {
          var numStart = i;
          if (ch === '-') { i++; }
          var hasDigits = false;
          while (i < raw.length && raw[i] >= '0' && raw[i] <= '9') {
            hasDigits = true;
            i++;
          }
          var isFloat = false;
          if (i < raw.length && raw[i] === '.') {
            isFloat = true;
            i++;
            while (i < raw.length && raw[i] >= '0' && raw[i] <= '9') i++;
          }
          if (i < raw.length && (raw[i] === 'e' || raw[i] === 'E')) {
            isFloat = true;
            i++;
            if (i < raw.length && (raw[i] === '+' || raw[i] === '-')) i++;
            while (i < raw.length && raw[i] >= '0' && raw[i] <= '9') i++;
          }
          var numStr = raw.substring(numStart, i);
          if (!hasDigits) {
            result += numStr;
          } else if (isFloat) {
            result += numStr;
          } else {
            var absStr = numStr.startsWith('-') ? numStr.substring(1) : numStr;
            if (absStr.length > 16 || (absStr.length === 16 && absStr > '9007199254740991')) {
              result += '"' + BIGINT_PREFIX_JSON + numStr + '"';
            } else {
              result += numStr;
            }
          }
        } else {
          result += ch;
          i++;
        }
      }
    }
    return result;
  }

  function jsonParsePreserveBigInt(raw) {
    return JSON.parse(preserveBigInts(raw));
  }

  // Stringify with BigInt support for display
  function bigIntStringify(val) {
    if (typeof val === 'string' && val.startsWith(BIGINT_PREFIX)) {
      return val.substring(BIGINT_PREFIX.length);
    }
    return JSON.stringify(val, function(key, value) {
      if (typeof value === 'string' && value.startsWith(BIGINT_PREFIX)) {
        return value.substring(BIGINT_PREFIX.length);
      }
      return value;
    });
  }

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

    // BigInt-marked strings should be treated as numbers for type comparison
    if (typeof a === 'string' && a.startsWith(BIGINT_PREFIX)) typeA = 'number';
    if (typeof b === 'string' && b.startsWith(BIGINT_PREFIX)) typeB = 'number';

    if (typeA !== typeB) {
      diffs.push({ path: path, type: 'modified', oldVal: a, newVal: b });
      return diffs;
    }

    if (typeA !== 'object' && typeA !== 'array') {
      // Normalize BigInt-marked strings to their numeric string for comparison
      var aNorm = (typeof a === 'string' && a.startsWith(BIGINT_PREFIX)) ? a.substring(BIGINT_PREFIX.length) : a;
      var bNorm = (typeof b === 'string' && b.startsWith(BIGINT_PREFIX)) ? b.substring(BIGINT_PREFIX.length) : b;
      if (aNorm !== bNorm) {
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
    if (typeof val === 'string' && val.startsWith(BIGINT_PREFIX)) {
      return val.substring(BIGINT_PREFIX.length);
    }
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
      objLeft = jsonParsePreserveBigInt(rawLeft);
    } catch (e) {
      statsEl.innerHTML = '<span style="color:var(--error)">左侧 JSON 解析错误: ' + esc(e.message) + '</span>';
      resultEl.innerHTML = '';
      return;
    }
    try {
      objRight = jsonParsePreserveBigInt(rawRight);
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

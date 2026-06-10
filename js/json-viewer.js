// ===== JSON Viewer — extracted from original index.html =====
(function() {
  'use strict';

  var esc = DevTools.esc;
  var debounce = DevTools.debounce;

  // BigInt marker: large integers (> MAX_SAFE_INTEGER) are preserved as strings
  // with this prefix so we can display them correctly without precision loss.
  // In raw JSON text we use the escaped form \\u0000BIGINT: so JSON.parse accepts it.
  // After parsing, the JS string contains the actual \x00 char.
  var BIGINT_PREFIX = '\x00BIGINT:';
  var BIGINT_PREFIX_JSON = '\\u0000BIGINT:';

  // Custom JSON parser that preserves large integers.
  // Integers exceeding Number.MAX_SAFE_INTEGER are kept as strings with BIGINT_PREFIX.
  function parseJson(raw) {
    return JSON.parse(raw, function(key, value) {
      if (typeof value === 'string' && value.startsWith(BIGINT_PREFIX)) {
        return value;
      }
      return value;
    });
  }

  // Pre-process raw JSON text to wrap large integers in quoted strings with a marker.
  // This runs before JSON.parse to avoid JavaScript Number precision loss.
  function preserveBigInts(raw) {
    // Match JSON number literals (integer or float), only outside of strings.
    // We use a state machine approach: track whether we're inside a string.
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
          // Single quotes aren't valid JSON strings, but handle gracefully
          inString = true;
          stringChar = ch;
          result += ch;
          i++;
        } else if (ch === '-' || (ch >= '0' && ch <= '9')) {
          // Possible number literal
          var numStart = i;
          if (ch === '-') { i++; }
          // Parse digits
          var hasDigits = false;
          while (i < raw.length && raw[i] >= '0' && raw[i] <= '9') {
            hasDigits = true;
            i++;
          }
          // Check for decimal point or exponent — if present, it's a float, skip
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
            // Not actually a number (just a minus sign), output as-is
            result += numStr;
          } else if (isFloat) {
            // Floats don't have BigInt precision issues in typical usage
            result += numStr;
          } else {
            // Integer — check if it exceeds MAX_SAFE_INTEGER
            var absStr = numStr.startsWith('-') ? numStr.substring(1) : numStr;
            if (absStr.length > 16 || (absStr.length === 16 && absStr > '9007199254740991')) {
              // Large integer — wrap in quoted string with marker
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
    return parseJson(preserveBigInts(raw));
  }

  // Stringify with BigInt support: BIGINT_PREFIX-marked strings are output as bare numbers.
  function bigIntStringify(obj, indent) {
    return JSON.stringify(obj, function(key, value) {
      if (typeof value === 'string' && value.startsWith(BIGINT_PREFIX)) {
        return value.substring(BIGINT_PREFIX.length);
      }
      return value;
    }, indent);
  }

  var input = document.getElementById('jsonInput');
  var output = document.getElementById('jsonOutput');
  var btnFormat = document.getElementById('btnFormat');
  var btnMinify = document.getElementById('btnMinify');
  var btnCopy = document.getElementById('btnCopy');
  var btnClear = document.getElementById('btnClear');
  var btnExpandAll = document.getElementById('btnExpandAll');
  var btnCollapseAll = document.getElementById('btnCollapseAll');
  var toggleNested = document.getElementById('toggleNested');
  var resizer = document.getElementById('resizer');
  var inputPanel = document.getElementById('inputPanel');
  var mainEl = document.querySelector('#tab-json-viewer .main');

  // Recursively expand nested JSON strings
  function expandNestedJson(obj) {
    if (obj === null || typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) return obj.map(expandNestedJson);
    var result = {};
    for (var i = 0, keys = Object.keys(obj); i < keys.length; i++) {
      var key = keys[i];
      var val = obj[key];
      if (typeof val === 'string') {
        var trimmed = val.trim();
        if ((trimmed.startsWith('{') && trimmed.endsWith('}')) ||
            (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
          try {
            val = expandNestedJson(jsonParsePreserveBigInt(trimmed));
          } catch (e) { /* keep original */ }
        }
      } else if (typeof val === 'object' && val !== null) {
        val = expandNestedJson(val);
      }
      result[key] = val;
    }
    return result;
  }

  // ===== DOM-based JSON tree builder with folding =====
  function buildJsonTree(data, indent, path) {
    if (indent === undefined) indent = 0;
    if (path === undefined) path = '$';
    var pad = '  '.repeat(indent);
    var padInner = '  '.repeat(indent + 1);

    if (data === null) {
      return '<span class="json-null">null</span>';
    }
    if (typeof data === 'boolean') {
      return '<span class="json-boolean">' + data + '</span>';
    }
    if (typeof data === 'number') {
      return '<span class="json-number">' + data + '</span>';
    }
    if (typeof data === 'string') {
      if (data.startsWith(BIGINT_PREFIX)) {
        return '<span class="json-number">' + esc(data.substring(BIGINT_PREFIX.length)) + '</span>';
      }
      return '<span class="json-string">' + esc(JSON.stringify(data)) + '</span>';
    }

    var isArray = Array.isArray(data);
    var openBrace = isArray ? '[' : '{';
    var closeBrace = isArray ? ']' : '}';
    var entries = isArray ? data : Object.keys(data);

    if (entries.length === 0) {
      return '<span class="json-brace">' + openBrace + closeBrace + '</span>';
    }

    var count = entries.length;
    var countLabel = isArray
      ? count + ' item' + (count > 1 ? 's' : '')
      : count + ' key' + (count > 1 ? 's' : '');

    var html = '<span class="json-collapsible" data-jp="' + esc(path) + '">';
    html += '<span class="json-toggle" onclick="this.parentElement.classList.toggle(\'collapsed\')" title="点击折叠/展开">▼</span>';
    html += '<span class="json-brace">' + openBrace + '</span>';
    html += '<span class="json-ellipsis" onclick="this.parentElement.classList.toggle(\'collapsed\')" title="点击展开"> <span class="json-item-count">' + countLabel + '</span> </span>';
    html += '<span class="json-content">\n';

    if (isArray) {
      for (var i = 0; i < data.length; i++) {
        var childPath = path + '[' + i + ']';
        html += padInner + '<span class="json-line" data-jp="' + esc(childPath) + '">';
        html += buildJsonTree(data[i], indent + 1, childPath);
        if (i < data.length - 1) html += ',';
        html += '</span>\n';
      }
    } else {
      var keys = Object.keys(data);
      for (var j = 0; j < keys.length; j++) {
        var key = keys[j];
        var childPath2 = path + '.' + key;
        html += padInner + '<span class="json-line" data-jp="' + esc(childPath2) + '">';
        html += '<span class="json-key">' + esc(JSON.stringify(key)) + '</span>: ';
        html += buildJsonTree(data[key], indent + 1, childPath2);
        if (j < keys.length - 1) html += ',';
        html += '</span>\n';
      }
    }

    html += pad + '<span class="json-brace">' + closeBrace + '</span>';
    html += '</span>'; // .json-content
    html += '</span>'; // .json-collapsible

    return html;
  }

  // ===== Scroll anchor: save & restore position across re-renders =====
  function saveScrollAnchor() {
    var containerRect = output.getBoundingClientRect();
    var targets = output.querySelectorAll('[data-jp]');
    var best = null;
    var bestDist = Infinity;
    for (var i = 0; i < targets.length; i++) {
      var el = targets[i];
      var r = el.getBoundingClientRect();
      if (r.height === 0) continue;
      var dist = Math.abs(r.top - containerRect.top);
      if (dist < bestDist) {
        bestDist = dist;
        best = el;
      }
    }
    if (!best) return null;
    return {
      path: best.getAttribute('data-jp'),
      offset: best.getBoundingClientRect().top - containerRect.top
    };
  }

  function restoreScrollAnchor(anchor) {
    if (!anchor) return;
    var target = output.querySelector('[data-jp="' + CSS.escape(anchor.path) + '"]');
    if (!target) {
      var all = output.querySelectorAll('[data-jp]');
      var bestLen = -1;
      for (var i = 0; i < all.length; i++) {
        var p = all[i].getAttribute('data-jp');
        if (anchor.path.startsWith(p) && p.length > bestLen) {
          bestLen = p.length;
          target = all[i];
        }
      }
    }
    if (!target) return;
    var containerRect = output.getBoundingClientRect();
    var targetRect = target.getBoundingClientRect();
    var currentOffset = targetRect.top - containerRect.top;
    output.scrollTop += (currentOffset - anchor.offset);
  }

  // Find error position
  function getErrorInfo(raw, err) {
    var msg = err.message || String(err);
    var posMatch = msg.match(/position\s+(\d+)/i);
    if (posMatch) {
      var pos = parseInt(posMatch[1], 10);
      var before = raw.substring(0, pos);
      var line = (before.match(/\n/g) || []).length + 1;
      var col = pos - before.lastIndexOf('\n');
      return { msg: msg, line: line, col: col };
    }
    return { msg: msg, line: null, col: null };
  }

  // Main format function
  function format(options) {
    if (!options) options = {};
    var raw = input.value.trim();
    if (!raw) {
      output.innerHTML = '<span class="placeholder">格式化后的 JSON 将在此显示...</span>';
      return;
    }

    var anchor = null;
    if (options.preserveScroll) {
      anchor = saveScrollAnchor();
    }

    try {
      var obj = jsonParsePreserveBigInt(raw);
      if (toggleNested.checked) {
        obj = expandNestedJson(obj);
      }
      if (options.minify) {
        output.innerHTML = '<div class="json-tree">' + esc(bigIntStringify(obj)) + '</div>';
      } else {
        output.innerHTML = '<div class="json-tree">' + buildJsonTree(obj, 0) + '\n</div>';
      }

      if (anchor) {
        restoreScrollAnchor(anchor);
      }
    } catch (err) {
      var info = getErrorInfo(raw, err);
      var html = '<div class="error-msg">';
      html += '<div class="error-title">&#x26A0; JSON 解析错误</div>';
      html += esc(info.msg);
      if (info.line !== null) {
        html += '\n\n位置：第 ' + info.line + ' 行，第 ' + info.col + ' 列';
      }
      html += '\n\n--- 输入预览 ---\n';
      var lines = raw.split('\n');
      var start = Math.max(0, (info.line || 1) - 3);
      var end = Math.min(lines.length, (info.line || 1) + 2);
      for (var i = start; i < end; i++) {
        var lineNum = String(i + 1).padStart(4, ' ');
        var marker = (info.line && i + 1 === info.line) ? ' >> ' : '    ';
        html += marker + lineNum + ' | ' + esc(lines[i]) + '\n';
      }
      html += '</div>';
      output.innerHTML = html;
    }
  }

  // Expand / Collapse all
  function setAllCollapsed(collapsed) {
    var items = output.querySelectorAll('.json-collapsible');
    items.forEach(function(el) {
      if (collapsed) {
        el.classList.add('collapsed');
      } else {
        el.classList.remove('collapsed');
      }
    });
  }

  // Event listeners
  var autoFormat = debounce(function() { format(); }, 300);
  input.addEventListener('input', autoFormat);

  btnFormat.addEventListener('click', function() { format(); });
  btnMinify.addEventListener('click', function() { format({ minify: true }); });
  btnExpandAll.addEventListener('click', function() { setAllCollapsed(false); });
  btnCollapseAll.addEventListener('click', function() { setAllCollapsed(true); });

  btnCopy.addEventListener('click', function() {
    var raw = input.value.trim();
    if (!raw) return;
    try {
      var obj = jsonParsePreserveBigInt(raw);
      if (toggleNested.checked) obj = expandNestedJson(obj);
      var text = bigIntStringify(obj, 2);
      DevTools.copyToClipboard(text, btnCopy);
    } catch(e) {}
  });

  btnClear.addEventListener('click', function() {
    input.value = '';
    output.innerHTML = '<span class="placeholder">格式化后的 JSON 将在此显示...</span>';
  });

  toggleNested.addEventListener('change', function() { format({ preserveScroll: true }); });

  // Resizer
  DevTools.initResizer(resizer, inputPanel, mainEl);

  // Tab key support
  input.addEventListener('keydown', function(e) {
    if (e.key === 'Tab') {
      e.preventDefault();
      var s = input.selectionStart, end = input.selectionEnd;
      input.value = input.value.substring(0, s) + '  ' + input.value.substring(end);
      input.selectionStart = input.selectionEnd = s + 2;
    }
  });
})();

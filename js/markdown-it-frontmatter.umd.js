/**
 * markdown-it-frontmatter.umd.js
 * -----------------------------------------------------------------------
 * A TRUE markdown-it plugin (hooks into md.core.ruler, identical to how
 * markdown-it-include.umd.js works) — decouples the logic previously handled
 * manually in the app's updatePreview() (which regex-split the string and
 * manually concatenated `tableHtml + md.render(...)`) into a proper plugin.
 *
 * TWO INDEPENDENT SYNTAXES, SHARING THE SAME PARSE/RENDER ENGINE (parseFM/fmVal):
 *
 * 1) Frontmatter `---` — ONLY accepted at the TOP of the file (preserves the 
 * exact old behavior, no changes made). See the "FRONTMATTER AT FILE TOP" section below.
 *
 * 2) Block ` ```table ... ``` ` — accepted ANYWHERE in the file, can be repeated
 * multiple times. Leverages markdown-it's BUILT-IN `options.highlight` mechanism
 * (which the app already uses to catch `lang === 'mermaid'`), ensuring NO conflicts
 * with any other fenced languages: each fence has exactly one `lang`, and different
 * langs branch into completely different code. The plugin automatically "wraps"
 * your existing highlight function — invoking the OLD function as-is for all langs
 * other than 'table' (including 'mermaid', 'js'...), and only injecting a NEW branch
 * specifically for 'table'. No further modifications needed in index.js.
 *
 * Usage (no bundler required, injects directly into window):
 * <script src="./js/markdown-it-frontmatter.umd.js"></script>
 * md.use(window.frontmatter_plugin); // or pass options, see below
 * var env = {};
 * var html = (function () {
 *   var body = md.render(text, env);
 *   return (env.frontmatterHtml || '') + body;
 * })();
 * console.log(env.frontmatter); // frontmatter --- data at the top of the file (if any)
 *
 * // Inside the markdown file, ANYWHERE:
 * // ```table
 * // status: "done"
 * // owner: "A"
 * // ```
 * // -> automatically renders into an HTML table right at that position in the content.
 *
 * Options:
 * render {boolean} default true — whether to automatically display the frontmatter --- table at the top of the file
 * renderTable {function(data): string} custom table HTML, shared by both syntaxes
 * tableFenceLang {string} default 'table' — rename the fence language if desired (case-insensitive)
 */
const frontmatter_plugin = (md, options) => {
  const defaultOptions = {
    render: true,
    renderTable: defaultRenderTable,
    tableFenceLang: 'table'
  };
  options = Object.assign({}, defaultOptions, options);

  function escH(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function parseFM(text) {
    var result = {}, lines = text.split('\n'), i = 0;
    while (i < lines.length) {
      var line = lines[i], m = line.match(/^([a-zA-Z_][a-zA-Z0-9_\-]*)\s*:\s*(.*)/);
      if (!m) { i++; continue; }
      var key = m[1], valInline = m[2].trim(); i++;
      if (!valInline) {
        var block = [];
        while (i < lines.length && (lines[i] === '' || /^\s/.test(lines[i]))) { block.push(lines[i]); i++; }
        var raw2 = block.join('\n').trim(), cleaned = raw2.replace(/,(\s*[}\]])/g, '$1');
        try { result[key] = JSON.parse(cleaned); } catch (e) { result[key] = raw2; }
      } else {
        if ((valInline.startsWith('"') && valInline.endsWith('"')) || (valInline.startsWith("'") && valInline.endsWith("'"))) result[key] = valInline.slice(1, -1);
        else { try { result[key] = JSON.parse(valInline); } catch (e) { result[key] = valInline; } }
      }
    }
    return result;
  }

  function fmVal(v, depth) {
    if (depth === undefined) depth = 0;
    if (v === null || v === undefined) return '<em class="fm-null">null</em>';
    if (typeof v === 'boolean' || typeof v === 'number') return '<code>' + v + '</code>';
    if (typeof v === 'string') {
      if (/^https?:\/\//.test(v)) return '<a href="' + escH(v) + '" target="_blank" rel="nofollow noopener">' + escH(v) + '</a>';
      return escH(v);
    }
    if (Array.isArray(v)) {
      if (!v.length) return '<em class="fm-empty-arr">[]</em>';
      if (v.every(function (x) { return x && typeof x === 'object' && !Array.isArray(x); })) {
        var keys = [];
        v.forEach(function (x) { Object.keys(x).forEach(function (k) { if (keys.indexOf(k) === -1) keys.push(k); }); });
        return '<table><thead><tr>' + keys.map(function (k) { return '<th>' + escH(k) + '</th>'; }).join('') + '</tr></thead><tbody>' +
          v.map(function (row) { return '<tr>' + keys.map(function (k) { return '<td><div dir="auto">' + fmVal(row[k], depth + 1) + '</div></td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table>';
      }
      return v.map(function (x) { return typeof x === 'object' ? fmVal(x, depth + 1) : '<code>' + escH(String(x)) + '</code>'; }).join(' ');
    }
    if (typeof v === 'object') {
      var entries = Object.entries(v);
      if (!entries.length) return '<em class="fm-empty-obj">{}</em>';
      if (depth === 0) return '<table><tbody>' + entries.map(function (e) { return '<tr><th>' + escH(e[0]) + '</th><td>' + fmVal(e[1], 1) + '</td></tr>'; }).join('') + '</tbody></table>';
      return '<table><thead><tr>' + entries.map(function (e) { return '<th>' + escH(e[0]) + '</th>'; }).join('') + '</tr></thead><tbody><tr>' +
        entries.map(function (e) { return '<td><div dir="auto">' + fmVal(e[1], depth + 1) + '</div></td>'; }).join('') + '</tr></tbody></table>';
    }
    return escH(String(v));
  }

  function defaultRenderTable(data) {
    var entries = Object.entries(data);
    if (!entries.length) return '';
    return '<markdown-accessiblity-table data-catalyst=""><table  class="frontmatter-table"><tbody>' +
      entries.map(function (e) { return '<tr><th>' + escH(e[0]) + '</th><td>' + fmVal(e[1], 1) + '</td></tr>'; }).join('') +
      '</tbody></table></markdown-accessiblity-table>';
  }

  /* ====================================================================
    FRONTMATTER AT FILE TOP — UNCHANGED, NO CHANGES FROM PREVIOUS VERSION
  ==================================================================== */
  // Only matches when the --- block is located EXACTLY at the START of the text (no preceding content allowed)
  const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/;

  md.core.ruler.before('normalize', 'frontmatter', (state) => {
    const match = state.src.match(FRONTMATTER_RE);
    if (!match) return;

    const data = parseFM(match[1]);
    state.env.frontmatter = data; // Always expose to the outside via env, even when render: false
    // IMPORTANT: DO NOT inject the table into state.src for markdown-it to re-parse — the table uses
    // a custom tag (<markdown-accessiblity-table>) that markdown-it does not recognize as a valid
    // raw HTML block, making it prone to being swallowed into a <p> and incorrectly fragmented when containing newlines.
    // The safest approach is to keep the table HTML OUTSIDE the render pipeline via env.frontmatterHtml,
    // allowing the calling code to manually concatenate it AFTER md.render() completes (see example at the top of the file).
    state.env.frontmatterHtml = (options.render && Object.keys(data).length > 0) ? options.renderTable(data) : '';

    state.src = state.src.slice(match[0].length); // luôn cắt khối frontmatter khỏi nội dung markdown
  });

  /* ====================================================================
    ```table BLOCK ANYWHERE IN FILE — NEWLY ADDED
    Wraps the existing options.highlight, DOES NOT replace it — all other
    langs besides 'table' (including 'mermaid', 'js'...) still pass through
    your EXACT original highlight function, preserving current syntax-highlight/mermaid.
  ==================================================================== */
  const targetLang = String(options.tableFenceLang).toLowerCase();
  const originalHighlight = (md.options && typeof md.options.highlight === 'function') ? md.options.highlight : null;

  md.set({
    highlight: function (str, lang, attrs) {
      if (lang && lang.toLowerCase() === targetLang) {
        const data = parseFM(str);
        if (Object.keys(data).length > 0) {
          const tableHtml = options.renderTable(data);
          return '<pre style="all:unset;display:contents">' + tableHtml + '</pre>';
        }
      }
      if (originalHighlight) return originalHighlight(str, lang, attrs);
      return md.utils.escapeHtml(str);
    }
  });
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = frontmatter_plugin;
}
window.frontmatter_plugin = frontmatter_plugin;

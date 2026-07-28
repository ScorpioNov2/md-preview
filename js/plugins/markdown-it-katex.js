/* markdown-it-katex - Browser Native Vanilla JavaScript Edition */
(function (global, factory) {
    if (typeof exports === 'object' && typeof module !== 'undefined') {
        module.exports = factory(global.katex);
    } else if (typeof define === 'function' && define.amd) {
        define(['katex'], factory);
    } else {
        global.markdownItKatex = factory(global.katex);
    }
}(this, (function (katex) { 'use strict';

    function isValidDelim(state, pos) {
        var prevChar, nextChar,
            max = state.posMax,
            can_open = true,
            can_close = true;

        prevChar = pos > 0 ? state.src.charCodeAt(pos - 1) : -1;
        nextChar = pos + 1 < max ? state.src.charCodeAt(pos + 1) : -1;

        if (prevChar === 0x20 || prevChar === 0x09 || (nextChar >= 0x30 && nextChar <= 0x39)) {
            can_close = false;
        }
        if (nextChar === 0x20 || nextChar === 0x09) {
            can_open = false;
        }
        return { can_open: can_open, can_close: can_close };
    }

    function math_inline(state, silent) {
        var startCount, found, res, token, closeDelim,
            max = state.posMax,
            start = state.pos,
            res_open = isValidDelim(state, start);

        if (state.src.charCodeAt(start) !== 0x24) { return false; } 
        if (!res_open.can_open) { return false; }
        if (silent) { return false; }

        startCount = 1;
        while (start + startCount < max && state.src.charCodeAt(start + startCount) === 0x24) {
            startCount++;
        }
        if (startCount > 2) { return false; } 

        closeDelim = startCount === 2 ? '$$' : '$';
        found = false;
        state.pos = start + startCount;

        while (state.pos < max) {
            if (state.src.indexOf(closeDelim, state.pos) === state.pos) {
                res = isValidDelim(state, state.pos);
                if (res.can_close) {
                    found = true;
                    break;
                }
            }
            state.md.inline.skipToken(state);
        }

        if (!found) {
            state.pos = start;
            return false;
        }

        token = state.push(startCount === 2 ? 'math_block' : 'math_inline', 'math', 0);
        token.content = state.src.slice(start + startCount, state.pos);
        token.markup = closeDelim;

        state.pos += startCount;
        return true;
    }

    function math_block(state, startLine, endLine, silent) {
        var firstLine, lastLine, nextLine, token,
            pos = state.bMarks[startLine] + state.tShift[startLine],
            max = state.eMarks[startLine];

        if (pos + 2 > max) { return false; }
        if (state.src.charCodeAt(pos) !== 0x24 || state.src.charCodeAt(pos + 1) !== 0x24) {
            return false; 
        }

        pos += 2;
        firstLine = state.src.slice(pos, max);

        if (silent) { return true; }
        if (firstLine.trim().slice(-2) === '$$') {
            firstLine = firstLine.trim().slice(0, -2);
            token = state.push('math_block', 'math', 0);
            token.block = true;
            token.content = firstLine;
            token.map = [startLine, startLine + 1];
            state.line = startLine + 1;
            return true;
        }

        nextLine = startLine;
        for (;;) {
            nextLine++;
            if (nextLine >= endLine) { break; }

            pos = state.bMarks[nextLine] + state.tShift[nextLine];
            max = state.eMarks[nextLine];

            if (pos < max && state.tShift[nextLine] < state.blkIndent) { break; }
            if (state.src.slice(pos, max).trim().slice(-2) === '$$') { break; }
        }

        lastLine = state.src.slice(state.bMarks[nextLine] + state.tShift[nextLine], max).trim().slice(0, -2);
        
        token = state.push('math_block', 'math', 0);
        token.block = true;
        token.content = (firstLine && firstLine.trim() ? firstLine + '\n ' : '') +
                        state.getLines(startLine + 1, nextLine, state.tShift[startLine], false) +
                        (lastLine && lastLine.trim() ? lastLine : '');
        token.map = [startLine, nextLine + 1];
        state.line = nextLine + 1;
        return true;
    }

    return function katex_plugin(md, options) {
        options = options || {};
        
        var renderKatex = function (code, isBlock) {
            try {
                options.displayMode = isBlock;
                return katex.renderToString(code, options);
            } catch (err) {
                if (options.throwOnError) { throw err; }
                return '<span class="katex-error" title="' + code + '">' + err.message + '</span>';
            }
        };

        md.inline.ruler.after('escape', 'math_inline', math_inline);
        md.block.ruler.after('blockquote', 'math_block', math_block, {
            alt: ['paragraph', 'reference', 'blockquote', 'list']
        });

        md.renderer.rules.math_inline = function (tokens, idx) {
            return renderKatex(tokens[idx].content, false);
        };
        md.renderer.rules.math_block = function (tokens, idx) {
            return renderKatex(tokens[idx].content, true) + '\n ';
        };
    };
})));

/**
 * md-editor-shortcuts.js
 * -----------------------------------------------------------------------
 * Bộ phím tắt soạn thảo kiểu VS Code cho MỌI <textarea> thuần (không cần
 * Monaco/CodeMirror): di chuyển dòng, nhân bản dòng, nhảy tới lần xuất hiện
 * tiếp theo của đoạn đang bôi đen, và cuộn khung nhìn tới 1 vị trí ký tự.
 *
 * THIẾT KẾ THEO HƯỚNG THƯ VIỆN:
 * - Không đọc/ghi bất kỳ biến toàn cục nào của app. Mọi hàm nhận `textarea`
 *   (hoặc value/selection thuần) làm tham số, KHÔNG giả định có sẵn biến
 *   `input` hay bất kỳ state nào của app đang dùng nó.
 * - Không tự ý gọi lại các hàm render/undo của app (updatePreview, v.v...).
 *   moveLine/duplicateLine trả về true/false báo có thay đổi hay không; app
 *   tự quyết định làm gì tiếp theo (re-render, push undo...) sau khi gọi.
 * - scrollPositionIntoView() dùng options.getWrapHeights (tuỳ chọn) để hỗ
 *   trợ word-wrap nếu app có cơ chế đo riêng; nếu không cung cấp, tự động
 *   fallback về tính theo lineHeight cố định (vẫn đúng cho trường hợp không
 *   word-wrap, tức đa số các textarea thông thường).
 *
 * Sử dụng (không cần bundler, gắn thẳng vào window):
 *   <script src="./js/lib/md-editor-shortcuts.js"></script>
 *   MDEditorShortcuts.moveLine(myTextarea, 'up');
 *
 * API:
 *   getFullLineBounds(value, selStart, selEnd) -> {lineStart, lineEnd}
 *   moveLine(textarea, direction)              -> boolean (có đổi hay không)
 *   duplicateLine(textarea, direction)         -> boolean (luôn true, trừ khi lỗi tham số)
 *   jumpToNextMatch(textarea)                  -> boolean (có tìm thấy & nhảy hay không)
 *   scrollPositionIntoView(textarea, charPosition, options)
 *   attachShortcuts(textarea, options) -> function (gọi để gỡ listener)
 *     Cách nhanh nhất để bật cả 3 phím tắt (Alt+↑/↓, Shift+Alt+↑/↓, Ctrl+D) mà
 *     không cần tự viết keydown handler. options giống scrollPositionIntoView,
 *     cộng thêm optional onChange(textarea, kind) được gọi mỗi khi có thay đổi
 *     ('move' | 'duplicate' | 'jump') để app tự re-render/push undo nếu muốn.
 */
(function (global) {
    'use strict';

    // Tìm ranh giới "trọn vẹn theo dòng" bao quanh vùng đang bôi đen (hoặc con trỏ nếu không bôi đen gì).
    // Nếu vùng chọn kết thúc đúng ngay đầu 1 dòng (không chọn ký tự nào của dòng đó) thì KHÔNG tính
    // dòng đó vào — giống hệt cách VS Code xác định "trọn dòng" khi bôi đen nhiều dòng.
    function getFullLineBounds(value, selStart, selEnd) {
        var lineStart = value.lastIndexOf('\n', selStart - 1) + 1;
        var lineEnd;
        if (selEnd > selStart && value[selEnd - 1] === '\n') {
            lineEnd = selEnd;
        } else {
            var idx = value.indexOf('\n', selEnd);
            lineEnd = idx === -1 ? value.length : idx + 1;
        }
        return { lineStart: lineStart, lineEnd: lineEnd };
    }

    function moveLine(textarea, direction) {
        var value = textarea.value;
        var selStart = textarea.selectionStart, selEnd = textarea.selectionEnd;
        var b = getFullLineBounds(value, selStart, selEnd);
        if (direction === 'up' && b.lineStart === 0) return false;         // đã ở dòng đầu
        if (direction === 'down' && b.lineEnd >= value.length) return false; // đã ở dòng cuối

        var selOffStart = selStart - b.lineStart, selOffEnd = selEnd - b.lineStart;

        if (direction === 'up') {
            var prevLineStart = value.lastIndexOf('\n', b.lineStart - 2) + 1;
            var prevBlock = value.slice(prevLineStart, b.lineStart);   // luôn có \n cuối
            var curBlock = value.slice(b.lineStart, b.lineEnd);
            var curHadNL = curBlock.charAt(curBlock.length - 1) === '\n';
            var curBody = curHadNL ? curBlock.slice(0, -1) : curBlock;
            var prevBody = prevBlock.slice(0, -1);

            var replacement = curBody + '\n' + prevBody + (curHadNL ? '\n' : '');
            textarea.value = value.slice(0, prevLineStart) + replacement + value.slice(b.lineEnd);
            textarea.selectionStart = prevLineStart + selOffStart;
            textarea.selectionEnd = prevLineStart + selOffEnd;
        } else {
            var nextIdx = value.indexOf('\n', b.lineEnd);
            var nextLineEnd = nextIdx === -1 ? value.length : nextIdx + 1;
            var nextBlock = value.slice(b.lineEnd, nextLineEnd);
            var curBlock2 = value.slice(b.lineStart, b.lineEnd); // luôn có \n cuối (vì lineEnd < length)
            var nextHadNL = nextBlock.charAt(nextBlock.length - 1) === '\n';
            var nextBody = nextHadNL ? nextBlock.slice(0, -1) : nextBlock;
            var curBody2 = curBlock2.slice(0, -1);

            var replacement2 = nextBody + '\n' + curBody2 + (nextHadNL ? '\n' : '');
            textarea.value = value.slice(0, b.lineStart) + replacement2 + value.slice(nextLineEnd);
            var shift = nextBody.length + 1;
            textarea.selectionStart = b.lineStart + shift + selOffStart;
            textarea.selectionEnd = b.lineStart + shift + selOffEnd;
        }
        return true;
    }

    function duplicateLine(textarea, direction) {
        var value = textarea.value;
        var selStart = textarea.selectionStart, selEnd = textarea.selectionEnd;
        var b = getFullLineBounds(value, selStart, selEnd);
        var selOffStart = selStart - b.lineStart, selOffEnd = selEnd - b.lineStart;
        var block = value.slice(b.lineStart, b.lineEnd);
        var hasNL = block.charAt(block.length - 1) === '\n';
        var body = hasNL ? block.slice(0, -1) : block;

        if (direction === 'down') {
            // Bản copy chèn NGAY SAU khối gốc; con trỏ/selection nhảy theo bản copy (ở dưới)
            var insertionDown = hasNL ? block : ('\n' + body);
            textarea.value = value.slice(0, b.lineEnd) + insertionDown + value.slice(b.lineEnd);
            var copyStart = b.lineEnd + (hasNL ? 0 : 1);
            textarea.selectionStart = copyStart + selOffStart;
            textarea.selectionEnd = copyStart + selOffEnd;
        } else {
            // Bản copy chèn NGAY TRƯỚC khối gốc; con trỏ/selection nhảy theo bản copy (ở trên)
            var insertionUp = body + '\n';
            textarea.value = value.slice(0, b.lineStart) + insertionUp + value.slice(b.lineStart);
            textarea.selectionStart = b.lineStart + selOffStart;
            textarea.selectionEnd = b.lineStart + selOffEnd;
        }
        return true;
    }

    function jumpToNextMatch(textarea) {
        var value = textarea.value;
        var selStart = textarea.selectionStart;
        var selEnd = textarea.selectionEnd;

        if (selStart === selEnd) return false; // chưa bôi đen gì thì không có gì để "nhảy tiếp theo"

        var needle = value.slice(selStart, selEnd);
        var foundIndex = value.indexOf(needle, selEnd);

        if (foundIndex === -1) {
            foundIndex = value.indexOf(needle, 0); // hết file thì quay vòng lại từ đầu
            if (foundIndex === selStart || foundIndex === -1) return false; // không còn chỗ nào khác
        }

        // NOT WORK
        // textarea.selectionStart = foundIndex;
        // textarea.selectionEnd = foundIndex + needle.length;
        // textarea.focus();

        // Đưa việc gán selection vào setTimeout để chạy sau các sự kiện của Editor
        // NO SCROLL BY X AXIS
        // setTimeout(function () {
        //     textarea.focus();
        //     // Dùng phương thức chuẩn để trình duyệt cập nhật UI tốt hơn
        //     textarea.setSelectionRange(foundIndex, foundIndex + needle.length);

        //     // Tự động cuộn màn hình đến vị trí từ vừa tìm thấy nếu text quá dài
        //     var lineHeight = 20; // ước lượng chiều cao 1 dòng
        //     var textBefore = value.substring(0, foundIndex);
        //     var linesBefore = textBefore.split('\n').length;
        //     textarea.scrollTop = (linesBefore - 3) * lineHeight;
        // }, 0);

        // MAGIC NUMBER
        // setTimeout(function () {
        //     textarea.focus();
        //     textarea.setSelectionRange(foundIndex, foundIndex + needle.length);

        //     // 1. Tính vị trí dòng (Chiều dọc - Y)
        //     var textBefore = value.substring(0, foundIndex);
        //     var lines = textBefore.split('\n');
        //     var currentLineIndex = lines.length - 1; // Dòng hiện tại chứa từ khóa

        //     var lineHeight = 20; // Chiều cao mỗi dòng (px)
        //     textarea.scrollTop = (currentLineIndex - 2) * lineHeight;

        //     // 2. Tính vị trí ký tự trên dòng đó (Chiều ngang - X)
        //     var textOnCurrentLine = lines[currentLineIndex]; // Đoạn văn bản của riêng dòng đó
        //     var charWidth = 8.5; // Độ rộng ước lượng của 1 ký tự (px)

        //     // Đặt scrollLeft đưa từ khóa vào khoảng giữa hoặc cách lề trái 1 đoạn
        //     textarea.scrollLeft = (textOnCurrentLine.length * charWidth) - 500;
        // }, 0);

        setTimeout(function () {
            textarea.focus();
            textarea.setSelectionRange(foundIndex, foundIndex + needle.length);

            // 1. Đọc trực tiếp các giá trị CSS thực tế từ trình duyệt (Xóa bỏ magic number)
            var style = window.getComputedStyle(textarea);
            var lineHeight = parseFloat(style.lineHeight) || parseFloat(style.fontSize) * 1.2; // Chiều cao dòng thực tế
            var fontSize = parseFloat(style.fontSize); // Dùng làm độ rộng ước lượng của ký tự
            var textareaWidth = textarea.clientWidth; // Chiều rộng hiển thị của khung textarea

            // 2. Xác định vị trí dòng và ký tự
            var textBefore = value.substring(0, foundIndex);
            var lines = textBefore.split('\n');
            var currentLineIndex = lines.length - 1; // Dòng hiện tại
            var textOnCurrentLine = lines[currentLineIndex]; // Đoạn text tính từ đầu dòng đến từ cần tìm

            // 3. Set vị trí cuộn (Scroll) tự động căn giữa
            // Cuộn dọc: Đưa dòng tìm thấy vào giữa khung nhìn theo chiều dọc
            textarea.scrollTop = (currentLineIndex * lineHeight) - (textarea.clientHeight / 2) + (lineHeight / 2);

            // Cuộn ngang: Tính khoảng cách dựa trên fontSize, đưa từ tìm thấy vào giữa khung ngang
            var estimatedLeft = textOnCurrentLine.length * (fontSize * 0.6); // 0.6 là tỷ lệ vàng của font chữ Monospace
            textarea.scrollLeft = estimatedLeft - (textareaWidth / 2);
        }, 0);

        return true;
    }

    // ---- Đo bề rộng pixel của 1 đoạn text bằng ĐÚNG font hiện tại của textarea ----
    // Dùng 1 phần tử đo ẩn riêng của thư viện (không phụ thuộc app cung cấp).
    var _measureEl = null;
    function _ensureMeasureEl(doc) {
        if (_measureEl && _measureEl.ownerDocument === doc) return _measureEl;
        _measureEl = doc.createElement('span');
        _measureEl.style.cssText = 'position:fixed;visibility:hidden;pointer-events:none;'
            + 'white-space:pre;top:-9999px;left:-9999px;';
        doc.body.appendChild(_measureEl);
        return _measureEl;
    }
    function _measureTextWidth(textarea, text) {
        var doc = textarea.ownerDocument || document;
        var el = _ensureMeasureEl(doc);
        var cs = doc.defaultView.getComputedStyle(textarea);
        el.style.font = cs.font || (cs.fontSize + ' ' + cs.fontFamily);
        el.textContent = text;
        return el.offsetWidth;
    }

    /**
     * Cuộn textarea (dọc + ngang) để đưa 1 vị trí ký tự vào giữa khung nhìn.
     * options:
     *   lineHeight    {number}   bắt buộc nếu không dùng CSS line-height cố định biết trước
     *   wordWrap      {boolean}  mặc định false
     *   getWrapHeights {function} -> number[] chiều cao pixel từng dòng logic (tuỳ chọn,
     *                              chỉ cần khi wordWrap=true và muốn tính đúng dòng bị wrap)
     */
    function scrollPositionIntoView(textarea, charPosition, options) {
        options = options || {};
        var lineHeight = options.lineHeight || 20;
        var wordWrap = !!options.wordWrap;
        var getWrapHeights = typeof options.getWrapHeights === 'function' ? options.getWrapHeights : null;

        var value = textarea.value;
        var lineIndex = 0;
        for (var i = 0; i < charPosition && i < value.length; i++) {
            if (value.charCodeAt(i) === 10) lineIndex++;
        }

        var clientH = textarea.clientHeight;
        var wrapHeights = (wordWrap && getWrapHeights) ? getWrapHeights() : null;
        var lineTop, lineH;
        if (wrapHeights) {
            lineTop = 0;
            for (var k = 0; k < lineIndex; k++) lineTop += (wrapHeights[k] || lineHeight);
            lineH = wrapHeights[lineIndex] || lineHeight;
        } else {
            lineTop = lineIndex * lineHeight;
            lineH = lineHeight;
        }

        // Cuộn DỌC: canh vị trí vào giữa khung nhìn hiện tại
        var maxScrollTop = Math.max(0, textarea.scrollHeight - clientH);
        var targetScrollTop = lineTop - (clientH / 2) + (lineH / 2);
        textarea.scrollTop = Math.max(0, Math.min(targetScrollTop, maxScrollTop));

        // Cuộn NGANG: chỉ cần thiết khi KHÔNG word-wrap (bật wrap thì dòng tự xuống, không tràn ngang)
        if (!wordWrap) {
            var lineStartIdx = value.lastIndexOf('\n', charPosition - 1) + 1;
            var textBeforeOnLine = value.slice(lineStartIdx, charPosition);
            var xPos = _measureTextWidth(textarea, textBeforeOnLine);

            var clientW = textarea.clientWidth;
            var margin = 40;
            if (xPos < textarea.scrollLeft + margin) {
                textarea.scrollLeft = Math.max(0, xPos - margin);
            } else if (xPos > textarea.scrollLeft + clientW - margin) {
                textarea.scrollLeft = xPos - clientW + margin;
            }
        }
    }

    /**
     * Gắn sẵn cả 3 tổ hợp phím (Alt+↑/↓, Shift+Alt+↑/↓, Ctrl/Cmd+D) vào 1 textarea.
     * Trả về hàm huỷ đăng ký (gọi khi không cần nữa, ví dụ khi unmount).
     * options: giống scrollPositionIntoView, cộng thêm onChange(textarea, kind).
     */
    function attachShortcuts(textarea, options) {
        options = options || {};
        var onChange = typeof options.onChange === 'function' ? options.onChange : function () { };

        function handler(e) {
            if (e.altKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
                e.preventDefault();
                var dir = e.key === 'ArrowUp' ? 'up' : 'down';
                var changed;
                if (e.shiftKey) { duplicateLine(textarea, dir); changed = true; }
                else { changed = moveLine(textarea, dir); }
                if (changed) {
                    scrollPositionIntoView(textarea, textarea.selectionStart, options);
                    onChange(textarea, e.shiftKey ? 'duplicate' : 'move');
                }
                return;
            }
            if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && (e.key === 'd' || e.key === 'D')) {
                e.preventDefault();
                if (jumpToNextMatch(textarea)) {
                    scrollPositionIntoView(textarea, textarea.selectionStart, options);
                    onChange(textarea, 'jump');
                }
                return;
            }
        }

        textarea.addEventListener('keydown', handler);
        return function detach() { textarea.removeEventListener('keydown', handler); };
    }

    var MDEditorShortcuts = {
        getFullLineBounds: getFullLineBounds,
        moveLine: moveLine,
        duplicateLine: duplicateLine,
        jumpToNextMatch: jumpToNextMatch,
        scrollPositionIntoView: scrollPositionIntoView,
        attachShortcuts: attachShortcuts
    };

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = MDEditorShortcuts; // cho phép require() khi test/dùng ở Node
    }
    global.MDEditorShortcuts = MDEditorShortcuts;
})(typeof window !== 'undefined' ? window : this);

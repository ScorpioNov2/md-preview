/**
 * md-editor-undo.js
 * -----------------------------------------------------------------------
 * Undo tuỳ chỉnh cho <textarea> thuần, giới hạn số bước.
 *
 * VÌ SAO CẦN THAY VÌ DÙNG UNDO GỐC CỦA TRÌNH DUYỆT:
 * Textarea có undo gốc, nhưng bất kỳ thao tác nào gán thẳng `textarea.value = ...`
 * bằng JS (move line, duplicate line, format lại nội dung, v.v...) đều làm "vỡ"
 * ngăn xếp undo gốc ở hầu hết trình duyệt — undo gốc chỉ theo dõi thao tác gõ/
 * paste thật của người dùng, không biết gì về thay đổi do code tạo ra.
 *
 * THIẾT KẾ THEO HƯỚNG THƯ VIỆN:
 * - Không giả định biến toàn cục nào. createUndoManager(textarea, options) nhận
 *   thẳng phần tử textarea; mọi state (lịch sử, timer...) nằm trong closure
 *   riêng của từng manager, tạo nhiều textarea độc lập nhau vẫn dùng được.
 * - Không tự gọi render/gutter update của app. Sau khi undo() khôi phục xong,
 *   gọi lại `options.onRestore(snapshot)` để APP tự quyết định làm gì tiếp
 *   theo (re-render preview, cuộn tới vị trí con trỏ...).
 *
 * Sử dụng:
 *   <script src="./js/lib/md-editor-undo.js"></script>
 *   var undoMgr = MDEditorUndo.createUndoManager(myTextarea, {
 *     maxSteps: 5,
 *     onRestore: function (snap) { myApp.render(); }
 *   });
 *   // Trước khi TỰ (bằng code) đổi textarea.value, luôn gọi:
 *   undoMgr.pushCheckpoint();
 *   textarea.value = ...;
 *   // Khi bắt Ctrl+Z:
 *   undoMgr.undo();
 *
 * API trả về từ createUndoManager:
 *   pushCheckpoint()      lưu snapshot HIỆN TẠI vào lịch sử (gọi TRƯỚC khi tự đổi value)
 *   undo()                -> boolean, khôi phục snapshot gần nhất, gọi onRestore nếu có
 *   canUndo()             -> boolean
 *   reset()                xoá sạch lịch sử (gọi khi chuyển sang "tài liệu" khác hẳn)
 *   destroy()               gỡ toàn bộ listener đã gắn, dừng timer đang chờ
 *   historyLength()        -> number (chủ yếu để debug/hiển thị)
 */
(function (global) {
    'use strict';

    var DEFAULT_MAX_STEPS = 5;
    var DEFAULT_BURST_DELAY_MS = 600;

    function createUndoManager(textarea, options) {
        options = options || {};
        var maxSteps = options.maxSteps || DEFAULT_MAX_STEPS;
        var burstDelayMs = (typeof options.burstDelayMs === 'number') ? options.burstDelayMs : DEFAULT_BURST_DELAY_MS;
        var onRestore = typeof options.onRestore === 'function' ? options.onRestore : function () {};

        var history = [];
        var burstBaseline = snapshot();
        var burstActive = false;
        var burstTimer = null;

        function snapshot() {
            return {
                value: textarea.value,
                selectionStart: textarea.selectionStart,
                selectionEnd: textarea.selectionEnd
            };
        }

        function pushCheckpoint(explicitSnapshot) {
            history.push(explicitSnapshot || snapshot());
            if (history.length > maxSteps) history.shift(); // chỉ giữ đúng maxSteps bước gần nhất
        }

        // Gọi sau MỌI thay đổi value (dù do undo() hay do code khác của app) để cụm gõ
        // tiếp theo (nếu có) checkpoint đúng từ trạng thái VỪA đổi, không "nhớ nhầm" mốc cũ.
        function syncBurstBaseline() {
            burstActive = false;
            if (burstTimer) { clearTimeout(burstTimer); burstTimer = null; }
            burstBaseline = snapshot();
        }

        function reset() {
            history = [];
            syncBurstBaseline();
        }

        function undo() {
            if (history.length === 0) return false;
            var snap = history.pop();
            textarea.value = snap.value;
            textarea.selectionStart = snap.selectionStart;
            textarea.selectionEnd = snap.selectionEnd;
            syncBurstBaseline(); // tránh cụm gõ sau đó lại checkpoint nhầm về mốc trước khi undo
            onRestore(snap);
            return true;
        }

        function canUndo() {
            return history.length > 0;
        }

        function historyLength() {
            return history.length;
        }

        // Theo dõi "cụm gõ liên tục": mỗi cụm (phân tách bởi khoảng dừng > burstDelayMs) chỉ
        // tạo ĐÚNG 1 checkpoint, thay vì mỗi ký tự gõ vào lại chiếm mất 1 "suất" undo ít ỏi.
        function onInput() {
            if (!burstActive) {
                pushCheckpoint(burstBaseline);
                burstActive = true;
            }
            if (burstTimer) clearTimeout(burstTimer);
            burstTimer = setTimeout(function () {
                burstActive = false;
                burstBaseline = snapshot();
            }, burstDelayMs);
        }
        textarea.addEventListener('input', onInput);

        function destroy() {
            textarea.removeEventListener('input', onInput);
            if (burstTimer) clearTimeout(burstTimer);
        }

        return {
            // Không truyền gì -> tự chụp trạng thái HIỆN TẠI rồi lưu.
            // Truyền vào 1 snapshot (lấy từ getSnapshot() trước đó) -> lưu ĐÚNG snapshot đó.
            // Cần thiết cho các thao tác kiểu "đổi value rồi mới biết có nên lưu undo hay không"
            // (như moveLine/duplicateLine: đổi value trước, trả về true/false sau) — gọi getSnapshot()
            // TRƯỚC khi đổi, rồi chỉ pushCheckpoint(đó) nếu thao tác thực sự có thay đổi gì.
            pushCheckpoint: function (explicitSnapshot) { pushCheckpoint(explicitSnapshot); },
            getSnapshot: snapshot,
            undo: undo,
            canUndo: canUndo,
            reset: reset,
            destroy: destroy,
            historyLength: historyLength
        };
    }

    var MDEditorUndo = { createUndoManager: createUndoManager };

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = MDEditorUndo;
    }
    global.MDEditorUndo = MDEditorUndo;
})(typeof window !== 'undefined' ? window : this);

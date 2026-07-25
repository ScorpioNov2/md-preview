/**
 * Tệp cấu hình gốc chỉnh sửa cho môi trường Trình duyệt (JS thuần)
 * Phụ thuộc: Cần nhúng thêm thư viện lodash (nếu dùng hàm merge) 
 * Hoặc bạn có thể tự viết một hàm gộp cấu hình đơn giản để chạy độc lập.
 */
(function() {
  // Thay thế các hàm require bằng cách đọc từ biến toàn cục window
  const merge = window._ ? window._.merge : Object.assign; 
  
  // Khởi tạo thư viện Clipboard nếu có nhúng sẵn tệp clipboard.js
  let clipboard = null;
  if (typeof window.ClipboardJS !== 'undefined') {
    clipboard = new window.ClipboardJS(".markdown-it-code-copy");
  }

  const defaultOptions = {
    iconStyle: "font-size: 21px; opacity: 0.4;",
    iconClass: "mdi mdi-content-copy",
    buttonStyle: "position: absolute; top: 7.5px; right: 6px; cursor: pointer; outline: none;",
    buttonClass: "",
    element: "",
    removeEndNewline: false
  };

  function renderCode(e, o) {
    o = merge({}, defaultOptions, o);
    return (...n) => {
      const [t, r] = n;
      let l = t[r].content.replaceAll('"', "&quot;").replaceAll("'", "&apos;");
      if (true === o.removeEndNewline) {
        l = l.replace(/(\r\n|\n|\r)+$/, "");
      }
      
      // Kiểm tra hàm render gốc của markdown-it để tránh crash hệ thống
      const c = (typeof e === 'function') ? e(...n) : md.utils.escapeHtml(t[r].content);
      
      return 0 === l.length ? c : `\n<div style="position: relative">\n\t${c}\n\t<button class="markdown-it-code-copy ${o.buttonClass}" data-clipboard-text="${l}" style="${o.buttonStyle}" title="Copy">\n\t\t<span style="${o.iconStyle}" class="${o.iconClass}">${o.element}</span>\n\t</button>\n</div>\n`;
    };
  }

  // THAY THẾ CHO MODULE.EXPORTS: Gắn trực tiếp hàm vào đối tượng window toàn cục
  window.markdownItCodeCopy = function(e, o) {
    o = o || {};
    if (clipboard) {
      if (o.onSuccess) clipboard.on("success", o.onSuccess);
      if (o.onError) clipboard.on("error", o.onError);
    }
    e.renderer.rules.code_block = renderCode(e.renderer.rules.code_block, o);
    e.renderer.rules.fence = renderCode(e.renderer.rules.fence, o);
  };
})();

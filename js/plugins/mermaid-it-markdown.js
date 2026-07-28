let getRandomValues;
const rnds8 = new Uint8Array(16);
function rng() {
  if (!getRandomValues) {
    getRandomValues = typeof crypto !== "undefined" && crypto.getRandomValues && crypto.getRandomValues.bind(crypto);
    if (!getRandomValues) {
      throw new Error("crypto.getRandomValues() not supported. See https://github.com/uuidjs/uuid#getrandomvalues-not-supported");
    }
  }
  return getRandomValues(rnds8);
}
const byteToHex = [];
for (let i = 0; i < 256; ++i) {
  byteToHex.push((i + 256).toString(16).slice(1));
}
function unsafeStringify(arr, offset = 0) {
  return byteToHex[arr[offset + 0]] + byteToHex[arr[offset + 1]] + byteToHex[arr[offset + 2]] + byteToHex[arr[offset + 3]] + "-" + byteToHex[arr[offset + 4]] + byteToHex[arr[offset + 5]] + "-" + byteToHex[arr[offset + 6]] + byteToHex[arr[offset + 7]] + "-" + byteToHex[arr[offset + 8]] + byteToHex[arr[offset + 9]] + "-" + byteToHex[arr[offset + 10]] + byteToHex[arr[offset + 11]] + byteToHex[arr[offset + 12]] + byteToHex[arr[offset + 13]] + byteToHex[arr[offset + 14]] + byteToHex[arr[offset + 15]];
}
const randomUUID = typeof crypto !== "undefined" && crypto.randomUUID && crypto.randomUUID.bind(crypto);
const native = {
  randomUUID
};
function v4(options, buf, offset) {
  if (native.randomUUID && !buf && !options) {
    return native.randomUUID();
  }
  options = options || {};
  const rnds = options.random || (options.rng || rng)();
  rnds[6] = rnds[6] & 15 | 64;
  rnds[8] = rnds[8] & 63 | 128;
  if (buf) {
    offset = offset || 0;
    for (let i = 0; i < 16; ++i) {
      buf[offset + i] = rnds[i];
    }
    return buf;
  }
  return unsafeStringify(rnds);
}
const genUid = (split = "") => {
  return v4().split("-").join(split);
};
const hashCode = (str) => {
  let hash = 0;
  if (str.length === 0)
    return hash;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
};
const mermaidCache = /* @__PURE__ */ new Map();
const MAX_CACHE_SIZE = 200;
const mermaidCacheCount = /* @__PURE__ */ new Map();
let count = 0;
const clearCache = () => {
  if (mermaidCache.size <= MAX_CACHE_SIZE)
    return;
  const entries = Array.from(mermaidCacheCount.entries());
  entries.sort((a, b) => a[1] - b[1]);
  const deleteCount = Math.floor(entries.length / 2);
  for (let i = 0; i < deleteCount; i++) {
    const key = entries[i][0];
    mermaidCache.delete(key);
    mermaidCacheCount.delete(key);
  }
};
const renderMermaid = async (code, targetId) => {
  const container = document.getElementById(targetId);
  if (!container)
    return;
  try {
    const { svg } = await mermaid.render("mermaid-svg-" + genUid(), code);
    container.innerHTML = svg;
    mermaidCache.set(targetId, svg);
    mermaidCacheCount.set(targetId, count);
  } catch (e) {
    console.error("Mermaid rendering error:", e);
    container.innerHTML = `<div style="color: red; padding: 10px; border: 1px solid red;">Mermaid Error: ${e.message || "Invalid syntax"}</div>`;
  }
};
const MermaidIt = function(md) {
  mermaid.initialize({ startOnLoad: false });
  const defaultRenderer = md.renderer.rules.fence.bind(md.renderer.rules);
  md.renderer.rules.fence = (tokens, idx, options, env, self) => {
    count++;
    clearCache();
    const token = tokens[idx];
    const info = token.info.trim();
    if (info === "mermaid") {
      const containerId = "mermaid-container-" + hashCode(token.content);
      const cachedSvg = mermaidCache.get(containerId);
      if (cachedSvg) {
        mermaidCacheCount.set(containerId, count);
        return `<div id="${containerId}">${cachedSvg}</div>`;
      } else {
        setTimeout(() => renderMermaid(token.content, containerId), 0);
        return `<div id="${containerId}">Loading mermaid...</div>`;
      }
    }
    return defaultRenderer(tokens, idx, options, env, self);
  };
};
window.MermaidIt = MermaidIt;
window.markdownitMermaid = MermaidIt;
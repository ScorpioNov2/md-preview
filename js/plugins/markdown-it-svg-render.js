function markdownItSvgRender(md) {
  // Save the original fence renderer
  const defaultFence = md.renderer.rules.fence || function(tokens, idx, options, env, self) {
    return self.renderToken(tokens, idx, options);
  };

  // Override the fence rule
  md.renderer.rules.fence = (tokens, idx, options, env, self) => {
    const token = tokens[idx];
    const info = token.info.trim().split(/\s+/)[0];

    // If the fence language is 'svg', render raw contents
    if (info === 'svg') {
      return `<div class="markdown-svg-container">${token.content.trim()}</div>`;
    }

    // Fall back to default rendering for code blocks like javascript, css, etc.
    return defaultFence(tokens, idx, options, env, self);
  };
}

window.markdownItSvgRender = markdownItSvgRender


// Custom rule to intercept ```svg fenced code blocks
// const defaultFenceRenderer = md.renderer.rules.fence;

// md.renderer.rules.fence = (tokens, idx, options, env, self) => {
//   const token = tokens[idx];

//   // Check if the block language is explicitly marked as 'svg'
//   if (token.info.trim() === 'svg') {
//     return `<div>${token.content}</div>`; // Return the raw SVG wrapped in a container
//   }

//   // Pass back to the default renderer for other languages (js, html, css, etc.)
//   return defaultFenceRenderer(tokens, idx, options, env, self);
// };
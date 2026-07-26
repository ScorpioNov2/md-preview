# md-preview

A lightweight, high-performance Markdown parser and real-time previewer built with Vanilla JS, powered by the `markdown-it` base engine.

## ✨ Features

* **Zero Frameworks:** Written entirely in pure Vanilla JavaScript for maximum speed and zero dependencies.
* **Blazing Fast:** Inherits the high-speed, structural rendering capabilities of the `markdown-it` core.
* **Extensive Syntax:** Smoothly processes standard Markdown format and supports multiple extended syntax features.

## 🚀 Quick Start

### Option 1: Run Directly in Browser

1. Clone the repository:
   ```bash
   git clone https://github.com/ScorpioNov2/md-preview
   ```
2. Open the `index.html` file directly in any modern web browser.

### Option 2: Local Development (Recommended)

For an optimal development workflow with automatic page reloads:
1. Open the project folder in VS Code.
2. Install the **Live Server** extension from the marketplace.
3. Right-click on `index.html` and select **Open with Live Server**.

## 📁 Project Structure

```text
├── index.html          # Main application interface
├── USAGE.md            # The markdown syntax cheatsheet - [Link reference](https://github.com/ScorpioNov2/md-preview/USAGE.md)
├── README.md           # General information about this application
├── index.html          # Main application interface
├── css/
│   └── style.css       # Native UI styling (Vanilla CSS)
└── js/
    └── plugins.js      # Markdown-it plugins
```

**Source:** [ScorpioNov2/md-preview](https://github.com/ScorpioNov2/md-preview) · Plugin directory: [`/js`](https://github.com/ScorpioNov2/md-preview/tree/main/js) · Main config: [`index.html`](https://github.com/ScorpioNov2/md-preview/blob/main/index.html)

## 🛠️ Tech Stack

* [markdown-it](https://github.com/markdown-it/markdown-it) - Core Markdown parsing engine.
* Vanilla JavaScript (ES6+).
* Native CSS3.

## 👥 Author

* **ScorpioNov2** - *Initial Work / Maintainer* - [GitHub Profile](https://github.com/ScorpioNov2/md-preview)

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Library & Version Summary Table

| Library | Version | Role |
| --- | --- | --- |
| markdown-it | 14.3.0 | Core Markdown parsing engine |
| KaTeX | 0.17.0 | Render math formulas |
| highlight.js | 11.11.1 | Code syntax highlighting |
| markdown-it-task-lists | 2.1.0 | Task lists (checkboxes) |
| markdown-it-code-copy | 0.2.3 | Copy button on code blocks |
| markdown-it-anchor | 9.2.1 | Anchor links for headings |
| markdown-it-toc-done-right | 4.2.0 | Automatic TOC `[[toc]]` |
| markdown-it-emoji | 3.0.0 | `:shortcode:` Emoji |
| markdown-it-mark | 4.0.0 | `==mark==` |
| markdown-it-container | 4.0.0 | `::: type` Container |
| markdown-it-footnote | 4.0.0 | Footnotes |
| markdown-it-sub / -sup | 2.0.0 | Subscript / Superscript |
| markdown-it-abbr | 2.0.0 | Abbreviations |
| markdown-it-deflist | 3.0.1 | Definition lists |
| mermaid | 11.16.0 | Render Mermaid diagrams |
| markdown-it-kbd | 3.0.2 | `<kbd>` tag |
| markdown-it-ins | 4.0.0 | `++inserted++` |
| markdown-it-external-links | 0.0.6 | External link attributes |
| markdown-it-implicit-figures | 0.12.0 | Images → `<figure>` |
| DOMPurify | 3.4.12 | HTML sanitization, XSS prevention |
| markdown-it-video | 0.6.3 | Video embeds `@[service](id)` |
| svg-pan-zoom | 3.6.2 | Drag/zoom Mermaid diagrams |
| markdown-it-svg-render | Custom | Render `svg` blocks into images |

*(Data source: the project's [`deps.txt`](https://github.com/ScorpioNov2/md-preview/blob/main/deps.txt) file.)*

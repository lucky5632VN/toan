/**
 * Simple markdown → HTML converter (no external deps).
 */
export function parseMarkdown(text: string): string {
  let html = text;

  // Escape HTML entities first
  html = html
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Code blocks (``` ... ```)
  html = html.replace(/```(\w*)\n?([\s\S]*?)```/g, (_match, _lang, code) => {
    return `<pre style="background:#0d1117;border:1px solid #30363d;border-radius:8px;padding:0.8rem;overflow-x:auto;margin:0.5rem 0;font-size:0.8rem"><code>${code.trim()}</code></pre>`;
  });

  // Headings
  html = html.replace(/^### (.+)$/gm, '<h3 style="font-size:0.9rem;font-weight:600;margin:0.5rem 0 0.2rem">$1</h3>');
  html = html.replace(/^## (.+)$/gm,  '<h2 style="font-size:1rem;font-weight:600;margin:0.5rem 0 0.2rem">$1</h2>');
  html = html.replace(/^# (.+)$/gm,   '<h1 style="font-size:1.1rem;font-weight:700;margin:0.5rem 0 0.2rem">$1</h1>');

  // Bold + Italic
  html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
  html = html.replace(/\*\*(.+?)\*\*/g,     '<strong>$1</strong>');
  html = html.replace(/\*(.+?)\*/g,         '<em>$1</em>');

  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code style="background:rgba(0,0,0,0.3);border-radius:3px;padding:0.1em 0.35em;font-size:0.82em">$1</code>');

  // List items
  html = html.replace(/^[\-\*] (.+)$/gm, '<li style="margin:0.15rem 0">$1</li>');
  html = html.replace(/(<li[\s\S]+?<\/li>)/g, '<ul style="padding-left:1.2rem;margin:0.3rem 0">$1</ul>');

  // Paragraphs
  html = html
    .split(/\n{2,}/)
    .map(block => {
      block = block.trim();
      if (!block) return '';
      if (/^<(h[1-6]|ul|ol|li|pre|hr)/.test(block)) return block;
      return `<p style="margin:0.3rem 0">${block.replace(/\n/g, '<br />')}</p>`;
    })
    .join('\n');

  return html;
}

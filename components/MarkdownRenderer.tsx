import React from 'react';

// Advanced Markdown Renderer for AI Copilot
// Supports: headings, bold, italic, code, lists, blockquotes, links, tables

interface MarkdownRendererProps {
  text: string;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ text }) => {
  if (!text) return null;

  // Simple HTML escaping
  const escapeHtml = (str: string) =>
    str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  // Parse markdown to HTML (basic, safe)
  let html = escapeHtml(text)
    // Headings
    .replace(/^###### (.*)$/gm, '<h6 class="text-xs font-bold text-cyan-400 mt-2 mb-1">$1</h6>')
    .replace(/^##### (.*)$/gm, '<h5 class="text-sm font-bold text-cyan-400 mt-2 mb-1">$1</h5>')
    .replace(/^#### (.*)$/gm, '<h4 class="text-base font-bold text-cyan-400 mt-2 mb-1">$1</h4>')
    .replace(/^### (.*)$/gm, '<h3 class="text-base font-bold text-cyan-400 mt-2 mb-1 flex items-center gap-2"><span class="w-1 h-4 bg-cyan-400 rounded-full"></span>$1</h3>')
    .replace(/^## (.*)$/gm, '<h2 class="text-lg font-bold text-white mt-4 mb-2 border-b border-white/10 pb-2">$1</h2>')
    .replace(/^# (.*)$/gm, '<h1 class="text-xl font-black text-white mt-3 mb-2">$1</h1>')
    // Blockquotes
    .replace(/^> (.*)$/gm, '<blockquote class="border-l-4 border-cyan-400 pl-4 italic text-slate-300 my-2">$1</blockquote>')
    // Bold/italic/code
    .replace(/\*\*([^*]+)\*\*/g, '<strong class="font-bold text-white">$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em class="italic text-slate-300">$1</em>')
    .replace(/`([^`]+)`/g, '<code class="bg-slate-700/50 px-1.5 py-0.5 rounded text-cyan-400 font-mono text-[10px]">$1</code>')
    // Links
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-cyan-400 underline">$1</a>')
    // Unordered lists
    .replace(/^(\s*)[-*•] (.*)$/gm, '$1<li>$2</li>')
    .replace(/(<li>.*<\/li>)/g, '<ul class="list-disc ml-6 my-2">$1</ul>')
    // Ordered lists
    .replace(/^(\s*)\d+\. (.*)$/gm, '$1<li>$2</li>')
    .replace(/(<li>.*<\/li>)/g, '<ol class="list-decimal ml-6 my-2">$1</ol>')
    // Tables (very basic)
    .replace(/\|([^|]+)\|([^|]+)\|/g, '<tr><td class="px-2 py-1 border border-slate-700">$1</td><td class="px-2 py-1 border border-slate-700">$2</td></tr>')
    .replace(/(<tr>.*<\/tr>)/g, '<table class="my-2 border-collapse">$1</table>')
    // Paragraphs
    .replace(/\n{2,}/g, '</p><p class="text-slate-300 leading-relaxed my-1.5">')
    .replace(/\n/g, '<br />');

  // Wrap in a paragraph if not already
  if (!/^<p/.test(html)) {
    html = `<p class="text-slate-300 leading-relaxed my-1.5">${html}</p>`;
  }

  return <div className="space-y-0.5" dangerouslySetInnerHTML={{ __html: html }} />;
};

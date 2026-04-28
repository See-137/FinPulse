import React, { useMemo } from 'react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';

// Secure Markdown Renderer using marked + DOMPurify
// Prevents XSS attacks by sanitizing all HTML output
// Supports: headings, bold, italic, code, lists, blockquotes, links, tables

interface MarkdownRendererProps {
  text: string;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ text }) => {
  const sanitizedHtml = useMemo(() => {
    if (!text) return '';

    // Configure marked for secure rendering
    marked.setOptions({
      breaks: true, // Convert \n to <br>
      gfm: true, // GitHub Flavored Markdown
      // Note: headerIds and mangle removed in marked v5+
    });

    // Parse markdown to HTML
    const rawHtml = marked.parse(text) as string;

    // Sanitize HTML with DOMPurify to prevent XSS
    const cleanHtml = DOMPurify.sanitize(rawHtml, {
      ALLOWED_TAGS: [
        'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        'p', 'br', 'strong', 'em', 'code', 'pre',
        'ul', 'ol', 'li',
        'blockquote',
        'a',
        'table', 'thead', 'tbody', 'tr', 'th', 'td',
        'span', 'div'
      ],
      ALLOWED_ATTR: ['href', 'target', 'rel', 'class'],
      // Restrict URI schemes: https/http/mailto/tel and only image data: URIs.
      // The previous regex (`[^a-z]|[a-z+.-]+(?:[^a-z+.\-:]|$)`) allowed any
      // non-letter-prefixed URI, which permitted javascript: and data:text/html.
      ALLOWED_URI_REGEXP: /^(?:https?:|mailto:|tel:|data:image\/(?:png|jpeg|gif|webp);)/i,
    });

    // Apply custom styling classes
    return cleanHtml
      .replace(/<h1>/g, '<h1 class="text-xl font-black text-white mt-3 mb-2">')
      .replace(/<h2>/g, '<h2 class="text-lg font-bold text-white mt-4 mb-2 border-b border-white/10 pb-2">')
      .replace(/<h3>/g, '<h3 class="text-base font-bold text-cyan-400 mt-2 mb-1">')
      .replace(/<h4>/g, '<h4 class="text-base font-bold text-cyan-400 mt-2 mb-1">')
      .replace(/<h5>/g, '<h5 class="text-sm font-bold text-cyan-400 mt-2 mb-1">')
      .replace(/<h6>/g, '<h6 class="text-xs font-bold text-cyan-400 mt-2 mb-1">')
      .replace(/<p>/g, '<p class="text-slate-300 leading-relaxed my-1.5">')
      .replace(/<strong>/g, '<strong class="font-bold text-white">')
      .replace(/<em>/g, '<em class="italic text-slate-300">')
      .replace(/<code>/g, '<code class="bg-slate-700/50 px-1.5 py-0.5 rounded text-cyan-400 font-mono text-[10px]">')
      .replace(/<blockquote>/g, '<blockquote class="border-l-4 border-cyan-400 pl-4 italic text-slate-300 my-2">')
      .replace(/<ul>/g, '<ul class="list-disc ml-6 my-2">')
      .replace(/<ol>/g, '<ol class="list-decimal ml-6 my-2">')
      .replace(/<a /g, '<a target="_blank" rel="noopener noreferrer" class="text-cyan-400 underline hover:text-cyan-300" ')
      .replace(/<table>/g, '<table class="my-2 border-collapse border border-slate-700">')
      .replace(/<th>/g, '<th class="px-2 py-1 border border-slate-700 bg-slate-800 font-bold">')
      .replace(/<td>/g, '<td class="px-2 py-1 border border-slate-700">');
  }, [text]);

  if (!text) return null;

  return <div className="space-y-0.5" dangerouslySetInnerHTML={{ __html: sanitizedHtml }} />;
};

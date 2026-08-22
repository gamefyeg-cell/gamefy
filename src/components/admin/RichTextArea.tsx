"use client";

import { useRef } from "react";

/// A plain <textarea> with a tiny Bold/Bullet-list toolbar above it, for
/// admin fields rendered on the storefront via renderLiteMarkdown()
/// (src/lib/richtext.tsx — **bold** and "- " bullets). That renderer
/// already worked; admins just had no way to apply it besides typing the
/// raw ** and - symbols themselves. This inserts them for you instead of
/// adding a full WYSIWYG editor, so the stored value stays the same plain
/// text the rest of the app (search, SEO description, etc.) already expects.
export default function RichTextArea({
  name,
  defaultValue,
  rows = 4,
  placeholder,
}: {
  name: string;
  defaultValue?: string;
  rows?: number;
  placeholder?: string;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);

  function wrapSelection(marker: string) {
    const el = ref.current;
    if (!el) return;
    const { selectionStart: start, selectionEnd: end, value } = el;
    const selected = value.slice(start, end);
    el.value = value.slice(0, start) + marker + selected + marker + value.slice(end);
    const newStart = start + marker.length;
    el.focus();
    el.setSelectionRange(newStart, newStart + selected.length);
  }

  function toggleBulletLines() {
    const el = ref.current;
    if (!el) return;
    const { selectionStart: start, selectionEnd: end, value } = el;
    const lineStart = value.lastIndexOf("\n", start - 1) + 1;
    const nextBreak = value.indexOf("\n", end);
    const lineEnd = nextBreak === -1 ? value.length : nextBreak;

    const segment = value.slice(lineStart, lineEnd);
    const lines = segment.split("\n");
    const contentLines = lines.filter((l) => l.trim() !== "");
    const allBulleted = contentLines.length > 0 && contentLines.every((l) => /^\s*-\s+/.test(l));

    const newLines = lines.map((l) => {
      if (l.trim() === "") return l;
      if (allBulleted) return l.replace(/^\s*-\s+/, "");
      return /^\s*-\s+/.test(l) ? l : `- ${l}`;
    });
    const newSegment = newLines.join("\n");

    el.value = value.slice(0, lineStart) + newSegment + value.slice(lineEnd);
    el.focus();
    el.setSelectionRange(lineStart, lineStart + newSegment.length);
  }

  return (
    <div>
      <div className="flex items-center gap-1.5 mb-1.5">
        <button
          type="button"
          onClick={() => wrapSelection("**")}
          className="btn-secondary !px-2.5 !py-1 !text-xs font-bold"
          title="Bold selected text"
        >
          B
        </button>
        <button
          type="button"
          onClick={toggleBulletLines}
          className="btn-secondary !px-2.5 !py-1 !text-xs"
          title="Bullet list — turns the current line(s) into a bulleted list"
        >
          • List
        </button>
        <span className="text-[11px] text-slate-600">Select text first, or click with nothing selected to type inside the markers.</span>
      </div>
      <textarea ref={ref} name={name} defaultValue={defaultValue} rows={rows} placeholder={placeholder} className="input" />
    </div>
  );
}

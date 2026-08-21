import type { ReactNode } from "react";

// A deliberately tiny formatter — not a WYSIWYG editor, just enough for
// admin-typed product descriptions/notices to support **bold**, "- " bullet
// lists, and emoji/icons (typed directly, e.g. "🎮"), rendered properly on
// the storefront instead of as raw text.

function renderInline(text: string, keyPrefix: string): ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*)/g).filter(Boolean);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={`${keyPrefix}-${i}`}>{part.slice(2, -2)}</strong>;
    }
    return <span key={`${keyPrefix}-${i}`}>{part}</span>;
  });
}

export function renderLiteMarkdown(text: string): ReactNode {
  const lines = text.split("\n");
  const blocks: ReactNode[] = [];
  let bulletBuffer: string[] = [];

  const flushBullets = (key: string) => {
    if (bulletBuffer.length === 0) return;
    blocks.push(
      <ul key={key} className="list-disc list-inside space-y-1 my-1">
        {bulletBuffer.map((line, i) => (
          <li key={i}>{renderInline(line, `${key}-li-${i}`)}</li>
        ))}
      </ul>
    );
    bulletBuffer = [];
  };

  lines.forEach((line, idx) => {
    const bulletMatch = line.match(/^\s*[-•]\s+(.*)$/);
    if (bulletMatch) {
      bulletBuffer.push(bulletMatch[1]);
      return;
    }
    flushBullets(`bullets-${idx}`);
    if (line.trim() === "") {
      blocks.push(<br key={`br-${idx}`} />);
    } else {
      blocks.push(<div key={`line-${idx}`}>{renderInline(line, `line-${idx}`)}</div>);
    }
  });
  flushBullets("bullets-end");

  return <>{blocks}</>;
}

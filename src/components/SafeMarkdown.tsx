import type { ReactNode } from "react";

type SafeMarkdownProps = {
  content: string;
};

function safeHref(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const href = value.trim();
  if (/^(https?:\/\/|mailto:)/i.test(href)) return href;
  return null;
}

function inlineMarkdown(value: string): ReactNode[] {
  const pattern = /(\[([^\]]+)\]\(([^)]+)\)|`([^`]+)`|(\*\*|__)(.+?)\5|\*([^*]+)\*|_([^_]+)_)/g;
  const nodes: ReactNode[] = [];
  let cursor = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = pattern.exec(value)) !== null) {
    if (match.index > cursor) nodes.push(value.slice(cursor, match.index));
    const [token, linkToken, linkLabel, linkTarget, code, strongMarker, strongText, italicText, underscoreText] = match;
    if (linkToken) {
      const href = safeHref(linkTarget);
      nodes.push(
        href ? (
          <a
            key={`link-${key++}`}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
          >
            {linkLabel}
          </a>
        ) : (
          linkLabel
        ),
      );
    } else if (code) {
      nodes.push(<code key={`code-${key++}`}>{code}</code>);
    } else if (strongMarker) {
      nodes.push(<strong key={`strong-${key++}`}>{strongText}</strong>);
    } else if (italicText || underscoreText) {
      nodes.push(<em key={`em-${key++}`}>{italicText || underscoreText}</em>);
    } else {
      nodes.push(token);
    }
    cursor = match.index + token.length;
  }

  if (cursor < value.length) nodes.push(value.slice(cursor));
  return nodes;
}

function isTableSeparator(line: string): boolean {
  const cells = line.trim().replace(/^\||\|$/g, "").split("|");
  return cells.length > 0 && cells.every((cell) => /^\s*:?-{3,}:?\s*$/.test(cell));
}

function tableCells(line: string): string[] {
  return line.trim().replace(/^\||\|$/g, "").split("|").map((cell) => cell.trim());
}

function renderBlocks(content: string): ReactNode[] {
  const lines = content.replace(/\r\n?/g, "\n").split("\n");
  const blocks: ReactNode[] = [];
  let paragraph: string[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;
  let quote: string[] = [];
  let code: string[] | null = null;
  let table: string[] = [];
  let key = 0;

  const flushParagraph = () => {
    if (paragraph.length === 0) return;
    blocks.push(<p key={`p-${key++}`}>{inlineMarkdown(paragraph.join(" ").trim())}</p>);
    paragraph = [];
  };
  const flushList = () => {
    if (!list) return;
    const Tag = list.ordered ? "ol" : "ul";
    blocks.push(
      <Tag key={`list-${key++}`}>
        {list.items.map((item, index) => <li key={`${key}-${index}`}>{inlineMarkdown(item)}</li>)}
      </Tag>,
    );
    list = null;
  };
  const flushQuote = () => {
    if (quote.length === 0) return;
    blocks.push(<blockquote key={`quote-${key++}`}>{inlineMarkdown(quote.join(" ").trim())}</blockquote>);
    quote = [];
  };
  const flushTable = () => {
    if (table.length < 2) {
      table.forEach((line) => paragraph.push(line));
      table = [];
      return;
    }
    const rows = table.map(tableCells);
    blocks.push(
      <div className="message-markdown__table-wrap" key={`table-${key++}`}>
        <table>
          <thead><tr>{rows[0].map((cell, index) => <th key={`th-${index}`}>{inlineMarkdown(cell)}</th>)}</tr></thead>
          <tbody>{rows.slice(2).map((row, rowIndex) => <tr key={`tr-${rowIndex}`}>{row.map((cell, index) => <td key={`td-${rowIndex}-${index}`}>{inlineMarkdown(cell)}</td>)}</tr>)}</tbody>
        </table>
      </div>,
    );
    table = [];
  };
  const flushCode = () => {
    if (code === null) return;
    blocks.push(<pre key={`pre-${key++}`}><code>{code.join("\n")}</code></pre>);
    code = null;
  };

  lines.forEach((line, index) => {
    if (code !== null) {
      if (/^\s*```/.test(line)) flushCode();
      else code.push(line);
      return;
    }
    if (/^\s*```/.test(line)) {
      flushParagraph(); flushList(); flushQuote(); flushTable(); code = [];
      return;
    }
    if (/^\s*$/.test(line)) {
      flushParagraph(); flushList(); flushQuote(); flushTable();
      return;
    }
    const heading = line.match(/^\s{0,3}(#{1,4})\s+(.+?)\s*#*\s*$/);
    if (heading) {
      flushParagraph(); flushList(); flushQuote(); flushTable();
      const Tag = heading[1].length <= 2 ? "h3" : "h4";
      blocks.push(<Tag key={`h-${key++}`}>{inlineMarkdown(heading[2])}</Tag>);
      return;
    }
    const ordered = line.match(/^\s*\d+[.)]\s+(.+)$/);
    const unordered = line.match(/^\s*[-*+]\s+(.+)$/);
    if (ordered || unordered) {
      flushParagraph(); flushQuote(); flushTable();
      const nextOrdered = Boolean(ordered);
      if (!list || list.ordered !== nextOrdered) { flushList(); list = { ordered: nextOrdered, items: [] }; }
      list.items.push((ordered || unordered)![1]);
      return;
    }
    if (/^\s*>\s?/.test(line)) {
      flushParagraph(); flushList(); flushTable();
      quote.push(line.replace(/^\s*>\s?/, ""));
      return;
    }
    if (line.includes("|") && table.length === 0) {
      flushParagraph(); flushList(); flushQuote();
      table.push(line);
      return;
    }
    if (table.length > 0) {
      if (line.includes("|") || isTableSeparator(line)) table.push(line);
      else { flushTable(); paragraph.push(line); }
      return;
    }
    paragraph.push(line);
    if (index === lines.length - 1) flushParagraph();
  });

  flushCode(); flushParagraph(); flushList(); flushQuote(); flushTable();
  return blocks;
}

export default function SafeMarkdown({ content }: SafeMarkdownProps) {
  const normalized =
    typeof content === "string"
      ? content
      : content === null || content === undefined
        ? ""
        : String(content);
  return <div className="message-markdown">{renderBlocks(normalized)}</div>;
}

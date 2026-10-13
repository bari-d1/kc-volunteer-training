import type { ComponentProps } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import { isExternalUrl } from "@/lib/media";
import type { BlockProps } from "../block-props";

// Only basic formatting; raw HTML is never rendered (no rehype-raw).
const allowedElements = [
  "p",
  "strong",
  "em",
  "ul",
  "ol",
  "li",
  "a",
  "br",
  "blockquote",
];

const underline = "underline underline-offset-4";

function MarkdownLink({ href = "", children }: ComponentProps<"a">) {
  if (isExternalUrl(href)) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="font-bold text-lime"
      >
        {/* Underline only the words, not the space before the hidden note. */}
        <span className={underline}>{children}</span>{" "}
        <span className="sr-only">(opens in a new tab)</span>
      </a>
    );
  }
  return (
    <a href={href} className={`font-bold text-lime ${underline}`}>
      {children}
    </a>
  );
}

const components: Components = {
  a: ({ href, children }) => (
    <MarkdownLink href={href}>{children}</MarkdownLink>
  ),
};

export function TextBlock({ markdown }: BlockProps<"TEXT">) {
  return (
    <div className="flex flex-col gap-4 text-body-lg text-text [&_blockquote]:border-l-4 [&_blockquote]:border-lime [&_blockquote]:pl-4 [&_blockquote]:text-muted [&_em]:italic [&_li]:pl-1 [&_ol]:list-decimal [&_ol]:space-y-2 [&_ol]:pl-6 [&_strong]:font-bold [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-6 [&_ul_li]:marker:text-lime">
      <ReactMarkdown
        allowedElements={allowedElements}
        unwrapDisallowed
        skipHtml
        components={components}
      >
        {markdown}
      </ReactMarkdown>
    </div>
  );
}

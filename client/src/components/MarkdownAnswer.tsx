import type { Components } from "react-markdown";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface MarkdownAnswerProps {
  markdown: string;
  streaming?: boolean;
  onCite?: (sourceNumber: number) => void;
}

export function MarkdownAnswer({ markdown, streaming = false, onCite }: MarkdownAnswerProps) {
  const components: Components = {
    a({ href, children }) {
      const citation = href?.match(/^#source-(\d+)$/);
      if (citation) {
        const sourceNumber = Number(citation[1]);
        return (
          <button
            type="button"
            className="citation"
            onClick={() => onCite?.(sourceNumber)}
            title={`View source ${sourceNumber}`}
          >
            {sourceNumber}
          </button>
        );
      }
      return (
        <a href={href} target="_blank" rel="noreferrer">
          {children}
        </a>
      );
    },
  };

  return (
    <div className="answer-prose">
      <Markdown remarkPlugins={[remarkGfm]} components={components}>
        {linkifyCitations(markdown)}
      </Markdown>
      {streaming ? <span className="stream-caret" aria-hidden="true" /> : null}
    </div>
  );
}

function linkifyCitations(markdown: string): string {
  return markdown.replace(/\[Source\s+(\d+)\]/gi, "[$1](#source-$1)");
}

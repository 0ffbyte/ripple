import { useState, type ComponentProps } from "react";
import { Streamdown } from "streamdown";
import "streamdown/styles.css";

function CodeBlock({ className, children, ...props }: ComponentProps<"code">) {
  const [copied, setCopied] = useState(false);
  const code = String(children ?? "").replace(/\n$/, "");
  const lang = /language-(\w+)/.exec(className ?? "")?.[1];

  // Inline code: no language class and no newline
  if (!lang && !code.includes("\n")) {
    return (
      <code
        className="rounded-lg bg-zinc-900/60 px-1 py-0.5 text-sm"
        {...props}
      >
        {children}
      </code>
    );
  }

  const copy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="my-4 overflow-hidden rounded-2xl">
      <div className="flex items-center justify-between bg-zinc-900/60 p-3 pb-0 text-xs">
        <span className="uppercase opacity-60">{lang ?? "text"}</span>
        <button onClick={copy} className="opacity-70 hover:opacity-100">
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="overflow-x-auto p-3 text-xs bg-zinc-900/60">
        <code className={className}>{code}</code>
      </pre>
    </div>
  );
}

function TableBlock({ children, ...props }: ComponentProps<"table">) {
  return (
    <div className="my-4 py-1 overflow-x-auto rounded-2xl bg-zinc-900/60">
      <table
        {...props}
        className="min-w-full text-sm border-separate border-spacing-0 bg-transparent"
      >
        {children}
      </table>
    </div>
  );
}

function Paragraph({ className, children, ...props }: ComponentProps<"p">) {
  return (
    <p className={`leading-6 ${className ?? ""}`} {...props}>
      {children}
    </p>
  );
}

function UnorderedList({
  className,
  children,
  ...props
}: ComponentProps<"ul">) {
  return (
    <ul className={`leading-6 ${className ?? ""}`} {...props}>
      {children}
    </ul>
  );
}

function OrderedList({ className, children, ...props }: ComponentProps<"ol">) {
  return (
    <ol className={`leading-6 list-decimal pl-6 ${className ?? ""}`} {...props}>
      {children}
    </ol>
  );
}

// Keep this outside the component so it stays referentially stable
const components = {
  code: CodeBlock,
  pre: ({ children }: ComponentProps<"pre">) => <>{children}</>,
  table: TableBlock,
  p: Paragraph,
  ul: UnorderedList,
  ol: OrderedList,
};

export default function Markdown({
  id,
  caret,
  value,
  streaming,
}: {
  id?: string;
  caret?: boolean;
  value: string;
  streaming: boolean;
}) {
  return (
    <Streamdown
      key={id}
      components={components}
      animated
      isAnimating={streaming}
      caret={caret ? "circle" : undefined}
    >
      {value}
    </Streamdown>
  );
}

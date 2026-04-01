import * as React from "react";
import { cn } from "../utils";

interface CodeBlockProps extends React.HTMLAttributes<HTMLPreElement> {
  code: string;
  language?: string;
  showCopy?: boolean;
}

const CodeBlock = React.forwardRef<HTMLPreElement, CodeBlockProps>(
  ({ code, language = "plaintext", showCopy = true, className, ...props }, ref) => {
    const [copied, setCopied] = React.useState(false);

    const handleCopy = () => {
      navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    };

    return (
      <div className="relative">
        <pre
          ref={ref}
          className={cn(
            "bg-surface-muted border border-surface-border rounded-md p-4 overflow-x-auto text-sm",
            className
          )}
          {...props}
        >
          <code>{code}</code>
        </pre>
        {showCopy && (
          <button
            onClick={handleCopy}
            className="absolute top-2 right-2 px-2 py-1 text-xs bg-brand-500 text-white rounded hover:bg-brand-600 transition-colors"
          >
            {copied ? "Copied!" : "Copy"}
          </button>
        )}
      </div>
    );
  }
);
CodeBlock.displayName = "CodeBlock";

export { CodeBlock, type CodeBlockProps };

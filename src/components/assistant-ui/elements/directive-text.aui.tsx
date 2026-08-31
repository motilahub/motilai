"use client";

import TextareaAutosize, {
  type TextareaAutosizeProps,
} from "react-textarea-autosize";
import { forwardRef, memo, useCallback, useRef } from "react";
import type { TextMessagePartComponent } from "@assistant-ui/react";
import type { Unstable_DirectiveFormatter } from "@assistant-ui/react";
import { unstable_defaultDirectiveFormatter } from "@assistant-ui/react";
import { unstable_useComposerInput } from "@assistant-ui/react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  createDirectiveText as createDirectiveTextBase,
  type CreateDirectiveTextOptions,
} from "./directive-text";

export const compatibleDirectiveFormatter: Unstable_DirectiveFormatter = {
  serialize: unstable_defaultDirectiveFormatter.serialize,
  parse(text) {
    // Some persisted messages were produced without the formatter's leading
    // colon, or with the composer trigger left in place. Normalize those forms
    // before delegating to assistant-ui's parser so they render as chips.
    const normalized = text.replace(
      /(^|[^\w:-])@?(agent|knowledge|tool)\[/gu,
      "$1:$2[",
    );
    return unstable_defaultDirectiveFormatter.parse(normalized);
  },
};

export const DirectiveComposerInput = forwardRef<
  HTMLTextAreaElement,
  TextareaAutosizeProps
>(({ className, value, ...props }, ref) => {
  const text = typeof value === "string" ? value : "";
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const { setText } = unstable_useComposerInput();
  const segments = compatibleDirectiveFormatter.parse(text);
  const hasMention = segments.some((segment) => segment.kind === "mention");

  const setRefs = useCallback(
    (node: HTMLTextAreaElement | null) => {
      inputRef.current = node;
      if (typeof ref === "function") ref(node);
      else if (ref) ref.current = node;
    },
    [ref],
  );

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
      props.onKeyDown?.(event);
      if (event.defaultPrevented || event.nativeEvent.isComposing || event.key === "Enter") return;

      const target = event.currentTarget;
      const start = target.selectionStart;
      const end = target.selectionEnd;
      if (start !== end || (event.key !== "Backspace" && event.key !== "Delete")) return;

      const directiveRanges = [...text.matchAll(
        /(^|[^\w:-])([@:]?(?:agent|knowledge|tool)\[[^\]\n]{1,1024}\](?:\{name=[^}\n]{1,1024}\})?)/gu,
      )].map((match) => {
        const prefixLength = match[1]?.length ?? 0;
        const directive = match[2] ?? "";
        const rangeStart = (match.index ?? 0) + prefixLength;
        return { start: rangeStart, end: rangeStart + directive.length };
      });

      const range = directiveRanges.find((candidate) =>
        event.key === "Backspace" ? candidate.end === start : candidate.start === start,
      );
      if (!range) return;

      event.preventDefault();
      const nextText = text.slice(0, range.start) + text.slice(range.end);
      setText(nextText);
      requestAnimationFrame(() => {
        const node = inputRef.current;
        if (!node) return;
        node.setSelectionRange(range.start, range.start);
      });
    },
    [props, setText, text],
  );

  return (
    <div className="relative w-full">
      {hasMention && (
        <div
          aria-hidden="true"
          className={cn(
            className,
            "pointer-events-none absolute inset-0 z-0 overflow-hidden text-foreground",
          )}
        >
          {segments.map((segment, index) => {
            if (segment.kind === "text") {
              return (
                <span key={index} className="whitespace-pre-wrap">
                  {segment.text}
                </span>
              );
            }

            return (
              <Badge
                key={index}
                variant="secondary"
                data-slot="directive-composer-chip"
                data-directive-type={segment.type}
                data-directive-id={segment.id}
                className="aui-directive-chip items-baseline px-1.5 py-0.5 text-[13px] leading-none align-baseline"
              >
                {segment.label}
              </Badge>
            );
          })}
        </div>
      )}
      <TextareaAutosize
        {...props}
        ref={setRefs}
        value={text}
        onKeyDown={handleKeyDown}
        className={cn(
          className,
          hasMention &&
            "relative z-10 text-transparent caret-foreground placeholder:text-muted-foreground",
        )}
      />
    </div>
  );
});
DirectiveComposerInput.displayName = "DirectiveComposerInput";

export type {
  CreateDirectiveTextOptions,
  DirectiveTextFormatter,
  DirectiveTextSegment,
} from "./directive-text";

/** Creates a `Text` message part component that parses directive syntax and renders inline chips. */
export function createDirectiveText(
  formatter: Unstable_DirectiveFormatter,
  options?: CreateDirectiveTextOptions,
): TextMessagePartComponent {
  return createDirectiveTextBase(formatter, options);
}

/** `Text` message part component that renders directive syntax as inline chips. */
export const DirectiveText: TextMessagePartComponent = memo(
  createDirectiveTextBase(compatibleDirectiveFormatter),
);

"use client";

import { memo } from "react";
import type { TextMessagePartComponent } from "@assistant-ui/react";
import type { Unstable_DirectiveFormatter } from "@assistant-ui/react";
import { unstable_defaultDirectiveFormatter } from "@assistant-ui/react";
import {
  createDirectiveText as createDirectiveTextBase,
  type CreateDirectiveTextOptions,
} from "./directive-text";

const compatibleDirectiveFormatter: Unstable_DirectiveFormatter = {
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

import type { ReactNode } from "react";

type MessageBubbleProps = {
  role: "user" | "assistant";
  children: ReactNode;
};

export function MessageBubble({ role, children }: MessageBubbleProps) {
  return <article className={`efata-message efata-message--${role}`}>{children}</article>;
}

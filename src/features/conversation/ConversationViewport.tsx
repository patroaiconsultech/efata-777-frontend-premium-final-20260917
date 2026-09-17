import type { ReactNode } from "react";

export function ConversationViewport({ children }: { children: ReactNode }) {
  return <div className="efata-message-list">{children}</div>;
}

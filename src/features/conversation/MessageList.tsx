import type { ReactNode } from "react";

export function MessageList({ children }: { children: ReactNode }) {
  return <div className="efata-message-list">{children}</div>;
}

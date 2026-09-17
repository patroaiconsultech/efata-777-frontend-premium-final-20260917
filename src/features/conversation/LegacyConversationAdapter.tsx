import type { ReactNode } from "react";
import "./LegacyConversationAdapter.css";

/** Presentation-only bridge. Operational semantics remain in legacy AppConsole. */
export default function LegacyConversationAdapter({ children }: { children: ReactNode }) {
  return <div className="efata-premium-legacy-mount">{children}</div>;
}

import type { ReactNode } from "react";
import "./ComposerDock.css";

export function ComposerDock({ children }: { children: ReactNode }) {
  return <div className="efata-composer-dock">{children}</div>;
}

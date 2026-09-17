import type { ReactNode } from "react";
import "./AppShell.css";

type AppShellProps = {
  rail?: ReactNode;
  children: ReactNode;
  context?: ReactNode;
};

export function AppShell({ rail, children, context }: AppShellProps) {
  return (
    <div className="efata-premium-shell">
      <div className="efata-premium-shell__grid">
        <aside className="efata-premium-shell__rail">{rail}</aside>
        <main className="efata-premium-shell__main">{children}</main>
        <aside className="efata-premium-shell__context">{context}</aside>
      </div>
    </div>
  );
}

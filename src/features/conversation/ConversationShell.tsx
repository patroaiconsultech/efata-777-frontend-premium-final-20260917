import type { ReactNode } from "react";
import "./ConversationShell.css";

type ConversationShellProps = {
  header?: ReactNode;
  children: ReactNode;
  composer?: ReactNode;
};

export function ConversationShell({ header, children, composer }: ConversationShellProps) {
  return (
    <section className="efata-conversation">
      <header className="efata-conversation__header">{header}</header>
      <div className="efata-conversation__viewport">{children}</div>
      <footer className="efata-conversation__composer">{composer}</footer>
    </section>
  );
}

import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { registerServiceWorker } from "./pwa/registerServiceWorker";
import RuntimeErrorBoundary from "./components/RuntimeErrorBoundary";

const container = document.getElementById("root");
if (!container) {
  throw new Error("PatroAI root container not found");
}

createRoot(container).render(
  <React.StrictMode>
    <RuntimeErrorBoundary>
      <App />
    </RuntimeErrorBoundary>
  </React.StrictMode>,
);

void registerServiceWorker();

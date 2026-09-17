import React from "react";

import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
} from "react-router-dom";

import Landing from "./routes/Landing";
import AppConsole from "./routes/AppConsole";
import AccessPortal from "./routes/AccessPortal";
import AdminPanel from "./routes/AdminPanel";
import InviteAccept from "./routes/InviteAccept";
import TalentApplication from "./routes/TalentApplication";
import PwaUpdateBanner from "./components/PwaUpdateBanner";

import "./styles.css";

const AppEntry = AppConsole;

export default function App() {
  const source = new URLSearchParams(window.location.search).get("source") || "";
  const isPwaLaunch = source.startsWith("pwa");

  return (
    <BrowserRouter>
      <a className="skip-link" href="#main-content">
        Ir para o conteúdo
      </a>
      <PwaUpdateBanner />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/access" element={<AccessPortal />} />
        <Route path="/talentos/candidatura" element={<TalentApplication />} />
        <Route path="/app" element={<AppEntry />} />
        <Route path="/admin" element={<AdminPanel />} />
        <Route path="/admin/v4" element={<AdminPanel />} />
        <Route path="/invite/:token" element={<InviteAccept />} />
        <Route path="*" element={<Navigate to={isPwaLaunch ? "/" : "/"} replace />} />
      </Routes>
    </BrowserRouter>
  );
}

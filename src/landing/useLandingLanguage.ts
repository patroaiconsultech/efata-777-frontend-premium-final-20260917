import { useEffect, useState } from "react";

/** Presentation locale only. API/session contracts remain unchanged. */
export type LandingLanguage = "pt" | "es" | "en";

function normalize(value: string | null | undefined): LandingLanguage | null {
  const code = (value || "").toLowerCase().split("-")[0];
  return code === "pt" || code === "es" || code === "en" ? code : null;
}

export function initialLandingLanguage(): LandingLanguage {
  if (typeof window === "undefined") return "pt";
  const fromUrl = normalize(new URLSearchParams(window.location.search).get("lang"));
  if (fromUrl) return fromUrl;
  try {
    return normalize(window.localStorage.getItem("patroai-language")) || "pt";
  } catch {
    return "pt";
  }
}

export function useLandingLanguage(): LandingLanguage {
  const [language, setLanguage] = useState<LandingLanguage>(initialLandingLanguage);

  useEffect(() => {
    const node = document.documentElement;
    const sync = () => setLanguage(normalize(node.lang) || initialLandingLanguage());
    const observer = new MutationObserver(sync);
    observer.observe(node, { attributes: true, attributeFilter: ["lang"] });
    // premiumInteractions owns language switching for the landing page.
    if (node.lang && !normalize(node.lang)) sync();
    return () => observer.disconnect();
  }, []);

  return language;
}

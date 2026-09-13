import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";

export default function RouterDiagnostic({ renderedPageName }) {
  const location = useLocation();
  const [browserUrl, setBrowserUrl] = useState(() => window.location.href);

  useEffect(() => {
    const syncBrowserUrl = () => setBrowserUrl(window.location.href);
    const intervalId = window.setInterval(syncBrowserUrl, 250);
    window.addEventListener("popstate", syncBrowserUrl);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("popstate", syncBrowserUrl);
    };
  }, []);

  return (
    <aside className="fixed right-3 top-3 z-[100000] w-[min(28rem,calc(100vw-1.5rem))] rounded-lg border border-border bg-popover/95 p-3 font-mono text-xs text-popover-foreground shadow-2xl backdrop-blur" aria-label="Temporary router diagnostic">
      <div className="mb-2 font-bold">Temporary Router Diagnostic</div>
      <dl className="grid gap-2 break-all">
        <div><dt className="font-semibold text-muted-foreground">Browser URL</dt><dd>{browserUrl}</dd></div>
        <div><dt className="font-semibold text-muted-foreground">React Router pathname</dt><dd>{location.pathname}</dd></div>
        <div><dt className="font-semibold text-muted-foreground">Mounted page component</dt><dd>{renderedPageName || "Unknown"}</dd></div>
      </dl>
    </aside>
  );
}
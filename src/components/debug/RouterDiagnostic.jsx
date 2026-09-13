import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { ChevronDown, ChevronUp, GripVertical } from "lucide-react";
import useDraggablePanel from "@/hooks/useDraggablePanel";

export default function RouterDiagnostic({ renderedPageName }) {
  const location = useLocation();
  const [browserUrl, setBrowserUrl] = useState(() => window.location.href);
  const [collapsed, setCollapsed] = useState(false);
  const { position, dragHandlers } = useDraggablePanel();

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
    <aside style={{ left: position.x, top: position.y }} className="fixed z-[100000] w-[min(28rem,calc(100vw-1.5rem))] rounded-lg border border-border bg-popover/95 font-mono text-xs text-popover-foreground shadow-2xl backdrop-blur" aria-label="Temporary router diagnostic">
      <div {...dragHandlers} className="flex cursor-move touch-none items-center gap-2 rounded-t-lg px-3 py-2 font-bold select-none">
        <GripVertical className="h-4 w-4 text-muted-foreground" />
        <span className="flex-1">Temporary Router Diagnostic</span>
        <button type="button" onClick={() => setCollapsed((value) => !value)} className="rounded p-1 hover:bg-muted" aria-label={collapsed ? "Expand diagnostic" : "Collapse diagnostic"}>
          {collapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
        </button>
      </div>
      {!collapsed && (
        <dl className="grid gap-2 break-all border-t border-border p-3">
          <div><dt className="font-semibold text-muted-foreground">Browser URL</dt><dd>{browserUrl}</dd></div>
          <div><dt className="font-semibold text-muted-foreground">React Router pathname</dt><dd>{location.pathname}</dd></div>
          <div><dt className="font-semibold text-muted-foreground">Mounted page component</dt><dd>{renderedPageName || "Unknown"}</dd></div>
          <div><dt className="font-semibold text-muted-foreground">React runtime</dt><dd>React {React.version}</dd></div>
          <div><dt className="font-semibold text-muted-foreground">Router</dt><dd>BrowserRouter (react-router-dom)</dd></div>
        </dl>
      )}
    </aside>
  );
}
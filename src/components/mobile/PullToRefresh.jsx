import React, { useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

const PULL_THRESHOLD = 58;
const MAX_PULL = 76;

function isMobileTouchDevice() {
  if (typeof window === "undefined") return false;
  return window.innerWidth < 768 && ("ontouchstart" in window || window.matchMedia?.("(pointer: coarse)")?.matches);
}

function isInteractiveTarget(target) {
  return !!target?.closest?.('button, a, input, textarea, select, [role="button"], [role="tab"], [role="menuitem"], .leaflet-container, [data-no-pull-refresh="true"]');
}

function getScrollableParent(element) {
  let node = element?.parentElement;
  while (node && node !== document.body) {
    const style = window.getComputedStyle(node);
    if (/(auto|scroll)/.test(style.overflowY) && node.scrollHeight > node.clientHeight) return node;
    node = node.parentElement;
  }
  return document.scrollingElement || document.documentElement;
}

export default function PullToRefresh({ children, onRefresh, disabled = false, className = "" }) {
  const containerRef = useRef(null);
  const startRef = useRef({ x: 0, y: 0, active: false });
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const canStart = (target) => {
    if (disabled || refreshing || typeof onRefresh !== "function" || !isMobileTouchDevice() || isInteractiveTarget(target)) return false;
    const scrollParent = getScrollableParent(containerRef.current);
    return (scrollParent?.scrollTop || 0) <= 0;
  };

  const handleTouchStart = (event) => {
    if (event.touches.length !== 1 || !canStart(event.target)) return;
    const touch = event.touches[0];
    startRef.current = { x: touch.clientX, y: touch.clientY, active: true };
  };

  const handleTouchMove = (event) => {
    if (!startRef.current.active || event.touches.length !== 1) return;
    const touch = event.touches[0];
    const deltaY = touch.clientY - startRef.current.y;
    const deltaX = Math.abs(touch.clientX - startRef.current.x);

    if (deltaY <= 0 || deltaX > deltaY * 0.65) {
      setPullDistance(0);
      return;
    }

    const scrollParent = getScrollableParent(containerRef.current);
    if ((scrollParent?.scrollTop || 0) > 0) {
      startRef.current.active = false;
      setPullDistance(0);
      return;
    }

    event.preventDefault();
    setPullDistance(Math.min(MAX_PULL, deltaY * 0.45));
  };

  const resetPull = () => {
    startRef.current.active = false;
    setPullDistance(0);
  };

  const handleTouchEnd = async () => {
    if (!startRef.current.active) return resetPull();
    const shouldRefresh = pullDistance >= PULL_THRESHOLD;
    resetPull();
    if (!shouldRefresh) return;

    setRefreshing(true);
    try {
      await onRefresh();
    } catch (error) {
      toast.error("Refresh failed. Try again.");
    } finally {
      setRefreshing(false);
    }
  };

  const indicatorVisible = refreshing || pullDistance > 0;

  return (
    <div
      ref={containerRef}
      className={`relative ${className}`}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={resetPull}
    >
      <div
        className={`pointer-events-none absolute inset-x-0 top-0 z-10 flex justify-center transition-opacity duration-150 ${indicatorVisible ? "opacity-100" : "opacity-0"}`}
        style={{ transform: `translateY(${refreshing ? 8 : Math.max(0, pullDistance - 34)}px)` }}
        aria-hidden="true"
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-full border border-[#5DADA5]/30 bg-white/95 text-[#5DADA5] shadow-sm backdrop-blur">
          <Loader2 className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
        </div>
      </div>
      {children}
    </div>
  );
}
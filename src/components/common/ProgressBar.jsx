// src/components/common/ProgressBar.jsx — ERP+ NProgress (anti-flicker, minVisible, reduced-motion)

import React, { useEffect, useRef } from "react";
import NProgress from "nprogress";
import { useLocation, useNavigationType } from "react-router-dom";
import { useTheme } from "@mui/material/styles";
import { alpha } from "@mui/material/styles";
import "nprogress/nprogress.css";

export default function ProgressBar({
  delay = 120,        // ms: tránh chớp bar cho điều hướng siêu nhanh
  minVisible = 300,   // ms: đã hiện thì giữ tối thiểu bấy nhiêu
}) {
  const theme = useTheme();
  const location = useLocation();
  const navType = useNavigationType();

  const prefersReduced =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;

  // in-flight requests counter & timers
  const inFlight = useRef(0);
  const showTimer = useRef(null);
  const hideTimer = useRef(null);
  const lastShowAt = useRef(0);

  // Configure once
  useEffect(() => {
    NProgress.configure({
      showSpinner: false,
      trickleSpeed: 200,
      minimum: 0.08,
    });
    return () => {
      clearTimeout(showTimer.current);
      clearTimeout(hideTimer.current);
      NProgress.remove();
    };
  }, []);

  // Theme-aware styles (reapply when theme changes)
  useEffect(() => {
    const styleId = "nprogress-custom-style";
    document.getElementById(styleId)?.remove();

    const primary = theme.palette.primary.main;
    const secondary = theme.palette.secondary?.main || primary;

    const style = document.createElement("style");
    style.id = styleId;
    style.innerHTML = `
      #nprogress { pointer-events: none; }
      #nprogress .bar {
        position: fixed;
        z-index: ${theme.zIndex.tooltip + 2};
        top: env(safe-area-inset-top, 0px);
        left: 0;
        width: 100%;
        height: 3px;
        background: linear-gradient(90deg, ${primary} 0%, ${secondary} 100%);
        ${prefersReduced ? "" : `box-shadow: 0 0 10px ${alpha(primary, 0.6)};`}
        opacity: 1;
        transition: opacity 160ms ease-out;
      }
      /* fade-out khi done() */
      #nprogress.done .bar { opacity: 0; }

      /* "Peg" sparkle ở đầu — tắt nếu reduced motion */
      #nprogress .peg {
        ${prefersReduced ? "display:none;" : ""}
        right: 0;
        width: 100px;
        height: 100%;
        box-shadow: 0 0 10px ${primary}, 0 0 5px ${primary};
        opacity: 1;
        transform: rotate(3deg) translate(0, -4px);
      }
    `;
    document.head.appendChild(style);
    return () => document.getElementById(styleId)?.remove();
  }, [theme, prefersReduced]);

  // Start/Done with debounced show & min visible time
  const startProgress = () => {
    // nếu đã có timer hiển thị thì không đặt thêm
    if (!showTimer.current && inFlight.current === 0) {
      showTimer.current = setTimeout(() => {
        NProgress.start();
        lastShowAt.current = Date.now();
        showTimer.current = null;
      }, delay);
    }
    inFlight.current += 1;
  };

  const finishProgress = () => {
    inFlight.current = Math.max(0, inFlight.current - 1);
    if (inFlight.current > 0) return;

    const elapsed = Date.now() - lastShowAt.current;
    const remain = Math.max(0, minVisible - elapsed);

    const complete = () => {
      // gắn class done để CSS fade-out
      const np = document.getElementById("nprogress");
      if (np) np.classList.add("done");
      NProgress.done(true);
      // sau 200ms, bỏ class để lần sau còn fade lại
      hideTimer.current = setTimeout(() => {
        if (np) np.classList.remove("done");
        hideTimer.current = null;
      }, 200);
    };

    if (showTimer.current) {
      // bar chưa kịp show → hủy show & không done visual
      clearTimeout(showTimer.current);
      showTimer.current = null;
      // cũng đảm bảo NProgress state sạch
      NProgress.remove();
    } else {
      // bar đã show → giữ tối thiểu
      hideTimer.current = setTimeout(complete, remain);
    }
  };

  // Listen to route changes (pathname + search + hash)
  useEffect(() => {
    // Ignore POP (back/forward) if muốn, nhưng ở ERP vẫn show cho consistency
    if (navType !== "POP") {
      startProgress();
    } else {
      startProgress();
    }

    // Done on next paint + debounce to include Suspense layout
    const raf1 = requestAnimationFrame(() => {
      const raf2 = requestAnimationFrame(() => finishProgress());
      return () => cancelAnimationFrame(raf2);
    });

    return () => {
      cancelAnimationFrame(raf1);
      // Nếu unmount/route tiếp, cứ cố gắng hoàn tất batch trước đó
      finishProgress();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname, location.search, location.hash, navType]);

  return null;
}

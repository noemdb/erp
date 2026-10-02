"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Reveal on scroll. SSR/no-JS muestra el contenido visible;
 * en cliente oculta lo que está bajo el pliegue y lo revela al entrar.
 * Con `prefers-reduced-motion` no hay transición (ver `.reveal` en CSS).
 */
export function Reveal({
  children,
  className,
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [hidden, setHidden] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (
      typeof IntersectionObserver === "undefined" ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }
    if (el.getBoundingClientRect().top > window.innerHeight * 0.92) {
      setHidden(true);
      const io = new IntersectionObserver(
        (entries) => {
          if (entries[0]?.isIntersecting) {
            setVisible(true);
            io.disconnect();
          }
        },
        { threshold: 0.1, rootMargin: "0px 0px -6% 0px" }
      );
      io.observe(el);
      return () => io.disconnect();
    }
  }, []);

  return (
    <div
      ref={ref}
      style={{ transitionDelay: `${delay}ms` }}
      className={cn(
        "reveal transition-all duration-700 ease-out will-change-transform",
        hidden && !visible && "translate-y-4 opacity-0",
        (!hidden || visible) && "translate-y-0 opacity-100",
        className
      )}
    >
      {children}
    </div>
  );
}

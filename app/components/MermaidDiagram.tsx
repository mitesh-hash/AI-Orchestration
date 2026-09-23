"use client";

import { useEffect, useRef, useState } from "react";

// Mermaid needs the DOM to render (it builds an SVG via document APIs), so
// this is a small client island loaded dynamically -- the rest of the
// review page stays a server component. The diagram itself is always
// deterministically derived from a validated node/edge graph
// (core/diagramming/renderMermaid.ts); this component only renders the
// resulting Mermaid syntax, it doesn't interpret or trust anything new.
export function MermaidDiagram({ id, chart }: { id: string; chart: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    import("mermaid").then(async (mod) => {
      const mermaid = mod.default;
      mermaid.initialize({ startOnLoad: false, theme: "neutral", securityLevel: "strict" });
      try {
        const { svg } = await mermaid.render(id, chart);
        if (!cancelled && containerRef.current) {
          containerRef.current.innerHTML = svg;
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to render diagram.");
        }
      }
    });

    return () => {
      cancelled = true;
    };
  }, [id, chart]);

  if (error) {
    return <p className="muted">Could not render diagram: {error}</p>;
  }
  return <div ref={containerRef} className="mermaid-container" />;
}

"use client";

import { Component, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import type { ParsedComponent } from "@/lib/mdx-parser";
import { getTheme, themeToCssVars } from "@/themes";
import { SlideBgVideoContext } from "@/components/SlideBgVideo";
import { SlideRenderer } from "@/components/editor/SlideRenderer";

/**
 * En slide som inte finns i någon fil än, visad i galleriets förhandsruta.
 *
 * Galleriets vanliga förhandsvisning är en iframe mot /preview-slide — den kan
 * bara visa slides som står i ett deck. När en slide ska BYTA mall vill Joel se
 * sina egna ord i den nya formen innan han väljer, och den sliden finns bara i
 * minnet. Den renderas därför här, med samma renderare som slide-editorn
 * använder för ändringar som inte är sparade (SlideRenderer). Ingenting skickas
 * till servern.
 *
 * Ytan är byggd som i EditorPreview: mallarna sätter text i vw, så duken får
 * skärmens 16:9-yta och skalas ner till rutan. Med en fast liten duk hade
 * texten blivit jättelik i förhållande till sliden.
 */

const EDITOR_VIDEO_MODE = { editor: true } as const;

interface Props {
  slide: ParsedComponent;
  theme: string;
  /** Byts när sliden byts, så att klickstegen börjar om. */
  slideKey: string;
  /** Hit flyttas stegknapparna (← Steg 1/3 →) när mallen har klicksteg. */
  controlsHost: HTMLElement | null;
  className?: string;
  fallbackClassName?: string;
}

export function SlideStage({ slide, theme, slideKey, controlsHost, className, fallbackClassName }: Props) {
  const frameRef = useRef<HTMLDivElement>(null);
  const [fit, setFit] = useState<{ width: number; height: number; scale: number } | null>(null);

  useLayoutEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    const update = () => {
      if (frame.clientWidth === 0) return;
      const screenWidth = window.screen?.width || window.innerWidth;
      const screenHeight = window.screen?.height || window.innerHeight;
      const width = Math.min(screenWidth, (screenHeight * 16) / 9);
      const height = Math.min(screenHeight, (screenWidth * 9) / 16);
      setFit({ width, height, scale: frame.clientWidth / width });
    };
    // ResizeObserver rapporterar också första måttet, så ingen egen första mätning behövs.
    const observer = new ResizeObserver(update);
    observer.observe(frame);
    window.addEventListener("resize", update);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", update);
    };
  }, []);

  const tokens = getTheme(theme);
  const cssVars = themeToCssVars(tokens);

  return (
    <div ref={frameRef} className={className}>
      {fit ? (
        <PreviewBoundary key={slideKey} fallbackClassName={fallbackClassName}>
          <div
            className="presentation-root"
            data-ornament={tokens.ornamentStyle}
            data-theme={theme}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: fit.width,
              height: fit.height,
              // Som i EditorPreview: cqw/cqh mäter mot duken.
              containerType: "size",
              background: "var(--bg)",
              transform: `scale(${fit.scale})`,
              transformOrigin: "0 0",
              // En förhandsvisning, inte en arbetsyta: länkar och knappar i sliden ska inte gå att råka trycka på.
              pointerEvents: "none",
              ...(cssVars as CSSProperties),
            }}
          >
            <div style={{ position: "absolute", inset: 0 }}>
              <SlideBgVideoContext.Provider value={EDITOR_VIDEO_MODE}>
                <SlideRenderer slide={slide} slideKey={slideKey} stepControlsHost={controlsHost} />
              </SlideBgVideoContext.Provider>
            </div>
          </div>
        </PreviewBoundary>
      ) : null}
    </div>
  );
}

/**
 * En mall kan kasta fel när den får ord i en form den inte väntar sig (fri text
 * där den läser en lista med "värde · etikett"). Det ska stanna i rutan — inte
 * välta galleriet och verkstaden bakom det.
 */
class PreviewBoundary extends Component<{ children: ReactNode; fallbackClassName?: string }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (this.state.failed) {
      return (
        <div className={this.props.fallbackClassName}>
          Mallen gick inte att visa med de här orden. Titta på exemplet i stället — orden följer ändå med om du väljer mallen.
        </div>
      );
    }
    return this.props.children;
  }
}

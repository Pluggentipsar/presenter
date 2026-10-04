"use client";

import { useEffect } from "react";

const CAPTURE_DELAY_MS = 1500;
const MEDIA_TIMEOUT_MS = 6000;

function sleep(ms: number) {
  return new Promise<void>((resolve) => window.setTimeout(resolve, ms));
}

function nextPaint() {
  return new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });
}

async function waitForMedia() {
  const media = Array.from(
    document.querySelectorAll<HTMLImageElement | HTMLVideoElement>(
      "img, video",
    ),
  );
  if (media.length === 0) return;

  const ready = Promise.all(
    media.map(
      (element) =>
        new Promise<void>((resolve) => {
          if (
            (element instanceof HTMLImageElement &&
              element.complete &&
              element.naturalWidth > 0) ||
            (element instanceof HTMLVideoElement &&
              element.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA)
          ) {
            resolve();
            return;
          }

          const finish = () => resolve();
          element.addEventListener("load", finish, { once: true });
          element.addEventListener("loadeddata", finish, { once: true });
          element.addEventListener("error", finish, { once: true });
        }),
    ),
  );

  await Promise.race([ready, sleep(MEDIA_TIMEOUT_MS)]);
}

/**
 * Körs enbart inne i /preview-slide-ramar med ?thumbnail=1.
 *
 * Den väntar tills typsnitt, media och slidens entry-animation hunnit landa,
 * fångar sedan hela 16:9-vyn till en komprimerad WebP och skickar blobben till
 * M-menyn. Föräldern kan därefter avmontera den dyra iframen helt.
 */
export function PreviewThumbnailCapture({
  slideNumber,
}: {
  slideNumber: number;
}) {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("thumbnail") !== "1" || window.parent === window) return;

    let cancelled = false;

    const capture = async () => {
      try {
        await document.fonts?.ready;
        await waitForMedia();
        await sleep(CAPTURE_DELAY_MS);

        // Avsluta ändliga CSS/WAAPI-animationer så miniatyren visar ett
        // stabilt läge. Eviga ambient-loopar lämnas orörda.
        for (const animation of document.getAnimations()) {
          try {
            if (animation.effect?.getComputedTiming().iterations !== Infinity) {
              animation.finish();
            }
          } catch {
            // Vissa animationstyper kan inte finish():as. Tidsbudgeten ovan
            // räcker då som fallback.
          }
        }
        await nextPaint();
        if (cancelled) return;

        const root = document.querySelector<HTMLElement>(
          '[data-thumbnail-capture-root="true"]',
        );
        if (!root) throw new Error("Kunde inte hitta slidens capture-root.");

        const { domToBlob } = await import("modern-screenshot");
        const blob = await domToBlob(root, {
          width: 1280,
          height: 720,
          scale: 0.5,
          type: "image/webp",
          quality: 0.82,
          backgroundColor: "#0a0908",
          timeout: 12000,
          filter: (node) => {
            if (!(node instanceof HTMLElement)) return true;
            return node.dataset.pdfExclude !== "true";
          },
          fetch: { requestInit: { mode: "cors", cache: "force-cache" } },
        });

        if (cancelled) return;
        window.parent.postMessage(
          {
            type: "presenter-thumbnail-ready",
            slideNumber,
            blob,
          },
          window.location.origin,
        );
      } catch (error) {
        if (cancelled) return;
        window.parent.postMessage(
          {
            type: "presenter-thumbnail-error",
            slideNumber,
            message:
              error instanceof Error
                ? error.message
                : "Okänt fel när miniatyren skapades.",
          },
          window.location.origin,
        );
      }
    };

    void capture();
    return () => {
      cancelled = true;
    };
  }, [slideNumber]);

  return null;
}

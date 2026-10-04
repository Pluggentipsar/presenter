"use client";

import { useEffect } from "react";

/**
 * globals.css låser html/body (height: 100%, overflow: hidden) eftersom en
 * presentation ska fylla skärmen. Delningspaketets sidor är vanliga långa
 * sidor: här återställs riktig dokumentscroll medan de är monterade, så att
 * window.scrollTo, sticky, ankarlänkar och mobilens adressfält fungerar som
 * på vilken webbsida som helst.
 */
export function ShareScrollEffect() {
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const previous = {
      htmlOverflow: html.style.overflow,
      htmlHeight: html.style.height,
      bodyOverflow: body.style.overflow,
      bodyHeight: body.style.height,
    };
    html.style.overflow = "auto";
    html.style.height = "auto";
    body.style.overflow = "visible";
    body.style.height = "auto";
    return () => {
      html.style.overflow = previous.htmlOverflow;
      html.style.height = previous.htmlHeight;
      body.style.overflow = previous.bodyOverflow;
      body.style.height = previous.bodyHeight;
    };
  }, []);
  return null;
}

import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "publish/.build/**",
  ]),
  {
    // R-läget och de delade designkontrollerna får BARA skriva genom editorns
    // egen updateParsed/autosave-väg (AuthoringShell → savePresentation).
    //
    // Anropas i stället M-lägets server actions skrivs filen direkt till disk
    // och revisionen bumpas — varpå editorns nästa autosave får `conflict`
    // tillbaka och hela sessionen fryser med "Sparningen pausades". Det har
    // redan hänt en gång. Regeln kostar tio rader och gör att det inte kan
    // hända igen av misstag.
    //
    // Uppladdningsvägarna (floating-image-actions, floating-video-actions) är
    // undantagna med flit: de rör bara filer under public/, aldrig MDX:en.
    files: [
      "src/components/design/**/*.{ts,tsx}",
      "src/components/editor/**/*.{ts,tsx}",
    ],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "@/lib/presentation-actions",
              message:
                "Skriv genom editorns setParsed/autosave i stället — server actions här ger revisionskonflikt.",
            },
            {
              name: "@/lib/edit-actions",
              message:
                "Skriv genom editorns setParsed/autosave i stället — server actions här ger revisionskonflikt.",
            },
            {
              name: "next/navigation",
              message:
                "R-läget ska inte navigera eller refresha; editorns egna state är sanningen.",
            },
          ],
          patterns: [
            {
              group: ["**/lib/presentation-actions", "**/lib/edit-actions"],
              message:
                "Skriv genom editorns setParsed/autosave i stället — server actions här ger revisionskonflikt.",
            },
          ],
        },
      ],
    },
  },
]);

export default eslintConfig;

"use client";

import {
  createContext,
  createElement,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import {
  FIELD_TEXT_COLORS,
  fieldColorProp,
  useFieldColor,
} from "./slide-field-style";

// ============================================================================
// Kontexten som varje template kan läsa för att veta om edit-mode är på och
// anropa uppdateringar. Värdet kommer från EditorView via EditorPreview →
// SlideRenderer → EditProvider.
// ============================================================================

interface EditContextValue {
  editMode: boolean;
  /** Råa markdown-children på aktiv slide (för fallback när EditableText path="content" ej får value). */
  slideContent: string;
  /**
   * Uppdatera en prop på aktiv slide (t.ex. "title", "subtitle", "kicker").
   * `previous` är texten som visades: med den kan editorn hitta en post som
   * mallen läst ur innehållet (`tiers[0].name` utan någon tiers-prop).
   */
  updateProp: (propName: string, value: string, previous?: string, mode?: "remove") => void;
  /** Uppdatera markdown-children på aktiv slide. */
  updateContent: (content: string) => void;
  /**
   * Deploy-läget för aktiv presentation. När "local-only" visas
   * media-platshållare istället för faktisk media i audience-vyn.
   */
  mediaMode: "full" | "cloud-media" | "local-only";
}

const EditContext = createContext<EditContextValue>({
  editMode: false,
  slideContent: "",
  updateProp: () => {},
  updateContent: () => {},
  mediaMode: "full",
});

interface EditProviderProps {
  editMode: boolean;
  slideContent?: string;
  mediaMode?: "full" | "cloud-media" | "local-only";
  updateProp: (propName: string, value: string, previous?: string, mode?: "remove") => void;
  updateContent: (content: string) => void;
  children: ReactNode;
}

export function EditProvider({
  editMode,
  slideContent = "",
  mediaMode = "full",
  updateProp,
  updateContent,
  children,
}: EditProviderProps) {
  return (
    <EditContext.Provider value={{ editMode, slideContent, mediaMode, updateProp, updateContent }}>
      {children}
    </EditContext.Provider>
  );
}

/**
 * Audience-lägets kontext-provider. Sätter mediaMode utan att behöva skicka
 * funktioner från Server Component till Client Component (vilket inte är
 * tillåtet i Next.js RSC-modellen). Används av AudiencePresentation.
 */
const noop = () => {};

interface AudienceEditProviderProps {
  mediaMode: "full" | "cloud-media" | "local-only";
  children: ReactNode;
}

export function AudienceEditProvider({ mediaMode, children }: AudienceEditProviderProps) {
  return (
    <EditContext.Provider
      value={{
        editMode: false,
        slideContent: "",
        mediaMode,
        updateProp: noop,
        updateContent: noop,
      }}
    >
      {children}
    </EditContext.Provider>
  );
}

export function useInlineEdit() {
  return useContext(EditContext);
}

// ============================================================================
// EditableMedia — wrapper för bilder och videos som visar en klickbar overlay
// i edit-mode. Klick öppnar en popover med URL/path-input som uppdaterar
// motsvarande prop.
// ============================================================================

interface EditableMediaProps {
  /** Propnamn att uppdatera ("src", "image", "background", "videoSrc", "logo"). */
  path: string;
  /** Nuvarande värde (URL eller lokal path). */
  value: string;
  /** Label som visas i popovern. Default: path. */
  label?: string;
  /** Typ av media — påverkar hjälptext. */
  mediaType?: "image" | "video" | "audio";
  /** Barnet (img, video, osv.) som visas i icke-edit-mode. */
  children: ReactNode;
}

export function EditableMedia({
  path,
  value,
  label,
  mediaType = "image",
  children,
}: EditableMediaProps) {
  const { editMode, mediaMode, updateProp } = useInlineEdit();
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLSpanElement>(null);

  // I audience-vyer med local-only-läge: ersätt media med platshållare.
  if (mediaMode === "local-only" && !editMode) {
    const icon = mediaType === "video" ? "🎬" : mediaType === "audio" ? "🔊" : "📷";
    const text =
      mediaType === "video"
        ? "Video visas på presentatörens skärm"
        : mediaType === "audio"
          ? "Ljud spelas på presentatörens skärm"
          : "Bild visas på presentatörens skärm";
    return (
      <div
        aria-label={text}
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          width: "100%",
          height: "100%",
          minHeight: "180px",
          background:
            "repeating-linear-gradient(45deg, rgba(236,126,38,0.06) 0px, rgba(236,126,38,0.06) 10px, rgba(236,126,38,0.1) 10px, rgba(236,126,38,0.1) 20px)",
          border: "2px dashed rgba(236, 126, 38, 0.35)",
          borderRadius: "0.75rem",
          color: "rgba(236, 126, 38, 0.82)",
          fontFamily: "system-ui, -apple-system, sans-serif",
          fontSize: "clamp(0.8rem, 1.05vw, 1rem)",
          fontWeight: 500,
          textAlign: "center",
          padding: "1.5rem",
          gap: "0.5rem",
        }}
      >
        <div style={{ fontSize: "2.2rem", opacity: 0.85 }} aria-hidden>
          {icon}
        </div>
        <div>{text}</div>
      </div>
    );
  }

  if (!editMode) {
    return <>{children}</>;
  }

  const commit = (newValue: string) => {
    updateProp(path, newValue);
    setOpen(false);
  };

  return (
    <>
      <span
        ref={anchorRef}
        className="inline-edit-media"
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
        onMouseDown={(e) => e.stopPropagation()}
        style={{
          position: "relative",
          display: "inline-block",
          cursor: "pointer",
          outline: open
            ? "3px solid #EC7E26"
            : "3px dashed rgba(236, 126, 38, 0.45)",
          outlineOffset: "3px",
          borderRadius: "4px",
        }}
      >
        {children}
        <span
          aria-hidden
          style={{
            position: "absolute",
            top: "8px",
            right: "8px",
            background: "rgba(22, 22, 22, 0.92)",
            color: "#EC7E26",
            padding: "4px 10px",
            borderRadius: "4px",
            fontSize: "10px",
            fontWeight: 700,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            fontFamily: "system-ui, -apple-system, sans-serif",
            pointerEvents: "none",
            boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
          }}
        >
          ✎ Byt {mediaType === "video" ? "video" : mediaType === "audio" ? "ljud" : "bild"}
        </span>
      </span>
      {open && (
        <MediaPickerPopover
          anchorRef={anchorRef}
          initialValue={value}
          label={label ?? path}
          mediaType={mediaType}
          onCommit={commit}
          onCancel={() => setOpen(false)}
        />
      )}
    </>
  );
}

interface MediaPickerPopoverProps {
  anchorRef: React.RefObject<HTMLElement | null>;
  initialValue: string;
  label: string;
  mediaType: "image" | "video" | "audio";
  onCommit: (value: string) => void;
  onCancel: () => void;
}

function MediaPickerPopover({
  anchorRef,
  initialValue,
  label,
  mediaType,
  onCommit,
  onCancel,
}: MediaPickerPopoverProps) {
  const [value, setValue] = useState(initialValue);
  const [position, setPosition] = useState<{
    top: number;
    left: number;
    minWidth: number;
  } | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useLayoutEffect(() => {
    const anchor = anchorRef.current;
    if (!anchor) return;
    const rect = anchor.getBoundingClientRect();
    const viewportW = window.innerWidth;
    const popoverMinWidth = Math.min(480, viewportW - 48);
    const left = Math.min(
      Math.max(rect.left, 16),
      viewportW - popoverMinWidth - 16
    );
    const top = rect.bottom + 8;
    setPosition({ top, left, minWidth: popoverMinWidth });
  }, [anchorRef]);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onCancel();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onCancel]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!popoverRef.current) return;
      if (popoverRef.current.contains(e.target as Node)) return;
      onCancel();
    };
    const timer = setTimeout(() => {
      document.addEventListener("mousedown", handler);
    }, 50);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("mousedown", handler);
    };
  }, [onCancel]);

  if (!position) return null;

  const mediaLabel =
    mediaType === "video" ? "video" : mediaType === "audio" ? "ljud" : "bild";
  const hint =
    mediaType === "video"
      ? "Klistra in en URL (https://…) eller en lokal path (/videos/…)"
      : mediaType === "audio"
        ? "Klistra in en URL eller lokal path (/ljud/…)"
        : "Klistra in en URL (https://…) eller en lokal path (/bilder/…)";

  const content = (
    <div
      ref={popoverRef}
      style={{
        position: "fixed",
        top: position.top,
        left: position.left,
        minWidth: position.minWidth,
        maxWidth: "min(720px, calc(100vw - 32px))",
        zIndex: 10000,
        background: "#161616",
        border: "1px solid rgba(236, 126, 38, 0.5)",
        borderRadius: "8px",
        boxShadow: "0 24px 48px -8px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)",
        padding: "12px 14px",
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      <div
        style={{
          fontSize: "10px",
          fontWeight: 600,
          letterSpacing: "0.15em",
          textTransform: "uppercase",
          color: "#EC7E26",
          marginBottom: "6px",
        }}
      >
        Byt {mediaLabel} · {label}
      </div>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            onCommit(value);
          }
        }}
        placeholder={`t.ex. https://... eller /${mediaLabel === "video" ? "videos" : mediaLabel === "ljud" ? "ljud" : "bilder"}/min.${mediaType === "video" ? "mp4" : mediaType === "audio" ? "mp3" : "jpg"}`}
        style={{
          width: "100%",
          background: "rgba(0,0,0,0.4)",
          border: "1px solid rgba(255,255,255,0.12)",
          borderRadius: "4px",
          padding: "8px 10px",
          color: "#F7F1E6",
          fontSize: "13px",
          fontFamily:
            "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
          outline: "none",
        }}
      />
      <div
        style={{
          fontSize: "11px",
          color: "rgba(247,241,230,0.5)",
          marginTop: "6px",
          lineHeight: 1.4,
        }}
      >
        {hint}
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginTop: "10px",
          fontSize: "11px",
          color: "rgba(247, 241, 230, 0.5)",
        }}
      >
        <span>
          <kbd style={kbdStyle}>Enter</kbd> spara · <kbd style={kbdStyle}>Esc</kbd> avbryt
        </span>
        <button
          type="button"
          onClick={() => onCommit(value)}
          style={{
            background: "#EC7E26",
            color: "#0a0908",
            border: "none",
            padding: "5px 14px",
            borderRadius: "4px",
            fontSize: "12px",
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            cursor: "pointer",
            fontFamily: "inherit",
          }}
        >
          Uppdatera
        </button>
      </div>
    </div>
  );

  if (typeof document === "undefined") return null;
  return createPortal(content, document.body);
}

// ============================================================================
// EditableText — wrapper-komponent som i edit-mode gör sitt barn klickbart
// och öppnar en inline popover när man klickar. Utanför edit-mode renderas
// bara barnet utan overhead.
//
// Användning:
//   <EditableText path="title" value={title}>
//     <h1>{title}</h1>
//   </EditableText>
//
// Path är propnamnet ("title", "subtitle", "kicker") ELLER "content" för
// markdown-children. Vid commit anropas respektive updateProp/updateContent.
// ============================================================================

/** Kontroll för en separat prop som redigeras samtidigt via toolbar i popovern. */
export interface SizeControl {
  /** Propnamn att uppdatera (t.ex. "titleSize"). */
  prop: string;
  /** Nuvarande värde. */
  current?: string;
  /** Tillgängliga val. Default ["sm", "md", "lg", "xl"]. */
  options?: readonly string[];
  /** Label ovanför knapparna. Default "Storlek". */
  label?: string;
}

interface EditableTextProps {
  /** Avoid matching a scene's decorative span/div selectors in inline-edit mode. */
  neutralWrapper?: boolean;
  /** Propnamn ("title", "subtitle", "kicker" osv) eller "content" för MDX-children. */
  path: string;
  /** Nuvarande värde. Valfritt för path="content" (läses då från context). */
  value?: string;
  /** Textarea istället för single-line input? Auto-detekteras för "content" och värden med newline. */
  multiline?: boolean;
  /** Label som visas i popovern (default: path). */
  label?: string;
  /** Placeholder i textarean. */
  placeholder?: string;
  /** Rendera som block-element istället för inline span (för block-layouter). */
  block?: boolean;
  /** Extra styling för wrapper-elementet (t.ex. display: contents för transparent layout). */
  wrapperStyle?: React.CSSProperties;
  /**
   * En eller flera extra size-kontroller som visas som knappserier i popovern.
   * T.ex. { prop: "titleSize", current: "md", options: ["sm","md","lg","xl"] }.
   */
  sizeControls?: SizeControl[];
  /** Barnet som renderas (det faktiska UI:t). */
  children: ReactNode;
}

export function EditableText({
  neutralWrapper = false,
  path,
  value,
  multiline,
  label,
  placeholder,
  block,
  wrapperStyle,
  sizeControls,
  children,
}: EditableTextProps) {
  const { editMode, slideContent, updateProp, updateContent } = useInlineEdit();
  const { wrapperStyle: colorStyle } = useFieldColor(path);
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLElement>(null);

  // Fältets egen textfärg måste gälla när Joel PRESENTERAR, inte bara när han
  // redigerar — därför wrappas barnen även utanför edit-läget. Wrappern har
  // display: contents och finns alltså inte i layouten; den bara ärver ner
  // en omsatt --text till mallens egen `color: var(--text)`.
  if (!editMode) {
    if (!colorStyle) return <>{children}</>;
    return createElement(neutralWrapper ? "edit-text" : "span", { style: colorStyle }, children);
  }

  // Resolva värdet: explicit value vinner, annars slideContent för path="content".
  const resolvedValue =
    value != null ? value : path === "content" ? slideContent : "";

  const commit = (newValue: string) => {
    if (path === "content") {
      updateContent(newValue);
    } else {
      updateProp(path, newValue, resolvedValue);
    }
    setOpen(false);
  };

  const isMultiline =
    multiline ??
    (path === "content" ||
      (typeof resolvedValue === "string" && resolvedValue.includes("\n")));

  const baseStyle: React.CSSProperties = {
    cursor: "text",
    outline: open ? "2px solid #EC7E26" : "2px dashed rgba(236, 126, 38, 0.35)",
    outlineOffset: "2px",
    borderRadius: "2px",
    transition: "outline-color 0.12s ease",
    background: open ? "rgba(236, 126, 38, 0.12)" : undefined,
    ...wrapperStyle,
    // Fältfärgen läggs sist så den vinner över wrapperStyle.
    ...(colorStyle ?? {}),
    // …men display:contents får inte gälla här: handtaget behöver en egen box
    // för att kunna ritas med outline och mätas för popoverns position.
    display: block ? "block" : "inline",
  };

  return (
    <>
      {createElement(neutralWrapper ? "edit-text" : block ? "div" : "span", {
        ref: anchorRef,
        onClick: (e: React.MouseEvent) => {
          e.stopPropagation();
          setOpen(true);
        },
        onMouseDown: (e: React.MouseEvent) => {
          e.stopPropagation();
        },
        className: "inline-edit-handle",
        style: baseStyle,
      }, children)}
      {open && (
        <InlinePopover
          anchorRef={anchorRef}
          initialValue={resolvedValue}
          multiline={isMultiline}
          label={label ?? path}
          placeholder={placeholder}
          sizeControls={sizeControls}
          onSizeChange={(sizeProp, newSize) => updateProp(sizeProp, newSize)}
          colorField={fieldColorProp(path)}
          onColorChange={(prop, newColor) => updateProp(prop, newColor)}
          onCommit={commit}
          onCancel={() => setOpen(false)}
          onRemove={() => {
            if (path === "content") updateContent("");
            else updateProp(path, "", resolvedValue, "remove");
            setOpen(false);
          }}
        />
      )}
    </>
  );
}

// ============================================================================
// InlinePopover — en flytande editor som positionerar sig vid ankarelementets
// bounding rect (screen coords, via fixed + portal). Autosize textarea,
// Enter commitar (Shift+Enter för ny rad i multiline), Esc avbryter.
// ============================================================================

export interface InlinePopoverProps {
  anchorRef: React.RefObject<HTMLElement | null>;
  initialValue: string;
  multiline: boolean;
  label: string;
  placeholder?: string;
  sizeControls?: SizeControl[];
  onSizeChange?: (prop: string, value: string) => void;
  /** Propnamnet fältets textfärg lagras under, t.ex. "titleColor". */
  colorField?: string;
  onColorChange?: (prop: string, value: string) => void;
  onCommit: (value: string) => void;
  onCancel: () => void;
  /** "Ta bort": delen försvinner från sliden (en rad, en punkt, fältet töms). */
  onRemove?: () => void;
}

export function InlinePopover({
  anchorRef,
  initialValue,
  multiline,
  label,
  placeholder,
  sizeControls,
  onSizeChange,
  colorField,
  onColorChange,
  onCommit,
  onCancel,
  onRemove,
}: InlinePopoverProps) {
  const [value, setValue] = useState(initialValue);
  const [position, setPosition] = useState<{
    top: number;
    left: number;
    minWidth: number;
  } | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Positionera under ankarelementet
  useLayoutEffect(() => {
    const anchor = anchorRef.current;
    if (!anchor) return;
    const rect = anchor.getBoundingClientRect();
    const viewportW = window.innerWidth;
    const popoverMinWidth = Math.max(320, Math.min(rect.width, viewportW - 48));
    const left = Math.min(
      Math.max(rect.left, 16),
      viewportW - popoverMinWidth - 16
    );
    const top = rect.bottom + 8;
    setPosition({ top, left, minWidth: popoverMinWidth });
  }, [anchorRef]);

  // Autofocus + select all — när rutan väl finns. Första renderingen har
  // ingen position och ritar inget fält, så en effekt som bara körde då
  // fokuserade aldrig: man fick klicka i fältet innan man kunde skriva.
  const positioned = position !== null;
  useEffect(() => {
    if (!positioned) return;
    const el = multiline ? textareaRef.current : inputRef.current;
    if (el) {
      el.focus();
      el.select();
    }
  }, [multiline, positioned]);

  // Stäng vid klick utanför
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!popoverRef.current) return;
      if (popoverRef.current.contains(e.target as Node)) return;
      // Klick utanför = commita (samma som blur)
      onCommit(value);
    };
    // Liten delay så första klicket som öppnade popovern inte triggar stängning
    const timer = setTimeout(() => {
      document.addEventListener("mousedown", handler);
    }, 50);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("mousedown", handler);
    };
  }, [onCommit, value]);

  // Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onCancel();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onCancel]);

  // Auto-grow textarea
  useEffect(() => {
    if (!multiline || !textareaRef.current) return;
    const ta = textareaRef.current;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 400) + "px";
  }, [value, multiline]);

  if (!position) return null;

  const content = (
    <div
      ref={popoverRef}
      className="inline-edit-popover"
      style={{
        position: "fixed",
        top: position.top,
        left: position.left,
        minWidth: position.minWidth,
        maxWidth: "min(720px, calc(100vw - 32px))",
        zIndex: 10000,
        background: "#161616",
        border: "1px solid rgba(236, 126, 38, 0.5)",
        borderRadius: "8px",
        boxShadow: "0 24px 48px -8px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)",
        padding: "10px 12px",
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      <div
        style={{
          fontSize: "10px",
          fontWeight: 600,
          letterSpacing: "0.15em",
          textTransform: "uppercase",
          color: "#EC7E26",
          marginBottom: "6px",
        }}
      >
        {label}
      </div>
      {multiline ? (
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              onCommit(value);
            }
          }}
          placeholder={placeholder}
          style={{
            width: "100%",
            minHeight: "80px",
            maxHeight: "400px",
            resize: "vertical",
            background: "rgba(0,0,0,0.4)",
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: "4px",
            padding: "8px 10px",
            color: "#F7F1E6",
            fontSize: "14px",
            lineHeight: 1.45,
            fontFamily:
              "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
            outline: "none",
          }}
        />
      ) : (
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              onCommit(value);
            }
          }}
          placeholder={placeholder}
          style={{
            width: "100%",
            background: "rgba(0,0,0,0.4)",
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: "4px",
            padding: "8px 10px",
            color: "#F7F1E6",
            fontSize: "14px",
            fontFamily: "system-ui, -apple-system, sans-serif",
            outline: "none",
          }}
        />
      )}
      {sizeControls && sizeControls.length > 0 && onSizeChange ? (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "6px",
            marginTop: "8px",
            paddingTop: "8px",
            borderTop: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          {sizeControls.map((sc) => {
            const options = sc.options ?? ["sm", "md", "lg", "xl"];
            return (
              <div
                key={sc.prop}
                style={{ display: "flex", alignItems: "center", gap: "8px" }}
              >
                <span
                  style={{
                    fontSize: "10px",
                    fontWeight: 600,
                    letterSpacing: "0.15em",
                    textTransform: "uppercase",
                    color: "rgba(247,241,230,0.55)",
                    minWidth: "3.5rem",
                  }}
                >
                  {sc.label ?? "Storlek"}
                </span>
                <div style={{ display: "flex", gap: "4px" }}>
                  {options.map((opt) => {
                    const active = sc.current === opt;
                    return (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => onSizeChange(sc.prop, opt)}
                        style={{
                          padding: "4px 10px",
                          borderRadius: "4px",
                          border: active
                            ? "1px solid #EC7E26"
                            : "1px solid rgba(255,255,255,0.12)",
                          background: active
                            ? "rgba(236,126,38,0.15)"
                            : "rgba(255,255,255,0.04)",
                          color: active ? "#EC7E26" : "rgba(247,241,230,0.75)",
                          fontSize: "11px",
                          fontWeight: 600,
                          textTransform: "uppercase",
                          letterSpacing: "0.08em",
                          cursor: "pointer",
                          transition: "all 0.12s ease",
                          fontFamily: "inherit",
                        }}
                      >
                        {opt}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      ) : null}
      {colorField && onColorChange ? (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            marginTop: "8px",
            paddingTop: "8px",
            borderTop: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <span
            style={{
              fontSize: "10px",
              fontWeight: 600,
              letterSpacing: "0.15em",
              textTransform: "uppercase",
              color: "rgba(247,241,230,0.55)",
              minWidth: "3.5rem",
            }}
          >
            Färg
          </span>
          <div style={{ display: "flex", gap: "5px" }}>
            {FIELD_TEXT_COLORS.map((c) => (
              <button
                key={c.label}
                type="button"
                onClick={() => onColorChange(colorField, c.value)}
                title={c.title}
                style={{
                  width: "20px",
                  height: "20px",
                  borderRadius: "4px",
                  // Temaknappen visar en delad ruta — den följer temat och
                  // har därför ingen egen färg att visa.
                  background:
                    c.value === ""
                      ? "linear-gradient(135deg, #F7F1E6 50%, #161616 50%)"
                      : c.swatch,
                  border: "1px solid rgba(255,255,255,0.28)",
                  cursor: "pointer",
                  padding: 0,
                }}
              />
            ))}
          </div>
        </div>
      ) : null}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginTop: "8px",
          fontSize: "11px",
          color: "rgba(247, 241, 230, 0.5)",
        }}
      >
        {onRemove ? (
          <button
            type="button"
            onMouseDown={(e) => e.stopPropagation()}
            onClick={onRemove}
            title="Ta bort den här delen från sliden. Ångra med Ctrl+Z."
            style={{
              padding: "3px 9px",
              borderRadius: "4px",
              border: "1px solid rgba(255,255,255,0.18)",
              background: "rgba(255,255,255,0.04)",
              color: "rgba(247,241,230,0.85)",
              fontSize: "11px",
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            Ta bort
          </button>
        ) : null}
        <span>
          {multiline ? (
            <>
              <kbd style={kbdStyle}>⌘</kbd>
              <kbd style={kbdStyle}>Enter</kbd> spara · <kbd style={kbdStyle}>Esc</kbd> avbryt
            </>
          ) : (
            <>
              <kbd style={kbdStyle}>Enter</kbd> spara · <kbd style={kbdStyle}>Esc</kbd> avbryt
            </>
          )}
        </span>
        <span>
          <code style={{ color: "rgba(247,241,230,0.7)" }}>**fet**</code> ·{" "}
          <code style={{ color: "rgba(247,241,230,0.7)" }}>*kursiv*</code>
        </span>
      </div>
    </div>
  );

  // Render via portal så den hamnar ovanpå allt annat och inte påverkas
  // av parent-transformationer (t.ex. den skalade preview-containern)
  if (typeof document === "undefined") return null;
  return createPortal(content, document.body);
}

// ============================================================================
// GhostHandle — en "+"-placeholder som visas i edit-mode där en valfri prop
// eller ett extra innehåll KAN läggas till. Klick öppnar en popover med
// tomt fält. På commit skapas/sätts värdet.
// ============================================================================

interface GhostHandleProps {
  /** Propnamn att sätta ("subtitle", "kicker", "tagline" osv). */
  path: string;
  /** Label som visas i "chippen" och i popovern (t.ex. "+ subtitle"). */
  label: string;
  /** Multiline-input istället för single-line? */
  multiline?: boolean;
  /** Placeholder i textfältet när popovern är öppen. */
  placeholder?: string;
  /** Stöd för inline- eller block-rendering av chippen. Default inline. */
  block?: boolean;
  /** Extra styling till chippen. */
  chipStyle?: React.CSSProperties;
}

export function GhostHandle({
  path,
  label,
  multiline,
  placeholder,
  block,
  chipStyle,
}: GhostHandleProps) {
  const { editMode, updateProp, updateContent } = useInlineEdit();
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLElement>(null);

  if (!editMode) return null;

  const commit = (newValue: string) => {
    const trimmed = newValue.trim();
    if (!trimmed) {
      setOpen(false);
      return;
    }
    if (path === "content") {
      updateContent(newValue);
    } else {
      updateProp(path, newValue);
    }
    setOpen(false);
  };

  const Wrapper = block ? "div" : "span";

  const base: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: "4px",
    padding: "3px 8px",
    border: "1.5px dashed rgba(236, 126, 38, 0.55)",
    borderRadius: "12px",
    background: "rgba(236, 126, 38, 0.06)",
    color: "rgba(236, 126, 38, 0.85)",
    fontFamily: "system-ui, -apple-system, sans-serif",
    fontSize: "11px",
    fontWeight: 600,
    letterSpacing: "0.05em",
    cursor: "pointer",
    transition: "all 0.12s ease",
    userSelect: "none",
    ...chipStyle,
  };

  return (
    <>
      <Wrapper
        ref={anchorRef as React.RefObject<HTMLDivElement & HTMLSpanElement>}
        className="inline-edit-ghost"
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
        onMouseDown={(e) => e.stopPropagation()}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLElement).style.background =
            "rgba(236, 126, 38, 0.14)";
          (e.currentTarget as HTMLElement).style.borderColor =
            "rgba(236, 126, 38, 0.8)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.background =
            "rgba(236, 126, 38, 0.06)";
          (e.currentTarget as HTMLElement).style.borderColor =
            "rgba(236, 126, 38, 0.55)";
        }}
        style={base}
      >
        {label}
      </Wrapper>
      {open && (
        <InlinePopover
          anchorRef={anchorRef}
          initialValue=""
          multiline={multiline ?? false}
          label={label.replace(/^\+\s*/, "")}
          placeholder={placeholder}
          onCommit={commit}
          onCancel={() => setOpen(false)}
        />
      )}
    </>
  );
}

const kbdStyle: React.CSSProperties = {
  display: "inline-block",
  padding: "1px 5px",
  margin: "0 2px",
  background: "rgba(255,255,255,0.08)",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: "3px",
  fontSize: "10px",
  fontFamily:
    "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  color: "rgba(247,241,230,0.8)",
};

"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  listFloatingVideos,
  uploadFloatingVideo,
  deleteFloatingVideo,
  type FloatingVideoItem,
} from "@/lib/floating-video-actions";

interface AddVideoModalProps {
  open: boolean;
  slug: string;
  onClose: () => void;
  /** Callback med web-path/URL till vald video. */
  onPick: (videoPath: string) => void;
}

/**
 * AddVideoModal — välj eller ladda upp en video att lägga som FloatingVideo-overlay.
 *
 * Speglar AddImageModal:
 *  - Grid av befintliga videos i public/videos/[slug]/
 *  - Upload-zon (drag-drop eller klicka)
 *  - URL-input för YouTube/Vimeo eller direkt video-URL
 */
export function AddVideoModal({ open, slug, onClose, onPick }: AddVideoModalProps) {
  const [videos, setVideos] = useState<FloatingVideoItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, startUpload] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [urlInput, setUrlInput] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setUrlInput("");
    setLoading(true);
    listFloatingVideos(slug)
      .then((items) => {
        setVideos(items);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [open, slug]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  const handleFile = (file: File) => {
    setError(null);
    const formData = new FormData();
    formData.append("file", file);
    startUpload(async () => {
      try {
        const result = await uploadFloatingVideo(slug, formData);
        onPick(result.path);
        onClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      }
    });
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = "";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlInput.trim()) return;
    onPick(urlInput.trim());
    onClose();
  };

  const handleDelete = async (filename: string) => {
    if (!confirm(`Ta bort ${filename}?`)) return;
    try {
      await deleteFloatingVideo(slug, filename);
      setVideos((prev) => prev.filter((vid) => vid.name !== filename));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
          style={{
            position: "fixed",
            inset: 0,
            background: "var(--picker-backdrop)",
            backdropFilter: "blur(6px)",
            WebkitBackdropFilter: "blur(6px)",
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "2rem",
          }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "min(900px, 100%)",
              maxHeight: "85vh",
              background: "var(--picker-surface)",
              border: "1px solid rgba(var(--picker-accent-rgb),0.4)",
              borderRadius: "0.6rem",
              boxShadow: "0 24px 80px rgba(0,0,0,0.6)",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
          >
            {/* Header */}
            <div
              style={{
                padding: "1.2rem 1.6rem",
                borderBottom: "1px solid rgba(var(--picker-ink-rgb),0.1)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div>
                <h2
                  style={{
                    fontFamily: "var(--font-display)",
                    fontWeight: 700,
                    fontSize: "1.25rem",
                    color: "var(--picker-ink)",
                    margin: 0,
                    letterSpacing: "-0.01em",
                  }}
                >
                  Lägg till video
                </h2>
                <div
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: "0.7rem",
                    letterSpacing: "0.2em",
                    textTransform: "uppercase",
                    color: "rgba(var(--picker-ink-rgb),0.45)",
                    marginTop: "0.2rem",
                  }}
                >
                  /videos/{slug}/
                </div>
              </div>
              <button
                onClick={onClose}
                style={{
                  background: "transparent",
                  border: "1px solid rgba(var(--picker-ink-rgb),0.2)",
                  color: "rgba(var(--picker-ink-rgb),0.7)",
                  padding: "0.3rem 0.7rem",
                  borderRadius: "0.3rem",
                  fontFamily: "var(--font-mono)",
                  fontSize: "0.75rem",
                  cursor: "pointer",
                }}
              >
                ESC
              </button>
            </div>

            {/* Body */}
            <div
              style={{
                flex: 1,
                overflow: "auto",
                padding: "1.4rem 1.6rem",
                display: "flex",
                flexDirection: "column",
                gap: "1.4rem",
              }}
            >
              {error ? (
                <div
                  style={{
                    background: "rgba(var(--picker-alert-rgb),0.15)",
                    border: "1px solid rgba(var(--picker-alert-rgb),0.4)",
                    borderRadius: "0.3rem",
                    padding: "0.7rem 1rem",
                    color: "var(--picker-alert)",
                    fontFamily: "var(--font-display)",
                    fontSize: "0.9rem",
                  }}
                >
                  {error}
                </div>
              ) : null}

              {/* Befintliga videos */}
              <section>
                <SectionHeader>Befintliga videos</SectionHeader>
                {loading ? (
                  <Empty text="Laddar…" />
                ) : videos.length === 0 ? (
                  <Empty text="Inga videos ännu — ladda upp en nedan eller klistra in en URL." />
                ) : (
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
                      gap: "0.7rem",
                    }}
                  >
                    {videos.map((vid) => (
                      <VideoThumb
                        key={vid.name}
                        video={vid}
                        onPick={() => {
                          onPick(vid.path);
                          onClose();
                        }}
                        onDelete={() => handleDelete(vid.name)}
                      />
                    ))}
                  </div>
                )}
              </section>

              {/* Upload-zon */}
              <section>
                <SectionHeader>Ladda upp ny</SectionHeader>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOver(true);
                  }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                  style={{
                    border: dragOver
                      ? "2px dashed var(--picker-accent)"
                      : "2px dashed rgba(var(--picker-ink-rgb),0.2)",
                    borderRadius: "0.4rem",
                    padding: "1.5rem",
                    textAlign: "center",
                    cursor: "pointer",
                    background: dragOver
                      ? "rgba(var(--picker-accent-rgb),0.08)"
                      : "rgba(var(--picker-ink-rgb),0.02)",
                    transition: "all 200ms ease",
                  }}
                >
                  <div
                    style={{
                      fontFamily: "var(--font-display)",
                      fontSize: "0.95rem",
                      color: "rgba(var(--picker-ink-rgb),0.85)",
                      marginBottom: "0.3rem",
                    }}
                  >
                    {uploading ? "Laddar upp…" : "Dra hit en video eller klicka för att välja"}
                  </div>
                  <div
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: "0.7rem",
                      letterSpacing: "0.15em",
                      color: "rgba(var(--picker-ink-rgb),0.4)",
                    }}
                  >
                    MP4 · WEBM · OGG · MOV · M4V · max 500 MB
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="video/mp4,video/webm,video/ogg,video/quicktime,video/x-m4v"
                    onChange={handleFileInput}
                    style={{ display: "none" }}
                  />
                </div>
              </section>

              {/* URL-input för YouTube/Vimeo eller direkt video-URL */}
              <section>
                <SectionHeader>Eller — extern URL (YouTube / Vimeo / direkt MP4)</SectionHeader>
                <form onSubmit={handleUrlSubmit} style={{ display: "flex", gap: "0.5rem" }}>
                  <input
                    type="url"
                    placeholder="https://youtu.be/... eller https://...mp4"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    style={{
                      flex: 1,
                      background: "rgba(var(--picker-ink-rgb),0.04)",
                      border: "1px solid rgba(var(--picker-ink-rgb),0.15)",
                      borderRadius: "0.3rem",
                      padding: "0.6rem 0.8rem",
                      color: "var(--picker-ink)",
                      fontFamily: "var(--font-display)",
                      fontSize: "0.9rem",
                      outline: "none",
                    }}
                  />
                  <button
                    type="submit"
                    disabled={!urlInput.trim()}
                    style={{
                      background: urlInput.trim() ? "var(--picker-accent)" : "rgba(var(--picker-ink-rgb),0.1)",
                      color: urlInput.trim() ? "var(--picker-on-accent)" : "rgba(var(--picker-ink-rgb),0.4)",
                      border: "none",
                      padding: "0.6rem 1.2rem",
                      borderRadius: "0.3rem",
                      fontFamily: "var(--font-mono)",
                      fontSize: "0.75rem",
                      letterSpacing: "0.15em",
                      textTransform: "uppercase",
                      fontWeight: 700,
                      cursor: urlInput.trim() ? "pointer" : "not-allowed",
                      transition: "all 150ms ease",
                    }}
                  >
                    Lägg till
                  </button>
                </form>
              </section>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontFamily: "var(--font-mono)",
        fontSize: "0.7rem",
        letterSpacing: "0.25em",
        textTransform: "uppercase",
        color: "rgba(var(--picker-ink-rgb),0.45)",
        fontWeight: 700,
        marginBottom: "0.7rem",
      }}
    >
      {children}
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div
      style={{
        fontFamily: "var(--font-display)",
        fontStyle: "italic",
        fontSize: "0.85rem",
        color: "rgba(var(--picker-ink-rgb),0.45)",
        padding: "0.8rem 0",
      }}
    >
      {text}
    </div>
  );
}

function VideoThumb({
  video,
  onPick,
  onDelete,
}: {
  video: FloatingVideoItem;
  onPick: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      style={{
        position: "relative",
        background: "rgba(var(--picker-ink-rgb),0.04)",
        border: "1px solid rgba(var(--picker-ink-rgb),0.1)",
        borderRadius: "0.3rem",
        overflow: "hidden",
        aspectRatio: "16 / 9",
        cursor: "pointer",
      }}
      onClick={onPick}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = "rgba(var(--picker-accent-rgb),0.6)";
        const v = e.currentTarget.querySelector("video");
        v?.play().catch(() => {});
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "rgba(var(--picker-ink-rgb),0.1)";
        const v = e.currentTarget.querySelector("video");
        if (v) {
          v.pause();
          v.currentTime = 0;
        }
      }}
    >
      <video
        src={video.path}
        muted
        playsInline
        preload="metadata"
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          display: "block",
          pointerEvents: "none",
        }}
      />
      {/* Play-ikon overlay */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "2.4rem",
          height: "2.4rem",
          borderRadius: "50%",
          background: "var(--picker-scrim-solid)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          pointerEvents: "none",
          color: "var(--picker-on-scrim)",
          fontSize: "1rem",
        }}
      >
        ▶
      </div>
      {/* Filnamn-overlay */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          background: "var(--picker-scrim)",
          padding: "0.6rem 0.5rem 0.4rem",
          fontFamily: "var(--font-mono)",
          fontSize: "0.65rem",
          color: "var(--picker-on-scrim)",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {video.name}
      </div>
      {/* Delete-knapp */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        style={{
          position: "absolute",
          top: "0.3rem",
          right: "0.3rem",
          background: "rgba(var(--picker-alert-rgb),0.85)",
          color: "var(--picker-ink)",
          border: "none",
          width: "1.4rem",
          height: "1.4rem",
          borderRadius: "50%",
          fontFamily: "var(--font-mono)",
          fontSize: "0.8rem",
          fontWeight: 700,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          opacity: 0.8,
        }}
        title="Ta bort"
      >
        ×
      </button>
    </div>
  );
}

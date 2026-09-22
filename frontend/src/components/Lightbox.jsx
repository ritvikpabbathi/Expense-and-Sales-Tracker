import { useEffect } from "react";
import { downloadImage } from "../lib/downloadImage";

export default function Lightbox({ image, onClose }) {
  useEffect(() => {
    if (!image) return;
    const onKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [image, onClose]);

  if (!image) return null;

  return (
    <div className="lightbox-overlay" onClick={onClose}>
      <div className="lightbox-controls">
        <button
          type="button"
          className="lightbox-icon-btn"
          onClick={(e) => {
            e.stopPropagation();
            downloadImage(image.url, image.alt);
          }}
          aria-label="Download"
          title="Download image"
        >
          ⬇
        </button>
        <button type="button" className="lightbox-icon-btn" onClick={onClose} aria-label="Close" title="Close">
          ×
        </button>
      </div>
      <img className="lightbox-image" src={image.url} alt={image.alt} onClick={(e) => e.stopPropagation()} />
    </div>
  );
}

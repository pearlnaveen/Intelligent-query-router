import React, { useState, useEffect, useRef, useCallback } from "react";
import { FaCamera, FaRedo, FaUndo, FaSync, FaUserCircle, FaTimes } from "react-icons/fa";
import { MdOutlineDragIndicator } from "react-icons/md";

/* ─── Reusable Photo Crop Modal ────────────────────────────────────────── */
const PhotoCropModal = ({ onSave, onCancel, existingPhoto, title = "Adjust Photo" }) => {
  const [imgSrc, setImgSrc] = useState(existingPhoto || null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [rotation, setRotation] = useState(0);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);

  // High quality square crop canvas size
  const CANVAS_SIZE = 400;
  const DISPLAY_SIZE = 240;

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setImgSrc(ev.target.result);
      setZoom(1);
      setOffset({ x: 0, y: 0 });
      setRotation(0);
    };
    reader.readAsDataURL(file);
  };

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !imgSrc) return;
    const ctx = canvas.getContext("2d");
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
      ctx.save();

      // Fill background with clean neutral tone if image doesn't cover
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

      // Translate to center for pan and rotation
      // Scale offset to match high-res canvas dimensions
      const scaleMultiplier = CANVAS_SIZE / DISPLAY_SIZE;
      ctx.translate(CANVAS_SIZE / 2 + offset.x * scaleMultiplier, CANVAS_SIZE / 2 + offset.y * scaleMultiplier);
      ctx.rotate((rotation * Math.PI) / 180);

      const scale = zoom;
      const imgAspect = img.width / img.height;
      let drawW, drawH;
      if (imgAspect > 1) {
        drawH = CANVAS_SIZE * scale;
        drawW = drawH * imgAspect;
      } else {
        drawW = CANVAS_SIZE * scale;
        drawH = drawW / imgAspect;
      }

      // Draw full rectangular/square photo without circular clipping to preserve full corners
      ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
      ctx.restore();
    };
    img.src = imgSrc;
  }, [imgSrc, zoom, offset, rotation, CANVAS_SIZE, DISPLAY_SIZE]);

  useEffect(() => {
    draw();
  }, [draw]);

  const handleMouseDown = (e) => {
    setDragging(true);
    setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
  };
  const handleMouseMove = (e) => {
    if (dragging) {
      setOffset({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
    }
  };
  const handleMouseUp = () => setDragging(false);

  const handleTouchStart = (e) => {
    if (e.touches.length === 1) {
      setDragging(true);
      setDragStart({ x: e.touches[0].clientX - offset.x, y: e.touches[0].clientY - offset.y });
    }
  };
  const handleTouchMove = (e) => {
    if (dragging && e.touches.length === 1) {
      setOffset({ x: e.touches[0].clientX - dragStart.x, y: e.touches[0].clientY - dragStart.y });
    }
  };
  const handleTouchEnd = () => setDragging(false);

  const handleWheel = (e) => {
    e.preventDefault();
    setZoom((z) => Math.min(3, Math.max(0.5, +(z - e.deltaY * 0.001).toFixed(2))));
  };

  const handleApply = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    // Export full square image with no black corners
    onSave(canvas.toDataURL("image/jpeg", 0.95));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl w-[440px] max-w-[92vw] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between bg-gradient-to-r from-purple-600 to-indigo-600 px-5 py-3.5">
          <div className="flex items-center gap-2 text-white font-bold text-sm">
            <FaUserCircle size={18} /> {title}
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="text-white hover:text-gray-200 transition p-1 cursor-pointer"
          >
            <FaTimes size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 flex flex-col items-center gap-4">
          {!imgSrc ? (
            <div
              onClick={() => fileInputRef.current && fileInputRef.current.click()}
              className="cursor-pointer flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-purple-400 bg-gray-50 text-purple-500 hover:bg-purple-50 transition shadow-inner"
              style={{ width: DISPLAY_SIZE, height: DISPLAY_SIZE }}
            >
              <FaCamera size={36} className="mb-2" />
              <span className="text-xs font-semibold text-center px-4">Click to choose image</span>
              <span className="text-[10px] text-gray-400 mt-1">PNG, JPG, WEBP formats</span>
            </div>
          ) : (
            <div
              className="relative rounded-2xl overflow-hidden shadow-lg border-4 border-indigo-200 select-none"
              style={{ width: DISPLAY_SIZE, height: DISPLAY_SIZE }}
            >
              <canvas
                ref={canvasRef}
                width={CANVAS_SIZE}
                height={CANVAS_SIZE}
                style={{ width: DISPLAY_SIZE, height: DISPLAY_SIZE }}
                className="cursor-grab active:cursor-grabbing block"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                onWheel={handleWheel}
              />
              {/* Circular framing guide overlay */}
              <div
                className="absolute inset-0 rounded-full border-2 border-dashed border-white/70 pointer-events-none shadow-[0_0_0_9999px_rgba(0,0,0,0.15)]"
                title="Circular avatar guideline"
              />
            </div>
          )}

          {imgSrc && (
            <>
              {/* Zoom Slider */}
              <div className="w-full flex items-center gap-3 px-2">
                <span className="text-gray-400 text-xs">🔍</span>
                <input
                  type="range"
                  min="0.5"
                  max="3"
                  step="0.01"
                  value={zoom}
                  onChange={(e) => setZoom(parseFloat(e.target.value))}
                  className="flex-1 accent-indigo-600 cursor-pointer"
                />
                <span className="text-xs text-gray-600 font-semibold w-10 text-right">
                  {Math.round(zoom * 100)}%
                </span>
              </div>

              {/* Pan & Zoom Hint */}
              <div className="flex items-center gap-1.5 text-xs text-gray-500 bg-gray-100 rounded-full px-4 py-1 font-medium">
                <MdOutlineDragIndicator size={15} /> Drag image to position • Scroll to zoom
              </div>

              {/* Controls Toolbar */}
              <div className="flex items-center justify-between w-full px-2 pt-1">
                <button
                  type="button"
                  onClick={() => fileInputRef.current && fileInputRef.current.click()}
                  className="flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-800 font-bold cursor-pointer bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition"
                >
                  <FaUserCircle size={13} /> Change Image
                </button>
                <div className="flex items-center gap-2 text-gray-500">
                  <button
                    type="button"
                    onClick={() => setRotation((r) => r - 90)}
                    title="Rotate Left (90°)"
                    className="p-1.5 hover:bg-gray-100 rounded-lg hover:text-indigo-600 transition cursor-pointer"
                  >
                    <FaUndo size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setOffset({ x: 0, y: 0 });
                      setZoom(1);
                      setRotation(0);
                    }}
                    title="Reset Position & Zoom"
                    className="p-1.5 hover:bg-gray-100 rounded-lg hover:text-indigo-600 transition cursor-pointer"
                  >
                    <FaSync size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setRotation((r) => r + 90)}
                    title="Rotate Right (90°)"
                    className="p-1.5 hover:bg-gray-100 rounded-lg hover:text-indigo-600 transition cursor-pointer"
                  >
                    <FaRedo size={14} />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex justify-end gap-3 px-6 pb-5 pt-2 border-t border-gray-100">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm font-semibold rounded-xl border border-gray-300 text-gray-600 hover:bg-gray-50 transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleApply}
            disabled={!imgSrc}
            className="px-5 py-2 text-sm font-bold rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:opacity-95 transition disabled:opacity-40 flex items-center gap-2 cursor-pointer shadow-md"
          >
            ✓ Apply & Save Photo
          </button>
        </div>

        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>
    </div>
  );
};

export default PhotoCropModal;


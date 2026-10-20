import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Maximize2, Minimize2, RotateCcw } from 'lucide-react';

// Common Reusable Modal Component with Resizing Capability
const Modal = ({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  size = 'md',
  showFooter = true,
  onSubmit = null,
  submitText = 'Save',
  cancelText = 'Cancel',
  isSubmitting = false,
  className = ''
}) => {
  const [dimensions, setDimensions] = useState({ width: null, height: null });
  const [isMaximized, setIsMaximized] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const prevDimensionsRef = useRef({ width: null, height: null });
  const modalRef = useRef(null);

  // Reset dimensions on modal open
  useEffect(() => {
    if (isOpen) {
      setDimensions({ width: null, height: null });
      setIsMaximized(false);
      setIsResizing(false);
    }
  }, [isOpen]);

  // Keyboard Escape listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        if (onClose) onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-2xl',
    lg: 'max-w-4xl',
    xl: 'max-w-6xl',
  };

  const handleResetSize = () => {
    setDimensions({ width: null, height: null });
    setIsMaximized(false);
  };

  const toggleMaximize = () => {
    if (isMaximized) {
      setIsMaximized(false);
      setDimensions(prevDimensionsRef.current);
    } else {
      if (modalRef.current) {
        const rect = modalRef.current.getBoundingClientRect();
        prevDimensionsRef.current = dimensions.width ? dimensions : { width: rect.width, height: rect.height };
      }
      setIsMaximized(true);
    }
  };

  // Mouse Drag Resizing Logic
  const handleMouseDown = useCallback((e, direction) => {
    e.preventDefault();
    e.stopPropagation();
    if (isMaximized) return;

    const startX = e.clientX;
    const startY = e.clientY;
    let startW = dimensions.width;
    let startH = dimensions.height;

    if (modalRef.current) {
      const rect = modalRef.current.getBoundingClientRect();
      if (!startW) startW = rect.width;
      if (!startH) startH = rect.height;
    }

    setIsResizing(true);

    const handleMouseMove = (moveEvent) => {
      const dx = moveEvent.clientX - startX;
      const dy = moveEvent.clientY - startY;

      let newW = startW;
      let newH = startH;

      if (direction.includes('e')) newW = startW + dx * 2;
      else if (direction.includes('w')) newW = startW - dx * 2;

      if (direction.includes('s')) newH = startH + dy * 2;
      else if (direction.includes('n')) newH = startH - dy * 2;

      const minW = Math.min(320, window.innerWidth - 32);
      const maxW = window.innerWidth - 32;
      const minH = Math.min(220, window.innerHeight - 32);
      const maxH = window.innerHeight - 32;

      newW = Math.max(minW, Math.min(maxW, newW));
      newH = Math.max(minH, Math.min(maxH, newH));

      setDimensions({ width: Math.round(newW), height: Math.round(newH) });
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  }, [dimensions, isMaximized]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (onSubmit) onSubmit();
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const isResized = dimensions.width !== null || dimensions.height !== null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black bg-opacity-60 backdrop-blur-sm"
      onClick={handleBackdropClick}
    >
      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f3f4f6;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: linear-gradient(135deg, #4f46e5 0%, #8b5cf6 100%);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
        }
      `}</style>
      
      <div 
        ref={modalRef}
        style={{
          width: isMaximized ? 'calc(100vw - 32px)' : (dimensions.width ? `${dimensions.width}px` : undefined),
          height: isMaximized ? 'calc(100vh - 32px)' : (dimensions.height ? `${dimensions.height}px` : undefined),
          maxWidth: 'calc(100vw - 32px)',
          maxHeight: 'calc(100vh - 32px)',
          minWidth: '320px',
          minHeight: '220px',
        }}
        className={`relative bg-white rounded-xl shadow-2xl w-full ${!dimensions.width && !isMaximized ? sizeClasses[size] : ''} flex flex-col overflow-hidden transition-shadow duration-300 ${isResizing ? 'select-none' : ''} ${className}`}
      >
        {/* Resize Edge Handles */}
        {!isMaximized && (
          <>
            <div className="absolute top-0 left-4 right-4 h-2 cursor-ns-resize z-30" onMouseDown={(e) => handleMouseDown(e, 'n')} title="Resize height" />
            <div className="absolute bottom-0 left-4 right-4 h-2 cursor-ns-resize z-30" onMouseDown={(e) => handleMouseDown(e, 's')} title="Resize height" />
            <div className="absolute left-0 top-4 bottom-4 w-2 cursor-ew-resize z-30" onMouseDown={(e) => handleMouseDown(e, 'w')} title="Resize width" />
            <div className="absolute right-0 top-4 bottom-4 w-2 cursor-ew-resize z-30" onMouseDown={(e) => handleMouseDown(e, 'e')} title="Resize width" />

            {/* Resize Corner Handles */}
            <div className="absolute top-0 left-0 w-4 h-4 cursor-nwse-resize z-40" onMouseDown={(e) => handleMouseDown(e, 'nw')} title="Resize modal" />
            <div className="absolute top-0 right-0 w-4 h-4 cursor-nesw-resize z-40" onMouseDown={(e) => handleMouseDown(e, 'ne')} title="Resize modal" />
            <div className="absolute bottom-0 left-0 w-4 h-4 cursor-nesw-resize z-40" onMouseDown={(e) => handleMouseDown(e, 'sw')} title="Resize modal" />
            <div 
              className="absolute bottom-0 right-0 w-6 h-6 cursor-nwse-resize z-40 flex items-end justify-end p-1 text-gray-400 hover:text-indigo-600 transition-colors group" 
              onMouseDown={(e) => handleMouseDown(e, 'se')}
              title="Drag to resize popup"
            >
              <svg className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100" viewBox="0 0 16 16" fill="currentColor">
                <path d="M14 14H12V12H14V14ZM14 10H12V8H14V10ZM10 14H8V12H10V14ZM14 6H12V4H14V6ZM10 10H8V8H10V10ZM6 14H4V12H6V14Z" />
              </svg>
            </div>
          </>
        )}

        {/* Modal Header */}
        <div 
          className="flex items-center justify-between px-5 py-4 border-b bg-gradient-to-r from-indigo-600 via-indigo-500 to-indigo-600 shrink-0 select-none cursor-default"
          onDoubleClick={handleResetSize}
          title="Double-click header to reset size"
        >
          <h3 className="text-lg sm:text-xl font-bold text-white truncate pr-2 flex-1">{title}</h3>
          
          <div className="flex items-center gap-1 shrink-0">
            {(isResized || isMaximized) && (
              <button
                type="button"
                onClick={handleResetSize}
                className="p-1.5 rounded-full hover:bg-white/20 text-white transition-all duration-200"
                title="Reset popup size"
              >
                <RotateCcw size={16} />
              </button>
            )}

            <button
              type="button"
              onClick={toggleMaximize}
              className="p-1.5 rounded-full hover:bg-white/20 text-white transition-all duration-200"
              title={isMaximized ? "Restore size" : "Maximize popup"}
            >
              {isMaximized ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-white/20 text-white transition-all duration-200"
              title="Close modal"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Modal Form and Body */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
          <div className={`p-4 sm:p-6 flex-1 overflow-y-auto custom-scrollbar ${!dimensions.height && !isMaximized ? 'max-h-[calc(100vh-200px)]' : ''}`}>
            {children}
          </div>

          {showFooter && (
            <div className="p-4 sm:p-5 border-t bg-gradient-to-r from-gray-50 to-gray-100 flex justify-end gap-3 shrink-0">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2 rounded-lg border-2 border-gray-300 text-gray-700 text-sm font-semibold hover:bg-gray-100 hover:border-gray-400 transition-all duration-200"
              >
                {cancelText}
              </button>
              {onSubmit && (
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2 rounded-lg bg-gradient-to-r from-indigo-600 via-indigo-500 to-indigo-600 text-white text-sm font-semibold hover:from-indigo-700 hover:via-indigo-600 hover:to-indigo-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg transform hover:scale-105"
                >
                  {isSubmitting ? 'Saving...' : submitText}
                </button>
              )}
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default Modal;
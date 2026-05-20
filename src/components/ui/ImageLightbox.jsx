import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

export default function ImageLightbox({ urls, startIndex = 0, onClose }) {
  const [current, setCurrent] = React.useState(startIndex);

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') setCurrent(c => (c + 1) % urls.length);
      if (e.key === 'ArrowLeft') setCurrent(c => (c - 1 + urls.length) % urls.length);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [urls.length, onClose]);

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] bg-black/90 flex items-center justify-center"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <button
        className="absolute top-4 right-4 text-white bg-black/50 rounded-full p-2 hover:bg-black/80 transition-colors z-10"
        onClick={e => { e.stopPropagation(); onClose(); }}
      >
        <X className="w-6 h-6" />
      </button>

      {urls.length > 1 && (
        <>
          <button
            className="absolute left-4 top-1/2 -translate-y-1/2 text-white bg-black/50 rounded-full p-2 hover:bg-black/80 transition-colors z-10"
            onClick={e => { e.stopPropagation(); setCurrent(c => (c - 1 + urls.length) % urls.length); }}
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button
            className="absolute right-4 top-1/2 -translate-y-1/2 text-white bg-black/50 rounded-full p-2 hover:bg-black/80 transition-colors z-10"
            onClick={e => { e.stopPropagation(); setCurrent(c => (c + 1) % urls.length); }}
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </>
      )}

      <img
        src={urls[current]}
        alt=""
        className="max-h-[90vh] max-w-[90vw] object-contain rounded shadow-2xl"
        onClick={e => e.stopPropagation()}
      />

      {urls.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white text-sm bg-black/50 px-3 py-1 rounded-full">
          {current + 1} / {urls.length}
        </div>
      )}
    </div>,
    document.body
  );
}
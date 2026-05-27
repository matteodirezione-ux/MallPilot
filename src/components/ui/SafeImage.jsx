import React, { useState, useCallback } from 'react';

/**
 * SafeImage - immagine con retry automatico e fallback
 * Riprova fino a maxRetries volte con delay crescente in caso di errore di caricamento.
 */
export default function SafeImage({ src, alt = '', className = '', style, fallback = null, maxRetries = 3, onClick }) {
  const [retries, setRetries] = useState(0);
  const [failed, setFailed] = useState(false);
  const [key, setKey] = useState(0);

  const handleError = useCallback(() => {
    if (retries < maxRetries) {
      const delay = Math.min(1000 * (retries + 1), 5000);
      setTimeout(() => {
        setRetries(r => r + 1);
        setKey(k => k + 1); // forza reload dell'img
      }, delay);
    } else {
      setFailed(true);
    }
  }, [retries, maxRetries]);

  if (!src || failed) {
    return fallback || null;
  }

  return (
    <img
      key={key}
      src={src}
      alt={alt}
      className={className}
      style={style}
      onError={handleError}
      onClick={onClick}
    />
  );
}
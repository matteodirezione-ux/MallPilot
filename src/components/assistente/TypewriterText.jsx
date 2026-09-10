import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';

export default function TypewriterText({ text, speed = 12, onDone }) {
  const [count, setCount] = useState(0);
  const displayedRef = useRef('');

  // Reset when the text changes completely (new message / conversation switch)
  useEffect(() => {
    if (count > 0 && !text.startsWith(displayedRef.current)) {
      setCount(0);
      displayedRef.current = '';
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);

  // Advance one character at a time
  useEffect(() => {
    if (count < text.length) {
      const timer = setTimeout(() => {
        displayedRef.current = text.slice(0, count + 1);
        setCount(count + 1);
      }, speed);
      return () => clearTimeout(timer);
    } else if (onDone) {
      onDone();
    }
  }, [count, text, speed, onDone]);

  const displayed = text.slice(0, count);
  const isTyping = count < text.length;

  return (
    <>
      <ReactMarkdown className="text-sm prose prose-sm max-w-none prose-p:my-1 prose-ul:my-1 prose-li:my-0">
        {displayed}
      </ReactMarkdown>
      {isTyping && (
        <span className="inline-block w-1.5 h-4 bg-slate-400 animate-pulse ml-0.5 align-middle rounded-sm" />
      )}
    </>
  );
}
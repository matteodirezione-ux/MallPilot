import React from 'react';
import ReactMarkdown from 'react-markdown';
import TypewriterText from '@/components/assistente/TypewriterText';

export default function MessageBubble({ message, animate = false }) {
  const isUser = message.role === 'user';

  // Strip the hidden [Contesto: ...] block from user messages for display
  const displayContent = isUser
    ? (message.content || '').split('\n\n[Contesto:')[0]
    : message.content;

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div className={`max-w-[85%] ${isUser ? 'order-2' : ''}`}>
        {displayContent && (
          isUser ? (
            <div className="bg-blue-600 text-white rounded-2xl rounded-tr-sm px-4 py-2.5 shadow-sm">
              <p className="text-sm whitespace-pre-wrap">{displayContent}</p>
            </div>
          ) : animate ? (
            <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-sm px-4 py-2.5 shadow-sm">
              <TypewriterText text={displayContent} speed={10} />
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-sm px-4 py-2.5 shadow-sm">
              <ReactMarkdown className="text-sm prose prose-sm max-w-none prose-p:my-1 prose-ul:my-1 prose-li:my-0">
                {displayContent}
              </ReactMarkdown>
            </div>
          )
        )}
      </div>
    </div>
  );
}
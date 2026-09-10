import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { ChevronDown, ChevronRight, Check, Loader2, X, AlertCircle, Wrench, Ticket, FileText, Search } from 'lucide-react';

const STATUS_CONFIG = {
  pending: { icon: Loader2, text: 'In attesa...', color: 'text-slate-400', spin: true },
  running: { icon: Loader2, text: 'In esecuzione...', color: 'text-blue-500', spin: true },
  in_progress: { icon: Loader2, text: 'In corso...', color: 'text-blue-500', spin: true },
  completed: { icon: Check, text: 'Completato', color: 'text-green-500', spin: false },
  success: { icon: Check, text: 'Completato', color: 'text-green-500', spin: false },
  failed: { icon: AlertCircle, text: 'Errore', color: 'text-red-500', spin: false },
  error: { icon: AlertCircle, text: 'Errore', color: 'text-red-500', spin: false },
};

const TOOL_ICONS = {
  Capex: Wrench,
  Ticket: Ticket,
  Report: FileText,
};

function FunctionDisplay({ toolCall }) {
  const [expanded, setExpanded] = useState(false);
  const status = STATUS_CONFIG[toolCall.status] || STATUS_CONFIG.pending;
  const StatusIcon = status.icon;
  const toolName = toolCall.name || 'Strumento';
  const ToolIcon = TOOL_ICONS[toolName] || Search;

  const dp = toolCall.display_projection || {};
  const hideDetails = dp.hide_details && dp.details_redacted;

  let parsedResults = null;
  if (toolCall.results) {
    try {
      parsedResults = typeof toolCall.results === 'string' ? JSON.parse(toolCall.results) : toolCall.results;
    } catch {
      parsedResults = toolCall.results;
    }
  }
  const isFailed = toolCall.status === 'failed' || toolCall.status === 'error' ||
    (typeof parsedResults === 'string' && /error|failed/i.test(parsedResults)) ||
    (parsedResults && parsedResults.success === false);

  let parsedArgs = null;
  if (toolCall.arguments_string) {
    try {
      parsedArgs = typeof toolCall.arguments_string === 'string' ? JSON.parse(toolCall.arguments_string) : toolCall.arguments_string;
    } catch {
      parsedArgs = toolCall.arguments_string;
    }
  }

  const label = isFailed ? (dp.error_label || 'Operazione non riuscita') : (toolCall.status === 'pending' || toolCall.status === 'running' || toolCall.status === 'in_progress' ? (dp.active_label || status.text) : (dp.label || status.text));

  if (hideDetails) {
    return (
      <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
        <StatusIcon className={`w-3.5 h-3.5 ${status.color} ${status.spin ? 'animate-spin' : ''}`} />
        <span>{label}</span>
      </div>
    );
  }

  return (
    <div className="mt-2 text-xs border border-slate-200 rounded-lg bg-slate-50 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-slate-100 transition-colors"
      >
        {expanded ? <ChevronDown className="w-3.5 h-3.5 text-slate-400" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-400" />}
        <ToolIcon className={`w-3.5 h-3.5 ${isFailed ? 'text-red-500' : status.color}`} />
        <span className="font-medium text-slate-700">{toolName}</span>
        <span className={`ml-auto flex items-center gap-1 ${isFailed ? 'text-red-500' : status.color}`}>
          <StatusIcon className={`w-3.5 h-3.5 ${status.spin ? 'animate-spin' : ''}`} />
          {label}
        </span>
      </button>
      {expanded && (
        <div className="px-3 pb-3 space-y-2">
          {parsedArgs && (
            <div>
              <p className="font-medium text-slate-600 mb-1">Parametri:</p>
              <pre className="bg-white border border-slate-200 rounded p-2 text-[11px] overflow-x-auto whitespace-pre-wrap break-words">{JSON.stringify(parsedArgs, null, 2)}</pre>
            </div>
          )}
          {parsedResults && (
            <div>
              <p className="font-medium text-slate-600 mb-1">Risultato:</p>
              <pre className="bg-white border border-slate-200 rounded p-2 text-[11px] overflow-x-auto whitespace-pre-wrap break-words">{JSON.stringify(parsedResults, null, 2)}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function MessageBubble({ message }) {
  const isUser = message.role === 'user';
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div className={`max-w-[85%] ${isUser ? 'order-2' : ''}`}>
        {message.content && (
          isUser ? (
            <div className="bg-blue-600 text-white rounded-2xl rounded-tr-sm px-4 py-2.5 shadow-sm">
              <p className="text-sm whitespace-pre-wrap">{message.content}</p>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-sm px-4 py-2.5 shadow-sm">
              <ReactMarkdown className="text-sm prose prose-sm max-w-none prose-p:my-1 prose-ul:my-1 prose-li:my-0">{message.content}</ReactMarkdown>
            </div>
          )
        )}
        {message.tool_calls?.map((toolCall, idx) => (
          <FunctionDisplay key={idx} toolCall={toolCall} />
        ))}
      </div>
    </div>
  );
}
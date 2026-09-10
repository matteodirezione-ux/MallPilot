import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Send, Trash2, Sparkles, X, Bot } from 'lucide-react';
import MessageBubble from '@/components/assistente/MessageBubble';

const AGENT_NAME = 'assistente_mallpilot';

export default function AssistenteWidget({ centroSelezionato, user }) {
  const [open, setOpen] = useState(false);
  const [activeConversationId, setActiveConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [animateLastIndex, setAnimateLastIndex] = useState(-1);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const activeConvRef = useRef(null);

  useEffect(() => {
    activeConvRef.current = activeConversationId;
  }, [activeConversationId]);

  useEffect(() => {
    if (activeConversationId) {
      setAnimateLastIndex(-1);
      const unsubscribe = base44.agents.subscribeToConversation(activeConversationId, (data) => {
        if (activeConvRef.current !== activeConversationId) return;
        setMessages(data.messages || []);
        setLoading(false);
      });
      return () => unsubscribe();
    }
  }, [activeConversationId]);

  // Track which message to animate with typewriter (last assistant message while/after loading)
  useEffect(() => {
    if (loading && messages.length > 0 && messages[messages.length - 1]?.role === 'assistant') {
      setAnimateLastIndex(messages.length - 1);
    }
  }, [loading, messages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  const handleClearConversation = async () => {
    const convId = activeConversationId;
    setActiveConversationId(null);
    setMessages([]);
    setLoading(false);
    activeConvRef.current = null;
    if (convId) {
      try {
        await base44.agents.updateConversation(convId, { metadata: { deleted: true } });
      } catch (e) {
        console.error('Errore pulizia conversazione:', e);
      }
    }
  };

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    const content = input.trim();
    setInput('');
    setAnimateLastIndex(-1);

    // Prepend center context so the agent knows which center to use (stripped from display in MessageBubble)
    const centerContext = centroSelezionato?.id && centroSelezionato.id !== 'tutti'
      ? `\n\n[Contesto: centro commerciale selezionato = "${centroSelezionato.nome}" (ID: ${centroSelezionato.id}). Usa sempre questo centro per le operazioni. Nelle risposte usa il nome del centro, non l'ID.]`
      : '';
    const fullContent = content + centerContext;

    let convId = activeConversationId;
    let conv = null;

    if (!convId) {
      try {
        conv = await base44.agents.createConversation({
          agent_name: AGENT_NAME,
          metadata: { name: content.slice(0, 40), description: '' }
        });
        convId = conv.id;
        setActiveConversationId(convId);
      } catch (e) {
        console.error('Errore creazione conversazione:', e);
        return;
      }
    }

    setLoading(true);
    try {
      await base44.agents.addMessage({ ...conv, id: convId }, { role: 'user', content: fullContent });
    } catch (e) {
      console.error('Errore invio messaggio:', e);
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!user || (user.tipo_account !== 'proprieta' && user.tipo_account !== 'direttore')) return null;

  return (
    <>
      {/* Floating button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-5 right-5 z-50 w-14 h-14 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 text-white shadow-lg hover:shadow-xl hover:scale-105 transition-all flex items-center justify-center group"
          aria-label="Apri assistente"
        >
          <Bot className="w-7 h-7" />
          <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-white" />
          <span className="absolute right-16 top-1/2 -translate-y-1/2 bg-slate-800 text-white text-xs px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
            Assistente AI
          </span>
        </button>
      )}

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-0 right-0 z-50 w-full sm:w-[420px] h-[100vh] sm:h-[600px] sm:max-h-[85vh] sm:bottom-5 sm:right-5 bg-white sm:rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white">
            <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="font-semibold text-sm truncate">Assistente Mall Pilot</h1>
              <p className="text-xs text-white/80 truncate">Online · Chiedi o fai creare</p>
            </div>
            <button className="p-1.5 rounded-lg hover:bg-white/10 transition-colors" onClick={handleClearConversation} title="Pulisci conversazione">
              <Trash2 className="w-5 h-5" />
            </button>
            <button className="p-1.5 rounded-lg hover:bg-white/10 transition-colors" onClick={() => setOpen(false)}>
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex flex-1 overflow-hidden relative">
            {/* Area chat */}
            <div className="flex-1 flex flex-col bg-slate-50 min-w-0">
              {/* Messaggi */}
              <div className="flex-1 overflow-y-auto px-3 py-4">
                {messages.length === 0 && !loading ? (
                  <div className="text-center py-8 px-2">
                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white mx-auto mb-3">
                      <Sparkles className="w-7 h-7" />
                    </div>
                    <h2 className="text-base font-semibold text-slate-800 mb-1.5">Ciao! Come posso aiutarti?</h2>
                    <p className="text-xs text-slate-500 mb-4">
                      Chiedi info o fai creare Capex, Ticket, segnalazioni
                    </p>
                    <div className="space-y-1.5">
                      {[
                        'Quante prenotazioni ci sono questo mese?',
                        'Crea un capex per ristrutturazione bagni',
                        'Apri un ticket urgente per guasto ascensore',
                      ].map((s, i) => (
                        <button
                          key={i}
                          onClick={() => { setInput(s); inputRef.current?.focus(); }}
                          className="w-full text-left text-xs px-3 py-2 rounded-lg border border-slate-200 bg-white hover:border-blue-300 hover:bg-blue-50 transition-colors text-slate-700"
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <>
                    {messages.map((msg, i) => (
                      <MessageBubble key={i} message={msg} animate={i === animateLastIndex && msg.role === 'assistant'} />
                    ))}
                    {loading && messages[messages.length - 1]?.role === 'user' && (
                      <div className="flex justify-start mb-4">
                        <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
                          <div className="flex gap-1">
                            <span className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                            <span className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                            <span className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                          </div>
                        </div>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </>
                )}
              </div>

              {/* Input */}
              <div className="px-3 py-2.5 bg-white border-t border-slate-200">
                <div className="flex gap-2 items-end">
                  <textarea
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Scrivi un messaggio..."
                    rows={1}
                    className="flex-1 resize-none rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent max-h-24"
                    style={{ minHeight: '38px' }}
                  />
                  <Button
                    onClick={handleSend}
                    disabled={!input.trim() || loading}
                    size="icon"
                    className="rounded-xl h-[38px] w-[38px] flex-shrink-0"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, Send, MessageSquare, Trash2, Sparkles, X, Menu, Bot } from 'lucide-react';
import MessageBubble from '@/components/assistente/MessageBubble';

const AGENT_NAME = 'assistente_mallpilot';

export default function AssistenteWidget({ centroSelezionato, user }) {
  const [open, setOpen] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [conversations, setConversations] = useState([]);
  const [activeConversationId, setActiveConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (user) loadConversations();
  }, [user]);

  useEffect(() => {
    if (activeConversationId) {
      const unsubscribe = base44.agents.subscribeToConversation(activeConversationId, (data) => {
        setMessages(data.messages || []);
        setLoading(false);
      });
      return () => unsubscribe();
    }
  }, [activeConversationId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  const loadConversations = async () => {
    try {
      const list = await base44.agents.listConversations({ agent_name: AGENT_NAME });
      setConversations(list || []);
      if (list && list.length > 0 && !activeConversationId) {
        setActiveConversationId(list[0].id);
        setMessages(list[0].messages || []);
      }
    } catch (e) {
      console.error('Errore caricamento conversazioni:', e);
    } finally {
      setLoadingConversations(false);
    }
  };

  const handleNewConversation = async () => {
    try {
      const conv = await base44.agents.createConversation({
        agent_name: AGENT_NAME,
        metadata: { name: 'Nuova conversazione', description: '' }
      });
      setConversations(prev => [conv, ...prev]);
      setActiveConversationId(conv.id);
      setMessages([]);
      setShowSidebar(false);
      inputRef.current?.focus();
    } catch (e) {
      console.error('Errore creazione conversazione:', e);
    }
  };

  const handleSelectConversation = (conv) => {
    setActiveConversationId(conv.id);
    setMessages(conv.messages || []);
    setShowSidebar(false);
  };

  const handleDeleteConversation = async (e, convId) => {
    e.stopPropagation();
    try {
      await base44.agents.updateConversation(convId, { metadata: { deleted: true } });
      const remaining = conversations.filter(c => c.id !== convId);
      setConversations(remaining);
      if (activeConversationId === convId) {
        if (remaining.length > 0) {
          setActiveConversationId(remaining[0].id);
          setMessages(remaining[0].messages || []);
        } else {
          setActiveConversationId(null);
          setMessages([]);
        }
      }
    } catch (e) {
      console.error('Errore eliminazione conversazione:', e);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    const content = input.trim();
    setInput('');

    let convId = activeConversationId;
    let conv = conversations.find(c => c.id === convId);

    if (!convId) {
      try {
        conv = await base44.agents.createConversation({
          agent_name: AGENT_NAME,
          metadata: { name: content.slice(0, 40), description: '' }
        });
        convId = conv.id;
        setConversations(prev => [conv, ...prev]);
        setActiveConversationId(convId);
      } catch (e) {
        console.error('Errore creazione conversazione:', e);
        return;
      }
    }

    if (conv && (!conv.metadata?.name || conv.metadata.name === 'Nuova conversazione')) {
      base44.agents.updateConversation(convId, { metadata: { name: content.slice(0, 40), description: '' } }).catch(() => {});
    }

    setLoading(true);
    try {
      await base44.agents.addMessage({ ...conv, id: convId }, { role: 'user', content });
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
            <button className="p-1.5 rounded-lg hover:bg-white/10 transition-colors" onClick={() => setShowSidebar(!showSidebar)}>
              <Menu className="w-5 h-5" />
            </button>
            <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="font-semibold text-sm truncate">Assistente Mall Pilot</h1>
              <p className="text-xs text-white/80 truncate">Online · Chiedi o fai creare</p>
            </div>
            <button className="p-1.5 rounded-lg hover:bg-white/10 transition-colors" onClick={() => { setOpen(false); setShowSidebar(false); }}>
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex flex-1 overflow-hidden relative">
            {/* Sidebar conversazioni */}
            {showSidebar && (
              <>
                <div className="absolute inset-0 bg-black/20 z-10 sm:hidden" onClick={() => setShowSidebar(false)} />
                <div className="absolute sm:relative z-20 h-full w-64 bg-white border-r border-slate-200 flex flex-col">
                  <div className="p-2 border-b border-slate-200">
                    <Button onClick={handleNewConversation} size="sm" className="w-full gap-2">
                      <Plus className="w-4 h-4" />
                      Nuova
                    </Button>
                  </div>
                  <ScrollArea className="flex-1">
                    <div className="p-2 space-y-1">
                      {loadingConversations ? (
                        <p className="text-sm text-slate-400 text-center py-4">Caricamento...</p>
                      ) : conversations.length === 0 ? (
                        <p className="text-sm text-slate-400 text-center py-4">Nessuna conversazione</p>
                      ) : (
                        conversations.map(conv => (
                          <button
                            key={conv.id}
                            onClick={() => handleSelectConversation(conv)}
                            className={`w-full group flex items-center gap-2 px-2.5 py-2 rounded-lg text-left transition-colors ${activeConversationId === conv.id ? 'bg-blue-50 text-blue-700' : 'hover:bg-slate-100 text-slate-700'}`}
                          >
                            <MessageSquare className="w-3.5 h-3.5 flex-shrink-0 opacity-60" />
                            <span className="text-xs truncate flex-1">{conv.metadata?.name || 'Senza titolo'}</span>
                            <span
                              onClick={(e) => handleDeleteConversation(e, conv.id)}
                              className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-red-100 rounded transition-all"
                            >
                              <Trash2 className="w-3 h-3 text-red-500" />
                            </span>
                          </button>
                        ))
                      )}
                    </div>
                  </ScrollArea>
                </div>
              </>
            )}

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
                      <MessageBubble key={i} message={msg} />
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
import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, Send, MessageSquare, Trash2, Sparkles, X, Menu } from 'lucide-react';
import MessageBubble from '@/components/assistente/MessageBubble';

const AGENT_NAME = 'assistente_mallpilot';

export default function AssistenteAI({ centroSelezionato, user }) {
  const [conversations, setConversations] = useState([]);
  const [activeConversationId, setActiveConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    loadConversations();
  }, []);

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
      setSidebarOpen(false);
      inputRef.current?.focus();
    } catch (e) {
      console.error('Errore creazione conversazione:', e);
    }
  };

  const handleSelectConversation = (conv) => {
    setActiveConversationId(conv.id);
    setMessages(conv.messages || []);
    setSidebarOpen(false);
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

    // Crea una conversazione se non ce n'è una attiva
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

    // Aggiorna il nome della conversazione se è la prima message e il nome è generico
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

  const suggestions = [
    'Quante prenotazioni ci sono questo mese?',
    'Crea un capex per ristrutturazione bagni, costo previsto 15000, categoria strutturale',
    'Apri un ticket urgente per guasto ascensore',
    'Qual è il budget marketing di quest\'anno?',
  ];

  return (
    <div className="flex h-[calc(100vh-4rem)] md:h-screen relative overflow-hidden">
      {/* Sidebar overlay mobile */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/40 z-30 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar conversazioni */}
      <aside className={`absolute md:relative z-40 md:z-auto h-full w-72 bg-white border-r border-slate-200 flex-col transition-transform duration-200 ${sidebarOpen ? 'flex translate-x-0' : 'flex -translate-x-full md:translate-x-0'}`}>
        <div className="p-3 border-b border-slate-200">
          <Button onClick={handleNewConversation} className="w-full gap-2">
            <Plus className="w-4 h-4" />
            Nuova conversazione
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
                  className={`w-full group flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-colors ${activeConversationId === conv.id ? 'bg-blue-50 text-blue-700' : 'hover:bg-slate-100 text-slate-700'}`}
                >
                  <MessageSquare className="w-4 h-4 flex-shrink-0 opacity-60" />
                  <span className="text-sm truncate flex-1">{conv.metadata?.name || 'Senza titolo'}</span>
                  <span
                    onClick={(e) => handleDeleteConversation(e, conv.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 rounded transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-red-500" />
                  </span>
                </button>
              ))
            )}
          </div>
        </ScrollArea>
      </aside>

      {/* Area chat */}
      <div className="flex-1 flex flex-col bg-slate-50 min-w-0">
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 bg-white border-b border-slate-200">
          <button className="md:hidden p-1.5 rounded-lg hover:bg-slate-100" onClick={() => setSidebarOpen(true)}>
            <Menu className="w-5 h-5 text-slate-600" />
          </button>
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white">
            <Sparkles className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="font-semibold text-slate-800 truncate">Assistente Mall Pilot</h1>
            <p className="text-xs text-slate-500 truncate">Chiedi info o fai creare Capex, Ticket, segnalazioni</p>
          </div>
          {centroSelezionato && (
            <span className="hidden sm:inline text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded-full truncate max-w-[200px]">
              {centroSelezionato.nome}
            </span>
          )}
        </div>

        {/* Messaggi */}
        <div className="flex-1 overflow-y-auto px-4 py-6">
          <div className="max-w-3xl mx-auto">
            {messages.length === 0 && !loading ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white mx-auto mb-4">
                  <Sparkles className="w-8 h-8" />
                </div>
                <h2 className="text-xl font-semibold text-slate-800 mb-2">Ciao! Sono l'assistente Mall Pilot</h2>
                <p className="text-slate-500 mb-6 max-w-md mx-auto">
                  Puoi chiedermi informazioni sulle prenotazioni, ticket, capex, budget e molto altro.
                  Oppure puoi chiedermi di creare un nuovo Capex, un Ticket o una segnalazione.
                </p>
                <div className="grid sm:grid-cols-2 gap-2 max-w-lg mx-auto">
                  {suggestions.map((s, i) => (
                    <button
                      key={i}
                      onClick={() => { setInput(s); inputRef.current?.focus(); }}
                      className="text-left text-sm px-3 py-2.5 rounded-lg border border-slate-200 bg-white hover:border-blue-300 hover:bg-blue-50 transition-colors text-slate-700"
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
        </div>

        {/* Input */}
        <div className="px-4 py-3 bg-white border-t border-slate-200">
          <div className="max-w-3xl mx-auto flex gap-2 items-end">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Scrivi un messaggio... (es. 'Crea un ticket urgente per guasto ascensore')"
              rows={1}
              className="flex-1 resize-none rounded-xl border border-slate-300 bg-slate-50 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent max-h-32"
              style={{ minHeight: '42px' }}
            />
            <Button
              onClick={handleSend}
              disabled={!input.trim() || loading}
              size="icon"
              className="rounded-xl h-[42px] w-[42px] flex-shrink-0"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
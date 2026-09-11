import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Send, RefreshCw, Sparkles, X, Bot, Eye } from 'lucide-react';
import MessageBubble from '@/components/assistente/MessageBubble';

const AGENT_NAME = 'assistente_mallpilot';

export default function AssistenteWidget({ centroSelezionato, user }) {
  const [open, setOpen] = useState(false);
  const [activeConversationId, setActiveConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [animateIndex, setAnimateIndex] = useState(-1);
  const animatedKeysRef = useRef(new Set());
  const pendingUserContentRef = useRef(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const activeConvRef = useRef(null);

  const FEATURED_QUESTION = 'Cosa non sto vedendo?';

  const SUGGESTED_QUESTIONS = [
    // Panoramica
    'Cosa devo sapere oggi?',
    'Fammi il punto del centro',
    'Quali sono le priorità di oggi?',
    'Ci sono criticità da attenzionare?',
    'Cosa rischia di essere dimenticato?',
    'Cosa è cambiato dall\'ultima volta che ho controllato?',
    // Facility
    'Quali problemi di facility sono aperti?',
    'Quali manutenzioni sono in ritardo?',
    'Quali interventi devo sollecitare?',
    'Quali ticket sono aperti da più tempo?',
    'Ci sono problemi ricorrenti?',
    'Quali fornitori stanno lavorando in ritardo?',
    // Sicurezza
    'Ci sono criticità sulla sicurezza?',
    'Quali controlli sono in scadenza?',
    'Quali controlli risultano scaduti?',
    'Ci sono anomalie ancora da risolvere?',
    'Fammi il punto sulla sicurezza del centro',
    'Ci sono documenti o attività dei fornitori da verificare?',
    // Scadenze
    'Cosa scade nei prossimi 7 giorni?',
    'Cosa scade nei prossimi 30 giorni?',
    'Quali attività sono già scadute?',
    'Fammi vedere tutte le scadenze critiche',
    'Quali documenti devo rinnovare?',
    // Eventi
    'Come siamo messi con i prossimi eventi?',
    'Cosa manca per il prossimo evento?',
    'Fammi la checklist del prossimo evento',
    'Ci sono attività in ritardo per gli eventi?',
    'Quali fornitori devo sollecitare per gli eventi?',
  ];
  const [shuffledSuggestions, setShuffledSuggestions] = useState([]);

  useEffect(() => {
    if (messages.length === 0 && !loading) {
      const shuffled = [...SUGGESTED_QUESTIONS].sort(() => Math.random() - 0.5).slice(0, 4);
      setShuffledSuggestions(shuffled);
    }
  }, [messages.length, loading, open]);

  useEffect(() => {
    activeConvRef.current = activeConversationId;
  }, [activeConversationId]);

  useEffect(() => {
    if (activeConversationId) {
      setAnimateIndex(-1);
      const unsubscribe = base44.agents.subscribeToConversation(activeConversationId, (data) => {
        if (activeConvRef.current !== activeConversationId) return;
        const allMsgs = data.messages || [];
        const msgs = allMsgs.filter(m => m.type !== 'thinking' && m.type !== 'reasoning');
        if (pendingUserContentRef.current) {
          const { question, fullContent } = pendingUserContentRef.current;
          const hasPending = msgs.some(m => m.role === 'user' && m.content && (m.content === fullContent || m.content.includes(question)));
          if (hasPending) {
            pendingUserContentRef.current = null;
            setMessages(msgs);
          } else {
            // Insert the pending user message BEFORE the last assistant message (correct chronological order)
            const lastIdx = msgs.length - 1;
            if (lastIdx >= 0 && msgs[lastIdx].role === 'assistant') {
              setMessages([...msgs.slice(0, lastIdx), { role: 'user', content: fullContent }, msgs[lastIdx]]);
            } else {
              setMessages([...msgs, { role: 'user', content: fullContent }]);
            }
          }
        } else {
          setMessages(msgs);
        }
        // Only stop loading when an actual assistant message arrives (not thinking/reasoning)
        const hasAssistant = msgs.some(m => m.role === 'assistant');
        if (hasAssistant) {
          setLoading(false);
        }
        if (msgs.length > 0) {
          const lastIdx = msgs.length - 1;
          const lastMsg = msgs[lastIdx];
          const key = lastMsg.id || `idx-${lastIdx}`;
          if (lastMsg.role === 'assistant' && !animatedKeysRef.current.has(key)) {
            animatedKeysRef.current.add(key);
            setAnimateIndex(lastIdx);
          } else if (lastMsg.role === 'user') {
            setAnimateIndex(-1);
          }
        }
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

  const handleClearConversation = async () => {
    const convId = activeConversationId;
    setActiveConversationId(null);
    setMessages([]);
    setLoading(false);
    activeConvRef.current = null;
    animatedKeysRef.current = new Set();
    setAnimateIndex(-1);
    pendingUserContentRef.current = null;
    if (convId) {
      try {
        await base44.agents.updateConversation(convId, { metadata: { deleted: true } });
      } catch (e) {
        console.error('Errore pulizia conversazione:', e);
      }
    }
  };

  const handleSend = async (overrideText) => {
    const text = overrideText ?? input;
    if (!text.trim() || loading) return;
    const content = text.trim();
    setInput('');
    setAnimateIndex(-1);

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

    pendingUserContentRef.current = { question: content, fullContent };
    setMessages(prev => [...prev, { role: 'user', content: fullContent }]);
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
              <h1 className="font-semibold text-sm truncate">Assistente MAX</h1>
              <p className="text-xs text-white/80 truncate">Online · Chiedi o fai creare</p>
            </div>
            <button className="p-1.5 rounded-lg hover:bg-white/10 transition-colors" onClick={handleClearConversation} title="Nuova conversazione">
              <RefreshCw className="w-5 h-5" />
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
                      <button
                        onClick={() => handleSend(FEATURED_QUESTION)}
                        className="w-full text-left text-xs px-3 py-2.5 rounded-lg border border-blue-300 bg-gradient-to-r from-blue-50 to-purple-50 hover:from-blue-100 hover:to-purple-100 transition-colors text-slate-800 font-medium flex items-center gap-2 shadow-sm"
                      >
                        <Eye className="w-4 h-4 text-blue-600 flex-shrink-0" />
                        <span>{FEATURED_QUESTION}</span>
                      </button>
                      {shuffledSuggestions.map((s, i) => (
                        <button
                          key={i}
                          onClick={() => handleSend(s)}
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
                      <MessageBubble key={i} message={msg} animate={i === animateIndex && msg.role === 'assistant'} />
                    ))}
                    {loading && messages[messages.length - 1]?.role === 'user' && (
                      <div className="flex justify-start mb-4">
                        <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-sm px-4 py-2.5 shadow-sm">
                          <p className="text-sm text-slate-400 italic flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                            Sto pensando...
                          </p>
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
import React, { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

const TIPO_ICON = { task: '📋', prenotazione: '📅', manutenzione: '🔧' };

export default function NotificaBell({ user }) {
  const [notifiche, setNotifiche] = useState([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!user?.email) return;
    loadNotifiche();

    const unsubscribe = base44.entities.Notifica.subscribe((event) => {
      if (event.type === 'create' && event.data?.destinatario_email === user.email) {
        setNotifiche(prev => [event.data, ...prev]);
      } else if (event.type === 'update') {
        setNotifiche(prev => prev.map(n => n.id === event.id ? event.data : n));
      }
    });

    return () => unsubscribe();
  }, [user?.email]);

  const loadNotifiche = async () => {
    const data = await base44.entities.Notifica.filter(
      { destinatario_email: user.email },
      '-created_date',
      50
    );
    setNotifiche(data);
  };

  const unreadCount = notifiche.filter(n => !n.letta).length;

  const markAllRead = async () => {
    const unread = notifiche.filter(n => !n.letta);
    if (!unread.length) return;
    await Promise.all(unread.map(n => base44.entities.Notifica.update(n.id, { letta: true })));
    setNotifiche(prev => prev.map(n => ({ ...n, letta: true })));
  };

  const handleOpen = (isOpen) => {
    setOpen(isOpen);
    if (isOpen && unreadCount > 0) markAllRead();
  };

  return (
    <Popover open={open} onOpenChange={handleOpen}>
      <PopoverTrigger asChild>
        <button className="relative p-1.5 rounded-lg hover:bg-slate-100 transition-colors">
          <Bell className="w-5 h-5 text-slate-600" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start" side="right">
        <div className="p-3 border-b border-slate-200">
          <h3 className="font-semibold text-slate-800">Notifiche</h3>
        </div>
        <div className="max-h-80 overflow-y-auto">
          {notifiche.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-6">Nessuna notifica</p>
          ) : (
            notifiche.map(n => (
              <div key={n.id} className={`p-3 border-b border-slate-100 last:border-0 ${!n.letta ? 'bg-blue-50' : ''}`}>
                <div className="flex items-start gap-2">
                  <span className="text-base leading-none mt-0.5">{TIPO_ICON[n.tipo] || '🔔'}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 leading-snug">{n.titolo}</p>
                    {n.messaggio && <p className="text-xs text-slate-500 mt-0.5">{n.messaggio}</p>}
                    <p className="text-[10px] text-slate-400 mt-1">
                      {format(new Date(n.created_date), 'd MMM, HH:mm', { locale: it })}
                    </p>
                  </div>
                  {!n.letta && <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-1.5" />}
                </div>
              </div>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
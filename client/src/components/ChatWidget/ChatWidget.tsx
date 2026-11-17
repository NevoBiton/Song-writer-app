import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { Bot, Send, X, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';
import { useUILanguage } from '@/context/UILanguageContext';
import { useAuth } from '@/context/AuthContext';
import { getAvatarUrl } from '@/components/profile/ProfileModal';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const SUGGESTED_EN = [
  'Show my songs',
  'Create a song in G major',
  'What chords go with Am?',
];

const SUGGESTED_HE = [
  'הצג את השירים שלי',
  'צור שיר בסולם G',
  'אילו אקורדים מתאימים ל-Am?',
];

export function ChatWidget() {
  const { t, uiLang } = useUILanguage();
  const { user } = useAuth();
  const isRtl = uiLang === 'he';
  const displayName = user?.username || user?.email?.split('@')[0] || 'User';
  const avatarUrl = getAvatarUrl(user?.avatar, displayName);
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const widgetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (isOpen && widgetRef.current && !widgetRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const suggested = uiLang === 'he' ? SUGGESTED_HE : SUGGESTED_EN;

  useEffect(() => {
    if (isOpen) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading, isOpen]);

  useEffect(() => {
    if (isOpen) setTimeout(() => textareaRef.current?.focus(), 100);
  }, [isOpen]);

  async function sendMessage(text: string) {
    if (!text.trim() || loading) return;
    const userMsg: Message = { role: 'user', content: text.trim() };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInput('');
    setLoading(true);
    try {
      const { data } = await api.post<{ reply: string }>('/agent/chat', {
        messages: updatedMessages,
        lang: uiLang,
      });
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
    } catch {
      toast.error(t.agentError);
    } finally {
      setLoading(false);
      setTimeout(() => textareaRef.current?.focus(), 50);
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  }

  return (
    <div ref={widgetRef} className="fixed bottom-6 left-6 z-50 flex flex-col items-start gap-3">
      {/* Popover */}
      {isOpen && (
        <div className="w-80 sm:w-96 h-[480px] bg-card border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border flex-shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-amber-400 rounded-lg flex items-center justify-center">
                <Bot className="w-3.5 h-3.5 text-gray-900" />
              </div>
              <p className="text-sm font-semibold text-foreground">{t.agentTitle}</p>
            </div>
            <div className="flex items-center gap-1">
              {messages.length > 0 && (
                <button
                  onClick={() => setMessages([])}
                  className="text-muted-foreground hover:text-foreground transition-colors p-1"
                  title="Clear chat"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="text-muted-foreground hover:text-foreground transition-colors p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto no-scrollbar p-3 space-y-3 min-h-0" dir={isRtl ? 'rtl' : 'ltr'}>
            {messages.length === 0 && !loading && (
              <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-2">
                <p className="font-medium text-foreground text-sm">{t.agentEmpty}</p>
                <p className="text-xs text-muted-foreground">{t.agentEmptyDesc}</p>
                <div className="flex flex-wrap gap-1.5 justify-center">
                  {suggested.map(prompt => (
                    <button
                      key={prompt}
                      onClick={() => sendMessage(prompt)}
                      className="text-xs px-2.5 py-1 rounded-full border border-border hover:border-amber-400 hover:bg-amber-400/10 hover:text-amber-700 dark:hover:text-amber-400 transition-colors text-muted-foreground"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, i) => (
              <div key={i} className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                <div className="w-6 h-6 rounded-full flex-shrink-0 mt-0.5 overflow-hidden">
                  {msg.role === 'user'
                    ? <img src={avatarUrl} alt="avatar" className="w-full h-full object-cover" />
                    : <div className="w-full h-full bg-muted border border-border rounded-full flex items-center justify-center">
                        <Bot className="w-3 h-3 text-muted-foreground" />
                      </div>
                  }
                </div>
                <div className={`max-w-[80%] rounded-xl px-3 py-2 text-xs leading-relaxed whitespace-pre-wrap ${
                  msg.role === 'user'
                    ? 'bg-amber-400 text-gray-900 rounded-tr-sm'
                    : 'bg-muted text-foreground rounded-tl-sm'
                }`}>
                  {msg.content}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex gap-2">
                <div className="w-6 h-6 rounded-full bg-muted border border-border flex items-center justify-center flex-shrink-0">
                  <Bot className="w-3 h-3 text-muted-foreground" />
                </div>
                <div className="bg-muted rounded-xl rounded-tl-sm px-3 py-2.5 flex items-center gap-1">
                  <span className="w-1 h-1 bg-muted-foreground/50 rounded-full animate-bounce [animation-delay:-0.3s]" />
                  <span className="w-1 h-1 bg-muted-foreground/50 rounded-full animate-bounce [animation-delay:-0.15s]" />
                  <span className="w-1 h-1 bg-muted-foreground/50 rounded-full animate-bounce" />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="px-3 pb-3 pt-2 border-t border-border flex-shrink-0" dir={isRtl ? 'rtl' : 'ltr'}>
            <div className="flex gap-2 items-end">
              <Textarea
                ref={textareaRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={t.agentShortPlaceholder}
                rows={1}
                className="resize-none !min-h-[36px] max-h-24 overflow-y-auto focus-visible:ring-amber-400 text-xs"
                disabled={loading}
              />
              <Button
                onClick={() => sendMessage(input)}
                disabled={!input.trim() || loading}
                size="sm"
                className="bg-amber-400 hover:bg-amber-500 text-gray-900 font-bold border-0 h-9 w-9 p-0 flex-shrink-0"
              >
                <Send className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Trigger button */}
      <button
        onClick={() => setIsOpen(o => !o)}
        className="flex items-center gap-2 bg-amber-400 hover:bg-amber-500 text-gray-900 rounded-full shadow-lg px-4 py-2.5 transition-all hover:scale-105 active:scale-95 font-semibold text-sm"
      >
        {isOpen ? <X className="w-4 h-4 flex-shrink-0" /> : <Bot className="w-4 h-4 flex-shrink-0" />}
        <span>{t.agentTitle}</span>
      </button>
    </div>
  );
}

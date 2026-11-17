import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { Bot, Send, User } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';
import { useUILanguage } from '@/context/UILanguageContext';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const SUGGESTED_EN = [
  'Show my songs',
  'Create a new song called Untitled in G major',
  'What chords go well with C major?',
];

const SUGGESTED_HE = [
  'הצג את השירים שלי',
  'צור שיר חדש בשם ללא שם בסולם G',
  'אילו אקורדים מתאימים ל-C מז\'ור?',
];

export default function AgentPage() {
  const { t, uiLang } = useUILanguage();
  const isRtl = uiLang === 'he';
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const suggested = uiLang === 'he' ? SUGGESTED_HE : SUGGESTED_EN;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

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
    <div className="flex flex-col flex-1 min-h-0 max-w-2xl mx-auto w-full px-4 sm:px-6 py-6">
      {/* Header */}
      <div className="flex items-center gap-2 pb-4 border-b border-border">
        <div className="w-8 h-8 bg-amber-400 rounded-lg flex items-center justify-center">
          <Bot className="w-4 h-4 text-gray-900" />
        </div>
        <div>
          <h1 className="font-semibold text-foreground text-sm">{t.agentTitle}</h1>
          <p className="text-xs text-muted-foreground">{t.agentSubtitle}</p>
        </div>
      </div>

      {/* Message area */}
      <div className="flex-1 overflow-y-auto py-4 space-y-4 min-h-0" dir={isRtl ? 'rtl' : 'ltr'}>
        {messages.length === 0 && !loading && (
          <div className="flex flex-col items-center justify-center h-full gap-6 text-center px-4">
            <div className="w-14 h-14 bg-amber-400/15 rounded-2xl flex items-center justify-center">
              <Bot className="w-7 h-7 text-amber-500" />
            </div>
            <div>
              <p className="font-medium text-foreground">{t.agentEmpty}</p>
              <p className="text-sm text-muted-foreground mt-1">{t.agentEmptyDesc}</p>
            </div>
            <div className="flex flex-wrap gap-2 justify-center">
              {suggested.map(prompt => (
                <button
                  key={prompt}
                  onClick={() => sendMessage(prompt)}
                  className="text-sm px-3 py-1.5 rounded-full border border-border hover:border-amber-400 hover:bg-amber-400/10 hover:text-amber-700 dark:hover:text-amber-400 transition-colors text-muted-foreground"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex gap-2.5 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
          >
            {/* Avatar */}
            <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
              msg.role === 'user'
                ? 'bg-amber-400'
                : 'bg-muted border border-border'
            }`}>
              {msg.role === 'user'
                ? <User className="w-3.5 h-3.5 text-gray-900" />
                : <Bot className="w-3.5 h-3.5 text-muted-foreground" />
              }
            </div>

            {/* Bubble */}
            <div className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
              msg.role === 'user'
                ? 'bg-amber-400 text-gray-900 rounded-tr-sm'
                : 'bg-muted text-foreground rounded-tl-sm'
            }`}>
              {msg.content}
            </div>
          </div>
        ))}

        {/* Loading skeleton */}
        {loading && (
          <div className="flex gap-2.5">
            <div className="w-7 h-7 rounded-full bg-muted border border-border flex items-center justify-center flex-shrink-0">
              <Bot className="w-3.5 h-3.5 text-muted-foreground" />
            </div>
            <div className="bg-muted rounded-2xl rounded-tl-sm px-3.5 py-3 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-muted-foreground/50 rounded-full animate-bounce [animation-delay:-0.3s]" />
              <span className="w-1.5 h-1.5 bg-muted-foreground/50 rounded-full animate-bounce [animation-delay:-0.15s]" />
              <span className="w-1.5 h-1.5 bg-muted-foreground/50 rounded-full animate-bounce" />
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div className="pt-3 border-t border-border" dir={isRtl ? 'rtl' : 'ltr'}>
        <div className="flex gap-2 items-end">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t.agentPlaceholder}
            rows={1}
            className="resize-none min-h-[40px] max-h-32 overflow-y-auto focus-visible:ring-amber-400 text-sm"
            disabled={loading}
          />
          <Button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || loading}
            size="sm"
            className="bg-amber-400 hover:bg-amber-500 text-gray-900 font-bold border-0 h-10 w-10 p-0 flex-shrink-0"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
        <p className="text-[11px] text-muted-foreground mt-1.5">{t.agentHint}</p>
      </div>
    </div>
  );
}

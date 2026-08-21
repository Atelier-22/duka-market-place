import { FormEvent, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { api } from '../../services/api';
import { GlassCard } from '../../components/ui/GlassCard';
import { GlassButton } from '../../components/ui/GlassButton';
import { Input } from '../../components/ui/Input';
import { ChatMessage } from '../../components/domain/ChatMessage';
import { LoadingState } from '../../components/ui/LoadingState';
import { useAuth } from '../../context/AuthContext';

export function OrderMessagesPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [messages, setMessages] = useState<any[]>([]);
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  function load() {
    api.get(`/orders/${id}/messages`).then((res) => setMessages(res.data.messages)).finally(() => setLoading(false));
  }

  useEffect(load, [id]);
  useEffect(() => {
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, [id]);
  useEffect(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), [messages.length]);

  async function handleSend(e: FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    const text = body;
    setBody('');
    await api.post(`/orders/${id}/messages`, { body: text });
    load();
  }

  return (
    <div className="mx-auto flex h-[calc(100vh-6rem)] max-w-2xl flex-col pb-4">
      <button onClick={() => navigate(-1)} className="mb-2 text-sm font-medium text-brand-ink/50 hover:text-brand-green-deep"><ArrowLeft size={15} strokeWidth={2} className="inline" /> Back to order</button>
      <GlassCard hover={false} padding="md" className="flex flex-1 flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto pr-1">
          {loading ? (
            <LoadingState />
          ) : messages.length === 0 ? (
            <p className="py-16 text-center text-sm text-brand-ink/40">No messages yet — say hello.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {messages.map((m) => (
                <ChatMessage
                  key={m.id}
                  body={m.body}
                  attachmentUrl={m.attachment_url}
                  isOwn={m.sender_id === user?.id}
                  senderName={m.sender_name}
                  createdAt={m.created_at}
                />
              ))}
              <div ref={bottomRef} />
            </div>
          )}
        </div>
        <form onSubmit={handleSend} className="mt-3 flex gap-2 border-t border-brand-green/10 pt-3">
          <Input placeholder="Type a message…" value={body} onChange={(e) => setBody(e.target.value)} />
          <GlassButton type="submit" size="sm">Send</GlassButton>
        </form>
      </GlassCard>
    </div>
  );
}

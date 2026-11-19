import React, { useEffect, useRef, useState } from 'react';
import { Check, Send, Trash2, X } from 'lucide-react';
import { formatCurrency, formatDisplayDate } from '../lib/format';
import { parseMiloInput } from '../lib/miloParser';
import { getMiloApiUrl, supabase } from '../lib/supabase';
import type { MiloMessage, ParsedTransactionDraft, TransactionInput } from '../types/finance';
import { MiloMascot } from './MiloMascot';

interface MiloChatViewProps {
  messages: MiloMessage[];
  currency: string;
  onAppendMessage: (
    role: 'user' | 'assistant',
    content: string,
    metadata?: MiloMessage['metadata']
  ) => Promise<void>;
  onSaveTransaction: (input: TransactionInput) => Promise<void>;
  onClearHistory: () => Promise<void>;
}

export const MiloChatView: React.FC<MiloChatViewProps> = ({
  messages,
  currency,
  onAppendMessage,
  onSaveTransaction,
  onClearHistory,
}) => {
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [pendingDraft, setPendingDraft] = useState<ParsedTransactionDraft | null>(null);
  const [confirmingDraft, setConfirmingDraft] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, pendingDraft]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || sending) return;

    setInput('');
    setSending(true);
    try {
      await onAppendMessage('user', text);

      const parsed = parseMiloInput(text);
      if (parsed.intent === 'transaction') {
        setPendingDraft(parsed.draft);
        await onAppendMessage(
          'assistant',
          `I parsed a ${parsed.draft.kind} of ${formatCurrency(
            parsed.draft.amount,
            currency
          )} for "${parsed.draft.description}" (${parsed.draft.category}) on ${formatDisplayDate(
            parsed.draft.tx_date
          )}. Please confirm below before I save it.`,
          { draft: parsed.draft, mode: 'parsed_tx' }
        );
        return;
      }

      if (parsed.intent === 'clarification') {
        await onAppendMessage('assistant', parsed.question, { mode: 'clarification' });
        return;
      }

      // Broader financial question -> server-side AI provider adapter
      const apiUrl = getMiloApiUrl();
      if (!apiUrl || !supabase) {
        await onAppendMessage(
          'assistant',
          'Broader AI Q&A is currently unavailable because the server-side AI endpoint is not configured. You can still type transactions like "Spent ₹150 on lunch" and I will parse and save them after your confirmation.',
          { mode: 'ai_unavailable' }
        );
        return;
      }

      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) {
        await onAppendMessage(
          'assistant',
          'Your session expired. Please sign in again to ask MILO about your records.',
          { mode: 'ai_unavailable' }
        );
        return;
      }

      try {
        const res = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ question: text }),
        });

        const payload = await res.json().catch(() => ({}));
        if (!res.ok || payload.configured === false) {
          const reason =
            payload.error ||
            'Server-side AI credentials (AI_PROVIDER / AI_API_KEY) are not configured.';
          await onAppendMessage(
            'assistant',
            `Broader AI answers are unavailable right now: ${reason} You can still use natural-language transaction logging (for example: "Papa gave me ₹2000 today").`,
            { mode: 'ai_unavailable' }
          );
          return;
        }

        await onAppendMessage('assistant', payload.answer || 'No response returned.', {
          mode: 'ai_answer',
        });
      } catch {
        await onAppendMessage(
          'assistant',
          'Could not reach the server-side MILO AI adapter. Deploy the `milo-chat` Edge Function and set `AI_PROVIDER` + `AI_API_KEY` secrets to enable broader Q&A. Transaction parsing still works offline!',
          { mode: 'ai_unavailable' }
        );
      }
    } finally {
      setSending(false);
    }
  };

  const handleConfirmDraft = async () => {
    if (!pendingDraft) return;
    setConfirmingDraft(true);
    try {
      await onSaveTransaction({
        kind: pendingDraft.kind,
        amount: pendingDraft.amount,
        category: pendingDraft.category,
        description: pendingDraft.description,
        tx_date: pendingDraft.tx_date,
      });
      const savedDesc = `${pendingDraft.description} (${formatCurrency(
        pendingDraft.amount,
        currency
      )})`;
      setPendingDraft(null);
      await onAppendMessage('assistant', `Saved to your ledger: ${savedDesc}.`, {
        mode: 'parsed_tx',
        draftSaved: true,
      });
    } finally {
      setConfirmingDraft(false);
    }
  };

  const handleCancelDraft = async () => {
    setPendingDraft(null);
    await onAppendMessage('assistant', 'Okay, I cancelled that transaction without saving.');
  };

  return (
    <div className="block-card flex flex-col h-[calc(100vh-11rem)] min-h-[480px]">
      {/* Header */}
      <div className="p-4 border-b-2 border-parchment-300 flex items-center justify-between gap-3 bg-parchment-50 rounded-t-md">
        <div className="flex items-center gap-3">
          <div className="p-1.5 bg-forest-50 border-2 border-forest-600 rounded-md">
            <MiloMascot size={32} />
          </div>
          <div>
            <h2 className="text-base font-bold text-earth-900">MILO Assistant</h2>
            <p className="text-xs text-earth-700">
              Log transactions in plain English or ask about your saved finances
            </p>
          </div>
        </div>
        {messages.length > 0 && (
          <button
            type="button"
            onClick={onClearHistory}
            className="pixel-btn-secondary text-xs py-1.5 px-2.5"
            title="Clear chat history"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Clear
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-parchment-100/50">
        {messages.length === 0 && (
          <div className="max-w-lg mx-auto my-8 p-5 bg-parchment-50 border-2 border-parchment-300 rounded-md text-center space-y-2">
            <MiloMascot size={44} className="mx-auto" />
            <p className="text-sm font-bold text-earth-900">Hi! I&apos;m MILO.</p>
            <p className="text-xs text-earth-700">
              Try typing <strong>&ldquo;Papa gave me ₹2000 today&rdquo;</strong> or{' '}
              <strong>&ldquo;Spent ₹150 on lunch&rdquo;</strong>. I&apos;ll show a preview and
              only save after you confirm.
            </p>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] sm:max-w-[75%] px-4 py-2.5 rounded-md border-2 text-sm whitespace-pre-wrap ${
                msg.role === 'user'
                  ? 'bg-forest-600 text-parchment-50 border-forest-800'
                  : 'bg-white text-earth-900 border-parchment-300'
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}

        {/* Pending Confirmation Card */}
        {pendingDraft && (
          <div className="max-w-md p-4 bg-forest-50 border-2 border-forest-600 rounded-md shadow-block-sm space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wide text-forest-800">
                Transaction Preview (Not Saved Yet)
              </span>
              <span
                className={`px-2 py-0.5 text-[11px] font-bold rounded uppercase ${
                  pendingDraft.kind === 'income'
                    ? 'bg-forest-600 text-white'
                    : 'bg-amber-700 text-white'
                }`}
              >
                {pendingDraft.kind}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs text-earth-900">
              <div>
                <span className="text-earth-700 block">Amount</span>
                <strong>{formatCurrency(pendingDraft.amount, currency)}</strong>
              </div>
              <div>
                <span className="text-earth-700 block">Date</span>
                <strong>{formatDisplayDate(pendingDraft.tx_date)}</strong>
              </div>
              <div>
                <span className="text-earth-700 block">Category</span>
                <strong>{pendingDraft.category}</strong>
              </div>
              <div>
                <span className="text-earth-700 block">Description</span>
                <strong>{pendingDraft.description}</strong>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                disabled={confirmingDraft}
                onClick={handleConfirmDraft}
                className="pixel-btn-primary text-xs py-1.5 flex-1"
              >
                <Check className="w-3.5 h-3.5" />
                {confirmingDraft ? 'Saving...' : 'Confirm & Save'}
              </button>
              <button
                type="button"
                disabled={confirmingDraft}
                onClick={handleCancelDraft}
                className="pixel-btn-secondary text-xs py-1.5"
              >
                <X className="w-3.5 h-3.5" />
                Cancel
              </button>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form
        onSubmit={handleSend}
        className="p-3 border-t-2 border-parchment-300 bg-parchment-50 rounded-b-md flex gap-2"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder='Try "Spent ₹150 on lunch" or "How much did I spend this month?"'
          className="pixel-input flex-1"
          disabled={sending}
        />
        <button type="submit" disabled={sending || !input.trim()} className="pixel-btn-primary">
          <Send className="w-4 h-4" />
          <span className="hidden sm:inline">Send</span>
        </button>
      </form>
    </div>
  );
};

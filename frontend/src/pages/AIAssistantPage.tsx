import React, { useEffect, useRef, useState } from 'react';
import { Bot, CornerDownLeft, LockKeyhole, MessageSquareText, Sparkles, UserRound } from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader';
import { Button } from '../components/ui/Button';
import { Alert } from '../components/ui/Alert';
import { useAIChat } from '../features/ai/hooks/useAIQueries';
import { PendingActionCard } from '../features/ai/components/PendingActionCard';
import { ApiError } from '../lib/api/errors';
import type { AIChatResponse } from '../types/ai';

interface ConversationMessage {
  id: string;
  author: 'user' | 'assistant';
  text: string;
  response?: AIChatResponse;
}

function newMessageId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
}

function chatErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) return 'The assistant could not process that request.';
  if (error.status === 503) return 'The AI assistant is temporarily unavailable. Inventory and stock forms are still available.';
  if (error.status === 403) return 'Your authenticated role is not permitted to make that request.';
  if (error.status === 422) return 'Enter a clear inventory question or stock-change request.';
  return error.detail || 'The assistant could not process that request.';
}

export const AIAssistantPage: React.FC = () => {
  const chatMutation = useAIChat();
  const [draft, setDraft] = useState('');
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'nearest' });
  }, [messages, chatMutation.isPending]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const message = draft.trim();
    if (!message || chatMutation.isPending) return;

    setError(null);
    setDraft('');
    setMessages((current) => [
      ...current,
      { id: newMessageId(), author: 'user', text: message },
    ]);

    try {
      const response = await chatMutation.mutateAsync({ message });
      setMessages((current) => [
        ...current,
        { id: newMessageId(), author: 'assistant', text: response.message, response },
      ]);
    } catch (caught) {
      setError(chatErrorMessage(caught));
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-7rem)] flex-col gap-5">
      <PageHeader
        title="StockSense AI Assistant"
        description="Ask grounded inventory questions or prepare a stock change for explicit confirmation."
        showRefresh={false}
      />

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_18rem]">
        <section className="flex min-h-[34rem] flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
          <div
            className="flex-1 space-y-5 overflow-y-auto p-4 sm:p-6"
            aria-live="polite"
            aria-label="AI assistant conversation"
          >
            {messages.length === 0 && (
              <div className="mx-auto flex max-w-xl flex-col items-center justify-center px-4 py-16 text-center">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100">
                  <Sparkles className="h-6 w-6" aria-hidden="true" />
                </div>
                <h2 className="text-lg font-semibold text-zinc-900">Grounded inventory assistance</h2>
                <p className="mt-2 text-sm leading-6 text-zinc-500">
                  Ask about product stock, low-stock items, or best sellers. Stock-change requests create a reviewable preview and never apply automatically.
                </p>
              </div>
            )}

            {messages.map((message) => (
              <article
                key={message.id}
                className={`flex gap-3 ${message.author === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {message.author === 'assistant' && (
                  <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-white">
                    <Bot className="h-4 w-4" aria-hidden="true" />
                  </div>
                )}
                <div className={`max-w-2xl ${message.author === 'user' ? 'order-first' : ''}`}>
                  <div
                    className={`rounded-2xl px-4 py-3 text-sm leading-6 ${
                      message.author === 'user'
                        ? 'rounded-br-md bg-zinc-900 text-white'
                        : message.response?.type === 'refusal'
                          ? 'rounded-bl-md border border-amber-200 bg-amber-50 text-amber-950'
                          : 'rounded-bl-md border border-zinc-200 bg-zinc-50 text-zinc-800'
                    }`}
                  >
                    {message.text}
                  </div>
                  {message.response?.pending_action && (
                    <PendingActionCard action={message.response.pending_action} />
                  )}
                </div>
                {message.author === 'user' && (
                  <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-zinc-200 text-zinc-700">
                    <UserRound className="h-4 w-4" aria-hidden="true" />
                  </div>
                )}
              </article>
            ))}

            {chatMutation.isPending && (
              <div className="flex items-center gap-3 text-sm text-zinc-500" role="status">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-white">
                  <Bot className="h-4 w-4" aria-hidden="true" />
                </div>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
                  Checking StockSense data…
                </span>
              </div>
            )}
            <div ref={endRef} />
          </div>

          <div className="border-t border-zinc-200 bg-zinc-50/80 p-3 sm:p-4">
            {error && (
              <Alert variant="error" title="Assistant unavailable" onClose={() => setError(null)} className="mb-3">
                {error}
              </Alert>
            )}
            <form onSubmit={submit} className="flex items-end gap-2">
              <div className="flex-1">
                <label htmlFor="ai-message" className="sr-only">Message StockSense AI</label>
                <textarea
                  id="ai-message"
                  rows={2}
                  maxLength={2000}
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && !event.shiftKey) {
                      event.preventDefault();
                      event.currentTarget.form?.requestSubmit();
                    }
                  }}
                  placeholder="Ask about stock, low-stock items, best sellers, or prepare a stock change…"
                  disabled={chatMutation.isPending}
                  className="min-h-20 w-full resize-none rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 shadow-sm outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-200 disabled:bg-zinc-100"
                />
              </div>
              <Button
                type="submit"
                variant="primary"
                disabled={!draft.trim() || chatMutation.isPending}
                isLoading={chatMutation.isPending}
                aria-label="Send message"
                leftIcon={<CornerDownLeft className="h-4 w-4" />}
              >
                <span className="hidden sm:inline">Send</span>
              </Button>
            </form>
            <p className="mt-2 text-[11px] text-zinc-500">Enter to send · Shift+Enter for a new line</p>
          </div>
        </section>

        <aside className="space-y-4">
          <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-semibold text-zinc-900">
              <LockKeyhole className="h-4 w-4 text-emerald-600" aria-hidden="true" />
              Safe by design
            </div>
            <ul className="mt-3 space-y-2 text-xs leading-5 text-zinc-600">
              <li>Answers use authenticated backend inventory data.</li>
              <li>Your verified role controls every response and action.</li>
              <li>Stock changes require an explicit Confirm or Cancel choice.</li>
              <li>Normal inventory workflows remain available if AI is offline.</li>
            </ul>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-zinc-950 p-4 text-zinc-200 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-semibold text-white">
              <MessageSquareText className="h-4 w-4 text-emerald-400" aria-hidden="true" />
              Supported requests
            </div>
            <p className="mt-3 text-xs leading-5 text-zinc-400">
              Product availability, multiple-item stock lookup, low-stock lists, best sellers by supported date period, and previewed Stock In, Sale, or Damaged changes.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
};

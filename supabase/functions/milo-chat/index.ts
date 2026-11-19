// Supabase Edge Function: milo-chat
// Verifies the caller's Supabase JWT, reads ONLY that user's records via RLS,
// and delegates broader financial Q&A to a configurable server-side AI provider.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ProviderConfig {
  provider: 'openai' | 'gemini' | 'anthropic' | 'openai_compatible';
  apiKey: string;
  model: string;
  baseUrl?: string;
}

function getProviderConfig(): ProviderConfig | null {
  const apiKey = Deno.env.get('AI_API_KEY')?.trim();
  const provider = (Deno.env.get('AI_PROVIDER')?.trim().toLowerCase() || 'openai') as ProviderConfig['provider'];
  if (!apiKey) return null;

  const defaultModels: Record<ProviderConfig['provider'], string> = {
    openai: 'gpt-4o-mini',
    gemini: 'gemini-2.0-flash',
    anthropic: 'claude-3-5-haiku-latest',
    openai_compatible: 'gpt-4o-mini',
  };

  return {
    provider,
    apiKey,
    model: Deno.env.get('AI_MODEL')?.trim() || defaultModels[provider] || 'gpt-4o-mini',
    baseUrl: Deno.env.get('AI_BASE_URL')?.trim(),
  };
}

async function callAiAdapter(
  cfg: ProviderConfig,
  systemPrompt: string,
  userQuestion: string
): Promise<string> {
  if (cfg.provider === 'gemini') {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${cfg.model}:generateContent?key=${cfg.apiKey}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: 'user', parts: [{ text: userQuestion }] }],
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || 'Gemini API error');
    return data.candidates?.[0]?.content?.parts?.[0]?.text ?? 'No answer generated.';
  }

  if (cfg.provider === 'anthropic') {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': cfg.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: cfg.model,
        max_tokens: 600,
        system: systemPrompt,
        messages: [{ role: 'user', content: userQuestion }],
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || 'Anthropic API error');
    return data.content?.[0]?.text ?? 'No answer generated.';
  }

  // OpenAI or OpenAI-compatible
  const endpoint =
    cfg.provider === 'openai_compatible' && cfg.baseUrl
      ? `${cfg.baseUrl.replace(/\/$/, '')}/chat/completions`
      : 'https://api.openai.com/v1/chat/completions';

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${cfg.apiKey}`,
    },
    body: JSON.stringify({
      model: cfg.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userQuestion },
      ],
      temperature: 0.2,
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || 'OpenAI API error');
  return data.choices?.[0]?.message?.content ?? 'No answer generated.';
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing Authorization header.' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    if (!supabaseUrl || !supabaseAnonKey) {
      return new Response(
        JSON.stringify({ configured: false, error: 'Supabase server env vars missing.' }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create a user-scoped client so RLS guarantees only the caller's rows are read
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: authError,
    } = await userClient.auth.getUser();

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized session.' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const providerCfg = getProviderConfig();
    if (!providerCfg) {
      return new Response(
        JSON.stringify({
          configured: false,
          error: 'AI_API_KEY is not configured in server secrets.',
        }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { question } = await req.json();
    if (!question || typeof question !== 'string') {
      return new Response(JSON.stringify({ error: 'Question is required.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const [txRes, budgetRes, goalRes] = await Promise.all([
      userClient
        .from('transactions')
        .select('kind, amount, category, description, tx_date')
        .eq('user_id', user.id)
        .order('tx_date', { ascending: false })
        .limit(200),
      userClient.from('budgets').select('category, monthly_limit').eq('user_id', user.id),
      userClient
        .from('savings_goals')
        .select('name, target_amount, current_amount, target_date')
        .eq('user_id', user.id),
    ]);

    const contextPayload = {
      transactions: txRes.data ?? [],
      budgets: budgetRes.data ?? [],
      savings_goals: goalRes.data ?? [],
    };

    const systemPrompt = [
      'You are MILO, a calm, accurate personal finance assistant for MINEFIN.',
      'Answer ONLY using the authenticated user records provided below.',
      'Do NOT invent, estimate, or extrapolate missing transactions, balances, or dates.',
      'If the user has no matching records, say so clearly.',
      `USER_RECORDS_JSON: ${JSON.stringify(contextPayload)}`,
    ].join('\n');

    const answer = await callAiAdapter(providerCfg, systemPrompt, question);
    return new Response(JSON.stringify({ configured: true, answer }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

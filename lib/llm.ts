export interface LlmMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface LlmProvider {
  name: string;
  available: boolean;
  completeJson<T>(messages: LlmMessage[], schemaName: string, fallback: T): Promise<{ data: T; provenance: string }>;
}

export class MockLlmProvider implements LlmProvider {
  name = "mock";
  available = true;
  async completeJson<T>(_messages: LlmMessage[], schemaName: string, fallback: T) {
    return { data: fallback, provenance: `mock_provider:${schemaName}` };
  }
}

export class OpenAiCompatibleProvider implements LlmProvider {
  name = "openai-compatible";
  available: boolean;
  private apiKey?: string;
  private baseUrl: string;
  private model: string;

  constructor(env: Record<string, string | undefined> = {}) {
    this.apiKey = env.LLM_API_KEY;
    this.baseUrl = env.LLM_BASE_URL ?? "https://api.openai.com/v1";
    this.model = env.LLM_MODEL ?? "gpt-4.1-mini";
    this.available = Boolean(this.apiKey);
  }

  async completeJson<T>(messages: LlmMessage[], schemaName: string, fallback: T): Promise<{ data: T; provenance: string }> {
    if (!this.available) return { data: fallback, provenance: `provider_unavailable:${schemaName}` };
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);
    try {
      const response = await fetch(`${this.baseUrl.replace(/\/$/, "")}/chat/completions`, {
        method: "POST",
        headers: {
          authorization: `Bearer ${this.apiKey}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: this.model,
          temperature: 0.1,
          response_format: { type: "json_object" },
          messages,
        }),
        signal: controller.signal,
      });
      if (!response.ok) return { data: fallback, provenance: `provider_error:${response.status}:${schemaName}` };
      const payload = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
      const content = payload.choices?.[0]?.message?.content;
      if (!content) return { data: fallback, provenance: `provider_empty:${schemaName}` };
      return { data: JSON.parse(content) as T, provenance: `llm:${this.model}:${schemaName}` };
    } catch {
      return { data: fallback, provenance: `provider_malformed_or_timeout:${schemaName}` };
    } finally {
      clearTimeout(timeout);
    }
  }
}

export function getDefaultProvider(env?: Record<string, string | undefined>): LlmProvider {
  const provider = new OpenAiCompatibleProvider(env);
  return provider.available ? provider : new MockLlmProvider();
}

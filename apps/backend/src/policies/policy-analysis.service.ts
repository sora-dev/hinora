import { Injectable, Logger } from '@nestjs/common';
import {
  PolicyAnalysisProvider,
  PolicyDocumentType,
  PolicyStatus,
} from '@prisma/client';
import OpenAI from 'openai';

type AnalyzePolicyInput = {
  id: string;
  title: string;
  description: string | null;
  department: string;
  type: PolicyDocumentType;
  status: PolicyStatus;
  createdBy: string;
  categoryName: string | null;
  content: string | null;
};

type PolicyAnalysisResult = {
  summaryShort: string;
  summaryLong: string;
  keyPoints: string[];
  suggestedQuestions: string[];
  analysisProvider: PolicyAnalysisProvider;
  analysisModel: string | null;
};

type OpenAiSummaryPayload = {
  summaryShort?: unknown;
  summaryLong?: unknown;
  keyPoints?: unknown;
  suggestedQuestions?: unknown;
};

const DEFAULT_OPENAI_MODEL = 'gpt-4o-mini';

@Injectable()
export class PolicyAnalysisService {
  private readonly logger = new Logger(PolicyAnalysisService.name);
  private client: OpenAI | null = null;

  async analyzePolicy(
    policy: AnalyzePolicyInput,
  ): Promise<PolicyAnalysisResult> {
    const normalizedContent = policy.content?.trim() ?? '';

    if (this.hasConfiguredOpenAi() && normalizedContent) {
      try {
        return await this.generateOpenAiAnalysis({
          ...policy,
          content: normalizedContent,
        });
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : 'Unknown OpenAI error.';

        this.logger.warn(
          `OpenAI policy analysis failed for ${policy.id}. Falling back to local analysis. ${message}`,
        );
      }
    }

    return this.generateLocalAnalysis(policy);
  }

  private async generateOpenAiAnalysis(
    policy: AnalyzePolicyInput & { content: string },
  ): Promise<PolicyAnalysisResult> {
    const client = this.getClient();
    const model = process.env.OPENAI_POLICY_MODEL?.trim() || DEFAULT_OPENAI_MODEL;
    const trimmedContent = policy.content.slice(0, 16000);
    const completion = await client.chat.completions.create({
      model,
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content:
            'You create low-cost, concise policy analysis JSON for enterprise policy readers. Return valid JSON only.',
        },
        {
          role: 'user',
          content: [
            'Analyze this policy and return JSON with the exact shape:',
            '{',
            '  "summaryShort": string,',
            '  "summaryLong": string,',
            '  "keyPoints": string[],',
            '  "suggestedQuestions": string[]',
            '}',
            '',
            'Rules:',
            '- summaryShort: one concise sentence, max 220 characters.',
            '- summaryLong: one helpful paragraph, max 900 characters.',
            '- keyPoints: 3 to 5 clear bullets for employees.',
            '- suggestedQuestions: 3 to 4 useful employee questions.',
            '- Use the actual policy content, not generic placeholders.',
            '- Keep the output factual and compliance-friendly.',
            '',
            `Title: ${policy.title}`,
            `Type: ${policy.type}`,
            `Status: ${policy.status}`,
            `Department: ${policy.department}`,
            `Category: ${policy.categoryName ?? 'Uncategorized'}`,
            `Owner: ${policy.createdBy}`,
            `Description: ${policy.description ?? 'No description provided.'}`,
            '',
            'Policy content:',
            trimmedContent,
          ].join('\n'),
        },
      ],
    });

    const content = completion.choices[0]?.message?.content ?? '';
    const parsed = this.parseOpenAiPayload(content);

    return {
      summaryShort: this.getSafeSentence(
        parsed.summaryShort,
        this.getLocalSummarySentence(policy),
      ),
      summaryLong: this.getSafeParagraph(
        parsed.summaryLong,
        this.getLocalSummaryParagraph(policy),
      ),
      keyPoints: this.getSafeStringArray(
        parsed.keyPoints,
        this.getLocalKeyPoints(policy),
        5,
      ),
      suggestedQuestions: this.getSafeStringArray(
        parsed.suggestedQuestions,
        this.getLocalSuggestedQuestions(policy),
        4,
      ),
      analysisProvider: PolicyAnalysisProvider.OPENAI,
      analysisModel: model,
    };
  }

  private generateLocalAnalysis(
    policy: AnalyzePolicyInput,
  ): PolicyAnalysisResult {
    return {
      summaryShort: this.getLocalSummarySentence(policy),
      summaryLong: this.getLocalSummaryParagraph(policy),
      keyPoints: this.getLocalKeyPoints(policy),
      suggestedQuestions: this.getLocalSuggestedQuestions(policy),
      analysisProvider: PolicyAnalysisProvider.LOCAL_FALLBACK,
      analysisModel: null,
    };
  }

  private getLocalSummarySentence(policy: AnalyzePolicyInput) {
    const primaryLine = this.getContentPreview(policy.content, 220);

    if (primaryLine) {
      return this.limitText(primaryLine, 220);
    }

    return this.limitText(
      `${policy.title} is a ${policy.type.toLowerCase()} for the ${policy.department} department under ${policy.categoryName ?? 'the uncategorized policy library'}.`,
      220,
    );
  }

  private getLocalSummaryParagraph(policy: AnalyzePolicyInput) {
    const contentLines = this.getContentSentences(policy.content, 3);

    if (contentLines.length > 0) {
      return this.limitText(contentLines.join(' '), 900);
    }

    const fallbackParagraph = [
      policy.description?.trim() ||
        `${policy.title} guides the ${policy.department} department on expected controls, responsibilities, and compliance behavior.`,
      `This ${policy.type.toLowerCase()} is currently marked as ${policy.status.toLowerCase().replace(/_/g, ' ')} and is maintained by ${policy.createdBy}.`,
      `It belongs to ${policy.categoryName ?? 'the uncategorized policy collection'}.`,
    ].join(' ');

    return this.limitText(fallbackParagraph, 900);
  }

  private getLocalKeyPoints(policy: AnalyzePolicyInput) {
    const contentLines = this.getContentSentences(policy.content, 4);

    if (contentLines.length >= 3) {
      return contentLines.slice(0, 4);
    }

    return [
      `${policy.title} applies to the ${policy.department} department.`,
      `This document is classified as a ${policy.type.toLowerCase()} and is currently ${policy.status.toLowerCase().replace(/_/g, ' ')}.`,
      `The policy is filed under ${policy.categoryName ?? 'the uncategorized library'}.`,
      policy.description?.trim() ||
        'Read the full document for the detailed steps, controls, and compliance expectations.',
    ]
      .map((item) => item.trim())
      .filter(Boolean)
      .slice(0, 4);
  }

  private getLocalSuggestedQuestions(policy: AnalyzePolicyInput) {
    return [
      `What is the purpose of ${policy.title}?`,
      `What are the key responsibilities in ${policy.title}?`,
      `Who needs to follow this policy in ${policy.department}?`,
      `Give me a short summary of ${policy.title}.`,
    ];
  }

  private getContentSentences(content: string | null, limit: number) {
    if (!content?.trim()) {
      return [];
    }

    const normalizedContent = content
      .replace(/\r\n/g, '\n')
      .replace(/\n+/g, ' ')
      .replace(/\s{2,}/g, ' ')
      .trim();

    const sentences = normalizedContent
      .split(/(?<=[.!?])\s+/)
      .map((sentence) => sentence.trim())
      .filter(Boolean)
      .slice(0, limit);

    if (sentences.length > 0) {
      return sentences.map((sentence) => this.limitText(sentence, 260));
    }

    return normalizedContent
      .split(/(?<=,)\s+|(?<=;)\s+/)
      .map((line) => line.trim())
      .filter(Boolean)
      .slice(0, limit)
      .map((line) => this.limitText(line, 260));
  }

  private getContentPreview(content: string | null, maxLength: number) {
    if (!content?.trim()) {
      return null;
    }

    const normalizedContent = content
      .replace(/\r\n/g, '\n')
      .replace(/\n+/g, ' ')
      .replace(/\s{2,}/g, ' ')
      .trim();

    return this.limitText(normalizedContent, maxLength);
  }

  private parseOpenAiPayload(content: string): OpenAiSummaryPayload {
    try {
      return JSON.parse(content) as OpenAiSummaryPayload;
    } catch {
      const match = content.match(/\{[\s\S]*\}/);

      if (!match) {
        throw new Error('OpenAI response did not contain valid JSON.');
      }

      return JSON.parse(match[0]) as OpenAiSummaryPayload;
    }
  }

  private getSafeSentence(value: unknown, fallback: string) {
    return this.limitText(
      typeof value === 'string' && value.trim() ? value.trim() : fallback,
      220,
    );
  }

  private getSafeParagraph(value: unknown, fallback: string) {
    return this.limitText(
      typeof value === 'string' && value.trim() ? value.trim() : fallback,
      900,
    );
  }

  private getSafeStringArray(
    value: unknown,
    fallback: string[],
    limit: number,
  ) {
    if (!Array.isArray(value)) {
      return fallback.slice(0, limit);
    }

    const cleaned = value
      .map((item) => (typeof item === 'string' ? item.trim() : ''))
      .filter(Boolean)
      .slice(0, limit)
      .map((item) => this.limitText(item, 220));

    return cleaned.length > 0 ? cleaned : fallback.slice(0, limit);
  }

  private limitText(text: string, maxLength: number) {
    return text.length > maxLength
      ? `${text.slice(0, maxLength - 3).trimEnd()}...`
      : text;
  }

  private hasConfiguredOpenAi() {
    const apiKey = process.env.OPENAI_API_KEY?.trim() ?? '';

    return Boolean(apiKey) && !/your-openai-api-key/i.test(apiKey);
  }

  private getClient() {
    if (this.client) {
      return this.client;
    }

    const apiKey = process.env.OPENAI_API_KEY?.trim();

    if (!apiKey) {
      throw new Error('OPENAI_API_KEY is not configured.');
    }

    this.client = new OpenAI({ apiKey });
    return this.client;
  }
}

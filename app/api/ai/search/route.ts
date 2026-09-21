import { NextRequest, NextResponse } from 'next/server';
import { getAllServices } from '@/lib/store/marketplace-store';
import { rankServicesHybrid } from '@/lib/ai/semantic-search';

const NVIDIA_API_KEY = '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';
const NVIDIA_ENDPOINT = 'https://integrate.api.nvidia.com/v1/chat/completions';
const MODEL = 'nvidia/nemotron-3-ultra-550b-a55b';

export async function POST(req: NextRequest) {
  try {
    const { query } = await req.json();

    if (!query || typeof query !== 'string' || !query.trim()) {
      return NextResponse.json({ intent: 'All Services', results: [], explanation: '' });
    }

    const allServices = getAllServices();
    // Default local hybrid ranking as immediate baseline
    const localHybrid = rankServicesHybrid(query, allServices);

    // Call LLM with a 5-second timeout for speed
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const systemPrompt = `You are the AI Search Assistant for SkillBridge, a student-to-student skill marketplace.
Analyze the user's natural language query and extract:
1. "intent": A brief title of what service/need the user wants (e.g., "Cinematic Video Editing", "Next.js Frontend Development", "Calculus Tutoring").
2. "extracted_skills": An array of relevant skill keywords (e.g., ["Premiere Pro", "After Effects", "Transitions"]).
3. "target_category": The most matching category from ["Web & App Development", "Graphic Design & Branding", "Academic Tutoring", "Video & Content Creation", "Event & Photography", "Writing & Resume Services", "Music & Audio Production"].
4. "explanation": A friendly 1-sentence explanation of what the user is looking for and how the services match.

Respond ONLY with a valid JSON object with keys: "intent", "extracted_skills", "target_category", "explanation". Do not include markdown codeblocks or commentary.`;

    try {
      const response = await fetch(NVIDIA_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${NVIDIA_API_KEY}`,
        },
        body: JSON.stringify({
          model: MODEL,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: query },
          ],
          temperature: 0.2,
          max_tokens: 300,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const json = await response.json();
        const content = json.choices?.[0]?.message?.content?.trim();
        if (content) {
          // Clean possible markdown codeblock
          const cleaned = content.replace(/^```json\s*/, '').replace(/\s*```$/, '').trim();
          const parsed = JSON.parse(cleaned);

          return NextResponse.json({
            intent: parsed.intent || 'Smart Service Match',
            extractedSkills: parsed.extracted_skills || [],
            targetCategory: parsed.target_category,
            explanation: parsed.explanation || `Services matched for "${query}"`,
            results: localHybrid,
          });
        }
      }
    } catch {
      // LLM call timed out or failed - silently fall back
    }

    return NextResponse.json({
      intent: 'Marketplace Search',
      extractedSkills: [],
      explanation: `Semantic search results for "${query}"`,
      results: localHybrid,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Search failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

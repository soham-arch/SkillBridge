import { NextRequest, NextResponse } from 'next/server';
import { getPublishedServices, type ExploreFilters } from '@/lib/services/services';
import { rankServicesHybrid, analyzeQueryIntent, type SemanticSignals } from '@/lib/ai/semantic-search';

// Load credentials exclusively from server-side environment variables
const NVIDIA_API_KEY = process.env.NVIDIA_API_KEY || '';
const NVIDIA_ENDPOINT = process.env.NVIDIA_ENDPOINT || 'https://integrate.api.nvidia.com/v1/chat/completions';
const MODEL = process.env.NVIDIA_MODEL || 'nvidia/nemotron-3-ultra-550b-a55b';

// In-memory query intent cache with 10-minute TTL
interface CachedIntent {
  intent: string;
  extractedSkills: string[];
  targetCategory?: string;
  explanation: string;
  timestamp: number;
}

const INTENT_CACHE = new Map<string, CachedIntent>();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

// In-memory rate limiting: max 60 requests per minute per IP
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 60;
const IP_REQUEST_COUNTS = new Map<string, { count: number; windowStart: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = IP_REQUEST_COUNTS.get(ip);

  if (!record || now - record.windowStart > RATE_LIMIT_WINDOW_MS) {
    IP_REQUEST_COUNTS.set(ip, { count: 1, windowStart: now });
    return true;
  }

  if (record.count >= MAX_REQUESTS_PER_WINDOW) {
    return false;
  }

  record.count++;
  return true;
}

export async function POST(req: NextRequest) {
  try {
    // 1. Client IP rate limit check
    const clientIp =
      req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      req.headers.get('x-real-ip') ||
      'anonymous';

    if (!checkRateLimit(clientIp)) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please wait a moment before searching again.' },
        { status: 429 }
      );
    }

    // 2. Input validation & bounded size
    const body = await req.json().catch(() => ({}));
    const rawQuery = body.query;
    const categoryId = body.categoryId || null;
    const minPrice = body.minPrice !== undefined ? Number(body.minPrice) : undefined;
    const maxPrice = body.maxPrice !== undefined ? Number(body.maxPrice) : undefined;
    const sort = body.sort as ExploreFilters['sort'];

    if (!rawQuery || typeof rawQuery !== 'string' || !rawQuery.trim()) {
      return NextResponse.json({
        intent: 'All Services',
        results: [],
        explanation: 'Please enter a search query.',
        isAiEnhanced: false,
      });
    }

    // Bounded input: Truncate query to 250 characters max to prevent buffer abuse
    const sanitizedQuery = rawQuery.trim().slice(0, 250);

    // 3. Fetch candidate published services from the authoritative database
    const candidateServices = await getPublishedServices({
      category_id: categoryId,
      min_price: minPrice,
      max_price: maxPrice,
      sort,
    });

    let semanticSignals: SemanticSignals = {};
    let isAiEnhanced = false;
    let configReason: string | undefined = undefined;

    // 4. Intent Extraction
    const cacheKey = sanitizedQuery.toLowerCase();
    const cached = INTENT_CACHE.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      // Cache hit
      semanticSignals = {
        intent: cached.intent,
        extractedSkills: cached.extractedSkills,
        targetCategory: cached.targetCategory,
      };
      isAiEnhanced = true;
    } else if (NVIDIA_API_KEY && NVIDIA_API_KEY.startsWith('nvapi-')) {
      // 5. Query NVIDIA Nemotron LLM
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout

      const systemPrompt = `You are the AI Search Assistant for SkillBridge, a student-to-student skill marketplace.
Analyze the user's natural language request and extract:
1. "intent": A clean title of what service/need the user wants (e.g. "College Fest Video Editing", "Next.js Web Application", "DSA Calculus Tutoring").
2. "extracted_skills": An array of relevant skill and technology keywords (e.g. ["Premiere Pro", "Video Editing", "After Effects"]).
3. "target_category": The most appropriate category from ["Web & App Development", "Graphic Design & Branding", "Academic Tutoring", "Video & Content Creation", "Event & Photography", "Writing & Resume Services", "Music & Audio Production"].
4. "explanation": A friendly 1-sentence explanation of what the user is looking for and how the services match.

Respond ONLY with a valid JSON object with keys: "intent", "extracted_skills", "target_category", "explanation". Do not include markdown codeblocks or extra text.`;

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
              { role: 'user', content: sanitizedQuery },
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
            // Strip any markdown code fence wrappers
            const cleaned = content.replace(/^```json\s*/, '').replace(/\s*```$/, '').trim();
            const parsed = JSON.parse(cleaned);

            semanticSignals = {
              intent: parsed.intent || 'Smart Service Match',
              extractedSkills: Array.isArray(parsed.extracted_skills) ? parsed.extracted_skills : [],
              targetCategory: parsed.target_category,
            };

            // Store in in-memory cache
            INTENT_CACHE.set(cacheKey, {
              intent: semanticSignals.intent || 'Smart Match',
              extractedSkills: semanticSignals.extractedSkills || [],
              targetCategory: semanticSignals.targetCategory,
              explanation: parsed.explanation || `Matches for "${sanitizedQuery}"`,
              timestamp: Date.now(),
            });

            isAiEnhanced = true;
          }
        } else {
          configReason = `NVIDIA API responded with status ${response.status}. Fallback activated.`;
        }
      } catch (llmErr) {
        // Handled below - safe fallback
        configReason = 'NVIDIA API request timed out or was unreachable. Fallback activated.';
      }
    } else {
      configReason = 'NVIDIA_API_KEY environment variable not configured. Operating in database-backed semantic dictionary mode.';
    }

    // 6. If AI intent extraction was skipped or failed, fallback to local concept dictionary
    if (!semanticSignals.intent) {
      const localAnalysis = analyzeQueryIntent(sanitizedQuery);
      semanticSignals = {
        intent: localAnalysis.intent,
        extractedSkills: localAnalysis.suggestedSkills,
        targetCategory: localAnalysis.suggestedCategories[0],
      };
    }

    // 7. Re-rank candidate services using the extracted semantic signals
    const rankedResults = rankServicesHybrid(sanitizedQuery, candidateServices, semanticSignals);

    const explanation =
      rankedResults.length > 0
        ? `Found ${rankedResults.length} relevant campus skill listing${rankedResults.length === 1 ? '' : 's'} matching "${sanitizedQuery}".`
        : `No active services found matching "${sanitizedQuery}". Try broader search terms.`;

    return NextResponse.json({
      success: true,
      intent: semanticSignals.intent || 'Service Match',
      extractedSkills: semanticSignals.extractedSkills || [],
      targetCategory: semanticSignals.targetCategory,
      explanation,
      results: rankedResults,
      isAiEnhanced,
      reason: configReason,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Search processing failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

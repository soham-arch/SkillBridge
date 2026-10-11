import { Service, AISearchResult } from '@/types';

export interface SemanticSignals {
  intent?: string;
  extractedSkills?: string[];
  targetCategory?: string;
  keywords?: string[];
}

// Semantic concept dictionary for intent expansion and synonym matching
const CONCEPT_DICTIONARY: Record<string, { skills: string[]; categories: string[]; keywords: string[] }> = {
  video: {
    skills: ['Premiere Pro', 'After Effects', 'Color Grading', 'Sound Design', 'Transitions', 'Cinematic Editing', 'Video Editing'],
    categories: ['Video & Content Creation'],
    keywords: [
      'video', 'edit', 'editing', 'editor', 'fest video', 'college fest', 'reels',
      'cinematic', 'transitions', 'youtube', 'vlog', 'clip', 'montage', 'festival',
      'shorts', 'teaser', 'trailer', 'after effects', 'premiere', 'audio sync'
    ],
  },
  website: {
    skills: ['Next.js', 'React', 'TypeScript', 'Node.js', 'Tailwind CSS', 'Supabase', 'Python', 'Full Stack'],
    categories: ['Web & App Development'],
    keywords: [
      'website', 'web', 'frontend', 'full stack', 'fullstack', 'portfolio', 'store',
      'landing page', 'app', 'react', 'next', 'html', 'css', 'javascript', 'developer',
      'coder', 'software', 'backend', 'database', 'api', 'tailwind'
    ],
  },
  design: {
    skills: ['Figma', 'UI/UX Design', 'Wireframing', 'Design Systems', 'Interactive Prototypes', 'Pitch Decks', 'Graphic Design'],
    categories: ['Graphic Design & Branding'],
    keywords: [
      'design', 'ui', 'ux', 'figma', 'prototype', 'mockup', 'presentation', 'pitch deck',
      'logo', 'branding', 'graphics', 'screens', 'poster', 'banner', 'illustrator',
      'canva', 'flyer', 'brand identity'
    ],
  },
  tutoring: {
    skills: ['Data Structures', 'Algorithms', 'C++', 'Java', 'Calculus', 'Linear Algebra', 'Physics', 'Python'],
    categories: ['Academic Tutoring'],
    keywords: [
      'tutor', 'tutoring', 'maths', 'math', 'calculus', 'dsa', 'algorithm', 'coding',
      'exam', 'assignment', 'learn', 'leetcode', 'interview', 'prep', 'placement',
      'physics', 'teacher', 'homework', 'doubts'
    ],
  },
  photography: {
    skills: ['Photography', 'Lightroom', 'Portrait Shoots', 'Event Coverage', 'Photoshop'],
    categories: ['Event & Photography'],
    keywords: [
      'photo', 'photoshoot', 'camera', 'portrait', 'event', 'fest', 'headshot',
      'picture', 'pictures', 'photographer', 'lightroom', 'coverage', 'cultural fest'
    ],
  },
  writing: {
    skills: ['SOP Writing', 'Resume Review', 'Content Writing', 'Assignment Editing', 'Copywriting'],
    categories: ['Writing & Resume Services'],
    keywords: [
      'write', 'writing', 'writer', 'sop', 'resume', 'cv', 'essay', 'assignment',
      'article', 'content', 'script', 'statement of purpose', 'proofread', 'editing'
    ],
  },
};

/**
 * Parses user natural query to extract intent, concepts, and matching tags.
 */
export function analyzeQueryIntent(rawQuery: string): {
  intent: string;
  matchedConcepts: string[];
  suggestedSkills: string[];
  suggestedCategories: string[];
  keywords: string[];
} {
  const q = rawQuery.toLowerCase().trim();
  const matchedConcepts: string[] = [];
  const suggestedSkills = new Set<string>();
  const suggestedCategories = new Set<string>();
  const allKeywords = new Set<string>();

  for (const [concept, data] of Object.entries(CONCEPT_DICTIONARY)) {
    let matched = false;
    if (q.includes(concept)) {
      matched = true;
    } else {
      for (const kw of data.keywords) {
        if (q.includes(kw)) {
          matched = true;
          allKeywords.add(kw);
          break;
        }
      }
    }

    if (matched) {
      matchedConcepts.push(concept);
      data.skills.forEach((s) => suggestedSkills.add(s));
      data.categories.forEach((c) => suggestedCategories.add(c));
    }
  }

  let intent = 'General Skill Search';
  if (matchedConcepts.includes('video')) intent = 'Video & Multimedia Editing';
  else if (matchedConcepts.includes('website')) intent = 'Web & Software Development';
  else if (matchedConcepts.includes('design')) intent = 'UI/UX & Graphic Design';
  else if (matchedConcepts.includes('tutoring')) intent = 'Academic & Placement Tutoring';
  else if (matchedConcepts.includes('photography')) intent = 'Event & Campus Photography';
  else if (matchedConcepts.includes('writing')) intent = 'Writing & Resume Consultation';

  return {
    intent,
    matchedConcepts,
    suggestedSkills: Array.from(suggestedSkills),
    suggestedCategories: Array.from(suggestedCategories),
    keywords: Array.from(allKeywords),
  };
}

/**
 * Local Semantic Hybrid Ranker:
 * Computes multi-factor relevance against actual database listings:
 * - Direct keyword & token matches (35 pts)
 * - Semantic intent & skill overlap (35 pts)
 * - Target category match (15 pts)
 * - Provider reputation & completed orders (10 pts)
 * - Verified student bonus (5 pts)
 *
 * Guaranteed Safety:
 * - Only evaluates published listings.
 * - If no listings match, returns an empty array [] so the UI displays an authentic empty state.
 * - Never hallucinates or fabricates non-existent listings.
 */
export function rankServicesHybrid(
  query: string,
  services: Service[],
  semanticSignals?: SemanticSignals
): AISearchResult[] {
  const trimmed = query.trim();
  if (!trimmed) {
    return services
      .filter((s) => !s.status || s.status === 'published')
      .map((svc) => ({
        service: svc,
        relevance_score: 1.0,
        match_reasons: ['Recently listed service'],
        highlight_skills: svc.skills?.slice(0, 3) ?? [],
      }));
  }

  const { matchedConcepts, suggestedSkills, suggestedCategories } = analyzeQueryIntent(trimmed);
  const qTokens = trimmed.toLowerCase().split(/\s+/).filter((t) => t.length > 2);

  // Combine local dictionary signals with any upstream NVIDIA model signals
  const activeSkills = Array.from(
    new Set([...suggestedSkills, ...(semanticSignals?.extractedSkills ?? [])])
  );
  const activeCategory = semanticSignals?.targetCategory;

  const results: AISearchResult[] = [];

  for (const svc of services) {
    // Strictly exclude non-published listings
    if (svc.status && svc.status !== 'published') {
      continue;
    }

    let score = 0;
    const reasons: string[] = [];
    const matchedSkills: string[] = [];

    const titleLower = svc.title.toLowerCase();
    const descLower = svc.description.toLowerCase();
    const tagsLower = (svc.tags ?? []).map((t) => t.toLowerCase());
    const skillsLower = (svc.skills ?? []).map((s) => s.toLowerCase());
    const catNameLower = (svc.category?.name ?? '').toLowerCase();

    // 1. Direct Keyword & Token Match (up to 35 pts)
    let tokenMatches = 0;
    for (const tok of qTokens) {
      if (titleLower.includes(tok)) {
        tokenMatches += 15;
      } else if (descLower.includes(tok)) {
        tokenMatches += 8;
      }
      if (tagsLower.some((t) => t.includes(tok)) || skillsLower.some((s) => s.includes(tok))) {
        tokenMatches += 12;
      }
      if (catNameLower.includes(tok)) {
        tokenMatches += 10;
      }
    }
    const tokenScore = Math.min(tokenMatches, 35);
    score += tokenScore;
    if (tokenMatches > 0) {
      reasons.push('Title & description match');
    }

    // 2. Semantic Intent & Skill Overlap (up to 35 pts)
    let semanticMatches = 0;
    for (const skill of activeSkills) {
      const sLower = skill.toLowerCase();
      if (skillsLower.includes(sLower) || tagsLower.includes(sLower)) {
        semanticMatches += 16;
        matchedSkills.push(skill);
      } else if (titleLower.includes(sLower) || descLower.includes(sLower)) {
        semanticMatches += 10;
        matchedSkills.push(skill);
      }
    }
    const semanticScore = Math.min(semanticMatches, 35);
    score += semanticScore;
    if (matchedSkills.length > 0) {
      reasons.push(`Matched skills: ${matchedSkills.slice(0, 2).join(', ')}`);
    }

    // 3. Category Match (up to 15 pts)
    if (activeCategory && svc.category?.name.toLowerCase() === activeCategory.toLowerCase()) {
      score += 15;
      reasons.push(`Category: ${svc.category.name}`);
    } else if (suggestedCategories.some((c) => svc.category?.name === c)) {
      score += 10;
      reasons.push(`Category match`);
    }

    // Only grant reputation / verification bonus if the listing is actually relevant
    if (tokenScore > 0 || semanticScore > 0) {
      // 4. Provider Reputation & Orders (up to 10 pts)
      const rating = svc.rating ?? 4.8;
      const orders = svc.completed_orders_count ?? 0;
      const repScore = (rating / 5.0) * 6 + Math.min(orders, 8) * 0.5;
      score += Math.min(repScore, 10);
      if (rating >= 4.8) {
        reasons.push(`Top rated (${rating}★)`);
      }

      // 5. Verified Student Bonus (5 pts)
      if (svc.provider?.verification_status === 'verified') {
        score += 5;
        reasons.push('Verified Student');
      }

      results.push({
        service: svc,
        relevance_score: Number((Math.min(score, 100) / 100).toFixed(2)),
        match_reasons: reasons.slice(0, 3),
        highlight_skills: matchedSkills.length > 0 ? matchedSkills : (svc.skills?.slice(0, 3) ?? []),
      });
    }
  }

  // Sort strictly by relevance score descending
  results.sort((a, b) => b.relevance_score - a.relevance_score);

  // Return legitimate matches. Never synthesize fake listings if no match was found.
  return results;
}

export interface AISearchResponse {
  intent: string;
  results: AISearchResult[];
  explanation: string;
  isAiEnhanced: boolean;
  reason?: string;
  targetCategory?: string;
  extractedSkills?: string[];
}

/**
 * Performs Semantic AI search with API call to server NVIDIA LLM endpoint,
 * falling back safely to local hybrid dictionary ranking when AI is offline.
 */
export async function performAISearch(
  query: string,
  allServices: Service[],
  filters?: { categoryId?: string | null; minPrice?: number; maxPrice?: number }
): Promise<AISearchResponse> {
  const trimmed = query.trim();
  if (!trimmed) {
    return {
      intent: 'All Services',
      results: rankServicesHybrid('', allServices),
      explanation: 'Showing all active student services.',
      isAiEnhanced: false,
    };
  }

  const { intent, suggestedSkills } = analyzeQueryIntent(trimmed);

  try {
    const res = await fetch('/api/ai/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: trimmed,
        categoryId: filters?.categoryId || null,
        minPrice: filters?.minPrice,
        maxPrice: filters?.maxPrice,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.results)) {
        return {
          intent: data.intent || intent,
          results: data.results,
          explanation: data.explanation || `Semantic matches for "${trimmed}"`,
          isAiEnhanced: Boolean(data.isAiEnhanced),
          reason: data.reason,
          targetCategory: data.targetCategory,
          extractedSkills: data.extractedSkills || suggestedSkills,
        };
      }
    }
  } catch (err) {
    console.warn('AI search API request failed, engaging local semantic ranker:', err);
  }

  // Authoritative fallback: Local hybrid semantic ranker against actual services
  const fallbackResults = rankServicesHybrid(trimmed, allServices);

  return {
    intent,
    results: fallbackResults,
    explanation:
      fallbackResults.length > 0
        ? `Found ${fallbackResults.length} relevant skill offerings for "${trimmed}".`
        : `No services found matching "${trimmed}".`,
    isAiEnhanced: false,
    reason: 'Local semantic hybrid matching engaged.',
  };
}

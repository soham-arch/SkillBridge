import { Service, AISearchResult } from '@/types';

// Semantic concept dictionary for intent expansion
const CONCEPT_DICTIONARY: Record<string, { skills: string[]; categories: string[]; keywords: string[] }> = {
  video: {
    skills: ['Premiere Pro', 'After Effects', 'Color Grading', 'Sound Design', 'Transitions', 'Cinematic Editing'],
    categories: ['Video & Content Creation'],
    keywords: ['cinematic', 'reels', 'birthday', 'transitions', 'youtube', 'vlog', 'clip', 'editing', 'montage', 'festival', 'shorts'],
  },
  website: {
    skills: ['Next.js', 'React', 'TypeScript', 'Node.js', 'Tailwind CSS', 'Supabase', 'Python'],
    categories: ['Web & App Development'],
    keywords: ['web', 'frontend', 'full stack', 'fullstack', 'portfolio', 'store', 'landing page', 'app', 'react', 'next', 'html', 'css', 'javascript'],
  },
  design: {
    skills: ['Figma', 'UI/UX Design', 'Wireframing', 'Design Systems', 'Interactive Prototypes', 'Pitch Decks'],
    categories: ['Graphic Design & Branding'],
    keywords: ['ui', 'ux', 'figma', 'prototype', 'mockup', 'presentation', 'pitch deck', 'logo', 'branding', 'graphics', 'screens'],
  },
  tutoring: {
    skills: ['Data Structures', 'Algorithms', 'C++', 'Java', 'Calculus', 'Linear Algebra', 'Physics'],
    categories: ['Academic Tutoring'],
    keywords: ['maths', 'math', 'calculus', 'dsa', 'algorithm', 'coding', 'exam', 'assignment', 'tutor', 'learn', 'leetcode', 'interview', 'prep'],
  },
  photography: {
    skills: ['Photography', 'Lightroom', 'Portrait Shoots', 'Event Coverage', 'Photoshop'],
    categories: ['Event & Photography'],
    keywords: ['photoshoot', 'camera', 'portrait', 'event', 'fest', 'headshot', 'photo', 'picture', 'pictures', 'photographer'],
  },
  writing: {
    skills: ['SOP Writing', 'Resume Review', 'Content Writing', 'Assignment Editing', 'Copywriting'],
    categories: ['Writing & Resume Services'],
    keywords: ['sop', 'resume', 'cv', 'essay', 'assignment', 'article', 'content', 'script', 'statement of purpose', 'proofread'],
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
} {
  const q = rawQuery.toLowerCase().trim();
  const matchedConcepts: string[] = [];
  const suggestedSkills = new Set<string>();
  const suggestedCategories = new Set<string>();

  for (const [concept, data] of Object.entries(CONCEPT_DICTIONARY)) {
    let matched = false;
    if (q.includes(concept)) {
      matched = true;
    } else {
      for (const kw of data.keywords) {
        if (q.includes(kw)) {
          matched = true;
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

  let intent = 'General Search';
  if (matchedConcepts.includes('video')) intent = 'Video & Multimedia Production';
  else if (matchedConcepts.includes('website')) intent = 'Web & Software Development';
  else if (matchedConcepts.includes('design')) intent = 'UI/UX & Graphic Design';
  else if (matchedConcepts.includes('tutoring')) intent = 'Academic & Coding Tutoring';
  else if (matchedConcepts.includes('photography')) intent = 'Campus & Event Photography';
  else if (matchedConcepts.includes('writing')) intent = 'Academic Writing & Resume Review';

  return {
    intent,
    matchedConcepts,
    suggestedSkills: Array.from(suggestedSkills),
    suggestedCategories: Array.from(suggestedCategories),
  };
}

/**
 * Local Semantic Hybrid Ranker:
 * Computes multi-factor relevance:
 * - Keyword exact & token matches (30%)
 * - Semantic intent & skill overlap (40%)
 * - Provider reputation & completed orders (20%)
 * - Verification status bonus (10%)
 */
export function rankServicesHybrid(query: string, services: Service[]): AISearchResult[] {
  if (!query.trim()) {
    return services.map((svc) => ({
      service: svc,
      relevance_score: 1.0,
      match_reasons: ['Recently listed service'],
      highlight_skills: svc.skills?.slice(0, 3) ?? [],
    }));
  }

  const { matchedConcepts, suggestedSkills, suggestedCategories } = analyzeQueryIntent(query);
  const qTokens = query.toLowerCase().split(/\s+/).filter((t) => t.length > 2);

  const results: AISearchResult[] = [];

  for (const svc of services) {
    let score = 0;
    const reasons: string[] = [];
    const matchedSkills: string[] = [];

    const titleLower = svc.title.toLowerCase();
    const descLower = svc.description.toLowerCase();
    const tagsLower = (svc.tags ?? []).map((t) => t.toLowerCase());
    const skillsLower = (svc.skills ?? []).map((s) => s.toLowerCase());

    // 1. Keyword & Token Match (up to 35 pts)
    let tokenMatches = 0;
    for (const tok of qTokens) {
      if (titleLower.includes(tok)) {
        tokenMatches += 12;
      } else if (descLower.includes(tok)) {
        tokenMatches += 6;
      }
      if (tagsLower.some((t) => t.includes(tok)) || skillsLower.some((s) => s.includes(tok))) {
        tokenMatches += 8;
      }
    }
    score += Math.min(tokenMatches, 35);
    if (tokenMatches > 0) {
      reasons.push('Title & description match');
    }

    // 2. Semantic Intent & Skill Overlap (up to 40 pts)
    let semanticMatches = 0;
    for (const skill of suggestedSkills) {
      if (skillsLower.includes(skill.toLowerCase()) || titleLower.includes(skill.toLowerCase()) || descLower.includes(skill.toLowerCase())) {
        semanticMatches += 15;
        matchedSkills.push(skill);
      }
    }
    for (const cat of suggestedCategories) {
      if (svc.category?.name === cat) {
        semanticMatches += 10;
        reasons.push(`Category match: ${cat}`);
      }
    }
    score += Math.min(semanticMatches, 40);
    if (matchedSkills.length > 0) {
      reasons.push(`Matched skills: ${matchedSkills.slice(0, 2).join(', ')}`);
    }

    // 3. Provider Reputation & Experience (up to 15 pts)
    const rating = svc.rating ?? 4.5;
    const orders = svc.completed_orders_count ?? 0;
    const repScore = (rating / 5.0) * 10 + Math.min(orders, 10) * 0.5;
    score += repScore;
    if (rating >= 4.8) {
      reasons.push(`Top rated (${rating}★)`);
    }

    // 4. Verification Bonus (10 pts)
    if (svc.provider?.verification_status === 'verified') {
      score += 10;
      reasons.push('Verified Student provider');
    }

    // If there is any match, include it
    if (tokenMatches > 0 || semanticMatches > 0 || matchedConcepts.length === 0) {
      results.push({
        service: svc,
        relevance_score: Number((score / 100).toFixed(2)),
        match_reasons: reasons.slice(0, 3),
        highlight_skills: matchedSkills.length > 0 ? matchedSkills : (svc.skills?.slice(0, 3) ?? []),
      });
    }
  }

  // Sort by relevance score descending
  results.sort((a, b) => b.relevance_score - a.relevance_score);

  // If strict filtering returned nothing, provide soft match
  if (results.length === 0) {
    return services.slice(0, 6).map((svc) => ({
      service: svc,
      relevance_score: 0.5,
      match_reasons: ['Suggested student service'],
      highlight_skills: svc.skills?.slice(0, 3) ?? [],
    }));
  }

  return results;
}

/**
 * Performs Semantic AI search with API call to NVIDIA LLM with fallback.
 */
export async function performAISearch(query: string, allServices: Service[]): Promise<{
  intent: string;
  results: AISearchResult[];
  explanation: string;
  isAiEnhanced: boolean;
}> {
  const fallbackResults = rankServicesHybrid(query, allServices);
  const { intent } = analyzeQueryIntent(query);

  try {
    const res = await fetch('/api/ai/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.results && data.results.length > 0) {
        return {
          intent: data.intent || intent,
          results: data.results,
          explanation: data.explanation || `Found services matching "${query}"`,
          isAiEnhanced: true,
        };
      }
    }
  } catch {
    // Graceful fallback without breaking
  }

  return {
    intent,
    results: fallbackResults,
    explanation: `Smart semantic match for "${query}"`,
    isAiEnhanced: false,
  };
}

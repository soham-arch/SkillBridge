import { NextRequest, NextResponse } from 'next/server';

const NVIDIA_API_KEY = process.env.NVIDIA_API_KEY || '';
const NVIDIA_ENDPOINT = process.env.NVIDIA_ENDPOINT || 'https://integrate.api.nvidia.com/v1/chat/completions';
const MODEL = process.env.NVIDIA_MODEL || 'nvidia/nemotron-3-ultra-550b-a55b';

export async function POST(req: NextRequest) {
  try {
    const { title, description } = await req.json();

    if (!title && !description) {
      return NextResponse.json({ skills: [], tags: [] });
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const systemPrompt = `You are a skill marketplace tag generator for college students.
Given the service title and description, extract up to 5 relevant technical or creative skills, and up to 4 search tags.
Respond ONLY with a JSON object format:
{"skills": ["Skill1", "Skill2"], "tags": ["Tag1", "Tag2"]}
Do not add markdown formatting or extra text.`;

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
            { role: 'user', content: `Title: ${title}\nDescription: ${description}` },
          ],
          temperature: 0.1,
          max_tokens: 200,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const json = await response.json();
        const content = json.choices?.[0]?.message?.content?.trim();
        if (content) {
          const cleaned = content.replace(/^```json\s*/, '').replace(/\s*```$/, '').trim();
          const parsed = JSON.parse(cleaned);
          return NextResponse.json({
            skills: parsed.skills || [],
            tags: parsed.tags || [],
          });
        }
      }
    } catch {
      // Fallback local extractor
    }

    // Heuristic fallback
    const text = `${title} ${description}`.toLowerCase();
    const fallbackSkills: string[] = [];
    if (text.includes('react')) fallbackSkills.push('React');
    if (text.includes('next')) fallbackSkills.push('Next.js');
    if (text.includes('python')) fallbackSkills.push('Python');
    if (text.includes('figma')) fallbackSkills.push('Figma');
    if (text.includes('video') || text.includes('edit')) fallbackSkills.push('Video Editing');
    if (text.includes('photo')) fallbackSkills.push('Photography');
    if (text.includes('dsa') || text.includes('algo')) fallbackSkills.push('Data Structures');

    return NextResponse.json({
      skills: fallbackSkills.length > 0 ? fallbackSkills : ['Student Service', 'Peer Talent'],
      tags: ['SkillBridge', 'Student Talent'],
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Skill extraction failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

# SkillBridge AI-Powered Service Search & NVIDIA Integration Guide

## 1. Architecture Overview

SkillBridge implements an AI-powered semantic search architecture designed for college student service discovery. The system bridges natural language buyer requests (such as *"someone to edit a college fest video"* or *"need help preparing for dynamic programming campus placement interviews"*) to peer service listings.

```
+-----------------------------------------------------------------------------------+
|                                 CLIENT LAYER                                      |
|  - Homepage Hero Search (`app/page.tsx`) with popular query chips                 |
|  - Explore Search (`app/(main)/explore/page.tsx`) with 400ms debounced input     |
|  - Full filtering: Category, Price Ranges (Min/Max), Sorting, Verified Badges     |
+-----------------------------------------+-----------------------------------------+
                                          |
                         POST /api/ai/search (Server-side)
                                          |
+-----------------------------------------v-----------------------------------------+
|                              SERVER API ROUTE                                     |
|  1. In-Memory Rate Limiting: 60 req/min per IP                                   |
|  2. Bounded Input: max 250 characters                                             |
|  3. 10-minute Intent Cache: Map<query, CachedIntent>                             |
|  4. Database Candidates: Fetch real published rows from Supabase (status=published)|
|  5. 5-Second Timeout: AbortController on upstream LLM requests                    |
+-----------------------------------------+-----------------------------------------+
                                          |
            +-----------------------------+-----------------------------+
            |                                                           |
   (If NVIDIA_API_KEY configured)                               (Fallback / Offline)
            |                                                           |
+-----------v----------------------------+             +----------------v-----------------+
|   NVIDIA NEMOTRON 3 ULTRA 550B         |             |   LOCAL CONCEPT DICTIONARY &     |
|   Extracts intent, category, & skills  |             |   HYBRID SEMANTIC RANKER         |
|   (Zero listings invented by LLM)      |             |   Matches synonyms & categories  |
+-----------+----------------------------+             +----------------+-----------------+
            \                                                           /
             \                                                         /
+-------------v-------------------------------------------------------v-------------+
|                           DATABASE CANDIDATE RE-RANKING                           |
|  - Token overlap + semantic skill overlap + category match + reputation & verified |
|  - Strictly returns authorized database listings (or [] for legitimate empty state)  |
+-----------------------------------------------------------------------------------+
```

---

## 2. NVIDIA Configuration & Environment Variables

### Required Environment Variables

All NVIDIA configuration must be placed in server environment variables (`.env` or `.env.local`). **Never prefix NVIDIA credentials with `NEXT_PUBLIC_` or expose them to the browser bundle.**

| Variable | Default Value | Description |
| :--- | :--- | :--- |
| `NVIDIA_API_KEY` | *(None / `""`)* | Personal API key from NVIDIA NIM / NGC Build (`nvapi-...`). Must remain server-side. |
| `NVIDIA_MODEL` | `nvidia/nemotron-3-ultra-550b-a55b` | Specified Nemotron language model identifier. |
| `NVIDIA_ENDPOINT` | `https://integrate.api.nvidia.com/v1/chat/completions` | NVIDIA NIM OpenAI-compatible chat completions endpoint. |

### Step-by-Step Configuration

1. Obtain an API key from [NVIDIA NIM API Catalog](https://build.nvidia.com/) (starts with `nvapi-`).
2. Add your key to your `.env` or `.env.local` file:
   ```bash
   NVIDIA_API_KEY=nvapi-your-key-here
   NVIDIA_MODEL=nvidia/nemotron-3-ultra-550b-a55b
   NVIDIA_ENDPOINT=https://integrate.api.nvidia.com/v1/chat/completions
   ```
3. Restart the Next.js development server:
   ```bash
   npm run dev
   ```

---

## 3. Fallback & Safe Degradation Behavior

SkillBridge is built with strict zero-dependency resilience:

1. **Missing or Incomplete Credentials**:
   - If `NVIDIA_API_KEY` is empty, unset, or does not start with `nvapi-`, the server does **not** pretend the AI integration is running.
   - The response includes `isAiEnhanced: false` and explicitly indicates:
     `"NVIDIA_API_KEY environment variable not configured. Operating in database-backed semantic dictionary mode."`
   - The UI displays the `Local Semantic Hybrid` badge and transparently notifies the user.
2. **Upstream Timeouts & Network Outages**:
   - Upstream fetch requests use a 5-second `AbortController`. If NVIDIA is unreachable or takes longer than 5 seconds, the request safely falls back to local semantic hybrid re-ranking.
3. **Zero Hallucination Guarantee**:
   - The NVIDIA LLM is instructed **strictly to extract search signals** (`intent`, `extracted_skills`, `target_category`, `explanation`).
   - It **never** receives or invents listings, prices, or seller names.
   - All listings returned to the user originate strictly from the Supabase database (`services` table where `status = 'published'`).
4. **Authentic Empty States**:
   - If no database listings match the query or filters, the system returns `results: []`.
   - The system **never** fabricates fake recommendations or random mock listings when 0 genuine matches exist.

---

## 4. Query Processing & Defenses

- **Input Bounds**: Query strings are trimmed and capped to a maximum of 250 characters to prevent buffer abuse, denial of service, and prompt injection attacks.
- **Debounced Keystrokes**: Both the Explore page and hero search components use a 400ms debounce timer to prevent redundant API and LLM calls while typing.
- **Rate Limiting**: Server route limits callers to a maximum of 60 requests per minute per client IP. Excess requests return HTTP 429.
- **In-Memory Cache**: Repeated or identical queries are cached in-memory with a 10-minute TTL to reduce token expenditure and provide sub-10ms response times for popular campus queries.

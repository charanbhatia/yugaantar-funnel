// Server-only. The key never reaches the browser: only server components and the API route import this.
const HOST = process.env.POSTHOG_HOST || 'https://us.posthog.com';
const PROJECT = process.env.POSTHOG_PROJECT_ID || '602554';

export async function hogql(query) {
  const key = process.env.POSTHOG_PERSONAL_API_KEY;
  if (!key) throw new Error('POSTHOG_PERSONAL_API_KEY is not set. Add it in Vercel → Settings → Environment Variables.');
  const res = await fetch(`${HOST}/api/projects/${PROJECT}/query/`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: { kind: 'HogQLQuery', query } }),
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`PostHog query failed (${res.status}): ${(await res.text()).slice(0, 300)}`);
  return (await res.json()).results;
}

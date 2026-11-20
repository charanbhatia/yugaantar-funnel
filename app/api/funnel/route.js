import { getDashboard } from '../../../lib/data.js';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    return Response.json(await getDashboard());
  } catch (e) {
    return Response.json({ error: e.message }, { status: 502 });
  }
}

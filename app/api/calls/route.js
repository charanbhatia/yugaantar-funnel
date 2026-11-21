// Staff-only (see middleware.js). GET: the call list as JSON, or ?format=csv for a spreadsheet.
// POST: { personId, called, by } marks someone as called / not called.
import { getCallList, getMarks, mergeMarks, saveMark, toCsv } from '../../../lib/calls.js';

export const dynamic = 'force-dynamic';

export async function GET(req) {
  try {
    const [list, marks] = await Promise.all([getCallList(), getMarks()]);
    const people = mergeMarks(list.people, marks);
    if (new URL(req.url).searchParams.get('format') === 'csv') {
      return new Response('﻿' + toCsv(people), {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="fest-pass-call-list-${list.updatedAt.slice(0, 10)}.csv"`,
        },
      });
    }
    return Response.json({ updatedAt: list.updatedAt, sample: list.sample, people });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 502 });
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    await saveMark({ personId: body.personId, called: body.called, by: body.by });
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 400 });
  }
}

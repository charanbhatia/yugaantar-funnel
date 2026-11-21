// Staff-only (see middleware.js): everyone who opened the Fest Pass checkout but has no paid pass.
import { getCallList, getMarks, mergeMarks } from '../../lib/calls.js';
import { Shell, PageHeader, istTime } from '../ui.jsx';
import CallTable from './table.jsx';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Call list · Yugaantar Fest Pass', robots: { index: false, follow: false } };

export default async function Calls() {
  let list, marks;
  try {
    [list, marks] = await Promise.all([getCallList(), getMarks()]);
  } catch (e) {
    return (
      <Shell active="calls">
        <PageHeader eyebrow="Staff only" title="Call list" />
        <p className="note bad">Couldn&apos;t load the list from PostHog: {e.message}</p>
      </Shell>
    );
  }
  const people = mergeMarks(list.people, marks);
  return (
    <Shell active="calls" data={{ updatedAt: list.updatedAt, sample: list.sample }}>
      <PageHeader
        eyebrow="Staff only · don't share this page"
        title="Call list"
        lead={<>Everyone who opened the Fest Pass checkout but doesn&apos;t have a paid pass. The list refreshes from PostHog every 10 minutes (last {istTime(list.updatedAt)} IST). Check marks save straight away.</>}
      />
      {list.sample && <p className="note">Showing 3 made-up sample rows because no PostHog key is set locally. The deployed site shows the real list.</p>}
      <CallTable initial={people} />
    </Shell>
  );
}

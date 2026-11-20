// Tickets for the yugaantar.org tech team. `metric(d)` reads the live dashboard data,
// so each ticket shows the number it is supposed to move.
import { pct } from './shape.js';

const stage = (d, k) => d.funnel.stages.find((s) => s.key === k);
const fpRate = (d) => d.products.find((p) => p.name === 'Fest Pass')?.attemptRate ?? 0;
const f = (n) => `${n >= 10 || n === 0 ? Math.round(n) : n.toFixed(1)}%`;

export const RULE = {
  title: "We can't say the pass is for the pro-shows. So we don't.",
  intro:
    'The pass has to look worth ₹999 on its own, and the free option has to look clearly smaller. None of the copy below mentions pro-shows, artists or evening shows.',
  points: [
    'Name the two tiers so the difference is obvious: "Day Wristband (free)" and "All-Access Fest Pass (₹999)". "All-Access" says everything without naming anything.',
    'Give the pass perks we are allowed to list: food-counter credit loaded on the pass QR (the ID card already works at food counters), one merch item, a fast-lane gate, and a pass-holder lucky draw.',
    'Show scarcity and proof: a live "passes sold" count once it passes 100, and a dated online price ("₹999 until Tue 24 Nov, ₹1,199 at the gate").',
    'Never publish wording that ties the pass to a show, a time slot or a venue that only hosts shows. If the team wants time-based access wording (for example "campus after 6 PM"), get written sign-off from whoever set the restriction first.',
  ],
};

export const TICKETS = [
  {
    id: 'YG-01', prio: 'P0', area: 'Frontend · copy', effort: '2 hours',
    title: 'Stop telling visitors the pass is optional',
    problem:
      'The homepage FAQ answer "Can I attend without competing?" says to bring an ID for a wristband. The free ID card on /pass says "Show this QR at the gate". Visitors read both as "entry is free, the pass is extra", and nothing says otherwise.',
    build: [
      'FAQ: rewrite the answer as two tiers. Day Wristband (free, with college ID) covers competitions and daytime campus. The All-Access Fest Pass covers the full fest on all 3 days, plus perks.',
      'ID card on /pass: label it "Day Wristband ID", change the caption to "Daytime entry", and put a full-width "Upgrade to All-Access" button directly under it, replacing the small "Buy Fest Pass?" link.',
      'Rename "Fest Pass" to "All-Access Fest Pass" in the nav, on /pass, in emails and on Razorpay checkout (the `name` / `description` options).',
    ],
    done: [
      'No page tells an outside visitor that full entry is free.',
      'The upgrade button is visible without scrolling on a 375 px wide phone.',
    ],
    metric: (d) => ({ label: 'Pass page → opened checkout', value: f(stage(d, 'checkout').step) }),
  },
  {
    id: 'YG-02', prio: 'P0', area: 'Frontend', effort: '1 day',
    title: 'Make the pass page show what ₹999 buys',
    problem:
      'The buy view is a treasure chest, three small tiles and a price. People open checkout, close it, and go to /events and /schedule looking for what they would get.',
    build: [
      'A two-column comparison, Day Wristband vs All-Access, with ticks for: daytime entry, all 3 days, fast-lane gate, food credit, merch item, lucky draw.',
      'A deadline banner driven by a config value: "Online price ₹999 until Tue 24 Nov · ₹1,199 at the gate".',
      'A live sold counter from a Convex query (count of paid fest passes). Show it only once the count passes 100.',
      'The refund policy in one line under the button, and a sticky buy button on mobile.',
    ],
    done: ['Comparison, deadline and button all fit in the first screen on desktop.', 'Prices and dates come from config, not hard-coded copy.'],
    metric: (d) => ({ label: 'Opened checkout → tried to pay', value: f(fpRate(d)) }),
  },
  {
    id: 'YG-03', prio: 'P0', area: 'Backend (Convex) · email', effort: '4 hours',
    title: 'Win back people who opened checkout and left',
    problem: 'Every person who opened checkout gave us their email and showed intent. Today nothing goes back to them.',
    build: [
      'A Convex cron every 30 minutes: find fest-pass orders that are `expired`, whose user has no paid fest pass and no `recoverySentAt`.',
      'For each one, create a single-use code worth ₹200 off, valid 72 hours, using the existing referral-code table.',
      'Send the existing "Pay reminder" template with a link to `/pass?buy&code=XXXX`, and make `/pass` read `code` from the URL and auto-apply it.',
      'Set `recoverySentAt`. Send one more reminder 48 hours later if still unpaid, then stop.',
      'Fire the PostHog event `fest_pass_recovery_sent` so this dashboard can count it.',
    ],
    done: ['At most 2 emails per person.', 'Opening the link applies the code with no typing.'],
    metric: (d) => ({ label: 'People who opened checkout and left', value: String(Math.max(0, stage(d, 'checkout').value - d.sold)) }),
  },
  {
    id: 'YG-04', prio: 'P0', area: 'Backend (Convex)', effort: '3 hours',
    title: 'Automatic ₹599 price for event participants',
    problem: 'Most people who open checkout are already registered for an event. They are coming anyway, so ₹999 feels steep.',
    build: [
      'In the fest-pass price function: if the user has a confirmed registration (`placeConfirmed` or paid entry) and is not SST/SSB, use the PARTICIPANT price (₹599).',
      'Show "Participant price applied" on /pass and in the Razorpay description.',
      'One-time email to all confirmed outside registrants with a direct `/pass?buy` link.',
    ],
    done: ['The price is decided on the server, never trusted from the client.', 'The email goes out only once per person.'],
    metric: (d) => ({ label: 'Checkout openers already registered for an event', value: f(pct(d.openers.registered, d.openers.total)) }),
  },
  {
    id: 'YG-05', prio: 'P1', area: 'Backend · staff tool', effort: '3 hours',
    title: 'Squad codes: 4 for the price of 3, and 10 for ₹6,999',
    problem: '10% off for 5 people is too small to make one student collect money from four friends.',
    build: [
      'Add `maxUses` and `usesLeft` to discount codes. Redemption checks and decrements in the same Convex mutation as the order, so it can\'t be oversold.',
      'SQUAD4: 25% off, max 4 uses. SQUAD10: ₹699.90 each, max 10 uses. Staff create one per squad leader from the Referrals tab.',
      'Show "3 of 4 squad spots left" on /pass once a code is entered.',
    ],
    done: ['A code can\'t be used more than `maxUses` times, even with concurrent checkouts.'],
    metric: (d) => ({ label: 'Discount code tries that failed', value: String(d.codes.find((c) => c.name === 'unknown')?.value ?? 0) }),
  },
  {
    id: 'YG-06', prio: 'P1', area: 'Backend + frontend', effort: '4 hours',
    title: 'Bring-a-friend codes for SST and SSB students',
    problem: 'SST and SSB students get the pass free and visit the site the most, but they have no reason to bring outside friends.',
    build: [
      'Generate one personal code per SST/SSB account: ₹200 off for the friend.',
      'Show it on their /pass page with a WhatsApp share button (a `https://wa.me/?text=` link with the code and URL).',
      'Count redemptions per code. At 3 redemptions, mark the student as eligible for a free merch item, which staff hand over at the merch desk.',
    ],
    done: ['Students see their code without asking anyone.', 'Staff can see the top referrers in the Referrals tab.'],
    metric: (d) => ({ label: 'SST students active since launch', value: String(d.segments.find((s) => s.name === 'SST student')?.visitors ?? 0) }),
  },
  {
    id: 'YG-07', prio: 'P1', area: 'Frontend · Razorpay', effort: '2 hours',
    title: 'Make paying from a laptop easy',
    problem: 'Most pass checkouts happen on a laptop, where Razorpay opens on a QR code. Event payments mostly happen on phones and convert fine.',
    build: [
      'Razorpay Checkout `config.display`: on desktop, show UPI ID and cards next to the QR, not behind it.',
      'Add a "Pay on my phone" button that emails the user a link to `/pass?buy` (or a Razorpay Payment Link) so they can finish on their phone.',
      'On mobile, check that UPI intent (GPay, PhonePe, Paytm) is the first option.',
    ],
    done: ['A desktop user can pay with a UPI ID without scanning anything.'],
    metric: (d) => {
      const t = d.devices.reduce((a, x) => a + x.value, 0);
      return { label: 'Pass checkouts on desktop', value: f(pct(d.devices.find((x) => x.name === 'Desktop')?.value ?? 0, t)) };
    },
  },
  {
    id: 'YG-08', prio: 'P1', area: 'Analytics', effort: '2 hours',
    title: 'Track every step of checkout',
    problem: 'We can see checkout open and the final order status, but not what happens in between. Session replay is off.',
    build: [
      'Add properties to `fest_pass_window_opened`: `price`, `code`, `segment` (sst / ssb / scaler / outside, never the email), `device`.',
      'Fire `fest_pass_window_closed` from Razorpay `modal.ondismiss`, and `fest_pass_payment_failed` from `payment.failed` with `error.reason`.',
      'Turn on PostHog session replay for `/pass` only, with inputs masked.',
    ],
    done: ['Every checkout ends in one of: closed, failed, paid.', 'Replays exist for /pass sessions.'],
    metric: (d) => ({ label: 'Checkout opens tracked', value: String(d.openers.total) }),
  },
  {
    id: 'YG-09', prio: 'P2', area: 'Staff tool', effort: '2 hours',
    title: 'Upgrade desk at the gate',
    problem: 'Last year the fest had 4,000+ attendees. Many will walk in with a free wristband and only then decide they want the full pass.',
    build: [
      'In Staff → Scan: when a Day Wristband ID is scanned, show an "Upgrade to All-Access" button.',
      'That button opens the existing "Cash at the desk" flow pre-filled with the person, or shows a Razorpay QR for the gate price.',
    ],
    done: ['A volunteer can upgrade someone in under 30 seconds.'],
    metric: (d) => ({ label: 'Passes still needed', value: String(d.pace.remaining) }),
  },
];

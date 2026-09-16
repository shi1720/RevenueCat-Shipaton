# Unpause: a small business with a clear job

**Creator: Shivam Gupta.** Planning assumptions below are not customer results. See [source-backed market research](research/market.md) for evidence and competitors.

## The customer and the moment

Unpause is for people who make things in interrupted sessions: a tote between errands, a watercolor after work, a small build over several weekends. The initial audience is multi-hobby makers with several unfinished projects. The moment of value is returning to one of those objects and immediately knowing the next action and where the materials are.

The job is specific: **help me spend my spare minutes making, without reconstructing the project first.** A photo is evidence of the stopping point. A tiny next step turns recollection into action. A materials note reconnects the app to the physical workspace.

## The product

Save a handoff before stopping. When time opens up, choose 10, 25, or 45 minutes and an energy level. See projects that fit, with blocked work ranked after ready work. Read the latest context, start a session, and leave the next handoff. Completed projects retain their story and free a slot.

The core works locally without signup. An optional configured Supabase account supports identity; **it does not synchronize project data**. Export and import provide user-controlled backups. There is no AI service generating craft instructions, no social feed, and no medical claim. These boundaries keep the product understandable and operating costs modest.

## Why a customer might choose it

Notes is a credible substitute. Craft trackers are real competitors. [Krafio](https://www.krafio.app/?lang=en) offers context and progress logs; [Tapcord](https://tapcord.app/for/crafts) explicitly supports remembering physical craft projects. Our product bet is that a deliberately short handoff and time-based return ritual is easier to repeat than maintaining a general journal or inventory.

That is a usability hypothesis to test, not a defensible claim of first invention. The MVP has no established moat. A trusted archive, excellent execution, and craft-specific templates informed by actual research could become advantages over time. User data should remain exportable.

## Pricing and packaging

| Free | Studio |
| --- | --- |
| Three unfinished projects | Unlimited unfinished projects |
| Unlimited finished projects and session history, within technical storage limits | All free features |
| Photos, time/energy matching, handoffs, and session timer | Proposed one-time price: US $19.99 |
| Device reminders where supported | Lifetime entitlement verified by RevenueCat |
| Data export/import | No recurring subscription |

“Unlimited” means no paid-plan project-count allowance; storage and import safeguards still apply. The current backup schema permits up to 500 projects and 2,000 checkpoints per project. Revisit those limits before serving heavy users; do not promise unbounded storage.

All saved projects remain readable if Studio status is temporarily unavailable. Free access is measured by unfinished projects, so finishing something makes room for the next. Reminders and backups are not a reason to hold a user's memories hostage. Present the store's localized price at checkout; $19.99 is a configuration target, not a hard-coded claim about every region.

Why lifetime: hobby usage can be intermittent, and the current product does not require recurring inference or hosted project storage. A one-time fee is legible. It creates a future support obligation, so do not promise unlimited cloud services. A later service with recurring costs would need its own explicitly explained economics.

## Economics without invented forecasts

At the proposed price, 1,000 Studio purchases would produce $19,990 in gross sales. That is arithmetic, not a sales forecast, net income, or annual recurring revenue. Platform deductions, taxes, refunds, RevenueCat charges if applicable, hosting, customer support, and ongoing maintenance come out of that amount.

Samsung currently describes an 80% developer share for one-time app/IAP purchases before applicable deductions. RevenueCat currently states that its Pro tier is free below $2,500 monthly tracked revenue and then charges 1% of tracked revenue. Verify actual account terms before launch. [Samsung announcement](https://developer.samsung.com/sdp/news/en/2025/03/13/new-revenue-share-model-for-galaxy-store), [RevenueCat billing](https://www.revenuecat.com/docs/welcome/set-up-revenuecat/account-management)

Keep launch costs bounded with local project storage and user-controlled backups. Optional authentication still requires an operated account backend. Free service tiers are current vendor offerings, not permanent guarantees. No paid advertising budget or acquisition cost has been validated.

## The first distribution experiment

Publish a 20-second demonstration of one real project returning from a drawer: the object, the saved handoff, and a completed tiny step. Invite hobbyists to try the same action with a project they already own. Relevant places include maker workshops, sewing/embroidery communities, and small craft creators, subject to each community's posting rules. These are proposed channels; no partnership or outreach is claimed.

Avoid vague “be more productive” messaging. Lead with the recognizable moment: **“You still love the project. You just lost your place.”** A founder demonstration is useful; fabricated user stories and reviews are not.

## Validation before expanding

1. Observe five to ten hobbyists capture their own paused project. Record where the form feels like work. This sample is exploratory, not representative.
2. Ask them to return later. Observe whether the saved handoff is enough to begin, how long finding context takes, and what information is missing.
3. Compare that return with their existing method, including Notes or paper. Keep the comparison honest; do not manufacture a time-saved claim.
4. Offer the real free tier and optional Studio purchase. Measure actual purchases and ask non-buyers what would make payment worthwhile.
5. Track first saved handoff, a later resumed session, and a second saved handoff. Obtain appropriate consent before adding behavioral analytics; the MVP does not claim to collect these events remotely.

The key product outcome is a project resumed because the handoff helped. The key business question is whether enough people repeatedly value that help to buy Studio. Until measured, retention, conversion, revenue, and market size remain unknown.

## Expansion criteria

Build better capture and return behavior before adding inventory, community, AI, or a marketplace. Introduce a feature only when observed use shows a recurring obstacle. If capture feels burdensome, reduce fields or add editable voice capture. If users cannot find their supplies, improve location retrieval. If many need multiple devices, price and implement secure sync deliberately; do not imply that optional login already provides it.

# Competitor research: AI chat-companion apps for kids

**Date:** 2026-08-21
**Method:** Produced via the `research-competitor-features` skill. Web research (WebSearch/WebFetch) into publicly available marketing pages, app store listings, and third-party comparison articles — no hands-on testing of competitor apps, so findings are as-advertised, not independently verified. Every candidate gap was cross-checked against a direct grep/read of `src/` and `api/` (not just `PRODUCT.md`) before being kept — see "Corrections to a prior draft" below for two cases where trusting `PRODUCT.md` alone would have produced a false gap.

## A note on the baseline: PRODUCT.md is stale in one place

`PRODUCT.md` states "No 'story mode' ... exists yet" and lists it under "Explicitly absent (known gaps)." That's no longer true — `src/utils/prompts.js` defines a full `story` entry in `PROMPTS` and `MODE_INTROS` (interactive bedtime-style storytelling with branching child choices), `useChat.js`'s mode branching explicitly includes `'story'` alongside `'chat'`/`'sing'`, and it's wired as a Pro-gated mode in `api/_auth.js` (`FREE_MODES = new Set(['chat', 'sing'])`, so `story` requires entitlement). This matches the most recent commit on the branch (`fix: wire up story mode's system prompt instead of falling back to chat`). `PRODUCT.md` hasn't been updated to reflect it. This research treats story mode as **implemented**, not a gap — but flags the doc drift since it'll cause the same false-negative for anyone who trusts the doc without checking code.

## Apps researched

| App | Form factor | Primary angle |
|---|---|---|
| [Askie](https://kidsai.app/blog/best-ai-voice-assistants-for-kids) | App (iOS/Android) | Voice-first Q&A, homework help, storytelling, AI art, multi-language |
| [HeyOtto](https://www.heyotto.app/best-ai-for-kids) | App | Tutoring co-pilot, kid-safe web search, real-time concerning-content alerts, neurodivergent-friendly tools, "parent AI co-pilot" |
| [Curio](https://heycurio.com/faq) / [Gabbo](https://heycurio.com/products/v2/gabbo-gen-2) | Plush toy + app | Toy-embodied AI, parent-customizable persona, 90-day auto-purge transcripts |
| [Miko 3 / Miko Mini](https://miko.ai/) | Robot + app | Educational robot, hard on/off toggle for AI conversation |
| [Moshi](https://app.moshikids.com/bedtime_stories) | App | Sleep/bedtime, NYU-validated content, offline downloads |
| [Ello](https://www.heyotto.app/best-ai-for-kids) | App | Narrow-scope reading/phonics coach, listens to child read aloud, scores fluency |
| [Khanmigo](https://www.heyotto.app/best-ai-for-kids) | App/web | Socratic tutor tied to school curriculum, teacher + parent dashboards |
| [PinwheelGPT](https://ai.pinwheel.com/) | App (paired with kids' phone/watch hardware) | ChatGPT-based, parent portal shows even *deleted* chats, scheduled feature access |
| Amazon Alexa Kids+, Google Family Bell, Snorble, Yoto | Hardware/app | Reference points only (command-style voice, hardware-first, minimal AI) |
| ChatGPT (Family), Gemini, Character.AI | General-purpose | Cautionary reference — not child-designed; Character.AI settled a wrongful-death suit in March 2026, cited industry-wide as what *not* to be |

## Corrections to a prior ad-hoc draft

An earlier pass at this report (not produced via this skill) claimed two things as gaps that a direct code read shows are **already implemented**:

1. **"Self-serve one-click transcript deletion"** — claimed as Curio/Gabbo-only. Wrong: `src/components/parentTabs/HistoryTab.jsx` has a "Clear All" button (with an in-app confirm step, not a native `window.confirm`) wired to `deleteHistory()` in `src/services/historyService.js`, which runs `supabase.from('history').delete().eq('user_id', user.id)`. This is a working in-dashboard delete, not just the support-request-flow Data Deletion page the prior draft assumed.
2. **"Cross-session memory of a child's interests"** — claimed absent. Wrong: `formatHistoryMemory()` in `src/hooks/useChat.js` injects a `"RECENT MEMORIES — things {childName} said in past chats"` block (last 5 history rows) plus `extractTopics()`-derived recurring topics into the system prompt every session, explicitly instructing the model to "reference them warmly to make {childName} feel remembered." This is functionally close to what Moshi/Curio advertise.

Both were caught by reading the actual referenced files rather than trusting `PRODUCT.md`'s feature list — the exact failure mode this skill's workflow is designed to prevent.

## Feature gap matrix (competitor has it, Buddy doesn't)

Confirmed via grep across `src/`/`api/` for `distress|sentiment|wellbeing`, `streak`, `digest`, `i18n|locale|translat`, `homework|tutor|socratic`, `persona|customPrompt`, `dall-e|image generat`, `offline|service-worker` — all came back empty or unrelated, so these are genuine gaps, not just undocumented.

| Feature | Who has it | Buddy today |
|---|---|---|
| Real-time distress/wellbeing alert to parent | HeyOtto (published safety benchmarks around this) | Parent only sees historical chat transcripts on-demand in the History tab; nothing pushes a signal when a child seems upset in the moment |
| Dedicated reading/phonics coach that listens to the child read aloud and scores fluency | Ello | Six courses exist (Gardening, Robotics, Science, Cooking, Animals, Space) but none are literacy/reading-specific |
| Kid-safe open web search for factual questions outside the pre-authored courses | HeyOtto | Chat is a closed-domain LLM conversation; no search grounding found in `api/chat.js` |
| Homework-help / Socratic tutoring mode (guides toward an answer rather than giving pre-authored content) | Khanmigo, HeyOtto, Askie | Courses are structured/pre-authored step cards, not an open "help me with my homework" mode |
| Multi-language support | Askie | No i18n/locale infrastructure found; UI and prompts are English-only |
| Offline / downloadable content for spotty connectivity or bedtime without wifi | Moshi | Everything requires network (Groq chat + Google Cloud TTS, browser TTS fallback still needs the page loaded); no offline story cache |
| Weekly/periodic "here's what your kid was curious about" parent digest | Curio | Parent gets raw, scrollable chat history — no summarized/periodic digest, even though the topic-extraction (`extractTopics`) that could power one already exists for in-chat memory |
| Parent-set custom persona/behavior prompt per child (beyond avatar/costume cosmetics) | Curio, Gabbo | Avatar customization (type/color/name/costume) is purely cosmetic; no parent-authored "be extra encouraging about math" style instruction reaches the system prompt |
| Gamified streaks / daily-return incentives | Implied across category (e.g. virtual-pet-growth-tied streaks) | Buddy has stars + printable certificates on lesson completion, but no day-over-day streak or return mechanic |
| Hard AI on/off toggle independent of subscription/entitlement | Miko | Buddy's modes are gated by entitlement and screen-time limits (a timed pause with a wind-down screen), not an explicit "turn off AI conversation entirely" switch |
| AI-generated art/imagery from the child's own prompt | Askie | Not present — Buddy is voice/text plus pre-made course art only |
| Neurodivergent-friendly interaction tuning | HeyOtto | Not mentioned anywhere in `PRODUCT.md` or found in code (distinct from the existing `prefers-reduced-motion` accessibility work, which is a motion accommodation, not an interaction-style one) |

## What Buddy already does that's competitive (sanity check, not a gap)

- Tap-to-talk instead of always-on hot mic — privacy edge over Alexa Kids+, which defaults to hot mic.
- Live parent camera + voice messages — more "presence" than any reviewed competitor offers (most are chat-transcript-only, PinwheelGPT included).
- Server-side entitlement enforcement and PIN-gated settings — solid vs. category norms.
- Structured, multi-lesson interactive courses (Gardening/Robotics/Science/Cooking/Animals/Space) — deeper than most competitors' one-off "ask a question" model.
- Screen-time limits with a 5-minute-warning wind-down UX — matches Miko's bedtime-mode idea, already shipped.
- In-dashboard one-click chat history deletion (see correction above) — on par with Curio/Gabbo's transcript controls, arguably better since it's immediate rather than a 90-day auto-purge wait.
- Cross-session "remembers what we talked about" chat continuity (see correction above) — same spirit as Moshi/Curio's advertised personalization, already shipped via `formatHistoryMemory`/`extractTopics`.
- Three real conversational modes now (chat/sing/story) — `PRODUCT.md` undercounts this at two; story mode is live and Pro-gated.

## Standout idea worth pursuing

**Real-time emotional check-in + parent nudge, not a full "distress alert" system.** HeyOtto's real-time alerting for concerning content is the one feature across every app reviewed that's purpose-built around exactly the "peace of mind" pitch Buddy already claims as its positioning — and it's a genuine gap, not a doc-drift false positive like the two corrected above.

Buddy already has two pieces of infrastructure this could reuse rather than requiring new plumbing:
1. The avatar's emotional-state tracking (idle/listening/speaking/thinking/happy/confused) already exists but today only drives animation.
2. `extractTopics()` already scans chat turns for recurring subject matter to power in-chat memory — the same mechanism (scanning recent turns for a signal) generalizes to scanning for emotional-tone signals.

A lightweight version that stays on-brand (`PRODUCT.md`'s own copy guidance explicitly rejects "monitoring"/"surveillance" framing): if the LLM's own response generation surfaces something like sadness, fear, or a topic a parent would want to know about, surface a soft, non-alarming nudge in the Parent Dashboard — "Buddy noticed your child seemed a little sad while chatting today — want to check in?" — rather than a push alert or transcript excerpt. That's differentiated (no reviewed competitor does the *soft nudge* version — they either do nothing, like Curio/Gabbo's raw-transcript-only approach, or lean into alert/monitoring framing Buddy's brand voice rejects), and technically incremental since it extends two systems that already exist instead of adding new infrastructure.

## Sources

- [Best AI for Kids 2026 — Ranked by Safety & Features — HeyOtto](https://www.heyotto.app/best-ai-for-kids)
- [8 Best AI Companion Apps for Kids — Wondershare FamiSafe](https://famisafe.wondershare.com/app-review/ai-companion-apps.html)
- [AI for Kids・Askie — App Store](https://apps.apple.com/us/app/ai-for-kids-askie/id6749299565)
- [Best AI Apps for Kids in 2026 — Down Redbud Drive](https://www.downredbuddrive.com/best-ai-apps-for-kids/)
- [Best AI Voice Assistants for Kids in 2026 — Kidsai](https://kidsai.app/blog/best-ai-voice-assistants-for-kids)
- [AI Companion Safety Guide for Parents (2026 Update)](https://aicompanionguides.com/blog/ai-companion-safety-guide-for-parents-2026/)
- [Curio | AI Toys for Kids — FAQ](https://heycurio.com/faq)
- [Inside Curio's App-Connected AI Toys](https://heycurio.com/blog/inside-curio-s-app-connected-ai-toys-how-the-technology-works)
- [Gabbo AI Toy — Curio](https://heycurio.com/product/gabbo)
- [Miko 3 AI Robot](https://miko.ai/products/miko-3)
- [Miko Affirms Commitment to Child Safety with Enhanced Parental Controls](https://www.globenewswire.com/news-release/2026/02/16/3238714/0/en/Miko-Affirms-Commitment-to-Child-Safety-with-Enhanced-Parental-Controls-on-KidSafe-AI-Robots.html)
- [Moshi's daily bedtime story](https://app.moshikids.com/bedtime_stories)
- [Sleepytale vs Moshi: Kids Bedtime Story Apps Compared](https://www.sleepytale.com/compare/sleepytale-vs-moshi)
- [PinwheelGPT](https://ai.pinwheel.com/)
- [PinwheelGPT: Kid-Safe ChatGPT App — Pinwheel](https://www.pinwheel.com/gpt)
- [First Kid-Safe, Parent-Monitored AI Chat Bot Powered by ChatGPT — Pinwheel blog](https://blog.pinwheel.com/pinwheelgpt)

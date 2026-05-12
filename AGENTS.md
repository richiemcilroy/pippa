# AGENTS.md

This is the working guide for agents contributing to Pippa.

Pippa is an iOS-first, female-focused weight-loss app that combines fast food logging, calorie/protein/fibre/fat targets, cycle-aware context, shareable accountability, and strong privacy/safety boundaries. It is not a generic wellness diary, a fertility app, a medical device, or a public restriction leaderboard.

## Source Of Truth

- Read `pippa-whitepaper-markdown/README.md` before making product or architecture decisions.
- Use `pippa-whitepaper-markdown/product/03-source-grounded-requirements.md` for implementation-facing product requirements.
- Use `pippa-whitepaper-markdown/engineering/technical-architecture.md` for stack and monorepo direction.
- Use `pippa-whitepaper-markdown/safety/privacy-trust.md` and `pippa-whitepaper-markdown/brand/voice-positioning-claims.md` for UX copy, claims, privacy, and safety-sensitive behavior.
- Do not invent scientific, medical, legal, or market claims. If a claim is not grounded in the whitepaper or a cited source, mark it as an open question.

## Product Priorities

- Prioritise the mobile app. Pippa launches iOS first, then Android. Treat web as supporting infrastructure, API/admin surface, or later product surface unless explicitly scoped.
- MVP scope includes onboarding, targets, home dashboard, full food logging, manual cycle entry, cycle-aware guidance, weekly summaries, and share cards.
- Community is later. Private tracking is the default state; social and community features require explicit opt-in.
- Default targets are calories, protein, fibre, and fat. Carbs can exist but should not dominate the default product narrative.
- Cycle awareness changes context before changing targets. Use language such as "likely" and "may"; never imply exact hormonal prescriptions or exact calorie needs from cycle phase.
- Share cards should be beautiful and editable. Hide calories by default; show protein, fibre, and progress by default; let users choose visible metrics.
- Reward consistency, learning, nourishment, protein/fibre progress, and supportive accountability. Never reward lowest calories, fastest weight loss, skipped meals, fasting streaks, or public weight-loss leaderboards.

## Safety And Privacy

- Position Pippa as general wellness and weight-management support, not medical advice.
- Do not claim to diagnose, treat, prevent, or manage PMS, PMDD, PCOS, endometriosis, thyroid conditions, infertility, eating disorders, or any other medical condition.
- Avoid shame language. Do not use terms like "cheat", "bad food", "burn off", "punish", "willpower", "detox", "cleanse", "shred", "bikini body", or "guilt-free".
- Use calm, practical copy: "You are still on track", "Higher hunger can be normal this week", "Let's anchor your next meal", "Look at the trend, not today's number".
- Minimise sensitive data collection. Health, cycle, food, weight, symptom, and sensitive community fields must not be sent to ad pixels or broad analytics payloads.
- Require clear consent for cycle data, health integrations, AI image analysis, meal photo retention, and community profile creation.
- Meal photos should not be retained unless there is explicit consent and clear user value.

## Engineering Defaults

- Always use Bun. Prefer `bun install`, `bun run <script>`, and `bunx <tool>`.
- Do not add npm, yarn, or pnpm commands to docs, scripts, or comments. Existing scaffolded pnpm references should be replaced with Bun equivalents when touched.
- Keep code modular, typed, and boring in the best way. Prefer small domain functions, focused components, and explicit boundaries over clever abstractions.
- Code must pass typechecks before handoff. Run the narrowest useful check during iteration and the broader check before finishing.
- Prefer shared packages for reusable logic as the monorepo grows:
  - `packages/domain` for schemas, branded types, target calculations, and validation.
  - `packages/api` for typed contracts and route/service composition.
  - `packages/content` for reusable education, cycle copy, and safety language.
  - `packages/ui` for shared primitives, tokens, and NativeWind conventions where feasible.
- Keep product/domain logic out of screen components. Screens compose UI and call typed hooks/services; calculations and validation live in domain modules.
- Avoid `any`, untyped JSON blobs, and stringly typed domain values. Use discriminated unions, branded types, schemas, or typed constants where they clarify behavior.
- Comments should be rare. Leave comments only for important context: a safety guardrail, a bug that was fixed and must not regress, a non-obvious technical decision, or a product constraint from the whitepaper. Do not comment what the code already says.

## React Native And Styling

- Build mobile UI with React Native and Expo patterns first. Use native elements and platform APIs whenever practical.
- Use NativeWind for mobile styling. New UI should use `className` utilities and shared tokens, not custom `StyleSheet.create`, CSS modules, or ad hoc stylesheet files.
- Inline styles are acceptable only for values NativeWind cannot express cleanly, Reanimated animated styles, or measured performance reasons. Keep those exceptions small.
- Prefer native controls and expected platform behavior: `Pressable`, `TextInput`, `ScrollView`/virtualized lists, `Switch`, native date/time pickers, keyboard avoidance, safe areas, haptics, and accessibility props.
- Design should feel polished, calm, modern, and female-aware without relying on pink as the idea. Beautiful means useful, readable, responsive, and emotionally safe.
- Text must fit on small screens. Check long labels, dynamic values, and empty/loading/error states.
- Use Expo/Image or appropriate native image primitives for remote or large images. Avoid unnecessary re-renders, heavy work in render paths, and unvirtualized long lists.
- Keep animations purposeful and performant. Prefer Reanimated/native-driven animation paths for interactive or repeated motion.

## AI Food Logging Rules

- AI estimates are starting points, never truth.
- Every AI-generated estimate must be editable.
- Show confidence and ask clarifying questions when uncertainty is high.
- Let users edit food items, portions, calories, and macros.
- Track the logging source: barcode, database search, AI photo, label photo, text, voice, saved meal, or user-created item.
- Use user corrections to improve personal defaults and saved meals, not to expose private data to community or advertising systems.

## Verification

- Use Bun for all commands.
- Before finishing code changes, run the relevant typecheck and lint scripts when available.
- For mobile UI changes, run the app and visually verify the changed flow on an iPhone-sized viewport or simulator when practical.
- For safety/privacy-sensitive changes, verify copy and data flow against the whitepaper files named above.
- If a check cannot be run, state that clearly in the handoff with the reason.

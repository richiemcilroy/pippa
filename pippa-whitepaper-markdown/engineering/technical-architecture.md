# Technical Architecture

Source section: 9. Founder clarification: Pippa is an iOS-first mobile app, with Android later; web should not be assumed to be a launch product surface; the proposed stack is mostly decided but still open to better ideas before build.

The technical stack should support:

- A polished mobile-first experience.
- Rapid iteration.
- Strong type safety.
- A clean path toward a web surface.
- Avoiding separate codebases for mobile and web where possible.

Founder clarification: the product is a mobile app. Launch should prioritise iOS first, then Android. Web/API choices should be treated as supporting infrastructure or later product surfaces unless separately scoped.

Founder clarification: authentication should be email OTP only for now.

Founder clarification: for cycle data integrations, Apple Health and Health Connect are the first likely surfaces to investigate before assuming direct connectivity to third-party cycle apps.

## Stack Choices

| Layer | Chosen technology | Product reason |
| --- | --- | --- |
| Mobile app | React Native with Expo | Expo supports building one JavaScript/TypeScript project that runs natively across user devices, making it a strong fit for a mobile-first consumer app. |
| Styling | NativeWind | NativeWind brings Tailwind-style utility classes to React Native and supports consistent styling across platforms. |
| Monorepo | Turborepo | Turborepo is a high-performance build system for JavaScript and TypeScript codebases and is designed for scaling monorepos. |
| Web/API | Next.js | Next.js Route Handlers allow custom request handlers in the app directory using Web Request and Response APIs, suitable for an API-first Next app. |
| Auth | Better Auth email OTP | Better Auth's Email OTP plugin supports sign-in, email verification, and password reset with one-time passwords; its default generator is a random 6-digit number. |
| Types and effects | Effect | Effect is a TypeScript library for type-safe, composable, maintainable applications with structured error handling, concurrency, and observability. |
| Future web routing | TanStack Router | TanStack Router offers type-safe routing and search params for React, useful once the web app becomes more than an API/admin surface. |

## Monorepo Shape

| Path | Purpose |
| --- | --- |
| `apps/mobile` | Expo React Native app. |
| `apps/web` | Next.js app used initially for API routes and later web/admin surfaces. |
| `packages/ui` | Shared design tokens, primitive components where feasible, and NativeWind conventions. |
| `packages/domain` | Effect schemas, branded types, target calculations, and validation logic. |
| `packages/db` | Database schema, migrations, and repository interfaces. |
| `packages/auth` | Better Auth configuration and shared auth helpers. |
| `packages/api` | Typed API contracts, route handlers, and service composition. |
| `packages/content` | Reusable educational insights, cycle copy, and safety language. |
| `packages/config` | TypeScript, ESLint, Tailwind/NativeWind, and environment configuration. |

## Core API Surfaces

| API surface | Purpose |
| --- | --- |
| `/api/auth/*` | Email-code sign-in, session creation, and sign-out. |
| `/api/onboarding` | Capture goal, activity, cycle, and safety preferences. |
| `/api/targets` | Calculate and update calorie/protein/fibre/fat targets. |
| `/api/food/search` | Search food database by text, barcode, or recent foods. |
| `/api/food/estimate` | AI meal/photo/label estimation with confidence and edit payload. |
| `/api/logs` | Create, update, and delete meal logs and daily diary entries. |
| `/api/cycle` | Store period dates, symptoms, and cycle profile. |
| `/api/insights` | Return daily and weekly cycle-aware nutrition insights. |
| `/api/share-cards` | Generate shareable meal, streak, progress, and macro cards. |
| `/api/community` | Opt-in profiles, groups, posts, comments, and reactions. |
| `/api/privacy` | Export, delete, consent, and visibility controls. |

## Domain Model

| Domain object | What it stores |
| --- | --- |
| User / Account / Session | Authentication identity, email-code sign-in, sessions, and account status. |
| Private Profile | Height, weight, goal, activity, training, dietary preferences, and privacy settings. |
| Cycle Profile | Last period, average cycle length, period length, regularity, optional symptoms, and optional contraception context. |
| Cycle Event | Period days, symptom logs, mood/energy/cravings/bloating check-ins. |
| Target Profile | Calorie target/range, protein, fibre, fat, activity adjustment, and calculation version. |
| Food Item / Source | Database item, barcode, nutrition label, AI estimate, user-created item, or saved meal. |
| Meal Log | Meal entries, portions, macros, confidence, user edits, and timestamps. |
| Insight | Daily/weekly cycle-aware nutrition message, rationale, and source rule. |
| Share Card | Generated UGC asset, selected metrics, and visibility settings. |
| Community Profile | Opt-in display name, avatar, bio, and community preferences. |
| Group / Post / Comment / Reaction | Community content, moderation state, and reporting metadata. |
| Consent Event | Record of privacy, health data, AI, and community consent changes. |
| Safety Flag | User-chosen calorie visibility, distress prompts, unsupported states, and moderation flags. |

## AI Meal Logging Principles

AI should reduce effort, not pretend to be perfect.

Principles from the whitepaper:

- Every AI-generated food estimate should be editable.
- Every AI-generated food estimate should be explainable at a simple level.
- AI estimates should be treated as a starting point.
- The system should show confidence.
- The system should ask for clarification when uncertainty is high, such as portion size, sauce, cooking method, or brand.
- Never imply AI meal estimates are exact.
- Always let users edit calories, macros, portion, and food items.
- Avoid storing raw meal photos unless there is explicit consent and clear value.
- Keep a record of whether a log came from barcode, database search, AI photo, label, text, or voice.
- Use user corrections to improve saved meals and personal defaults, not to expose private data to community or ad systems.

# Foundational Product Scope

Source section: 6. Founder clarification: Pippa is an iOS-first mobile app; manual cycle entry, full MVP food logging, and share cards should be supported first; community comes later.

The build should focus on a small number of high-impact experiences. Every feature in this scope supports one of four jobs:

- Track easily.
- Understand the body.
- Hit better targets.
- Stay consistent with accountability.

## Onboarding

Onboarding should establish goals, safety boundaries, and personal context without feeling clinical. It should ask enough to personalise targets and cycle insights, but not so much that users abandon before logging their first meal.

Onboarding should cover:

- Goal: weight loss as the primary entry point, sustainable rate options, and a clear explanation that aggressive targets are not supported.
- Profile: age range, height, current weight, goal direction, optional exact goal weight, activity level, and training pattern, including cardio and weights.
- Nutrition context: dietary preferences, allergies or intolerances if needed, protein/fibre awareness, typical logging style, and preferred meals.
- Cycle context: last period start date, average cycle length, period length, and regularity.
- No cycle data path: if the user does not connect or enter cycle data, the app defaults to standard targets.
- Safety context: a careful prompt that calorie tracking may not be appropriate for everyone, with supportive language and links to professional help where relevant.

Founder clarification: contraception context, irregular-cycle nuance, and deeper symptom patterns should be optional settings later, not required in first-run onboarding.

Founder clarification: current weight should be required. The goal experience should include a fun goal-direction slider while still allowing an actual goal weight to be entered.

## Targets

Default targets should be:

- Calories.
- Protein.
- Fibre.
- Fat.

Calories anchor the deficit. Protein and fibre anchor satiety, education, and positive reinforcement. Fat remains visible because it matters for energy, hormones, and food quality. Carbs can be available without becoming the primary narrative.

Targets should be expressed as:

- A daily target.
- A flexible range.
- Weekly consistency.

The whitepaper gives this example:

- "1,750 kcal target."
- "1,650-1,900 kcal flexible range."

## Home Dashboard

The home dashboard should be the emotional centre of the app. It should combine utility, reassurance, and momentum.

Dashboard elements:

- Calorie dashboard: consumed, remaining, and range status.
- Protein, fibre, and fat rings or bars.
- Cycle phase card: current estimated phase, confidence where appropriate, and one practical nutrition insight.
- Streak or consistency score that celebrates showing up, not eating the fewest calories.
- Opinionated daily insight: one calm, useful line that explains what to prioritise today.

Example dashboard insight from the whitepaper:

> You are likely in the week before your period, so hunger and cravings may be higher. Aim for the higher end of your calorie range if you need it, and anchor your next meal around protein and fibre.

## Food Logging

Food logging must be easy and aesthetically satisfying. The user should not have to choose between accuracy and speed every time she eats. She should be able to log roughly, then edit quickly when needed.

Logging modes:

- Barcode scanning for packaged foods.
- AI/photo meal logging for plates, restaurant meals, and quick estimates.
- Label photo logging for nutrition labels and ingredient panels.
- Text input for natural language entries such as "Pret chicken salad and oat latte."
- Voice-style logging for users who prefer to speak rather than type.
- Easy edit after AI estimation, with confidence and portion controls.
- Saved meals, repeat meals, and recent foods.
- Food photos in search results where possible.

Founder clarification: the full food logging set above is MVP scope.

## Cycle-Aware Guidance

Cycle-awareness should make the app feel intelligent and humane. It should not turn into pseudoscience or excessive phase-by-phase prescription.

Founder clarification: users should be able to enter basic cycle data manually. Later integrations should likely prioritise Apple Health and Health Connect, then map external cycle data into Pippa's internal cycle-data flow.

| User context | Product behaviour |
| --- | --- |
| Cycle data connected or entered | Show estimated phase, relevant symptoms, and nutrition guidance. Use wording such as "likely" and "may" where prediction is uncertain. |
| Late luteal / pre-period context | Use flexible range language, craving planning, protein/fibre nudges, hydration, and scale fluctuation education. |
| Menstrual phase | Use calm energy and recovery messaging, with iron-rich food education where appropriate, without implying medical treatment. |
| No cycle data | Default to standard calorie/protein/fibre/fat targets and invite the user to add cycle data later. |
| Irregular cycles or hormonal contraception | Avoid false precision. Keep food tracking useful and let users log symptoms without forcing a phase label. |

## Weekly Summary

The weekly summary should turn tracking into progress. It should show how far the user has come toward her weight-loss goal and highlight consistency, protein, fibre, logged meals, and cycle context.

Weekly summary elements:

- Progress toward goal: weight trend where available, not a single weigh-in treated as truth.
- Nutrition wins: protein days hit, fibre improvement, consistent logging, and balanced meals.
- Cycle context: whether hunger, cravings, or weight fluctuations aligned with a predicted phase.
- Shareable summary card: optional, editable, and designed for Instagram Stories or TikTok-style UGC.

## Shareability And UGC

Shareability is both a distribution mechanic and an accountability mechanic. The app should create beautiful cards users want to post, with data that feels aspirational rather than embarrassing.

Founder clarification: share cards should be part of the first version because they support social sharing outside the app, even though in-app community comes later. Calories should be hidden by default. Protein, fibre, and progress should be shown by default. Users should be able to toggle visible metrics.

| Share card | Why it matters | Safety rule |
| --- | --- | --- |
| Meal card | Makes food logging visible, aesthetic, and social. | Calories optional; portion and macros editable. |
| Protein/fibre win | Encourages positive nutrition behaviour instead of restriction. | Celebrate hitting enough, not eating less. |
| Streak card | Turns consistency into identity. | Streak recovery should be forgiving. |
| Weekly progress card | Shows momentum without requiring daily perfection. | Avoid public weigh-in pressure by making weight optional. |
| Cycle-aware card | Makes the female-focused wedge visible in UGC. | Use educational, non-medical wording. |

## Community

The community should be opt-in. The user starts in a private tracker. When she opens the community tab, she sees an introduction, chooses to join, sets up a profile, and controls what is visible.

Founder clarification: community is not day-one launch scope and will come later.

Community components:

- Profiles: optional community identity, separate from private account data where possible.
- Groups: goal-based, lifestyle-based, or audience-based spaces, including a natural Girls in Marketing launch group.
- Posts, comments, and likes: designed for support, meal sharing, accountability, and questions.
- Private accountability circles: small friend groups for selected sharing.
- Moderation: clear rules against shame, body checking, extreme restriction, harassment, and medical advice presented as certainty.

## Gamification

Gamification should make healthy consistency feel rewarding. It should never reward restriction.

| Reward this | Do not reward this |
| --- | --- |
| Logging meals consistently | Eating the fewest calories |
| Hitting protein and fibre goals | Being under target as a flex |
| Completing cycle and symptom check-ins | Public weight-loss leaderboards |
| Supporting another user | Skipping meals or fasting streaks |
| Staying consistent through a difficult week | Fastest weight loss in a group |

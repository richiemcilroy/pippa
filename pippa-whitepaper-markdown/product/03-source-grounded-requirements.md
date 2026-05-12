# Source-Grounded Product Requirements

Source sections: 1, 4, 5, 6, 8, 9, 11. Founder clarifications: Pippa is an iOS-first mobile app; manual cycle entry, full MVP food logging, and share cards should be supported first; community comes later.

These requirements restate product implications from the whitepaper. They do not add new features beyond the whitepaper scope.

## Positioning Requirements

- The app should present itself as a female-focused weight loss product.
- The app should avoid presenting itself as a generic wellness diary.
- The app should avoid presenting itself as a fertility app.
- The app should be clear that weight loss is the primary user job.
- The experience should be structured but forgiving.
- The experience should be nutrition-led rather than purely calorie-led.
- The experience should be cycle-aware without being deterministic.
- Social features should be opt-in.

## Tracking Requirements

- Food logging should be fast, aesthetic, and forgiving.
- AI/photo food logging should be included in MVP.
- The app should support barcode scanning.
- The app should support AI/photo meal logging.
- The app should support nutrition label photo logging.
- The app should support natural-language text entries.
- The app should support voice-style logging.
- AI estimates should be editable.
- AI estimates should show confidence and portion controls.
- Saved meals, repeat meals, and recent foods should reduce repeated effort.
- The app should avoid pretending every estimate is exact.

## Onboarding Requirements

- Current weight should be required.
- Goal direction should be captured with a fun slider.
- Exact goal weight entry should still be available.
- First-run manual cycle onboarding should ask for last period start date, average cycle length, period length, and regularity.
- Authentication should be email OTP only for now.

## Target Requirements

- Default targets should include calories, protein, fibre, and fat.
- Calories should anchor the deficit.
- Protein and fibre should be used as satiety, education, and positive-reinforcement levers.
- Fat should remain visible.
- Carbs can exist but should not dominate the default narrative.
- Targets should include a daily target and a flexible range.
- Weekly consistency should be visible.

## Cycle-Aware Requirements

- Manual cycle data entry should be supported.
- Contraception context and irregular-cycle nuance should be optional settings later.
- Cycle-awareness should change the user's context before changing her target.
- The app should use wording such as "likely" and "may" where prediction is uncertain.
- The app should avoid exact hormonal prescriptions.
- The app should avoid dramatic automatic calorie swings.
- The app should avoid claims such as "your body needs exactly X more calories today."
- Late luteal or pre-period contexts should use flexible range language, craving planning, protein/fibre nudges, hydration, and scale fluctuation education.
- Menstrual phase guidance can use calm energy and recovery messaging, with iron-rich food education where appropriate, without implying medical treatment.
- Users with no cycle data should receive standard calorie/protein/fibre/fat targets and an invitation to add cycle data later.
- Users with irregular cycles or hormonal contraception should not be forced into false precision or phase labels.
- Future cycle-data integrations should likely start with Apple Health and Health Connect, then map external data into Pippa's internal cycle data flow.

## Community And Sharing Requirements

- The private tracker should be the default state.
- Share cards should be included in the first version for social sharing.
- Share cards should hide calories by default.
- Share cards should show protein, fibre, and progress by default.
- Users should be able to toggle visible share-card metrics.
- Community should not be treated as day-one launch scope.
- Community should require opt-in profile setup.
- Food, weight, cycle, and body data should remain private unless actively shared.
- Share cards should be optional and editable.
- Calories should be optional on meal cards.
- Weight should be optional on weekly progress cards.
- Group challenges should avoid restriction contests.
- Private accountability circles should support selected sharing.
- Moderation rules should cover shame, body checking, extreme restriction, harassment, and medical advice presented as certainty.

## Gamification Requirements

The app should reward:

- Logging meals consistently.
- Hitting protein and fibre goals.
- Completing cycle and symptom check-ins.
- Supporting another user.
- Staying consistent through a difficult week.

The app should not reward:

- Eating the fewest calories.
- Being under target as a flex.
- Public weight-loss leaderboards.
- Skipping meals or fasting streaks.
- Fastest weight loss in a group.

## Safety And Trust Requirements

- The app should be positioned as general wellness and weight-management support, not medical advice or a medical device.
- The app should avoid claims that it diagnoses, treats, or prevents PMS, PMDD, PCOS, endometriosis, thyroid conditions, infertility, eating disorders, or any other medical condition.
- The product should include safety prompts and links to professional help where relevant.
- The product should not support aggressive calorie deficits.
- The product should not set targets below safe internal thresholds.
- The product should not include public leaderboards for lowest calories, fastest weight loss, or most weight lost.
- Public calorie comparison should not be the default.
- The default community should not become a body-checking feed or progress-photo culture.
- Users should have optional calorie visibility controls.

## Privacy Requirements

- The product privacy stance should be simple enough for a user to repeat: the app does not sell health data, does not use cycle or food data for ads, and gives users control over what they share.
- Data collection should be minimised to what is needed for targets, logging, insights, community, and safety.
- Cycle data, health integrations, AI image analysis, and community profile creation should require clear consent.
- Users should be able to delete and export their data easily.
- Health, cycle, food, weight, symptom, and sensitive community fields should not be sent into ad pixels or broad analytics payloads.
- Private tracking data should not automatically flow into community identity.
- Meal photos should be processed transparently, editable by the user, and not retained unless there is clear user benefit and consent.

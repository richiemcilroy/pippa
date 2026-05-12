# Safety, Privacy, And Trust

Source section: 8.

The app will handle sensitive data:

- Food.
- Weight.
- Body measurements.
- Menstrual cycle dates.
- Symptoms.
- Goals.
- Activity.
- Community content.
- Possibly images.

The whitepaper frames privacy as part of the brand promise, not only compliance.

## General Wellness Boundary

The product should be positioned as general wellness and weight-management support, not medical advice or a medical device.

The whitepaper cites FDA 2026 General Wellness guidance and says the app should avoid claims that it diagnoses, treats, or prevents:

- PMS.
- PMDD.
- PCOS.
- Endometriosis.
- Thyroid conditions.
- Infertility.
- Eating disorders.
- Any other medical condition.

The app can:

- Educate users.
- Surface patterns.
- Advise speaking to a clinician when symptoms are severe or unusual.

## Eating Disorder And Body Image Guardrails

The product should be designed against predictable harm.

Guardrails from the whitepaper:

- No aggressive calorie deficits.
- No targets below safe internal thresholds.
- No public leaderboards for lowest calories, fastest weight loss, or most weight lost.
- No public calorie comparison by default.
- Calorie sharing should be optional and more suitable for private accountability contexts.
- No body-checking feed or progress-photo culture in the default community design.
- Optional calorie visibility controls for users who want nutrition guidance without seeing every number.
- Support links and prompts to consult a health professional if tracking feels distressing or if the user has a current or past eating disorder.
- Community rules that remove thinspo, extreme restriction advice, harassment, and pseudo-medical claims.

The whitepaper cites NICE guidance on eating disorders and says the app should not attempt to replace clinical support for users who need it.

## Privacy Architecture

Whitepaper privacy stance:

> We do not sell your health data, we do not use your cycle or food data for ads, and you control what you share.

Privacy principles:

- Data minimisation: collect only what is needed for targets, logging, insights, community, and safety.
- Explicit consent: cycle data, health integrations, AI image analysis, and community profile creation should be clearly consented to.
- Delete and export: users should be able to delete and export their data easily.
- Analytics allow-list: no health, cycle, food, weight, symptom, or community-sensitive fields in ad pixels or broad analytics payloads.
- Separate privacy layers: private tracking data should not automatically flow into community identity.
- Image handling: meal photos should be processed transparently, editable by the user, and not retained unless there is clear user benefit and consent.

## Regulatory Context Mentioned In The Whitepaper

The whitepaper cites:

- UK Information Commissioner's Office reminders to period and fertility app developers about transparency, valid consent, and only requesting necessary information.
- FTC Health Breach Notification Rule amendments, which the whitepaper says make clear that makers of health apps, connected devices, and similar products must comply with the rule.
- Washington's My Health My Data Act, including consumer rights around health data such as deletion and possible applicability to companies outside Washington that provide services to Washington consumers.

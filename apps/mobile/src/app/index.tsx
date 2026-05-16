import {
  activityLevels,
  ageRanges,
  calorieVisibilityModes,
  cycleRegularities,
  onboardingSchemaVersion,
  validateOnboardingAnswers,
  type ActivityLevel,
  type AgeRange,
  type CalorieVisibilityMode,
  type CycleRegularity,
  type GoalDirection,
  type OnboardingAnswers,
} from "@pippa/domain";
import { useEffect, useState, type ReactNode } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  getOnboardingStatus,
  getSession,
  normalizeEmail,
  PippaApiError,
  sendSignInCode,
  signOut,
  syncOnboarding,
  verifySignInCode,
  type AuthSession,
  type AuthUser,
} from "@/lib/api";
import {
  clearStoredAuthToken,
  getStoredAuthToken,
  getStoredOnboarding,
  setStoredAuthToken,
  setStoredOnboarding,
} from "@/lib/session-storage";

type Stage = "loading" | "onboarding" | "sign-in" | "home";
type SignInStep = "email" | "code";

type OnboardingDraft = {
  goalDirection: GoalDirection;
  goalIntensity: number;
  goalWeightKg: string;
  currentWeightKg: string;
  heightCm: string;
  ageRange: AgeRange;
  activityLevel: ActivityLevel;
  cardioSessionsPerWeek: number;
  strengthSessionsPerWeek: number;
  cycleConsent: boolean | null;
  lastPeriodStartOn: string;
  averageCycleLengthDays: string;
  periodLengthDays: string;
  regularity: CycleRegularity;
  calorieVisibility: CalorieVisibilityMode;
};

const onboardingSteps = ["Hello", "Goal", "Body", "Routine", "Cycle", "Privacy"] as const;

const initialDraft: OnboardingDraft = {
  goalDirection: "lose",
  goalIntensity: 3,
  goalWeightKg: "",
  currentWeightKg: "",
  heightCm: "",
  ageRange: "prefer_not_to_say",
  activityLevel: "light",
  cardioSessionsPerWeek: 1,
  strengthSessionsPerWeek: 2,
  cycleConsent: null,
  lastPeriodStartOn: "",
  averageCycleLengthDays: "28",
  periodLengthDays: "5",
  regularity: "regular",
  calorieVisibility: "visible",
};

export default function PippaMobileApp() {
  const [stage, setStage] = useState<Stage>("loading");
  const [token, setToken] = useState<string | null>(null);
  const [session, setSession] = useState<AuthSession | null>(null);
  const [onboarding, setOnboarding] = useState<OnboardingAnswers | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function bootstrap() {
      const [storedToken, storedOnboarding] = await Promise.all([
        getStoredAuthToken(),
        getStoredOnboarding(),
      ]);

      if (!isMounted) {
        return;
      }

      setOnboarding(storedOnboarding);

      if (!storedToken) {
        setStage(storedOnboarding ? "sign-in" : "onboarding");
        return;
      }

      try {
        const nextSession = await getSession(storedToken);

        if (!nextSession) {
          await clearStoredAuthToken();
          setStage(storedOnboarding ? "sign-in" : "onboarding");
          return;
        }

        setToken(storedToken);
        setSession(nextSession);

        const status = await getOnboardingStatus(storedToken).catch(() => null);

        if (!status?.completed && storedOnboarding) {
          await syncOnboarding(storedToken, storedOnboarding).catch(() => {
            setNotice("You are signed in. We will retry saving your setup when the API is available.");
          });
        }

        if (status?.completed || storedOnboarding) {
          setStage("home");
          return;
        }

        setStage("onboarding");
      } catch {
        setNotice("Could not reach the API. Check the web server or EXPO_PUBLIC_API_URL.");
        setStage(storedOnboarding ? "sign-in" : "onboarding");
      }
    }

    void bootstrap();

    return () => {
      isMounted = false;
    };
  }, []);

  async function handleOnboardingComplete(answers: OnboardingAnswers) {
    await setStoredOnboarding(answers);
    setOnboarding(answers);

    if (token && session) {
      await syncOnboarding(token, answers);
      setStage("home");
      return;
    }

    setStage("sign-in");
  }

  async function handleSignedIn(nextToken: string, user: AuthUser) {
    await setStoredAuthToken(nextToken);
    setToken(nextToken);

    if (onboarding) {
      await syncOnboarding(nextToken, onboarding).catch(() => {
        setNotice("You are signed in. We will retry saving your setup when the API is available.");
      });
    }

    setSession({ user });
    setStage("home");
  }

  async function handleSignOut() {
    const currentToken = token;
    setToken(null);
    setSession(null);
    await signOut(currentToken);
    await clearStoredAuthToken();
    setStage(onboarding ? "sign-in" : "onboarding");
  }

  if (stage === "loading") {
    return (
      <ScreenFrame>
        <View className="flex-1 items-center justify-center gap-5 px-8">
          <BrandMark />
          <ActivityIndicator color="#45685A" />
          <Text className="text-center text-[15px] leading-6 text-[#69746E]">Preparing Pippa...</Text>
        </View>
      </ScreenFrame>
    );
  }

  if (stage === "onboarding") {
    return <OnboardingScreen onComplete={handleOnboardingComplete} />;
  }

  if (stage === "sign-in") {
    return (
      <SignInScreen
        notice={notice}
        onSignedIn={handleSignedIn}
        onboardingReady={Boolean(onboarding)}
      />
    );
  }

  return (
    <HomeScreen
      notice={notice}
      onboarding={onboarding}
      session={session}
      onSignOut={handleSignOut}
    />
  );
}

function OnboardingScreen({ onComplete }: { onComplete: (answers: OnboardingAnswers) => Promise<void> }) {
  const [draft, setDraft] = useState<OnboardingDraft>(initialDraft);
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const progressLabel = `${step + 1} of ${onboardingSteps.length}`;
  const canContinue = getStepIsValid(step, draft);

  function updateDraft(patch: Partial<OnboardingDraft>) {
    setDraft((current) => ({ ...current, ...patch }));
    setError(null);
  }

  async function handleNext() {
    if (!canContinue) {
      setError(getStepError(step));
      return;
    }

    if (step < onboardingSteps.length - 1) {
      setStep((current) => current + 1);
      setError(null);
      return;
    }

    const answers = buildOnboardingAnswers(draft);
    const validation = validateOnboardingAnswers(answers);

    if (!validation.success) {
      setError(validation.issues[0] ?? "Check your answers before continuing.");
      return;
    }

    await onComplete(validation.value);
  }

  return (
    <ScreenFrame>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1"
      >
        <SafeAreaView className="flex-1">
          <View className="border-b border-[#E0E4DA] px-5 pb-4 pt-2">
            <View className="flex-row items-center justify-between">
              <BrandMark />
              <Text className="text-[12px] font-semibold uppercase tracking-[1.6px] text-[#7A837D]">
                {progressLabel}
              </Text>
            </View>
            <View className="mt-5 flex-row gap-2">
              {onboardingSteps.map((label, index) => (
                <View
                  key={label}
                  className={`h-1.5 flex-1 rounded-full ${index <= step ? "bg-[#45685A]" : "bg-[#DCE2DA]"}`}
                />
              ))}
            </View>
          </View>

          <ScrollView
            className="flex-1"
            contentContainerClassName="w-full gap-6 px-5 pb-8 pt-7"
            keyboardShouldPersistTaps="handled"
          >
            {step === 0 ? <IntroStep /> : null}
            {step === 1 ? <GoalStep draft={draft} updateDraft={updateDraft} /> : null}
            {step === 2 ? <BodyStep draft={draft} updateDraft={updateDraft} /> : null}
            {step === 3 ? <RoutineStep draft={draft} updateDraft={updateDraft} /> : null}
            {step === 4 ? <CycleStep draft={draft} updateDraft={updateDraft} /> : null}
            {step === 5 ? <PrivacyStep draft={draft} updateDraft={updateDraft} /> : null}

            {error ? <InlineError message={error} /> : null}
          </ScrollView>

          <View className="gap-3 border-t border-[#E0E4DA] bg-[#F7F7F2] px-5 pb-6 pt-4">
            <PrimaryButton
              label={step === onboardingSteps.length - 1 ? "Continue to sign in" : "Continue"}
              onPress={handleNext}
              disabled={!canContinue}
            />
            {step > 0 ? (
              <SecondaryButton
                label="Back"
                onPress={() => {
                  setStep((current) => current - 1);
                  setError(null);
                }}
              />
            ) : null}
          </View>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </ScreenFrame>
  );
}

function IntroStep() {
  return (
    <View className="min-w-0 w-full gap-6">
      <View className="min-w-0 gap-3">
        <Text className="min-w-0 shrink text-[34px] font-semibold leading-10 text-[#17211C]">Weight loss that keeps context.</Text>
        <Text className="min-w-0 shrink text-[16px] leading-7 text-[#56635C]">
          Pippa starts with your goal, your week and your cycle context before asking you to sign in.
        </Text>
      </View>

      <View className="gap-3">
        <InfoRow title="Nutrition-led" body="Calories, protein, fibre and fat stay visible without making one day feel like a verdict." />
        <InfoRow title="Cycle-aware" body="Guidance uses likely context and flexible ranges, never exact hormonal prescriptions." />
        <InfoRow title="Private first" body="Food, weight and cycle details stay private unless you choose to share later." />
      </View>
    </View>
  );
}

function GoalStep({
  draft,
  updateDraft,
}: {
  draft: OnboardingDraft;
  updateDraft: (patch: Partial<OnboardingDraft>) => void;
}) {
  return (
    <StepBlock
      eyebrow="Your direction"
      title="Set the tone for your first few weeks."
      body="Most people start with steady loss. You can adjust the exact target later."
    >
      <View className="gap-3">
        <ChoiceButton
          label="Lose weight"
          detail="A calm deficit with protein and fibre anchors."
          selected={draft.goalDirection === "lose"}
          onPress={() => updateDraft({ goalDirection: "lose" })}
        />
        <ChoiceButton
          label="Maintain"
          detail="Useful if you want structure before changing weight."
          selected={draft.goalDirection === "maintain"}
          onPress={() => updateDraft({ goalDirection: "maintain" })}
        />
        <ChoiceButton
          label="Gain"
          detail="Kept available for accuracy if your goal changes."
          selected={draft.goalDirection === "gain"}
          onPress={() => updateDraft({ goalDirection: "gain" })}
        />
      </View>

      <View className="gap-3">
        <Text className="text-[13px] font-semibold uppercase tracking-[1.4px] text-[#6B756F]">Pace</Text>
        <View className="flex-row gap-2">
          {[1, 2, 3, 4, 5].map((value) => (
            <Pressable
              key={value}
              accessibilityRole="button"
              accessibilityLabel={`Goal pace ${value}`}
              onPress={() => updateDraft({ goalIntensity: value })}
              className={`h-12 flex-1 items-center justify-center rounded-full border ${
                draft.goalIntensity === value
                  ? "border-[#45685A] bg-[#45685A]"
                  : "border-[#D7DDD4] bg-white"
              }`}
            >
              <Text className={`text-[15px] font-semibold ${draft.goalIntensity === value ? "text-white" : "text-[#46524B]"}`}>
                {value}
              </Text>
            </Pressable>
          ))}
        </View>
        <View className="flex-row justify-between">
          <Text className="text-[12px] text-[#69746E]">Gentle</Text>
          <Text className="text-[12px] text-[#69746E]">Focused</Text>
        </View>
      </View>

      <Field label="Exact goal weight, optional" suffix="kg">
        <TextInput
          value={draft.goalWeightKg}
          onChangeText={(goalWeightKg) => updateDraft({ goalWeightKg })}
          keyboardType="decimal-pad"
          placeholder="e.g. 68"
          placeholderTextColor="#9BA59E"
          className="h-14 flex-1 rounded-2xl border border-[#D7DDD4] bg-white px-4 text-[16px] text-[#17211C]"
        />
      </Field>
    </StepBlock>
  );
}

function BodyStep({
  draft,
  updateDraft,
}: {
  draft: OnboardingDraft;
  updateDraft: (patch: Partial<OnboardingDraft>) => void;
}) {
  return (
    <StepBlock
      eyebrow="Your baseline"
      title="Start with the numbers targets need."
      body="Current weight is required now. The rest can stay light until targets become more detailed."
    >
      <Field label="Current weight" suffix="kg" required>
        <TextInput
          value={draft.currentWeightKg}
          onChangeText={(currentWeightKg) => updateDraft({ currentWeightKg })}
          keyboardType="decimal-pad"
          placeholder="e.g. 74"
          placeholderTextColor="#9BA59E"
          className="h-14 flex-1 rounded-2xl border border-[#D7DDD4] bg-white px-4 text-[16px] text-[#17211C]"
        />
      </Field>

      <Field label="Height, optional" suffix="cm">
        <TextInput
          value={draft.heightCm}
          onChangeText={(heightCm) => updateDraft({ heightCm })}
          keyboardType="decimal-pad"
          placeholder="e.g. 165"
          placeholderTextColor="#9BA59E"
          className="h-14 flex-1 rounded-2xl border border-[#D7DDD4] bg-white px-4 text-[16px] text-[#17211C]"
        />
      </Field>

      <View className="gap-3">
        <Text className="text-[13px] font-semibold uppercase tracking-[1.4px] text-[#6B756F]">Age range</Text>
        <View className="flex-row flex-wrap gap-2">
          {ageRanges.map((ageRange) => (
            <Chip
              key={ageRange}
              label={formatAgeRange(ageRange)}
              selected={draft.ageRange === ageRange}
              onPress={() => updateDraft({ ageRange })}
            />
          ))}
        </View>
      </View>
    </StepBlock>
  );
}

function RoutineStep({
  draft,
  updateDraft,
}: {
  draft: OnboardingDraft;
  updateDraft: (patch: Partial<OnboardingDraft>) => void;
}) {
  return (
    <StepBlock
      eyebrow="Your week"
      title="Make targets fit real life."
      body="This helps Pippa avoid treating a desk week and a training week as the same thing."
    >
      <View className="gap-3">
        {activityLevels.map((activityLevel) => (
          <ChoiceButton
            key={activityLevel}
            label={formatActivityLevel(activityLevel)}
            detail={getActivityDetail(activityLevel)}
            selected={draft.activityLevel === activityLevel}
            onPress={() => updateDraft({ activityLevel })}
          />
        ))}
      </View>

      <View className="gap-3">
        <NumberStepper
          label="Cardio sessions"
          value={draft.cardioSessionsPerWeek}
          onChange={(cardioSessionsPerWeek) => updateDraft({ cardioSessionsPerWeek })}
        />
        <NumberStepper
          label="Strength sessions"
          value={draft.strengthSessionsPerWeek}
          onChange={(strengthSessionsPerWeek) => updateDraft({ strengthSessionsPerWeek })}
        />
      </View>
    </StepBlock>
  );
}

function CycleStep({
  draft,
  updateDraft,
}: {
  draft: OnboardingDraft;
  updateDraft: (patch: Partial<OnboardingDraft>) => void;
}) {
  return (
    <StepBlock
      eyebrow="Cycle context"
      title="Add cycle guidance only if you want it."
      body="Cycle data needs clear consent. It is used for context around hunger, cravings and scale changes."
    >
      <View className="gap-3">
        <ChoiceButton
          label="Add cycle context"
          detail="Use manual dates for likely phase context."
          selected={draft.cycleConsent === true}
          onPress={() => updateDraft({ cycleConsent: true })}
        />
        <ChoiceButton
          label="Not right now"
          detail="Use standard calorie, protein, fibre and fat targets."
          selected={draft.cycleConsent === false}
          onPress={() => updateDraft({ cycleConsent: false })}
        />
      </View>

      {draft.cycleConsent ? (
        <View className="gap-5">
          <Field label="Last period start" suffix="YYYY-MM-DD" required>
            <TextInput
              value={draft.lastPeriodStartOn}
              onChangeText={(lastPeriodStartOn) => updateDraft({ lastPeriodStartOn })}
              keyboardType="numbers-and-punctuation"
              placeholder="2026-05-01"
              placeholderTextColor="#9BA59E"
              className="h-14 flex-1 rounded-2xl border border-[#D7DDD4] bg-white px-4 text-[16px] text-[#17211C]"
            />
          </Field>

          <View className="flex-row gap-3">
            <Field label="Cycle length" suffix="days" required compact>
              <TextInput
                value={draft.averageCycleLengthDays}
                onChangeText={(averageCycleLengthDays) => updateDraft({ averageCycleLengthDays })}
                keyboardType="number-pad"
                placeholder="28"
                placeholderTextColor="#9BA59E"
                className="h-14 flex-1 rounded-2xl border border-[#D7DDD4] bg-white px-4 text-[16px] text-[#17211C]"
              />
            </Field>
            <Field label="Period length" suffix="days" required compact>
              <TextInput
                value={draft.periodLengthDays}
                onChangeText={(periodLengthDays) => updateDraft({ periodLengthDays })}
                keyboardType="number-pad"
                placeholder="5"
                placeholderTextColor="#9BA59E"
                className="h-14 flex-1 rounded-2xl border border-[#D7DDD4] bg-white px-4 text-[16px] text-[#17211C]"
              />
            </Field>
          </View>

          <View className="gap-3">
            <Text className="text-[13px] font-semibold uppercase tracking-[1.4px] text-[#6B756F]">Regularity</Text>
            <View className="flex-row flex-wrap gap-2">
              {cycleRegularities.map((regularity) => (
                <Chip
                  key={regularity}
                  label={formatRegularity(regularity)}
                  selected={draft.regularity === regularity}
                  onPress={() => updateDraft({ regularity })}
                />
              ))}
            </View>
          </View>
        </View>
      ) : null}
    </StepBlock>
  );
}

function PrivacyStep({
  draft,
  updateDraft,
}: {
  draft: OnboardingDraft;
  updateDraft: (patch: Partial<OnboardingDraft>) => void;
}) {
  return (
    <StepBlock
      eyebrow="Your controls"
      title="Choose how numbers feel on day one."
      body="Pippa is private by default. Share cards hide calories unless you choose otherwise later."
    >
      <View className="gap-3">
        {calorieVisibilityModes.map((calorieVisibility) => (
          <ChoiceButton
            key={calorieVisibility}
            label={formatCalorieVisibility(calorieVisibility)}
            detail={getCalorieVisibilityDetail(calorieVisibility)}
            selected={draft.calorieVisibility === calorieVisibility}
            onPress={() => updateDraft({ calorieVisibility })}
          />
        ))}
      </View>

      <View className="rounded-2xl border border-[#DCE2DA] bg-white px-4 py-4">
        <Text className="text-[14px] font-semibold text-[#17211C]">Privacy stance</Text>
        <Text className="mt-2 text-[14px] leading-6 text-[#5A665F]">
          Pippa does not sell health data, does not use cycle or food data for ads, and keeps sharing opt-in.
        </Text>
      </View>
    </StepBlock>
  );
}

function SignInScreen({
  notice,
  onboardingReady,
  onSignedIn,
}: {
  notice: string | null;
  onboardingReady: boolean;
  onSignedIn: (token: string, user: AuthUser) => Promise<void>;
}) {
  const [step, setStep] = useState<SignInStep>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSendCode() {
    const nextEmail = normalizeEmail(email);
    setError(null);

    if (!nextEmail) {
      setError("Enter your email to receive a sign-in code.");
      return;
    }

    setIsPending(true);

    try {
      await sendSignInCode(nextEmail);
      setEmail(nextEmail);
      setOtp("");
      setStep("code");
    } catch (nextError) {
      setError(getAuthErrorMessage(nextError));
    } finally {
      setIsPending(false);
    }
  }

  async function handleVerifyCode() {
    setError(null);

    if (!/^\d{6}$/.test(otp)) {
      setError("Enter the 6-digit code from your email.");
      return;
    }

    setIsPending(true);

    try {
      const result = await verifySignInCode(email, otp);
      await onSignedIn(result.token, result.user);
    } catch (nextError) {
      setError(getAuthErrorMessage(nextError));
    } finally {
      setIsPending(false);
    }
  }

  return (
    <ScreenFrame>
      <SafeAreaView className="flex-1">
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          className="flex-1"
        >
          <ScrollView
            className="flex-1"
            contentContainerClassName="w-full flex-grow justify-center gap-8 px-5 py-8"
            keyboardShouldPersistTaps="handled"
          >
            <View className="gap-5">
              <BrandMark />
              <View className="gap-3">
                <Text className="min-w-0 shrink text-[34px] font-semibold leading-10 text-[#17211C]">Save your setup.</Text>
                <Text className="min-w-0 shrink text-[16px] leading-7 text-[#56635C]">
                  Use the same 6-digit email code as web. Your onboarding answers attach to your private profile after sign-in.
                </Text>
              </View>
              {notice ? <Notice message={notice} /> : null}
              {!onboardingReady ? (
                <InlineError message="Finish onboarding on this device before signing in." />
              ) : null}
            </View>

            {step === "email" ? (
              <View className="gap-5">
                <Field label="Email" required>
                  <TextInput
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete="email"
                    keyboardType="email-address"
                    placeholder="you@example.com"
                    placeholderTextColor="#9BA59E"
                    className="h-14 flex-1 rounded-2xl border border-[#D7DDD4] bg-white px-4 text-[16px] text-[#17211C]"
                  />
                </Field>
                {error ? <InlineError message={error} /> : null}
                <PrimaryButton
                  label={isPending ? "Sending code..." : "Send sign-in code"}
                  onPress={handleSendCode}
                  disabled={isPending || !onboardingReady}
                />
              </View>
            ) : (
              <View className="gap-5">
                <Field label="6-digit code" required>
                  <TextInput
                    value={otp}
                    onChangeText={(value) => setOtp(value.replace(/\D/g, "").slice(0, 6))}
                    autoComplete="one-time-code"
                    keyboardType="number-pad"
                    maxLength={6}
                    placeholder="000000"
                    placeholderTextColor="#AAB3AD"
                    className="h-16 flex-1 rounded-2xl border border-[#D7DDD4] bg-white px-4 text-center text-[24px] font-semibold tracking-[8px] text-[#17211C]"
                  />
                </Field>
                <Text className="text-[13px] leading-5 text-[#69746E]">Sent to {email}. Codes expire after 5 minutes.</Text>
                {error ? <InlineError message={error} /> : null}
                <PrimaryButton
                  label={isPending ? "Checking code..." : "Sign in"}
                  onPress={handleVerifyCode}
                  disabled={isPending || !onboardingReady}
                />
                <View className="flex-row justify-between gap-3">
                  <TextButton
                    label="Change email"
                    onPress={() => {
                      setStep("email");
                      setOtp("");
                      setError(null);
                    }}
                  />
                  <TextButton label="Send new code" onPress={handleSendCode} disabled={isPending} />
                </View>
              </View>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ScreenFrame>
  );
}

function HomeScreen({
  notice,
  onboarding,
  session,
  onSignOut,
}: {
  notice: string | null;
  onboarding: OnboardingAnswers | null;
  session: AuthSession | null;
  onSignOut: () => Promise<void>;
}) {
  const email = session?.user.email ?? "Signed in";

  return (
    <ScreenFrame>
      <SafeAreaView className="flex-1">
        <ScrollView className="flex-1" contentContainerClassName="w-full gap-6 px-5 py-6">
          <View className="flex-row items-center justify-between">
            <BrandMark />
            <Pressable
              accessibilityRole="button"
              onPress={onSignOut}
              className="rounded-full border border-[#D7DDD4] bg-white px-4 py-2"
            >
              <Text className="text-[13px] font-semibold text-[#44534B]">Sign out</Text>
            </Pressable>
          </View>

          {notice ? <Notice message={notice} /> : null}

          <View className="gap-3">
            <Text className="min-w-0 shrink text-[34px] font-semibold leading-10 text-[#17211C]">Home is ready.</Text>
            <Text className="min-w-0 shrink text-[16px] leading-7 text-[#56635C]">
              {email} is signed in. This screen is intentionally simple while the mobile foundations are tested.
            </Text>
          </View>

          <View className="gap-3">
            <MetricCard label="Auth" value="Email code session" detail="Stored securely on this device until you sign out." />
            <MetricCard
              label="Onboarding"
              value={onboarding ? "Completed" : "Pending"}
              detail={onboarding ? "Saved locally and synced to your profile." : "Finish setup before using the tracker."}
            />
            <MetricCard
              label="Default targets"
              value="Calories, protein, fibre, fat"
              detail="Carbs stay secondary in the default product narrative."
            />
          </View>

          {onboarding ? (
            <View className="gap-3 rounded-3xl border border-[#DCE2DA] bg-white px-4 py-5">
              <Text className="text-[13px] font-semibold uppercase tracking-[1.4px] text-[#6B756F]">Setup snapshot</Text>
              <View className="flex-row flex-wrap gap-2">
                <SummaryPill label={`${onboarding.body.currentWeightKg}kg current`} />
                <SummaryPill label={formatGoalSummary(onboarding)} />
                <SummaryPill label={formatActivityLevel(onboarding.routine.activityLevel)} />
                <SummaryPill label={onboarding.cycle.consent ? "Cycle context on" : "Cycle context off"} />
              </View>
            </View>
          ) : null}
        </ScrollView>
      </SafeAreaView>
    </ScreenFrame>
  );
}

function ScreenFrame({ children }: { children: ReactNode }) {
  return <View className="w-full flex-1 overflow-hidden bg-[#F7F7F2]">{children}</View>;
}

function BrandMark() {
  return (
    <View className="flex-row items-center gap-2.5">
      <View className="h-8 w-8 rounded-full bg-[#E79B72]" />
      <Text className="text-[28px] font-semibold text-[#17211C]">Pippa</Text>
    </View>
  );
}

function StepBlock({
  eyebrow,
  title,
  body,
  children,
}: {
  eyebrow: string;
  title: string;
  body: string;
  children: ReactNode;
}) {
  return (
    <View className="min-w-0 w-full gap-6">
      <View className="min-w-0 gap-3">
        <Text className="text-[13px] font-semibold uppercase tracking-[1.6px] text-[#6B756F]">{eyebrow}</Text>
        <Text className="min-w-0 shrink text-[30px] font-semibold leading-9 text-[#17211C]">{title}</Text>
        <Text className="min-w-0 shrink text-[16px] leading-7 text-[#56635C]">{body}</Text>
      </View>
      <View className="gap-5">{children}</View>
    </View>
  );
}

function Field({
  label,
  suffix,
  required,
  compact,
  children,
}: {
  label: string;
  suffix?: string;
  required?: boolean;
  compact?: boolean;
  children: ReactNode;
}) {
  return (
    <View className={`gap-2 ${compact ? "flex-1" : "w-full"}`}>
      <View className="flex-row items-center justify-between gap-3">
        <Text className="text-[13px] font-semibold uppercase tracking-[1.4px] text-[#6B756F]">
          {label}
          {required ? " *" : ""}
        </Text>
        {suffix ? <Text className="text-[12px] font-medium text-[#7A837D]">{suffix}</Text> : null}
      </View>
      {children}
    </View>
  );
}

function ChoiceButton({
  label,
  detail,
  selected,
  onPress,
}: {
  label: string;
  detail: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      className={`min-w-0 w-full rounded-3xl border px-4 py-4 ${
        selected ? "border-[#45685A] bg-[#E8EFE8]" : "border-[#DCE2DA] bg-white"
      }`}
    >
      <Text className="min-w-0 shrink text-[16px] font-semibold text-[#17211C]">{label}</Text>
      <Text className="mt-1 min-w-0 shrink text-[14px] leading-5 text-[#5A665F]">{detail}</Text>
    </Pressable>
  );
}

function Chip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      className={`rounded-full border px-4 py-2.5 ${
        selected ? "border-[#45685A] bg-[#45685A]" : "border-[#D7DDD4] bg-white"
      }`}
    >
      <Text className={`text-[13px] font-semibold ${selected ? "text-white" : "text-[#46524B]"}`}>{label}</Text>
    </Pressable>
  );
}

function NumberStepper({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <View className="w-full flex-row items-center justify-between rounded-3xl border border-[#DCE2DA] bg-white px-4 py-3">
      <Text className="text-[15px] font-semibold text-[#17211C]">{label}</Text>
      <View className="flex-row items-center gap-3">
        <RoundButton label="-" onPress={() => onChange(Math.max(0, value - 1))} disabled={value <= 0} />
        <Text className="w-8 text-center text-[18px] font-semibold text-[#17211C]">{value}</Text>
        <RoundButton label="+" onPress={() => onChange(Math.min(14, value + 1))} />
      </View>
    </View>
  );
}

function RoundButton({
  label,
  onPress,
  disabled,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled}
      className={`h-10 w-10 items-center justify-center rounded-full ${disabled ? "bg-[#EEF1EB]" : "bg-[#45685A]"}`}
    >
      <Text className={`text-[20px] font-semibold ${disabled ? "text-[#9BA59E]" : "text-white"}`}>{label}</Text>
    </Pressable>
  );
}

function PrimaryButton({
  label,
  onPress,
  disabled,
}: {
  label: string;
  onPress: () => void | Promise<void>;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled}
      className={`h-14 items-center justify-center rounded-2xl ${disabled ? "bg-[#AAB3AD]" : "bg-[#17211C]"}`}
    >
      <Text className="text-[15px] font-semibold text-white">{label}</Text>
    </Pressable>
  );
}

function SecondaryButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      className="h-12 items-center justify-center rounded-2xl border border-[#D7DDD4] bg-white"
    >
      <Text className="text-[15px] font-semibold text-[#44534B]">{label}</Text>
    </Pressable>
  );
}

function TextButton({
  label,
  onPress,
  disabled,
}: {
  label: string;
  onPress: () => void | Promise<void>;
  disabled?: boolean;
}) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} disabled={disabled} className="py-2">
      <Text className={`text-[13px] font-semibold ${disabled ? "text-[#AAB3AD]" : "text-[#45685A]"}`}>{label}</Text>
    </Pressable>
  );
}

function InfoRow({ title, body }: { title: string; body: string }) {
  return (
    <View className="min-w-0 w-full rounded-3xl border border-[#DCE2DA] bg-white px-4 py-4">
      <Text className="min-w-0 shrink text-[15px] font-semibold text-[#17211C]">{title}</Text>
      <Text className="mt-1 min-w-0 shrink text-[14px] leading-6 text-[#5A665F]">{body}</Text>
    </View>
  );
}

function MetricCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <View className="min-w-0 w-full rounded-3xl border border-[#DCE2DA] bg-white px-4 py-4">
      <Text className="text-[12px] font-semibold uppercase tracking-[1.4px] text-[#6B756F]">{label}</Text>
      <Text className="mt-2 min-w-0 shrink text-[18px] font-semibold text-[#17211C]">{value}</Text>
      <Text className="mt-1 min-w-0 shrink text-[14px] leading-6 text-[#5A665F]">{detail}</Text>
    </View>
  );
}

function SummaryPill({ label }: { label: string }) {
  return (
    <View className="rounded-full bg-[#EEF1EB] px-3 py-2">
      <Text className="text-[12px] font-semibold text-[#46524B]">{label}</Text>
    </View>
  );
}

function InlineError({ message }: { message: string }) {
  return (
    <View className="rounded-2xl border border-[#E8B7A2] bg-[#FFF0E8] px-4 py-3">
      <Text className="text-[13px] leading-5 text-[#8B3F2A]">{message}</Text>
    </View>
  );
}

function Notice({ message }: { message: string }) {
  return (
    <View className="rounded-2xl border border-[#C8D8E7] bg-[#EEF6FB] px-4 py-3">
      <Text className="text-[13px] leading-5 text-[#31556B]">{message}</Text>
    </View>
  );
}

function buildOnboardingAnswers(draft: OnboardingDraft): OnboardingAnswers {
  return {
    schemaVersion: onboardingSchemaVersion,
    completedAt: new Date().toISOString(),
    goal: {
      direction: draft.goalDirection,
      intensity: draft.goalIntensity,
      goalWeightKg: parseOptionalNumber(draft.goalWeightKg),
    },
    body: {
      currentWeightKg: parseRequiredNumber(draft.currentWeightKg),
      heightCm: parseOptionalNumber(draft.heightCm),
      ageRange: draft.ageRange,
    },
    routine: {
      activityLevel: draft.activityLevel,
      cardioSessionsPerWeek: draft.cardioSessionsPerWeek,
      strengthSessionsPerWeek: draft.strengthSessionsPerWeek,
    },
    cycle: {
      consent: draft.cycleConsent === true,
      lastPeriodStartOn: draft.cycleConsent ? draft.lastPeriodStartOn.trim() : null,
      averageCycleLengthDays: draft.cycleConsent ? parseOptionalInteger(draft.averageCycleLengthDays) : null,
      periodLengthDays: draft.cycleConsent ? parseOptionalInteger(draft.periodLengthDays) : null,
      regularity: draft.cycleConsent ? draft.regularity : "unknown",
    },
    preferences: {
      calorieVisibility: draft.calorieVisibility,
    },
  };
}

function getStepIsValid(step: number, draft: OnboardingDraft) {
  if (step === 2) {
    const currentWeight = parseOptionalNumber(draft.currentWeightKg);
    return currentWeight !== null && currentWeight >= 30 && currentWeight <= 300;
  }

  if (step === 4) {
    if (draft.cycleConsent === null) {
      return false;
    }

    if (!draft.cycleConsent) {
      return true;
    }

    const averageCycleLengthDays = parseOptionalInteger(draft.averageCycleLengthDays);
    const periodLengthDays = parseOptionalInteger(draft.periodLengthDays);

    return (
      /^\d{4}-\d{2}-\d{2}$/.test(draft.lastPeriodStartOn.trim()) &&
      averageCycleLengthDays !== null &&
      averageCycleLengthDays >= 21 &&
      averageCycleLengthDays <= 45 &&
      periodLengthDays !== null &&
      periodLengthDays >= 2 &&
      periodLengthDays <= 10
    );
  }

  return true;
}

function getStepError(step: number) {
  if (step === 2) {
    return "Enter a current weight between 30kg and 300kg.";
  }

  if (step === 4) {
    return "Choose whether to add cycle context. If yes, add a valid date and typical lengths.";
  }

  return "Check your answers before continuing.";
}

function parseRequiredNumber(value: string) {
  return Number(value.replace(",", "."));
}

function parseOptionalNumber(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  const parsed = Number(trimmed.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

function parseOptionalInteger(value: string) {
  const parsed = parseOptionalNumber(value);
  return parsed === null || !Number.isInteger(parsed) ? null : parsed;
}

function formatAgeRange(ageRange: AgeRange) {
  switch (ageRange) {
    case "under_18":
      return "Under 18";
    case "18_24":
      return "18-24";
    case "25_34":
      return "25-34";
    case "35_44":
      return "35-44";
    case "45_54":
      return "45-54";
    case "55_plus":
      return "55+";
    case "prefer_not_to_say":
      return "Prefer not to say";
  }
}

function formatActivityLevel(activityLevel: ActivityLevel) {
  switch (activityLevel) {
    case "low":
      return "Mostly seated";
    case "light":
      return "Lightly active";
    case "moderate":
      return "Moderately active";
    case "high":
      return "Very active";
  }
}

function getActivityDetail(activityLevel: ActivityLevel) {
  switch (activityLevel) {
    case "low":
      return "Desk-heavy days with low step count.";
    case "light":
      return "Some walking or light training most weeks.";
    case "moderate":
      return "Regular movement and planned sessions.";
    case "high":
      return "Training or active work shapes most days.";
  }
}

function formatRegularity(regularity: CycleRegularity) {
  switch (regularity) {
    case "regular":
      return "Regular";
    case "irregular":
      return "Irregular";
    case "unknown":
      return "Not sure";
  }
}

function formatCalorieVisibility(calorieVisibility: CalorieVisibilityMode) {
  switch (calorieVisibility) {
    case "visible":
      return "Show calories";
    case "reduced":
      return "Softer numbers";
    case "hidden":
      return "Hide calories";
  }
}

function getCalorieVisibilityDetail(calorieVisibility: CalorieVisibilityMode) {
  switch (calorieVisibility) {
    case "visible":
      return "Use calorie ranges alongside protein, fibre and fat.";
    case "reduced":
      return "Keep guidance visible with less number-heavy emphasis.";
    case "hidden":
      return "Lean on protein, fibre and consistency first.";
  }
}

function formatGoalSummary(onboarding: OnboardingAnswers) {
  if (onboarding.goal.goalWeightKg) {
    return `${onboarding.goal.goalWeightKg}kg goal`;
  }

  if (onboarding.goal.direction === "lose") {
    return "Steady loss";
  }

  return onboarding.goal.direction === "maintain" ? "Maintain" : "Gain";
}

function getAuthErrorMessage(error: unknown) {
  if (error instanceof PippaApiError) {
    switch (error.code) {
      case "INVALID_OTP":
        return "That code is not right. Check the email and try again.";
      case "OTP_EXPIRED":
        return "That code expired. Send a fresh one and try again.";
      case "TOO_MANY_ATTEMPTS":
        return "Too many tries. Send a new code before trying again.";
      default:
        return error.message;
    }
  }

  return "That did not work. Please try again.";
}

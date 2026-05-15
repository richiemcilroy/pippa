import { Effect } from "effect";
import { Resend } from "resend";

import { getResendApiKey } from "./env";

const fromAddress = "Pippa <sign-in@auth.pippa.health>";

let resend: Resend | undefined;

function getResend() {
  resend ??= new Resend(getResendApiKey());
  return resend;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function purposeForType(type: "sign-in" | "email-verification" | "forget-password" | "change-email") {
  switch (type) {
    case "email-verification":
      return "email verification";
    case "forget-password":
      return "password reset";
    case "change-email":
      return "email change";
    case "sign-in":
      return "sign-in";
  }
}

export function sendAuthCodeEmail(input: {
  email: string;
  otp: string;
  type: "sign-in" | "email-verification" | "forget-password" | "change-email";
}) {
  const purpose = purposeForType(input.type);
  const safeOtp = escapeHtml(input.otp);
  const text = `Your Pippa ${purpose} code is ${input.otp}. It expires in 5 minutes. If you did not request this, you can ignore this email.`;

  return Effect.runPromise(
    Effect.tryPromise({
      try: async () => {
        const result = await getResend().emails.send({
          from: fromAddress,
          to: input.email,
          subject: "Your Pippa sign-in code",
          text,
          html: `
            <div style="font-family: Inter, Arial, sans-serif; color: #17211d; line-height: 1.5; max-width: 520px;">
              <p style="font-size: 15px;">Use this code to sign in to Pippa:</p>
              <p style="font-size: 32px; font-weight: 700; margin: 24px 0;">${safeOtp}</p>
              <p style="font-size: 14px; color: #5f6f68;">This code expires in 5 minutes. If you did not request it, you can ignore this email.</p>
            </div>
          `,
        });

        if (result.error) {
          throw result.error;
        }
      },
      catch: (error) => new Error("Failed to send auth code email.", { cause: error }),
    }),
  );
}

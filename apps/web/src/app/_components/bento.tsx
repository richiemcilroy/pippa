import type { ReactNode } from "react";

import LoggingVisual from "./visuals/logging-visual";
import CycleVisual from "./visuals/cycle-visual";
import TargetsVisual from "./visuals/targets-visual";
import VoiceVisual from "./visuals/voice-visual";
import ShareVisual from "./visuals/share-visual";
import PrivateVisual from "./visuals/private-visual";

type BentoCardProps = {
  eyebrow: string;
  title: string;
  body: string;
  className?: string;
  visual: ReactNode;
};

function BentoCard({ eyebrow, title, body, className, visual }: BentoCardProps) {
  return (
    <article
      className={[
        "pippa-anim group relative flex flex-col overflow-hidden rounded-3xl border border-line/80 bg-surface/85 p-7 shadow-[0_1px_0_rgba(28,33,30,0.04),0_18px_40px_-28px_rgba(28,33,30,0.18)] backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_1px_0_rgba(28,33,30,0.06),0_28px_60px_-32px_rgba(28,33,30,0.22)]",
        className ?? "",
      ].join(" ")}
    >
      <div className="relative isolate flex min-h-[200px] items-center justify-center overflow-hidden rounded-2xl">
        {visual}
      </div>
      <div className="mt-6 flex flex-col gap-2">
        <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted/80">
          {eyebrow}
        </span>
        <h3 className="serif-display text-2xl text-foreground sm:text-[26px]">{title}</h3>
        <p className="text-[15px] leading-7 text-muted-strong">{body}</p>
      </div>
    </article>
  );
}

export function Bento() {
  return (
    <section className="mx-auto w-full max-w-6xl px-5 sm:px-8">
      <div className="mx-auto mb-12 max-w-2xl text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-line bg-surface/70 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.16em] text-muted">
          <span className="h-1.5 w-1.5 rounded-full bg-accent" />
          what pippa actually does
        </span>
        <h2 className="serif-display mt-5 text-4xl text-foreground sm:text-5xl">
          Six small ideas, all <em className="font-serif italic text-accent">on your side.</em>
        </h2>
        <p className="mt-4 text-[16px] leading-7 text-muted-strong">
          Tracking that finally feels like paying attention to yourself, not
          punishing yourself for being human.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-5">
        <BentoCard
          eyebrow="track easily"
          title="Effortless food logging"
          body="Barcode, photo, label, text, or voice. Log roughly now, refine when you have a second. Saved meals remember what you eat most."
          className="md:col-span-2"
          visual={<LoggingVisual />}
        />
        <BentoCard
          eyebrow="cycle aware"
          title="Context, not prescriptions"
          body="Pippa uses words like likely and may. It explains your week, never claims to know your hormones."
          visual={<CycleVisual />}
        />
        <BentoCard
          eyebrow="targets"
          title="Calories, protein, fibre, fat"
          body="A daily target with a flexible range. Protein and fibre as anchors so eating enough feels like a win."
          visual={<TargetsVisual />}
        />
        <BentoCard
          eyebrow="for women"
          title="Built for the actual life you live"
          body="Work weeks, social meals, low-energy days, hormonal weeks. Female-aware copy, no shame language, no guilt-free."
          className="md:col-span-2"
          visual={<VoiceVisual />}
        />
        <BentoCard
          eyebrow="share when you choose"
          title="Beautiful cards, on your terms"
          body="Streaks, protein wins, weekly progress. Calories hidden by default. You pick what shows up on the card."
          className="md:col-span-2"
          visual={<ShareVisual />}
        />
        <BentoCard
          eyebrow="trust"
          title="Private by default"
          body="Health, cycle, food and weight stay yours. Community is opt-in, ads and broad analytics never touch sensitive data."
          visual={<PrivateVisual />}
        />
      </div>
    </section>
  );
}

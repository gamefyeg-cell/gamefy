"use client";

import { useEffect, useState, type RefObject } from "react";

/* Small shared pieces for the admin step-forms (ProductWizard, VariantForm). */

/** The ⓘ next to a field label — hover or keyboard-focus for an explanation. */
export function Info({ text }: { text: string }) {
  return (
    <span className="a-tip" tabIndex={0} role="note" aria-label={text}>
      i
      <span className="a-tip-bubble" role="tooltip">
        {text}
      </span>
    </span>
  );
}

/** A step's heading — a short question + one calm line of context. */
export function StepHead({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="a-step-head">
      <h3>{title}</h3>
      <p>{children}</p>
    </div>
  );
}

/** Label (+ required marker + optional ⓘ) above a control. */
export function Field({
  label,
  tip,
  hint,
  required,
  children,
  full,
}: {
  label: string;
  /** Optional ⓘ explainer shown on hover/focus. */
  tip?: string;
  /** Optional quiet one-liner shown under the control. */
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
  full?: boolean;
}) {
  return (
    <div className={full ? "sm:col-span-2" : undefined}>
      <span className="a-label flex items-center gap-1.5">
        {label}
        {required && <span className="a-req">*</span>}
        {tip && <Info text={tip} />}
      </span>
      {children}
      {hint && <span className="a-hint block">{hint}</span>}
    </div>
  );
}

/** Calm progress: a thin bar + a quiet row of step names (visited ones
 *  clickable). Less visual noise than a row of chip buttons. */
export function WizardProgress({
  labels,
  step,
  maxVisited,
  onJump,
}: {
  labels: string[];
  step: number;
  maxVisited: number;
  onJump: (i: number) => void;
}) {
  return (
    <div>
      <div className="a-progress" aria-hidden="true">
        <i style={{ width: `${((step + 1) / labels.length) * 100}%` }} />
      </div>
      <div className="a-progress-steps">
        {labels.map((l, i) => (
          <button
            type="button"
            key={i}
            disabled={i > maxVisited}
            aria-current={i === step ? "step" : undefined}
            onClick={() => onJump(i)}
            className={i === step ? "is-current" : ""}
          >
            {l}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Clickable step chips. `labels[i]` is shown for `stepKeys[i]`. */
export function Stepper({
  stepKeys,
  labels,
  step,
  maxVisited,
  onJump,
}: {
  stepKeys: string[];
  labels: string[];
  step: number;
  maxVisited: number;
  onJump: (i: number) => void;
}) {
  return (
    <div className="a-steps">
      {stepKeys.map((k, i) => (
        <button
          type="button"
          key={k}
          disabled={i > maxVisited}
          onClick={() => onJump(i)}
          className={`a-step ${i === step ? "is-active" : i < step ? "is-done" : ""}`}
        >
          <span className="n">{i < step ? "✓" : i + 1}</span>
          {labels[i]}
        </button>
      ))}
    </div>
  );
}

/** Back / Next — or Back / submit on the last step. */
export function WizardNav({
  step,
  isLast,
  submitLabel,
  onBack,
  onNext,
}: {
  step: number;
  isLast: boolean;
  submitLabel: string;
  onBack: () => void;
  onNext: () => void;
}) {
  return (
    <div className="a-wizard-nav">
      <button type="button" className="a-btn a-btn-ghost" onClick={onBack} disabled={step === 0}>
        ← Back
      </button>
      {isLast ? (
        <button type="submit" className="a-btn a-btn-primary">
          {submitLabel}
        </button>
      ) : (
        <button type="button" className="a-btn a-btn-primary" onClick={onNext}>
          Next →
        </button>
      )}
    </div>
  );
}

/**
 * Step navigation over a `<form>` whose step panels are wrapped in
 * `<div data-stepkey="…" hidden={…}>`. Next is gated on the current panel's
 * native constraint validity; submit is backstopped the same way.
 */
export function useStepper(formRef: RefObject<HTMLFormElement | null>, stepKeys: string[]) {
  const [step, setStep] = useState(0);
  const [maxVisited, setMaxVisited] = useState(0);

  const safeStep = Math.min(step, stepKeys.length - 1);
  const currentKey = stepKeys[safeStep];

  useEffect(() => {
    if (step > stepKeys.length - 1) setStep(stepKeys.length - 1);
  }, [stepKeys.length, step]);

  const scrollUp = () => formRef.current?.scrollIntoView({ block: "start", behavior: "smooth" });

  const currentValid = () => {
    const root = formRef.current?.querySelector(`[data-stepkey="${currentKey}"]`);
    const bad = root?.querySelector(":invalid") as HTMLInputElement | HTMLSelectElement | null;
    if (bad) {
      bad.reportValidity?.();
      return false;
    }
    return true;
  };

  const next = () => {
    if (!currentValid()) return;
    const n = Math.min(safeStep + 1, stepKeys.length - 1);
    setStep(n);
    setMaxVisited((m) => Math.max(m, n));
    scrollUp();
  };
  const back = () => {
    setStep(Math.max(0, safeStep - 1));
    scrollUp();
  };
  const jump = (i: number) => {
    if (i <= maxVisited) {
      setStep(i);
      scrollUp();
    }
  };
  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    const bad = formRef.current?.querySelector(":invalid") as HTMLElement | null;
    if (!bad) return;
    e.preventDefault();
    const key = bad.closest("[data-stepkey]")?.getAttribute("data-stepkey");
    const idx = key ? stepKeys.indexOf(key) : -1;
    if (idx >= 0) {
      setStep(idx);
      setMaxVisited((m) => Math.max(m, idx));
      setTimeout(() => (bad as HTMLInputElement).reportValidity?.(), 60);
    }
  };

  return {
    step: safeStep,
    currentKey,
    maxVisited,
    isLast: safeStep === stepKeys.length - 1,
    next,
    back,
    jump,
    onSubmit,
  };
}

"use client";

import { useId, useState, useTransition, type ReactNode } from "react";
import {
  AdminCheckboxField,
  AdminTextareaField,
  AdminTextField,
} from "@/components/admin/form-fields";
import {
  RepeatableList,
  TextInput,
} from "@/components/admin/block-editor/fields";
import { useSaveToast } from "@/components/admin/use-save-toast";
import { Button } from "@/components/ui/button";
import type { ActionResult } from "@/lib/form-errors";
import {
  saveEmailsAction,
  saveQuizAction,
  saveSafeguardingAction,
  saveWhatsappAction,
} from "./actions";

type Errors = Record<string, string>;

/** One settings section: a form that saves on its own, with field errors. */
function useSection(save: () => Promise<ActionResult>, success: string) {
  const toastSave = useSaveToast();
  const [errors, setErrors] = useState<Errors>({});
  const [pending, startTransition] = useTransition();
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    startTransition(async () => {
      const result = await toastSave(save, { success });
      setErrors(
        !result.ok && "fieldErrors" in result ? (result.fieldErrors ?? {}) : {},
      );
    });
  };
  return { errors, pending, submit };
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: ReactNode;
  children: ReactNode;
}) {
  const id = useId();
  return (
    <section
      aria-labelledby={id}
      className="flex flex-col gap-4 rounded-md border border-surface-2 bg-surface p-5"
    >
      <div className="flex flex-col gap-1">
        <h2 id={id} className="text-h3">
          {title}
        </h2>
        {description && <p className="text-small text-muted">{description}</p>}
      </div>
      {children}
    </section>
  );
}

const optional = (value: string) => value.trim() || undefined;

export type Contact = { label: string; name: string; phone?: string };

export function SafeguardingSettingsForm({
  initial,
}: {
  initial: { email: string; contacts: Contact[]; incidentFormUrl: string };
}) {
  const [values, setValues] = useState(initial);
  const { errors, pending, submit } = useSection(
    () => saveSafeguardingAction(values),
    "Safeguarding saved",
  );
  return (
    <Section
      title="Safeguarding"
      description="Shown in the Safeguarding module wherever a contact or link block uses these settings."
    >
      <form onSubmit={submit} noValidate className="flex flex-col gap-4">
        <AdminTextField
          label="Safeguarding email"
          type="email"
          value={values.email}
          onChange={(e) => setValues({ ...values, email: e.target.value })}
          error={errors.email}
        />
        <RepeatableList
          legend="Contacts"
          itemLabel="Contact"
          items={values.contacts}
          onChange={(contacts) => setValues({ ...values, contacts })}
          create={() => ({ label: "", name: "" })}
          error={errors.contacts}
          render={(c, update, i) => (
            <>
              <TextInput
                label="Role"
                value={c.label}
                onChange={(label) => update({ ...c, label })}
                error={errors[`contacts.${i}.label`]}
              />
              <TextInput
                label="Name"
                value={c.name}
                onChange={(name) => update({ ...c, name })}
                error={errors[`contacts.${i}.name`]}
              />
              <TextInput
                label="Phone (optional)"
                value={c.phone}
                onChange={(phone) => update({ ...c, phone: optional(phone) })}
                error={errors[`contacts.${i}.phone`]}
              />
            </>
          )}
        />
        <AdminTextField
          label="Incident report form link"
          value={values.incidentFormUrl}
          onChange={(e) =>
            setValues({ ...values, incidentFormUrl: e.target.value })
          }
          error={errors.incidentFormUrl}
        />
        <Button
          type="submit"
          size="sm"
          loading={pending}
          className="self-start"
        >
          Save safeguarding
        </Button>
      </form>
    </Section>
  );
}

export function LinksSettingsForm({ initial }: { initial: string }) {
  const [whatsappUrl, setWhatsappUrl] = useState(initial);
  const { errors, pending, submit } = useSection(
    () => saveWhatsappAction({ whatsappUrl: optional(whatsappUrl) }),
    whatsappUrl.trim() ? "WhatsApp link saved" : "WhatsApp link removed",
  );
  return (
    <Section
      title="Links"
      description="Leave empty to hide WhatsApp links and buttons everywhere."
    >
      <form onSubmit={submit} noValidate className="flex flex-col gap-4">
        <AdminTextField
          label="Volunteers' WhatsApp group link"
          placeholder="https://chat.whatsapp.com/…"
          value={whatsappUrl}
          onChange={(e) => setWhatsappUrl(e.target.value)}
          error={errors.whatsappUrl}
        />
        <Button
          type="submit"
          size="sm"
          loading={pending}
          className="self-start"
        >
          Save links
        </Button>
      </form>
    </Section>
  );
}

export function QuizSettingsForm({
  initial,
  bank,
}: {
  initial: { passMark: number; questionsPerAttempt: number };
  bank: { drawUnits: number; required: number };
}) {
  const [passMark, setPassMark] = useState(String(initial.passMark));
  const [perAttempt, setPerAttempt] = useState(
    String(initial.questionsPerAttempt),
  );
  const { errors, pending, submit } = useSection(
    () =>
      saveQuizAction({
        passMark: Number(passMark),
        questionsPerAttempt: Number(perAttempt),
      }),
    "Quiz settings saved",
  );
  const count = Number(perAttempt);
  const tooMany = Number.isFinite(count) && count > bank.drawUnits;
  const tooFew = Number.isFinite(count) && count < bank.required;
  return (
    <Section title="Final quiz">
      <form onSubmit={submit} noValidate className="flex flex-col gap-4">
        <AdminTextField
          label="Pass mark (%)"
          type="number"
          min={0}
          max={100}
          inputMode="numeric"
          value={passMark}
          onChange={(e) => setPassMark(e.target.value)}
          error={errors.passMark}
          className="max-w-40"
        />
        <AdminTextField
          label="Questions per attempt"
          type="number"
          min={1}
          inputMode="numeric"
          value={perAttempt}
          onChange={(e) => setPerAttempt(e.target.value)}
          error={errors.questionsPerAttempt}
          className="max-w-40"
        />
        <p
          role="status"
          className={
            tooMany || tooFew
              ? "text-small text-danger"
              : "text-small text-muted"
          }
        >
          {tooMany
            ? `Too many: the active question bank only has ${bank.drawUnits} different questions to draw from.`
            : tooFew
              ? `Too few: ${bank.required} questions are required in every attempt.`
              : `The active question bank has ${bank.drawUnits} different questions to draw from${bank.required ? `, ${bank.required} required in every attempt` : ""}.`}
        </p>
        <Button
          type="submit"
          size="sm"
          loading={pending}
          disabled={tooMany || tooFew}
          className="self-start"
        >
          Save quiz settings
        </Button>
      </form>
    </Section>
  );
}

export function EmailSettingsForm({
  initial,
  envDigestCount,
}: {
  initial: { remindersEnabled: boolean; digestRecipients: string[] };
  /** How many addresses ADMIN_DIGEST_TO has, for the hint. */
  envDigestCount: number;
}) {
  const [remindersEnabled, setRemindersEnabled] = useState(
    initial.remindersEnabled,
  );
  const [recipients, setRecipients] = useState(
    initial.digestRecipients.join("\n"),
  );
  const list = recipients
    .split(/[\n,]/)
    .map((r) => r.trim())
    .filter(Boolean);
  const { errors, pending, submit } = useSection(
    () => saveEmailsAction({ remindersEnabled, digestRecipients: list }),
    "Email settings saved",
  );
  const recipientError = Object.entries(errors).find(([k]) =>
    k.startsWith("digestRecipients"),
  )?.[1];
  return (
    <Section title="Emails">
      <form onSubmit={submit} noValidate className="flex flex-col gap-4">
        <AdminCheckboxField
          label="Send reminder emails"
          hint="Volunteers who pause get a reminder after a week, and once more after three. Turning this off stops them for everyone; each volunteer can also turn them off themselves."
          checked={remindersEnabled}
          onChange={(e) => setRemindersEnabled(e.target.checked)}
        />
        <AdminTextareaField
          label="Admin digest recipients"
          hint={
            envDigestCount > 0
              ? `One email address per line. Leave empty to use the ${envDigestCount} address${envDigestCount === 1 ? "" : "es"} in ADMIN_DIGEST_TO.`
              : "One email address per line."
          }
          rows={3}
          value={recipients}
          onChange={(e) => setRecipients(e.target.value)}
          error={recipientError}
        />
        <Button
          type="submit"
          size="sm"
          loading={pending}
          className="self-start"
        >
          Save email settings
        </Button>
      </form>
    </Section>
  );
}

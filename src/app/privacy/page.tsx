import type { Metadata } from "next";
import type { ReactNode } from "react";
import { PillTag } from "@/components/ui/pill-tag";

export const metadata: Metadata = { title: "Privacy notice" };

// DRAFT: every section below is placeholder wording for KC to review.
const CONTACT_EMAIL = "privacy@example.org"; // placeholder

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-h3">{title}</h2>
      <div className="flex flex-col gap-3 text-body text-muted [&_strong]:text-text">
        {children}
      </div>
    </section>
  );
}

export default function PrivacyPage() {
  return (
    <main className="mx-auto flex w-full max-w-[760px] flex-1 flex-col gap-10 px-gutter py-16">
      <div className="flex flex-col gap-4">
        <PillTag>Privacy</PillTag>
        <h1 className="text-h1">Privacy notice</h1>
        <p
          role="note"
          className="rounded-md border-2 border-dashed border-lime bg-lime/10 p-4 text-body text-text"
        >
          <strong className="text-lime">Draft, to be reviewed by KC.</strong>{" "}
          This notice is placeholder wording and isn&apos;t final yet.
        </p>
      </div>

      <Section title="Who we are">
        <p>
          This volunteer training site is run by{" "}
          <strong>Kingdom Culture</strong>, part of{" "}
          <strong>Jubilee Church Manchester (RCCG)</strong>. We are the
          controller of the personal data described here.
        </p>
      </Section>

      <Section title="What we collect">
        <ul className="list-disc space-y-1 pl-5">
          <li>Your name and email address</li>
          <li>The branch and team you&apos;re interested in</li>
          <li>Your training progress through each module</li>
          <li>Your answers to reflection questions in the course</li>
          <li>
            The emails we send you (a welcome, reminders if you pause your
            training, which you can turn off, and your certificate)
          </li>
          <li>Your quiz results and any certificates you earn</li>
        </ul>
      </Section>

      <Section title="Why we collect it">
        <p>
          To train and onboard you as a KC volunteer: to show your progress,
          check you&apos;ve completed the required training (including
          safeguarding), and connect you with the right team. We rely on your
          consent, which you give when you set up your profile.
        </p>
      </Section>

      <Section title="How long we keep it">
        <p>
          Until you ask us to delete it, or <strong>2 years</strong> after your
          last activity on the site, whichever comes first.{" "}
          <em>(Placeholder period.)</em>
        </p>
      </Section>

      <Section title="Who can see it">
        <p>
          Only KC admins who run volunteer training. We don&apos;t sell your
          data or share it for marketing. It&apos;s stored securely with our
          hosting and database providers, who process it on our behalf.
        </p>
      </Section>

      <Section title="Your rights">
        <p>Under UK GDPR you have the right to:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <strong>Access</strong> your data: use “Download my data” on your{" "}
            <a
              href="/account"
              className="text-lime underline underline-offset-4"
            >
              account page
            </a>
          </li>
          <li>
            <strong>Correct</strong> it: edit your details on your account page
          </li>
          <li>
            <strong>Delete</strong> it: use “Delete my account” on your account
            page
          </li>
          <li>
            <strong>Withdraw consent</strong>, object to or restrict how we use
            it
          </li>
          <li>
            Complain to the Information Commissioner&apos;s Office (
            <a
              href="https://ico.org.uk/make-a-complaint/"
              className="text-lime underline underline-offset-4"
            >
              ico.org.uk
            </a>
            ) if you&apos;re unhappy with how we handle your data
          </li>
        </ul>
      </Section>

      <Section title="Contact us">
        <p>
          Questions or requests about your data: email{" "}
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="text-lime underline underline-offset-4"
          >
            {CONTACT_EMAIL}
          </a>{" "}
          <em>(placeholder address)</em>.
        </p>
      </Section>
    </main>
  );
}

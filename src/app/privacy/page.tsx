import type { Metadata } from "next";

export const metadata: Metadata = { title: "Privacy notice" };

// Placeholder: replace with KC's approved privacy notice before launch.
export default function PrivacyPage() {
  return (
    <main className="mx-auto flex w-full max-w-[760px] flex-1 flex-col gap-6 px-gutter py-16">
      <h1 className="text-h1">Privacy notice</h1>
      <p className="text-body-lg text-muted">
        KC&apos;s full privacy notice will be published here.
      </p>
      <div className="flex flex-col gap-4 text-body">
        <p>
          To run volunteer training, this site stores your name, email address,
          the branch and team you&apos;re interested in, and your training
          progress, quiz results and certificates.
        </p>
        <p>Questions about your data? Speak to the KC team.</p>
      </div>
    </main>
  );
}

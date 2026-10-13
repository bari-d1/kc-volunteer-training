import { Logo } from "@/components/ui/logo";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 bg-bg px-gutter text-center">
      <Logo priority className="h-24 md:h-32" />
      <h1 className="text-h1 text-lime">KC Volunteers&apos; Onboarding</h1>
    </main>
  );
}

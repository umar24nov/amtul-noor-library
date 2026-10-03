import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Brand } from "@/components/brand";
import { getSession } from "@/lib/auth";
import { LIBRARY_TAGLINE } from "@/lib/constants";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const session = await getSession();
  if (session) redirect("/dashboard");

  const { next } = await searchParams;

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-muted/40 px-4 py-10">
      <div className="w-full max-w-sm">
        {/* compact, because the motto is already shown in full underneath */}
        <Brand compact className="mb-6 justify-center" />

        <div className="rounded-xl border border-border bg-card p-5 shadow-sm sm:p-6">
          <h1 className="font-heading text-lg font-semibold tracking-tight">Sign in to manage the library</h1>
          <p className="mt-1 mb-5 text-sm text-muted-foreground">
            Member details are private. Please sign in to continue.
          </p>
          <LoginForm next={next} />
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">{LIBRARY_TAGLINE}</p>
      </div>
    </main>
  );
}
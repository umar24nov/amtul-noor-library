import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Brand } from "@/components/brand";
import { getSession } from "@/lib/auth";
import { LIBRARY_TAGLINE } from "@/lib/constants";
import { ForgotPasswordForm } from "./forgot-password-form";

export const metadata: Metadata = { title: "Reset password" };

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  if (await getSession()) redirect("/dashboard");

  const { next } = await searchParams;
  const backHref = next ? `/login?next=${encodeURIComponent(next)}` : "/login";

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-muted/40 px-4 py-10">
      <div className="w-full max-w-sm">
        <Brand compact className="mb-6 justify-center" />

        <div className="rounded-xl border border-border bg-card p-5 shadow-sm sm:p-6">
          <h1 className="font-heading text-lg font-semibold tracking-tight">Forgot your password?</h1>
          <p className="mt-1 mb-5 text-sm text-muted-foreground">
            Sign in with a code sent to your email, then choose a new password.
          </p>

          <ForgotPasswordForm next={next} />

          <Link
            href={backHref}
            className="mt-5 block text-center text-sm font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            Back to sign in
          </Link>
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">{LIBRARY_TAGLINE}</p>
      </div>
    </main>
  );
}

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { ProfileForm } from "@/components/profile-form";
import { getCurrentUser } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Profile",
};

/**
 * Your own account: your name, the email you sign in with, and your password.
 * Open to anyone who is signed in, whatever their role, since it only ever
 * touches the signed-in person's own row.
 */
export default async function ProfilePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div className="grid gap-6">
      <PageHeader
        title="My profile"
        description="Change your name, the email you sign in with, or your password."
      />
      <ProfileForm name={user.name ?? ""} email={user.email} />
    </div>
  );
}

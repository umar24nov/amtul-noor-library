"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/submit-button";
import { IDLE_STATE } from "@/lib/action-result";
import {
  changePasswordAction,
  updateProfileAction,
} from "@/app/(app)/profile/actions";

export function ProfileForm({ name, email }: { name: string; email: string }) {
  const [profileState, profileAction] = useActionState(updateProfileAction, IDLE_STATE);
  const [passwordState, passwordAction] = useActionState(changePasswordAction, IDLE_STATE);

  useEffect(() => {
    if (profileState.done) toast.success(profileState.message ?? "Saved.");
  }, [profileState]);

  useEffect(() => {
    if (passwordState.done) toast.success(passwordState.message ?? "Password changed.");
  }, [passwordState]);

  return (
    <div className="grid max-w-xl gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Your details</CardTitle>
          <CardDescription>
            This is the name shown on the account and the email you sign in with.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={profileAction} className="grid gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="profile-name">Name</Label>
              <Input
                id="profile-name"
                name="name"
                defaultValue={name}
                maxLength={60}
                aria-invalid={Boolean(profileState.fieldErrors?.name)}
              />
              {profileState.fieldErrors?.name && (
                <p className="text-xs text-destructive">{profileState.fieldErrors.name}</p>
              )}
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="profile-email">
                Email <span className="text-destructive">*</span>
              </Label>
              <Input
                id="profile-email"
                name="email"
                type="email"
                defaultValue={email}
                autoComplete="email"
                aria-invalid={Boolean(profileState.fieldErrors?.email)}
              />
              {profileState.fieldErrors?.email && (
                <p className="text-xs text-destructive">{profileState.fieldErrors.email}</p>
              )}
            </div>
            {profileState.status === "error" && profileState.message && (
              <p className="text-sm text-destructive">{profileState.message}</p>
            )}
            <div className="flex justify-end">
              <SubmitButton pendingLabel="Saving">Save details</SubmitButton>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Change password</CardTitle>
          <CardDescription>
            Enter your current password, then choose a new one of at least 8 characters.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={passwordAction} className="grid gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="current-password">
                Current password <span className="text-destructive">*</span>
              </Label>
              <Input
                id="current-password"
                name="currentPassword"
                type="password"
                autoComplete="current-password"
                aria-invalid={Boolean(passwordState.fieldErrors?.currentPassword)}
              />
              {passwordState.fieldErrors?.currentPassword && (
                <p className="text-xs text-destructive">
                  {passwordState.fieldErrors.currentPassword}
                </p>
              )}
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="new-password">
                New password <span className="text-destructive">*</span>
              </Label>
              <Input
                id="new-password"
                name="newPassword"
                type="password"
                autoComplete="new-password"
                aria-invalid={Boolean(passwordState.fieldErrors?.newPassword)}
              />
              {passwordState.fieldErrors?.newPassword && (
                <p className="text-xs text-destructive">{passwordState.fieldErrors.newPassword}</p>
              )}
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="confirm-password">
                Re-enter new password <span className="text-destructive">*</span>
              </Label>
              <Input
                id="confirm-password"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                aria-invalid={Boolean(passwordState.fieldErrors?.confirmPassword)}
              />
              {passwordState.fieldErrors?.confirmPassword && (
                <p className="text-xs text-destructive">
                  {passwordState.fieldErrors.confirmPassword}
                </p>
              )}
            </div>
            {passwordState.status === "error" && passwordState.message && (
              <p className="text-sm text-destructive">{passwordState.message}</p>
            )}
            <div className="flex justify-end">
              <SubmitButton pendingLabel="Changing">Change password</SubmitButton>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

"use client";

import { useEffect, useState, useActionState } from "react";
import { toast } from "sonner";
import { UserPlus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SubmitButton } from "@/components/submit-button";
import { IDLE_STATE, type ActionState } from "@/lib/action-result";
import {
  createUserAction,
  resetUserPasswordAction,
  toggleUserActiveAction,
  updateUserRoleAction,
} from "@/app/(app)/users/actions";

export type PanelUser = {
  id: number;
  name: string | null;
  email: string;
  role: "ADMIN" | "STAFF";
  active: boolean;
  lastLoginAt: string | null;
};

const ROLE_LABELS = { ADMIN: "Admin", STAFF: "Staff" } as const;

/** Runs a form action and reports the outcome as a toast, for the row actions
 *  that have no fields to validate inline. */
async function runAndToast(action: (formData: FormData) => Promise<ActionState>, fd: FormData) {
  const state = await action(fd);
  if (state.status === "error") toast.error(state.message ?? "Something went wrong.");
  else if (state.status === "success") toast.success(state.message ?? "Saved.");
}

function AddUserDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [state, formAction] = useActionState(createUserAction, IDLE_STATE);
  const [role, setRole] = useState<"ADMIN" | "STAFF">("STAFF");

  useEffect(() => {
    if (state.done) {
      toast.success(state.message ?? "Account created.");
      onOpenChange(false);
    }
  }, [state, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add a user</DialogTitle>
          <DialogDescription>
            They sign in with this email and password. You can change either later.
          </DialogDescription>
        </DialogHeader>
        <form action={formAction} className="grid gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="user-name">Name (optional)</Label>
            <Input id="user-name" name="name" placeholder="e.g. Sister" maxLength={60} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="user-email">
              Email <span className="text-destructive">*</span>
            </Label>
            <Input
              id="user-email"
              name="email"
              type="email"
              autoComplete="off"
              aria-invalid={Boolean(state.fieldErrors?.email)}
            />
            {state.fieldErrors?.email && (
              <p className="text-xs text-destructive">{state.fieldErrors.email}</p>
            )}
          </div>
          <div className="grid gap-1.5">
            <Label>
              Role <span className="text-destructive">*</span>
            </Label>
            <input type="hidden" name="role" value={role} />
            <Select value={role} onValueChange={(value) => setRole(value as typeof role)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="STAFF">Staff — day-to-day library work</SelectItem>
                <SelectItem value="ADMIN">Admin — everything, including users</SelectItem>
              </SelectContent>
            </Select>
            {state.fieldErrors?.role && (
              <p className="text-xs text-destructive">{state.fieldErrors.role}</p>
            )}
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="user-password">
              Password <span className="text-destructive">*</span>
            </Label>
            <Input
              id="user-password"
              name="password"
              type="password"
              autoComplete="new-password"
              aria-invalid={Boolean(state.fieldErrors?.password)}
            />
            {state.fieldErrors?.password && (
              <p className="text-xs text-destructive">{state.fieldErrors.password}</p>
            )}
            <p className="text-xs text-muted-foreground">At least 8 characters.</p>
          </div>
          {state.status === "error" && state.message && (
            <p className="text-sm text-destructive">{state.message}</p>
          )}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <SubmitButton pendingLabel="Creating">Create account</SubmitButton>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ResetPasswordDialog({
  user,
  onOpenChange,
}: {
  user: PanelUser | null;
  onOpenChange: (user: PanelUser | null) => void;
}) {
  const [state, formAction] = useActionState(resetUserPasswordAction, IDLE_STATE);

  useEffect(() => {
    if (state.done) {
      toast.success(state.message ?? "Password updated.");
      onOpenChange(null);
    }
  }, [state, onOpenChange]);

  return (
    <Dialog open={Boolean(user)} onOpenChange={(open) => !open && onOpenChange(null)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reset password</DialogTitle>
          <DialogDescription>{user ? `Set a new password for ${user.email}.` : ""}</DialogDescription>
        </DialogHeader>
        {user && (
          <form action={formAction} className="grid gap-4">
            <input type="hidden" name="userId" value={user.id} />
            <div className="grid gap-1.5">
              <Label htmlFor="reset-password">
                New password <span className="text-destructive">*</span>
              </Label>
              <Input
                id="reset-password"
                name="password"
                type="password"
                autoComplete="new-password"
                aria-invalid={Boolean(state.fieldErrors?.password)}
              />
              {state.fieldErrors?.password && (
                <p className="text-xs text-destructive">{state.fieldErrors.password}</p>
              )}
              <p className="text-xs text-muted-foreground">At least 8 characters.</p>
            </div>
            {state.status === "error" && state.message && (
              <p className="text-sm text-destructive">{state.message}</p>
            )}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(null)}>
                Cancel
              </Button>
              <SubmitButton pendingLabel="Saving">Save password</SubmitButton>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

function ToggleActiveDialog({
  user,
  onOpenChange,
}: {
  user: PanelUser | null;
  onOpenChange: (user: PanelUser | null) => void;
}) {
  return (
    <AlertDialog open={Boolean(user)} onOpenChange={(open) => !open && onOpenChange(null)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {user?.active ? "Deactivate this account?" : "Reactivate this account?"}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {user?.active
              ? `${user.email} will not be able to sign in again until reactivated.`
              : `${user?.email} will be able to sign in again.`}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <form action={runAndToast.bind(null, toggleUserActiveAction)} className="contents">
            <input type="hidden" name="userId" value={user?.id ?? 0} />
            <AlertDialogAction
              type="submit"
              onClick={() => onOpenChange(null)}
            >
              {user?.active ? "Deactivate" : "Reactivate"}
            </AlertDialogAction>
          </form>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function UsersPanel({
  users,
  currentUserId,
}: {
  users: PanelUser[];
  currentUserId: number;
}) {
  const [addOpen, setAddOpen] = useState(false);
  const [resetTarget, setResetTarget] = useState<PanelUser | null>(null);
  const [toggleTarget, setToggleTarget] = useState<PanelUser | null>(null);

  return (
    <div className="grid gap-4">
      <div className="flex justify-end">
        <Button onClick={() => setAddOpen(true)}>
          <UserPlus className="size-4" />
          Add user
        </Button>
        <AddUserDialog open={addOpen} onOpenChange={setAddOpen} />
      </div>

      <div className="overflow-x-auto rounded-xl border border-border bg-background">
        <table className="w-full min-w-[36rem] text-sm">
          <thead>
            <tr className="border-b border-border bg-muted text-left">
              <th className="px-3 py-2.5 font-medium">Name</th>
              <th className="px-3 py-2.5 font-medium">Email</th>
              <th className="px-3 py-2.5 font-medium">Role</th>
              <th className="px-3 py-2.5 font-medium">Status</th>
              <th className="px-3 py-2.5 font-medium">Last signed in</th>
              <th className="px-3 py-2.5 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {users.map((user) => (
              <tr key={user.id} className={user.active ? undefined : "opacity-60"}>
                <td className="px-3 py-2.5 font-medium">{user.name ?? "—"}</td>
                <td className="px-3 py-2.5">
                  {user.email}
                  {user.id === currentUserId && (
                    <span className="ml-1.5 text-xs text-muted-foreground">(you)</span>
                  )}
                </td>
                <td className="px-3 py-2.5">
                  <Badge variant={user.role === "ADMIN" ? "default" : "secondary"}>
                    {ROLE_LABELS[user.role]}
                  </Badge>
                </td>
                <td className="px-3 py-2.5">
                  {user.active ? (
                    <Badge variant="outline">Active</Badge>
                  ) : (
                    <Badge variant="destructive">Deactivated</Badge>
                  )}
                </td>
                <td className="px-3 py-2.5 text-muted-foreground">{user.lastLoginAt ?? "Never"}</td>
                <td className="px-3 py-2.5">
                  <div className="flex flex-wrap justify-end gap-1.5">
                    <form action={runAndToast.bind(null, updateUserRoleAction)}>
                      <input type="hidden" name="userId" value={user.id} />
                      <input
                        type="hidden"
                        name="role"
                        value={user.role === "ADMIN" ? "STAFF" : "ADMIN"}
                      />
                      <Button type="submit" variant="outline" size="sm">
                        {user.role === "ADMIN" ? "Make staff" : "Make admin"}
                      </Button>
                    </form>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setResetTarget(user)}
                    >
                      Reset password
                    </Button>
                    {user.id === currentUserId ? (
                      <Button type="button" variant="outline" size="sm" disabled>
                        {user.active ? "Deactivate" : "Activate"}
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setToggleTarget(user)}
                      >
                        {user.active ? "Deactivate" : "Activate"}
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-muted-foreground">
        Staff can see and record everything in the app except this page and the monthly fee. A
        deactivated account keeps its history but cannot sign in.
      </p>

      <ResetPasswordDialog user={resetTarget} onOpenChange={setResetTarget} />
      <ToggleActiveDialog user={toggleTarget} onOpenChange={setToggleTarget} />
    </div>
  );
}

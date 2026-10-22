"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Armchair, Check, Mail, Pencil, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SubmitButton } from "@/components/submit-button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  approveApplicationAction,
  deleteApplicationAction,
  rejectApplicationAction,
  releaseApplicationSeatAction,
  sendApplicationEmailAction,
  updateApplicationAction,
} from "@/app/(app)/applications/actions";

export type EditableApplication = {
  id: number;
  status: "PENDING" | "APPROVED" | "REJECTED";
  name: string;
  mobile: string;
  email: string | null;
  address: string | null;
  guardianName: string | null;
  guardianMobile: string | null;
  aadhaarNumber: string;
  preparingFor: string;
  otherPreparation: string | null;
  desiredJoiningDate: string;
  notes: string | null;
  memberId: number | null;
  /** "Room 1 · Seat 03" while the linked member still holds a seat, else null. */
  memberSeatLabel: string | null;
};

const inputClass = "h-11 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20";

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs text-destructive">{message}</p>;
}

function EditApplicationDialog({ application }: { application: EditableApplication }) {
  const [open, setOpen] = useState(false);
  const [errors, setErrors] = useState<Record<string, string> | undefined>(undefined);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      const result = await updateApplicationAction({ status: "idle" }, formData);
      if (result.status === "error") {
        setErrors(result.fieldErrors);
        toast.error(result.message ?? "Could not save the changes.");
        return;
      }
      toast.success(result.message ?? "Application updated.");
      setErrors(undefined);
      setOpen(false);
      router.refresh();
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-10">
          <Pencil className="size-4" />
          Edit
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit application</DialogTitle>
          <DialogDescription>
            Correct the details on file. Changes to shared details are copied to
            the linked member too.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="grid gap-4">
          <input type="hidden" name="id" value={application.id} />

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor={`edit-name-${application.id}`}>Full name</Label>
              <Input
                id={`edit-name-${application.id}`}
                name="name"
                defaultValue={application.name}
                aria-invalid={Boolean(errors?.name)}
                className={inputClass}
              />
              <FieldError message={errors?.name} />
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor={`edit-mobile-${application.id}`}>Mobile number</Label>
              <Input
                id={`edit-mobile-${application.id}`}
                name="mobile"
                inputMode="numeric"
                defaultValue={application.mobile}
                maxLength={10}
                pattern="[6-9][0-9]{9}"
                aria-invalid={Boolean(errors?.mobile)}
                className={inputClass}
              />
              <FieldError message={errors?.mobile} />
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor={`edit-email-${application.id}`}>Email</Label>
              <Input
                id={`edit-email-${application.id}`}
                name="email"
                type="email"
                defaultValue={application.email ?? ""}
                aria-invalid={Boolean(errors?.email)}
                className={inputClass}
              />
              <FieldError message={errors?.email} />
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor={`edit-aadhaar-${application.id}`}>Aadhaar number</Label>
              <Input
                id={`edit-aadhaar-${application.id}`}
                name="aadhaarNumber"
                inputMode="numeric"
                defaultValue={application.aadhaarNumber}
                maxLength={12}
                aria-invalid={Boolean(errors?.aadhaarNumber)}
                className={inputClass}
              />
              <FieldError message={errors?.aadhaarNumber} />
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor={`edit-guardian-${application.id}`}>Father / Guardian name</Label>
              <Input
                id={`edit-guardian-${application.id}`}
                name="guardianName"
                defaultValue={application.guardianName ?? ""}
                aria-invalid={Boolean(errors?.guardianName)}
                className={inputClass}
              />
              <FieldError message={errors?.guardianName} />
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor={`edit-guardian-mobile-${application.id}`}>
                Father / Guardian contact
              </Label>
              <Input
                id={`edit-guardian-mobile-${application.id}`}
                name="guardianMobile"
                inputMode="numeric"
                defaultValue={application.guardianMobile ?? ""}
                maxLength={10}
                pattern="[6-9][0-9]{9}"
                aria-invalid={Boolean(errors?.guardianMobile)}
                className={inputClass}
              />
              <FieldError message={errors?.guardianMobile} />
            </div>

            <div className="grid gap-1.5 sm:col-span-2">
              <Label htmlFor={`edit-address-${application.id}`}>Address</Label>
              <Textarea
                id={`edit-address-${application.id}`}
                name="address"
                rows={2}
                defaultValue={application.address ?? ""}
                aria-invalid={Boolean(errors?.address)}
              />
              <FieldError message={errors?.address} />
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor={`edit-preparing-${application.id}`}>Preparing for</Label>
              <Input
                id={`edit-preparing-${application.id}`}
                name="preparingFor"
                defaultValue={application.preparingFor}
                aria-invalid={Boolean(errors?.preparingFor)}
                className={inputClass}
              />
              <FieldError message={errors?.preparingFor} />
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor={`edit-other-${application.id}`}>Other preparation</Label>
              <Input
                id={`edit-other-${application.id}`}
                name="otherPreparation"
                defaultValue={application.otherPreparation ?? ""}
                aria-invalid={Boolean(errors?.otherPreparation)}
                className={inputClass}
              />
              <FieldError message={errors?.otherPreparation} />
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor={`edit-joining-${application.id}`}>Desired joining date</Label>
              <Input
                id={`edit-joining-${application.id}`}
                name="joiningDate"
                type="date"
                defaultValue={application.desiredJoiningDate}
                aria-invalid={Boolean(errors?.joiningDate)}
                className={inputClass}
              />
              <FieldError message={errors?.joiningDate} />
            </div>

            <div className="grid gap-1.5 sm:col-span-2">
              <Label htmlFor={`edit-notes-${application.id}`}>Internal notes</Label>
              <Textarea
                id={`edit-notes-${application.id}`}
                name="notes"
                rows={2}
                defaultValue={application.notes ?? ""}
                aria-invalid={Boolean(errors?.notes)}
              />
              <FieldError message={errors?.notes} />
            </div>
          </div>

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" className="h-10" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" className="h-10" disabled={pending}>
              {pending ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function RejectApplicationDialog({ application }: { application: EditableApplication }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const submit = () => {
    startTransition(async () => {
      const formData = new FormData();
      formData.set("id", String(application.id));
      formData.set("reason", reason);
      const result = await rejectApplicationAction(formData);
      if (result.status === "error") {
        toast.error(result.message ?? "Could not reject the application.");
        return;
      }
      toast.success(result.message ?? "Application rejected.");
      setOpen(false);
      router.refresh();
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="destructive" size="sm" className="h-10">
          <X className="size-4" />
          Reject
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reject {application.name}&apos;s application?</DialogTitle>
          <DialogDescription>
            An email will be sent to the applicant. You can add a reason below, or
            leave it blank to send the standard message.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-1.5">
          <Label htmlFor={`reject-reason-${application.id}`}>
            Reason <span className="font-normal text-muted-foreground">(optional)</span>
          </Label>
          <Textarea
            id={`reject-reason-${application.id}`}
            rows={3}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            This reason is shown on the application and included in the email.
          </p>
        </div>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" className="h-10" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            className="h-10"
            onClick={submit}
            disabled={pending}
          >
            {pending ? "Rejecting…" : "Yes, reject"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function DeleteApplicationDialog({ application }: { application: EditableApplication }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const remove = () => {
    startTransition(async () => {
      const result = await deleteApplicationAction(application.id);
      if (result.status === "error") {
        toast.error(result.message ?? "Could not delete the application.");
        return;
      }
      toast.success(result.message ?? "Application deleted.");
      setOpen(false);
      router.refresh();
    });
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-10 text-destructive">
          <Trash2 className="size-4" />
          Delete
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this application?</AlertDialogTitle>
          <AlertDialogDescription>
            This permanently removes {application.name}&apos;s application.
            {application.status === "APPROVED" ? (
              <>
                {" "}
                The member created from it is marked as left and their seat
                becomes available again. Their past payments are kept so the
                library&apos;s collection totals stay correct.
              </>
            ) : (
              " This cannot be undone."
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="h-10">Cancel</AlertDialogCancel>
          <Button
            type="button"
            variant="destructive"
            className="h-10"
            onClick={remove}
            disabled={pending}
          >
            {pending ? "Deleting…" : "Yes, delete"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function ApplicationActions({
  application,
}: {
  application: EditableApplication;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {application.status === "PENDING" && (
        <>
          <form action={approveApplicationAction} className="contents">
            <input type="hidden" name="id" value={application.id} />
            <SubmitButton className="h-10" pendingLabel="Approving…">
              <Check className="size-4" />
              Approve
            </SubmitButton>
          </form>
          <RejectApplicationDialog application={application} />
        </>
      )}
      {application.status !== "PENDING" && (
        <SendEmailDialog application={application} />
      )}
      {application.memberSeatLabel && (
        <ReleaseSeatDialog application={application} />
      )}
      <EditApplicationDialog application={application} />
      <DeleteApplicationDialog application={application} />
    </div>
  );
}

function ReleaseSeatDialog({ application }: { application: EditableApplication }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const release = () => {
    startTransition(async () => {
      const result = await releaseApplicationSeatAction(application.id);
      if (result.status === "error") {
        toast.error(result.message ?? "Could not release the seat.");
        return;
      }
      toast.success(result.message ?? "Seat released.");
      setOpen(false);
      router.refresh();
    });
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-10">
          <Armchair className="size-4" />
          Release seat
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Release this seat?</AlertDialogTitle>
          <AlertDialogDescription>
            {application.memberSeatLabel} becomes available to book again, and{" "}
            {application.name} is marked as left. Their application, member record
            and past payments are all kept — only the seat is freed.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="h-10">Cancel</AlertDialogCancel>
          <Button type="button" className="h-10" onClick={release} disabled={pending}>
            {pending ? "Releasing…" : "Yes, release seat"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function SendEmailDialog({ application }: { application: EditableApplication }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const approved = application.status === "APPROVED";

  const send = () => {
    startTransition(async () => {
      const result = await sendApplicationEmailAction(application.id);
      if (result.status === "error") {
        toast.error(result.message ?? "Could not send the email.");
        return;
      }
      toast.success(result.message ?? "Email sent.");
      setOpen(false);
      router.refresh();
    });
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-10">
          <Mail className="size-4" />
          {approved ? "Send welcome email" : "Send email"}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {approved ? "Send the welcome email?" : "Send the decision email?"}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {approved
              ? `This emails ${application.name} a welcome message with their seat and library details. They may have received one when you approved — sending it again is safe.`
              : `This emails ${application.name} the message explaining that their application was not accepted. Sending it again is safe.`}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="h-10">Cancel</AlertDialogCancel>
          <Button type="button" className="h-10" onClick={send} disabled={pending}>
            {pending ? "Sending…" : "Yes, send"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}


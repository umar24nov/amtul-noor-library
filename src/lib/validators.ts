import { z } from "zod";
import { SUPPORT_TOPICS } from "@/lib/constants";

const emptyToUndefined = (value: unknown) => {
  if (value === null || value === undefined) return undefined;
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  return trimmed.length === 0 ? undefined : trimmed;
};

const optionalText = (max: number) =>
  z.preprocess(emptyToUndefined, z.string().max(max, `Must be ${max} characters or fewer`).optional());

/**
 * Indian mobile numbers: 10 digits starting with 6-9. Spaces, dashes and a
 * leading +91 are tolerated and normalised away.
 */
export const mobileSchema = z
  .string()
  .trim()
  .transform((value) => value.replace(/[\s-]/g, "").replace(/^91(?=\d{10}$)/, ""))
  .refine((value) => /^\d{10}$/.test(value), "Enter a 10 digit mobile number")
  .refine((value) => /^[6-9]/.test(value), "Mobile number must start with 6, 7, 8 or 9");

export const optionalMobileSchema = z.preprocess(
  emptyToUndefined,
  z
    .string()
    .trim()
    .transform((value) => value.replace(/[\s-]/g, "").replace(/^91(?=\d{10}$)/, ""))
    .refine((value) => /^\d{10}$/.test(value), "Enter a 10 digit mobile number")
    .refine((value) => /^[6-9]/.test(value), "Mobile number must start with 6, 7, 8 or 9")
    .optional(),
);

/**
 * Optional email, used only to send receipts. Not every member has one yet, so
 * an empty value is accepted and stored as null.
 */
export const optionalEmailSchema = z.preprocess(
  emptyToUndefined,
  z
    .string()
    .trim()
    .toLowerCase()
    .max(120, "Email must be 120 characters or fewer")
    .email("Enter a valid email address")
    .optional(),
);

export const dateInputSchema = z
  .string()
  .trim()
  .min(1, "Date is required")
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid date")
  .refine((value) => !Number.isNaN(Date.parse(`${value}T00:00:00.000Z`)), "Enter a valid date");

export const monthKeySchema = z
  .string()
  .trim()
  .regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Enter a valid month");

export const seatNumberSchema = z
  .string()
  .trim()
  .transform((value) => value.replace(/\D/g, ""))
  .refine((value) => /^\d{1,4}$/.test(value), "Enter a seat number")
  .refine((value) => Number(value) > 0, "Seat number must be greater than 0");

export const memberFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Name is required")
    .max(80, "Name must be 80 characters or fewer"),
  mobile: mobileSchema,
  email: optionalEmailSchema,
  guardianName: optionalText(80),
  guardianMobile: optionalMobileSchema,
  joiningDate: dateInputSchema,
  remarks: optionalText(500),
  seatId: z.preprocess(emptyToUndefined, z.coerce.number().int().positive().optional()),
  monthlyFee: z.preprocess(
    emptyToUndefined,
    z.coerce
      .number("Fee must be a number")
      .int("Fee must be a whole amount")
      .min(0, "Fee cannot be negative")
      .max(100000, "Fee looks too large")
      .optional(),
  ),
  payAmount: z.preprocess(emptyToUndefined, z.coerce.number().positive("Amount must be greater than 0").max(100000).optional()),
  payMode: z.preprocess(emptyToUndefined, z.enum(["CASH", "ONLINE", "OFFER"]).optional()),
  payMonth: z.preprocess(emptyToUndefined, monthKeySchema.optional()),
  payDate: z.preprocess(emptyToUndefined, dateInputSchema.optional()),
});

export type MemberFormValues = z.input<typeof memberFormSchema>;
export type MemberFormOutput = z.output<typeof memberFormSchema>;

export const paymentFormSchema = z
  .object({
    memberId: z.preprocess(emptyToUndefined, z.coerce.number().int().positive("Select a member")),
    month: monthKeySchema,
    amount: z.coerce
      .number({ message: "Amount is required" })
      .min(0, "Amount cannot be negative")
      .max(100000, "Amount looks too large"),
    paymentMode: z.enum(["CASH", "ONLINE", "OFFER"], { message: "Select a payment mode" }),
    paymentDate: dateInputSchema,
    status: z.enum(["PAID", "PENDING", "WAIVED", "NOT_APPLICABLE", "ON_HOLD"], {
      message: "Select a status",
    }),
    remarks: optionalText(500),
  })
  // Only an offer or concession may be recorded as a paid zero.
  .refine((value) => value.amount !== 0 || value.paymentMode === "OFFER", {
    message: "Amount must be greater than 0",
    path: ["amount"],
  });

export type PaymentFormValues = z.input<typeof paymentFormSchema>;
export type PaymentFormOutput = z.output<typeof paymentFormSchema>;

export const assignSeatSchema = z.object({
  seatId: z.coerce.number().int().positive(),
  memberId: z.coerce.number().int().positive("Select an active member"),
});

export const roomFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Room name is required")
    .max(40, "Room name must be 40 characters or fewer"),
});

/** Editing a room is the name plus which room it is, so a stale tab cannot
 *  rename the wrong one. */
export const roomEditSchema = roomFormSchema.extend({
  roomId: z.coerce.number().int().positive("Room not found"),
});

/** Aadhaar number: twelve digits, spaces tolerated and stripped. */
export const aadhaarNumberSchema = z
  .string()
  .trim()
  .transform((value) => value.replace(/\s/g, ""))
  .refine((value) => /^\d{12}$/.test(value), "Aadhaar number must be 12 digits");

/**
 * The public membership application form. `agreed` arrives as "1" only when the
 * applicant ticks the rules checkbox, so the string check is the honest one.
 */
export const applicationSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Name is required")
    .max(80, "Name must be 80 characters or fewer"),
  mobile: mobileSchema,
  email: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, "Email is required")
    .max(120, "Email must be 120 characters or fewer")
    .email("Enter a valid email address"),
  address: z
    .string()
    .trim()
    .min(1, "Address is required")
    .max(200, "Address must be 200 characters or fewer"),
  guardianName: z
    .string()
    .trim()
    .min(2, "Father / Guardian name is required")
    .max(80, "Father / Guardian name must be 80 characters or fewer"),
  guardianMobile: optionalMobileSchema,
  aadhaarNumber: aadhaarNumberSchema,
  preparingFor: z.string().trim().min(1, "Enter what you are preparing for"),
  joiningDate: dateInputSchema,
  roomId: z.coerce.number("Choose a room").int("Choose a room").positive("Choose a room"),
  seatId: z.coerce.number("Choose a seat").int("Choose a seat").positive("Choose a seat"),
  agreed: z.string().refine((value) => value === "1", "Please agree to the rules to apply"),
});

export type ApplicationFormValues = z.input<typeof applicationSchema>;
export type ApplicationFormOutput = z.output<typeof applicationSchema>;

/**
 * The owner editing an application from the admin panel. Unlike the public
 * form it does not require a seat or the rules checkbox, and the optional
 * blocks may be left blank.
 */
export const applicationEditSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Name is required")
    .max(80, "Name must be 80 characters or fewer"),
  mobile: mobileSchema,
  email: optionalEmailSchema,
  address: optionalText(200),
  guardianName: optionalText(80),
  guardianMobile: optionalMobileSchema,
  aadhaarNumber: aadhaarNumberSchema,
  preparingFor: z.string().trim().min(1, "Enter what they are preparing for"),
  otherPreparation: optionalText(80),
  joiningDate: dateInputSchema,
  notes: optionalText(500),
});

/** A rejection may be sent without a reason; the default wording is used then. */
export const rejectionReasonSchema = optionalText(500);

/**
 * The public help & support form. A visitor with no account writes in, so it
 * asks only for a name, an address to reply to, a topic and the message. The
 * email is required here, unlike the join form, because the whole point is a
 * reply.
 */
export const supportMessageSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Name is required")
    .max(80, "Name must be 80 characters or fewer"),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, "Email is required")
    .max(120, "Email must be 120 characters or fewer")
    .email("Enter a valid email address"),
  topic: z.enum(SUPPORT_TOPICS, { message: "Choose a topic" }),
  message: z
    .string()
    .trim()
    .min(10, "Please add a little more detail")
    .max(2000, "Keep your message to 2000 characters or fewer"),
});

export type SupportMessageValues = z.input<typeof supportMessageSchema>;

export const seatFormSchema = z.object({
  roomId: z.coerce.number().int().positive(),
  seatNumber: seatNumberSchema,
});

export const seatRangeFormSchema = z.object({
  roomId: z.coerce.number().int().positive(),
  from: seatNumberSchema,
  to: seatNumberSchema,
});

export const markLeftSchema = z.object({
  memberId: z.coerce.number().int().positive(),
  leavingDate: dateInputSchema,
});

export const feeFormSchema = z.object({
  fee: z.coerce
    .number({ message: "Enter the monthly fee" })
    .positive("Monthly fee must be greater than 0")
    .max(100000, "Monthly fee looks too large"),
});

export const loginSchema = z.object({
  email: z.string().trim().min(1, "Email is required").email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
  next: z.string().optional(),
});

/** Password shared by account creation and password resets: at least 8
 *  characters, which is also what the hash-password script insists on. */
const accountPasswordSchema = z
  .string()
  .min(8, "Use at least 8 characters")
  .max(200, "Password must be 200 characters or fewer");

export const createUserSchema = z.object({
  name: optionalText(60),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, "Email is required")
    .max(120, "Email must be 120 characters or fewer")
    .email("Enter a valid email address"),
  roleId: z.coerce.number().int().positive("Choose a role"),
  password: accountPasswordSchema,
});

export type CreateUserFormValues = z.input<typeof createUserSchema>;

export const resetPasswordSchema = z.object({
  userId: z.coerce.number().int().positive("Account not found"),
  password: accountPasswordSchema,
});

export const userRoleChangeSchema = z.object({
  userId: z.coerce.number().int().positive("Account not found"),
  roleId: z.coerce.number().int().positive("Choose a role"),
});

export const userToggleSchema = z.object({
  userId: z.coerce.number().int().positive("Account not found"),
});

/** The two abilities a role can grant, mirrored from the RoleLevel enum. */
export const roleLevelSchema = z.enum(["ADMIN", "DAY_TO_DAY"], { message: "Choose a level" });

/** A role's name, chosen by the owner, e.g. "Front desk" or "Owner". */
const roleNameSchema = z
  .string()
  .trim()
  .min(1, "Give the role a name")
  .max(30, "Keep the name to 30 characters or fewer");

export const createRoleSchema = z.object({
  name: roleNameSchema,
  level: roleLevelSchema,
});

export const updateRoleSchema = z.object({
  roleId: z.coerce.number().int().positive("Role not found"),
  name: roleNameSchema,
  level: roleLevelSchema,
});

export const deleteRoleSchema = z.object({
  roleId: z.coerce.number().int().positive("Role not found"),
});

/** A signed-in person editing their own name and sign-in email. */
export const updateProfileSchema = z.object({
  name: optionalText(60),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, "Email is required")
    .max(120, "Email must be 120 characters or fewer")
    .email("Enter a valid email address"),
});

/** Changing your own password. The current one is checked, and the new one is
 *  confirmed, so a typo cannot lock you out. */
export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password"),
    newPassword: accountPasswordSchema,
    confirmPassword: z.string().min(1, "Re-enter the new password"),
  })
  .refine((value) => value.newPassword === value.confirmPassword, {
    path: ["confirmPassword"],
    message: "The passwords do not match",
  });

/** Flattens a Zod error into `{ field: message }` for form rendering. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const result: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "form";
    if (!result[key]) result[key] = issue.message;
  }
  return result;
}
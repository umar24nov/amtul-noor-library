import { z } from "zod";
import { optionalText } from "@/lib/validators";

export const expenseFormSchema = z.object({
  date: z.string().trim().min(1, "Select a date"),
  amount: z.coerce
    .number({ message: "Amount is required" })
    .positive("Amount must be greater than 0")
    .max(1000000, "Amount looks too large"),
  purpose: z.string().trim().min(1, "Enter a purpose").max(200, "Purpose is too long"),
  category: z.string().trim().max(100).optional().or(z.literal("")),
  paidTo: z.string().trim().max(100).optional().or(z.literal("")),
  remarks: optionalText(500),
});

export type ExpenseFormValues = z.input<typeof expenseFormSchema>;
export type ExpenseFormOutput = z.output<typeof expenseFormSchema>;

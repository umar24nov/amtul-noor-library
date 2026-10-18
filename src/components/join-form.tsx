"use client";

import { useState } from "react";
import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LIBRARY_NAME, LIBRARY_PHONE } from "@/lib/constants";

/**
 * A small form that turns a name and a question into a WhatsApp message to the
 * library, sent with the fields already filled in so the visitor never has to
 * write anything more than the question.
 */
export function JoinForm() {
  const [name, setName] = useState("");
  const [question, setQuestion] = useState("");

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!name.trim()) return;
    const intro = `Hi, this is ${name.trim()} from the ${LIBRARY_NAME} website.`;
    const ask = question.trim()
      ? `\n\n${question.trim()}`
      : "\n\nI'd like to know about a seat.";
    const text = `${intro}${ask}\n\nPlease tell me the fees and when I can visit.`;
    window.open(`https://wa.me/91${LIBRARY_PHONE}?text=${encodeURIComponent(text)}`, "_blank");
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col rounded-2xl border border-border bg-muted/40 p-6"
      aria-label="Ask about joining on WhatsApp"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <label htmlFor="join-name" className="text-sm font-medium">
            Your name
          </label>
          <input
            id="join-name"
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="e.g. Umar"
            required
            autoComplete="name"
            className="h-11 w-full rounded-lg border border-input bg-background px-2.5 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          />
        </div>
        <div className="grid gap-1.5">
          <label htmlFor="join-question" className="text-sm font-medium">
            Question <span className="font-normal text-muted-foreground">(optional)</span>
          </label>
          <input
            id="join-question"
            type="text"
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            placeholder="e.g. Is there a seat free today?"
            className="h-11 w-full rounded-lg border border-input bg-background px-2.5 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          />
        </div>
      </div>
      <Button type="submit" size="lg" className="mt-4 h-11">
        <MessageCircle className="size-4" />
        Ask on WhatsApp
      </Button>
      <p className="mt-2 text-xs text-muted-foreground">
        This opens WhatsApp with your message ready. We answer during the library&apos;s
        opening hours.
      </p>
    </form>
  );
}
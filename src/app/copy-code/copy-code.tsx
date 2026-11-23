"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { AlertCircle, Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function readCodeFromHash(): string | null {
  const fragment = window.location.hash.replace(/^#/, "");
  let value = fragment;
  try {
    value = decodeURIComponent(fragment);
  } catch {
    // Keep the raw fragment if it was not URL-encoded.
  }
  return /^\d{6}$/.test(value) ? value : null;
}

function subscribeToHash(callback: () => void): () => void {
  window.addEventListener("hashchange", callback);
  return () => window.removeEventListener("hashchange", callback);
}

/** Reads the code from the URL fragment without storing it during SSR. */
export function CopyCode() {
  const code = useSyncExternalStore(subscribeToHash, readCodeFromHash, () => null);
  const [copied, setCopied] = useState(false);
  const [blocked, setBlocked] = useState(false);

  const copy = useCallback(async (value: string) => {
    try {
      if (!navigator.clipboard) throw new Error("Clipboard is unavailable");
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setBlocked(false);
    } catch {
      setCopied(false);
      setBlocked(true);
    }
  }, []);

  useEffect(() => {
    if (!code) return;
    // The fragment is never sent to the server, but clear it from the address
    // bar and history anyway so the code is not left lying around.
    window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
  }, [code]);

  return (
    <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 text-center shadow-sm">
      <div className="mx-auto grid size-12 place-items-center rounded-full bg-primary/10 text-primary">
        {copied ? <Check className="size-6" /> : <Copy className="size-6" />}
      </div>
      <h1 className="font-heading mt-4 text-xl font-semibold tracking-tight">
        {code ? "Your code is ready" : "No code found"}
      </h1>

      {code ? (
        <div className="mt-4 grid gap-4">
          <p className="text-sm text-muted-foreground">Tap the button to copy your code.</p>
          <div className="flex items-center gap-2">
            <Input
              value={code}
              readOnly
              onFocus={(event) => event.currentTarget.select()}
              aria-label="One-time code"
              className="h-12 text-center font-mono text-2xl tracking-[0.4em]"
            />
            <Button type="button" size="icon" aria-label="Copy code" onClick={() => copy(code)}>
              <Copy className="size-4" />
            </Button>
          </div>

          {copied && (
            <p className="flex items-center justify-center gap-2 text-sm text-emerald-600">
              <Check className="size-4" />
              Copied to clipboard.
            </p>
          )}
          {blocked && (
            <p className="flex items-start justify-center gap-2 text-sm text-amber-600">
              <AlertCircle className="mt-0.5 size-4 shrink-0" />
              Your browser blocked automatic copying. Tap the code above and copy it manually.
            </p>
          )}

          <p className="text-xs text-muted-foreground">
            Enter it on the payment page. Please do not share this code with anyone.
          </p>
        </div>
      ) : (
        <p className="mt-3 text-sm text-muted-foreground">
          Open the code email again and tap <strong>Copy code</strong>.
        </p>
      )}
    </div>
  );
}

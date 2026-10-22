"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { importSampleProducts } from "@/app/actions/admin";
import { buttonClass } from "@/components/ui/button-styles";

/** Copies the sample products into an empty database. Shows the server's actual result. */
export function ImportSamplesButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const outcome = await importSampleProducts();
            setResult(outcome);
            if (outcome.ok) router.refresh();
          })
        }
        className={buttonClass({ variant: "secondary", size: "sm" })}
      >
        {pending ? "Adding…" : "Add the 14 sample products"}
      </button>
      {result && (
        <p role="status" className={result.ok ? "text-xs text-sage-deep" : "text-xs text-danger"}>
          {result.message}
        </p>
      )}
    </div>
  );
}

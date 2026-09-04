"use client";

import { useState } from "react";

/// A list page keeps its "add / create" form hidden behind a button at the
/// top; clicking it reveals the form. Wrap any admin create form:
///   <AddPanel label="Add product"><SomeForm /></AddPanel>
export default function AddPanel({
  label,
  children,
  defaultOpen = false,
}: {
  label: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="flex flex-col gap-4">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className={`a-btn self-start ${open ? "a-btn-ghost" : "a-btn-primary"}`}
      >
        {open ? "✕  Cancel" : `+  ${label}`}
      </button>
      {open && <div>{children}</div>}
    </div>
  );
}

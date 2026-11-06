"use client";

import { useTransition } from "react";
import { logoutAction } from "./actions";

export function LogoutButton() {
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => startTransition(() => logoutAction())}
      className="rounded-full border-[1.5px] border-ouro px-3 py-1.5 text-sm font-semibold text-marrom disabled:opacity-60"
    >
      Sair
    </button>
  );
}

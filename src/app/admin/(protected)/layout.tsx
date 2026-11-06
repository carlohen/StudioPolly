import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LogoutButton } from "./logout-button";

export const dynamic = "force-dynamic";

const LINKS = [
  { href: "/admin", label: "Agenda" },
  { href: "/admin/servicos", label: "Serviços" },
  { href: "/admin/profissionais", label: "Profissionais" },
  { href: "/admin/bloqueios", label: "Bloqueios" },
  { href: "/admin/combo", label: "Combo" },
  { href: "/admin/config", label: "Config" },
];

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");

  const { data: ehAdmin } = await supabase.rpc("is_admin");
  if (!ehAdmin) redirect("/admin/login");

  return (
    <div className="flex min-h-full flex-1 flex-col bg-creme">
      <header className="border-b-[1.5px] border-linha bg-white px-4 py-3">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-2">
          <nav className="flex flex-wrap gap-1">
            {LINKS.map((l) => (
              <Link key={l.href} href={l.href} className="rounded-full px-3 py-1.5 text-sm font-semibold text-marrom hover:bg-creme">
                {l.label}
              </Link>
            ))}
          </nav>
          <LogoutButton />
        </div>
      </header>
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-6">{children}</main>
    </div>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);

  async function entrar(e: FormEvent) {
    e.preventDefault();
    setErro("");
    setCarregando(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
    if (error) {
      setErro("E-mail ou senha incorretos.");
      setCarregando(false);
      return;
    }
    router.push("/admin");
    router.refresh();
  }

  return (
    <main className="flex flex-1 items-center justify-center bg-gradient-to-b from-creme to-[#F3EADA] px-4">
      <form onSubmit={entrar} className="w-full max-w-sm rounded-2xl border-[1.5px] border-ouro bg-white p-6">
        <h1 className="mb-4 text-center font-title text-2xl text-marrom">Painel · Polly Designer</h1>

        <label className="mb-1 block text-sm font-semibold">E-mail</label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mb-3 w-full rounded-xl border-[1.5px] border-linha p-3"
        />

        <label className="mb-1 block text-sm font-semibold">Senha</label>
        <input
          type="password"
          required
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          className="mb-4 w-full rounded-xl border-[1.5px] border-linha p-3"
        />

        <button type="submit" disabled={carregando} className="w-full rounded-full bg-marrom py-3 font-bold text-white disabled:opacity-60">
          {carregando ? "Entrando..." : "Entrar"}
        </button>
        {erro && <p className="mt-3 text-sm font-semibold text-red-800">{erro}</p>}
      </form>
    </main>
  );
}

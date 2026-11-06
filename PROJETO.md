# Polly Designer · Sistema de agendamento

Site de agendamento do salão Polly Designer (Fortaleza). As clientes agendam serviços avulsos ou o Combo Inauguração. A dona vê a agenda e edita preços, serviços, bloqueios e datas de combo pelo painel.

A versão anterior (Google Apps Script) está em `referencia/` (Codigo.gs, Index.html, Admin.html). Use-a como fonte das regras de negócio e do visual.

## Stack
- Next.js (App Router, TypeScript), Tailwind
- Supabase (Postgres + Auth) com `@supabase/supabase-js` e `@supabase/ssr`
- Fuso horário fixo: `America/Fortaleza` (UTC-3, sem horário de verão)

## Banco de dados
O banco **já foi criado** com `supabase-schema.sql` (está na raiz). Não recrie as tabelas. Mudanças futuras devem ser feitas com novos arquivos SQL de migração.

Tabelas: `profissionais`, `servicos` (preco, duracao_min, a_partir, adicional, sob_consulta, ativo), `config` (chave/valor), `datas_combo`, `bloqueios` (tstzrange; profissional nulo = salão todo), `clientes`, `agendamentos` (visita: status, token, turno, vaga), `itens_agendamento` (tstzrange por profissional), `admins`.

Proteções que já existem no banco (confie nelas e trate os erros com mensagens amigáveis):
- `sem_conflito`: a mesma profissional nunca tem dois itens sobrepostos (itens cancelados não contam). Código de erro `23P01`: responder "Esse horário acabou de ser ocupado".
- `vaga_combo_unica`: impede duas clientes na mesma vaga do combo. Código de erro `23505`.
- Trigger: mudar o `status` da visita para `cancelado` marca os itens como cancelados e libera os horários.
- RLS: o público (publishable key) só lê `profissionais`, `servicos`, `config` e `datas_combo` ativos. Clientes e agendamentos só são acessíveis por admin (`is_admin()`) ou pelo servidor usando a secret key.

## Variáveis de ambiente (`.env.local`, nunca commitar)
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SECRET_KEY=          # só no servidor, nunca em componente "use client"
```

## Regras de agenda (iguais à versão anterior)
- Atende de terça a sábado (`config.dias_semana` = 2..6), das 09:00 às 18:00. Almoço de 12:00 às 13:00 bloqueado para todas as profissionais.
- Os horários são oferecidos de 15 em 15 minutos; o serviço precisa caber inteiro antes do fechamento.
- Hoje: só mostrar horários a partir de agora + 30 min. Nunca datas passadas.
- Uma visita pode ter vários serviços **em sequência**: o próximo só pode começar depois do fim do anterior.
- **Adicionais** (pedraria, adesivos, etop cold) só valem se a visita tem algum serviço da P1 (manicure). O valor deles soma no primeiro item.
- Serviço **sob consulta**: não agenda; abre o WhatsApp do salão (`config.whats_salao`) com uma mensagem pronta.
- O preço é gravado no item no momento do agendamento (mudar o preço depois não altera agendamentos antigos).

## Combo Inauguração
- Datas vêm de `datas_combo` (a dona abre pelo painel), com vagas da manhã (máx. 3), vagas da tarde (máx. 5) e valor.
- Manhã: 09:00–12:00, 6 blocos de 30 min. Tarde: 13:00–18:00, 10 blocos de 30 min.
- Ordem da manhã: Manicure (P1), Design de sobrancelhas (P3), Corte de cabelo feminino (P5), Pedicure (P1), Depilação buço ou axila (P2), Massagem terapêutica cortesia (P4). Na tarde, a Pedicure vai para o fim da lista.
- A cliente na vaga `k` faz o serviço `j` às `inicio_turno + 30 * ((k + j) % blocos)`. Isso garante zero conflito (a P1 aparece 2x por cliente; por isso o limite é blocos/2).
- Em datas de combo, os horários da escala (de todas as vagas configuradas) ficam reservados para cada profissional; os avulsos não podem usá-los.
- O valor do combo vai no primeiro item; os outros itens ficam com valor 0. Cortesia: coffee break.

## Segurança
- Toda gravação e consulta de agendamento acontece no servidor (Server Actions ou Route Handlers) com a secret key, revalidando tudo: data, dia da semana, horário livre, sequência, serviço ativo.
- Criar a visita e os itens de forma atômica (de preferência uma função Postgres `criar_agendamento` chamada via RPC; senão, apagar a visita se os itens falharem).
- WhatsApp: guardar só dígitos, sempre com `55` + DDD. Nome: no máximo 60 caracteres.
- A cliente vê a própria visita só pelo link `/meu-agendamento/[token]`. Nunca buscar agendamentos só pelo telefone.
- Painel: login por e-mail e senha (Supabase Auth); checar `is_admin()` em todas as rotas `/admin`. O cadastro público de usuários está desligado.

## Páginas
- `/`: agendar, com abas "Agendar serviços" e "Combo Inauguração" (mesmo fluxo da versão anterior). No final, botão "Enviar confirmação pelo WhatsApp" e o link "meu agendamento".
- `/meu-agendamento/[token]`: ver os serviços, horários, total e status; permitir cancelar.
- `/admin/login`
- `/admin`: agenda do dia (filtro por data e profissional), com ações de concluído, faltou e cancelado e link do WhatsApp da cliente.
- `/admin/servicos`: editar nome, preço, duração, profissional e ativo; criar serviço novo.
- `/admin/profissionais`, `/admin/bloqueios`, `/admin/combo` (datas, vagas, valor), `/admin/config`.

## Visual
Mobile-first. Cores: ouro `#8B6B2E`, marrom `#6B4E1C`, texto `#4A3512`, creme `#FBF7EF`, linha `#D9C8A3`. Fontes: Cinzel (títulos) e Montserrat (texto). Botões arredondados, como em `referencia/Index.html`. Textos em português do Brasil e valores em R$.

## Ordem de trabalho
1. Criar o projeto Next.js, configurar o Supabase e as variáveis de ambiente.
2. Fazer a lógica de horários livres (avulso e combo) com testes.
3. Página de agendamento e criação da visita.
4. Página `/meu-agendamento/[token]`.
5. Login e painel da dona.
6. Deploy.

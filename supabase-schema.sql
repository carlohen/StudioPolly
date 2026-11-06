

create extension if not exists btree_gist;   -- impede horários sobrepostos
create extension if not exists pgcrypto;     -- gera os códigos de acesso das clientes

-- ---------- Cadastros que a dona edita ----------
create table profissionais (
  id      text primary key,                 -- P1, P2...
  nome    text not null,
  funcao  text,
  ativo   boolean not null default true,
  ordem   int not null default 0
);

create table servicos (
  id              text primary key,         -- S01, A01...
  nome            text not null,
  duracao_min     int  not null default 30 check (duracao_min >= 0),
  preco           numeric(10,2) not null default 0 check (preco >= 0),
  a_partir        boolean not null default false,  -- mostra "a partir de"
  adicional       boolean not null default false,  -- extra da manicure (pedraria etc.)
  sob_consulta    boolean not null default false,  -- vai para o WhatsApp
  profissional_id text not null references profissionais(id),
  ativo           boolean not null default true
);

create table config (
  chave text primary key,
  valor text not null
);

create table datas_combo (                  -- a dona abre/fecha datas de combo pelo painel
  data        date primary key,
  vagas_manha int not null default 3 check (vagas_manha between 0 and 3),
  vagas_tarde int not null default 5 check (vagas_tarde between 0 and 5),
  valor       numeric(10,2) not null default 130
);

create table bloqueios (                    -- folga, médico, feriado...
  id              uuid primary key default gen_random_uuid(),
  profissional_id text references profissionais(id),   -- vazio = salão todo
  horario         tstzrange not null,
  motivo          text
);

-- ---------- Clientes e agendamentos ----------
create table clientes (
  id        uuid primary key default gen_random_uuid(),
  nome      text not null,
  whats     text not null unique,           -- sempre com 55 + DDD
  criado_em timestamptz not null default now()
);

create table agendamentos (                 -- uma visita da cliente
  id          uuid primary key default gen_random_uuid(),
  cliente_id  uuid not null references clientes(id),
  data        date not null,
  tipo        text not null check (tipo in ('avulso','combo')),
  status      text not null default 'confirmado'
              check (status in ('confirmado','concluido','faltou','cancelado')),
  token       text not null unique default encode(gen_random_bytes(12), 'hex'), -- link "meu agendamento"
  turno       text check (turno in ('manha','tarde')),
  vaga        int,
  valor_total numeric(10,2) not null default 0,
  obs         text,
  criado_em   timestamptz not null default now()
);
-- impede duas clientes na mesma vaga do combo
create unique index vaga_combo_unica on agendamentos (data, turno, vaga)
  where tipo = 'combo' and status <> 'cancelado';

create table itens_agendamento (            -- cada serviço da visita
  id              uuid primary key default gen_random_uuid(),
  agendamento_id  uuid not null references agendamentos(id) on delete cascade,
  servico_id      text references servicos(id),
  nome_servico    text not null,            -- guarda o nome/preço da época
  profissional_id text not null references profissionais(id),
  horario         tstzrange not null,
  valor           numeric(10,2) not null default 0,
  cancelado       boolean not null default false,
  -- A REGRA DE OURO: a mesma profissional nunca tem dois atendimentos ao mesmo tempo
  constraint sem_conflito exclude using gist (profissional_id with =, horario with &&) where (not cancelado)
);
create index on itens_agendamento (agendamento_id);
create index on agendamentos (data);

-- cancelar a visita libera todos os horários dela (e reativar volta a ocupar)
create function sync_cancelamento() returns trigger language plpgsql as $$
begin
  update itens_agendamento set cancelado = (new.status = 'cancelado')
   where agendamento_id = new.id;
  return new;
end $$;
create trigger trg_cancelamento after update of status on agendamentos
  for each row when (old.status is distinct from new.status) execute function sync_cancelamento();

-- ---------- Quem é dona/admin ----------
create table admins (
  user_id uuid primary key references auth.users(id) on delete cascade
);
create function is_admin() returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from admins where user_id = auth.uid());
$$;

-- ---------- Segurança (RLS) ----------
-- Público (site): só lê catálogo. Clientes/agendamentos NUNCA ficam visíveis ao público;
-- o site grava e consulta por meio do servidor do Next.js.
alter table profissionais     enable row level security;
alter table servicos          enable row level security;
alter table config            enable row level security;
alter table datas_combo       enable row level security;
alter table bloqueios         enable row level security;
alter table clientes          enable row level security;
alter table agendamentos      enable row level security;
alter table itens_agendamento enable row level security;
alter table admins            enable row level security;

create policy "publico le profissionais" on profissionais for select using (ativo);
create policy "publico le servicos"      on servicos      for select using (ativo);
create policy "publico le config"        on config        for select using (true);
create policy "publico le datas combo"   on datas_combo   for select using (true);

create policy "admin tudo" on profissionais     for all to authenticated using (is_admin()) with check (is_admin());
create policy "admin tudo" on servicos          for all to authenticated using (is_admin()) with check (is_admin());
create policy "admin tudo" on config            for all to authenticated using (is_admin()) with check (is_admin());
create policy "admin tudo" on datas_combo       for all to authenticated using (is_admin()) with check (is_admin());
create policy "admin tudo" on bloqueios         for all to authenticated using (is_admin()) with check (is_admin());
create policy "admin tudo" on clientes          for all to authenticated using (is_admin()) with check (is_admin());
create policy "admin tudo" on agendamentos      for all to authenticated using (is_admin()) with check (is_admin());
create policy "admin tudo" on itens_agendamento for all to authenticated using (is_admin()) with check (is_admin());
create policy "admin ve admins" on admins for select to authenticated using (is_admin());

-- ---------- Dados iniciais (os mesmos da planilha) ----------
insert into profissionais (id, nome, funcao, ordem) values
 ('P1','Carlene Felix','Manicure e Pedicure',1),
 ('P2','Amanda Rodrigues','Depilação',2),
 ('P3','Naty','Sobrancelhas e cílios',3),
 ('P4','Leon Castello','Massoterapia',4),
 ('P5','Elisette Mello','Cabelo',5);

insert into servicos (id, nome, duracao_min, preco, profissional_id, a_partir, adicional, sob_consulta) values
 ('S01','Unhas das mãos simples',30,25,'P1',false,false,false),
 ('S02','Unhas das mãos em gel',30,50,'P1',false,false,false),
 ('S03','Unhas dos pés simples',30,25,'P1',false,false,false),
 ('S04','Unhas dos pés em gel',30,50,'P1',false,false,false),
 ('S05','Esmaltação',30,30,'P1',false,false,false),
 ('S06','Banho de gel',30,50,'P1',false,false,false),
 ('S07','Postiça realista',30,45,'P1',false,false,false),
 ('S08','Postiça simples',30,35,'P1',false,false,false),
 ('S09','Spa dos pés',30,85,'P1',false,false,false),
 ('A01','Pedraria',0,10,'P1',false,true,false),
 ('A02','Adesivos',0,10,'P1',false,true,false),
 ('A03','Etop cold',0,10,'P1',false,true,false),
 ('S10','Buço',15,15,'P2',false,false,false),
 ('S11','Axila',30,20,'P2',false,false,false),
 ('S12','Perna',30,30,'P2',false,false,false),
 ('S13','Coxa',30,40,'P2',false,false,false),
 ('S14','Contorno simples',30,30,'P2',false,false,false),
 ('S15','Contorno completo',30,50,'P2',false,false,false),
 ('S16','Dedos',10,15,'P2',false,false,false),
 ('S17','Sobrancelha simples',30,20,'P3',false,false,false),
 ('S18','Design de sobrancelha com henna',30,40,'P3',false,false,false),
 ('S19','Aplicação de cílios',30,40,'P3',false,false,false),
 ('S20','Massagem terapêutica',30,135,'P4',false,false,false),
 ('S21','Massagem modeladora',30,130,'P4',false,false,false),
 ('S22','Quiropraxia',30,180,'P4',false,false,false),
 ('S23','Drenagem linfática',30,160,'P4',false,false,false),
 ('S24','Liberação miofascial',30,190,'P4',false,false,false),
 ('S25','Detox Power do Leon',30,185,'P4',false,false,false),
 ('S26','Pump Up',30,115,'P4',false,false,false),
 ('S27','Limpeza de pele',30,150,'P4',true,false,false),
 ('S28','Corte de cabelo feminino',30,45,'P5',false,false,false),
 ('S29','Demais serviços (sob consulta)',30,0,'P5',false,false,true);

insert into config (chave, valor) values
 ('abre','09:00'), ('fecha','18:00'),
 ('almoco_inicio','12:00'), ('almoco_fim','13:00'),
 ('dias_semana','2,3,4,5,6');               -- 2=terça ... 6=sábado

insert into datas_combo (data) values ('2026-11-07'), ('2026-12-01');

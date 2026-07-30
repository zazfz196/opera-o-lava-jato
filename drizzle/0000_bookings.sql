CREATE TABLE IF NOT EXISTS bookings (
  id TEXT PRIMARY KEY,
  nome TEXT NOT NULL,
  telefone TEXT NOT NULL,
  veiculo TEXT NOT NULL DEFAULT '',
  servico TEXT NOT NULL,
  servicos TEXT NOT NULL,
  servico_nome TEXT NOT NULL,
  preco INTEGER NOT NULL,
  preco_original INTEGER NOT NULL,
  desconto INTEGER NOT NULL,
  duracao TEXT NOT NULL,
  data TEXT NOT NULL,
  horario TEXT NOT NULL,
  observacoes TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending',
  criado_em TEXT NOT NULL,
  atualizado_em TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS bookings_active_slot_idx
ON bookings (data, horario)
WHERE status != 'cancelled';

CREATE TABLE IF NOT EXISTS rate_limits (
  bucket TEXT PRIMARY KEY,
  window_start INTEGER NOT NULL,
  request_count INTEGER NOT NULL
);

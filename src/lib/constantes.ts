export const STATUS_ORCAMENTO = {
  novo: { rotulo: "Novo", cor: "bg-sky-100 text-sky-800" },
  em_conversa: { rotulo: "Em conversa", cor: "bg-violet-100 text-violet-800" },
  orcado: { rotulo: "Orçado", cor: "bg-amber-100 text-amber-800" },
  aceito: { rotulo: "Aceito", cor: "bg-emerald-100 text-emerald-800" },
  agendado: { rotulo: "Agendado", cor: "bg-teal-100 text-teal-800" },
  concluido: { rotulo: "Concluído", cor: "bg-zinc-200 text-zinc-800" },
  recusado: { rotulo: "Recusado", cor: "bg-rose-100 text-rose-800" },
  cancelado: { rotulo: "Cancelado", cor: "bg-rose-100 text-rose-800" },
} as const;

export type StatusOrcamento = keyof typeof STATUS_ORCAMENTO;

export const LOCAIS_CORPO = {
  braco: "Braço",
  antebraco: "Antebraço",
  perna: "Perna",
  costas: "Costas",
  peito: "Peito",
  costela: "Costela",
  mao: "Mão",
  pe: "Pé",
  pescoco: "Pescoço",
  outro: "Outro",
} as const;

export type LocalCorpo = keyof typeof LOCAIS_CORPO;

export const FORMAS_PAGAMENTO = {
  pix: "Pix",
  dinheiro: "Dinheiro",
  debito: "Cartão de débito",
  credito: "Cartão de crédito",
} as const;

export const CATEGORIAS_INSUMO = {
  tinta: "Tinta",
  agulha_cartucho: "Agulha/cartucho",
  luva: "Luva",
  filme_plastico: "Filme/plástico",
  higiene: "Higiene",
  descartavel: "Descartável",
  outro: "Outro",
} as const;

// Production Operations Types
export interface ProductionOperation {
  id: string
  data_operacao: string // date
  hora_inicio?: string | null // time
  hora_fim?: string | null // time
  operador_id?: string | null
  folha_obra_id: string
  item_id: string
  no_interno: string
  tipo_operacao: string
  maquina_impressao_id?: string | null
  maquina_corte_id?: string | null
  material_id: string
  stock_consumido_id?: string | null
  num_placas_print: number
  num_placas_corte: number
  quantidade_material_usado: number
  desperdicio: number
  qualidade?: string | null
  observacoes?: string | null
  status: string
  concluido: boolean
  data_conclusao?: string | null
  created_at: string
  updated_at: string
}

// Extended type with related data
export interface ProductionOperationWithRelations extends ProductionOperation {
  folhas_obras?: {
    numero_fo?: string
    nome_campanha?: string
    cliente?: string
  }
  items_base?: {
    descricao?: string
    codigo?: string
    quantidade?: number
  }
  profiles?: {
    first_name?: string
    last_name?: string
  }
  maquina_impressao?: {
    nome_maquina?: string
    tipo?: string
  }
  maquina_corte?: {
    nome_maquina?: string
    tipo?: string
  }
  materiais?: {
    material?: string
    cor?: string
    tipo?: string
    valor_m2?: number
  }
  stocks?: {
    quantidade_disponivel?: number
    unidade?: string
  }
}

// Slim/Lightweight types used in produção page listings
export interface ProducaoOperacaoSlim {
  id: string
  folha_obra_id: string
  concluido: boolean
}

export interface DesignerItemSlim {
  id?: string
  item_id: string
  paginacao?: boolean | null
}

export interface LogisticaRow {
  id?: string
  item_id: string
  descricao?: string | null
  data?: string | null
  is_entrega?: boolean | null
  saiu?: boolean | null
  concluido?: boolean | null
  quantidade?: number | null
  guia?: string | null
  local_recolha?: string | null
  local_entrega?: string | null
  id_local_recolha?: string | null
  id_local_entrega?: string | null
  transportadora?: string | null
  data_saida?: string | null
  items_base?: {
    id: string
    descricao?: string | null
    codigo?: string | null
    quantidade?: number | null
    brindes?: boolean | null
    folha_obra_id: string
    folhas_obras?: {
      id: string
      numero_orc?: number | null
      numero_fo?: string | null
      cliente?: string | null
      id_cliente?: string | null
      saiu?: boolean | null
    } | null
  } | null
}

// Adapter to convert between the local LogisticaRow and the table's LogisticaRecord
export const toLogisticaRecord = (
  row: LogisticaRow,
): import('./logistica').LogisticaRecord => ({
  id: row.id || row.items_base?.id || '',
  item_id: row.item_id,
  data: row.data || '',
  guia: row.guia || undefined,
  local_recolha: row.local_recolha || undefined,
  local_entrega: row.local_entrega || undefined,
  id_local_recolha: row.id_local_recolha || undefined,
  id_local_entrega: row.id_local_entrega || undefined,
  transportadora: row.transportadora || undefined,
  notas: undefined,
  saiu: row.saiu ?? undefined,
  concluido: row.concluido ?? undefined,
  data_concluido: undefined,
  data_saida: row.data_saida || undefined,
  is_entrega: row.is_entrega ?? undefined,
  items_base: row.items_base
    ? {
        id: row.items_base.id,
        descricao: row.items_base.descricao || undefined,
        codigo: row.items_base.codigo || undefined,
        quantidade: row.items_base.quantidade ?? null,
        brindes: row.items_base.brindes ?? undefined,
        folha_obra_id: row.items_base.folha_obra_id,
        folhas_obras: row.items_base.folhas_obras
          ? {
              id: row.items_base.folhas_obras.id,
              numero_orc: row.items_base.folhas_obras.numero_orc?.toString(),
              numero_fo: row.items_base.folhas_obras.numero_fo || undefined,
              cliente: row.items_base.folhas_obras.cliente || undefined,
              id_cliente: row.items_base.folhas_obras.id_cliente || undefined,
              saiu: row.items_base.folhas_obras.saiu ?? undefined,
            }
          : undefined,
      }
    : undefined,
  contacto: undefined,
  telefone: undefined,
  contacto_entrega: undefined,
  telefone_entrega: undefined,
  quantidade: row.quantidade ?? null,
  descricao: row.descricao || undefined,
})

// Form input type
export interface ProductionOperationInput {
  folha_obra_id: string
  item_id: string
  operador_id?: string
  data_operacao: string
  hora_inicio?: string
  hora_fim?: string
  tipo_operacao: string
  no_interno: string
  maquina_impressao_id?: string
  maquina_corte_id?: string
  material_id: string
  quantidade_material_usado: number
  desperdicio?: number
  qualidade?: string
  observacoes?: string
}

// Support types
export interface FolhaObra {
  id: string
  numero_fo: string
  nome_campanha: string
  cliente?: string
  data_in?: string
  data_saida?: string
  concluido?: boolean
}

export interface ItemBase {
  id: string
  folha_obra_id: string
  descricao: string
  codigo?: string
  quantidade?: number
  concluido?: boolean
}

export interface Profile {
  id: string
  first_name: string
  last_name: string
  role_id: string
  roles?: {
    name: string
  }
}

export interface Machine {
  id: string
  nome_maquina: string
  tipo: string
  ativa: boolean
  capacidade_max_diaria?: number
  custo_operacao_hora?: number
}

export interface Material {
  id: string
  tipo?: string | null
  referencia?: string | null
  ref_fornecedor?: string | null
  material?: string | null
  carateristica?: string | null
  cor?: string | null
  tipo_canal?: string | null
  dimensões?: string | null
  valor_m2_custo?: number | null
  valor_placa?: number | null
  valor_m2?: number | null
  qt_palete?: number | null
  created_at?: string
}

export interface StockEntry {
  id: string
  data: string
  fornecedor_id?: string | null
  no_guia_forn?: string | null
  material_id: string
  quantidade: number
  quantidade_disponivel: number
  vl_m2?: string | null
  preco_unitario?: number | null
  valor_total?: number | null
  notas?: string | null
  n_palet?: string | null
  created_at: string
  updated_at: string
}

export interface StockEntryWithRelations extends StockEntry {
  materiais?: {
    material?: string
    cor?: string
    tipo?: string
    carateristica?: string
    referencia?: string
  }
  fornecedores?: {
    nome_forn?: string
  }
}

export interface StockMovement {
  id: string
  operacao_id: string
  material_id: string
  quantidade_consumida: number
  num_placas_corte: number
  data_movimento: string
  observacoes?: string | null
}

// Operation types enum
export const OPERATION_TYPES = {
  PRINT: 'Impressão',
  CUT: 'Corte',
  PRINT_CUT: 'Impressão+Corte',
  FINISHING: 'Acabamento',
  PACKING: 'Embalagem',
} as const

export type OperationType =
  (typeof OPERATION_TYPES)[keyof typeof OPERATION_TYPES]

// Operation status enum
export const OPERATION_STATUS = {
  EM_CURSO: 'Em_Curso',
  CONCLUIDO: 'Concluído',
  PAUSADO: 'Pausado',
  CANCELADO: 'Cancelado',
} as const

export type OperationStatus =
  (typeof OPERATION_STATUS)[keyof typeof OPERATION_STATUS]

// Filter interface
export interface OperationFilters {
  dateFrom?: string
  dateTo?: string
  foNumber?: string
  operatorId?: string
  status?: string
  materialId?: string
  machineId?: string
}

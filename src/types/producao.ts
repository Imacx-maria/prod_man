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

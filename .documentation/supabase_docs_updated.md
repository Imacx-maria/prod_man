# Supabase Database Documentation

## Overview
This documentation provides a comprehensive overview of the Supabase database structure for what appears to be a printing/manufacturing management system. The database contains 27 tables managing various aspects of the business including inventory, production, clients, suppliers, logistics, and financial data.

## Database Architecture

### Core Business Entities
- **Clients Management**: `clientes`, `cliente_contacts`
- **Suppliers Management**: `fornecedores`
- **Inventory Management**: `materiais`, `stocks`, `alertas_stock`, `armazens`, `paletes`
- **Production Management**: `folhas_obras`, `items_base`, `producao_operacoes`, `producao_operacoes_audit`, `maquinas`, `maquinas_operacao`
- **Design Workflow**: `designer_items`, `complexidade`
- **Logistics**: `logistica_entregas`, `transportadora`
- **Financial Data**: `ne_fornecedor`, `orcamentos_vendedor`, `vendas_vendedor`, `listagem_compras`, `faturas_vendedor`
- **User Management**: `profiles`, `roles`, `role_permissions`
- **Configuration**: `feriados`

---

## Table Definitions

### 1. alertas_stock
**Purpose**: Stock alert management system to monitor inventory levels.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | uuid_generate_v4() | Primary key |
| material_id | uuid | YES | - | Foreign key to materiais table |
| nivel_minimo | numeric | NO | - | Minimum stock level threshold |
| nivel_critico | numeric | NO | - | Critical stock level threshold |
| ativo | boolean | YES | true | Whether alert is active |
| notificar_usuarios | ARRAY | YES | - | Array of users to notify |
| created_at | timestamptz | YES | now() | Creation timestamp |
| updated_at | timestamptz | YES | now() | Last update timestamp |

**Relationships:**
- `material_id` → `materiais.id` (Many-to-One)

**RLS Policies:**
- Authenticated users can manage alertas_stock (ALL operations)

---

### 2. armazens
**Purpose**: Warehouse/storage location management.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | uuid_generate_v4() | Primary key |
| numero_phc | text | YES | - | PHC system reference number |
| nome_arm | text | NO | - | Warehouse name |
| morada | text | YES | - | Address |
| codigo_pos | text | YES | - | Postal code |
| created_at | date | YES | CURRENT_DATE | Creation date |
| updated_at | date | YES | CURRENT_DATE | Last update date |

**RLS Policies:**
- Allow authenticated full access (ALL operations)
- Allow authenticated read (SELECT)

---

### 3. cliente_contacts
**Purpose**: Contact information for clients.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | uuid_generate_v4() | Primary key |
| cliente_id | uuid | NO | - | Foreign key to clientes table |
| name | text | NO | - | Contact person name |
| email | text | YES | - | Email address |
| phone_number | text | YES | - | Phone number |
| mobile | text | YES | - | Mobile number |
| created_at | date | YES | CURRENT_DATE | Creation date |
| updated_at | date | YES | CURRENT_DATE | Last update date |

**Relationships:**
- `cliente_id` → `clientes.id` (Many-to-One)

**RLS Policies:**
- Full CRUD access for authenticated users

---

### 4. clientes
**Purpose**: Client/customer management.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | uuid_generate_v4() | Primary key |
| numero_phc | text | YES | - | PHC system reference number |
| nome_cl | text | NO | - | Client name |
| morada | text | YES | - | Address |
| codigo_pos | text | YES | - | Postal code |
| telefone | text | YES | - | Phone number |
| created_at | date | YES | CURRENT_DATE | Creation date |
| updated_at | date | YES | CURRENT_DATE | Last update date |

**RLS Policies:**
- Allow anon access (ALL operations)
- Allow authenticated full access (ALL operations)

---

### 5. complexidade
**Purpose**: Complexity levels for production items.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key |
| grau | text | NO | - | Complexity degree/level |

**RLS Policies:**
- Full CRUD access for authenticated users

---

### 6. designer_items
**Purpose**: Design workflow management for production items.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | uuid_generate_v4() | Primary key |
| item_id | uuid | NO | - | Foreign key to items_base table |
| em_curso | boolean | YES | true | Whether design is in progress |
| duvidas | boolean | YES | false | Whether there are design questions |
| maquete_enviada | boolean | YES | false | Whether mockup has been sent |
| paginacao | boolean | YES | false | Whether pagination is complete |
| path_trabalho | text | YES | - | Work file path |
| data_in | date | YES | - | Date work started |
| data_duvidas | date | YES | - | Date of questions/issues |
| data_envio | date | YES | - | Date mockup was sent |
| data_saida | date | YES | - | Date work completed |
| updated_at | date | YES | CURRENT_DATE | Last update date |
| notas | text | YES | - | Designer notes |

**Relationships:**
- `item_id` → `items_base.id` (One-to-One)

**RLS Policies:**
- Allow authenticated access (ALL operations)

---

### 7. feriados
**Purpose**: Holiday calendar management.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | uuid_generate_v4() | Primary key |
| holiday_date | date | NO | - | Holiday date |
| description | text | NO | - | Holiday description |
| created_at | date | YES | CURRENT_DATE | Creation date |
| updated_at | date | YES | CURRENT_DATE | Last update date |

**RLS Policies:**
- Allow authenticated full access (ALL operations)

---

### 8. folhas_obras
**Purpose**: Work orders/job sheets management.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | uuid_generate_v4() | Primary key |
| numero_fo | text | NO | - | Work order number |
| profile_id | uuid | YES | - | Assigned user profile |
| nome_campanha | text | NO | - | Campaign/project name |
| prioridade | boolean | YES | false | Priority flag |
| data_in | date | YES | CURRENT_DATE | Start date |
| data_saida | date | YES | - | Completion date |
| notas | text | YES | - | Notes |
| concluido | boolean | YES | false | Completed flag |
| saiu | boolean | YES | false | Delivered flag |
| fatura | boolean | YES | false | Invoiced flag |
| data_concluido | date | YES | - | Completion date |
| data_saiu | date | YES | - | Delivery date |
| data_fatura | date | YES | - | Invoice date |
| numero_orc | integer | YES | - | Budget number |
| cliente | text | YES | 'null' | Client name |
| notas_prod | text | YES | - | Production notes |
| created_at | date | YES | CURRENT_DATE | Creation date |
| updated_at | date | YES | CURRENT_DATE | Last update date |
| id_cliente | uuid | YES | gen_random_uuid() | Client ID |

**Relationships:**
- `profile_id` → `profiles.id` (Many-to-One)

**RLS Policies:**
- Allow anon access (ALL operations)
- Allow authenticated access (ALL operations)

---

### 9. fornecedores
**Purpose**: Supplier management.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | uuid_generate_v4() | Primary key |
| numero_phc | text | YES | - | PHC system reference number |
| nome_forn | text | NO | - | Supplier name |
| morada | text | YES | - | Address |
| codigo_pos | text | YES | - | Postal code |
| telefone | text | YES | - | Phone number |
| email | text | YES | - | Email address |
| contacto_principal | text | YES | - | Main contact person |
| created_at | date | YES | CURRENT_DATE | Creation date |
| updated_at | date | YES | CURRENT_DATE | Last update date |

**RLS Policies:**
- Authenticated users can manage fornecedores (ALL operations)

---

### 10. items_base
**Purpose**: Base items/products within work orders.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | uuid_generate_v4() | Primary key |
| folha_obra_id | uuid | NO | - | Foreign key to folhas_obras |
| descricao | text | NO | - | Item description |
| codigo | text | YES | - | Item code |
| dad_end | boolean | YES | false | Address data flag |
| quantidade | integer | YES | - | Quantity |
| brindes | boolean | YES | false | Promotional items flag |
| concluido | boolean | YES | false | Completed flag |
| data_conc | date | YES | - | Completion date |
| created_at | date | YES | CURRENT_DATE | Creation date |
| updated_at | date | YES | CURRENT_DATE | Last update date |
| saiu | boolean | YES | false | Delivered flag |
| data_saida | date | YES | - | Delivery date |
| complexidade | text | YES | - | Complexity description |
| complexidade_id | uuid | YES | - | Foreign key to complexidade |
| concluido_maq | boolean | YES | false | Machine processing completed |
| prioridade | boolean | YES | false | Priority flag |

**Relationships:**
- `folha_obra_id` → `folhas_obras.id` (Many-to-One)
- `complexidade_id` → `complexidade.id` (Many-to-One)

**RLS Policies:**
- Allow authenticated full access (ALL operations)

---

### 11. logistica_entregas
**Purpose**: Logistics and delivery management.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | uuid_generate_v4() | Primary key |
| item_id | uuid | NO | - | Foreign key to items_base |
| is_entrega | boolean | NO | false | Is delivery (vs pickup) |
| local_recolha | text | YES | - | Pickup location |
| guia | text | YES | - | Shipping guide number |
| transportadora | text | YES | - | Shipping company |
| contacto | text | YES | - | Contact person |
| telefone | text | YES | - | Contact phone |
| quantidade | integer | YES | - | Quantity |
| notas | text | YES | - | Notes |
| local_entrega | text | YES | - | Delivery location |
| contacto_entrega | text | YES | - | Delivery contact |
| telefone_entrega | text | YES | - | Delivery phone |
| is_final | boolean | YES | false | Final delivery flag |
| data | date | YES | - | Delivery date |
| created_at | date | YES | CURRENT_DATE | Creation date |
| updated_at | date | YES | CURRENT_DATE | Last update date |
| is_recolha | boolean | YES | false | Is pickup flag |
| id_local_entrega | uuid | YES | gen_random_uuid() | Delivery location ID |
| id_local_recolha | uuid | YES | gen_random_uuid() | Pickup location ID |
| descricao | text | YES | - | Description |
| saiu | boolean | YES | false | Departed flag |
| concluido | boolean | YES | false | Completed flag |
| data_concluido | date | YES | - | Completion date |
| data_saida | date | YES | - | Departure date |

**Relationships:**
- `item_id` → `items_base.id` (Many-to-One, ON DELETE CASCADE)

**Indexes:**
- `idx_logistica_entregas_descricao` on `descricao` (btree)

**RLS Policies:**
- Allow authenticated full access (ALL operations)
- Simple auth policy (ALL operations)

---

### 12. maquinas
**Purpose**: Legacy machine management (appears to be older table).

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key |
| maquina | varchar(200) | YES | - | Machine name |
| valor_m2 | numeric | YES | - | Cost per square meter |
| integer_id | integer | NO | nextval() | Sequential ID |
| valor_m2_custo | numeric | YES | - | Cost value per square meter |

**RLS Policies:**
- Allow authenticated users full access to maquinas

---

### 13. maquinas_operacao
**Purpose**: Operational machine management.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | uuid_generate_v4() | Primary key |
| nome_maquina | text | NO | - | Machine name |
| tipo | text | NO | - | Machine type |
| ativa | boolean | YES | true | Active status |
| valor_m2 | numeric | YES | - | Value per square meter |
| valor_m2_custo | numeric | YES | - | Cost per square meter |
| notas | text | YES | - | Notes |
| created_at | date | YES | CURRENT_DATE | Creation date |
| updated_at | date | YES | CURRENT_DATE | Last update date |

**RLS Policies:**
- Authenticated users can manage maquinas_operacao (ALL operations)

---

### 14. materiais
**Purpose**: Materials catalog and specifications.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key |
| tipo | text | YES | - | Material type |
| material | text | YES | - | Material name |
| carateristica | text | YES | - | Material characteristics |
| cor | text | YES | - | Color |
| created_at | timestamptz | YES | now() | Creation timestamp |
| valor_m2 | numeric | YES | - | Price per square meter |
| referencia | text | YES | - | Internal reference |
| ref_cliente | text | YES | - | Client reference |
| ref_fornecedor | text | YES | - | Supplier reference |
| fornecedor | text | YES | - | Supplier name |
| tipo_canal | text | YES | - | Channel type |
| dimensoes | text | YES | - | Dimensions |
| valor_m2_custo | numeric | YES | - | Cost per square meter |
| valor_placa | numeric | YES | - | Price per sheet |
| qt_palete | smallint | YES | - | Quantity per pallet |
| fornecedor_id | uuid | YES | - | Foreign key to fornecedores table |
| stock_minimo | numeric | YES | 10 | Yellow alert threshold - stock below this shows BAIXO |
| stock_critico | numeric | YES | 5 | Red alert threshold - stock below this shows CRÍTICO |
| ORC | boolean | YES | - | Budget flag |
| stock_correct | numeric | YES | - | Corrected stock amount |
| stock_correct_updated_at | timestamptz | YES | - | Last stock correction timestamp |

**Relationships:**
- `fornecedor_id` → `fornecedores.id` (Many-to-One)

**RLS Policies:**
- Allow authenticated users full access to materiais

---

### 15. paletes
**Purpose**: Palette management table for tracking palettes with sequential numbering.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | uuid_generate_v4() | Primary key - UUID |
| no_palete | text | NO | - | Sequential palette number (P1, P2, P3...) - auto-generated |
| fornecedor_id | uuid | YES | - | Foreign key to fornecedores table - supplier information |
| no_guia_forn | text | YES | - | Supplier guide number - reference from supplier documentation |
| ref_cartao | text | YES | - | Reference from materiais.referencia - material reference code |
| qt_palete | smallint | YES | - | Quantity per palette from materiais.qt_palete - can be manually overridden |
| data | date | YES | CURRENT_DATE | Date of palette creation/registration - defaults to current date |
| author_id | uuid | YES | - | Foreign key to profiles table - who created this palette |
| created_at | timestamptz | YES | now() | Timestamp when record was created |
| updated_at | timestamptz | YES | now() | Timestamp when record was last updated - auto-updated on changes |

**Relationships:**
- `fornecedor_id` → `fornecedores.id` (Many-to-One)
- `author_id` → `profiles.id` (Many-to-One)

**RLS Policies:**
- Multiple role-based access policies (admin, administrativo, producao)
- Allow authenticated users full access to paletes
- Allow service role full access to paletes

---

### 16. producao_operacoes_audit
**Purpose**: Enhanced audit trail for comprehensive tracking of production operations including creation, updates, and deletion. Provides complete visibility into WHO made changes, WHAT was changed, and WHEN changes occurred to prevent data manipulation and fraud.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | uuid_generate_v4() | Primary key |
| operacao_id | uuid | YES | - | Foreign key to producao_operacoes table |
| action_type | text | NO | - | Type of audit action: INSERT, UPDATE, DELETE |
| field_name | text | YES | - | Name of the field that was changed (operador_id, num_placas_print, num_placas_corte, etc.) |
| operador_antigo | uuid | YES | - | Previous operator assigned (references profiles.id) |
| operador_novo | uuid | YES | - | New operator assigned (references profiles.id) |
| quantidade_antiga | numeric | YES | - | Previous quantity value (for quantity changes) |
| quantidade_nova | numeric | YES | - | New quantity value (for quantity changes) |
| old_value | text | YES | - | Previous value as text (for other field changes) |
| new_value | text | YES | - | New value as text (for other field changes) |
| changed_by | uuid | NO | - | Foreign key to profiles table (WHO made the change - authenticated user's profile.id) |
| changed_at | timestamptz | YES | now() | Timestamp when change occurred |
| operation_details | jsonb | YES | - | Complete operation data snapshot (for INSERT/DELETE actions) |
| notes | text | YES | - | Additional context or notes about the change |
| created_at | timestamptz | YES | now() | Record creation timestamp |

**Relationships:**
- `operacao_id` → `producao_operacoes.id` (Many-to-One, ON DELETE CASCADE)
- `changed_by` → `profiles.id` (Many-to-One, NOT NULL - tracks who made the change)
- `operador_antigo` → `profiles.id` (Many-to-One, NULLABLE - previous operator assigned)
- `operador_novo` → `profiles.id` (Many-to-One, NULLABLE - new operator assigned)

**Constraints:**
- `action_type` CHECK constraint: Only allows 'INSERT', 'UPDATE', 'DELETE'
- `changed_by` NOT NULL constraint: Every change must be attributed to a user
- Foreign key constraints ensure referential integrity

**Indexes:**
- `idx_producao_operacoes_audit_operacao_id` on `operacao_id` (btree)
- `idx_producao_operacoes_audit_changed_at` on `changed_at` (btree) 
- `idx_producao_operacoes_audit_changed_by` on `changed_by` (btree)
- `idx_producao_operacoes_audit_action_type` on `action_type` (btree)
- `idx_producao_operacoes_audit_operador_antigo` on `operador_antigo` (btree)
- `idx_producao_operacoes_audit_operador_novo` on `operador_novo` (btree)

**RLS Policies:**
- Allow authenticated users to insert audit logs (INSERT)
- Allow authenticated users to read audit logs (SELECT) 
- Prevent updates on audit logs (UPDATE) - immutable audit trail
- Prevent deletes on audit logs (DELETE) - immutable audit trail

**Audit Tracking Features:**
- **Operation Creation**: Logs when new operations are added with initial operator and quantity
- **Operator Changes**: Tracks when operators are reassigned to different operations
- **Quantity Changes**: Monitors increases/decreases in num_placas_print and num_placas_corte
- **Field Updates**: Records changes to materials, machines, dates, notes, palettes, etc.
- **Operation Deletion**: Captures complete operation data before deletion
- **User Attribution**: Always tracks WHO (authenticated user) made each change
- **Anti-Fraud Protection**: Separate tracking of operator assignments vs. who made the changes

**Key Security Features:**
- **Immutable Trail**: Records cannot be modified or deleted once created
- **User Accountability**: Every change is attributed to the authenticated user making it
- **Comprehensive Tracking**: Captures both the change details and full context
- **Fraud Detection**: Easy to identify suspicious patterns like quantity inflation or unauthorized operator reassignments

---

### 17. producao_operacoes
**Purpose**: Production operations tracking.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | uuid_generate_v4() | Primary key |
| data_operacao | date | NO | CURRENT_DATE | Operation date |
| operador_id | uuid | YES | - | Operator profile ID |
| folha_obra_id | uuid | YES | - | Work order ID |
| item_id | uuid | YES | - | Item ID |
| no_interno | text | NO | - | Internal number |
| maquina | uuid | YES | - | Machine ID |
| material_id | uuid | YES | - | Material ID |
| stock_consumido_id | uuid | YES | - | Consumed stock ID |
| num_placas_print | integer | YES | 0 | Number of printed sheets |
| num_placas_corte | integer | YES | 0 | Number of cut sheets |
| observacoes | text | YES | - | Observations |
| status | text | YES | 'Em_Curso' | Operation status |
| concluido | boolean | YES | false | Completed flag |
| data_conclusao | timestamptz | YES | - | Completion timestamp |
| created_at | timestamptz | YES | now() | Creation timestamp |
| updated_at | timestamptz | YES | now() | Update timestamp |
| Tipo_Op | text | YES | - | Operation type |
| N_Pal | text | YES | - | Pallet number |
| notas | text | YES | - | Additional notes |
| notas_imp | text | YES | - | Important notes |
| QT_print | integer | YES | - | Print quantity |
| tem_corte | boolean | YES | - | Whether the operation requires cutting |

**Relationships:**
- `operador_id` → `profiles.id` (Many-to-One)
- `folha_obra_id` → `folhas_obras.id` (Many-to-One)
- `item_id` → `items_base.id` (Many-to-One)
- `maquina` → `maquinas_operacao.id` (Many-to-One)
- `material_id` → `materiais.id` (Many-to-One)
- `stock_consumido_id` → `stocks.id` (Many-to-One)

**RLS Policies:**
- Authenticated users can manage producao_operacoes

---

### 18. profiles
**Purpose**: User profiles and role management.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | uuid_generate_v4() | Primary key |
| user_id | uuid | NO | - | Supabase auth user ID |
| first_name | text | NO | - | First name |
| last_name | text | NO | - | Last name |
| role_id | uuid | NO | - | Role ID |
| created_at | date | YES | CURRENT_DATE | Creation date |
| updated_at | date | YES | CURRENT_DATE | Last update date |

**Relationships:**
- `role_id` → `roles.id` (Many-to-One)

**RLS Policies:**
- Multiple policies for authenticated users (CRUD operations)
- Service role full access
- Users can read/update own profile

---

### 19. role_permissions
**Purpose**: Role-based permissions for different system areas.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | uuid_generate_v4() | Primary key |
| role_id | uuid | NO | - | Foreign key to roles table |
| page_path | text | NO | - | Page/route path for permission |
| can_access | boolean | YES | true | Whether role can access this path |
| created_at | date | YES | CURRENT_DATE | Creation date |
| updated_at | date | YES | CURRENT_DATE | Last update date |

**Relationships:**
- `role_id` → `roles.id` (Many-to-One)

**RLS Policies:**
- Authenticated users can manage role_permissions (ALL operations)

---

### 20. roles
**Purpose**: User role definitions.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | uuid_generate_v4() | Primary key |
| name | varchar(50) | NO | - | Role name |
| description | text | YES | - | Role description |
| created_at | date | YES | CURRENT_DATE | Creation date |
| updated_at | date | YES | CURRENT_DATE | Last update date |

**RLS Policies:**
- Full CRUD access for authenticated users

---

### 21. stocks
**Purpose**: Inventory stock management.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | uuid_generate_v4() | Primary key |
| data | date | NO | CURRENT_DATE | Stock entry date |
| fornecedor_id | uuid | YES | - | Supplier ID |
| no_guia_forn | text | YES | - | Supplier guide number |
| material_id | uuid | YES | - | Material ID |
| quantidade | numeric | NO | - | Quantity |
| quantidade_disponivel | numeric | NO | - | Available quantity |
| vl_m2 | text | YES | 'm2' | Unit of measurement |
| preco_unitario | numeric | YES | - | Unit price |
| valor_total | numeric | YES | - | Total value |
| notas | text | YES | - | Notes |
| created_at | timestamptz | YES | now() | Creation timestamp |
| updated_at | timestamptz | YES | now() | Update timestamp |
| n_palet | text | YES | - | Pallet number |

**Relationships:**
- `fornecedor_id` → `fornecedores.id` (Many-to-One)
- `material_id` → `materiais.id` (Many-to-One)

**RLS Policies:**
- Authenticated users can manage stocks (ALL operations)

---

### 22. ne_fornecedor
**Purpose**: Supplier order management for invoicing program import (NE_Fornecedor).

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | uuid_generate_v4() | Primary key |
| numero_documento | text | NO | - | Document/order number |
| nome_dossier | text | YES | - | Dossier name |
| data_documento | date | NO | - | Document date |
| nome_fornecedor | text | NO | - | Supplier name |
| nome_utilizador | text | YES | - | User name who created the order |
| iniciais_utilizador | text | YES | - | User initials |
| euro_total | numeric(10,2) | YES | 0 | Total amount in euros |
| created_at | timestamptz | YES | now() | Creation timestamp |
| updated_at | timestamptz | YES | now() | Last update timestamp |

**Indexes:**
- `idx_ne_fornecedor_numero_documento` on `numero_documento` (btree)
- `idx_ne_fornecedor_data_documento` on `data_documento` (btree)
- `idx_ne_fornecedor_nome_fornecedor` on `nome_fornecedor` (btree)
- `idx_ne_fornecedor_nome_utilizador` on `nome_utilizador` (btree)

**Triggers:**
- `update_ne_fornecedor_updated_at` - Auto-updates `updated_at` on row changes

**RLS Policies:**
- Allow authenticated users full access (ALL operations)

---

### 23. orcamentos_vendedor
**Purpose**: Budget/quote management for sales tracking.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | uuid_generate_v4() | Primary key |
| numero_documento | text | NO | - | Document/quote number |
| data_documento | date | NO | - | Document date |
| nome_cliente | text | NO | - | Client name |
| nome_utilizador | text | YES | - | User name who created the quote |
| euro_total | numeric(10,2) | YES | 0 | Total amount in euros |
| iniciais_utilizador | text | YES | - | User initials |
| nome_dossier | text | YES | - | Dossier name |
| created_at | timestamptz | YES | now() | Creation timestamp |
| updated_at | timestamptz | YES | now() | Last update timestamp |

**Indexes:**
- `idx_orcamentos_vendedor_numero_documento` on `numero_documento` (btree)
- `idx_orcamentos_vendedor_data_documento` on `data_documento` (btree)
- `idx_orcamentos_vendedor_nome_cliente` on `nome_cliente` (btree)
- `idx_orcamentos_vendedor_nome_utilizador` on `nome_utilizador` (btree)

**Triggers:**
- `update_orcamentos_vendedor_updated_at` - Auto-updates `updated_at` on row changes

**RLS Policies:**
- Allow authenticated users full access (ALL operations)

---

### 24. vendas_vendedor
**Purpose**: Sales data management for revenue tracking and invoicing program import.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | uuid_generate_v4() | Primary key |
| numero_documento | text | NO | - | Document/invoice number |
| nome_documento | text | NO | - | Document type (e.g., "Factura") |
| data_documento | date | NO | - | Document date |
| nome_cliente | text | NO | - | Client name |
| euro_total | numeric(10,2) | YES | 0 | Total amount in euros |
| nome_vendedor | text | YES | - | Seller name/initials (e.g., "RB", "IMACX") |
| created_at | timestamptz | YES | now() | Creation timestamp |
| updated_at | timestamptz | YES | now() | Last update timestamp |

**Indexes:**
- `idx_vendas_vendedor_numero_documento` on `numero_documento` (btree)
- `idx_vendas_vendedor_data_documento` on `data_documento` (btree)
- `idx_vendas_vendedor_nome_cliente` on `nome_cliente` (btree)
- `idx_vendas_vendedor_nome_vendedor` on `nome_vendedor` (btree)
- `idx_vendas_vendedor_nome_documento` on `nome_documento` (btree)

**Triggers:**
- `update_vendas_vendedor_updated_at` - Auto-updates `updated_at` on row changes

**RLS Policies:**
- Allow authenticated users full access (ALL operations)

---

### 25. listagem_compras
**Purpose**: Purchase listing management for supplier transactions and financial tracking.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | uuid_generate_v4() | Primary key |
| nome_fornecedor | text | NO | - | Supplier name |
| data_documento | date | NO | - | Document date |
| nome_dossier | text | YES | - | Dossier name |
| euro_total | numeric(10,2) | YES | 0 | Total amount in euros |
| created_at | timestamptz | YES | now() | Creation timestamp |
| updated_at | timestamptz | YES | now() | Last update timestamp |

**Indexes:**
- `idx_listagem_compras_nome_fornecedor` on `nome_fornecedor` (btree)
- `idx_listagem_compras_data_documento` on `data_documento` (btree)
- `idx_listagem_compras_nome_dossier` on `nome_dossier` (btree)
- `idx_listagem_compras_euro_total` on `euro_total` (btree)

**Triggers:**
- `update_listagem_compras_updated_at` - Auto-updates `updated_at` on row changes

**RLS Policies:**
- Inherits default authentication requirements (authenticated users access)

---

### 26. faturas_vendedor
**Purpose**: Invoice data management for revenue tracking and financial reporting. Contains invoice records from the invoicing program import.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | uuid_generate_v4() | Primary key - UUID |
| numero_documento | text | NO | - | Document/invoice number - unique identifier for each invoice |
| nome_documento | text | NO | - | Document type (e.g., "Factura") - type of invoice document |
| data_documento | date | NO | - | Document/invoice date - when the invoice was issued |
| nome_cliente | text | NO | - | Client name - customer who received the invoice |
| euro_total | numeric(10,2) | YES | 0 | Total amount in euros - invoice total value |
| nome_vendedor | text | YES | - | Seller name/initials (e.g., "IMACX", "RB") - who made the sale |
| created_at | timestamptz | YES | now() | Record creation timestamp |
| updated_at | timestamptz | YES | now() | Last update timestamp - auto-updated on changes |

**Indexes:**
- `idx_faturas_vendedor_numero_documento` on `numero_documento` (btree)
- `idx_faturas_vendedor_data_documento` on `data_documento` (btree)
- `idx_faturas_vendedor_nome_cliente` on `nome_cliente` (btree)
- `idx_faturas_vendedor_nome_vendedor` on `nome_vendedor` (btree)
- `idx_faturas_vendedor_nome_documento` on `nome_documento` (btree)
- `idx_faturas_vendedor_euro_total` on `euro_total` (btree)

**Triggers:**
- `update_faturas_vendedor_updated_at` - Auto-updates `updated_at` on row changes using dedicated trigger function

**RLS Policies:**
- Allow authenticated users full access to faturas_vendedor (ALL operations)

**Comments:**
- Table: "Invoice data management for revenue tracking and financial reporting. Contains invoice records from the invoicing program import."
- Comprehensive column comments for all fields documenting purpose and usage

---

### 27. transportadora
**Purpose**: Shipping company management.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key |
| name | text | NO | - | Shipping company name |
| created_at | date | YES | CURRENT_DATE | Creation date |
| updated_at | date | YES | CURRENT_DATE | Last update date |

**RLS Policies:**
- Full CRUD access for authenticated users

---

## Key Relationships

### Primary Entity Relationships
```
folhas_obras (Work Orders)
├── items_base (Items)
│   ├── designer_items (Design Workflow)
│   ├── logistica_entregas (Logistics)
│   └── producao_operacoes (Production Operations)
├── profiles (Users)
└── clientes (Clients)

materiais (Materials)
├── fornecedores (Suppliers)
├── stocks (Inventory)
├── alertas_stock (Stock Alerts)
├── paletes (Palettes)
└── producao_operacoes (Production Operations)

fornecedores (Suppliers)
├── materiais (Materials)
├── stocks (Inventory)
└── paletes (Palettes)

profiles (User Profiles)
├── roles (User Roles)
├── folhas_obras (Work Orders)
├── producao_operacoes (Production Operations)
└── paletes (Palette Creation)
```

## Security Model (RLS Policies)

### Authentication Levels
1. **anon**: Anonymous users (limited access)
2. **authenticated**: Logged-in users (most common access level)
3. **service_role**: System-level access

### Common Policy Patterns
- **Full Access**: Most tables allow authenticated users complete CRUD operations
- **Role-Based Access**: Paletes table has specific role-based access (admin, administrativo, producao)
- **User-Specific**: Profiles table has policies for users to manage their own data
- **Public Read**: Some tables (like clientes) allow anonymous read access

## Recent Updates

### New Paletes Table
- **Palette Management**: New table for tracking material palettes with sequential numbering
- **Supplier Integration**: Direct relationship with fornecedores table
- **Author Tracking**: Records who created each palette entry
- **Role-Based Access**: Multiple RLS policies for different user roles

### Enhanced Machine Management
- **Dual Machine Tables**: Both legacy `maquinas` and operational `maquinas_operacao` tables
- **Cost Tracking**: Added `valor_m2_custo` to both machine tables for better cost management

### Updated Designer Workflow
- **Enhanced Notes**: Added `notas` field to `designer_items` for better communication
- **Improved Tracking**: Better date tracking for design workflow stages

### Production Enhancements
- **Additional Fields**: Added `QT_print` to `producao_operacoes` for quantity tracking
- **Enhanced Notes**: Multiple note fields (`notas` and `notas_imp`) for different note types

### Role-Based Permissions
- **New Table**: `role_permissions` for granular access control
- **Path-Based Access**: Control access to specific application routes/pages

## Best Practices

### Database Design Observations
1. **Consistent Naming**: Portuguese naming convention throughout
2. **UUID Primary Keys**: All tables use UUID for primary keys
3. **Audit Trails**: Most tables have created_at/updated_at timestamps
4. **Soft Deletes**: No explicit soft delete columns observed
5. **Referential Integrity**: Foreign key relationships properly defined

### Performance Considerations
1. **Indexing**: Consider adding indexes on frequently queried foreign keys
2. **Materialized Views**: Complex reporting queries might benefit from materialized views
3. **Partitioning**: Large tables like producao_operacoes and stocks could benefit from date partitioning

### Data Integrity
1. **Constraints**: Consider adding check constraints for business rules
2. **Triggers**: Implement triggers for automatic timestamp updates
3. **Validation**: Add validation for critical fields like email formats, phone numbers

## Usage Examples

### Common Query Patterns
```sql
-- Get work orders with items and client information
SELECT fo.*, ib.descricao, c.nome_cl
FROM folhas_obras fo
JOIN items_base ib ON fo.id = ib.folha_obra_id
LEFT JOIN clientes c ON fo.id_cliente = c.id;

-- Check materials with low stock using built-in thresholds
SELECT m.material, 
       SUM(s.quantidade_disponivel) as total_stock,
       m.stock_minimo,
       m.stock_critico,
       CASE 
         WHEN SUM(s.quantidade_disponivel) <= m.stock_critico THEN 'CRÍTICO'
         WHEN SUM(s.quantidade_disponivel) <= m.stock_minimo THEN 'BAIXO'
         ELSE 'OK'
       END as status_stock
FROM materiais m
LEFT JOIN stocks s ON m.id = s.material_id
GROUP BY m.id, m.material, m.stock_minimo, m.stock_critico;

-- Production operations with full context
SELECT po.data_operacao, 
       mo.nome_maquina, 
       p.first_name || ' ' || p.last_name as operador,
       fo.numero_fo,
       m.material
FROM producao_operacoes po
JOIN maquinas_operacao mo ON po.maquina = mo.id
JOIN profiles p ON po.operador_id = p.id
JOIN folhas_obras fo ON po.folha_obra_id = fo.id
LEFT JOIN materiais m ON po.material_id = m.id;

-- Palette tracking with supplier information
SELECT p.no_palete,
       f.nome_forn,
       p.ref_cartao,
       p.qt_palete,
       p.data,
       pr.first_name || ' ' || pr.last_name as author
FROM paletes p
LEFT JOIN fornecedores f ON p.fornecedor_id = f.id
LEFT JOIN profiles pr ON p.author_id = pr.id
ORDER BY p.created_at DESC;
```

---

*This documentation represents the current database schema and should be updated as the system evolves.*
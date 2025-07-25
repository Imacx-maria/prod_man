# Supabase Database Documentation

## Overview
This documentation provides a comprehensive overview of the Supabase database structure for a printing/manufacturing management system. The database contains 28 tables managing various aspects of the business including inventory, production, clients, suppliers, logistics, and financial data.

## Database Architecture

### Core Business Entities
- **Clients Management**: `clientes`, `cliente_contacts`
- **Suppliers Management**: `fornecedores`
- **Inventory Management**: `materiais`, `stocks`, `alertas_stock`, `armazens`, `paletes`
- **Production Management**: `folhas_obras`, `items_base`, `producao_operacoes`, `producao_operacoes_audit`, `maquinas`, `maquinas_operacao`
- **Design Workflow**: `designer_items`, `complexidade`
- **Logistics**: `logistica_entregas`, `transportadora`
- **Financial Data**: `ne_fornecedor`, `orcamentos_vendedor`, `vendas_vendedor`, `listagem_compras`, `listagem_notas_credito`, `faturas_vendedor`
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

### 7. faturas_vendedor
**Purpose**: Invoice data management for revenue tracking and financial reporting.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | uuid_generate_v4() | Primary key |
| numero_documento | text | NO | - | Document/invoice number |
| nome_documento | text | NO | - | Document type (e.g., "Factura") |
| data_documento | text | NO | - | Document/invoice date |
| nome_cliente | text | NO | - | Client name |
| euro_total | numeric | YES | 0 | Total amount in euros |
| nome | text | YES | - | Seller name/initials |
| department | text | YES | - | Department |
| created_at | timestamptz | YES | now() | Creation timestamp |
| updated_at | timestamptz | YES | now() | Last update timestamp |

**RLS Policies:**
- Allow authenticated users full access to faturas_vendedor (ALL operations)

---

### 8. feriados
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

### 9. folhas_obras
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

### 10. fornecedores
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

### 11. items_base
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

### 12. listagem_compras
**Purpose**: Purchase listing management for supplier transactions and financial tracking.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | uuid_generate_v4() | Primary key |
| nome_fornecedor | text | NO | - | Supplier name |
| data_documento | text | NO | - | Document date |
| nome_dossier | text | YES | - | Dossier name |
| euro_total | numeric | YES | 0 | Total amount in euros |
| created_at | timestamptz | YES | now() | Creation timestamp |
| updated_at | timestamptz | YES | now() | Last update timestamp |

**RLS Policies:**
- Allow authenticated users full access to listagem_compras (ALL operations)

---

### 13. listagem_notas_credito
**Purpose**: Credit notes listing management for financial tracking.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | uuid_generate_v4() | Primary key |
| numero_documento | text | NO | - | Document number |
| nome_documento | text | NO | - | Document type |
| data_documento | text | NO | - | Document date |
| euro_total | numeric | YES | 0 | Total amount in euros (negative for credit notes) |
| created_at | timestamptz | YES | now() | Creation timestamp |
| updated_at | timestamptz | YES | now() | Last update timestamp |

**RLS Policies:**
- Allow authenticated users full access to listagem_notas_credito (ALL operations)

---

### 14. logistica_entregas
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

**RLS Policies:**
- Allow authenticated full access (ALL operations)

---

### 15. maquinas
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

### 16. maquinas_operacao
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

### 17. materiais
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

### 18. ne_fornecedor
**Purpose**: Supplier order management for invoicing program import (NE_Fornecedor).

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | uuid_generate_v4() | Primary key |
| numero_documento | text | NO | - | Document/order number |
| nome_dossier | text | YES | - | Dossier name |
| data_documento | text | NO | - | Document date |
| nome_fornecedor | text | NO | - | Supplier name |
| nome_utilizador | text | YES | - | User name who created the order |
| iniciais_utilizador | text | YES | - | User initials |
| euro_total | numeric | YES | 0 | Total amount in euros |
| created_at | timestamptz | YES | now() | Creation timestamp |
| updated_at | timestamptz | YES | now() | Last update timestamp |
| nome | text | YES | - | Additional name field |
| department | text | YES | - | Department |

**RLS Policies:**
- Allow authenticated users full access to ne_fornecedor (ALL operations)

---

### 19. orcamentos_vendedor
**Purpose**: Budget/quote management for sales tracking.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | uuid_generate_v4() | Primary key |
| numero_documento | text | NO | - | Document/quote number |
| data_documento | text | NO | - | Document date |
| nome_cliente | text | NO | - | Client name |
| nome_utilizador | text | YES | - | User name who created the quote |
| euro_total | numeric | YES | 0 | Total amount in euros |
| iniciais_utilizador | text | YES | - | User initials |
| nome_dossier | text | YES | - | Dossier name |
| created_at | timestamptz | YES | now() | Creation timestamp |
| updated_at | timestamptz | YES | now() | Last update timestamp |
| nome | text | YES | - | Additional name field |
| department | text | YES | - | Department |

**RLS Policies:**
- Allow authenticated users full access to orcamentos_vendedor (ALL operations)

---

### 20. paletes
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

### 21. producao_operacoes
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

### 22. producao_operacoes_audit
**Purpose**: Enhanced audit trail for comprehensive tracking of production operations including creation, updates, and deletion.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | uuid_generate_v4() | Primary key |
| operacao_id | uuid | YES | - | Foreign key to producao_operacoes table |
| action_type | text | NO | - | Type of audit action: INSERT, UPDATE, DELETE |
| field_name | text | YES | - | Name of the field that was changed |
| operador_antigo | uuid | YES | - | Previous operator assigned (references profiles.id) |
| operador_novo | uuid | YES | - | New operator assigned (references profiles.id) |
| quantidade_antiga | numeric | YES | - | Previous quantity value |
| quantidade_nova | numeric | YES | - | New quantity value |
| old_value | text | YES | - | Previous value as text |
| new_value | text | YES | - | New value as text |
| changed_by | uuid | NO | - | Foreign key to profiles table (WHO made the change) |
| changed_at | timestamptz | YES | now() | Timestamp when change occurred |
| operation_details | jsonb | YES | - | Complete operation data snapshot |
| notes | text | YES | - | Additional context or notes about the change |
| created_at | timestamptz | YES | now() | Record creation timestamp |

**Relationships:**
- `operacao_id` → `producao_operacoes.id` (Many-to-One, ON DELETE CASCADE)
- `changed_by` → `profiles.id` (Many-to-One, NOT NULL)
- `operador_antigo` → `profiles.id` (Many-to-One, NULLABLE)
- `operador_novo` → `profiles.id` (Many-to-One, NULLABLE)

**RLS Policies:**
- Allow authenticated users to insert audit logs (INSERT)
- Allow authenticated users to read audit logs (SELECT)
- Prevent updates on audit logs (UPDATE) - immutable audit trail
- Prevent deletes on audit logs (DELETE) - immutable audit trail

---

### 23. profiles
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

### 24. role_permissions
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

### 25. roles
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

### 26. stocks
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
├── producao_operacoes_audit (Audit Trail)
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
- **Immutable Audit**: producao_operacoes_audit prevents updates/deletes to maintain integrity

### Detailed RLS Policy Analysis

#### Tables with Anonymous Access
- **clientes**: Full access for anonymous users
- **folhas_obras**: Full access for anonymous users

#### Tables with Role-Based Access
- **paletes**: Specific policies for admin, administrativo, and producao roles

#### Tables with Restricted Operations
- **producao_operacoes_audit**: 
  - INSERT: Allowed for authenticated users
  - SELECT: Allowed for authenticated users
  - UPDATE: Prevented (returns false)
  - DELETE: Prevented (returns false)

#### Tables with Standard Authenticated Access
Most tables follow the standard pattern of allowing full CRUD operations for authenticated users:
- alertas_stock, armazens, cliente_contacts, complexidade, designer_items
- feriados, fornecedores, items_base, listagem_compras, listagem_notas_credito
- logistica_entregas, maquinas, maquinas_operacao, materiais, ne_fornecedor
- orcamentos_vendedor, producao_operacoes, role_permissions, roles
- stocks, transportadora, faturas_vendedor

## Data Integration and Financial Tracking

### Financial Data Flow
The system includes comprehensive financial tracking through multiple tables:

1. **Sales Pipeline**: orcamentos_vendedor → vendas_vendedor → faturas_vendedor
2. **Purchase Pipeline**: ne_fornecedor → listagem_compras
3. **Credit Management**: listagem_notas_credito

### Import/Export Data Tables
Several tables are designed for importing data from external financial systems:
- **ne_fornecedor**: Supplier orders for invoicing program import
- **orcamentos_vendedor**: Budget/quote management for sales tracking
- **faturas_vendedor**: Invoice data from invoicing program
- **listagem_compras**: Purchase listings for financial tracking
- **listagem_notas_credito**: Credit notes management

## Advanced Features

### Audit Trail System
The `producao_operacoes_audit` table provides comprehensive tracking:
- **WHO**: Changed by field tracks the authenticated user making changes
- **WHAT**: Detailed field-level change tracking with old/new values
- **WHEN**: Timestamp of all changes
- **WHY**: Notes field for additional context
- **Anti-Fraud**: Separate tracking of operator assignments vs. who made changes

### Stock Management
Advanced stock tracking with multiple alert levels:
- **stock_minimo**: Yellow alert threshold (default: 10)
- **stock_critico**: Red alert threshold (default: 5)
- **stock_correct**: Corrected stock amounts with timestamps
- **alertas_stock**: Configurable alert system with user notifications

### Material Palette Integration
Sophisticated palette management system:
- **Sequential Numbering**: Auto-generated P1, P2, P3... format
- **Material References**: Links to materiais.referencia for auto-fill
- **Supplier Integration**: Direct connection to supplier information
- **Author Tracking**: Records who created each palette

## Performance Considerations

### Indexing Strategy
Based on the table structure, consider adding indexes on:
- Foreign key columns for faster joins
- Date columns for time-based queries
- Frequently filtered columns (status, tipo, etc.)

### Query Optimization
- Use appropriate joins for related data fetching
- Consider materialized views for complex reporting queries
- Implement pagination for large datasets

## Data Integrity Guidelines

### Referential Integrity
All foreign key relationships are properly defined:
- Cascade deletes where appropriate (e.g., logistica_entregas → items_base)
- Nullable foreign keys for optional relationships
- Non-nullable foreign keys for required relationships

### Data Validation
Consider implementing:
- Check constraints for enum-like fields
- Triggers for automatic timestamp updates
- Validation functions for business rules

## Usage Examples

### Common Query Patterns

#### Work Orders with Items and Client Information
```sql
SELECT fo.*, ib.descricao, c.nome_cl
FROM folhas_obras fo
JOIN items_base ib ON fo.id = ib.folha_obra_id
LEFT JOIN clientes c ON fo.id_cliente = c.id;
```

#### Materials with Stock Status
```sql
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
```

#### Production Operations with Full Context
```sql
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
```

#### Palette Tracking with Supplier Information
```sql
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

#### Audit Trail Analysis
```sql
SELECT 
  audit.action_type,
  audit.field_name,
  audit.old_value,
  audit.new_value,
  changer.first_name || ' ' || changer.last_name as changed_by,
  audit.changed_at,
  po.no_interno
FROM producao_operacoes_audit audit
LEFT JOIN profiles changer ON audit.changed_by = changer.id
LEFT JOIN producao_operacoes po ON audit.operacao_id = po.id
ORDER BY audit.changed_at DESC;
```

#### Financial Summary Queries
```sql
-- Sales Summary
SELECT 
  DATE_TRUNC('month', data_documento::date) as month,
  SUM(euro_total) as total_sales
FROM faturas_vendedor
WHERE data_documento::date >= CURRENT_DATE - INTERVAL '12 months'
GROUP BY month
ORDER BY month;

-- Purchase Summary
SELECT 
  nome_fornecedor,
  SUM(euro_total) as total_purchases
FROM listagem_compras
WHERE data_documento::text ~ '^\d{4}-\d{2}-\d{2}'
  AND data_documento::date >= CURRENT_DATE - INTERVAL '12 months'
GROUP BY nome_fornecedor
ORDER BY total_purchases DESC;
```

## Migration and Maintenance

### Schema Updates
When updating the schema:
1. Always backup data before migrations
2. Test migrations on a copy first
3. Update RLS policies as needed
4. Verify foreign key constraints remain valid

### Data Cleanup
Regular maintenance tasks:
1. Archive old audit records if needed
2. Clean up orphaned records
3. Update stock calculations
4. Verify data integrity constraints

## Best Practices

### Database Design Observations
1. **Consistent Naming**: Portuguese naming convention throughout
2. **UUID Primary Keys**: All tables use UUID for primary keys
3. **Audit Trails**: Comprehensive audit system for critical operations
4. **Flexible Architecture**: Supports both legacy and new operational workflows
5. **Financial Integration**: Complete integration with external financial systems

### Security Best Practices
1. **Principle of Least Privilege**: RLS policies enforce minimal necessary access
2. **Audit Everything**: Critical operations are fully audited
3. **Immutable Logs**: Audit trails cannot be modified or deleted
4. **Role-Based Access**: Granular permissions based on user roles

### Performance Best Practices
1. **Efficient Queries**: Use appropriate indexes and joins
2. **Pagination**: Implement for large datasets
3. **Caching**: Consider for frequently accessed reference data
4. **Monitoring**: Track query performance and optimize as needed

---

*This comprehensive documentation covers all 28 tables in the Supabase database, their relationships, RLS policies, and usage patterns. The system demonstrates a mature, well-architected solution for manufacturing/printing business management with strong audit capabilities and financial integration.*
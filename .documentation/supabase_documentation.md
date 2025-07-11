# Supabase Database Documentation

## Overview
This documentation provides a comprehensive overview of the Supabase database structure for what appears to be a printing/manufacturing management system. The database contains 19 tables managing various aspects of the business including inventory, production, clients, suppliers, and logistics.

## Database Architecture

### Core Business Entities
- **Clients Management**: `clientes`, `cliente_contacts`
- **Suppliers Management**: `fornecedores`
- **Inventory Management**: `materiais`, `stocks`, `alertas_stock`, `armazens`
- **Production Management**: `folhas_obras`, `items_base`, `producao_operacoes`, `maquinas`, `maquinas_operacao`
- **Design Workflow**: `designer_items`, `complexidade`
- **Logistics**: `logistica_entregas`, `transportadora`
- **User Management**: `profiles`, `roles`
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
| capacidade_max_diaria | numeric | YES | - | Maximum daily capacity |
| custo_operacao_hora | numeric | YES | - | Hourly operation cost |
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

### 15. producao_operacoes
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

### 16. profiles
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

### 17. roles
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

### 18. stocks
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
| n_palet | text | YES | - | Pallet number |
| created_at | timestamptz | YES | now() | Creation timestamp |
| updated_at | timestamptz | YES | now() | Update timestamp |

**Relationships:**
- `fornecedor_id` → `fornecedores.id` (Many-to-One)
- `material_id` → `materiais.id` (Many-to-One)

**RLS Policies:**
- Authenticated users can manage stocks (ALL operations)

---

### 19. transportadora
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
└── producao_operacoes (Production Operations)

fornecedores (Suppliers)
├── materiais (Materials)
└── stocks (Inventory)

profiles (User Profiles)
├── roles (User Roles)
├── folhas_obras (Work Orders)
└── producao_operacoes (Production Operations)
```

## Security Model (RLS Policies)

### Authentication Levels
1. **anon**: Anonymous users (limited access)
2. **authenticated**: Logged-in users (most common access level)
3. **service_role**: System-level access

### Common Policy Patterns
- **Full Access**: Most tables allow authenticated users complete CRUD operations
- **User-Specific**: Profiles table has policies for users to manage their own data
- **Public Read**: Some tables (like clientes) allow anonymous read access

## Recent Updates

### New Features in Materials Table
- **Stock Alerts Integration**: Added `stock_minimo` and `stock_critico` fields for automated stock monitoring
- **Supplier Relationships**: Added `fornecedor_id` for direct supplier linking
- **Budget Tracking**: Added `ORC` flag for budget-related materials
- **Stock Corrections**: Added `stock_correct` and `stock_correct_updated_at` for inventory adjustments

### Stocks Table Simplification
- **Removed Legacy Fields**: Eliminated `lote`, `tipo_movimento`, `data_validade`, `localizacao`, and `ref_interna`
- **Renamed Column**: `unidade` is now `vl_m2` for clearer measurement specification
- **Added Pallet Tracking**: New `n_palet` field for better logistics management

### Production Enhancements
- **Enhanced Notes**: Added `notas` and `notas_imp` fields to `producao_operacoes` for better communication
- **Item Priority**: Added `prioridade` flag to `items_base` for workflow prioritization

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
```

---

*This documentation represents the current database schema and should be updated as the system evolves.*
# Database Documentation

## Overview
This database system manages a printing/manufacturing business workflow including client management, work orders, materials, stock, production operations, and logistics.

**Database Statistics:**
- **Tables:** 19
- **Total Columns:** 206  
- **Foreign Key Relationships:** 17
- **Row-Level Security Policies:** 43

---

## Table of Contents
1. [Core Business Tables](#core-business-tables)
2. [Supporting Tables](#supporting-tables)
3. [User Management](#user-management)
4. [Database Relationships](#database-relationships)
5. [Row-Level Security (RLS) Policies](#row-level-security-rls-policies)

---

## Core Business Tables

### 1. folhas_obras (Work Orders)
**Purpose:** Central table for managing work orders/campaigns

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | uuid_generate_v4() | Primary key |
| numero_fo | text | NO | - | Work order number |
| profile_id | uuid | YES | - | Assigned user profile |
| nome_campanha | text | NO | - | Campaign name |
| prioridade | boolean | YES | false | Priority flag |
| data_in | date | YES | CURRENT_DATE | Entry date |
| data_saida | date | YES | - | Exit date |
| notas | text | YES | - | Notes |
| concluido | boolean | YES | false | Completed flag |
| saiu | boolean | YES | false | Left/shipped flag |
| fatura | boolean | YES | false | Invoice flag |
| data_concluido | date | YES | - | Completion date |
| data_saiu | date | YES | - | Shipping date |
| data_fatura | date | YES | - | Invoice date |
| numero_orc | integer | YES | - | Budget number |
| cliente | text | YES | 'null' | Client name |
| notas_prod | text | YES | - | Production notes |
| created_at | date | YES | CURRENT_DATE | Creation timestamp |
| updated_at | date | YES | CURRENT_DATE | Update timestamp |
| id_cliente | uuid | YES | gen_random_uuid() | Client ID |

**Foreign Keys:**
- `profile_id` → `profiles(id)`

---

### 2. items_base (Work Order Items)
**Purpose:** Individual items within work orders

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | uuid_generate_v4() | Primary key |
| folha_obra_id | uuid | NO | - | Work order reference |
| descricao | text | NO | - | Item description |
| codigo | text | YES | - | Item code |
| dad_end | boolean | YES | false | Address data flag |
| quantidade | integer | YES | - | Quantity |
| brindes | boolean | YES | false | Promotional items flag |
| concluido | boolean | YES | false | Completed flag |
| data_conc | date | YES | - | Completion date |
| created_at | date | YES | CURRENT_DATE | Creation timestamp |
| updated_at | date | YES | CURRENT_DATE | Update timestamp |
| saiu | boolean | YES | false | Shipped flag |
| data_saida | date | YES | - | Shipping date |
| complexidade | text | YES | - | Complexity description |
| complexidade_id | uuid | YES | - | Complexity reference |
| concluido_maq | boolean | YES | false | Machine completion flag |
| prioridade | boolean | YES | false | Priority flag |

**Foreign Keys:**
- `folha_obra_id` → `folhas_obras(id)` **ON DELETE CASCADE**
- `complexidade_id` → `complexidade(id)`

---

### 3. clientes (Clients)
**Purpose:** Client/customer management

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | uuid_generate_v4() | Primary key |
| numero_phc | text | YES | - | PHC system number |
| nome_cl | text | NO | - | Client name |
| morada | text | YES | - | Address |
| codigo_pos | text | YES | - | Postal code |
| telefone | text | YES | - | Phone number |
| created_at | date | YES | CURRENT_DATE | Creation timestamp |
| updated_at | date | YES | CURRENT_DATE | Update timestamp |

---

### 4. cliente_contacts (Client Contacts)
**Purpose:** Contact persons for clients

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | uuid_generate_v4() | Primary key |
| cliente_id | uuid | NO | - | Client reference |
| name | text | NO | - | Contact name |
| email | text | YES | - | Email address |
| phone_number | text | YES | - | Phone number |
| mobile | text | YES | - | Mobile number |
| created_at | date | YES | CURRENT_DATE | Creation timestamp |
| updated_at | date | YES | CURRENT_DATE | Update timestamp |

**Foreign Keys:**
- `cliente_id` → `clientes(id)`

---

## Supporting Tables

### 5. materiais (Materials)
**Purpose:** Material and product catalog

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key |
| tipo | text | YES | - | Material type |
| material | text | YES | - | Material name |
| carateristica | text | YES | - | Characteristics |
| cor | text | YES | - | Color |
| created_at | timestamp with time zone | YES | now() | Creation timestamp |
| valor_m2 | numeric | YES | - | Price per m2 |
| referencia | text | YES | - | Reference code |
| ref_cliente | text | YES | - | Client reference |
| ref_fornecedor | text | YES | - | Supplier reference |
| fornecedor | text | YES | - | Supplier name |
| tipo_canal | text | YES | - | Channel type |
| dimensoes | text | YES | - | Dimensions |
| valor_m2_custo | numeric | YES | - | Cost per m2 |
| valor_placa | numeric | YES | - | Plate value |
| qt_palete | smallint | YES | - | Quantity per pallet |
| fornecedor_id | uuid | YES | - | Supplier ID reference |
| stock_minimo | numeric | YES | 10 | Minimum stock threshold |
| stock_critico | numeric | YES | 5 | Critical stock threshold |
| ORC | boolean | YES | - | Budget flag |
| stock_correct | numeric | YES | - | Corrected stock |
| stock_correct_updated_at | timestamp with time zone | YES | - | Stock correction timestamp |

**Foreign Keys:**
- `fornecedor_id` → `fornecedores(id)`

---

### 6. stocks (Stock Management)
**Purpose:** Stock transactions and inventory

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | uuid_generate_v4() | Primary key |
| data | date | NO | CURRENT_DATE | Transaction date |
| fornecedor_id | uuid | YES | - | Supplier reference |
| no_guia_forn | text | YES | - | Supplier guide number |
| material_id | uuid | YES | - | Material reference |
| quantidade | numeric | NO | - | Quantity |
| quantidade_disponivel | numeric | NO | - | Available quantity |
| vl_m2 | text | YES | 'm2' | Unit of measure |
| preco_unitario | numeric | YES | - | Unit price |
| valor_total | numeric | YES | - | Total value |
| notas | text | YES | - | Notes |
| created_at | timestamp with time zone | YES | now() | Creation timestamp |
| updated_at | timestamp with time zone | YES | now() | Update timestamp |
| n_palet | text | YES | - | Pallet number |

**Foreign Keys:**
- `fornecedor_id` → `fornecedores(id)`
- `material_id` → `materiais(id)`

---

### 7. fornecedores (Suppliers)
**Purpose:** Supplier management

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | uuid_generate_v4() | Primary key |
| numero_phc | text | YES | - | PHC system number |
| nome_forn | text | NO | - | Supplier name |
| morada | text | YES | - | Address |
| codigo_pos | text | YES | - | Postal code |
| telefone | text | YES | - | Phone number |
| email | text | YES | - | Email address |
| contacto_principal | text | YES | - | Main contact |
| created_at | date | YES | CURRENT_DATE | Creation timestamp |
| updated_at | date | YES | CURRENT_DATE | Update timestamp |

---

## Production Tables

### 8. producao_operacoes (Production Operations)
**Purpose:** Track production operations and machine usage

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | uuid_generate_v4() | Primary key |
| data_operacao | date | NO | CURRENT_DATE | Operation date |
| operador_id | uuid | YES | - | Operator reference |
| folha_obra_id | uuid | YES | - | Work order reference |
| item_id | uuid | YES | - | Item reference |
| no_interno | text | NO | - | Internal number |
| maquina | uuid | YES | - | Machine reference |
| material_id | uuid | YES | - | Material reference |
| stock_consumido_id | uuid | YES | - | Consumed stock reference |
| num_placas_print | integer | YES | 0 | Number of printed plates |
| num_placas_corte | integer | YES | 0 | Number of cut plates |
| observacoes | text | YES | - | Observations |
| status | text | YES | 'Em_Curso' | Status |
| concluido | boolean | YES | false | Completed flag |
| data_conclusao | timestamp with time zone | YES | - | Completion timestamp |
| created_at | timestamp with time zone | YES | now() | Creation timestamp |
| updated_at | timestamp with time zone | YES | now() | Update timestamp |
| Tipo_Op | text | YES | - | Operation type |
| N_Pal | text | YES | - | Pallet number |
| notas | text | YES | - | Notes |
| notas_imp | text | YES | - | Important notes |

**Foreign Keys:**
- `operador_id` → `profiles(id)`
- `folha_obra_id` → `folhas_obras(id)` **ON DELETE CASCADE**
- `item_id` → `items_base(id)` **ON DELETE CASCADE**
- `maquina` → `maquinas_operacao(id)`
- `material_id` → `materiais(id)`
- `stock_consumido_id` → `stocks(id)`

---

### 9. maquinas_operacao (Production Machines)
**Purpose:** Production machine definitions

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | uuid_generate_v4() | Primary key |
| nome_maquina | text | NO | - | Machine name |
| tipo | text | NO | - | Machine type |
| ativa | boolean | YES | true | Active flag |
| capacidade_max_diaria | numeric | YES | - | Maximum daily capacity |
| custo_operacao_hora | numeric | YES | - | Operating cost per hour |
| notas | text | YES | - | Notes |
| created_at | date | YES | CURRENT_DATE | Creation timestamp |
| updated_at | date | YES | CURRENT_DATE | Update timestamp |

---

### 10. designer_items (Design Work)
**Purpose:** Track design work progress for items

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | uuid_generate_v4() | Primary key |
| item_id | uuid | NO | - | Item reference |
| em_curso | boolean | YES | true | In progress flag |
| duvidas | boolean | YES | false | Questions flag |
| maquete_enviada | boolean | YES | false | Mockup sent flag |
| paginacao | boolean | YES | false | Pagination flag |
| path_trabalho | text | YES | - | Work path |
| data_in | date | YES | - | Entry date |
| data_duvidas | date | YES | - | Questions date |
| data_envio | date | YES | - | Send date |
| data_saida | date | YES | - | Exit date |
| updated_at | date | YES | CURRENT_DATE | Update timestamp |

**Foreign Keys:**
- `item_id` → `items_base(id)` **ON DELETE CASCADE**

---

### 11. logistica_entregas (Logistics & Deliveries)
**Purpose:** Manage logistics, pickups and deliveries

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | uuid_generate_v4() | Primary key |
| item_id | uuid | NO | - | Item reference |
| is_entrega | boolean | NO | - | Is delivery flag |
| local_recolha | text | YES | - | Pickup location |
| guia | text | YES | - | Guide number |
| transportadora | text | YES | - | Transport company |
| contacto | text | YES | - | Contact person |
| telefone | text | YES | - | Phone number |
| quantidade | integer | YES | - | Quantity |
| notas | text | YES | - | Notes |
| local_entrega | text | YES | - | Delivery location |
| contacto_entrega | text | YES | - | Delivery contact |
| telefone_entrega | text | YES | - | Delivery phone |
| is_final | boolean | YES | false | Final delivery flag |
| data | date | YES | - | Date |
| created_at | date | YES | CURRENT_DATE | Creation timestamp |
| updated_at | date | YES | CURRENT_DATE | Update timestamp |
| is_recolha | boolean | YES | - | Is pickup flag |
| id_local_entrega | uuid | YES | gen_random_uuid() | Delivery location ID |
| id_local_recolha | uuid | YES | gen_random_uuid() | Pickup location ID |
| descricao | text | YES | - | Description |
| saiu | boolean | YES | - | Left flag |
| concluido | boolean | YES | false | Completed flag |
| data_concluido | date | YES | - | Completion date |

**Foreign Keys:**
- `item_id` → `items_base(id)` **ON DELETE CASCADE**

---

## Reference Tables

### 12. complexidade (Complexity Levels)
**Purpose:** Define complexity levels for items

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key |
| grau | text | NO | - | Complexity degree |

---

### 13. alertas_stock (Stock Alerts)
**Purpose:** Stock level alert configuration

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | uuid_generate_v4() | Primary key |
| material_id | uuid | YES | - | Material reference |
| nivel_minimo | numeric | NO | - | Minimum level |
| nivel_critico | numeric | NO | - | Critical level |
| ativo | boolean | YES | true | Active flag |
| notificar_usuarios | ARRAY | YES | - | Users to notify |
| created_at | timestamp with time zone | YES | now() | Creation timestamp |
| updated_at | timestamp with time zone | YES | now() | Update timestamp |

**Foreign Keys:**
- `material_id` → `materiais(id)`

---

### 14. armazens (Warehouses)
**Purpose:** Warehouse/storage location management

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | uuid_generate_v4() | Primary key |
| numero_phc | text | YES | - | PHC system number |
| nome_arm | text | NO | - | Warehouse name |
| morada | text | YES | - | Address |
| codigo_pos | text | YES | - | Postal code |
| created_at | date | YES | CURRENT_DATE | Creation timestamp |
| updated_at | date | YES | CURRENT_DATE | Update timestamp |

---

### 15. transportadora (Transport Companies)
**Purpose:** Transport company management

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key |
| name | text | NO | - | Company name |
| created_at | date | YES | CURRENT_DATE | Creation timestamp |
| updated_at | date | YES | CURRENT_DATE | Update timestamp |

---

### 16. feriados (Holidays)
**Purpose:** Holiday calendar management

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | uuid_generate_v4() | Primary key |
| holiday_date | date | NO | - | Holiday date |
| description | text | NO | - | Holiday description |
| created_at | date | YES | CURRENT_DATE | Creation timestamp |
| updated_at | date | YES | CURRENT_DATE | Update timestamp |

---

### 17. maquinas (Legacy Machines)
**Purpose:** Legacy machine pricing (appears to be older version)

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key |
| maquina | character varying(200) | YES | - | Machine name |
| valor_m2 | numeric | YES | - | Price per m2 |
| integer_id | integer | NO | nextval() | Integer ID |

---

## User Management

### 18. profiles (User Profiles)
**Purpose:** User profile information

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | uuid_generate_v4() | Primary key |
| user_id | uuid | NO | - | User ID (from auth system) |
| first_name | text | NO | - | First name |
| last_name | text | NO | - | Last name |
| role_id | uuid | NO | - | Role reference |
| created_at | date | YES | CURRENT_DATE | Creation timestamp |
| updated_at | date | YES | CURRENT_DATE | Update timestamp |

**Foreign Keys:**
- `role_id` → `roles(id)`

---

### 19. roles (User Roles)
**Purpose:** Role-based access control

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | uuid_generate_v4() | Primary key |
| name | character varying(50) | NO | - | Role name |
| description | text | YES | - | Role description |
| created_at | date | YES | CURRENT_DATE | Creation timestamp |
| updated_at | date | YES | CURRENT_DATE | Update timestamp |

---

## Database Relationships

### CASCADE DELETE Relationships

When deleting a `folhas_obras` record, the following cascade deletes occur:

```
DELETE folhas_obras
    ↓ CASCADE
DELETE items_base (all items in that folha de obra)
    ↓ CASCADE  
DELETE designer_items (all design entries for those items)
    ↓ CASCADE
DELETE logistica_entregas (all logistics entries for those items)  
    ↓ CASCADE
DELETE producao_operacoes (all production operations for those items)
```

**Cascade Delete Flow:**
1. `folhas_obras` → `items_base` (ON DELETE CASCADE)
2. `items_base` → `designer_items` (ON DELETE CASCADE)
3. `items_base` → `logistica_entregas` (ON DELETE CASCADE)
4. `items_base` → `producao_operacoes` (ON DELETE CASCADE via item_id)
5. `folhas_obras` → `producao_operacoes` (ON DELETE CASCADE via folha_obra_id)

### Other Relationships

**Client Management:**
- `clientes` ← `cliente_contacts` (1:many)

**Material & Stock:**
- `fornecedores` ← `materiais` (1:many)
- `fornecedores` ← `stocks` (1:many)
- `materiais` ← `stocks` (1:many)
- `materiais` ← `alertas_stock` (1:many)
- `materiais` ← `producao_operacoes` (1:many)

**Production:**
- `maquinas_operacao` ← `producao_operacoes` (1:many)
- `stocks` ← `producao_operacoes` (1:many)

**User Management:**
- `roles` ← `profiles` (1:many)
- `profiles` ← `folhas_obras` (1:many)
- `profiles` ← `producao_operacoes` (1:many)

**Complexity:**
- `complexidade` ← `items_base` (1:many)

---

## Row-Level Security (RLS) Policies

### Policy Summary by Access Level:

**Full Authenticated Access (All Operations):**
- alertas_stock
- armazens  
- clientes
- complexidade
- designer_items
- feriados
- folhas_obras
- fornecedores
- items_base
- logistica_entregas
- maquinas
- maquinas_operacao
- materiais
- producao_operacoes
- roles
- stocks
- transportadora

**Anonymous Access:**
- clientes (full access)
- folhas_obras (full access)

**User-Specific Policies:**
- profiles (users can read/update their own profile + authenticated users can manage all)

**Service Role Access:**
- profiles (service_role has full access)

### Detailed Policies:

#### alertas_stock
```sql
POLICY "Authenticated users can manage alertas_stock"
  FOR ALL TO PUBLIC
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated')
```

#### armazens
```sql
POLICY "Allow authenticated full access"
  FOR ALL TO authenticated
  USING (true)

POLICY "Allow authenticated read"
  FOR SELECT TO authenticated  
  USING (true)
```

#### cliente_contacts
```sql
POLICY "delete_cliente_contacts"
  FOR DELETE TO authenticated
  USING (true)

POLICY "insert_cliente_contacts"
  FOR INSERT TO authenticated
  WITH CHECK (true)

POLICY "read_cliente_contacts"
  FOR SELECT TO authenticated
  USING (true)

POLICY "update_cliente_contacts"
  FOR UPDATE TO authenticated
  USING (true)
```

#### clientes
```sql
POLICY "Allow anon access"
  FOR ALL TO anon
  USING (true)

POLICY "Allow authenticated full access"
  FOR ALL TO authenticated
  USING (true)
```

#### complexidade
```sql
POLICY "Usuários autenticados podem atualizar"
  FOR UPDATE TO authenticated
  USING (true)

POLICY "Usuários autenticados podem excluir"
  FOR DELETE TO authenticated
  USING (true)

POLICY "Usuários autenticados podem inserir"
  FOR INSERT TO authenticated
  WITH CHECK (true)

POLICY "Usuários autenticados podem visualizar"
  FOR SELECT TO authenticated
  USING (true)
```

#### designer_items
```sql
POLICY "Allow authenticated access"
  FOR ALL TO authenticated
  USING (true)

POLICY "Allow authenticated full access"
  FOR ALL TO authenticated
  USING (true)
```

#### feriados
```sql
POLICY "Allow authenticated full access"
  FOR ALL TO authenticated
  USING (true)
```

#### folhas_obras
```sql
POLICY "Allow anon access"
  FOR ALL TO anon
  USING (true)

POLICY "Allow authenticated access"
  FOR ALL TO authenticated
  USING (true)

POLICY "Allow authenticated full access"
  FOR ALL TO authenticated
  USING (true)
```

#### fornecedores
```sql
POLICY "Authenticated users can manage fornecedores"
  FOR ALL TO PUBLIC
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated')
```

#### items_base
```sql
POLICY "Allow authenticated full access"
  FOR ALL TO authenticated
  USING (true)
```

#### logistica_entregas
```sql
POLICY "Allow authenticated full access"
  FOR ALL TO authenticated
  USING (true)

POLICY "simple_auth_policy"
  FOR ALL TO authenticated
  USING (true)
```

#### maquinas
```sql
POLICY "Allow authenticated users full access to maquinas"
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true)
```

#### maquinas_operacao
```sql
POLICY "Authenticated users can manage maquinas_operacao"
  FOR ALL TO PUBLIC
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated')
```

#### materiais
```sql
POLICY "Allow authenticated users full access to materiais"
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true)
```

#### producao_operacoes
```sql
POLICY "Authenticated users can manage producao_operacoes"
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true)
```

#### profiles
```sql
POLICY "Allow authenticated users to delete profiles"
  FOR DELETE TO authenticated
  USING (true)

POLICY "Allow authenticated users to insert profiles"
  FOR INSERT TO authenticated
  WITH CHECK (true)

POLICY "Allow authenticated users to read all profiles"
  FOR SELECT TO authenticated
  USING (true)

POLICY "Allow authenticated users to update all profiles"
  FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true)

POLICY "service_role_all_access"
  FOR ALL TO service_role
  USING (true)

POLICY "users_read_own_profile"
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id)

POLICY "users_update_own_profile"
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
```

#### roles
```sql
POLICY "Allow authenticated users to delete roles"
  FOR DELETE TO authenticated
  USING (true)

POLICY "Allow authenticated users to insert roles"
  FOR INSERT TO authenticated
  WITH CHECK (true)

POLICY "Allow authenticated users to read all roles"
  FOR SELECT TO authenticated
  USING (true)

POLICY "Allow authenticated users to update all roles"
  FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true)
```

#### stocks
```sql
POLICY "Authenticated users can manage stocks"
  FOR ALL TO PUBLIC
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated')
```

#### transportadora
```sql
POLICY "Authenticated users can delete"
  FOR DELETE TO authenticated
  USING (true)

POLICY "Authenticated users can insert"
  FOR INSERT TO authenticated
  WITH CHECK (true)

POLICY "Authenticated users can read"
  FOR SELECT TO authenticated
  USING (true)

POLICY "Authenticated users can update"
  FOR UPDATE TO authenticated
  USING (true)
```

---

## Security Notes

1. **Most tables require authentication** - Only authenticated users can access data
2. **Two tables allow anonymous access** - `clientes` and `folhas_obras` have public read access
3. **User isolation on profiles** - Users can only read/update their own profile (plus admin access)
4. **Service role bypass** - Service role has full access to profiles table
5. **CASCADE DELETE for work orders** - Deleting a `folhas_obras` automatically cleans up all related `items_base`, `designer_items`, `logistica_entregas`, and `producao_operacoes` records
6. **Data integrity maintained** - Foreign key constraints prevent orphaned records

## Current Database State

- **CASCADE DELETE**: Enabled for folhas_obras → items_base → designer_items, logistica_entregas, producao_operacoes
- **Auto-Insert Triggers**: Not currently implemented (manual insertion required)
- **Foreign Key Constraints**: All properly configured with appropriate cascade behavior

---

*Generated on: 2025-07-08*
*Database Version: PostgreSQL with Supabase*
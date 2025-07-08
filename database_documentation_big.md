# Database Documentation

## Table of Contents
- [Overview](#overview)
- [Tables](#tables)
- [Relationships](#relationships)
- [Row Level Security (RLS) Policies](#row-level-security-rls-policies)
- [Data Flow](#data-flow)

## Overview

This database manages a printing/design business workflow system with the following main components:
- Work order management (folhas_obras)
- Item tracking (items_base)
- Client management (clientes)
- Material and machine calculations
- Logistics and delivery tracking
- Designer workflow management
- User roles and permissions

## Tables

### Core Business Tables

#### `folhas_obras` (Work Orders)
**Description**: Work orders for design jobs

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | uuid_generate_v4() | Primary key |
| numero_fo | text | NO | - | Work order number |
| profile_id | uuid | YES | - | FK to profiles |
| nome_campanha | text | NO | - | Campaign name |
| prioridade | boolean | YES | false | Priority flag |
| data_in | date | YES | now() | Entry date |
| data_saida | date | YES | - | Exit date |
| notas | text | YES | - | Notes |
| concluido | boolean | YES | false | Completed flag |
| saiu | boolean | YES | false | Exited flag |
| fatura | boolean | YES | false | Invoiced flag |
| data_concluido | date | YES | - | Completion date |
| data_saiu | date | YES | - | Exit date |
| data_fatura | date | YES | - | Invoice date |
| numero_orc | integer | YES | - | Budget number |
| cliente | text | YES | 'null' | Client name |
| notas_prod | text | YES | - | Production notes |
| created_at | date | YES | - | Creation timestamp |
| updated_at | date | YES | - | Update timestamp |
| id_cliente | uuid | YES | gen_random_uuid() | Client ID |

#### `items_base` (Base Items)
**Description**: Individual items within work orders

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | uuid_generate_v4() | Primary key |
| folha_obra_id | uuid | NO | - | FK to folhas_obras |
| descricao | text | NO | - | Item description |
| codigo | text | YES | - | Item code |
| dad_end | boolean | YES | - | Data end flag |
| quantidade | integer | YES | - | Quantity |
| brindes | boolean | YES | false | Promotional items flag |
| concluido | boolean | YES | false | Completed flag |
| data_conc | date | YES | - | Completion date |
| created_at | date | YES | - | Creation timestamp |
| updated_at | date | YES | - | Update timestamp |
| saiu | boolean | YES | - | Exited flag |

#### `clientes` (Clients)
**Description**: Client information

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | uuid_generate_v4() | Primary key |
| numero_phc | text | YES | - | PHC number |
| nome_cl | text | NO | - | Client name |
| morada | text | YES | - | Address |
| codigo_pos | text | YES | - | Postal code |
| telefone | text | YES | - | Phone number |
| created_at | date | YES | - | Creation timestamp |
| updated_at | date | YES | - | Update timestamp |

#### `cliente_contacts` (Client Contacts)
**Description**: Stores contact information for clients

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | uuid_generate_v4() | Primary key |
| cliente_id | uuid | NO | - | FK to clientes |
| name | text | NO | - | Contact name |
| email | text | YES | - | Email address |
| phone_number | text | YES | - | Phone number |
| mobile | text | YES | - | Mobile number |
| created_at | date | YES | - | Creation timestamp |
| updated_at | date | YES | - | Update timestamp |

### Workflow Management Tables

#### `designer_items` (Designer Workflow)
**Description**: Tracks design workflow for items

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | uuid_generate_v4() | Primary key |
| item_id | uuid | NO | - | FK to items_base |
| em_curso | boolean | YES | true | In progress flag |
| duvidas | boolean | YES | false | Doubts/questions flag |
| maquete_enviada | boolean | YES | false | Mockup sent flag |
| paginacao | boolean | YES | false | Pagination flag |
| path_trabalho | text | YES | - | Work path |
| data_in | date | YES | - | Entry date |
| data_duvidas | date | YES | - | Doubts date |
| data_envio | date | YES | - | Send date |
| data_saida | date | YES | - | Exit date |
| updated_at | date | YES | - | Update timestamp |

#### `logistica_entregas` (Logistics Deliveries)
**Description**: Stores pickup and delivery information for logistics items

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | uuid_generate_v4() | Primary key |
| item_id | uuid | NO | - | FK to items_base |
| is_entrega | boolean | NO | - | Is delivery flag |
| local_recolha | text | YES | - | Pickup location |
| guia | integer | YES | - | Guide number |
| transportadora | text | YES | - | Carrier |
| contacto | text | YES | - | Contact |
| telefone | text | YES | - | Phone |
| quantidade | integer | YES | - | Quantity |
| notas | text | YES | - | Notes |
| local_entrega | text | YES | - | Delivery location |
| contacto_entrega | text | YES | - | Delivery contact |
| telefone_entrega | text | YES | - | Delivery phone |
| is_final | boolean | YES | false | Final delivery flag |
| data | date | YES | - | Date |
| created_at | date | YES | - | Creation timestamp |
| updated_at | date | YES | - | Update timestamp |
| is_recolha | boolean | YES | - | Is pickup flag |
| id_local_entrega | uuid | YES | gen_random_uuid() | Delivery location ID |
| id_local_recolha | uuid | YES | gen_random_uuid() | Pickup location ID |

### Material and Machine Tables

#### `materiais_impressao` (Printing Materials)
**Description**: Materials used for printing with pricing and usage data

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | integer | NO | nextval('materiais_impressao_id_seq') | Primary key |
| tipo | varchar(100) | YES | - | Material type |
| material | varchar(200) | YES | - | Material name |
| caracteristica | varchar(300) | YES | - | Characteristics |
| cor | varchar(100) | YES | - | Color |
| quantidade_2023 | integer | YES | - | 2023 quantity |
| quantidade_2024 | integer | YES | - | 2024 quantity |
| valor_2023 | numeric | YES | - | 2023 value |
| valor_2024 | numeric | YES | - | 2024 value |
| media_m2_2023 | numeric | YES | - | 2023 average per m² |
| media_m2_2024 | numeric | YES | - | 2024 average per m² |
| percentual_variacao_quantidade | numeric | YES | - | Quantity variation % |
| percentual_variacao_valor | numeric | YES | - | Value variation % |
| percentual_variacao_media_m2 | numeric | YES | - | M² average variation % |
| percentual_quantidade | numeric | YES | - | Quantity percentage |
| percentual_valor | numeric | YES | - | Value percentage |
| percentual_media_m2 | numeric | YES | - | M² average percentage |

#### `maquinas` (Machines)
**Description**: Printing machines and their rates

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | uuid_generate_v4() | Primary key |
| maquina | varchar(200) | YES | - | Machine name |
| valor_m2 | numeric | YES | - | Rate per m² |
| integer_id | integer | NO | nextval('maquinas_integer_id_seq') | Integer ID |

#### `materials` (Materials Catalog)
**Description**: General materials catalog

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key |
| tipo | text | YES | - | Material type |
| material | text | YES | - | Material name |
| carateristica | text | YES | - | Characteristics |
| cor | text | YES | - | Color |
| created_at | timestamp with time zone | YES | now() | Creation timestamp |
| valor_m2 | numeric | YES | - | Rate per m² |

#### `calculo_materiais` (Material Calculations)
**Description**: Material cost calculations for projects

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | uuid_generate_v4() | Primary key |
| material1_id | integer | YES | - | FK to materiais_impressao |
| material1_tipo | varchar(50) | YES | - | Material 1 type |
| material1_material | varchar(100) | YES | - | Material 1 name |
| material1_caracteristica | varchar(100) | YES | - | Material 1 characteristics |
| material1_cor | varchar(50) | YES | - | Material 1 color |
| material1_valor_m2 | numeric | YES | - | Material 1 rate per m² |
| material2_tipo | varchar(50) | YES | - | Material 2 type |
| material2_material | varchar(100) | YES | - | Material 2 name |
| material2_caracteristica | varchar(100) | YES | - | Material 2 characteristics |
| material2_cor | varchar(50) | YES | - | Material 2 color |
| material2_valor_m2 | numeric | YES | - | Material 2 rate per m² |
| material3_tipo | varchar(50) | YES | - | Material 3 type |
| material3_material | varchar(100) | YES | - | Material 3 name |
| material3_caracteristica | varchar(100) | YES | - | Material 3 characteristics |
| material3_cor | varchar(50) | YES | - | Material 3 color |
| material3_valor_m2 | numeric | YES | - | Material 3 rate per m² |
| maquina_id | integer | YES | - | Machine ID |
| maquina_nome | varchar(100) | YES | - | Machine name |
| maquina_valor_m2 | numeric | YES | - | Machine rate per m² |
| metros_quadrados | numeric | YES | - | Square meters |
| custo_total_materiais | numeric | YES | - | Total materials cost |
| custo_total_maquina | numeric | YES | - | Total machine cost |
| custo_liquido_total | numeric | YES | - | Total net cost |
| margem | numeric | YES | - | Margin |
| preco_final | numeric | YES | - | Final price |
| preco_atual | numeric | YES | - | Current price |
| notas | text | YES | - | Notes |
| calculation_id | varchar(100) | YES | - | Calculation ID |
| diferenca_percentual | numeric | YES | - | Percentage difference |
| maquina_uuid | uuid | YES | - | FK to maquinas |
| material2_id | integer | YES | - | FK to materiais_impressao |
| material3_id | integer | YES | - | FK to materiais_impressao |
| is4_4 | boolean | YES | - | Is 4x4 flag |

### Supporting Material Tables

#### `colas` (Glues)
**Description**: Glue materials with usage data

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | uuid_generate_v4() | Primary key |
| Tipo | varchar(100) | YES | - | Type |
| Material | varchar(200) | YES | - | Material |
| QT 2023 | integer | YES | - | 2023 quantity |
| QT 2024 | integer | YES | - | 2024 quantity |
| VL 2023 | numeric | YES | - | 2023 value |
| VL 2024 | numeric | YES | - | 2024 value |
| percentual_variacao_quantidade | numeric | YES | - | Quantity variation % |
| percentual_variacao_valor | numeric | YES | - | Value variation % |

#### `fitas_adesivas` (Adhesive Tapes)
**Description**: Adhesive tape materials with usage statistics

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | uuid_generate_v4() | Primary key |
| tipo | varchar(100) | YES | - | Type |
| material | varchar(200) | YES | - | Material |
| caracteristica | varchar(300) | YES | - | Characteristics |
| cor | varchar(100) | YES | - | Color |
| quantidade_2023 | integer | YES | - | 2023 quantity |
| quantidade_2024 | integer | YES | - | 2024 quantity |
| valor_2023 | numeric | YES | - | 2023 value |
| valor_2024 | numeric | YES | - | 2024 value |
| media_ml_2023 | numeric | YES | - | 2023 average per ml |
| media_ml_2024 | numeric | YES | - | 2024 average per ml |
| percentual_variacao_quantidade | numeric | YES | - | Quantity variation % |
| percentual_variacao_valor | numeric | YES | - | Value variation % |
| percentual_variacao_media_ml | numeric | YES | - | ML average variation % |

#### `embalamento` (Packaging)
**Description**: Packaging materials

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | uuid_generate_v4() | Primary key |
| tipo | varchar(100) | YES | - | Type |
| material | varchar(200) | YES | - | Material |
| caracteristica | varchar(200) | YES | - | Characteristics |
| quantidade_2024 | integer | YES | - | 2024 quantity |
| valor_2024 | numeric | YES | - | 2024 value |
| media_vl_unit_2024 | numeric | YES | - | 2024 unit average value |

#### `outros` (Others)
**Description**: Other miscellaneous materials

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | uuid_generate_v4() | Primary key |
| tipo | varchar(100) | YES | - | Type |
| material | varchar(200) | YES | - | Material |
| caracteristica | varchar(300) | YES | - | Characteristics |
| quantidade_2023 | integer | YES | - | 2023 quantity |
| quantidade_2024 | integer | YES | - | 2024 quantity |
| valor_2023 | numeric | YES | - | 2023 value |
| valor_2024 | numeric | YES | - | 2024 value |
| media_vl_unit_2023 | numeric | YES | - | 2023 unit average value |
| media_vl_unit_2024 | numeric | YES | - | 2024 unit average value |

### User Management Tables

#### `profiles` (User Profiles)
**Description**: User profile information

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | uuid_generate_v4() | Primary key |
| user_id | uuid | NO | - | User ID |
| first_name | text | NO | - | First name |
| last_name | text | NO | - | Last name |
| role_id | uuid | NO | - | FK to roles |
| created_at | date | YES | - | Creation timestamp |
| updated_at | date | YES | - | Update timestamp |

#### `roles` (User Roles)
**Description**: System roles

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | uuid_generate_v4() | Primary key |
| name | varchar(50) | NO | - | Role name |
| description | text | YES | - | Role description |
| created_at | date | YES | - | Creation timestamp |
| updated_at | date | YES | - | Update timestamp |

### Supporting Tables

#### `armazens` (Warehouses)
**Description**: Warehouse information

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | uuid_generate_v4() | Primary key |
| numero_phc | text | YES | - | PHC number |
| nome_arm | text | NO | - | Warehouse name |
| morada | text | YES | - | Address |
| codigo_pos | text | YES | - | Postal code |
| created_at | date | YES | - | Creation timestamp |
| updated_at | date | YES | - | Update timestamp |

#### `feriados` (Holidays)
**Description**: Holiday calendar

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | uuid_generate_v4() | Primary key |
| holiday_date | date | NO | - | Holiday date |
| description | text | NO | - | Holiday description |
| created_at | date | YES | - | Creation timestamp |
| updated_at | date | YES | - | Update timestamp |

#### `complexidade` (Complexity)
**Description**: Complexity levels

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key |
| grau | text | NO | - | Complexity degree |

#### `transportadora` (Carriers)
**Description**: Delivery carriers

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key |
| name | text | NO | - | Carrier name |
| created_at | date | YES | - | Creation timestamp |
| updated_at | date | YES | - | Update timestamp |

### Temporary/Calculation Tables

#### `jobs_temp` (Temporary Jobs)
**Description**: Temporary job storage for calculations

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | uuid_generate_v4() | Primary key |
| job_name | text | NO | - | Job name |
| created_at | timestamp with time zone | YES | now() | Creation timestamp |

#### `tems_temp` (Temporary Items)
**Description**: Temporary items for calculations

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | uuid_generate_v4() | Primary key |
| job_id | uuid | YES | - | FK to jobs_temp |
| machine_id | uuid | YES | - | FK to maquinas |
| material1_id | uuid | YES | - | Material 1 ID |
| material2_id | uuid | YES | - | Material 2 ID |
| material3_id | uuid | YES | - | Material 3 ID |
| width_numeric | numeric | YES | - | Width |
| height_numeric | numeric | YES | - | Height |
| unit | text | YES | - | Unit |
| quantity | integer | YES | 1 | Quantity |
| area_m2 | numeric | YES | - | Area in m² |
| rate_m2_total | numeric | YES | - | Total rate per m² |
| cost_item | numeric | YES | - | Item cost |
| created_at | timestamp with time zone | YES | now() | Creation timestamp |
| nome_item | text | YES | - | Item name |
| n_cores | boolean | YES | - | Number of colors |

### Mapping Tables

#### `maquinas_id_mapping` (Machine ID Mapping)
**Description**: Maps machine UUIDs to integer IDs

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| uuid_id | uuid | NO | - | UUID identifier |
| integer_id | integer | YES | - | Integer identifier |

#### `materiais_impressao_id_mapping` (Material ID Mapping)
**Description**: Maps material UUIDs to integer IDs

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| old_uuid | uuid | NO | - | Old UUID identifier |
| new_id | integer | YES | - | New integer identifier |

## Relationships

### Primary Relationships

```
folhas_obras (1) ←→ (N) items_base
├── ON DELETE CASCADE

items_base (1) ←→ (N) designer_items
├── ON DELETE CASCADE

items_base (1) ←→ (N) logistica_entregas
├── ON DELETE CASCADE

clientes (1) ←→ (N) cliente_contacts
├── ON DELETE CASCADE

profiles (N) ←→ (1) roles
├── FK: profiles.role_id → roles.id

profiles (1) ←→ (N) folhas_obras
├── FK: folhas_obras.profile_id → profiles.id

maquinas (1) ←→ (N) calculo_materiais
├── FK: calculo_materiais.maquina_uuid → maquinas.id

materiais_impressao (1) ←→ (N) calculo_materiais
├── FK: calculo_materiais.material1_id → materiais_impressao.id
├── FK: calculo_materiais.material2_id → materiais_impressao.id
├── FK: calculo_materiais.material3_id → materiais_impressao.id

jobs_temp (1) ←→ (N) tems_temp
├── FK: tems_temp.job_id → jobs_temp.id

maquinas (1) ←→ (N) tems_temp
├── FK: tems_temp.machine_id → maquinas.id
```

### Cascade Deletion Rules

When deleting records, the following cascade rules apply:

1. **folhas_obras deletion** → cascades to:
   - All related `items_base` records
   - All related `designer_items` records (via items_base)
   - All related `logistica_entregas` records (via items_base)

2. **items_base deletion** → cascades to:
   - All related `designer_items` records
   - All related `logistica_entregas` records

3. **clientes deletion** → cascades to:
   - All related `cliente_contacts` records

## Row Level Security (RLS) Policies

### Authentication-Based Policies

#### `armazens` (Warehouses)
- **Allow authenticated full access**: All operations for authenticated users
- **Allow authenticated read**: Read access for authenticated users

#### `clientes` (Clients)
- **Allow authenticated full access**: All operations for authenticated users
- **Allow authenticated read**: Read access for authenticated users
- **Allow anon access**: All operations for anonymous users

#### `cliente_contacts` (Client Contacts)
- **read_cliente_contacts**: Read access for authenticated users
- **insert_cliente_contacts**: Insert access for authenticated users
- **update_cliente_contacts**: Update access for authenticated users
- **delete_cliente_contacts**: Delete access for authenticated users

#### `designer_items` (Designer Items)
- **Allow authenticated full access**: All operations for authenticated users
- **Allow authenticated read**: Read access for authenticated users
- **Allow authenticated access**: All operations for authenticated users

#### `feriados` (Holidays)
- **Allow authenticated full access**: All operations for authenticated users
- **Allow authenticated read**: Read access for authenticated users

#### `folhas_obras` (Work Orders)
- **Allow authenticated full access**: All operations for authenticated users
- **Allow anon access**: All operations for anonymous users
- **Allow authenticated access**: All operations for authenticated users
- **Admin full access**: Full access for users with Admin role

#### `items_base` (Base Items)
- **Allow authenticated full access**: All operations for authenticated users
- **Allow authenticated read**: Read access for authenticated users

#### `logistica_entregas` (Logistics Deliveries)
- **Allow authenticated full access**: All operations for authenticated users
- **simple_auth_policy**: All operations for authenticated users

#### `complexidade` (Complexity)
- **Usuários autenticados podem visualizar**: Read access for authenticated users
- **Usuários autenticados podem inserir**: Insert access for authenticated users
- **Usuários autenticados podem atualizar**: Update access for authenticated users
- **Usuários autenticados podem excluir**: Delete access for authenticated users

#### `materials` (Materials)
- **Users can view all materials**: Read access for authenticated users
- **Users can insert materials**: Insert access for authenticated users
- **Users can update materials**: Update access for authenticated users
- **Users can delete materials**: Delete access for authenticated users
- **Allow public read access for anon**: Read access for anonymous users
- **Allow anon select**: Read access for anonymous users

#### `transportadora` (Carriers)
- **Authenticated users can insert**: Insert access for authenticated users
- **Authenticated users can update**: Update access for authenticated users
- **Authenticated users can delete**: Delete access for authenticated users
- **Authenticated users can read**: Read access for authenticated users

### Anonymous Access Policies

#### `jobs_temp` (Temporary Jobs)
- **Allow anon to insert jobs**: Anonymous users can insert jobs
- **Validate job name on insert**: Validates job name is not null or empty
- **Allow public read access for anon**: Read access for anonymous users
- **Allow anon select**: Read access for anonymous users

#### `maquinas` (Machines)
- **Allow public read access for anon**: Read access for anonymous users
- **Allow anon select**: Read access for anonymous users

#### `tems_temp` (Temporary Items)
- **Allow anon to select**: Read access for anonymous users
- **Allow anon to insert**: Insert access with validation for required fields
- **Allow anon to delete**: Delete access for anonymous users
- **Allow anon to update**: Update access for anonymous users

### Role-Based Policies

#### `profiles` (User Profiles)
- **admin_access_profiles**: Full access for specific admin user
- **read_designer_profiles**: Read access for Designer role users
- **service_role_all_access**: Full access for service role
- **users_read_own_profile**: Users can read their own profile
- **users_update_own_profile**: Users can update their own profile

## Data Flow

### Work Order Lifecycle

1. **Creation**: `folhas_obras` record created
2. **Items**: Multiple `items_base` records added to work order
3. **Design Phase**: `designer_items` records track design workflow
4. **Logistics**: `logistica_entregas` records manage pickup/delivery
5. **Completion**: Status flags updated throughout process

### Material Calculation Flow

1. **Selection**: Materials and machines selected
2. **Calculation**: `calculo_materiais` or `tems_temp` used for cost calculation
3. **Pricing**: Final pricing determined with margins

### User Access Flow

1. **Authentication**: Users authenticate via Supabase Auth
2. **Profile**: User profile links to role
3. **Authorization**: RLS policies enforce role-based access
4. **Operations**: Users perform operations based on permissions

### Temporary Data Flow

1. **Job Creation**: `jobs_temp` created for calculation session
2. **Item Addition**: `tems_temp` records added with materials/machines
3. **Calculation**: Costs calculated based on selections
4. **Cleanup**: Temporary records cleaned up after session
# Database-Level Filtering Implementation Guide

This guide explains how to implement efficient database-level filtering for any table in your application instead of client-side filtering, ensuring you can search across your entire dataset without loading all records first.

## 🔍 Problem with Client-Side Filtering

**Before (Client-Side - BAD):**
```javascript
// 1. Load limited records with simple pagination
const { data } = await supabase
  .from("table_name")
  .select("*")
  .range(0, 49); // Only first 50 records

// 2. Filter in browser memory
const filtered = data.filter(item => 
  item.name.includes(searchTerm) // Only searches loaded 50 records!
);
```

**Issues:**
- ❌ Only searches currently loaded records
- ❌ Can miss results that exist in database but aren't loaded yet
- ❌ User must click "Load More" multiple times to find records
- ❌ Inefficient: downloads unnecessary data
- ❌ Poor user experience: incomplete search results

## ✅ Solution: Database-Level Filtering

**After (Database-Level - GOOD):**
```javascript
// 1. Build dynamic query with filters
let query = supabase.from("table_name").select("*");

if (searchTerm) {
  query = query.ilike('name', `%${searchTerm}%`);
}

// 2. Only matching records are downloaded
const { data } = await query.range(0, 49);
```

**Benefits:**
- ✅ Searches entire database instantly
- ✅ Only downloads relevant results
- ✅ Much faster and more efficient
- ✅ True global search capability
- ✅ Better user experience
- ✅ Scales to millions of records

## 🏗️ Implementation Patterns

### Pattern 1: Simple Table with Basic Filters
**Example: Clientes, Fornecedores, Materiais, etc.**

```javascript
const fetchClientes = useCallback(async (page = 0, reset = false, filters = {}) => {
  let query = supabase
    .from("clientes")
    .select("*", { count: 'exact' });
  
  // Text search in name
  if (filters.nome?.trim()) {
    query = query.ilike('nome_cl', `%${filters.nome.trim()}%`);
  }
  
  // Filter by active status
  if (filters.ativo !== undefined) {
    query = query.eq('ativo', filters.ativo);
  }
  
  const { data, count } = await query
    .order('nome_cl', { ascending: true })
    .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
  
  setClientes(prev => reset ? data : [...prev, ...data]);
  setHasMore(count > (page + 1) * PAGE_SIZE);
}, []);
```

### Pattern 2: Complex Table with Related Data Filtering
**Example: Production Jobs with Item Search**

```javascript
const fetchJobs = useCallback(async (page = 0, reset = false, filters = {}) => {
  let query = supabase.from("folhas_obras").select("*", { count: 'exact' });
  let jobIds = null;
  
  // STEP 1: Handle item-based filtering first (global search)
  if (filters.itemSearch?.trim() || filters.codigoSearch?.trim()) {
    console.log('🔍 Item search detected - searching globally');
    
    const searchTerms = [];
    if (filters.itemSearch?.trim()) searchTerms.push(filters.itemSearch.trim());
    if (filters.codigoSearch?.trim()) searchTerms.push(filters.codigoSearch.trim());
    
    let allJobIds = [];
    
    for (const term of searchTerms) {
      const { data: itemData } = await supabase
        .from('items_base')
        .select('folha_obra_id')
        .or(`descricao.ilike.%${term}%,codigo.ilike.%${term}%`);
      
      if (itemData) {
        const jobIdsForTerm = itemData.map(item => item.folha_obra_id);
        allJobIds = [...allJobIds, ...jobIdsForTerm];
      }
    }
    
    if (allJobIds.length > 0) {
      const uniqueJobIds = Array.from(new Set(allJobIds));
      query = query.in('id', uniqueJobIds);
      jobIds = uniqueJobIds;
    } else {
      // No items found, return empty
      setJobs(prev => reset ? [] : prev);
      return;
    }
  }
  
  // STEP 2: Apply other filters only if no item search
  if (!jobIds) {
    if (filters.numeroFO?.trim()) {
      query = query.ilike('numero_fo', `%${filters.numeroFO.trim()}%`);
    }
    
    if (filters.campanha?.trim()) {
      query = query.ilike('nome_campanha', `%${filters.campanha.trim()}%`);
    }
    
    if (filters.cliente?.trim()) {
      query = query.ilike('cliente', `%${filters.cliente.trim()}%`);
    }
    
    if (filters.activeTab === 'concluidos') {
      query = query.or(`data_concluido.gte.${twoMonthsAgo},updated_at.gte.${twoMonthsAgo}`);
    }
  }
  
  // STEP 3: Pagination (skip if item search found specific jobs)
  if (!jobIds) {
    query = query.range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
  }
  
  const { data, count } = await query.order('created_at', { ascending: false });
  
  setJobs(prev => reset ? data : [...prev, ...data]);
  setHasMore(!jobIds && count > (page + 1) * PAGE_SIZE);
}, []);
```

### Pattern 3: Multi-Table Search with Joins
**Example: Search across related tables**

```javascript
const fetchWithJoins = useCallback(async (filters = {}) => {
  let query = supabase
    .from("main_table")
    .select(`
      *,
      related_table:related_table_id(name, description),
      another_table:another_id(code, value)
    `, { count: 'exact' });
  
  // Search in main table
  if (filters.mainSearch?.trim()) {
    query = query.ilike('name', `%${filters.mainSearch.trim()}%`);
  }
  
  // Search in related table (requires subquery approach)
  if (filters.relatedSearch?.trim()) {
    const { data: relatedIds } = await supabase
      .from('related_table')
      .select('id')
      .ilike('name', `%${filters.relatedSearch.trim()}%`);
    
    if (relatedIds?.length > 0) {
      query = query.in('related_table_id', relatedIds.map(r => r.id));
    } else {
      return { data: [], count: 0 }; // No matches
    }
  }
  
  return await query.order('created_at', { ascending: false });
}, []);
```

## 🛠️ Generic Implementation Template

Here's a reusable hook you can adapt for any table:

```javascript
// hooks/useFilteredTable.js
export function useFilteredTable(config) {
  const {
    tableName,
    selectQuery = "*",
    orderBy = { column: 'created_at', ascending: false },
    pageSize = 50,
    filterMappings = {}, // { filterKey: { column: 'db_column', type: 'ilike|eq|gte|lte' } }
    relatedSearches = [], // [{ filterKey: 'item_search', table: 'items', column: 'description', joinColumn: 'parent_id' }]
    onError = console.error
  } = config;

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);
  const [filters, setFilters] = useState({});
  
  const debouncedFilters = useDebounce(filters, 300);
  
  const fetchData = useCallback(async (page = 0, reset = false, filterParams = {}) => {
    setLoading(true);
    try {
      let query = supabase.from(tableName).select(selectQuery, { count: 'exact' });
      let specificIds = null;
      
      // Handle related table searches first
      for (const relatedSearch of relatedSearches) {
        const filterValue = filterParams[relatedSearch.filterKey]?.trim();
        if (filterValue) {
          const { data: relatedData } = await supabase
            .from(relatedSearch.table)
            .select(relatedSearch.joinColumn)
            .ilike(relatedSearch.column, `%${filterValue}%`);
          
          if (relatedData?.length > 0) {
            const ids = relatedData.map(item => item[relatedSearch.joinColumn]);
            query = query.in('id', ids);
            specificIds = ids;
          } else {
            setData(prev => reset ? [] : prev);
            setHasMore(false);
            return;
          }
        }
      }
      
      // Apply direct column filters only if no related search
      if (!specificIds) {
        Object.entries(filterParams).forEach(([filterKey, value]) => {
          if (value !== undefined && value !== null && value !== '' && filterMappings[filterKey]) {
            const mapping = filterMappings[filterKey];
            const cleanValue = typeof value === 'string' ? value.trim() : value;
            
            switch (mapping.type) {
              case 'ilike':
                query = query.ilike(mapping.column, `%${cleanValue}%`);
                break;
              case 'eq':
                query = query.eq(mapping.column, cleanValue);
                break;
              case 'gte':
                query = query.gte(mapping.column, cleanValue);
                break;
              case 'lte':
                query = query.lte(mapping.column, cleanValue);
                break;
              case 'or':
                query = query.or(mapping.condition.replace('{{value}}', cleanValue));
                break;
            }
          }
        });
      }
      
      // Apply ordering
      query = query.order(orderBy.column, { ascending: orderBy.ascending });
      
      // Apply pagination only if no specific IDs
      if (!specificIds) {
        query = query.range(page * pageSize, (page + 1) * pageSize - 1);
      }
      
      const { data: results, count, error } = await query;
      
      if (error) throw error;
      
      setData(prev => reset ? results : [...prev, ...results]);
      setHasMore(!specificIds && count > (page + 1) * pageSize);
      setCurrentPage(page);
    } catch (error) {
      onError('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  }, [tableName, selectQuery, orderBy, pageSize, filterMappings, relatedSearches]);
  
  // Trigger search when filters change
  useEffect(() => {
    setCurrentPage(0);
    setHasMore(true);
    fetchData(0, true, debouncedFilters);
  }, [debouncedFilters, fetchData]);
  
  const loadMore = useCallback(() => {
    if (!loading && hasMore) {
      fetchData(currentPage + 1, false, debouncedFilters);
    }
  }, [loading, hasMore, currentPage, debouncedFilters, fetchData]);
  
  return {
    data,
    loading,
    hasMore,
    loadMore,
    filters,
    setFilters,
    refresh: () => fetchData(0, true, debouncedFilters)
  };
}
```

## 📋 Usage Examples

### Example 1: Simple Clientes Page
```javascript
// pages/clientes/page.tsx
const ClientesPage = () => {
  const {
    data: clientes,
    loading,
    hasMore,
    loadMore,
    filters,
    setFilters
  } = useFilteredTable({
    tableName: 'clientes',
    selectQuery: 'id, nome_cl, email, telefone, ativo',
    orderBy: { column: 'nome_cl', ascending: true },
    filterMappings: {
      nome: { column: 'nome_cl', type: 'ilike' },
      email: { column: 'email', type: 'ilike' },
      ativo: { column: 'ativo', type: 'eq' }
    }
  });

  return (
    <div>
      <Input
        placeholder="Buscar por nome"
        value={filters.nome || ''}
        onChange={(e) => setFilters({...filters, nome: e.target.value})}
      />
      <Input
        placeholder="Buscar por email"
        value={filters.email || ''}
        onChange={(e) => setFilters({...filters, email: e.target.value})}
      />
      <Select
        value={filters.ativo}
        onValueChange={(value) => setFilters({...filters, ativo: value})}
      >
        <SelectItem value={undefined}>Todos</SelectItem>
        <SelectItem value={true}>Ativos</SelectItem>
        <SelectItem value={false}>Inativos</SelectItem>
      </Select>
      
      {/* Render clientes */}
      {clientes.map(cliente => (
        <div key={cliente.id}>{cliente.nome_cl}</div>
      ))}
      
      {hasMore && <Button onClick={loadMore}>Carregar Mais</Button>}
    </div>
  );
};
```

### Example 2: Complex Production Page with Item Search
```javascript
// pages/producao/page.tsx
const ProducaoPage = () => {
  const {
    data: jobs,
    loading,
    hasMore,
    loadMore,
    filters,
    setFilters
  } = useFilteredTable({
    tableName: 'folhas_obras',
    selectQuery: 'id, numero_fo, nome_campanha, cliente, created_at',
    orderBy: { column: 'created_at', ascending: false },
    filterMappings: {
      numeroFO: { column: 'numero_fo', type: 'ilike' },
      campanha: { column: 'nome_campanha', type: 'ilike' },
      cliente: { column: 'cliente', type: 'ilike' },
      concluidos: { 
        column: 'data_concluido', 
        type: 'or',
        condition: 'data_concluido.gte.{{value}},updated_at.gte.{{value}}'
      }
    },
    relatedSearches: [
      {
        filterKey: 'itemSearch',
        table: 'items_base',
        column: 'descricao',
        joinColumn: 'folha_obra_id'
      },
      {
        filterKey: 'codigoSearch',
        table: 'items_base', 
        column: 'codigo',
        joinColumn: 'folha_obra_id'
      }
    ]
  });

  return (
    <div>
      <Input
        placeholder="Buscar item"
        value={filters.itemSearch || ''}
        onChange={(e) => setFilters({...filters, itemSearch: e.target.value})}
      />
      <Input
        placeholder="Buscar código"
        value={filters.codigoSearch || ''}
        onChange={(e) => setFilters({...filters, codigoSearch: e.target.value})}
      />
      {/* More filters... */}
    </div>
  );
};
```

## 🔧 Common Filter Patterns

### Text Search (Case-Insensitive)
```javascript
filterMappings: {
  name: { column: 'name', type: 'ilike' },
  description: { column: 'description', type: 'ilike' }
}
```

### Exact Match
```javascript
filterMappings: {
  status: { column: 'status', type: 'eq' },
  categoryId: { column: 'category_id', type: 'eq' }
}
```

### Boolean Filters
```javascript
filterMappings: {
  isActive: { column: 'active', type: 'eq' }
}

// In component:
<Select onValueChange={(value) => setFilters({...filters, isActive: value === 'true'})}>
  <SelectItem value={undefined}>Todos</SelectItem>
  <SelectItem value="true">Ativos</SelectItem>
  <SelectItem value="false">Inativos</SelectItem>
</Select>
```

### Date Range Filters
```javascript
filterMappings: {
  startDate: { column: 'created_at', type: 'gte' },
  endDate: { column: 'created_at', type: 'lte' }
}
```

### Complex OR Conditions
```javascript
filterMappings: {
  globalSearch: { 
    column: 'multi', 
    type: 'or',
    condition: 'name.ilike.%{{value}}%,description.ilike.%{{value}}%,code.ilike.%{{value}}%'
  }
}
```

### Related Table Search
```javascript
relatedSearches: [
  {
    filterKey: 'supplierName',
    table: 'suppliers',
    column: 'name',
    joinColumn: 'supplier_id'
  }
]
```

## 🚀 Performance Best Practices

### 1. Database Indexes
Ensure filtered columns have indexes:
```sql
-- For text searches
CREATE INDEX idx_clientes_nome ON clientes USING gin(nome_cl gin_trgm_ops);
CREATE INDEX idx_items_descricao ON items_base USING gin(descricao gin_trgm_ops);

-- For exact matches
CREATE INDEX idx_jobs_status ON folhas_obras(status);
CREATE INDEX idx_items_folha_obra ON items_base(folha_obra_id);

-- For date ranges
CREATE INDEX idx_jobs_created ON folhas_obras(created_at);
```

### 2. Optimize Select Queries
Only fetch needed columns:
```javascript
selectQuery: 'id, name, status, created_at' // Instead of '*'
```

### 3. Use Debounced Values
Prevent excessive API calls:
```javascript
const debouncedSearch = useDebounce(searchTerm, 300);
```

### 4. Handle Empty Results Gracefully
```javascript
if (data.length === 0 && !loading) {
  return <EmptyState message="Nenhum resultado encontrado" />;
}
```

## 🎯 Migration Checklist for Existing Pages

- [ ] **Identify current client-side filtering** - Look for `.filter()` calls on arrays
- [ ] **Map filter inputs to database columns** - Create filterMappings object
- [ ] **Identify related table searches** - Map to relatedSearches array
- [ ] **Update fetch function** - Use database-level filtering pattern
- [ ] **Remove client-side filtering** - Delete `.filter()` calls
- [ ] **Add debounced filter values** - Improve performance
- [ ] **Update pagination logic** - Reset page on filter change
- [ ] **Test search functionality** - Verify it searches entire dataset
- [ ] **Add database indexes** - For filtered columns
- [ ] **Update "Load More" function** - Maintain active filters

## 📊 Before vs After Comparison

| Aspect | Client-Side Filtering | Database-Level Filtering |
|--------|----------------------|-------------------------|
| **Search Scope** | Only loaded records | Entire database |
| **Performance** | Downloads all data | Downloads only matches |
| **Scalability** | Poor (slows with data growth) | Excellent (database optimized) |
| **User Experience** | Frustrating (incomplete results) | Great (instant global search) |
| **Network Usage** | High (unnecessary data) | Low (relevant data only) |
| **Memory Usage** | High (stores all records) | Low (stores only visible data) |

This pattern ensures efficient, scalable filtering that works across your entire dataset for any table in your application! 
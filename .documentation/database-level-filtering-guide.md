# Database-Level Filtering Implementation Guide

This guide explains how to implement efficient database-level filtering for tables instead of client-side filtering, ensuring you can search across your entire dataset without loading all records first.

## 🔍 Problem with Client-Side Filtering

**Before (Client-Side):**
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

## ✅ Solution: Database-Level Filtering

**After (Database-Level):**
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

## 📋 Implementation Steps

### 1. Modify Fetch Function

**Before:**
```javascript
const fetchData = useCallback(async (page = 0, reset = false) => {
  const { data } = await supabase
    .from("table_name")
    .select("*")
    .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
  
  setData(prev => reset ? data : [...prev, ...data]);
}, []);
```

**After:**
```javascript
const fetchData = useCallback(async (page = 0, reset = false, filters = {}) => {
  // Build dynamic query
  let query = supabase
    .from("table_name")
    .select("*", { count: 'exact' });
  
  // Apply filters
  if (filters.name?.trim()) {
    query = query.ilike('name', `%${filters.name.trim()}%`);
  }
  
  if (filters.category?.trim()) {
    query = query.ilike('category', `%${filters.category.trim()}%`);
  }
  
  if (filters.status !== undefined) {
    query = query.eq('active', filters.status);
  }
  
  // Apply pagination and ordering
  const { data, count } = await query
    .order('created_at', { ascending: false })
    .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
  
  setData(prev => reset ? data : [...prev, ...data]);
  setHasMore(count > (page + 1) * PAGE_SIZE);
}, []);
```

### 2. Add Filter State Management

```javascript
// Filter state
const [nameFilter, setNameFilter] = useState("");
const [categoryFilter, setCategoryFilter] = useState("");
const [statusFilter, setStatusFilter] = useState(undefined);

// Debounced values for performance
const debouncedName = useDebounce(nameFilter, 300);
const debouncedCategory = useDebounce(categoryFilter, 300);

// Trigger search when filters change
useEffect(() => {
  // Reset pagination and search with filters
  setCurrentPage(0);
  setHasMore(true);
  
  fetchData(0, true, {
    name: debouncedName,
    category: debouncedCategory,
    status: statusFilter
  });
}, [debouncedName, debouncedCategory, statusFilter, fetchData]);
```

### 3. Update Load More Function

```javascript
const loadMore = useCallback(() => {
  if (!loading && hasMore) {
    fetchData(currentPage + 1, false, {
      name: debouncedName,
      category: debouncedCategory,
      status: statusFilter
    });
  }
}, [loading, hasMore, currentPage, debouncedName, debouncedCategory, statusFilter]);
```

### 4. Remove Client-Side Filtering

**Before:**
```javascript
const filtered = useMemo(() => {
  return data.filter(item => 
    item.name.includes(nameFilter) &&
    item.category.includes(categoryFilter)
  );
}, [data, nameFilter, categoryFilter]);
```

**After:**
```javascript
// Data is already filtered by database
const filtered = data;
```

## 🔧 Common Filter Patterns

### Text Search (Case-Insensitive)
```javascript
if (filters.searchTerm?.trim()) {
  query = query.ilike('field_name', `%${filters.searchTerm.trim()}%`);
}
```

### Exact Match
```javascript
if (filters.status !== undefined) {
  query = query.eq('status', filters.status);
}
```

### Boolean Filters
```javascript
if (filters.isActive !== undefined) {
  if (filters.isActive) {
    query = query.eq('active', true);
  } else {
    query = query.or('active.is.null,active.eq.false');
  }
}
```

### Date Range Filters
```javascript
if (filters.startDate) {
  query = query.gte('created_at', filters.startDate);
}

if (filters.endDate) {
  query = query.lte('created_at', filters.endDate);
}
```

### Related Table Filtering
```javascript
// For filtering by related table data (e.g., items within jobs)
if (filters.itemName?.trim()) {
  // First, find matching items
  const { data: matchingItems } = await supabase
    .from('items')
    .select('parent_id')
    .ilike('name', `%${filters.itemName.trim()}%`);
  
  if (matchingItems?.length > 0) {
    const parentIds = matchingItems.map(item => item.parent_id);
    query = query.in('id', parentIds);
  } else {
    // No matching items found, return empty result
    return { data: [], count: 0 };
  }
}
```

### Multiple OR Conditions
```javascript
// Search in multiple fields
if (filters.globalSearch?.trim()) {
  const search = filters.globalSearch.trim();
  query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%,code.ilike.%${search}%`);
}
```

## 📊 Example: Complete Implementation

```javascript
// hooks/useFilteredData.js
export function useFilteredData(tableName, initialFilters = {}) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);
  const [filters, setFilters] = useState(initialFilters);
  
  // Debounced filters
  const debouncedFilters = useDebounce(filters, 300);
  
  const fetchData = useCallback(async (page = 0, reset = false, filterParams = {}) => {
    setLoading(true);
    try {
      let query = supabase
        .from(tableName)
        .select("*", { count: 'exact' });
      
      // Apply all filters
      Object.entries(filterParams).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          if (typeof value === 'string') {
            query = query.ilike(key, `%${value.trim()}%`);
          } else if (typeof value === 'boolean') {
            query = query.eq(key, value);
          } else {
            query = query.eq(key, value);
          }
        }
      });
      
      const { data: results, count } = await query
        .order('created_at', { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
      
      setData(prev => reset ? results : [...prev, ...results]);
      setHasMore(count > (page + 1) * PAGE_SIZE);
      setCurrentPage(page);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  }, [tableName]);
  
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

## 🚀 Performance Tips

1. **Use Debounced Values**: Prevent excessive API calls while typing
   ```javascript
   const debouncedSearch = useDebounce(searchTerm, 300);
   ```

2. **Reset Pagination on Filter Change**: Always start from page 0 when filters change
   ```javascript
   useEffect(() => {
     setCurrentPage(0);
     fetchData(0, true, filters);
   }, [filters]);
   ```

3. **Optimize Select Queries**: Only fetch needed columns
   ```javascript
   query = query.select('id, name, status, created_at');
   ```

4. **Add Database Indexes**: Ensure filtered columns have indexes
   ```sql
   CREATE INDEX idx_table_name ON table_name(name);
   CREATE INDEX idx_table_status ON table_name(status);
   ```

5. **Handle Empty Results**: Show appropriate feedback for no results
   ```javascript
   if (data.length === 0 && !loading) {
     return <EmptyState message="No results found" />;
   }
   ```

## 🔍 Testing Your Implementation

1. **Search Functionality**: Type in filter → Should find results from entire database
2. **Pagination**: "Load More" should maintain current filters
3. **Performance**: Check network tab → Should only download relevant data
4. **Edge Cases**: Test empty searches, special characters, very long strings

## 🎯 Migration Checklist

- [ ] Update fetch function to accept filters parameter
- [ ] Add database-level filter logic with `ilike`, `eq`, etc.
- [ ] Remove client-side filtering logic
- [ ] Update pagination to work with filters
- [ ] Add debounced filter values for performance
- [ ] Update "Load More" and "Refresh" functions
- [ ] Test search functionality across entire dataset
- [ ] Verify pagination works with active filters

This pattern ensures efficient, scalable filtering that works across your entire dataset without performance issues. 
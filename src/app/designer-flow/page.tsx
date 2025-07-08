'use client'

import { useState, useEffect, useRef, useCallback, useLayoutEffect, useMemo, memo } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Progress } from '@/components/ui/progress'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Eye, Trash2, X, RotateCw, Plus, ArrowUp, ArrowDown, Clock, CheckCircle, Copy, FileText, FilePlus } from 'lucide-react'
import { createBrowserClient } from '@/utils/supabase'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import {
  Drawer,
  DrawerTrigger,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerClose,
  DrawerFooter,
} from '@/components/ui/drawer'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { v4 as uuidv4 } from 'uuid'
import { createPortal } from 'react-dom'
import { useJobUpdater } from '@/hooks/useJobUpdater'
import { useDebounce } from '@/hooks/useDebounce'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import CheckboxColumn from '@/components/ui/CheckboxColumn'
import NotasPopover from '@/components/ui/NotasPopover'
import DatePicker from '@/components/ui/DatePicker'
import Combobox from '@/components/ui/Combobox'
import useDrawerFocus from '@/hooks/useDrawerFocus'
import debounce from 'lodash/debounce'
import { ComplexidadeCombobox } from "@/components/ui/ComplexidadeCombobox"
import { useComplexidades } from "@/hooks/useComplexidades"

interface Job {
  id: string
  data_in: string
  numero_fo: number
  profile_id: string
  nome_campanha: string
  data_saida: string | null
  prioridade: boolean | null
  notas?: string
  created_at?: string
}

interface Designer {
  value: string
  label: string
}

type DesignerItem = {
  id: string; // designer_items.id
  item_id: string; // designer_items.item_id
  em_curso: boolean | null;
  duvidas: boolean | null;
  maquete_enviada: boolean | null;
  paginacao: boolean | null;
  data_in: string | null;
  data_duvidas: string | null;
  data_envio: string | null;
  data_saida: string | null;
  path_trabalho: string | null;
  updated_at: string | null;
  items_base: {
    id: string;
    folha_obra_id: string;
    descricao: string;
    codigo: string | null;
    complexidade_id?: string | null;
    complexidade?: string | null;
  } | {
    id: string;
    folha_obra_id: string;
    descricao: string;
    codigo: string | null;
    complexidade_id?: string | null;
    complexidade?: string | null;
  }[];
};

interface Item {
  designer_item_id: string; // designer_items.id
  id: string; // items_base.id
  folha_obra_id: string;
  descricao: string;
  codigo: string | null;
  complexidade_id?: string | null;
  complexidade?: string | null;
  em_curso: boolean | null;
  duvidas: boolean | null;
  maquete_enviada: boolean | null;
  paginacao: boolean | null;
  data_in: string | null;
  data_duvidas: string | null;
  data_envio: string | null;
  data_saida: string | null;
  path_trabalho: string | null;
  updated_at: string | null;
}

interface UpdateItemParams {
  designerItemId: string;
  updates: Partial<Item>;
}

const DESIGNER_ROLE_ID = '3132fced-ae83-4f56-9d15-c92c3ef6b6ae'

// Helper to determine P color
const getPColor = (job: Job): string => {
  if (job.prioridade) return 'bg-red-500';
  if (job.data_in) {
    const days = (Date.now() - new Date(job.data_in).getTime()) / (1000 * 60 * 60 * 24);
    if (days > 3) return 'bg-[var(--blue-light)]';
  }
  return 'bg-green-500';
};

// 1. Extract fetchJobs and fetchAllItems to standalone functions
const fetchJobs = async (
  setJobs: React.Dispatch<React.SetStateAction<Job[]>>, 
  filters: {
    selectedDesigner?: string;
    poFilter?: string;
    campaignFilter?: string;
    itemFilter?: string;
    codigoFilter?: string;
    showFechados?: boolean;
  } = {}
) => {
  const supabase = createBrowserClient();
  
  try {
    // Build dynamic query
    let query = supabase
      .from('folhas_obras')
      .select('id, data_in, numero_fo, profile_id, nome_campanha, data_saida, prioridade, notas, created_at');
    
    // Apply filters
    if (filters.selectedDesigner && filters.selectedDesigner !== 'all') {
      query = query.eq('profile_id', filters.selectedDesigner);
    }
    
    if (filters.poFilter?.trim()) {
      // Convert to string and search - numero_fo is text field
      query = query.ilike('numero_fo', `%${filters.poFilter.trim()}%`);
    }
    
    if (filters.campaignFilter?.trim()) {
      query = query.ilike('nome_campanha', `%${filters.campaignFilter.trim()}%`);
    }
    
    // For item/codigo filtering, we need to find jobs that have matching items
    if (filters.itemFilter?.trim() || filters.codigoFilter?.trim()) {
      try {
        let itemQuery = supabase
          .from('items_base')
          .select('folha_obra_id');
        
        if (filters.itemFilter?.trim()) {
          itemQuery = itemQuery.ilike('descricao', `%${filters.itemFilter.trim()}%`);
        }
        
        if (filters.codigoFilter?.trim()) {
          itemQuery = itemQuery.ilike('codigo', `%${filters.codigoFilter.trim()}%`);
        }
        
        const { data: matchingItems, error: itemError } = await itemQuery;
        
        if (itemError) {
          console.error('Error fetching items:', itemError);
          setJobs([]);
          return;
        }
        
        if (matchingItems && matchingItems.length > 0) {
          const jobIds = Array.from(new Set(matchingItems.map(item => item.folha_obra_id)));
          query = query.in('id', jobIds);
        } else {
          // No matching items found, return empty result
          setJobs([]);
          return;
        }
      } catch (itemQueryError) {
        console.error('Error in item filtering:', itemQueryError);
        setJobs([]);
        return;
      }
    }
    
    const { data, error } = await query.order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching jobs:', error);
      return;
    }
    
    if (!data) {
      setJobs([]);
      return;
    }
    
    // Handle showFechados filter - check if jobs have all items completed
    if (filters.showFechados !== undefined) {
      try {
        // Get all designer items for these jobs in one query
        const jobIds = data.map(job => job.id);
        const { data: allDesignerItems, error: designerError } = await supabase
          .from('designer_items')
          .select(`
            paginacao,
            items_base!inner (
              folha_obra_id
            )
          `)
          .in('items_base.folha_obra_id', jobIds);
        
        if (designerError) {
          console.error('Error fetching designer items:', designerError);
          setJobs(data); // Fall back to unfiltered data
          return;
        }
        
        // Group items by job
        const itemsByJob = (allDesignerItems || []).reduce((acc, item) => {
          const jobId = (item.items_base as any)?.folha_obra_id;
          if (!acc[jobId]) acc[jobId] = [];
          acc[jobId].push(item);
          return acc;
        }, {} as Record<string, any[]>);
        
        // Filter jobs based on completion status
        const filteredJobs = data.filter(job => {
          const jobItems = itemsByJob[job.id] || [];
          const itemCount = jobItems.length;
          const allPaginated = jobItems.every(item => item.paginacao);
          
          if (!filters.showFechados) {
            // Em Aberto: jobs with zero items OR at least one item not paginado
            return itemCount === 0 || !allPaginated;
          } else {
            // Fechados: jobs with at least one item and all items paginado
            return itemCount > 0 && allPaginated;
          }
        });
        
        setJobs(filteredJobs);
      } catch (designerQueryError) {
        console.error('Error in showFechados filtering:', designerQueryError);
        setJobs(data); // Fall back to unfiltered data
      }
    } else {
      setJobs(data);
    }
  } catch (generalError) {
    console.error('General error in fetchJobs:', generalError);
    setJobs([]);
  }
};

const fetchAllItems = async (setAllItems: React.Dispatch<React.SetStateAction<Item[]>>, jobs: Job[]) => {
  const supabase = createBrowserClient();
  const { data, error } = await supabase
    .from('designer_items')
    .select(`
      id,
      item_id,
      em_curso,
      duvidas,
      maquete_enviada,
      paginacao,
      data_in,
      data_duvidas,
      data_envio,
      data_saida,
      path_trabalho,
      updated_at,
      items_base (
        id,
        folha_obra_id,
        descricao,
        codigo,
        complexidade_id,
        complexidade
      )
    `)
    .order('updated_at', { ascending: false });
  if (!error && data) {
    const mapped: Item[] = data.map((d: DesignerItem) => {
      const base = Array.isArray(d.items_base) ? d.items_base[0] : d.items_base;
      return {
        designer_item_id: d.id,
        id: base?.id ?? '',
        folha_obra_id: base?.folha_obra_id ?? '',
        descricao: base?.descricao ?? '',
        codigo: base?.codigo ?? null,
        complexidade_id: base?.complexidade_id ?? null,
        complexidade: base?.complexidade ?? null,
        em_curso: d.em_curso,
        duvidas: d.duvidas,
        maquete_enviada: d.maquete_enviada,
        paginacao: d.paginacao,
        data_in: d.data_in,
        data_duvidas: d.data_duvidas,
        data_envio: d.data_envio,
        data_saida: d.data_saida,
        path_trabalho: d.path_trabalho,
        updated_at: d.updated_at,
      };
    });
    setAllItems(mapped);
  }
};

export default function DesignerFlow() {
  const [selectedDesigner, setSelectedDesigner] = useState('all')
  const [poFilter, setPoFilter] = useState('')
  const [campaignFilter, setCampaignFilter] = useState('')
  const [jobs, setJobs] = useState<Job[]>([])
  const [designers, setDesigners] = useState<Designer[]>([])
  const [sortColumn, setSortColumn] = useState<string>('prioridade')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')
  const [openDrawerId, setOpenDrawerId] = useState<string | null>(null)
  const closeBtnRefs = useRef<Record<string, HTMLButtonElement | null>>({})
  const triggerBtnRefs = useRef<Record<string, HTMLButtonElement | null>>({})
  const [drawerItems, setDrawerItems] = useState<Record<string, Item[]>>({});
  const [loadingItems, setLoadingItems] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState<{ jobId: string; itemId: string; idx: number } | null>(null);
  const [focusRow, setFocusRow] = useState<{ jobId: string; itemId: string } | null>(null);
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const [pathDialog, setPathDialog] = useState<{ jobId: string; itemId: string; idx: number } | null>(null);
  const [pathInput, setPathInput] = useState('');
  const pathInputRef = useRef<HTMLInputElement | null>(null);
  const [drawerSort, setDrawerSort] = useState<Record<string, { column: keyof Item; direction: 'asc' | 'desc' }>>({});
  const [showNewJobModal, setShowNewJobModal] = useState(false);
  const [newNumeroFo, setNewNumeroFo] = useState('');
  const [newNomeCampanha, setNewNomeCampanha] = useState('');
  const [newNotas, setNewNotas] = useState('');
  const [newFoError, setNewFoError] = useState<string | null>(null);
  const [creatingJob, setCreatingJob] = useState(false);
  const [showFechados, setShowFechados] = useState(false);
  const [allItems, setAllItems] = useState<Item[]>([]);
  const [pendingNewJobId, setPendingNewJobId] = useState<string | null>(null);
  const foInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const [itemFilter, setItemFilter] = useState('');
  const [codigoFilter, setCodigoFilter] = useState('');
  const { complexidades, isLoading: isLoadingComplexidades, error: complexidadeError } = useComplexidades();
  
  // Debounced filter values for performance
  const [debouncedPoFilter, setDebouncedPoFilter] = useState('');
  const [debouncedCampaignFilter, setDebouncedCampaignFilter] = useState('');
  const [debouncedItemFilter, setDebouncedItemFilter] = useState('');
  const [debouncedCodigoFilter, setDebouncedCodigoFilter] = useState('');
  
  // Setup a safer implementation of createPortal for client components
  const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(null);
  
  useEffect(() => {
    setPortalContainer(document.body);
  }, []);

  // Debounce filter values
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedPoFilter(poFilter), 300);
    return () => clearTimeout(timer);
  }, [poFilter]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedCampaignFilter(campaignFilter), 300);
    return () => clearTimeout(timer);
  }, [campaignFilter]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedItemFilter(itemFilter), 300);
    return () => clearTimeout(timer);
  }, [itemFilter]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedCodigoFilter(codigoFilter), 300);
    return () => clearTimeout(timer);
  }, [codigoFilter]);

  // Debounce hook
  const debouncedUpdateDescricao = useDebounce(async (itemId: string, value: string) => {
    if (!itemId) return; // Don't make API calls with empty IDs
    const supabase = createBrowserClient();
    await supabase.from('items_base').update({ descricao: value }).eq('id', itemId);
  }, 400);
  const debouncedUpdateCodigo = useDebounce(async (itemId: string, value: string) => {
    if (!itemId) return; // Don't make API calls with empty IDs
    try {
      const supabase = createBrowserClient();
      
      // Try to find the item in the current state
      const currentItem = Object.values(drawerItems)
        .flat()
        .find(item => item.id === itemId);
        
      if (!currentItem || !currentItem.folha_obra_id) {
        return;
      }
      
      // Use upsert instead of update to create if it doesn't exist
      try {
        const { data, error } = await supabase
          .from('items_base')
          .upsert({
            id: itemId,
            folha_obra_id: currentItem.folha_obra_id,
            descricao: currentItem.descricao || '',
            codigo: value || '' // Ensure non-null value
          }, {
            onConflict: 'id',
            ignoreDuplicates: false
          })
          .select();
        
        if (error) {
          // Special handling for "logistica_items does not exist" server error
          if (error.message?.includes('relation "logistica_items" does not exist')) {
            return;
          }
        }
      } catch (updateErr) {
      }
    } catch (err) {
    }
  }, 400);

  // Debounced update function for complexidade
  const debouncedUpdateComplexidade = useCallback(
    debounce(async (itemId: string, complexidadeId: string | null) => {
      console.log('debouncedUpdateComplexidade called with:', { itemId, complexidadeId });
      const supabase = createBrowserClient();
      
      try {
        // Start a transaction by using single-query RPC
        const { data, error } = await supabase
          .rpc('update_item_complexity', { 
            p_item_id: itemId,
            p_complexity_id: complexidadeId
          });
        
        if (error) {
          console.error('Error updating complexity:', error);
          // Revert optimistic update on error
          setDrawerItems(prev => {
            const newDrawerItems = { ...prev };
            for (const folhaId in newDrawerItems) {
              const items = newDrawerItems[folhaId];
              const itemIndex = items.findIndex(item => item.id === itemId);
              if (itemIndex !== -1) {
                newDrawerItems[folhaId] = [
                  ...items.slice(0, itemIndex),
                  { ...items[itemIndex], complexidade_id: items[itemIndex].complexidade_id },
                  ...items.slice(itemIndex + 1)
                ];
                break;
              }
            }
            return newDrawerItems;
          });
          return;
        }
        
        console.log('Successfully updated complexidade:', data);
      } catch (error) {
        console.error('Error in debouncedUpdateComplexidade:', error);
      }
    }, 500),
    [] // Empty dependency array since we don't want to recreate the debounced function
  );

  useEffect(() => {
    if (openDrawerId && closeBtnRefs.current[openDrawerId]) {
      closeBtnRefs.current[openDrawerId]?.focus()
    }
  }, [openDrawerId])

  useEffect(() => {
    if (focusRow && inputRefs.current[`${focusRow.jobId}_${focusRow.itemId}`]) {
      inputRefs.current[`${focusRow.jobId}_${focusRow.itemId}`]?.focus();
      setFocusRow(null);
    }
  }, [drawerItems, focusRow]);

  useLayoutEffect(() => {
    if (pathDialog) {
      setTimeout(() => {
        if (pathInputRef.current) {
          pathInputRef.current.focus();
        }
      }, 0);
    }
  }, [pathDialog]);

  useEffect(() => {
    if (openDrawerId && foInputRefs.current[openDrawerId]) {
      foInputRefs.current[openDrawerId]?.focus();
    }
  }, [openDrawerId]);

  // Fetch designers
  useEffect(() => {
    const fetchDesigners = async () => {
      const supabase = createBrowserClient()
      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, role_id')
      if (!error && data) {
        const designersList = data
          .filter((d: { role_id: string }) => d.role_id === DESIGNER_ROLE_ID)
          .sort((a: { first_name: string }, b: { first_name: string }) => a.first_name.localeCompare(b.first_name))
          .map((d: { id: string; first_name: string }) => ({
            value: d.id,
            label: d.first_name,
          }))
        setDesigners([
          { value: 'all', label: 'Todos os Designers' },
          ...designersList,
        ])
      }
    }
    fetchDesigners()
  }, [])

  // Fetch jobs with filters
  useEffect(() => {
    fetchJobs(setJobs, {
      selectedDesigner,
      poFilter: debouncedPoFilter,
      campaignFilter: debouncedCampaignFilter,
      itemFilter: debouncedItemFilter,
      codigoFilter: debouncedCodigoFilter,
      showFechados
    });
  }, [selectedDesigner, debouncedPoFilter, debouncedCampaignFilter, debouncedItemFilter, debouncedCodigoFilter, showFechados]);

  // Fetch all items for status calculations
  useEffect(() => {
    fetchAllItems(setAllItems, jobs);
  }, [jobs]);

  // Jobs are now filtered at database level
  const filteredJobs = jobs;

  // Sorting logic
  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortColumn(column)
      setSortDirection('asc')
    }
  }

  const getSortedJobs = (jobs: Job[]) => {
    const sorted = [...jobs].sort((a, b) => {
      let aValue: any = a[sortColumn as keyof Job]
      let bValue: any = b[sortColumn as keyof Job]
      // Special cases
      if (sortColumn === 'data_in' || sortColumn === 'data_saida') {
        aValue = aValue ? new Date(aValue).getTime() : 0
        bValue = bValue ? new Date(bValue).getTime() : 0
      }
      if (sortColumn === 'profile_id') {
        const aName = designers.find(d => d.value === a.profile_id)?.label || ''
        const bName = designers.find(d => d.value === b.profile_id)?.label || ''
        return sortDirection === 'asc'
          ? aName.localeCompare(bName)
          : bName.localeCompare(aName)
      }
      if (sortColumn === 'prioridade') {
        // true > false
        return sortDirection === 'asc'
          ? (aValue === bValue ? 0 : aValue ? -1 : 1)
          : (aValue === bValue ? 0 : aValue ? 1 : -1)
      }
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortDirection === 'asc'
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue)
      }
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortDirection === 'asc' ? aValue - bValue : bValue - aValue
      }
      return 0
    })
    return sorted
  }

  const sortedJobs = getSortedJobs(filteredJobs)

  // Handler to update designer for a job
  const handleDesignerChange = async (jobId: string, newDesigner: string) => {
    setJobs((prevJobs) =>
      prevJobs.map((job) =>
        job.id === jobId ? { ...job, profile_id: newDesigner } : job
      )
    )
    // Update in Supabase
    const supabase = createBrowserClient()
    await supabase
      .from('folhas_obras')
      .update({ profile_id: newDesigner })
      .eq('id', jobId)
  }

  // Add refreshItems helper function after your existing useEffects
  const refreshItems = async (jobId: string) => {
    const supabase = createBrowserClient();
    setLoadingItems(true);
    
    const { data, error } = await supabase
      .from('designer_items')
      .select(`
        id,
        item_id,
        em_curso,
        duvidas,
        maquete_enviada,
        paginacao,
        data_in,
        data_duvidas,
        data_envio,
        data_saida,
        path_trabalho,
        updated_at,
        items_base (
          id,
          folha_obra_id,
          descricao,
          codigo,
          complexidade_id,
          complexidade
        )
      `)
      .eq('items_base.folha_obra_id', jobId);
    
    if (error) {
      setLoadingItems(false);
      return;
    }
    
    if (data) {
      const mapped: Item[] = data
        .map((d: DesignerItem) => {
          const base = Array.isArray(d.items_base) ? d.items_base[0] : d.items_base;
          // Skip items with missing data
          if (!base || !base.id) return null;
          return {
            designer_item_id: d.id,
            id: base.id,
            folha_obra_id: base.folha_obra_id,
            descricao: base.descricao,
            codigo: base.codigo,
            complexidade_id: base.complexidade_id ?? null,
            complexidade: base.complexidade ?? null,
            em_curso: d.em_curso,
            duvidas: d.duvidas,
            maquete_enviada: d.maquete_enviada,
            paginacao: d.paginacao,
            data_in: d.data_in,
            data_duvidas: d.data_duvidas,
            data_envio: d.data_envio,
            data_saida: d.data_saida,
            path_trabalho: d.path_trabalho,
            updated_at: d.updated_at,
          };
        })
        .filter(Boolean) as Item[]; // Remove null items
      
      setDrawerItems(prev => ({ ...prev, [jobId]: mapped }));
    }
    
    setLoadingItems(false);
  };

  // Update useEffect for fetching items when drawer opens
  useEffect(() => {
    if (!openDrawerId) return;
    refreshItems(openDrawerId);
  }, [openDrawerId]);

  // Helper to sort drawer items
  const getSortedDrawerItems = (jobId: string, items: Item[]) => {
    const sort = drawerSort[jobId];
    if (!sort) return items;
    const { column, direction } = sort;
    return [...items].sort((a, b) => {
      const aValue = !!a[column];
      const bValue = !!b[column];
      if (aValue === bValue) return 0;
      if (direction === 'asc') return aValue ? -1 : 1;
      return aValue ? 1 : -1;
    });
  };

  useEffect(() => {
    if (pendingNewJobId && sortedJobs.some(j => j.id === pendingNewJobId)) {
      setOpenDrawerId(pendingNewJobId);
      setPendingNewJobId(null);
    }
  }, [pendingNewJobId, sortedJobs]);

  const updateJob = (jobId: string, updates: Partial<Job>) => {
    setJobs(prev => prev.map(job => job.id === jobId ? { ...job, ...updates } : job));
  };

  // Update item in state (optimistic update)
  const updateItemInState = useCallback(({ designerItemId, updates }: UpdateItemParams) => {
    console.log('updateItemInState called with:', { designerItemId, updates });
    
    setDrawerItems(prev => {
      const newDrawerItems = { ...prev };
      let updated = false;
      
      // Find the item in all folhas
      for (const folhaId in newDrawerItems) {
        const items = newDrawerItems[folhaId];
        const itemIndex = items.findIndex(item => item.designer_item_id === designerItemId);
        
        if (itemIndex !== -1) {
          // Create new array with updated item
          newDrawerItems[folhaId] = [
            ...items.slice(0, itemIndex),
            { ...items[itemIndex], ...updates },
            ...items.slice(itemIndex + 1)
          ];
          updated = true;
          break;
        }
      }
      
      // Only return new state if we actually updated something
      return updated ? newDrawerItems : prev;
    });
  }, []);

  // Simple update function with optimistic updates
  const updateComplexidade = useCallback(async (itemId: string, complexidadeGrau: string | null) => {
    // Store previous state for rollback
    const previousState = { ...drawerItems };
    
    try {
      // Get the complexidade ID if a grau is provided
      let complexidadeId = null;
      if (complexidadeGrau && complexidadeGrau !== 'none') {
        const supabase = createBrowserClient();
        const { data, error } = await supabase
          .from('complexidade')
          .select('id')
          .eq('grau', complexidadeGrau)
          .single();
          
        if (error) throw error;
        if (data) {
          complexidadeId = data.id;
        }
      }

      // Optimistic update
      setDrawerItems(prev => {
        const newDrawerItems = { ...prev };
        for (const folhaId in newDrawerItems) {
          const items = newDrawerItems[folhaId];
          const itemIndex = items.findIndex(item => item.id === itemId);
          if (itemIndex !== -1) {
            newDrawerItems[folhaId] = [
              ...items.slice(0, itemIndex),
              { 
                ...items[itemIndex], 
                complexidade_id: complexidadeId,
                complexidade: complexidadeGrau === 'none' ? null : complexidadeGrau
              },
              ...items.slice(itemIndex + 1)
            ];
            break;
          }
        }
        return newDrawerItems;
      });

      // Update database
      const supabase = createBrowserClient();
      const { error } = await supabase
        .from('items_base')
        .update({ 
          complexidade_id: complexidadeId,
          complexidade: complexidadeGrau === 'none' ? null : complexidadeGrau
        })
        .eq('id', itemId);

      if (error) {
        throw error;
      }

    } catch (error) {
      console.error('Error updating complexidade:', error);
      // Rollback on error
      setDrawerItems(previousState);
      throw error;
    }
  }, [drawerItems]);

  return (
    <>
      <div className="w-full space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Trabalhos em aberto</h1>
        </div>

        {/* Filters Section */}
        <div className="w-full flex gap-4 items-center">
          <div className="flex-1 flex gap-4">
            <Select value={selectedDesigner} onValueChange={setSelectedDesigner}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Todos os Designers" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Designers</SelectItem>
                {designers
                  .filter(d => d.value !== 'all')
                  .map((designer) => (
                    <SelectItem key={designer.value} value={designer.value}>
                      {designer.label}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            <Input
              placeholder="Filtra FO"
              value={poFilter}
              onChange={(e) => setPoFilter(e.target.value)}
              className="w-[120px]"
            />
            <Input
              placeholder="Filtra Nome Campanha"
              value={campaignFilter}
              onChange={(e) => setCampaignFilter(e.target.value)}
              className="flex-1"
            />
            <Input
              placeholder="Filtra Item"
              value={itemFilter}
              onChange={(e) => setItemFilter(e.target.value)}
              className="flex-1"
            />
            <Input
              placeholder="Filtra Código"
              value={codigoFilter}
              maxLength={19}
              onChange={(e) => setCodigoFilter(e.target.value)}
              className="w-[140px]"
            />
          </div>
          <Button
            variant={showFechados ? 'default' : 'outline'}
            size="icon"
            className={showFechados ? 'bg-yellow-400' : ''}
            onClick={() => {
              setShowFechados(prevState => !prevState);
              // The filtering is now handled automatically by the useEffect that listens to showFechados
            }}
            aria-label={showFechados ? 'Mostrar Em Aberto' : 'Mostrar Fechados'}
          >
            {showFechados ? <CheckCircle className="h-5 w-5" /> : <Clock className="h-5 w-5" />}
          </Button>
          <Button
            variant="default" size="icon"
            onClick={() => {
              setSelectedDesigner('all')
              setPoFilter('')
              setCampaignFilter('')
              setItemFilter('')
              setCodigoFilter('')
              setShowFechados(false)
            }}
          >
            <X className="h-4 w-4" />
          </Button>
          <div className="ml-auto flex gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="secondary" size="icon"
                    onClick={async () => {
                      // Refresh jobs with current filters
                      await fetchJobs(setJobs, {
                        selectedDesigner,
                        poFilter: debouncedPoFilter,
                        campaignFilter: debouncedCampaignFilter,
                        itemFilter: debouncedItemFilter,
                        codigoFilter: debouncedCodigoFilter,
                        showFechados
                      });
                      // If a drawer is open, refresh its items
                      if (openDrawerId) {
                        await refreshItems(openDrawerId);
                      }
                    }}
                  >
                    <RotateCw className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Atualizar</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="default"
                    size="icon"
                    onClick={async () => {
                      const supabase = createBrowserClient();
                      // Get next numero_fo (max + 1)
                      const { data: maxData } = await supabase
                        .from('folhas_obras')
                        .select('numero_fo')
                        .order('numero_fo', { ascending: false })
                        .limit(1);
                      const nextNumeroFo = (maxData && maxData[0]?.numero_fo ? maxData[0].numero_fo + 1 : 1);
                      const newJob = {
                        numero_fo: nextNumeroFo,
                        profile_id: null,
                        nome_campanha: '',
                        prioridade: false,
                        data_in: new Date().toISOString(),
                        data_saida: null,
                        notas: '',
                      };
                      const { data, error } = await supabase
                        .from('folhas_obras')
                        .insert([newJob])
                        .select('*');
                      if (!error && data && data[0]) {
                        // Reset all filters so the new job is visible
                        setSelectedDesigner('all');
                        setPoFilter('');
                        setCampaignFilter('');
                        setShowFechados(false);
                        // Directly add the new job to state
                        setJobs(prev => [...prev, data[0]]);
                        // Optionally refresh items if needed
                        setOpenDrawerId(data[0].id);
                      } else {
                        // Optionally handle error
                      }
                    }}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Novo Trabalho</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>

        {/* Data Table */}
        <div className="rounded-none bg-background w-full border-2 border-border">
          <div className="max-h-[70vh] overflow-y-auto w-full rounded-none">
            <Table className="w-full border-0 rounded-none">
              <TableHeader>
                <TableRow>
                  <TableHead className="sticky top-0 z-10 bg-[var(--orange)] border-b-2 border-border w-[90px] cursor-pointer select-none" onClick={() => handleSort('data_in')}>
                    Data In
                    {sortColumn === 'data_in' && (sortDirection === 'asc' ? <ArrowUp className="inline w-3 h-3 ml-1" /> : <ArrowDown className="inline w-3 h-3 ml-1" />)}
                  </TableHead>
                  <TableHead className="sticky top-0 z-10 bg-[var(--orange)] border-b-2 border-border w-[60px] cursor-pointer select-none" onClick={() => handleSort('numero_fo')}>
                    FO
                    {sortColumn === 'numero_fo' && (sortDirection === 'asc' ? <ArrowUp className="inline w-3 h-3 ml-1" /> : <ArrowDown className="inline w-3 h-3 ml-1" />)}
                  </TableHead>
                  <TableHead className="sticky top-0 z-10 bg-[var(--orange)] border-b-2 border-border w-[140px] cursor-pointer select-none" onClick={() => handleSort('profile_id')}>
                    Designer
                    {sortColumn === 'profile_id' && (sortDirection === 'asc' ? <ArrowUp className="inline w-3 h-3 ml-1" /> : <ArrowDown className="inline w-3 h-3 ml-1" />)}
                  </TableHead>
                  <TableHead className="sticky top-0 z-10 bg-[var(--orange)] border-b-2 border-border min-w-[200px] cursor-pointer select-none" onClick={() => handleSort('nome_campanha')}>
                    Nome Campanha
                    {sortColumn === 'nome_campanha' && (sortDirection === 'asc' ? <ArrowUp className="inline w-3 h-3 ml-1" /> : <ArrowDown className="inline w-3 h-3 ml-1" />)}
                  </TableHead>
                  <TableHead className="sticky top-0 z-10 bg-[var(--orange)] border-b-2 border-border w-[180px]">Status</TableHead>
                  <TableHead className="sticky top-0 z-10 bg-[var(--orange)] border-b-2 border-border w-[90px] cursor-pointer select-none" onClick={() => handleSort('data_saida')}>
                    Data Saída
                    {sortColumn === 'data_saida' && (sortDirection === 'asc' ? <ArrowUp className="inline w-3 h-3 ml-1" /> : <ArrowDown className="inline w-3 h-3 ml-1" />)}
                  </TableHead>
                  <TableHead className="sticky top-0 z-10 bg-[var(--orange)] border-b-2 border-border w-[36px] text-center cursor-pointer select-none" onClick={() => handleSort('prioridade')}>
                    P
                    {sortColumn === 'prioridade' && (sortDirection === 'asc' ? <ArrowUp className="inline w-3 h-3 ml-1" /> : <ArrowDown className="inline w-3 h-3 ml-1" />)}
                  </TableHead>
                  <TableHead className="sticky top-0 z-10 bg-[var(--orange)] border-b-2 border-border w-[80px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedJobs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-gray-500">
                      Nenhum trabalho encontrado.
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedJobs.map((job, index) => (
                    <Drawer
                      key={job.id || `job-${index}`}
                      open={!!(openDrawerId === job.id || (pathDialog && pathDialog.jobId === job.id))}
                      onOpenChange={async (open) => {
                        // Don't close if path dialog is open
                        if (!open && pathDialog && pathDialog.jobId === job.id) {
                          return;
                        }
                        
                        // First, blur any focused elements to prevent focus being trapped
                        if (document.activeElement instanceof HTMLElement) {
                          document.activeElement.blur();
                        }
                        
                        // When closing, return focus to trigger button
                        if (!open && openDrawerId && triggerBtnRefs.current[openDrawerId]) {
                          triggerBtnRefs.current[openDrawerId]?.focus();
                        }
                        
                        // Set the drawer state
                        setOpenDrawerId(open ? job.id : null);
                      }}
                      autoFocus={false}
                      modal={false}
                    >
                      <TableRow>
                        <TableCell>{job.data_in ? new Date(job.data_in).toLocaleDateString() : '-'}</TableCell>
                        <TableCell>{job.numero_fo}</TableCell>
                        <TableCell>
                          <Select
                            value={job.profile_id || ''}
                            onValueChange={(val) => handleDesignerChange(job.id, val)}
                          >
                            <SelectTrigger className="w-[120px]">
                              <SelectValue>{designers.find(d => d.value === job.profile_id)?.label || ''}</SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              {designers
                                .filter((d) => d.value !== 'all')
                                .map((designer) => (
                                  <SelectItem key={designer.value} value={designer.value}>
                                    {designer.label}
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>{job.nome_campanha}</TableCell>
                        <TableCell>
                          {/* Status progress bar */}
                          {(() => {
                            // Get all items for this job from the new data structure
                            const jobItems = allItems.filter(item => 
                              item.folha_obra_id === job.id && 
                              item.id && // Ensure valid items only
                              item.designer_item_id // Ensure it has a designer item association
                            );
                            
                            // Calculate progress
                            const total = jobItems.length;
                            const done = jobItems.filter(item => item.paginacao).length;
                            const percent = total > 0 ? Math.round((done / total) * 100) : 0;
                            
                            return (
                              <div className="flex items-center gap-2">
                                <Progress value={percent} className="w-full" />
                                <span className="text-xs font-mono w-10 text-right">{percent}%</span>
                              </div>
                            );
                          })()}
                        </TableCell>
                        <TableCell>{job.data_saida ? new Date(job.data_saida).toLocaleDateString() : '-'}</TableCell>
                        <TableCell className="text-center">
                          <button
                            className={`w-3 h-3 rounded-full mx-auto flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-primary transition-colors ${getPColor(job)}`}
                            title={job.prioridade ? 'Prioritário' : (job.data_in && (Date.now() - new Date(job.data_in).getTime()) / (1000 * 60 * 60 * 24) > 3 ? 'Aguardando há mais de 3 dias' : 'Normal')}
                            onClick={async () => {
                              const newPrioridade = !job.prioridade;
                              updateJob(job.id, { prioridade: newPrioridade });
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2 justify-center">
                            <DrawerTrigger asChild>
                              <Button
                                variant="default"
                                size="icon"
                                aria-label="Ver"
                                ref={el => { triggerBtnRefs.current[job.id] = el; }}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </DrawerTrigger>
                            <Button variant="default" size="icon" aria-label="Excluir"
                              onClick={async () => {
                                if (!window.confirm('Tem certeza que deseja apagar este trabalho e todos os seus itens?')) return;
                                const supabase = createBrowserClient();
                                // Get all items_base for this job
                                const { data: baseItems } = await supabase
                                  .from('items_base')
                                  .select('id')
                                  .eq('folha_obra_id', job.id);
                                if (baseItems && baseItems.length > 0) {
                                  // Delete any designer_items linked to these items_base
                                  await supabase.from('designer_items').delete()
                                    .in('item_id', baseItems.map(item => item.id));
                                  // Delete any logistica_entregas linked to these items
                                  await supabase.from('logistica_entregas').delete()
                                    .in('item_id', baseItems.map(item => item.id));
                                  // Delete all items_base for this job
                                  await supabase.from('items_base').delete()
                                    .eq('folha_obra_id', job.id);
                                }
                                // Delete the job
                                await supabase.from('folhas_obras').delete().eq('id', job.id);
                                // Remove from local state
                                setJobs(prev => prev.filter(j => j.id !== job.id));
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                      <DrawerContent className="overflow-hidden h-screen min-h-screen !top-0 !mt-0">
                        <div className="w-full px-4 md:px-8 flex flex-col h-full">
                          <DrawerHeader className="flex-none">
                            <div className="flex justify-end items-center gap-2 mb-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={async () => {
                                  if (!(job.numero_fo && job.nome_campanha && String(job.nome_campanha).trim().length > 0)) return;
                                  
                                  const supabase = createBrowserClient();
                                  
                                  // First create the base item
                                  const { data: baseData, error: baseError } = await supabase
                                    .from('items_base')
                                    .insert({
                                      folha_obra_id: job.id,
                                      descricao: '',
                                      codigo: ''
                                    })
                                    .select('*')
                                    .single();
                                  
                                  if (baseError || !baseData) {
                                    return;
                                  }
                                  
                                  // Then create the designer item
                                  const { data: designerData, error: designerError } = await supabase
                                    .from('designer_items')
                                    .insert({
                                      item_id: baseData.id,
                                      em_curso: true,
                                      duvidas: false,
                                      maquete_enviada: false,
                                      paginacao: false
                                    })
                                    .select('*')
                                    .single();
                                  
                                  if (designerError) {
                                    return;
                                  }
                                  
                                  // Refresh items for this job
                                  refreshItems(job.id);
                                  
                                  // Focus the new item after refresh
                                  setFocusRow({ jobId: job.id, itemId: baseData.id });
                                }}
                                disabled={!(job.numero_fo && job.nome_campanha && String(job.nome_campanha).trim().length > 0)}
                              >
                                Adicionar Item
                              </Button>
                              <DrawerClose asChild>
                                <Button variant="outline" size="sm" aria-label="Fechar">
                                  <X className="w-5 h-5" />
                                </Button>
                              </DrawerClose>
                            </div>
                            <DrawerTitle className="text-xl font-bold mb-1">
                              Detalhes da Folha de Obra (FO: {job.numero_fo})
                            </DrawerTitle>
                            <DrawerDescription className="text-sm mb-4 class:text-black dark:class:text-gray-300">
                              Visualize os detalhes desta folha de obra e seus itens.
                            </DrawerDescription>
                            <div className="grid grid-cols-1 md:grid-cols-[6rem_1fr_2fr] gap-4 mb-4">
                              <div>
                                <Label htmlFor="fo-numero" className="font-base text-sm">FO</Label>
                                <Input
                                  id="fo-numero"
                                  ref={el => { foInputRefs.current[job.id] = el; }}
                                  value={job.numero_fo ?? ''}
                                  onChange={e => {
                                    // Only allow numbers
                                    const val = e.target.value.replace(/[^0-9]/g, '');
                                    if (val === '') return; // Prevent empty string in state
                                    updateJob(job.id, { numero_fo: Number(val) });
                                  }}
                                  onBlur={async (e) => {
                                    const newFo = e.target.value;
                                    if (!newFo) return;
                                    updateJob(job.id, { numero_fo: Number(newFo) });
                                  }}
                                  className="w-full"
                                />
                              </div>
                              <div>
                                <Label htmlFor="fo-campanha" className="font-base text-sm">Nome Campanha</Label>
                                <Input
                                  id="fo-campanha"
                                  value={job.nome_campanha ?? ''}
                                  onChange={e => {
                                    updateJob(job.id, { nome_campanha: e.target.value });
                                  }}
                                  onBlur={async (e) => {
                                    const newNome = e.target.value;
                                    updateJob(job.id, { nome_campanha: newNome });
                                  }}
                                  className="w-full"
                                  placeholder="Nome da Campanha"
                                />
                              </div>
                              <div className="md:col-span-1">
                                <Label htmlFor="fo-notas" className="font-base text-sm">Notas</Label>
                                <Textarea
                                  id="fo-notas"
                                  value={job.notas ?? ''}
                                  onChange={e => {
                                    updateJob(job.id, { notas: e.target.value });
                                  }}
                                  onBlur={async (e) => {
                                    const newNotas = e.target.value;
                                    updateJob(job.id, { notas: newNotas });
                                  }}
                                  className="min-h-[80px] h-24 resize-none w-full"
                                  placeholder="Notas (opcional)"
                                />
                              </div>
                            </div>
                          </DrawerHeader>
                          <div className="mb-4 flex-grow">
                            <div className="rounded-none bg-background w-full border-2 border-border">
                              <div className="overflow-y-auto max-h-[60vh] rounded-none">
                                <Table className="w-full border-0 rounded-none caption-bottom text-sm">
                                  <TableHeader>
                                    <TableRow className="sticky top-0 z-10 bg-[var(--orange)]">
                                      <TableHead className="border-b-2 border-border w-2/3">Item</TableHead>
                                      <TableHead className="border-b-2 border-border w-[29ch]">Código</TableHead>
                                      <TableHead className="border-b-2 border-border w-[140px]">Complexidade</TableHead>
                                    <TableHead
                                      className="border-b-2 border-border w-auto text-center whitespace-nowrap cursor-pointer select-none"
                                      onClick={() => {
                                        setDrawerSort(prev => {
                                          const current = prev[job.id];
                                          if (current?.column === 'em_curso') {
                                            return {
                                              ...prev,
                                              [job.id]: {
                                                column: 'em_curso',
                                                direction: current.direction === 'asc' ? 'desc' : 'asc',
                                              },
                                            };
                                          }
                                          return { ...prev, [job.id]: { column: 'em_curso', direction: 'asc' } };
                                        });
                                      }}
                                    >
                                      EC
                                      {drawerSort[job.id]?.column === 'em_curso' && (drawerSort[job.id]?.direction === 'asc' ? <ArrowUp className="inline w-3 h-3 ml-1" /> : <ArrowDown className="inline w-3 h-3 ml-1" />)}
                                    </TableHead>
                                    <TableHead
                                      className="border-b-2 border-border w-auto text-center whitespace-nowrap cursor-pointer select-none"
                                      onClick={() => {
                                        setDrawerSort(prev => {
                                          const current = prev[job.id];
                                          if (current?.column === 'duvidas') {
                                            return {
                                              ...prev,
                                              [job.id]: {
                                                column: 'duvidas',
                                                direction: current.direction === 'asc' ? 'desc' : 'asc',
                                              },
                                            };
                                          }
                                          return { ...prev, [job.id]: { column: 'duvidas', direction: 'asc' } };
                                        });
                                      }}
                                    >
                                      D
                                      {drawerSort[job.id]?.column === 'duvidas' && (drawerSort[job.id]?.direction === 'asc' ? <ArrowUp className="inline w-3 h-3 ml-1" /> : <ArrowDown className="inline w-3 h-3 ml-1" />)}
                                    </TableHead>
                                    <TableHead
                                      className="border-b-2 border-border w-auto text-center whitespace-nowrap cursor-pointer select-none"
                                      onClick={() => {
                                        setDrawerSort(prev => {
                                          const current = prev[job.id];
                                          if (current?.column === 'maquete_enviada') {
                                            return {
                                              ...prev,
                                              [job.id]: {
                                                column: 'maquete_enviada',
                                                direction: current.direction === 'asc' ? 'desc' : 'asc',
                                              },
                                            };
                                          }
                                          return { ...prev, [job.id]: { column: 'maquete_enviada', direction: 'asc' } };
                                        });
                                      }}
                                    >
                                      M
                                      {drawerSort[job.id]?.column === 'maquete_enviada' && (drawerSort[job.id]?.direction === 'asc' ? <ArrowUp className="inline w-3 h-3 ml-1" /> : <ArrowDown className="inline w-3 h-3 ml-1" />)}
                                    </TableHead>
                                    <TableHead
                                      className="border-b-2 border-border w-auto text-center whitespace-nowrap cursor-pointer select-none"
                                      onClick={() => {
                                        setDrawerSort(prev => {
                                          const current = prev[job.id];
                                          if (current?.column === 'paginacao') {
                                            return {
                                              ...prev,
                                              [job.id]: {
                                                column: 'paginacao',
                                                direction: current.direction === 'asc' ? 'desc' : 'asc',
                                              },
                                            };
                                          }
                                          return { ...prev, [job.id]: { column: 'paginacao', direction: 'asc' } };
                                        });
                                      }}
                                    >
                                      P
                                      {drawerSort[job.id]?.column === 'paginacao' && (drawerSort[job.id]?.direction === 'asc' ? <ArrowUp className="inline w-3 h-3 ml-1" /> : <ArrowDown className="inline w-3 h-3 ml-1" />)}
                                    </TableHead>
                                    <TableHead className="border-b-2 border-border w-32 text-center">Path</TableHead>
                                    <TableHead className="border-b-2 border-border w-auto text-center whitespace-nowrap">Ações</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {loadingItems ? (
                                    <TableRow>
                                      <TableCell colSpan={8}>Carregando itens...</TableCell>
                                    </TableRow>
                                  ) : (drawerItems[job.id]?.length ? (
                                    getSortedDrawerItems(job.id, drawerItems[job.id] || []).map((item, idx) => (
                                      <TableRow key={item.id || `item-${idx}`}>
                                        <TableCell className="p-4 align-middle font-base text-sm">
                                          <Input
                                            ref={el => { inputRefs.current[`${job.id}_${item.id}`] = el; }}
                                            value={item.descricao}
                                            onChange={e => {
                                              const newValue = e.target.value;
                                              setDrawerItems(prev => {
                                                const updated = [...(prev[job.id] || [])];
                                                updated[idx] = { ...updated[idx], descricao: newValue };
                                                return { ...prev, [job.id]: updated };
                                              });
                                              debouncedUpdateDescricao(item.id, newValue);
                                            }}
                                          />
                                        </TableCell>
                                        <TableCell className="p-4 align-middle font-base text-sm w-[29ch]">
                                          <Input
                                            type="text"
                                            value={item.codigo || ''}
                                            onChange={(e) => {
                                              const newValue = e.target.value;
                                              updateItemInState({
                                                designerItemId: item.designer_item_id,
                                                updates: { codigo: newValue }
                                              });
                                              debouncedUpdateCodigo(item.id, newValue);
                                            }}
                                            className="w-full"
                                          />
                                        </TableCell>
                                        <TableCell className="p-4 align-middle font-base text-sm w-[200px]">
                                          <ComplexidadeCombobox
                                            value={item.complexidade || ''}
                                            onChange={async (value) => {
                                              try {
                                                await updateComplexidade(item.id, value || null);
                                              } catch (error) {
                                                // Error handling is done in updateComplexidade
                                              }
                                            }}
                                            options={complexidades}
                                            disabled={isLoadingComplexidades}
                                            loading={isLoadingComplexidades}
                                          />
                                        </TableCell>
                                        <TableCell className="align-middle text-center p-0" style={{ width: '40px' }}>
                                          <Checkbox
                                            checked={!!item.em_curso}
                                            onCheckedChange={async checked => {
                                              if (!item.designer_item_id) {
                                                return;
                                              }
                                              setDrawerItems(prev => {
                                                const updated = [...(prev[job.id] || [])];
                                                updated[idx] = { ...updated[idx], em_curso: !!checked, duvidas: false, maquete_enviada: false, paginacao: false };
                                                return { ...prev, [job.id]: updated };
                                              });
                                              
                                              // Update in database
                                              try {
                                                const supabase = createBrowserClient();
                                                await supabase.from('designer_items').update({
                                                  em_curso: !!checked,
                                                  duvidas: false,
                                                  maquete_enviada: false,
                                                  paginacao: false,
                                                  data_in: !!checked ? new Date().toISOString() : null
                                                }).eq('id', item.designer_item_id);
                                              } catch (err) {
                                                console.error('Error updating item status:', err);
                                              }
                                            }}
                                          />
                                        </TableCell>
                                        <TableCell className="align-middle text-center p-0" style={{ width: '40px' }}>
                                          <Checkbox
                                            checked={!!item.duvidas}
                                            onCheckedChange={async checked => {
                                              if (!item.designer_item_id) {
                                                return;
                                              }
                                              setDrawerItems(prev => {
                                                const updated = [...(prev[job.id] || [])];
                                                updated[idx] = { ...updated[idx], em_curso: false, duvidas: !!checked, maquete_enviada: false, paginacao: false };
                                                return { ...prev, [job.id]: updated };
                                              });
                                              
                                              // Update in database
                                              try {
                                                const supabase = createBrowserClient();
                                                await supabase.from('designer_items').update({
                                                  em_curso: false,
                                                  duvidas: !!checked,
                                                  maquete_enviada: false,
                                                  paginacao: false,
                                                  data_duvidas: !!checked ? new Date().toISOString() : null
                                                }).eq('id', item.designer_item_id);
                                              } catch (err) {
                                                console.error('Error updating item status:', err);
                                              }
                                            }}
                                          />
                                        </TableCell>
                                        <TableCell className="align-middle text-center p-0" style={{ width: '40px' }}>
                                          <Checkbox
                                            checked={!!item.maquete_enviada}
                                            onCheckedChange={async checked => {
                                              if (!item.designer_item_id) {
                                                return;
                                              }
                                              setDrawerItems(prev => {
                                                const updated = [...(prev[job.id] || [])];
                                                updated[idx] = { ...updated[idx], em_curso: false, duvidas: false, maquete_enviada: !!checked, paginacao: false };
                                                return { ...prev, [job.id]: updated };
                                              });
                                              
                                              // Update in database
                                              try {
                                                const supabase = createBrowserClient();
                                                await supabase.from('designer_items').update({
                                                  em_curso: false,
                                                  duvidas: false,
                                                  maquete_enviada: !!checked,
                                                  paginacao: false,
                                                  data_envio: !!checked ? new Date().toISOString() : null
                                                }).eq('id', item.designer_item_id);
                                              } catch (err) {
                                                console.error('Error updating item status:', err);
                                              }
                                            }}
                                          />
                                        </TableCell>
                                        <TableCell className="align-middle text-center p-0" style={{ width: '40px' }}>
                                          <Checkbox
                                            checked={!!item.paginacao}
                                            onCheckedChange={async checked => {
                                              if (!item.designer_item_id) {
                                                return;
                                              }
                                              if (checked) {
                                                // Always open the path dialog, do not set paginacao yet
                                                setPathInput(item.path_trabalho || '');
                                                setPathDialog({ jobId: job.id, itemId: item.id, idx });
                                              } else {
                                                // If unchecked, allow immediate update
                                                setDrawerItems(prev => {
                                                  const updated = [...(prev[job.id] || [])];
                                                  updated[idx] = { ...updated[idx], paginacao: false };
                                                  return { ...prev, [job.id]: updated };
                                                });
                                                // Update only paginacao in DB, do NOT clear path_trabalho
                                                const supabase = createBrowserClient();
                                                const { error } = await supabase.from('designer_items').update({ paginacao: false }).eq('item_id', item.id);
                                              }
                                            }}
                                          />
                                        </TableCell>
                                        <TableCell className="align-middle text-center p-0" style={{ width: '8rem' }}>
                                          <Popover modal={false}>
                                            <PopoverTrigger asChild>
                                              <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Ver ou editar path">
                                                {item.path_trabalho ? <FileText className="h-4 w-4" /> : <FilePlus className="h-4 w-4" />}
                                              </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-80 p-4 bg-background border-2 border-border">
                                              <div className="space-y-2">
                                                <h4 className="font-medium">Path</h4>
                                                <Input
                                                  value={item.path_trabalho || ''}
                                                  placeholder="Adicionar path..."
                                                  className="min-h-[40px]"
                                                  onChange={e => {
                                                    const newValue = e.target.value;
                                                    setDrawerItems(prev => {
                                                      const updated = [...(prev[job.id] || [])];
                                                      updated[idx] = { ...updated[idx], path_trabalho: newValue };
                                                      return { ...prev, [job.id]: updated };
                                                    });
                                                  }}
                                                  onBlur={async (e) => {
                                                    const newPath = e.target.value;
                                                    const supabase = createBrowserClient();
                                                    await supabase.from('designer_items').update({ path_trabalho: newPath }).eq('item_id', item.id);
                                                  }}
                                                />
                                              </div>
                                            </PopoverContent>
                                          </Popover>
                                        </TableCell>
                                        <TableCell className="align-middle text-center p-0 w-28 pr-2">
                                          <div className="flex gap-2 justify-center">
                                            <Button
                                              variant="outline"
                                              size="icon"
                                              aria-label="Copiar"
                                              className="mr-1"
                                              onClick={async () => {
                                                const supabase = createBrowserClient();
                                                // 1. Duplicate items_base row
                                                const { data: baseData, error: baseError } = await supabase
                                                  .from('items_base')
                                                  .insert({
                                                    folha_obra_id: job.id,
                                                    descricao: item.descricao || '',
                                                    codigo: item.codigo || ''
                                                  })
                                                  .select('*')
                                                  .single();
                                                if (baseError || !baseData) {
                                                  return;
                                                }
                                                // 2. Duplicate designer_items row for new item
                                                const { error: designerError } = await supabase
                                                  .from('designer_items')
                                                  .insert({
                                                    item_id: baseData.id,
                                                    em_curso: item.em_curso,
                                                    duvidas: item.duvidas,
                                                    maquete_enviada: item.maquete_enviada,
                                                    paginacao: item.paginacao
                                                  });
                                                if (designerError) {
                                                  console.error('Erro ao criar designer item:', designerError);
                                                }
                                                // 3. Refresh items for this job
                                                refreshItems(job.id);
                                              }}
                                            >
                                              <Copy className="h-4 w-4" />
                                            </Button>
                                            <Button
                                              variant="destructive"
                                              size="icon"
                                              aria-label="Remover"
                                              className="ml-1"
                                              onClick={() => setDeleteDialog({ jobId: job.id, itemId: item.id, idx })}
                                            >
                                              <Trash2 className="h-4 w-4" />
                                            </Button>
                                          </div>
                                        </TableCell>
                                      </TableRow>
                                    ))
                                  ) : (
                                    <TableRow>
                                      <TableCell colSpan={8}>Nenhum item encontrado.</TableCell>
                                    </TableRow>
                                  ))}
                                  </TableBody>
                                </Table>
                              </div>
                            </div>
                          </div>
                        </div>
                        {pathDialog && pathDialog.jobId === job.id && (
                          <div
                            className="fixed inset-0 z-[9998] bg-black/40 pointer-events-auto"
                            style={{ position: 'absolute' }}
                            onClick={e => e.stopPropagation()}
                          >
                            <div
                              className="flex items-center justify-center w-full h-full"
                              aria-modal="true"
                              role="dialog"
                            >
                              <div
                                className="bg-background border-2 border-border rounded-base shadow-lg p-6 w-full max-w-sm pointer-events-auto"
                              >
                                <div className="mb-4 text-lg font-bold">
                                  {pathInput ? 'Confirmar path?' : 'Indique o caminho do trabalho'}
                                </div>
                                <input
                                  ref={pathInputRef}
                                  className="w-full border-2 border-border rounded-base p-2 mb-4"
                                  value={pathInput}
                                  onChange={e => {
                                    setPathInput(e.target.value);
                                  }}
                                  placeholder="Caminho do trabalho"
                                />
                                <div className="flex justify-end gap-2">
                                  <Button variant="outline" className="font-base border-2 border-border rounded-base shadow-sm" onClick={() => {
                                    setPathDialog(null);
                                  }}>
                                    Cancelar
                                  </Button>
                                  <Button
                                    variant="default"
                                    className="font-base border-2 border-primary rounded-base shadow-sm"
                                    disabled={!pathInput.trim()}
                                    onClick={async () => {
                                      const { jobId, itemId, idx } = pathDialog;
                                      if (!itemId || !pathInput.trim()) {
                                        return;
                                      }
                                      const supabase = createBrowserClient();
                                      await supabase.from('designer_items').update({
                                        em_curso: false,
                                        duvidas: false,
                                        maquete_enviada: false,
                                        paginacao: true,
                                        path_trabalho: pathInput,
                                        data_saida: new Date().toISOString(),
                                      }).eq('item_id', itemId);
                                      setDrawerItems(prev => {
                                        const updated = [...(prev[jobId] || [])];
                                        if (updated[idx]) {
                                          updated[idx] = {
                                            ...updated[idx],
                                            em_curso: false,
                                            duvidas: false,
                                            maquete_enviada: false,
                                            paginacao: true,
                                            path_trabalho: pathInput,
                                            data_saida: new Date().toISOString(),
                                          };
                                        }
                                        return { ...prev, [jobId]: updated };
                                      });
                                      await fetchJobs(setJobs, {
                                        selectedDesigner,
                                        poFilter: debouncedPoFilter,
                                        campaignFilter: debouncedCampaignFilter,
                                        itemFilter: debouncedItemFilter,
                                        codigoFilter: debouncedCodigoFilter,
                                        showFechados
                                      });
                                      setPathDialog(null);
                                    }}
                                  >
                                    Guardar
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </DrawerContent>
                    </Drawer>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
      
      {/* Dialog components rendered with createPortal to avoid aria-hidden conflicts */}
      {portalContainer && deleteDialog && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 pointer-events-auto">
          <div className="bg-background border-2 border-border rounded-base shadow-lg p-6 w-full max-w-sm">
            <div className="mb-4 text-lg font-bold">Tem a certeza que quer apagar?</div>
            <div className="mb-6 text-sm text-gray-600 dark:text-gray-300">Não pode recuperar estes dados</div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" className="font-base border-2 border-border rounded-base shadow-sm" onClick={() => { setDeleteDialog(null); }}>
                Cancelar
              </Button>
              <Button
                variant="destructive"
                className="font-base border-2 border-destructive rounded-base shadow-sm"
                onClick={async () => {
                  const { jobId, itemId, idx } = deleteDialog;
                  
                  if (!itemId) {
                    setDeleteDialog(null);
                    return;
                  }
                  
                  const supabase = createBrowserClient();
                  
                  // First delete from designer_items
                  await supabase.from('designer_items').delete().eq('item_id', itemId);
                  
                  // Then delete from items_base
                  await supabase.from('items_base').delete().eq('id', itemId);
                  
                  // Update state
                  setDrawerItems(prev => {
                    const updated = (prev[jobId] || []).filter((_, i) => i !== idx);
                    return { ...prev, [jobId]: updated };
                  });
                  
                  setDeleteDialog(null);
                }}
              >
                Apagar
              </Button>
            </div>
          </div>
        </div>,
        portalContainer
      )}
    </>
  )
} 
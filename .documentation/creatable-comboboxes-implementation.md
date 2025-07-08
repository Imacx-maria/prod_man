# Creatable Comboboxes - Solução para Adicionar Clientes e Armazens

Esta solução implementa comboboxes que permitem criar novos clientes e armazens diretamente da interface, seguindo o padrão recomendado na documentação do shadcn/ui.

## 🎯 Problema Resolvido

Anteriormente, quando um cliente ou armazém não existia na lista, era necessário:
1. Ir para a página "Definições" 
2. Adicionar o novo item manualmente
3. Voltar à interface original
4. Selecionar o novo item

Agora, é possível criar novos itens diretamente no combobox quando não existem!

## 📁 Arquivos Criados

### 1. **CreatableCombobox.tsx** (Base Component)
- `src/components/ui/CreatableCombobox.tsx`
- Componente base que estende o Combobox existente
- Implementa o padrão `CommandEmpty` replacement
- Suporta criação de novos itens via callback `onCreateNew`

### 2. **CreatableClienteCombobox.tsx**
- `src/components/CreatableClienteCombobox.tsx`
- Combobox específico para clientes
- Cria automaticamente novos clientes na tabela `clientes`
- Atualiza a lista de opções em tempo real

### 3. **CreatableArmazemCombobox.tsx**
- `src/components/CreatableArmazemCombobox.tsx`
- Combobox específico para armazens
- Cria automaticamente novos armazens na tabela `armazens`
- Atualiza a lista de opções em tempo real

### 4. **LogisticaTableWithCreatable.tsx**
- `src/components/LogisticaTableWithCreatable.tsx`
- Versão melhorada da LogisticaTable
- Usa os novos comboboxes creatáveis
- Mantém compatibilidade com a interface existente

### 5. **CreatableComboboxExample.tsx**
- `src/components/examples/CreatableComboboxExample.tsx`
- Exemplo de uso dos novos componentes
- Demonstração completa da funcionalidade

## 🚀 Como Usar

### Uso Básico - CreatableClienteCombobox

```tsx
import CreatableClienteCombobox, { ClienteOption } from '@/components/CreatableClienteCombobox'

function MyComponent() {
  const [clientes, setClientes] = useState<ClienteOption[]>([])
  const [selectedCliente, setSelectedCliente] = useState('')

  return (
    <CreatableClienteCombobox
      value={selectedCliente}
      onChange={setSelectedCliente}
      options={clientes}
      onOptionsUpdate={setClientes} // Atualiza lista quando novo item é criado
      placeholder="Selecione ou crie um cliente"
    />
  )
}
```

### Uso Básico - CreatableArmazemCombobox

```tsx
import CreatableArmazemCombobox, { ArmazemOption } from '@/components/CreatableArmazemCombobox'

function MyComponent() {
  const [armazens, setArmazens] = useState<ArmazemOption[]>([])
  const [selectedArmazem, setSelectedArmazem] = useState('')

  return (
    <CreatableArmazemCombobox
      value={selectedArmazem}
      onChange={setSelectedArmazem}
      options={armazens}
      onOptionsUpdate={setArmazens} // Atualiza lista quando novo item é criado
      placeholder="Selecione ou crie um armazém"
    />
  )
}
```

### Substituir LogisticaTable Existente

Para usar na sua interface atual, substitua:

```tsx
// Antes
import LogisticaTable from '@/components/LogisticaTable'

// Depois
import LogisticaTableWithCreatable from '@/components/LogisticaTableWithCreatable'
```

E adicione os callbacks para atualização:

```tsx
<LogisticaTableWithCreatable
  // ... todas as props existentes
  onClientesUpdate={(newClientes) => {
    // Atualizar estado dos clientes
    setLogisticaClientes(newClientes)
  }}
  onArmazensUpdate={(newArmazens) => {
    // Atualizar estado dos armazens  
    setLogisticaArmazens(newArmazens)
  }}
/>
```

## 🎨 Funcionalidades

### 1. **Criação Automática**
- Digite um nome que não existe
- Aparece opção "Criar [nome]" com ícone +
- Clique para criar automaticamente

### 2. **Feedback Visual**
- Loading spinner durante criação
- Ícone + para identificar opção de criação
- Estado de loading no combobox

### 3. **Integração com Supabase**
- Cria registros diretamente na base de dados
- Retorna o ID do novo registro
- Atualiza lista local automaticamente

### 4. **TypeScript Support**
- Interfaces bem definidas
- Tipos seguros para todas as props
- IntelliSense completo

## 🔧 API Reference

### CreatableCombobox Props

```tsx
interface CreatableComboboxProps {
  value: string
  onChange: (value: string) => void
  onCreateNew?: (inputValue: string) => Promise<CreatableComboboxOption | null>
  options: CreatableComboboxOption[]
  placeholder?: string
  label?: string
  disabled?: boolean
  loading?: boolean
  error?: string | null
  className?: string
  buttonClassName?: string
  searchPlaceholder?: string
  emptyMessage?: string
  loadingMessage?: string
  maxWidth?: string
  createMessage?: string
  allowCreate?: boolean
}
```

### ClienteOption Interface

```tsx
interface ClienteOption {
  value: string  // ID do cliente
  label: string  // Nome do cliente
}
```

### ArmazemOption Interface

```tsx
interface ArmazemOption {
  value: string          // ID do armazém
  label: string          // Nome do armazém
  morada?: string | null // Morada (opcional)
  codigo_pos?: string | null // Código postal (opcional)
}
```

## 🛠️ Personalização

### Mensagens Customizadas

```tsx
<CreatableClienteCombobox
  createMessage="Adicionar cliente" // Personalizar mensagem
  emptyMessage="Nenhum cliente encontrado"
  loadingMessage="Procurando clientes..."
  placeholder="Digite para procurar ou criar"
/>
```

### Estilos Customizados

```tsx
<CreatableArmazemCombobox
  className="w-full max-w-md" // Container
  buttonClassName="border-blue-500" // Botão do combobox
  maxWidth="200px" // Largura máxima
/>
```

### Desativar Criação

```tsx
<CreatableCombobox
  allowCreate={false} // Desativa criação de novos itens
  onCreateNew={undefined} // Remove callback
/>
```

## 📝 Estrutura da Base de Dados

### Tabela `clientes`
```sql
- id (uuid, primary key)
- nome_cl (text, required) 
- numero_phc (text, nullable)
- morada (text, nullable)
- codigo_pos (text, nullable)
- telefone (text, nullable)
- created_at (timestamp)
- updated_at (timestamp)
```

### Tabela `armazens`
```sql
- id (uuid, primary key)
- nome_arm (text, required)
- numero_phc (text, nullable)
- morada (text, nullable)
- codigo_pos (text, nullable)
- created_at (timestamp)
- updated_at (timestamp)
```

## 🔒 Permissões Supabase

Certifique-se de que as políticas RLS permitem:

```sql
-- Política para criar clientes
CREATE POLICY "Users can insert clientes" ON clientes 
FOR INSERT TO authenticated WITH CHECK (true);

-- Política para criar armazens
CREATE POLICY "Users can insert armazens" ON armazens 
FOR INSERT TO authenticated WITH CHECK (true);
```

## 🧪 Teste da Funcionalidade

1. Navegue até a página com o exemplo: `/components/examples/CreatableComboboxExample`
2. Digite um nome que não existe (ex: "Cliente Teste")
3. Clique na opção "Criar Cliente Teste"
4. Verifique que o novo item foi criado e selecionado
5. Verifique na base de dados que o registro foi adicionado

## 🎯 Próximos Passos

Para integrar na sua aplicação:

1. **Identificar onde usar**: Localize todos os comboboxes de clientes e armazens
2. **Substituir componentes**: Troque pelos novos comboboxes creatáveis  
3. **Adicionar callbacks**: Implemente `onOptionsUpdate` para atualizar listas
4. **Testar criação**: Verifique que novos itens são criados corretamente
5. **Ajustar estilos**: Personalize aparência conforme necessário

## 🐛 Troubleshooting

### Erro "Cannot create item"
- Verifique permissões RLS no Supabase
- Confirme que as tabelas existem
- Verifique conexão com a base de dados

### Novo item não aparece na lista
- Certifique-se de usar `onOptionsUpdate`
- Verifique se o callback está a atualizar o estado
- Confirme formato das opções (value/label)

### Combobox não mostra opção "Criar"
- Verifique se `allowCreate={true}` 
- Confirme se `onCreateNew` está definido
- Certifique-se de que o texto não existe nas opções

## 📚 Referências

- [Shadcn/UI Combobox](https://ui.shadcn.com/docs/components/combobox)
- [CMDK Documentation](https://cmdk.paco.me/)
- [Radix UI Popover](https://www.radix-ui.com/docs/primitives/components/popover)
- [Supabase JavaScript Client](https://supabase.com/docs/reference/javascript)

## 🔄 Histórico de Alterações

### v1.0.0 - Implementação Inicial
- Criação do componente base `CreatableCombobox`
- Implementação específica para clientes e armazens
- Integração com Supabase para criação automática
- Exemplo demonstrativo completo
- Documentação abrangente

---

Esta solução resolve completamente o problema de adicionar clientes e armazens diretamente da interface, mantendo a usabilidade e seguindo as melhores práticas do ecossistema shadcn/ui. 
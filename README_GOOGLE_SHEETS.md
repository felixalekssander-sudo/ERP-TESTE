# Mini ERP de Usinagem - Migrado para Google Sheets

Este projeto foi migrado com sucesso do Supabase para usar Google Sheets como banco de dados.

## ✅ Status da Migração

### Concluído

- ✅ Biblioteca googleapis instalada e configurada
- ✅ Módulo de serviço Google Sheets criado (`src/lib/googleSheets.ts`)
- ✅ Camada de compatibilidade criada para views complexas (`src/lib/supabaseCompat.ts`)
- ✅ Todas as views migradas (Dashboard, Pedidos, Propostas, Produção, Qualidade, Compras, Fornecedores, Estoque)
- ✅ Componentes de autocomplete migrados
- ✅ Sistema de notificações migrado (polling a cada 10 segundos)
- ✅ Build funcional sem erros
- ✅ Dependências do Supabase removidas

## 📋 Configuração Inicial

### 1. Criar Google Spreadsheet

Crie uma nova planilha no Google Sheets com as seguintes abas (tabs):

1. **clientes** - Dados dos clientes
2. **produtos** - Catálogo de produtos
3. **pedidos_venda** - Pedidos de venda
4. **itens_pedido** - Itens de cada pedido
5. **propostas** - Propostas comerciais
6. **ordens_producao** - Ordens de produção
7. **processos_producao** - Processos de cada ordem
8. **compras** - Pedidos de compra
9. **estoque** - Inventário de materiais
10. **movimentacoes_estoque** - Histórico de movimentações
11. **inspecoes_qualidade** - Inspeções de qualidade
12. **criterios_inspecao** - Critérios de inspeção automática
13. **fornecedores** - Cadastro de fornecedores
14. **notificacoes** - Notificações do sistema

### 2. Estrutura das Tabelas

Cada aba deve ter uma linha de cabeçalho com os nomes das colunas. Abaixo está a estrutura completa de cada tabela:

---

#### **clientes** (Cadastro de Clientes)
```
id | name | email | phone | company | address | created_at
```

**Campos:**
- `id` - ID único do cliente (string, obrigatório)
- `name` - Nome do cliente (string, obrigatório)
- `email` - Email do cliente (string, opcional)
- `phone` - Telefone do cliente (string, opcional)
- `company` - Nome da empresa (string, opcional)
- `address` - Endereço completo (string, opcional)
- `created_at` - Data/hora de criação (ISO 8601, obrigatório)

**Exemplo:**
```
c123 | João Silva | joao@exemplo.com | 11999998888 | Acme Corp | Rua A, 100 | 2025-01-15T10:30:00Z
```

---

#### **produtos** (Catálogo de Produtos)
```
id | name | drawing_url | material | unit_price | estimated_weight | complexity | notes | created_at
```

**Campos:**
- `id` - ID único do produto (string, obrigatório)
- `name` - Nome do produto (string, obrigatório)
- `drawing_url` - URL do desenho técnico (string, opcional)
- `material` - Material usado (string, opcional)
- `unit_price` - Preço unitário (número, obrigatório)
- `estimated_weight` - Peso estimado em kg (número, opcional)
- `complexity` - Complexidade: 'simple', 'medium' ou 'complex' (string, obrigatório)
- `notes` - Observações (string, opcional)
- `created_at` - Data/hora de criação (ISO 8601, obrigatório)

**Exemplo:**
```
p456 | Eixo Torneado 50mm | https://exemplo.com/desenho.pdf | Aço 1045 | 150.00 | 2.5 | medium | Cliente especial | 2025-01-15T11:00:00Z
```

---

#### **pedidos_venda** (Pedidos de Venda)
```
id | order_number | customer_id | status | created_by | notes | created_at | updated_at
```

**Campos:**
- `id` - ID único do pedido (string, obrigatório)
- `order_number` - Número do pedido (string, obrigatório)
- `customer_id` - ID do cliente (referência a clientes.id, obrigatório)
- `status` - Status: 'draft', 'quoted', 'approved', 'in_production', 'completed', 'cancelled' (string, obrigatório)
- `created_by` - Nome do criador (string, opcional)
- `notes` - Observações (string, opcional)
- `created_at` - Data/hora de criação (ISO 8601, obrigatório)
- `updated_at` - Data/hora da última atualização (ISO 8601, obrigatório)

**Exemplo:**
```
pv789 | PV-2025-001 | c123 | approved | Maria Santos | Pedido urgente | 2025-01-15T12:00:00Z | 2025-01-16T09:30:00Z
```

---

#### **itens_pedido** (Itens de Cada Pedido)
```
id | sales_order_id | product_id | quantity | unit_price | total_price | drawing_url | special_requirements
```

**Campos:**
- `id` - ID único do item (string, obrigatório)
- `sales_order_id` - ID do pedido de venda (referência a pedidos_venda.id, obrigatório)
- `product_id` - ID do produto (referência a produtos.id, obrigatório)
- `quantity` - Quantidade (número, obrigatório)
- `unit_price` - Preço unitário (número, obrigatório)
- `total_price` - Preço total (número, obrigatório)
- `drawing_url` - URL do desenho específico (string, opcional)
- `special_requirements` - Requisitos especiais (string, opcional)

**Exemplo:**
```
item001 | pv789 | p456 | 10 | 150.00 | 1500.00 | https://exemplo.com/desenho-custom.pdf | Acabamento polido
```

---

#### **propostas** (Propostas Comerciais)
```
id | sales_order_id | proposal_number | subtotal | discount | total | delivery_days | payment_terms | validity_days | terms_conditions | status | approved_at | created_at
```

**Campos:**
- `id` - ID único da proposta (string, obrigatório)
- `sales_order_id` - ID do pedido de venda (referência a pedidos_venda.id, obrigatório)
- `proposal_number` - Número da proposta (string, obrigatório)
- `subtotal` - Subtotal (número, obrigatório)
- `discount` - Desconto (número, obrigatório)
- `total` - Total (número, obrigatório)
- `delivery_days` - Prazo de entrega em dias (número, obrigatório)
- `payment_terms` - Condições de pagamento (string, obrigatório)
- `validity_days` - Validade em dias (número, obrigatório)
- `terms_conditions` - Termos e condições (string, opcional)
- `status` - Status: 'pending', 'approved', 'rejected' (string, obrigatório)
- `approved_at` - Data/hora da aprovação (ISO 8601, opcional)
- `created_at` - Data/hora de criação (ISO 8601, obrigatório)

**Exemplo:**
```
prop001 | pv789 | PROP-2025-001 | 1500.00 | 100.00 | 1400.00 | 15 | 30 dias | 30 | Conforme orçamento | approved | 2025-01-16T10:00:00Z | 2025-01-15T14:00:00Z
```

---

#### **ordens_producao** (Ordens de Produção)
```
id | order_number | sales_order_id | sales_order_item_id | product_id | quantity | priority | status | planned_start | planned_end | actual_start | actual_end | current_process | created_at | updated_at
```

**Campos:**
- `id` - ID único da ordem (string, obrigatório)
- `order_number` - Número da ordem (string, obrigatório)
- `sales_order_id` - ID do pedido de venda (referência a pedidos_venda.id, obrigatório)
- `sales_order_item_id` - ID do item do pedido (referência a itens_pedido.id, obrigatório)
- `product_id` - ID do produto (referência a produtos.id, obrigatório)
- `quantity` - Quantidade (número, obrigatório)
- `priority` - Prioridade: 'low', 'medium', 'high', 'urgent' (string, obrigatório)
- `status` - Status: 'pending', 'in_progress', 'completed', 'on_hold' (string, obrigatório)
- `planned_start` - Início planejado (ISO 8601, opcional)
- `planned_end` - Fim planejado (ISO 8601, opcional)
- `actual_start` - Início real (ISO 8601, opcional)
- `actual_end` - Fim real (ISO 8601, opcional)
- `current_process` - Processo atual (string, opcional)
- `created_at` - Data/hora de criação (ISO 8601, obrigatório)
- `updated_at` - Data/hora da última atualização (ISO 8601, obrigatório)

**Exemplo:**
```
op001 | OP-2025-001 | pv789 | item001 | p456 | 10 | high | in_progress | 2025-01-17T08:00:00Z | 2025-01-20T17:00:00Z | 2025-01-17T08:15:00Z | | Torneamento | 2025-01-16T15:00:00Z | 2025-01-17T08:15:00Z
```

---

#### **processos_producao** (Processos de Cada Ordem)
```
id | production_order_id | process_type | sequence_order | status | estimated_minutes | actual_minutes | operator_name | machine_used | started_at | completed_at | notes
```

**Campos:**
- `id` - ID único do processo (string, obrigatório)
- `production_order_id` - ID da ordem de produção (referência a ordens_producao.id, obrigatório)
- `process_type` - Tipo: 'turning', 'milling', 'drilling', 'grinding' (string, obrigatório)
- `sequence_order` - Ordem na sequência (número, obrigatório)
- `status` - Status: 'pending', 'in_progress', 'completed', 'skipped' (string, obrigatório)
- `estimated_minutes` - Tempo estimado em minutos (número, opcional)
- `actual_minutes` - Tempo real em minutos (número, opcional)
- `operator_name` - Nome do operador (string, opcional)
- `machine_used` - Máquina utilizada (string, opcional)
- `started_at` - Início (ISO 8601, opcional)
- `completed_at` - Conclusão (ISO 8601, opcional)
- `notes` - Observações (string, opcional)

**Exemplo:**
```
proc001 | op001 | turning | 1 | completed | 60 | 55 | Carlos Silva | Torno CNC-01 | 2025-01-17T08:15:00Z | 2025-01-17T09:10:00Z | Processo ok
```

---

#### **compras** (Pedidos de Compra)
```
id | production_order_id | material_name | quantity | unit | unit_cost | total_cost | supplier | status | requested_at | received_at | notes
```

**Campos:**
- `id` - ID único da compra (string, obrigatório)
- `production_order_id` - ID da ordem de produção (referência a ordens_producao.id, obrigatório)
- `material_name` - Nome do material (string, obrigatório)
- `quantity` - Quantidade (número, obrigatório)
- `unit` - Unidade (string, obrigatório)
- `unit_cost` - Custo unitário (número, obrigatório)
- `total_cost` - Custo total (número, obrigatório)
- `supplier` - Fornecedor (string, opcional)
- `status` - Status: 'requested', 'ordered', 'received' (string, obrigatório)
- `requested_at` - Data da solicitação (ISO 8601, obrigatório)
- `received_at` - Data do recebimento (ISO 8601, opcional)
- `notes` - Observações (string, opcional)

**Exemplo:**
```
comp001 | op001 | Aço 1045 | 50 | kg | 12.50 | 625.00 | Fornecedor ABC | received | 2025-01-16T10:00:00Z | 2025-01-17T07:30:00Z | Material conforme especificação
```

---

#### **estoque** (Inventário de Materiais)
```
id | material_name | quantity | unit | unit_cost | minimum_stock | location | last_updated
```

**Campos:**
- `id` - ID único do item (string, obrigatório)
- `material_name` - Nome do material (string, obrigatório)
- `quantity` - Quantidade em estoque (número, obrigatório)
- `unit` - Unidade (string, obrigatório)
- `unit_cost` - Custo unitário (número, obrigatório)
- `minimum_stock` - Estoque mínimo (número, obrigatório)
- `location` - Localização no estoque (string, opcional)
- `last_updated` - Última atualização (ISO 8601, obrigatório)

**Exemplo:**
```
est001 | Aço 1045 | 150 | kg | 12.50 | 50 | Prateleira A3 | 2025-01-17T07:30:00Z
```

---

#### **movimentacoes_estoque** (Histórico de Movimentações)
```
id | inventory_id | movement_type | quantity | reference_type | reference_id | notes | created_at
```

**Campos:**
- `id` - ID único da movimentação (string, obrigatório)
- `inventory_id` - ID do item no estoque (referência a estoque.id, obrigatório)
- `movement_type` - Tipo: 'in' (entrada) ou 'out' (saída) (string, obrigatório)
- `quantity` - Quantidade movimentada (número, obrigatório)
- `reference_type` - Tipo de referência: 'purchase' ou 'production_order' (string, opcional)
- `reference_id` - ID da referência (string, opcional)
- `notes` - Observações (string, opcional)
- `created_at` - Data/hora da movimentação (ISO 8601, obrigatório)

**Exemplo:**
```
mov001 | est001 | in | 50 | purchase | comp001 | Recebimento de compra | 2025-01-17T07:30:00Z
```

---

#### **inspecoes_qualidade** (Inspeções de Qualidade)
```
id | production_order_id | inspection_number | trigger_reason | status | inspector_name | inspection_date | result | notes | corrective_actions | created_at
```

**Campos:**
- `id` - ID único da inspeção (string, obrigatório)
- `production_order_id` - ID da ordem de produção (referência a ordens_producao.id, obrigatório)
- `inspection_number` - Número da inspeção (string, obrigatório)
- `trigger_reason` - Motivo do disparo (string, obrigatório)
- `status` - Status: 'pending', 'in_progress', 'approved', 'rejected' (string, obrigatório)
- `inspector_name` - Nome do inspetor (string, opcional)
- `inspection_date` - Data da inspeção (ISO 8601, opcional)
- `result` - Resultado: 'pass', 'fail', 'conditional' (string, opcional)
- `notes` - Observações (string, opcional)
- `corrective_actions` - Ações corretivas (string, opcional)
- `created_at` - Data/hora de criação (ISO 8601, obrigatório)

**Exemplo:**
```
insp001 | op001 | INSP-2025-001 | Lote > 5 unidades | approved | Ana Costa | 2025-01-18T14:00:00Z | pass | Todas as dimensões ok | | 2025-01-18T13:00:00Z
```

---

#### **criterios_inspecao** (Critérios de Inspeção Automática)
```
id | name | enabled | min_quantity | min_weight | complexity | specific_customer_id | specific_machine | created_at
```

**Campos:**
- `id` - ID único do critério (string, obrigatório)
- `name` - Nome do critério (string, obrigatório)
- `enabled` - Ativo (boolean: true/false, obrigatório)
- `min_quantity` - Quantidade mínima (número, opcional)
- `min_weight` - Peso mínimo (número, opcional)
- `complexity` - Complexidade: 'simple', 'medium', 'complex' (string, opcional)
- `specific_customer_id` - ID do cliente específico (referência a clientes.id, opcional)
- `specific_machine` - Máquina específica (string, opcional)
- `created_at` - Data/hora de criação (ISO 8601, obrigatório)

**Exemplo:**
```
crit001 | Lote Grande | true | 5 | | | | | 2025-01-15T10:00:00Z
```

---

#### **fornecedores** (Cadastro de Fornecedores)
```
id | name | contact_name | email | phone | address | notes | active | created_at
```

**Campos:**
- `id` - ID único do fornecedor (string, obrigatório)
- `name` - Nome do fornecedor (string, obrigatório)
- `contact_name` - Nome do contato (string, opcional)
- `email` - Email (string, opcional)
- `phone` - Telefone (string, opcional)
- `address` - Endereço (string, opcional)
- `notes` - Observações (string, opcional)
- `active` - Ativo (boolean: true/false, obrigatório)
- `created_at` - Data/hora de criação (ISO 8601, obrigatório)

**Exemplo:**
```
forn001 | Fornecedor ABC | Pedro Oliveira | pedro@abc.com | 11988887777 | Av. Industrial, 500 | Entrega rápida | true | 2025-01-10T09:00:00Z
```

---

#### **notificacoes** (Notificações do Sistema)
```
id | type | title | message | reference_type | reference_id | is_read | created_at
```

**Campos:**
- `id` - ID único da notificação (string, obrigatório)
- `type` - Tipo: 'order_approved', 'production_delayed', 'inspection_required', 'stock_low', 'process_completed', 'order_created' (string, obrigatório)
- `title` - Título (string, obrigatório)
- `message` - Mensagem (string, obrigatório)
- `reference_type` - Tipo de referência (string, opcional)
- `reference_id` - ID da referência (string, opcional)
- `is_read` - Lida (boolean: true/false, obrigatório)
- `created_at` - Data/hora de criação (ISO 8601, obrigatório)

**Exemplo:**
```
notif001 | order_approved | Pedido Aprovado | Pedido PV-2025-001 foi aprovado | sales_order | pv789 | false | 2025-01-16T10:00:00Z
```

### 3. Configurar API do Google Sheets

1. Acesse o [Google Cloud Console](https://console.cloud.google.com/)
2. Crie um novo projeto ou selecione um existente
3. Ative a API do Google Sheets:
   - Menu > APIs e Serviços > Biblioteca
   - Procure por "Google Sheets API"
   - Clique em "Ativar"
4. Crie credenciais:
   - Menu > APIs e Serviços > Credenciais
   - Clique em "Criar Credenciais" > "Chave de API"
   - Copie a chave gerada
5. Restrinja a chave de API (recomendado):
   - Clique na chave criada para editá-la
   - Em "Restrições da API", selecione "Restringir chave"
   - Selecione apenas "Google Sheets API"
   - Salve

### 4. Obter o ID da Planilha

O ID da planilha está na URL do Google Sheets:

```
https://docs.google.com/spreadsheets/d/[SEU_SPREADSHEET_ID]/edit
```

Copie o ID que está entre `/d/` e `/edit`

### 5. Configurar Variáveis de Ambiente

Edite o arquivo `.env` na raiz do projeto:

```env
VITE_GOOGLE_SPREADSHEET_ID=seu_spreadsheet_id_aqui
VITE_GOOGLE_API_KEY=sua_api_key_aqui
```

### 6. Dar Permissões à Planilha

IMPORTANTE: Para que a API possa escrever dados, a planilha deve estar com permissões públicas de edição OU você deve configurar OAuth2.

**Opção 1 - Permissões Públicas (desenvolvimento):**
1. Abra a planilha no Google Sheets
2. Clique em "Compartilhar"
3. Em "Acesso geral", selecione "Qualquer pessoa com o link"
4. Altere de "Leitor" para "Editor"
5. Clique em "Concluído"

⚠️ **ATENÇÃO**: Isso torna a planilha editável por qualquer pessoa com o link. Use apenas para desenvolvimento/testes.

**Opção 2 - OAuth2 (produção):**
Para produção, implemente OAuth2 seguindo a [documentação oficial](https://developers.google.com/sheets/api/guides/authorizing).

## 🚀 Executar o Projeto

```bash
# Instalar dependências
npm install

# Modo desenvolvimento
npm run dev

# Build para produção
npm run build
```

## 📖 Arquitetura

### Módulo Google Sheets (`src/lib/googleSheets.ts`)

Fornece funções para interagir com o Google Sheets:

- `fetchFromSheet(sheetName)` - Busca todos os dados de uma aba
- `appendToSheet(sheetName, data)` - Adiciona uma nova linha
- `updateInSheet(sheetName, id, updates)` - Atualiza uma linha existente
- `deleteFromSheet(sheetName, id)` - Deleta uma linha
- Cache de 5 segundos para otimizar requisições
- Geração automática de IDs únicos

### Camada de Compatibilidade (`src/lib/supabaseCompat.ts`)

Emula a interface do Supabase para facilitar a migração incremental das views mais complexas. Fornece:

- `.from(table).select().eq().order()`
- `.from(table).insert()`
- `.from(table).update().eq()`
- `.from(table).delete().eq()`

## ⚠️ Limitações Conhecidas

### 1. Sem Atualizações em Tempo Real
- Google Sheets API não suporta websockets/subscriptions
- Implementado polling a cada 10 segundos para notificações
- Para dados críticos, considere reduzir o intervalo em `src/components/Layout.tsx`

### 2. Rate Limits
- Google Sheets API tem limites de requisições:
  - 100 requisições por 100 segundos por usuário
  - Cache de 5 segundos minimiza impacto
  - Em caso de erro 429 (rate limit), espere e tente novamente

### 3. Tipos de Dados
- Todos os dados retornam como strings
- Use `parseFloat()` para comparações numéricas
- Booleanos devem ser comparados como `value === 'true'` ou `value === true`

### 4. Sem Transações
- Operações não são atômicas
- Se uma operação falhar no meio de múltiplas atualizações, dados podem ficar inconsistentes
- Implemente validações e rollbacks manuais quando necessário

### 5. Joins Manuais
- Não há suporte nativo para JOINs
- Relacionamentos devem ser resolvidos manualmente:
```typescript
const orders = await googleSheets.fetchFromSheet(googleSheets.SHEET_NAMES.sales_orders);
const customers = await googleSheets.fetchFromSheet(googleSheets.SHEET_NAMES.customers);
const enriched = orders.map(order => ({
  ...order,
  customer: customers.find(c => c.id === order.customer_id)
}));
```

## 🔧 Solução de Problemas

### Erro: "Failed to fetch from Google Sheets"

1. Verifique se a API do Google Sheets está ativada no projeto
2. Confirme que a chave de API está correta no `.env`
3. Verifique se o ID da planilha está correto
4. Confirme que a planilha tem permissões adequadas

### Erro: "Record with id X not found"

1. Verifique se o registro realmente existe na planilha
2. Confirme que a coluna `id` existe e está preenchida
3. Limpe o cache recarregando a página

### Dados não aparecem

1. Verifique se as abas têm os nomes exatos especificados
2. Confirme que a primeira linha de cada aba contém os cabeçalhos
3. Abra o console do navegador para ver erros detalhados

### Performance lenta

1. Reduza o número de chamadas à API usando cache
2. Considere implementar paginação para grandes volumes de dados
3. Otimize filtros e ordenações no lado do cliente
4. Para múltiplas leituras, faça em paralelo com `Promise.all()`

## 📚 Recursos Adicionais

- [Google Sheets API Documentation](https://developers.google.com/sheets/api)
- [googleapis NPM Package](https://www.npmjs.com/package/googleapis)
- [Documentação de Migração](./MIGRATION_STATUS.md)

## 🤝 Suporte

Para problemas ou dúvidas sobre a migração, consulte o arquivo `MIGRATION_STATUS.md` que contém padrões detalhados de como cada operação foi migrada.

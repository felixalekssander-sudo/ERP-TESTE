# Migration Status: Supabase to Google Sheets

## ✅ Completed Migrations

### Core Infrastructure
- ✅ Installed googleapis library
- ✅ Created googleSheets service module (`src/lib/googleSheets.ts`)
- ✅ Updated environment variables in `.env`
- ✅ Removed Supabase package and dependencies

### Components
- ✅ ProductAutocomplete.tsx
- ✅ MaterialAutocomplete.tsx
- ✅ Layout.tsx

### Views
- ✅ Dashboard.tsx
- ✅ SalesOrders.tsx
- ✅ SalesOrderForm.tsx
- ✅ Proposals.tsx
- ✅ Suppliers.tsx

## ⚠️ Remaining Migrations

The following files still import from Supabase and need migration:

1. **ProductionOrders.tsx** - List and manage production orders
2. **ProductionOrderDetail.tsx** - Detailed view with process management
3. **QualityInspections.tsx** - Quality inspection management
4. **InspectionCriteriaManager.tsx** - Manage inspection criteria
5. **Purchases.tsx** - Purchase orders list
6. **PurchaseDetail.tsx** - Purchase order details
7. **Inventory.tsx** - Inventory management

## Migration Pattern

For each remaining file, follow this pattern:

### 1. Update Import
```typescript
// OLD:
import { supabase } from '../lib/supabase';

// NEW:
import { googleSheets } from '../lib/googleSheets';
```

### 2. Fetch Data Pattern
```typescript
// OLD:
const { data } = await supabase
  .from('table_name')
  .select('*')
  .order('field');

// NEW:
const data = await googleSheets.fetchFromSheet(googleSheets.SHEET_NAMES.table_name);
const sorted = data.sort((a, b) => a.field.localeCompare(b.field));
```

### 3. Insert Data Pattern
```typescript
// OLD:
const { data } = await supabase
  .from('table_name')
  .insert({ field: value })
  .select()
  .single();

// NEW:
const data = await googleSheets.appendToSheet(googleSheets.SHEET_NAMES.table_name, {
  field: value
});
```

### 4. Update Data Pattern
```typescript
// OLD:
await supabase
  .from('table_name')
  .update({ field: value })
  .eq('id', id);

// NEW:
await googleSheets.updateInSheet(googleSheets.SHEET_NAMES.table_name, id, {
  field: value
});
```

### 5. Delete Data Pattern
```typescript
// OLD:
await supabase
  .from('table_name')
  .delete()
  .eq('id', id);

// NEW:
await googleSheets.deleteFromSheet(googleSheets.SHEET_NAMES.table_name, id);
```

### 6. JOIN Pattern (Manual)
```typescript
// OLD (automatic JOIN):
const { data } = await supabase
  .from('orders')
  .select('*, customer:customers(*)')

// NEW (manual JOIN):
const orders = await googleSheets.fetchFromSheet(googleSheets.SHEET_NAMES.sales_orders);
const customers = await googleSheets.fetchFromSheet(googleSheets.SHEET_NAMES.customers);

const ordersWithCustomers = orders.map(order => ({
  ...order,
  customer: customers.find(c => c.id === order.customer_id)
}));
```

## Google Sheets Setup

Before using the application, you must:

1. Create a Google Sheet with the following tabs (abas):
   - clientes
   - produtos
   - pedidos_venda
   - itens_pedido
   - propostas
   - ordens_producao
   - processos_producao
   - compras
   - estoque
   - movimentacoes_estoque
   - inspecoes_qualidade
   - criterios_inspecao
   - fornecedores
   - notificacoes

2. Each tab should have a header row with column names matching the field names in the TypeScript types

3. Get your Google Sheets API credentials:
   - Go to Google Cloud Console
   - Create a project or select existing
   - Enable Google Sheets API
   - Create credentials (API Key)
   - Copy the Spreadsheet ID from the URL

4. Update `.env` file:
   ```
   VITE_GOOGLE_SPREADSHEET_ID=your_spreadsheet_id_here
   VITE_GOOGLE_API_KEY=your_api_key_here
   ```

## Known Limitations

1. **No Real-time Updates**: Unlike Supabase's real-time subscriptions, Google Sheets requires polling (implemented as 10-second intervals in Layout.tsx)

2. **Rate Limits**: Google Sheets API has rate limits. The current implementation includes:
   - 5-second cache for read operations
   - Manual cache invalidation on writes

3. **No Transactions**: Operations are not atomic. If multiple updates fail partway through, data may be inconsistent

4. **String Comparisons**: All data from Google Sheets comes as strings, requiring `parseFloat()` for numeric comparisons

5. **Authentication**: Current implementation uses API Key (read/write access). For production, consider OAuth2 with Row Level Security

## Next Steps

Complete the migration of the remaining 7 view files using the patterns above. Each file should follow the same structure as the already-migrated files.

import { useState, useEffect } from 'react';
import { ArrowLeft, CheckCircle, Clock, Package } from 'lucide-react';
import { supabase } from '../lib/supabaseCompat';

interface PurchaseDetailProps {
  purchaseId: string;
  onNavigate: (view: string, data?: any) => void;
}

export default function PurchaseDetail({ purchaseId, onNavigate }: PurchaseDetailProps) {
  const [purchase, setPurchase] = useState<any>(null);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState('');
  const [quotedPrice, setQuotedPrice] = useState(0);
  const [leadTimeDays, setLeadTimeDays] = useState(0);
  const [supplierNotes, setSupplierNotes] = useState('');

  useEffect(() => {
    loadPurchaseDetails();
    loadSuppliers();
  }, [purchaseId]);

  const loadPurchaseDetails = async () => {
    const { data } = await supabase
      .from('purchases')
      .select(`
        *,
        production_order:production_orders(
          order_number,
          product:products(name),
          sales_order:sales_orders(customer:customers(name))
        )
      `)
      .eq('id', purchaseId)
      .maybeSingle();

    if (data) {
      setPurchase(data);
      setQuotedPrice(data.unit_cost);
    }
  };

  const loadSuppliers = async () => {
    const { data } = await supabase
      .from('suppliers')
      .select('*')
      .eq('active', true)
      .order('name');

    if (data) setSuppliers(data);
  };

  const orderPurchase = async () => {
    if (!selectedSupplier) {
      alert('Selecione um fornecedor');
      return;
    }

    const newUnitCost = quotedPrice;
    const newTotalCost = newUnitCost * purchase.quantity;

    await supabase
      .from('purchases')
      .update({
        status: 'ordered',
        supplier: selectedSupplier,
        unit_cost: newUnitCost,
        total_cost: newTotalCost,
        notes: supplierNotes,
      })
      .eq('id', purchaseId);

    await supabase.from('notifications').insert({
      type: 'order_created',
      title: 'Compra Realizada',
      message: `Material ${purchase.material_name} pedido de ${selectedSupplier}`,
      reference_type: 'purchase',
      reference_id: purchaseId,
    });

    setShowSupplierModal(false);
    loadPurchaseDetails();
  };

  const receivePurchase = async () => {
    await supabase
      .from('purchases')
      .update({
        status: 'received',
        received_at: new Date().toISOString(),
      })
      .eq('id', purchaseId);

    const { data: inventoryItem } = await supabase
      .from('inventory')
      .select('*')
      .eq('material_name', purchase.material_name)
      .maybeSingle();

    if (inventoryItem) {
      await supabase
        .from('inventory')
        .update({
          quantity: inventoryItem.quantity + purchase.quantity,
          last_updated: new Date().toISOString(),
        })
        .eq('id', inventoryItem.id);

      await supabase.from('inventory_movements').insert({
        inventory_id: inventoryItem.id,
        movement_type: 'in',
        quantity: purchase.quantity,
        reference_type: 'purchase',
        reference_id: purchaseId,
      });
    } else {
      const { data: newItem } = await supabase
        .from('inventory')
        .insert({
          material_name: purchase.material_name,
          quantity: purchase.quantity,
          unit: purchase.unit,
          unit_cost: purchase.unit_cost,
          minimum_stock: 0,
        })
        .select()
        .maybeSingle();

      if (newItem) {
        await supabase.from('inventory_movements').insert({
          inventory_id: newItem.id,
          movement_type: 'in',
          quantity: purchase.quantity,
          reference_type: 'purchase',
          reference_id: purchaseId,
        });
      }
    }

    await supabase.from('notifications').insert({
      type: 'process_completed',
      title: 'Material Recebido',
      message: `Material ${purchase.material_name} recebido e adicionado ao estoque`,
      reference_type: 'purchase',
      reference_id: purchaseId,
    });

    loadPurchaseDetails();
  };

  if (!purchase) {
    return <div>Carregando...</div>;
  }

  const statusColors = {
    requested: 'bg-yellow-100 text-yellow-700',
    ordered: 'bg-blue-100 text-blue-700',
    received: 'bg-green-100 text-green-700',
  };

  const statusLabels = {
    requested: 'Solicitado',
    ordered: 'Pedido Realizado',
    received: 'Recebido',
  };

  return (
    <div>
      <button
        onClick={() => onNavigate('purchases')}
        className="flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-6"
      >
        <ArrowLeft size={20} />
        Voltar para Compras
      </button>

      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-3xl font-bold mb-2">{purchase.material_name}</h1>
            <p className="text-slate-600">
              Ordem de Produção: <span className="font-medium">{purchase.production_order?.order_number}</span>
            </p>
            <p className="text-slate-600">
              Produto: <span className="font-medium">{purchase.production_order?.product?.name}</span>
            </p>
            <p className="text-slate-600">
              Cliente: <span className="font-medium">{purchase.production_order?.sales_order?.customer?.name}</span>
            </p>
          </div>
          <span className={`px-3 py-1 rounded-full text-sm font-semibold ${statusColors[purchase.status]}`}>
            {statusLabels[purchase.status]}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="p-4 bg-slate-50 rounded-lg">
            <p className="text-sm text-slate-600 mb-1">Quantidade</p>
            <p className="text-2xl font-bold">{purchase.quantity} {purchase.unit}</p>
          </div>
          <div className="p-4 bg-slate-50 rounded-lg">
            <p className="text-sm text-slate-600 mb-1">Custo Unitário</p>
            <p className="text-2xl font-bold">R$ {purchase.unit_cost.toFixed(2)}</p>
          </div>
          <div className="p-4 bg-slate-50 rounded-lg">
            <p className="text-sm text-slate-600 mb-1">Custo Total</p>
            <p className="text-2xl font-bold text-green-600">R$ {purchase.total_cost.toFixed(2)}</p>
          </div>
        </div>

        {purchase.supplier && (
          <div className="mb-6 p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-slate-600 mb-1">Fornecedor</p>
            <p className="text-lg font-semibold">{purchase.supplier}</p>
          </div>
        )}

        {purchase.notes && (
          <div className="mb-6">
            <h3 className="font-semibold mb-2">Observações</h3>
            <p className="text-slate-600">{purchase.notes}</p>
          </div>
        )}

        <div className="border-t pt-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-slate-600">Solicitado em</p>
              <p className="font-medium">{new Date(purchase.requested_at).toLocaleString('pt-BR')}</p>
            </div>
            {purchase.received_at && (
              <div>
                <p className="text-slate-600">Recebido em</p>
                <p className="font-medium">{new Date(purchase.received_at).toLocaleString('pt-BR')}</p>
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          {purchase.status === 'requested' && (
            <button
              onClick={() => setShowSupplierModal(true)}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Package size={20} />
              Realizar Pedido
            </button>
          )}
          {purchase.status === 'ordered' && (
            <button
              onClick={receivePurchase}
              className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              <CheckCircle size={20} />
              Confirmar Recebimento
            </button>
          )}
        </div>
      </div>

      {showSupplierModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" onClick={() => setShowSupplierModal(false)}>
          <div className="bg-white rounded-lg max-w-lg w-full p-8 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h2 className="text-2xl font-bold mb-6">Realizar Pedido</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Fornecedor *
                </label>
                <select
                  value={selectedSupplier}
                  onChange={(e) => setSelectedSupplier(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg"
                  required
                >
                  <option value="">Selecione um fornecedor</option>
                  {suppliers.map((supplier) => (
                    <option key={supplier.id} value={supplier.name}>
                      {supplier.name}
                    </option>
                  ))}
                </select>
                {suppliers.length === 0 && (
                  <p className="text-sm text-slate-500 mt-1">
                    Nenhum fornecedor cadastrado
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Preço Cotado *
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={quotedPrice}
                  onChange={(e) => setQuotedPrice(parseFloat(e.target.value))}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg"
                  required
                />
                <p className="text-sm text-slate-600 mt-1">
                  Total: R$ {(quotedPrice * purchase.quantity).toFixed(2)}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Prazo de Entrega (dias)
                </label>
                <input
                  type="number"
                  value={leadTimeDays}
                  onChange={(e) => setLeadTimeDays(parseInt(e.target.value))}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Observações
                </label>
                <textarea
                  value={supplierNotes}
                  onChange={(e) => setSupplierNotes(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg"
                  placeholder="Informações adicionais sobre o pedido"
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={orderPurchase}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  Confirmar Pedido
                </button>
                <button
                  onClick={() => setShowSupplierModal(false)}
                  className="px-4 py-2 bg-slate-300 text-slate-700 rounded-lg hover:bg-slate-400"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

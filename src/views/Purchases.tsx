import { useState, useEffect } from 'react';
import { Plus, CheckCircle, Eye, Package } from 'lucide-react';
import { supabase } from '../lib/supabaseCompat';
import type { Purchase } from '../lib/types';

interface PurchasesProps {
  onNavigate?: (view: string, data?: any) => void;
}

export default function Purchases({ onNavigate }: PurchasesProps) {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState({
    material_name: '',
    quantity: 0,
    unit: 'kg',
    unit_cost: 0,
    notes: '',
  });

  useEffect(() => {
    loadPurchases();
  }, []);

  const loadPurchases = async () => {
    const { data } = await supabase
      .from('purchases')
      .select('*, production_order:production_orders(order_number)')
      .order('requested_at', { ascending: false });

    if (data) setPurchases(data);
  };

  const createDirectPurchase = async () => {
    if (!formData.material_name) {
      alert('Nome do material é obrigatório');
      return;
    }

    const totalCost = formData.quantity * formData.unit_cost;

    const { error } = await supabase.from('purchases').insert({
      material_name: formData.material_name,
      quantity: formData.quantity,
      unit: formData.unit,
      unit_cost: formData.unit_cost,
      total_cost: totalCost,
      status: 'requested',
      notes: formData.notes,
    });

    if (!error) {
      setShowCreateModal(false);
      setFormData({
        material_name: '',
        quantity: 0,
        unit: 'kg',
        unit_cost: 0,
        notes: '',
      });
      loadPurchases();
    }
  };

  const markAsReceived = async (id: string, materialName: string, quantity: number, unit: string) => {
    await supabase
      .from('purchases')
      .update({ status: 'received', received_at: new Date().toISOString() })
      .eq('id', id);

    const { data: inventoryItem } = await supabase
      .from('inventory')
      .select('*')
      .eq('material_name', materialName)
      .maybeSingle();

    if (inventoryItem) {
      await supabase
        .from('inventory')
        .update({
          quantity: inventoryItem.quantity + quantity,
          last_updated: new Date().toISOString(),
        })
        .eq('id', inventoryItem.id);

      await supabase.from('inventory_movements').insert({
        inventory_id: inventoryItem.id,
        movement_type: 'in',
        quantity,
        reference_type: 'purchase',
        reference_id: id,
      });
    }

    loadPurchases();
  };

  const filteredPurchases = purchases.filter(purchase =>
    filterStatus === 'all' || purchase.status === filterStatus
  );

  const statusColors = {
    requested: 'bg-yellow-100 text-yellow-700',
    ordered: 'bg-blue-100 text-blue-700',
    received: 'bg-green-100 text-green-700',
  };

  const statusLabels = {
    requested: 'Solicitado',
    ordered: 'Pedido',
    received: 'Recebido',
  };

  const totalValue = filteredPurchases.reduce((sum, p) => sum + p.total_cost, 0);

  return (
    <div>
      <div className="mb-6 flex flex-wrap gap-4 justify-between items-center">
        <div className="flex gap-4">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Todos os Status</option>
            <option value="requested">Solicitado</option>
            <option value="ordered">Pedido</option>
            <option value="received">Recebido</option>
          </select>
        </div>

        <div className="flex gap-3">
          <div className="px-4 py-2 bg-slate-50 rounded-lg">
            <p className="text-xs text-slate-600">Total</p>
            <p className="text-lg font-bold">R$ {totalValue.toFixed(2)}</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus size={20} />
            Nova Compra
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Material</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Ordem Produção</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Quantidade</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Fornecedor</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Custo</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Status</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase">Ações</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-200">
            {filteredPurchases.map((purchase) => (
              <tr key={purchase.id} className="hover:bg-slate-50">
                <td className="px-6 py-4 whitespace-nowrap font-medium">{purchase.material_name}</td>
                <td className="px-6 py-4 whitespace-nowrap">{purchase.production_order?.order_number || '-'}</td>
                <td className="px-6 py-4 whitespace-nowrap">{purchase.quantity} {purchase.unit}</td>
                <td className="px-6 py-4 whitespace-nowrap">{purchase.supplier || '-'}</td>
                <td className="px-6 py-4 whitespace-nowrap font-semibold">R$ {purchase.total_cost.toFixed(2)}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${statusColors[purchase.status]}`}>
                    {statusLabels[purchase.status]}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right">
                  <div className="flex gap-2 justify-end">
                    {onNavigate && (
                      <button
                        onClick={() => onNavigate('purchase-detail', purchase)}
                        className="text-blue-600 hover:text-blue-900"
                        title="Ver detalhes"
                      >
                        <Eye size={18} />
                      </button>
                    )}
                    {purchase.status !== 'received' && (
                      <button
                        onClick={() => markAsReceived(purchase.id, purchase.material_name, purchase.quantity, purchase.unit)}
                        className="text-green-600 hover:text-green-900"
                        title="Marcar como recebido"
                      >
                        <CheckCircle size={18} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredPurchases.length === 0 && (
          <div className="p-8 text-center text-slate-500">
            Nenhuma compra encontrada
          </div>
        )}
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" onClick={() => setShowCreateModal(false)}>
          <div className="bg-white rounded-lg max-w-md w-full p-8" onClick={e => e.stopPropagation()}>
            <h2 className="text-2xl font-bold mb-6">Nova Compra Direta</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Material *
                </label>
                <input
                  type="text"
                  value={formData.material_name}
                  onChange={(e) => setFormData({ ...formData, material_name: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg"
                  placeholder="Nome do material"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Quantidade *
                  </label>
                  <input
                    type="number"
                    step="0.001"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: parseFloat(e.target.value) })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Unidade
                  </label>
                  <select
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg"
                  >
                    <option value="kg">kg</option>
                    <option value="pcs">pcs</option>
                    <option value="m">m</option>
                    <option value="l">l</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Custo Unitário *
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.unit_cost}
                  onChange={(e) => setFormData({ ...formData, unit_cost: parseFloat(e.target.value) })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Observações
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="p-3 bg-slate-50 rounded-lg">
                <p className="text-sm text-slate-600">
                  Custo Total: <span className="font-semibold">
                    R$ {(formData.quantity * formData.unit_cost).toFixed(2)}
                  </span>
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={createDirectPurchase}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  Criar Solicitação
                </button>
                <button
                  onClick={() => setShowCreateModal(false)}
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

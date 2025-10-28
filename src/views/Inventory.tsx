import { useState, useEffect } from 'react';
import { Plus, AlertTriangle } from 'lucide-react';
import { supabase } from '../lib/supabaseCompat';
import type { Inventory as InventoryType } from '../lib/types';

export default function Inventory() {
  const [inventory, setInventory] = useState<InventoryType[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    material_name: '',
    quantity: 0,
    unit: 'kg',
    unit_cost: 0,
    minimum_stock: 0,
    location: '',
  });

  useEffect(() => {
    loadInventory();
  }, []);

  const loadInventory = async () => {
    const { data } = await supabase
      .from('inventory')
      .select('*')
      .order('material_name');

    if (data) setInventory(data);
  };

  const saveItem = async () => {
    if (!formData.material_name) {
      alert('Nome do material é obrigatório');
      return;
    }

    const { error } = await supabase.from('inventory').insert([{
      ...formData,
      last_updated: new Date().toISOString(),
    }]);

    if (!error) {
      alert('Material adicionado com sucesso!');
      setShowForm(false);
      setFormData({
        material_name: '',
        quantity: 0,
        unit: 'kg',
        unit_cost: 0,
        minimum_stock: 0,
        location: '',
      });
      loadInventory();
    }
  };

  return (
    <div>
      <div className="mb-6 flex justify-between items-center">
        <h2 className="text-xl font-bold">Estoque de Materiais</h2>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus size={20} />
          Adicionar Material
        </button>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Material</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Quantidade</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Unidade</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Custo Unitário</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Estoque Mínimo</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Localização</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Status</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-200">
            {inventory.map((item) => {
              const isLow = item.quantity < item.minimum_stock;
              return (
                <tr key={item.id} className={`hover:bg-slate-50 ${isLow ? 'bg-red-50' : ''}`}>
                  <td className="px-6 py-4 whitespace-nowrap font-medium">{item.material_name}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{item.quantity}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{item.unit}</td>
                  <td className="px-6 py-4 whitespace-nowrap">R$ {item.unit_cost.toFixed(2)}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{item.minimum_stock}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{item.location || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {isLow && (
                      <span className="flex items-center gap-1 text-red-600">
                        <AlertTriangle size={16} />
                        Baixo
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-lg max-w-lg w-full p-8" onClick={e => e.stopPropagation()}>
            <h2 className="text-2xl font-bold mb-6">Adicionar Material</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Nome do Material *</label>
                <input
                  type="text"
                  value={formData.material_name}
                  onChange={(e) => setFormData({ ...formData, material_name: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Quantidade</label>
                  <input
                    type="number"
                    step="0.001"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: parseFloat(e.target.value) })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Unidade</label>
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

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Custo Unitário</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.unit_cost}
                    onChange={(e) => setFormData({ ...formData, unit_cost: parseFloat(e.target.value) })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Estoque Mínimo</label>
                  <input
                    type="number"
                    step="0.001"
                    value={formData.minimum_stock}
                    onChange={(e) => setFormData({ ...formData, minimum_stock: parseFloat(e.target.value) })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Localização</label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={saveItem}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  Salvar
                </button>
                <button
                  onClick={() => setShowForm(false)}
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

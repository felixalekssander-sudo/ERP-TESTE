import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabaseCompat';

export default function InspectionCriteriaManager() {
  const [criteria, setCriteria] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    enabled: true,
    min_quantity: 0,
    min_weight: 0,
    complexity: 'simple' as 'simple' | 'medium' | 'complex',
    specific_customer_id: '',
    specific_machine: '',
  });
  const [customers, setCustomers] = useState<any[]>([]);

  useEffect(() => {
    loadCriteria();
    loadCustomers();
  }, []);

  const loadCriteria = async () => {
    const { data } = await supabase
      .from('inspection_criteria')
      .select('*')
      .order('created_at', { ascending: false });

    if (data) setCriteria(data);
  };

  const loadCustomers = async () => {
    const { data } = await supabase
      .from('customers')
      .select('id, name')
      .order('name');

    if (data) setCustomers(data);
  };

  const openForm = (criterion?: any) => {
    if (criterion) {
      setEditingId(criterion.id);
      setFormData({
        name: criterion.name,
        enabled: criterion.enabled,
        min_quantity: criterion.min_quantity || 0,
        min_weight: criterion.min_weight || 0,
        complexity: criterion.complexity || 'simple',
        specific_customer_id: criterion.specific_customer_id || '',
        specific_machine: criterion.specific_machine || '',
      });
    } else {
      setEditingId(null);
      setFormData({
        name: '',
        enabled: true,
        min_quantity: 0,
        min_weight: 0,
        complexity: 'simple',
        specific_customer_id: '',
        specific_machine: '',
      });
    }
    setShowForm(true);
  };

  const saveCriterion = async () => {
    if (!formData.name) {
      alert('Nome do critério é obrigatório');
      return;
    }

    const dataToSave = {
      ...formData,
      min_quantity: formData.min_quantity || null,
      min_weight: formData.min_weight || null,
      specific_customer_id: formData.specific_customer_id || null,
      specific_machine: formData.specific_machine || null,
    };

    if (editingId) {
      const { error } = await supabase
        .from('inspection_criteria')
        .update(dataToSave)
        .eq('id', editingId);

      if (!error) {
        alert('Critério atualizado com sucesso!');
        setShowForm(false);
        loadCriteria();
      }
    } else {
      const { error } = await supabase
        .from('inspection_criteria')
        .insert([dataToSave]);

      if (!error) {
        alert('Critério cadastrado com sucesso!');
        setShowForm(false);
        loadCriteria();
      }
    }
  };

  const toggleEnabled = async (id: string, currentStatus: boolean) => {
    await supabase
      .from('inspection_criteria')
      .update({ enabled: !currentStatus })
      .eq('id', id);

    loadCriteria();
  };

  const deleteCriterion = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este critério?')) return;

    await supabase
      .from('inspection_criteria')
      .delete()
      .eq('id', id);

    loadCriteria();
  };

  const complexityLabels = {
    simple: 'Simples',
    medium: 'Médio',
    complex: 'Complexo',
  };

  return (
    <div>
      <div className="mb-6 flex justify-between items-center">
        <h2 className="text-xl font-bold">Critérios de Inspeção</h2>
        <button
          onClick={() => openForm()}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus size={20} />
          Novo Critério
        </button>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Nome</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Quantidade Mín.</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Peso Mín.</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Complexidade</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Status</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase">Ações</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-200">
            {criteria.map((criterion) => (
              <tr key={criterion.id} className={`hover:bg-slate-50 ${!criterion.enabled ? 'opacity-50' : ''}`}>
                <td className="px-6 py-4 font-medium">{criterion.name}</td>
                <td className="px-6 py-4">{criterion.min_quantity || '-'}</td>
                <td className="px-6 py-4">{criterion.min_weight ? `${criterion.min_weight} kg` : '-'}</td>
                <td className="px-6 py-4">{criterion.complexity ? complexityLabels[criterion.complexity] : '-'}</td>
                <td className="px-6 py-4">
                  <button
                    onClick={() => toggleEnabled(criterion.id, criterion.enabled)}
                    className={`px-2 py-1 text-xs font-semibold rounded-full ${
                      criterion.enabled
                        ? 'bg-green-100 text-green-700'
                        : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {criterion.enabled ? 'Ativo' : 'Inativo'}
                  </button>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={() => openForm(criterion)}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      <Edit2 size={18} />
                    </button>
                    <button
                      onClick={() => deleteCriterion(criterion.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {criteria.length === 0 && (
          <div className="p-8 text-center text-slate-500">
            Nenhum critério cadastrado
          </div>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-lg max-w-2xl w-full p-8 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h2 className="text-2xl font-bold mb-6">
              {editingId ? 'Editar Critério' : 'Novo Critério'}
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Nome do Critério *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg"
                  placeholder="Ex: Inspeção para peças acima de 100 unidades"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Quantidade Mínima
                  </label>
                  <input
                    type="number"
                    value={formData.min_quantity}
                    onChange={(e) => setFormData({ ...formData, min_quantity: parseInt(e.target.value) || 0 })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg"
                    placeholder="0 = sem limite"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Inspeção obrigatória se quantidade for maior ou igual
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Peso Mínimo (kg)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.min_weight}
                    onChange={(e) => setFormData({ ...formData, min_weight: parseFloat(e.target.value) || 0 })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg"
                    placeholder="0 = sem limite"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Inspeção obrigatória se peso estimado for maior ou igual
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Complexidade do Produto
                </label>
                <select
                  value={formData.complexity}
                  onChange={(e) => setFormData({ ...formData, complexity: e.target.value as any })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg"
                >
                  <option value="">Qualquer</option>
                  <option value="simple">Simples</option>
                  <option value="medium">Médio</option>
                  <option value="complex">Complexo</option>
                </select>
                <p className="text-xs text-slate-500 mt-1">
                  Aplicar apenas para produtos de determinada complexidade
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Cliente Específico
                </label>
                <select
                  value={formData.specific_customer_id}
                  onChange={(e) => setFormData({ ...formData, specific_customer_id: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg"
                >
                  <option value="">Todos os clientes</option>
                  {customers.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-slate-500 mt-1">
                  Aplicar apenas para pedidos de um cliente específico
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Máquina Específica
                </label>
                <input
                  type="text"
                  value={formData.specific_machine}
                  onChange={(e) => setFormData({ ...formData, specific_machine: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg"
                  placeholder="Ex: Torno CNC 01"
                />
                <p className="text-xs text-slate-500 mt-1">
                  Aplicar apenas quando usar uma máquina específica
                </p>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="enabled"
                  checked={formData.enabled}
                  onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
                  className="mr-2"
                />
                <label htmlFor="enabled" className="text-sm font-medium text-slate-700">
                  Critério Ativo
                </label>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={saveCriterion}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  {editingId ? 'Atualizar' : 'Cadastrar'}
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

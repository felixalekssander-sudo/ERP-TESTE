import { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Clock, Settings, TrendingUp } from 'lucide-react';
import { supabase } from '../lib/supabaseCompat';
import type { QualityInspection } from '../lib/types';

interface QualityInspectionsProps {
  onNavigate?: (view: string, data?: any) => void;
}

export default function QualityInspections({ onNavigate }: QualityInspectionsProps) {
  const [inspections, setInspections] = useState<QualityInspection[]>([]);
  const [selectedInspection, setSelectedInspection] = useState<QualityInspection | null>(null);
  const [inspectorName, setInspectorName] = useState('');
  const [notes, setNotes] = useState('');
  const [result, setResult] = useState<'pass' | 'fail' | 'conditional'>('pass');
  const [correctiveActions, setCorrectiveActions] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [showMetrics, setShowMetrics] = useState(false);
  const [metrics, setMetrics] = useState({
    total: 0,
    approved: 0,
    rejected: 0,
    pending: 0,
    approvalRate: 0,
  });

  useEffect(() => {
    loadInspections();
    loadMetrics();
  }, []);

  const loadInspections = async () => {
    const { data } = await supabase
      .from('quality_inspections')
      .select(`
        *,
        production_order:production_orders(
          order_number,
          product:products(name),
          sales_order:sales_orders(customer:customers(name))
        )
      `)
      .order('created_at', { ascending: false });

    if (data) setInspections(data);
  };

  const loadMetrics = async () => {
    const { data } = await supabase
      .from('quality_inspections')
      .select('status, result');

    if (data) {
      const total = data.length;
      const approved = data.filter(i => i.status === 'approved').length;
      const rejected = data.filter(i => i.status === 'rejected').length;
      const pending = data.filter(i => i.status === 'pending').length;
      const approvalRate = total > 0 ? (approved / (approved + rejected)) * 100 : 0;

      setMetrics({ total, approved, rejected, pending, approvalRate });
    }
  };

  const completeInspection = async () => {
    if (!selectedInspection || !inspectorName) {
      alert('Preencha todos os campos obrigatórios');
      return;
    }

    await supabase
      .from('quality_inspections')
      .update({
        status: result === 'pass' ? 'approved' : 'rejected',
        inspector_name: inspectorName,
        inspection_date: new Date().toISOString(),
        result,
        notes,
        corrective_actions: correctiveActions,
      })
      .eq('id', selectedInspection.id);

    await supabase.from('notifications').insert({
      type: 'process_completed',
      title: 'Inspeção Concluída',
      message: `Inspeção ${selectedInspection.inspection_number} - Resultado: ${result === 'pass' ? 'Aprovado' : 'Reprovado'}`,
      reference_type: 'quality_inspection',
      reference_id: selectedInspection.id,
    });

    alert('Inspeção concluída com sucesso!');
    setSelectedInspection(null);
    loadInspections();
    loadMetrics();
  };

  const filteredInspections = inspections.filter(inspection =>
    filterStatus === 'all' || inspection.status === filterStatus
  );

  const statusColors = {
    pending: 'bg-yellow-100 text-yellow-700',
    in_progress: 'bg-blue-100 text-blue-700',
    approved: 'bg-green-100 text-green-700',
    rejected: 'bg-red-100 text-red-700',
  };

  const statusLabels = {
    pending: 'Pendente',
    in_progress: 'Em Andamento',
    approved: 'Aprovada',
    rejected: 'Reprovada',
  };

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
            <option value="pending">Pendente</option>
            <option value="in_progress">Em Andamento</option>
            <option value="approved">Aprovada</option>
            <option value="rejected">Reprovada</option>
          </select>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setShowMetrics(!showMetrics)}
            className="flex items-center gap-2 px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700"
          >
            <TrendingUp size={20} />
            Métricas
          </button>
          {onNavigate && (
            <button
              onClick={() => onNavigate('inspection-criteria')}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Settings size={20} />
              Critérios
            </button>
          )}
        </div>
      </div>

      {showMetrics && (
        <div className="mb-6 grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-slate-600 mb-1">Total</p>
            <p className="text-2xl font-bold">{metrics.total}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-slate-600 mb-1">Pendentes</p>
            <p className="text-2xl font-bold text-yellow-600">{metrics.pending}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-slate-600 mb-1">Aprovadas</p>
            <p className="text-2xl font-bold text-green-600">{metrics.approved}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-slate-600 mb-1">Reprovadas</p>
            <p className="text-2xl font-bold text-red-600">{metrics.rejected}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-slate-600 mb-1">Taxa de Aprovação</p>
            <p className="text-2xl font-bold text-blue-600">{metrics.approvalRate.toFixed(1)}%</p>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Número</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Ordem de Produção</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Produto</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Inspetor</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase">Ações</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-200">
            {filteredInspections.map((inspection) => (
              <tr key={inspection.id} className="hover:bg-slate-50">
                <td className="px-6 py-4 whitespace-nowrap font-medium">{inspection.inspection_number}</td>
                <td className="px-6 py-4 whitespace-nowrap">{inspection.production_order?.order_number}</td>
                <td className="px-6 py-4 whitespace-nowrap">{inspection.production_order?.product?.name}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${statusColors[inspection.status]}`}>
                    {statusLabels[inspection.status]}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">{inspection.inspector_name || '-'}</td>
                <td className="px-6 py-4 whitespace-nowrap text-right">
                  {inspection.status === 'pending' && (
                    <button
                      onClick={() => {
                        setSelectedInspection(inspection);
                        setInspectorName('');
                        setNotes('');
                        setResult('pass');
                        setCorrectiveActions('');
                      }}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      <Clock size={18} />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredInspections.length === 0 && (
          <div className="p-8 text-center text-slate-500">
            Nenhuma inspeção encontrada
          </div>
        )}
      </div>

      {selectedInspection && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" onClick={() => setSelectedInspection(null)}>
          <div className="bg-white rounded-lg max-w-2xl w-full p-8 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h2 className="text-2xl font-bold mb-6">Realizar Inspeção</h2>

            <div className="mb-4">
              <p className="text-sm text-slate-600">Número: {selectedInspection.inspection_number}</p>
              <p className="text-sm text-slate-600">Ordem: {selectedInspection.production_order?.order_number}</p>
              <p className="text-sm text-slate-600">Produto: {selectedInspection.production_order?.product?.name}</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Inspetor *</label>
                <input
                  type="text"
                  value={inspectorName}
                  onChange={(e) => setInspectorName(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Resultado *</label>
                <select
                  value={result}
                  onChange={(e) => setResult(e.target.value as any)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg"
                >
                  <option value="pass">Aprovado</option>
                  <option value="conditional">Condicional</option>
                  <option value="fail">Reprovado</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Observações</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              {result !== 'pass' && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Ações Corretivas</label>
                  <textarea
                    value={correctiveActions}
                    onChange={(e) => setCorrectiveActions(e.target.value)}
                    rows={3}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={completeInspection}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  Concluir Inspeção
                </button>
                <button
                  onClick={() => setSelectedInspection(null)}
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

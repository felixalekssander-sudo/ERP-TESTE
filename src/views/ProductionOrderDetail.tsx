import { useState, useEffect } from 'react';
import { ArrowLeft, Play, Pause, CheckCircle, Clock, AlertCircle, Package } from 'lucide-react';
import { supabase } from '../lib/supabaseCompat';
import type { ProductionOrder, ProductionProcess } from '../lib/types';

interface ProductionOrderDetailProps {
  orderId: string;
  onNavigate: (view: string, data?: any) => void;
}

export default function ProductionOrderDetail({ orderId, onNavigate }: ProductionOrderDetailProps) {
  const [order, setOrder] = useState<ProductionOrder | null>(null);
  const [processes, setProcesses] = useState<ProductionProcess[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);
  const [activeProcess, setActiveProcess] = useState<ProductionProcess | null>(null);
  const [operatorName, setOperatorName] = useState('');
  const [machineUsed, setMachineUsed] = useState('');
  const [processNotes, setProcessNotes] = useState('');
  const [showMaterialModal, setShowMaterialModal] = useState(false);
  const [materialForm, setMaterialForm] = useState({
    material_name: '',
    quantity: 0,
    unit: 'kg',
    unit_cost: 0,
  });

  useEffect(() => {
    loadOrderDetails();
  }, [orderId]);

  const loadOrderDetails = async () => {
    const { data: orderData } = await supabase
      .from('production_orders')
      .select(`
        *,
        product:products(*),
        sales_order:sales_orders(
          order_number,
          customer:customers(*)
        )
      `)
      .eq('id', orderId)
      .maybeSingle();

    if (orderData) setOrder(orderData);

    const { data: processesData } = await supabase
      .from('production_processes')
      .select('*')
      .eq('production_order_id', orderId)
      .order('sequence_order');

    if (processesData) setProcesses(processesData);

    const { data: materialsData } = await supabase
      .from('purchases')
      .select('*')
      .eq('production_order_id', orderId)
      .order('requested_at', { ascending: false });

    if (materialsData) setMaterials(materialsData);
  };

  const startProcess = async (process: ProductionProcess) => {
    setActiveProcess(process);
    setOperatorName('');
    setMachineUsed('');
    setProcessNotes('');
  };

  const confirmStartProcess = async () => {
    if (!activeProcess || !operatorName) {
      alert('Operador é obrigatório');
      return;
    }

    await supabase
      .from('production_processes')
      .update({
        status: 'in_progress',
        started_at: new Date().toISOString(),
        operator_name: operatorName,
        machine_used: machineUsed || null,
      })
      .eq('id', activeProcess.id);

    if (order && order.status === 'pending') {
      await supabase
        .from('production_orders')
        .update({
          status: 'in_progress',
          actual_start: new Date().toISOString(),
          current_process: activeProcess.process_type,
        })
        .eq('id', orderId);
    } else if (order) {
      await supabase
        .from('production_orders')
        .update({ current_process: activeProcess.process_type })
        .eq('id', orderId);
    }

    setActiveProcess(null);
    loadOrderDetails();
  };

  const completeProcess = async (processId: string) => {
    const process = processes.find(p => p.id === processId);
    if (!process || !process.started_at) return;

    const startTime = new Date(process.started_at);
    const endTime = new Date();
    const actualMinutes = Math.round((endTime.getTime() - startTime.getTime()) / 60000);

    await supabase
      .from('production_processes')
      .update({
        status: 'completed',
        completed_at: endTime.toISOString(),
        actual_minutes: actualMinutes,
      })
      .eq('id', processId);

    const allCompleted = processes.every(p =>
      p.id === processId || p.status === 'completed' || p.status === 'skipped'
    );

    if (allCompleted) {
      await supabase
        .from('production_orders')
        .update({
          status: 'completed',
          actual_end: endTime.toISOString(),
          current_process: null,
        })
        .eq('id', orderId);

      await supabase.from('notifications').insert({
        type: 'process_completed',
        title: 'Ordem de Produção Concluída',
        message: `Ordem ${order?.order_number} foi concluída com sucesso`,
        reference_type: 'production_order',
        reference_id: orderId,
      });
    } else {
      const nextProcess = processes.find(p =>
        p.sequence_order > (process.sequence_order || 0) &&
        p.status === 'pending'
      );

      if (nextProcess) {
        await supabase
          .from('production_orders')
          .update({ current_process: nextProcess.process_type })
          .eq('id', orderId);
      }
    }

    loadOrderDetails();
  };

  const pauseProcess = async (processId: string) => {
    await supabase
      .from('production_processes')
      .update({ status: 'pending' })
      .eq('id', processId);

    await supabase
      .from('production_orders')
      .update({ status: 'on_hold' })
      .eq('id', orderId);

    loadOrderDetails();
  };

  const addMaterial = async () => {
    if (!materialForm.material_name) {
      alert('Nome do material é obrigatório');
      return;
    }

    const totalCost = materialForm.quantity * materialForm.unit_cost;

    const { error } = await supabase.from('purchases').insert({
      production_order_id: orderId,
      material_name: materialForm.material_name,
      quantity: materialForm.quantity,
      unit: materialForm.unit,
      unit_cost: materialForm.unit_cost,
      total_cost: totalCost,
      status: 'requested',
    });

    if (!error) {
      setShowMaterialModal(false);
      setMaterialForm({
        material_name: '',
        quantity: 0,
        unit: 'kg',
        unit_cost: 0,
      });
      loadOrderDetails();

      await supabase.from('notifications').insert({
        type: 'order_created',
        title: 'Material Solicitado',
        message: `Material ${materialForm.material_name} solicitado para ordem ${order?.order_number}`,
        reference_type: 'production_order',
        reference_id: orderId,
      });
    }
  };

  if (!order) {
    return <div>Carregando...</div>;
  }

  const processColors = {
    pending: 'bg-slate-100 text-slate-700 border-slate-300',
    in_progress: 'bg-yellow-50 text-yellow-700 border-yellow-400',
    completed: 'bg-green-50 text-green-700 border-green-400',
    skipped: 'bg-slate-100 text-slate-500 border-slate-300',
  };

  const processLabels = {
    turning: 'Torneamento',
    milling: 'Fresamento',
    drilling: 'Furação',
    grinding: 'Retificação',
  };

  const statusLabels = {
    pending: 'Pendente',
    in_progress: 'Em Andamento',
    completed: 'Concluída',
    on_hold: 'Pausada',
  };

  const progress = processes.length > 0
    ? (processes.filter(p => p.status === 'completed').length / processes.length) * 100
    : 0;

  return (
    <div>
      <button
        onClick={() => onNavigate('production')}
        className="flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-6"
      >
        <ArrowLeft size={20} />
        Voltar para Ordens de Produção
      </button>

      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-3xl font-bold mb-2">{order.order_number}</h1>
            <p className="text-lg text-slate-600">
              Produto: <span className="font-medium">{order.product?.name}</span>
            </p>
            <p className="text-slate-600">
              Cliente: <span className="font-medium">{order.sales_order?.customer?.name}</span>
            </p>
            <p className="text-slate-600">
              Quantidade: <span className="font-medium">{order.quantity} peças</span>
            </p>
          </div>
          <div className="text-right">
            <span className="inline-block px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-semibold mb-2">
              {statusLabels[order.status]}
            </span>
            {order.planned_end && (
              <p className="text-sm text-slate-600">
                Prazo: {new Date(order.planned_end).toLocaleDateString('pt-BR')}
              </p>
            )}
          </div>
        </div>

        <div className="mb-4">
          <div className="flex justify-between text-sm text-slate-600 mb-1">
            <span>Progresso</span>
            <span>{progress.toFixed(0)}%</span>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-3">
            <div
              className="bg-green-500 h-3 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">Processos de Produção</h2>
          </div>

          <div className="space-y-3">
            {processes.map((process) => (
              <div
                key={process.id}
                className={`border-2 rounded-lg p-4 ${processColors[process.status]}`}
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="font-semibold">{processLabels[process.process_type]}</h3>
                    <p className="text-sm">Sequência: {process.sequence_order}</p>
                    {process.operator_name && (
                      <p className="text-sm">Operador: {process.operator_name}</p>
                    )}
                    {process.machine_used && (
                      <p className="text-sm">Máquina: {process.machine_used}</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {process.status === 'pending' && (
                      <button
                        onClick={() => startProcess(process)}
                        className="p-2 bg-green-600 text-white rounded hover:bg-green-700"
                        title="Iniciar"
                      >
                        <Play size={16} />
                      </button>
                    )}
                    {process.status === 'in_progress' && (
                      <>
                        <button
                          onClick={() => pauseProcess(process.id)}
                          className="p-2 bg-yellow-600 text-white rounded hover:bg-yellow-700"
                          title="Pausar"
                        >
                          <Pause size={16} />
                        </button>
                        <button
                          onClick={() => completeProcess(process.id)}
                          className="p-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                          title="Concluir"
                        >
                          <CheckCircle size={16} />
                        </button>
                      </>
                    )}
                    {process.status === 'completed' && (
                      <CheckCircle className="text-green-600" size={20} />
                    )}
                  </div>
                </div>

                {process.started_at && (
                  <div className="text-xs mt-2">
                    <p>Início: {new Date(process.started_at).toLocaleString('pt-BR')}</p>
                    {process.completed_at && (
                      <>
                        <p>Fim: {new Date(process.completed_at).toLocaleString('pt-BR')}</p>
                        <p>Tempo: {process.actual_minutes} minutos</p>
                      </>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">Materiais</h2>
            <button
              onClick={() => setShowMaterialModal(true)}
              className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
            >
              <Package size={16} />
              Adicionar Material
            </button>
          </div>

          <div className="space-y-3">
            {materials.length === 0 ? (
              <p className="text-slate-500 text-center py-4">Nenhum material solicitado</p>
            ) : (
              materials.map((material) => (
                <div key={material.id} className="border rounded-lg p-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium">{material.material_name}</p>
                      <p className="text-sm text-slate-600">
                        {material.quantity} {material.unit}
                      </p>
                      {material.supplier && (
                        <p className="text-sm text-slate-600">
                          Fornecedor: {material.supplier}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">R$ {material.total_cost.toFixed(2)}</p>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        material.status === 'received'
                          ? 'bg-green-100 text-green-700'
                          : material.status === 'ordered'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {material.status === 'received' ? 'Recebido' :
                         material.status === 'ordered' ? 'Pedido' : 'Solicitado'}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {activeProcess && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" onClick={() => setActiveProcess(null)}>
          <div className="bg-white rounded-lg max-w-md w-full p-8" onClick={e => e.stopPropagation()}>
            <h2 className="text-2xl font-bold mb-6">
              Iniciar {processLabels[activeProcess.process_type]}
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Operador *
                </label>
                <input
                  type="text"
                  value={operatorName}
                  onChange={(e) => setOperatorName(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg"
                  placeholder="Nome do operador"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Máquina
                </label>
                <input
                  type="text"
                  value={machineUsed}
                  onChange={(e) => setMachineUsed(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg"
                  placeholder="Identificação da máquina"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Observações
                </label>
                <textarea
                  value={processNotes}
                  onChange={(e) => setProcessNotes(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg"
                  placeholder="Observações sobre o processo"
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={confirmStartProcess}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  Iniciar Processo
                </button>
                <button
                  onClick={() => setActiveProcess(null)}
                  className="px-4 py-2 bg-slate-300 text-slate-700 rounded-lg hover:bg-slate-400"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showMaterialModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" onClick={() => setShowMaterialModal(false)}>
          <div className="bg-white rounded-lg max-w-md w-full p-8" onClick={e => e.stopPropagation()}>
            <h2 className="text-2xl font-bold mb-6">Solicitar Material</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Material *
                </label>
                <input
                  type="text"
                  value={materialForm.material_name}
                  onChange={(e) => setMaterialForm({ ...materialForm, material_name: e.target.value })}
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
                    value={materialForm.quantity}
                    onChange={(e) => setMaterialForm({ ...materialForm, quantity: parseFloat(e.target.value) })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Unidade
                  </label>
                  <select
                    value={materialForm.unit}
                    onChange={(e) => setMaterialForm({ ...materialForm, unit: e.target.value })}
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
                  value={materialForm.unit_cost}
                  onChange={(e) => setMaterialForm({ ...materialForm, unit_cost: parseFloat(e.target.value) })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg"
                  required
                />
              </div>

              <div className="p-3 bg-slate-50 rounded-lg">
                <p className="text-sm text-slate-600">
                  Custo Total: <span className="font-semibold">
                    R$ {(materialForm.quantity * materialForm.unit_cost).toFixed(2)}
                  </span>
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={addMaterial}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  Solicitar
                </button>
                <button
                  onClick={() => setShowMaterialModal(false)}
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

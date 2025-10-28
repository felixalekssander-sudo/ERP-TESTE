import { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Eye, FileDown } from 'lucide-react';
import { googleSheets } from '../lib/googleSheets';
import type { Proposal, SalesOrder } from '../lib/types';
import ProposalPDF from '../components/ProposalPDF';

export default function Proposals() {
  const [proposals, setProposals] = useState<(Proposal & { sales_order?: SalesOrder })[]>([]);
  const [selectedProposal, setSelectedProposal] = useState<any>(null);
  const [pdfProposal, setPdfProposal] = useState<any>(null);

  useEffect(() => {
    loadProposals();
  }, []);

  const loadProposals = async () => {
    const proposalsData = await googleSheets.fetchFromSheet(googleSheets.SHEET_NAMES.proposals);
    const salesOrdersData = await googleSheets.fetchFromSheet(googleSheets.SHEET_NAMES.sales_orders);
    const customersData = await googleSheets.fetchFromSheet(googleSheets.SHEET_NAMES.customers);
    const itemsData = await googleSheets.fetchFromSheet(googleSheets.SHEET_NAMES.sales_order_items);
    const productsData = await googleSheets.fetchFromSheet(googleSheets.SHEET_NAMES.products);

    const enriched = proposalsData.map(proposal => {
      const salesOrder = salesOrdersData.find(so => so.id === proposal.sales_order_id);
      const customer = customersData.find(c => c.id === salesOrder?.customer_id);
      const items = itemsData
        .filter(item => item.sales_order_id === salesOrder?.id)
        .map(item => ({
          ...item,
          product: productsData.find(p => p.id === item.product_id)
        }));
      return {
        ...proposal,
        sales_order: { ...salesOrder, customer, items }
      };
    });

    const sorted = enriched.sort((a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    setProposals(sorted);
  };

  const loadProposalForPDF = async (proposalId: string) => {
    const proposalsData = await googleSheets.fetchFromSheet(googleSheets.SHEET_NAMES.proposals);
    const salesOrdersData = await googleSheets.fetchFromSheet(googleSheets.SHEET_NAMES.sales_orders);
    const customersData = await googleSheets.fetchFromSheet(googleSheets.SHEET_NAMES.customers);
    const itemsData = await googleSheets.fetchFromSheet(googleSheets.SHEET_NAMES.sales_order_items);
    const productsData = await googleSheets.fetchFromSheet(googleSheets.SHEET_NAMES.products);

    const proposal = proposalsData.find(p => p.id === proposalId);
    if (!proposal) return;

    const salesOrder = salesOrdersData.find(so => so.id === proposal.sales_order_id);
    const customer = customersData.find(c => c.id === salesOrder?.customer_id);
    const items = itemsData
      .filter(item => item.sales_order_id === salesOrder?.id)
      .map(item => ({
        ...item,
        product: productsData.find(p => p.id === item.product_id)
      }));

    setPdfProposal({
      ...proposal,
      sales_order: { ...salesOrder, customer, items }
    });
  };

  const approveProposal = async (proposalId: string, salesOrderId: string) => {
    await googleSheets.updateInSheet(googleSheets.SHEET_NAMES.proposals, proposalId, {
      status: 'approved',
      approved_at: new Date().toISOString()
    });

    await googleSheets.updateInSheet(googleSheets.SHEET_NAMES.sales_orders, salesOrderId, {
      status: 'approved'
    });

    const itemsData = await googleSheets.fetchFromSheet(googleSheets.SHEET_NAMES.sales_order_items);
    const productsData = await googleSheets.fetchFromSheet(googleSheets.SHEET_NAMES.products);
    const orderItems = itemsData
      .filter(item => item.sales_order_id === salesOrderId)
      .map(item => ({
        ...item,
        product: productsData.find(p => p.id === item.product_id)
      }));

    for (const item of orderItems) {
      const orderNumber = `OP-${Date.now().toString().slice(-8)}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;

      const plannedStart = new Date();
      const plannedEnd = new Date();
      plannedEnd.setDate(plannedEnd.getDate() + 14);

      const prodOrder = await googleSheets.appendToSheet(googleSheets.SHEET_NAMES.production_orders, {
        order_number: orderNumber,
        sales_order_id: salesOrderId,
        sales_order_item_id: item.id,
        product_id: item.product_id,
        quantity: item.quantity,
        priority: 'medium',
        status: 'pending',
        planned_start: plannedStart.toISOString(),
        planned_end: plannedEnd.toISOString(),
        updated_at: new Date().toISOString(),
      });

      const processes = ['turning', 'milling', 'drilling', 'grinding'];
      for (let i = 0; i < processes.length; i++) {
        await googleSheets.appendToSheet(googleSheets.SHEET_NAMES.production_processes, {
          production_order_id: prodOrder.id,
          process_type: processes[i],
          sequence_order: i + 1,
          status: 'pending',
          estimated_minutes: 60,
        });
      }

      const criteriaData = await googleSheets.fetchFromSheet(googleSheets.SHEET_NAMES.inspection_criteria);
      const activeCriteria = criteriaData.filter(c => c.enabled === 'true' || c.enabled === true);

      const shouldInspect = activeCriteria.some(c => {
        if (c.min_quantity && parseFloat(item.quantity) >= parseFloat(c.min_quantity)) return true;
        if (c.min_weight && item.product?.estimated_weight && parseFloat(item.product.estimated_weight) >= parseFloat(c.min_weight)) return true;
        if (c.complexity && item.product?.complexity === c.complexity) return true;
        return false;
      });

      if (shouldInspect) {
        const inspNumber = `INSP-${Date.now().toString().slice(-8)}`;
        await googleSheets.appendToSheet(googleSheets.SHEET_NAMES.quality_inspections, {
          production_order_id: prodOrder.id,
          inspection_number: inspNumber,
          trigger_reason: 'Critérios automáticos atendidos',
          status: 'pending',
        });

        await googleSheets.appendToSheet(googleSheets.SHEET_NAMES.notifications, {
          type: 'inspection_required',
          title: 'Inspeção Necessária',
          message: `Inspeção ${inspNumber} criada para ordem ${orderNumber}`,
          reference_type: 'quality_inspection',
          reference_id: prodOrder.id,
          is_read: false,
        });
      }
    }

    await googleSheets.updateInSheet(googleSheets.SHEET_NAMES.sales_orders, salesOrderId, {
      status: 'in_production'
    });

    await googleSheets.appendToSheet(googleSheets.SHEET_NAMES.notifications, {
      type: 'order_approved',
      title: 'Proposta Aprovada',
      message: `Proposta aprovada e ordens de produção criadas`,
      reference_type: 'proposal',
      reference_id: proposalId,
      is_read: false,
    });

    alert('Proposta aprovada e ordens de produção criadas!');
    loadProposals();
  };

  const rejectProposal = async (proposalId: string, salesOrderId: string) => {
    await googleSheets.updateInSheet(googleSheets.SHEET_NAMES.proposals, proposalId, {
      status: 'rejected'
    });

    await googleSheets.updateInSheet(googleSheets.SHEET_NAMES.sales_orders, salesOrderId, {
      status: 'cancelled'
    });

    alert('Proposta rejeitada');
    loadProposals();
  };

  const statusColors = {
    pending: 'bg-yellow-100 text-yellow-700',
    approved: 'bg-green-100 text-green-700',
    rejected: 'bg-red-100 text-red-700',
  };

  const statusLabels = {
    pending: 'Pendente',
    approved: 'Aprovada',
    rejected: 'Rejeitada',
  };

  return (
    <div>
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Número</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Cliente</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Total</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Data</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase">Ações</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-200">
            {proposals.map((proposal) => (
              <tr key={proposal.id} className="hover:bg-slate-50">
                <td className="px-6 py-4 whitespace-nowrap font-medium">{proposal.proposal_number}</td>
                <td className="px-6 py-4 whitespace-nowrap">{proposal.sales_order?.customer?.name}</td>
                <td className="px-6 py-4 whitespace-nowrap font-semibold">R$ {proposal.total.toFixed(2)}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${statusColors[proposal.status]}`}>
                    {statusLabels[proposal.status]}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">{new Date(proposal.created_at).toLocaleDateString('pt-BR')}</td>
                <td className="px-6 py-4 whitespace-nowrap text-right">
                  <button
                    onClick={() => setSelectedProposal(proposal)}
                    className="text-blue-600 hover:text-blue-900 mr-3"
                    title="Visualizar"
                  >
                    <Eye size={18} />
                  </button>
                  <button
                    onClick={() => loadProposalForPDF(proposal.id)}
                    className="text-slate-600 hover:text-slate-900 mr-3"
                    title="Imprimir/Exportar PDF"
                  >
                    <FileDown size={18} />
                  </button>
                  {proposal.status === 'pending' && (
                    <>
                      <button
                        onClick={() => approveProposal(proposal.id, proposal.sales_order_id)}
                        className="text-green-600 hover:text-green-900 mr-3"
                        title="Aprovar"
                      >
                        <CheckCircle size={18} />
                      </button>
                      <button
                        onClick={() => rejectProposal(proposal.id, proposal.sales_order_id)}
                        className="text-red-600 hover:text-red-900"
                        title="Rejeitar"
                      >
                        <XCircle size={18} />
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedProposal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" onClick={() => setSelectedProposal(null)}>
          <div className="bg-white rounded-lg max-w-2xl w-full p-8 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h2 className="text-2xl font-bold mb-6">Proposta {selectedProposal.proposal_number}</h2>

            <div className="mb-6">
              <h3 className="font-semibold mb-2">Cliente</h3>
              <p>{selectedProposal.sales_order?.customer?.name}</p>
              <p className="text-sm text-slate-600">{selectedProposal.sales_order?.customer?.company}</p>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <h3 className="font-semibold mb-2">Subtotal</h3>
                <p className="text-lg">R$ {selectedProposal.subtotal.toFixed(2)}</p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Desconto</h3>
                <p className="text-lg">{selectedProposal.discount}%</p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Total</h3>
                <p className="text-2xl font-bold text-green-600">R$ {selectedProposal.total.toFixed(2)}</p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Prazo de Entrega</h3>
                <p className="text-lg">{selectedProposal.delivery_days} dias</p>
              </div>
            </div>

            <div className="mb-6">
              <h3 className="font-semibold mb-2">Condições de Pagamento</h3>
              <p>{selectedProposal.payment_terms}</p>
            </div>

            <div className="mb-6">
              <h3 className="font-semibold mb-2">Validade</h3>
              <p>{selectedProposal.validity_days} dias</p>
            </div>

            <button
              onClick={() => setSelectedProposal(null)}
              className="w-full px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700"
            >
              Fechar
            </button>
          </div>
        </div>
      )}

      {pdfProposal && (
        <ProposalPDF proposal={pdfProposal} onClose={() => setPdfProposal(null)} />
      )}
    </div>
  );
}

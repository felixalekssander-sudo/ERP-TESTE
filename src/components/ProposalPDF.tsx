import { FileDown, Printer } from 'lucide-react';
import html2pdf from 'html2pdf.js';

interface ProposalPDFProps {
  proposal: any;
  onClose?: () => void;
}

export default function ProposalPDF({ proposal, onClose }: ProposalPDFProps) {
  const handlePrint = () => {
    window.print();
  };

  const handleExportPDF = () => {
    const element = document.getElementById('proposal-pdf-content');
    const opt = {
      margin: 10,
      filename: `${proposal.proposal_number}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    html2pdf().set(opt).from(element).save();
  };

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', { minimumFractionDigits: 4, maximumFractionDigits: 4 });
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('pt-BR');
  };

  const companyInfo = {
    name: 'MDA Service Ltda',
    address: 'Rua Miguel Montoro Lozano, 16 - 18085-761 - Jardim Dois Corações - Sorocaba - São Paulo/SP',
    cnpj: '43.258.824/0001-79',
    phone: '(15) 99136-5445',
    website: 'www.mdaservice.com.br'
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-lg w-full max-w-4xl my-8">
        <div className="p-6 border-b border-slate-200 flex justify-between items-center print:hidden">
          <h2 className="text-xl font-bold">Proposta {proposal.proposal_number}</h2>
          <div className="flex gap-3">
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700"
            >
              <Printer size={18} />
              Imprimir
            </button>
            <button
              onClick={handleExportPDF}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <FileDown size={18} />
              Exportar PDF
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300"
            >
              Fechar
            </button>
          </div>
        </div>

        <div id="proposal-pdf-content" className="p-12 bg-white">
          <div className="mb-8">
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-xl">
                  M
                </div>
                <div>
                  <h1 className="text-xl font-bold text-slate-900">{companyInfo.name}</h1>
                </div>
              </div>
            </div>

            <div className="text-xs text-slate-600 mb-6 leading-relaxed">
              {companyInfo.address}<br />
              CNPJ: {companyInfo.cnpj} - {companyInfo.phone} - {companyInfo.website}
            </div>

            <div className="text-lg font-bold mb-6">
              {proposal.proposal_number}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-6 mb-6 pb-6 border-b border-slate-200">
            <div>
              <div className="text-xs font-semibold text-slate-600 mb-1">Cliente</div>
              <div className="font-medium">{proposal.sales_order?.customer?.name}</div>
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-600 mb-1">Validade</div>
              <div className="font-medium">{proposal.validity_days} dias</div>
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-600 mb-1">Data de Emissão</div>
              <div className="font-medium">{formatDate(proposal.created_at)}</div>
            </div>
          </div>

          <div className="mb-6 pb-6 border-b border-slate-200">
            <div className="text-xs font-semibold text-slate-600 mb-1">Endereço</div>
            <div className="text-sm mb-3">{proposal.sales_order?.customer?.address || 'Não informado'}</div>
            <div className="text-xs font-semibold text-slate-600 mb-1">CPF/CNPJ</div>
            <div className="text-sm mb-3">{proposal.sales_order?.customer?.company || 'Não informado'}</div>
            <div className="text-xs font-semibold text-slate-600 mb-1">Aos cuidados de:</div>
            <div className="text-sm">{proposal.sales_order?.customer?.name}</div>
          </div>

          <table className="w-full mb-6 text-sm">
            <thead>
              <tr className="bg-slate-100 border-y border-slate-300">
                <th className="px-3 py-2 text-left text-xs font-semibold">#</th>
                <th className="px-3 py-2 text-left text-xs font-semibold">Descrição</th>
                <th className="px-3 py-2 text-center text-xs font-semibold">Prazo</th>
                <th className="px-3 py-2 text-center text-xs font-semibold">NCM</th>
                <th className="px-3 py-2 text-center text-xs font-semibold">Quant.</th>
                <th className="px-3 py-2 text-right text-xs font-semibold">Valor unit.<br />(R$)</th>
                <th className="px-3 py-2 text-right text-xs font-semibold">Valor total<br />(R$)</th>
                <th className="px-3 py-2 text-right text-xs font-semibold">Valor final<br />(R$)</th>
              </tr>
            </thead>
            <tbody>
              {proposal.sales_order?.items?.map((item: any, index: number) => (
                <tr key={item.id} className="border-b border-slate-200">
                  <td className="px-3 py-3 text-xs">{index + 1}</td>
                  <td className="px-3 py-3 text-xs">{item.product?.name}</td>
                  <td className="px-3 py-3 text-center text-xs">{proposal.delivery_days}d</td>
                  <td className="px-3 py-3 text-center text-xs">{item.product?.ncm || '84879000'}</td>
                  <td className="px-3 py-3 text-center text-xs">{item.quantity.toFixed(4)}<br />(PC)</td>
                  <td className="px-3 py-3 text-right text-xs">{formatCurrency(item.unit_price)}</td>
                  <td className="px-3 py-3 text-right text-xs">{formatCurrency(item.total_price)}</td>
                  <td className="px-3 py-3 text-right text-xs font-semibold">{formatCurrency(item.total_price)}</td>
                </tr>
              ))}
              <tr className="border-y-2 border-slate-300 bg-slate-50">
                <td colSpan={6} className="px-3 py-3 text-right text-xs font-bold">Valor total:</td>
                <td className="px-3 py-3 text-right text-xs font-bold">{formatCurrency(proposal.subtotal)}</td>
                <td className="px-3 py-3 text-right text-xs font-bold">{formatCurrency(proposal.total)}</td>
              </tr>
            </tbody>
          </table>

          <div className="mb-8">
            <div className="text-right text-base font-bold mb-6">
              Valor total da proposta: R$ {formatCurrency(proposal.total)}
            </div>
            <div className="text-xs font-semibold mb-2">Notas importantes:</div>
          </div>

          <div className="space-y-3 text-sm mb-8 pb-8 border-b border-slate-200">
            <div>
              <span className="font-semibold">Frete:</span> FOB - Frete não incluso
            </div>
            <div>
              <span className="font-semibold">Forma de pagamento:</span> {proposal.payment_terms}
            </div>
            <div>
              <span className="font-semibold">Informações complementares:</span>
              <div className="mt-1">Empresa optante pelo Simples Nacional.</div>
            </div>
          </div>

          <div className="text-sm">
            <div className="mb-2">Atenciosamente,</div>
            <div className="font-semibold">Guilherme Delariva</div>
          </div>

          <div className="mt-12 text-right text-xs text-slate-500">
            Torne sua vida mais fácil, use Eto erp - www.etoerp.com.br
          </div>
        </div>
      </div>
    </div>
  );
}

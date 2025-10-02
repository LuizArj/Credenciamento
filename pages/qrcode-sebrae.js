import { useState, useEffect } from 'react';
import QRCode from 'qrcode.react';
import { validateCPF, formatCPF, formatCNPJ, formatPhone, unformatPhone } from '../utils/validators';

// --- LISTA DE OPÇÕES (EDITÁVEL) ---
const VINCULO_OPTIONS = [
    "PROPRIETÁRIO OU SÓCIO", "CONTADOR", "REPRESENTANTE", 
    "FUNCIONÁRIO", "RESPONSÁVEL",
];

// --- COMPONENTES DA UI ---

const InitialScreen = ({ onSearch, cpf, setCpf, loading, error }) => {
    const handleCpfChange = (e) => { setCpf(formatCPF(e.target.value)); };
    return (
        <div className="space-y-6">
            <div>
                <label htmlFor="cpf" className="block text-white font-medium mb-2">
                    CPF do Participante
                </label>
                <input
                    id="cpf"
                    type="text"
                    value={cpf}
                    onChange={handleCpfChange}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-transparent transition-all"
                    placeholder="000.000.000-00"
                    maxLength={14}
                    disabled={loading}
                />
            </div>
            
            {error && (
                <div className="bg-red-500/20 backdrop-blur-sm border border-red-400/30 rounded-xl p-4">
                    <p className="text-red-200 text-sm">{error}</p>
                </div>
            )}
            
            <button 
                onClick={onSearch}
                disabled={loading || !cpf}
                className={`w-full py-3 px-6 rounded-xl font-semibold transition-all duration-200 ${
                    loading || !cpf
                        ? 'bg-white/5 text-white/40 cursor-not-allowed border border-white/10'
                        : 'bg-white/20 hover:bg-white/30 text-white border border-white/30'
                } backdrop-blur-sm`}
            >
                {loading ? 'Buscando...' : 'Buscar Participante'}
            </button>
        </div>
    );
};

const ConfirmationScreen = ({ participant, onConfirm, onCancel }) => {
    const [formData, setFormData] = useState({
        name: participant.name || '',
        email: participant.email || '',
        phone: participant.phone || '',
        cpf: participant.cpf || '',
        company: participant.company || null
    });
    
    const [showCompanySelect, setShowCompanySelect] = useState(false);
    const [cnpj, setCnpj] = useState('');
    const [companyLoading, setCompanyLoading] = useState(false);
    const [companyError, setCompanyError] = useState('');
    const [newCompany, setNewCompany] = useState(null);
    
    // Lista de vínculos disponíveis
    const availableCompanies = participant.ListaVinculo?.filter(v => v.Situacao === 1) || [];

    const handleChange = (e) => {
        const { name, value } = e.target;
        let newValue = value;
        if (name === 'phone') newValue = formatPhone(value);
        if (name === 'name' && newValue.length > 100) newValue = newValue.slice(0, 100);
        if (name === 'email' && newValue.length > 254) newValue = newValue.slice(0, 254);
        setFormData(prev => ({
            ...prev,
            [name]: newValue
        }));
    };

    const handleCompanySelect = (vinculo) => {
        setFormData(prev => ({
            ...prev,
            company: vinculo ? {
                cnpj: vinculo.CgcCpf?.toString() || '',
                razaoSocial: vinculo.NomeRazaoSocialPJ || '',
                cargo: vinculo.DescCargCli || ''
            } : null
        }));
        setShowCompanySelect(false);
    };

    const handleSearchCompany = async (cnpjToSearch) => {
        setCompanyLoading(true);
        setCompanyError('');
        setNewCompany(null);

        try {
            const res = await fetch('/api/search-company', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ cnpj: cnpjToSearch }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message);
            setNewCompany(data);
        } catch (err) {
            setCompanyError(err.message);
        } finally {
            setCompanyLoading(false);
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onConfirm(formData);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-white">Confirme os dados para o QR Code</h2>
                <span className="text-xs font-bold text-gray-800 bg-white/80 px-3 py-1 rounded-full backdrop-blur-sm">
                    Fonte: {participant.source?.toUpperCase()}
                </span>
            </div>
            
            <div>
                <label className="block text-white font-medium mb-2">Nome Completo</label>
                <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-transparent transition-all"
                    required
                    maxLength={100}
                />
            </div>

            <div>
                <label className="block text-white font-medium mb-2">CPF</label>
                <input
                    type="text"
                    name="cpf"
                    value={formData.cpf}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-transparent transition-all"
                    required
                    maxLength={14}
                />
            </div>

            <div>
                <label className="block text-white font-medium mb-2">E-mail</label>
                <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-transparent transition-all"
                    required
                    maxLength={254}
                />
            </div>

            <div>
                <label className="block text-white font-medium mb-2">Telefone</label>
                <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-transparent transition-all"
                    required
                    placeholder="(99) 99999-9999"
                    maxLength={15}
                />
            </div>

            {/* Seção de Empresa */}
            <div className="space-y-3">
                <label className="block text-white font-medium">Empresa Vinculada</label>
                {formData.company ? (
                    <div className="p-4 bg-white/10 border border-white/20 rounded-xl backdrop-blur-sm">
                        <p className="font-medium text-white">{formData.company.razaoSocial}</p>
                        <p className="text-sm text-white/70 mt-1">
                            CNPJ: {formData.company.cnpj} • Cargo: {formData.company.cargo}
                        </p>
                        <button
                            type="button"
                            onClick={() => setShowCompanySelect(true)}
                            className="mt-2 text-sm text-blue-300 hover:text-blue-200 underline"
                        >
                            Alterar empresa
                        </button>
                    </div>
                ) : (
                    <button
                        type="button"
                        onClick={() => setShowCompanySelect(true)}
                        className="w-full p-4 text-center border-2 border-dashed border-white/30 rounded-xl text-white/70 hover:border-white/50 hover:text-white transition-all backdrop-blur-sm"
                    >
                        + Vincular Empresa
                    </button>
                )}

                {/* Modal de seleção de empresa */}
                {showCompanySelect && (
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                        <div className="bg-white/95 backdrop-blur-md rounded-xl p-6 max-w-lg w-full max-h-[80vh] overflow-y-auto border border-white/20">
                            <h3 className="text-lg font-semibold mb-4 text-gray-800">Selecionar Empresa</h3>
                            
                            {/* Empresas vinculadas */}
                            <div className="space-y-2 mb-6">
                                <h4 className="font-medium text-gray-700 mb-2">Empresas Vinculadas:</h4>
                                {availableCompanies.length > 0 ? (
                                    availableCompanies.map((vinculo, index) => (
                                        <button
                                            key={index}
                                            type="button"
                                            onClick={() => handleCompanySelect(vinculo)}
                                            className="w-full p-3 text-left border rounded-lg hover:bg-gray-50"
                                        >
                                            <p className="font-medium">{vinculo.NomeRazaoSocialPJ}</p>
                                            <p className="text-sm text-gray-600">
                                                CNPJ: {vinculo.CgcCpf?.toString()} • Cargo: {vinculo.DescCargCli}
                                            </p>
                                        </button>
                                    ))
                                ) : (
                                    <p className="text-gray-600">Nenhuma empresa vinculada disponível.</p>
                                )}
                            </div>

                            {/* Divisor */}
                            <div className="relative mb-6">
                                <div className="absolute inset-0 flex items-center">
                                    <div className="w-full border-t border-gray-300"></div>
                                </div>
                                <div className="relative flex justify-center text-sm">
                                    <span className="px-2 bg-white text-gray-500">ou</span>
                                </div>
                            </div>

                            {/* Buscar nova empresa */}
                            <div className="space-y-4 mb-6">
                                <h4 className="font-medium text-gray-700">Adicionar Nova Empresa:</h4>
                                <div className="flex space-x-2">
                                    <input
                                        type="text"
                                        value={cnpj}
                                        onChange={(e) => setCnpj(formatCNPJ(e.target.value))}
                                        className="form-input flex-grow"
                                        placeholder="Digite o CNPJ..."
                                    />
                                    <button
                                        type="button"
                                        onClick={() => handleSearchCompany(cnpj.replace(/\D/g, ''))}
                                        disabled={companyLoading}
                                        className="btn btn-primary px-4 py-2 text-sm flex-shrink-0 w-auto"
                                    >
                                        {companyLoading ? 'Buscando...' : 'Buscar'}
                                    </button>
                                </div>
                                {companyError && (
                                    <p className="text-sm text-red-500">{companyError}</p>
                                )}
                                {newCompany && (
                                    <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                                        <p className="font-medium text-green-800">{newCompany.razaoSocial}</p>
                                        <p className="text-sm text-green-600">CNPJ: {newCompany.cnpj}</p>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                handleCompanySelect({
                                                    NomeRazaoSocialPJ: newCompany.razaoSocial,
                                                    CgcCpf: newCompany.cnpj,
                                                    DescCargCli: ''
                                                });
                                                setShowCompanySelect(false);
                                            }}
                                            className="mt-2 text-sm text-blue-600 hover:text-blue-800"
                                        >
                                            Selecionar esta empresa
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Ações do modal */}
                            <div className="flex justify-between pt-4 border-t">
                                <button
                                    type="button"
                                    onClick={() => handleCompanySelect(null)}
                                    className="text-gray-600 hover:text-gray-800"
                                >
                                    Remover vínculo
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setShowCompanySelect(false)}
                                    className="text-gray-600 hover:text-gray-800"
                                >
                                    Fechar
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-2 gap-4 pt-6">
                <button
                    type="submit"
                    className="w-full bg-white/20 hover:bg-white/30 text-white font-semibold py-3 px-6 rounded-xl backdrop-blur-sm border border-white/30 transition-all duration-200"
                >
                    Gerar QR Code
                </button>
                <button
                    type="button"
                    onClick={onCancel}
                    className="w-full bg-white/5 hover:bg-white/10 text-white font-semibold py-3 px-6 rounded-xl backdrop-blur-sm border border-white/20 transition-all duration-200"
                >
                    Cancelar
                </button>
            </div>
        </form>
    );
};

const QRCodeLabel = ({ participantData, onNewSearch }) => {
    const [displayName, setDisplayName] = useState(participantData.name);
    // Função para gerar o vCard
    const generateVCard = () => {
        // Remove formatação do CPF
        const cpfClean = participantData.cpf.replace(/\D/g, '');
        
        // Gera um vCard no formato específico
        let vcard = [
            'BEGIN:VCARD',
            'VERSION:4.0',
            `FN:${displayName}`,
            `EMAIL:${participantData.email}`,
            `X-CPF:${cpfClean}`,
            `TEL:${unformatPhone(participantData.phone)}`,
            'X-CPF-RESPONSAVEL:'
        ];
        
        // Adiciona a empresa se existir
        if (participantData.company?.razaoSocial) {
            const cnpjClean = participantData.company.cnpj.replace(/\D/g, '');
            vcard.push(`X-CNPJ:${cnpjClean}`);
            vcard.push(`ORG:${participantData.company.razaoSocial}`);
        }
        
        vcard.push('END:VCARD');
        
        // Retorna o vCard como uma string com quebras de linha padrão
        return vcard.join('\n');
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col items-center space-y-6">
                {/* Editor de nome de exibição */}
                <div className="w-full">
                    <label className="block text-white font-medium mb-2">
                        Nome na Etiqueta
                    </label>
                    <input
                        type="text"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-transparent transition-all"
                        placeholder="Como o nome deve aparecer na etiqueta"
                        maxLength={50}
                    />
                </div>

                {/* QR Code */}
                {/* Container para visualização na tela */}
                <div className="w-full mb-6">
                    <div className="p-6 bg-white/95 backdrop-blur-md rounded-xl shadow-lg max-w-[600px] mx-auto border border-white/20">
                        <div className="flex flex-col sm:flex-row gap-6 items-start">
                            <div className="flex-shrink-0 mx-auto sm:mx-0">
                                <QRCode
                                    value={generateVCard()}
                                    size={180}
                                    level="L"
                                    includeMargin={true}
                                    renderAs="svg"
                                    fgColor="#000000"
                                    bgColor="#FFFFFF"
                                />
                            </div>
                            <div className="flex-1 text-center sm:text-left min-w-0 pt-2">
                                <p className="font-bold text-xl leading-tight break-words max-w-[300px] text-gray-800">
                                    {displayName}
                                </p>
                                {participantData.company?.razaoSocial && (
                                    <p className="text-sm text-gray-600 leading-tight break-words max-w-[300px] mt-2">
                                        {participantData.company.razaoSocial}
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Container oculto para impressão */}
                <div className="print-only hidden">
                    <div className="print-qr-container">
                        <div className="print-qr-wrapper">
                            <QRCode
                                value={generateVCard()}
                                size={180}
                                level="L"
                                includeMargin={true}
                                renderAs="svg"
                                fgColor="#000000"
                                bgColor="#FFFFFF"
                            />
                        </div>
                        <div className="print-text-wrapper">
                            <p className="print-name">{displayName}</p>
                            {participantData.company?.razaoSocial && (
                                <p className="print-company">{participantData.company.razaoSocial}</p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Botões de ação */}
                <div className="w-full flex flex-col gap-2">
                    <button
                        onClick={() => window.print()}
                        className="btn btn-primary w-full"
                    >
                        Imprimir Etiqueta
                    </button>
                    <button
                        onClick={onNewSearch}
                        className="btn btn-secondary w-full"
                    >
                        Nova Pesquisa
                    </button>
                </div>
            </div>

            {/* Estilos específicos */}
            <style jsx global>{`
                /* Estilos para visualização na tela */
                .screen-view {
                    display: block;
                }
                .print-only {
                    display: none;
                }

                /* Estilos para impressão */
                @media print {
                    @page {
                        size: auto;
                        margin: 0;
                    }

                    body {
                        margin: 0;
                        padding: 0;
                        visibility: hidden;
                    }

                    /* Esconde elementos da tela */
                    .screen-view, button, input, label {
                        display: none !important;
                    }

                    /* Mostra e configura o container de impressão */
                    .print-only {
                        display: block !important;
                        visibility: visible;
                        position: fixed;
                        top: 0;
                        left: 0;
                        width: 100%;
                        height: 100%;
                    }

                    .print-qr-container {
                        visibility: visible;
                        position: absolute;
                        top: 50%;
                        left: 50%;
                        transform: translate(-50%, -50%);
                        display: flex;
                        align-items: flex-start;
                        gap: 20px;
                        padding: 20px;
                        max-width: 500px;
                        width: calc(100% - 40px);
                        background: white;
                        box-sizing: border-box;
                    }

                    .print-qr-wrapper {
                        flex-shrink: 0;
                        width: 180px;
                    }

                    .print-qr-wrapper svg {
                        width: 180px !important;
                        height: 180px !important;
                        display: block;
                    }

                    .print-text-wrapper {
                        flex: 1;
                        min-width: 0;
                        padding-top: 10px;
                    }

                    .print-name {
                        margin: 0;
                        font-size: 16pt;
                        font-weight: bold;
                        line-height: 1.2;
                        white-space: normal;
                        word-wrap: break-word;
                        max-width: 300px;
                        min-width: 0;
                    }

                    .print-company {
                        margin: 4px 0 0 0;
                        font-size: 12pt;
                        color: #666;
                        line-height: 1.2;
                        white-space: normal;
                        word-wrap: break-word;
                        max-width: 300px;
                        min-width: 0;
                    }
                }
            `}</style>
        </div>
    );
};

const Header = () => (
    <header className="w-full bg-sebrae-blue-dark p-4 shadow-lg flex justify-between items-center fixed top-0 left-0 z-10">
        <div className="w-1/3 flex items-center space-x-4">
            <img src="/sebrae-logo-white.png" alt="Logo Sebrae" className="h-8" />
            <button 
                onClick={() => window.location.href = '/'}
                className="text-white text-sm font-semibold hover:text-white/80 flex items-center gap-2 transition-colors"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
                </svg>
                Voltar ao Menu
            </button>
        </div>
        <div className="w-1/3 text-center">
            <h1 className="text-white text-lg font-bold">QR Code Participante</h1>
        </div>
        <div className="w-1/3"></div>
    </header>
);

export default function QRCodeSebrae() {
    const [cpf, setCpf] = useState('');
    const [participant, setParticipant] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [confirmedData, setConfirmedData] = useState(null);

    const handleSearch = async () => {
        setError('');
        if (!validateCPF(cpf)) {
            setError('CPF inválido. Por favor, verifique o número digitado.');
            return;
        }
        setLoading(true);
        
        try {
            // Primeiro, buscar dados do participante no SAS
            const searchRes = await fetch('/api/search-participant', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ cpf: cpf.replace(/\D/g, '') })
            });

            if (!searchRes.ok && searchRes.status !== 404) {
                throw new Error('Erro ao buscar dados do participante');
            }

            const searchData = await searchRes.json();
            
            // Se não encontrou no SAS, buscar no CPE
            if (searchRes.status === 404) {
                const cpeRes = await fetch('/api/search', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ cpf: cpf.replace(/\D/g, '') })
                });

                if (!cpeRes.ok) {
                    throw new Error('Participante não encontrado nas bases do Sebrae');
                }

                const cpeData = await cpeRes.json();
                setParticipant({
                    ...cpeData,
                    cpf: formatCPF(cpf),
                    source: 'cpe'
                });
            } else {
                // Dados encontrados no SAS
                setParticipant({
                    ...searchData,
                    cpf: formatCPF(cpf),
                    source: 'sas'
                });

                // Se houver empresa vinculada no SAS, fazer a busca
                if (searchData.ListaVinculo?.length > 0) {
                    const vinculoPrincipal = searchData.ListaVinculo.find(v => v.IndPrincipal === 1) || searchData.ListaVinculo[0];
                    if (vinculoPrincipal?.CgcCpf) {
                        try {
                            const companyRes = await fetch('/api/search-company', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ cnpj: vinculoPrincipal.CgcCpf }),
                            });
                            if (companyRes.ok) {
                                const companyData = await companyRes.json();
                                setParticipant(prev => ({
                                    ...prev,
                                    company: companyData
                                }));
                            }
                        } catch (err) {
                            console.error('Erro ao buscar empresa:', err);
                        }
                    }
                }
            }
        } catch (err) {
            setError(err.message);
            setParticipant(null);
        } finally {
            setLoading(false);
        }
    };

    const handleNewSearch = () => {
        setParticipant(null);
        setCpf('');
        setError('');
        setConfirmedData(null);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#1E67C3] to-[#0A4DA6] flex flex-col">
            <Header />
            
            <main className="flex-1 flex items-center justify-center px-4 py-8">
                <div className="w-full max-w-2xl">
                    <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-8">
                        <h1 className="text-2xl font-semibold text-white text-center mb-2">
                            Gerador de QR Code
                        </h1>
                        <p className="text-white/80 text-center mb-8">
                            Gere o QR Code com os dados do participante
                        </p>
                        
                        {confirmedData ? (
                            <QRCodeLabel
                                participantData={confirmedData}
                                onNewSearch={handleNewSearch}
                            />
                        ) : participant ? (
                            <ConfirmationScreen
                                participant={participant}
                                onConfirm={data => setConfirmedData(data)}
                                onCancel={handleNewSearch}
                            />
                        ) : (
                            <InitialScreen
                                onSearch={handleSearch}
                                cpf={cpf}
                                setCpf={setCpf}
                                loading={loading}
                                error={error}
                            />
                        )}
                    </div>
                </div>
            </main>

            {/* Footer */}
            <footer className="w-full p-4 text-center text-white/60 text-sm">
                © {new Date().getFullYear()} Sebrae - Gerador de QR Code
            </footer>

            {/* Loading Overlay */}
            {loading && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="animate-spin rounded-full h-12 w-12 border-4 border-white/20 border-t-white"></div>
                </div>
            )}
        </div>
    );
}

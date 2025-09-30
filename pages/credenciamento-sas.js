import { useState, useEffect } from 'react';
import { validateCPF, formatCPF, formatCNPJ, formatPhone, unformatPhone } from '../utils/validators';

import { useSession } from 'next-auth/react';

// --- LISTA DE OPÇÕES (EDITÁVEL) ---
const VINCULO_OPTIONS = [
    "PROPRIETÁRIO OU SÓCIO", "CONTADOR", "REPRESENTANTE", 
    "FUNCIONÁRIO", "RESPONSÁVEL",
];

// --- COMPONENTES DA UI ---
const Header = ({ attendantName, onEndShift }) => (
    <header className="w-full bg-sebrae-blue-dark p-4 shadow-lg flex justify-between items-center fixed top-0 left-0 z-10">
    <div className="w-1/3"><img src="/sebrae-logo-white.png" alt="Logo Sebrae" className="h-8" /></div>
        <div className="w-1/3 text-center"><span className="text-white text-sm font-semibold hidden sm:block">Atendente: {attendantName}</span></div>
        <div className="w-1/3 flex justify-end"><button onClick={onEndShift} className="bg-sebrae-danger-red hover:bg-sebrae-danger-red-hover text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors">Encerrar Turno</button></div>
    </header>
);

const ConfigurationScreen = ({ onSessionStart }) => {
    const [eventCode, setEventCode] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [events, setEvents] = useState([]);
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const { data: session } = useSession(); // Obtendo a sessão do usuário do Keycloak

    // Função para voltar ao menu principal
    const handleBackToMenu = () => {
        window.location.href = '/';
    };

    // Formatar data para o padrão brasileiro DD/MM/YYYY
    const formatDateToBR = (dateStr) => {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        return date.toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    };

    const handleSearchEvent = async () => {
        if (!eventCode) {
            setError('Digite o código do evento SAS');
            return;
        }
        if (!startDate || !endDate) {
            setError('Selecione o período de busca');
            return;
        }

        setLoading(true);
        setError('');
        try {
            const periodoInicial = formatDateToBR(startDate);
            const periodoFinal = formatDateToBR(endDate);
            const response = await fetch(`/api/sas-events?codEvento=${eventCode}&periodoInicial=${periodoInicial}&periodoFinal=${periodoFinal}`);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Erro ao buscar evento');
            }

            if (data.length === 0) {
                setError('Nenhum evento encontrado com este código');
                setEvents([]);
                setSelectedEvent(null);
                return;
            }

            setEvents(data);
            setSelectedEvent(data[0]); // Seleciona o primeiro evento encontrado
        } catch (err) {
            setError(err.message);
            setEvents([]);
            setSelectedEvent(null);
        } finally {
            setLoading(false);
        }
    };

    const handleStart = () => {
        if (!selectedEvent) {
            setError('Selecione um evento válido.');
            return;
        }
        if (!session?.user?.name) {
            setError('Usuário não autenticado.');
            return;
        }
        setError('');
        onSessionStart({
            attendantName: session.user.name,
            eventId: selectedEvent.id,
            eventName: selectedEvent.nome,
            eventDetails: selectedEvent
        });
    };

    const isDisabled = !selectedEvent || loading || !session?.user;

    return (
        <div className="app-container">
            <div className="card">
                <div className="flex justify-between items-center mb-6">
                    <button
                        onClick={handleBackToMenu}
                        className="text-gray-600 hover:text-gray-800 flex items-center gap-2"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
                        </svg>
                        Voltar ao Menu
                    </button>
                </div>
                <h1 className="card-title">Configuração do Credenciamento SAS</h1>
                <p className="card-subtitle">Configure sua sessão para iniciar o credenciamento.</p>
                <div className="form-group">
                    {/* Nome do usuário logado via Keycloak */}
                    <div className="bg-blue-50 p-4 rounded-lg mb-4">
                        <p className="text-sm text-blue-800">
                            Usuário: <strong>{session?.user?.name || 'Não autenticado'}</strong>
                        </p>
                    </div>
                    <div className="space-y-4">
                        <div className="w-full">
                            <label htmlFor="eventCode" className="block text-sm font-medium text-gray-700 mb-1">
                                Código do Evento SAS
                            </label>
                            <input
                                id="eventCode"
                                type="text"
                                inputMode="numeric" // Pede o teclado numérico em mobile
                                pattern="[0-9]*"
                                value={eventCode}
                                onChange={e => setEventCode(e.target.value)}
                                className="form-input w-full text-lg font-medium"
                                placeholder="Digite o código do evento"
                                maxLength={12} 
                            />
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-1">
                                    Data Inicial
                                </label>
                                <input
                                    id="startDate"
                                    type="date"
                                    value={startDate}
                                    onChange={e => setStartDate(e.target.value)}
                                    className="form-input w-full"
                                />
                            </div>
                            <div>
                                <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-1">
                                    Data Final
                                </label>
                                <input
                                    id="endDate"
                                    type="date"
                                    value={endDate}
                                    onChange={e => setEndDate(e.target.value)}
                                    className="form-input w-full"
                                />
                            </div>
                        </div>
                        
                        <button
                            onClick={handleSearchEvent}
                            disabled={loading || !eventCode || !startDate || !endDate}
                            className={`w-full transition-colors ${
                                !eventCode || !startDate || !endDate
                                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                    : loading
                                        ? 'bg-gray-400 text-white cursor-wait'
                                        : 'bg-gray-700 hover:bg-gray-800 text-white'
                            } py-2 px-4 rounded-lg font-medium`}
                        >
                            {loading ? 'Buscando...' : 'Buscar Evento'}
                        </button>
                    </div>
                    
                    {selectedEvent && (
                        <div className="mt-4 p-4 bg-blue-50 rounded-lg border-l-4 border-blue-500">
                            <h3 className="font-semibold text-blue-900">Evento Selecionado:</h3>
                            <p className="text-sm text-blue-800 font-medium mt-1">{selectedEvent.nome}</p>
                            <p className="text-xs text-blue-600 mt-2">
                                <strong>Código do evento:</strong> {selectedEvent.id}
                            </p>
                            {/* Informações adicionais do evento */}
                            <p className="text-xs text-blue-600 mt-2">
                                <strong>Data:</strong> {new Date(selectedEvent.dataEvento).toLocaleDateString('pt-BR')}
                            </p>
                        </div>
                    )}

                    {error && <p className="feedback-error">{error}</p>}
                    
                    <button
                        onClick={handleStart}
                        disabled={!selectedEvent || loading || !session?.user}
                        className={`w-full mt-4 transition-colors ${
                            !selectedEvent || loading || !session?.user
                                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                : 'bg-blue-600 hover:bg-blue-700 text-white'
                        } py-2 px-4 rounded-lg font-medium`}
                    >
                        {loading ? 'Carregando...' : 'Iniciar Turno'}
                    </button>
                </div>
            </div>
        </div>
    );
};

const InitialScreen = ({ onSearch, cpf, setCpf, loading, error }) => {
    const handleCpfChange = (e) => { setCpf(formatCPF(e.target.value)); };
    return (
        <div className="form-group">
            <div>
                <label htmlFor="cpf" className="form-label">CPF do Participante</label>
                <input
                    id="cpf"
                    type="text"
                    value={cpf}
                    onChange={handleCpfChange}
                    className="form-input"
                    placeholder="000.000.000-00"
                />
            </div>
            <button 
                onClick={onSearch}
                disabled={loading || !cpf}
                className="btn btn-primary w-full mt-4"
            >
                {loading ? 'Buscando...' : 'Buscar Participante'}
            </button>
            {error && <p className="feedback-error">{error}</p>}
        </div>
    );
};

const ParticipantForm = ({ onSubmit, loading, initialParticipant, onCancel }) => {
    const [formData, setFormData] = useState(initialParticipant || {
        name: '',
        email: '',
        phone: '',
        cpf: '',
        consentGiven: false
    });
    const [errors, setErrors] = useState({});
    const [linkCompany, setLinkCompany] = useState(false);
    const [cnpj, setCnpj] = useState('');
    const [company, setCompany] = useState(null);
    const [companyLoading, setCompanyLoading] = useState(false);
    const [companyError, setCompanyError] = useState('');
    const [vinculo, setVinculo] = useState('');
    const [emailHint, setEmailHint] = useState('');

    useEffect(() => {
        if (initialParticipant && !initialParticipant.email) {
            setEmailHint('Atenção: E-mail é essencial. Por favor, preencha este campo.');
        } else {
            setEmailHint('');
        }

        // Verificar vínculos do SAS
        if (initialParticipant?.source === 'sas' && initialParticipant.rawData?.ListaVinculo?.length > 0) {
            let vinculoParaUsar = initialParticipant.rawData.ListaVinculo.find(v => v.IndPrincipal === 1);

            if (!vinculoParaUsar && initialParticipant.rawData.ListaVinculo.length === 1) {
                vinculoParaUsar = initialParticipant.rawData.ListaVinculo[0];
            }

            if (vinculoParaUsar && vinculoParaUsar.CgcCpf) {
                const formattedCnpj = formatCNPJ(String(vinculoParaUsar.CgcCpf));
                setLinkCompany(true);
                setCnpj(formattedCnpj);
                handleSearchCompany(formattedCnpj);
                if (vinculoParaUsar.DescCargCli) {
                    setVinculo(vinculoParaUsar.DescCargCli.toUpperCase());
                }
            }
        }
    }, [initialParticipant]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        let newValue = type === 'checkbox' ? checked : value;

        // Aplicar máscara para telefone
        if (name === 'phone') {
            newValue = formatPhone(value);
        }

        setFormData(prev => ({
            ...prev,
            [name]: newValue
        }));
        
        // Limpar erro do campo quando ele é modificado
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: '' }));
        }
    };

    const handleSearchCompany = async (cnpjToSearch) => {
        setCompanyLoading(true);
        setCompanyError('');
        setCompany(null);
        setVinculo('');
        try {
            const res = await fetch('/api/search-company', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ cnpj: cnpjToSearch }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message);
            setCompany(data);
            if (data.cnpj && initialParticipant.rawData?.cpfPessoaResponsavel === initialParticipant.cpf.replace(/\D/g, '')) {
                setVinculo('PROPRIETÁRIO OU SÓCIO');
            }
        } catch (err) {
            setCompanyError(err.message);
        } finally {
            setCompanyLoading(false);
        }
    };

    const handleCPFChange = (e) => {
        setFormData(prev => ({
            ...prev,
            cpf: formatCPF(e.target.value)
        }));
    };

    const validateForm = () => {
        const newErrors = {};
        if (!formData.name.trim()) newErrors.name = 'Nome é obrigatório';
        if (!formData.email.trim()) newErrors.email = 'Email é obrigatório';
        if (!formData.phone.trim()) newErrors.phone = 'Telefone é obrigatório';
        if (!validateCPF(formData.cpf)) newErrors.cpf = 'CPF inválido';
        if (!formData.consentGiven) newErrors.consent = 'É necessário aceitar os termos';
        
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (validateForm()) {
            onSubmit(formData);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4 animate-fade-in">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-gray-800">Confirme os Dados</h2>
                <span className="text-xs font-bold text-white bg-gray-500 px-2 py-1 rounded-full">
                    Fonte: {(formData.source || formData.dataOrigin || formData.fromSystem || 'cpe').toUpperCase()}
                </span>
            </div>

            <div>
                <label htmlFor="name" className="text-sm font-medium text-gray-700">Nome Completo ou Nome Social</label>
                <input
                    id="name"
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    className="w-full px-4 py-3 mt-1 border border-gray-300 rounded-xl shadow-sm"
                />
            </div>

            <div>
                <label htmlFor="email" className="text-sm font-medium text-gray-700">E-mail</label>
                {emailHint && <p className="text-xs text-red-600 mt-1">{emailHint}</p>}
                <input
                    id="email"
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className={`w-full px-4 py-3 mt-1 border rounded-xl shadow-sm ${
                        emailHint ? 'border-red-500' : 'border-gray-300'
                    }`}
                />
            </div>

            <div>
                <label htmlFor="phone" className="text-sm font-medium text-gray-700">Telefone</label>
                <input
                    id="phone"
                    type="text"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className="w-full px-4 py-3 mt-1 border border-gray-300 rounded-xl shadow-sm"
                    placeholder="(99) 99999-9999"
                    maxLength={15}
                />
            </div>

            <div className="pt-4 border-t">
                <label className="flex items-center space-x-2">
                    <input
                        type="checkbox"
                        checked={linkCompany}
                        onChange={() => setLinkCompany(!linkCompany)}
                        className="h-4 w-4 rounded"
                    />
                    <span className="text-sm font-medium text-gray-700">Vincular a uma empresa?</span>
                </label>
            </div>

            {linkCompany && (
                <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
                    <label htmlFor="cnpj" className="text-sm font-medium text-gray-600">
                        Informe o CNPJ
                    </label>
                    <div className="flex space-x-2">
                        <input
                            id="cnpj"
                            type="text"
                            value={cnpj}
                            onChange={(e) => setCnpj(formatCNPJ(e.target.value))}
                            className="form-input flex-grow"
                            placeholder="00.000.000/0000-00"
                        />
                        <button
                            type="button"
                            onClick={() => handleSearchCompany(cnpj)}
                            disabled={companyLoading}
                            className="btn btn-primary px-4 py-2 text-sm flex-shrink-0 w-auto"
                        >
                            {companyLoading ? 'Buscando...' : 'Buscar'}
                        </button>
                    </div>
                    {companyError && <p className="text-sm text-red-500">{companyError}</p>}
                    {company && (
                        <div className="space-y-3 animate-fade-in">
                            <div className="text-sm text-green-700 bg-green-100 p-3 rounded-md">
                                <strong>Empresa:</strong> {company.razaoSocial}
                            </div>
                            <div>
                                <label htmlFor="vinculo" className="text-sm font-medium text-gray-700">
                                    Vínculo com a empresa
                                </label>
                                <select
                                    id="vinculo"
                                    value={vinculo}
                                    onChange={(e) => setVinculo(e.target.value)}
                                    className="w-full px-4 py-3 mt-1 border border-gray-300 rounded-xl shadow-sm bg-white"
                                    required
                                >
                                    <option value="" disabled>Selecione o vínculo...</option>
                                    {VINCULO_OPTIONS.map(option => (
                                        <option key={option} value={option}>{option}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    )}
                </div>
            )}

            <div className="pt-4 border-t">
                <label className="flex items-center space-x-3">
                    <input
                        type="checkbox"
                        name="consentGiven"
                        checked={formData.consentGiven}
                        onChange={handleChange}
                        className="h-5 w-5 rounded"
                    />
                    <span className="text-sm font-medium text-gray-700">
                        O participante consente com a coleta e atualização de seus dados (LGPD).
                    </span>
                </label>
                {errors.consent && <p className="text-red-500 text-sm mt-1">{errors.consent}</p>}
            </div>

            <div className="flex flex-col space-y-2">
                <button
                    type="submit"
                    disabled={loading || !formData.consentGiven}
                    className="btn btn-success"
                >
                    {loading ? 'Processando...' : 'Confirmar e Credenciar'}
                </button>
                <button
                    type="button"
                    onClick={onCancel}
                    className="btn btn-secondary"
                >
                    Nova Pesquisa
                </button>
            </div>
        </form>
    );
};

const SuccessScreen = ({ onNewRegistration }) => (
    <div className="text-center space-y-6 animate-fade-in">
        <svg className="mx-auto h-16 w-16 text-sebrae-green" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <h2 className="text-2xl font-bold text-gray-800">Participante Credenciado!</h2>
        <p className="text-gray-600">O participante foi registrado com sucesso no sistema.</p>
        <button onClick={onNewRegistration} className="btn btn-primary">
            Novo Credenciamento
        </button>
    </div>
);

export default function CredenciamentoSAS() {
    const [session, setSession] = useState(null);
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [cpf, setCpf] = useState('');
    const [participant, setParticipant] = useState(null);
    const [error, setError] = useState('');

    useEffect(() => {
        const savedSession = sessionStorage.getItem('credenciamento-sas-session');
        if (savedSession) {
            setSession(JSON.parse(savedSession));
        }
    }, []);

    const handleSessionStart = (sessionData) => {
        sessionStorage.setItem('credenciamento-sas-session', JSON.stringify(sessionData));
        setSession(sessionData);
    };

    const handleEndShift = () => {
        sessionStorage.removeItem('credenciamento-sas-session');
        setSession(null);
        setSuccess(false);
    };

    const handleSubmit = async (formData) => {
        setLoading(true);
        try {
            // Primeiro, buscar os dados completos do participante
            const searchRes = await fetch('/api/search-participant', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ cpf: formData.cpf.replace(/\D/g, '') })
            });

            if (!searchRes.ok && searchRes.status !== 404) {
                throw new Error('Erro ao buscar dados do participante');
            }

            const searchData = await searchRes.json();
            
            // Combinar dados encontrados com os dados do formulário
            const participantData = {
                ...searchData,
                name: formData.name,
                email: formData.email,
                // Envia telefone sem formatação (somente dígitos) para o backend/webhook
                phone: unformatPhone(formData.phone),
                cpf: formData.cpf,
                source: formData.source || searchData?.source || 'manual',
                CodParceiro: searchData?.source === 'sas' ? searchData?.rawData?.CodParceiro || '' : ''
            };

            // Preparar dados para o webhook
            const webhookData = {
                participant: participantData,
                event: session.eventDetails,
                attendant: {
                    name: session.attendantName
                },
                source: participantData.source,
                // Garantir que o telefone da empresa também seja enviado sem formatação, se houver
                company: formData.company ? {
                    ...formData.company,
                    telefone: formData.company.telefone ? unformatPhone(formData.company.telefone) : formData.company.telefone
                } : null,
                companyRelation: formData.vinculo || null,
                registrationTimestamp: new Date().toISOString()
            };

            // Enviar dados para o webhook
            const webhookRes = await fetch('https://n8nhook.rr.sebrae.com.br/webhook/Credenciamento_checkin_sistema', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(webhookData)
            });

            if (!webhookRes.ok) {
                throw new Error('Erro ao enviar dados para o sistema de check-in');
            }

            // Processar o credenciamento
            const credRes = await fetch('/api/process-credenciamento', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    participant: participantData,
                    eventDetails: session.eventDetails
                })
            });

            if (!credRes.ok) {
                throw new Error('Erro ao processar credenciamento');
            }

            setSuccess(true);
        } catch (error) {
            alert('Erro ao credenciar participante: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleNewRegistration = () => {
        setSuccess(false);
        setError('');
        setCpf('');
        setParticipant(null);
    };

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

            // Caso o endpoint tenha retornado um payload (pode ser SAS ou CPE), usamos a fonte que veio na resposta.
            if (searchData) {
                setParticipant({
                    ...searchData,
                    cpf: formatCPF(cpf),
                    source: searchData.source || searchData.dataOrigin || searchData.fromSystem || 'cpe'
                });
            } else {
                // searchRes não trouxe dados (404), considera participante não encontrado
                throw new Error('Participante não encontrado nas bases do Sebrae');
            }
        } catch (err) {
            setError(err.message);
            setParticipant(null);
        } finally {
            setLoading(false);
        }
    };

    if (!session) {
        return <ConfigurationScreen onSessionStart={handleSessionStart} />;
    }

    return (
        <>
            <Header attendantName={session.attendantName} onEndShift={handleEndShift} />
            <div className="app-container pt-24 pb-8">
            <div className="card">
                <div className="bg-white/10 p-4 rounded-lg mb-6">
                    <h2 className="text-lg font-semibold text-gray-700">
                        {session.eventName}
                    </h2>
                    <p className="text-sm text-gray-600">
                        Código do evento: {session.eventId}
                    </p>
                </div>
                <h1 className="card-title">Credenciamento SAS</h1>
                <p className="card-subtitle">Registre um novo participante diretamente no sistema</p>                    {success ? (
                        <SuccessScreen onNewRegistration={handleNewRegistration} />
                    ) : participant ? (
                        <ParticipantForm
                            onSubmit={handleSubmit}
                            loading={loading}
                            initialParticipant={participant}
                            onCancel={handleNewRegistration}
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
        </>
    );
}

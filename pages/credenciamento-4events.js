import { useState, useEffect } from 'react';
import { validateCPF, formatCPF, formatCNPJ, formatPhone, unformatPhone } from '../utils/validators';
import { useSession, signIn, signOut } from 'next-auth/react';

// --- LISTA DE OPÇÕES (EDITÁVEL) ---
const VINCULO_OPTIONS = [
  "PROPRIETÁRIO OU SÓCIO", "CONTADOR", "REPRESENTANTE", 
  "FUNCIONÁRIO", "RESPONSÁVEL",
];

// --- COMPONENTES DA UI ---
// Os componentes Header, ConfigurationScreen, InitialScreen, e SuccessScreen permanecem os mesmos.
// O código completo está no final do arquivo.

const Header = ({ attendantName, onEndShift }) => (
    <header className="w-full bg-white/10 backdrop-blur-md border-b border-white/20 p-4 flex justify-between items-center">
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
            <span className="text-white text-sm font-semibold hidden sm:block">Atendente: {attendantName}</span>
        </div>
        <div className="w-1/3 flex justify-end">
            <button 
                onClick={onEndShift} 
                className="bg-red-500/80 hover:bg-red-600/80 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-all backdrop-blur-sm border border-red-400/30"
            >
                Encerrar Turno
            </button>
        </div>
    </header>
);

const ConfigurationScreen = ({ onSessionStart }) => {
    const { data: session } = useSession();
    const [events, setEvents] = useState([]);
    const [selectedEvent, setSelectedEvent] = useState('');
    const [ticketCategories, setTicketCategories] = useState([]);
    const [selectedTicket, setSelectedTicket] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    useEffect(() => {
        if (!session?.user) return;
        
        setLoading(true);
        fetch('/api/events', {
            headers: {
                'Authorization': `Bearer ${session.accessToken}`
            }
        }).then(res => res.json()).then(data => {
            if (Array.isArray(data)) { setEvents(data); } 
            else { setError("Não foi possível carregar a lista de eventos."); setEvents([]); }
        }).catch(() => setError("Erro de rede ao buscar eventos.")).finally(() => setLoading(false));
    }, [session]);
    useEffect(() => {
        if (selectedEvent) {
            setLoading(true); setTicketCategories([]); setSelectedTicket('');
            fetch(`/api/ticket-categories?eventId=${selectedEvent}`).then(res => res.json()).then(data => {
                if(Array.isArray(data)) { setTicketCategories(data); } 
                else { setError("Não foi possível carregar os ingressos."); }
            }).catch(() => setError("Erro de rede ao buscar ingressos.")).finally(() => setLoading(false));
        } else { setTicketCategories([]); }
    }, [selectedEvent]);
    const handleStart = () => {
        if (!session?.user) { 
            setError('Usuário não autenticado.'); 
            return; 
        }
        setError('');
        const eventName = events.find(e => e.id == selectedEvent)?.name || '';
        onSessionStart({ 
            attendantName: session.user.name,
            eventId: selectedEvent, 
            ticketId: selectedTicket, 
            eventName 
        });
    };
    
    const isDisabled = !session?.user || !selectedEvent || !selectedTicket || loading;
    
    return (
        <div className="app-container">
            <div className="card">
                <h1 className="card-title">Configuração da Sessão</h1>
                <p className="card-subtitle">Prepare o sistema para iniciar o credenciamento.</p>
                <div className="form-group">
                    <div className="bg-blue-50 p-4 rounded-lg mb-4">
                        <p className="text-sm text-blue-800">
                            Usuário: <strong>{session?.user?.name || 'Não autenticado'}</strong>
                        </p>
                    </div>
                    <select 
                        value={selectedEvent} 
                        onChange={e => setSelectedEvent(e.target.value)} 
                        className="form-input text-left text-base"
                    >
                        <option value="">Selecione o Evento...</option>
                        {events.map(e => (
                            <option key={e.id} value={e.id}>{e.name}</option>
                        ))}
                    </select>
                    <select 
                        value={selectedTicket} 
                        onChange={e => setSelectedTicket(e.target.value)} 
                        className="form-input text-left text-base" 
                        disabled={!selectedEvent || loading}
                    >
                        <option value="">Selecione o Ingresso Padrão...</option>
                        {ticketCategories.map(t => (
                            <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                    </select>
                    {error && <p className="feedback-error">{error}</p>}
                    <button 
                        onClick={handleStart} 
                        disabled={isDisabled} 
                        className="btn btn-primary"
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

const SuccessScreen = ({ onCopyAndNewSearch, email }) => (
    <div className="text-center space-y-6 animate-fade-in">
        <svg className="mx-auto h-16 w-16 text-green-300" width="64" height="64" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <h2 className="text-2xl font-bold text-white">Credenciamento Realizado!</h2>
        <p className="text-white/80">O participante foi cadastrado com sucesso.</p>
        <button 
            onClick={() => onCopyAndNewSearch(email)} 
            className="w-full bg-white/20 hover:bg-white/30 text-white font-semibold py-3 px-6 rounded-xl backdrop-blur-sm border border-white/30 transition-all duration-200"
        >
            Copiar E-mail e Abrir Painel
        </button>
    </div>
);

const ConfirmationScreen = ({ initialParticipant, onCancel, session, onCredentialingSuccess }) => {
    const [participant, setParticipant] = useState(initialParticipant);
    const [loading, setLoading] = useState(false);
    const [linkCompany, setLinkCompany] = useState(false);
    const [cnpj, setCnpj] = useState('');
    const [company, setCompany] = useState(null);
    const [companyLoading, setCompanyLoading] = useState(false);
    const [companyError, setCompanyError] = useState('');
    const [emailHint, setEmailHint] = useState('');
    const [vinculo, setVinculo] = useState('');
    const [consentGiven, setConsentGiven] = useState(false);

    const handleSearchCompany = async (cnpjToSearch) => {
        setCompanyLoading(true); setCompanyError(''); setCompany(null); setVinculo('');
        try {
            const res = await fetch('/api/search-company', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ cnpj: cnpjToSearch }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message);
            setCompany(data);
            if (data.cnpj && initialParticipant.rawData.cpfPessoaResponsavel === initialParticipant.cpf.replace(/\D/g, '')) {
                setVinculo('PROPRIETÁRIO OU SÓCIO');
            }
        } catch (err) {
            setCompanyError(err.message);
        } finally { setCompanyLoading(false); }
    };

    useEffect(() => {
        if (initialParticipant && !initialParticipant.email) { setEmailHint('Atenção: E-mail é essencial. Por favor, preencha este campo.'); } 
        else { setEmailHint(''); }

        // --- ATUALIZAÇÃO PRINCIPAL AQUI: Lógica de pré-preenchimento mais robusta ---
        if (initialParticipant.source === 'sas' && initialParticipant.rawData?.ListaVinculo && initialParticipant.rawData.ListaVinculo.length > 0) {
            
            // 1. Tenta encontrar o vínculo principal
            let vinculoParaUsar = initialParticipant.rawData.ListaVinculo.find(v => v.IndPrincipal === 1);

            // 2. Se não houver principal, mas só houver UM vínculo, usa ele
            if (!vinculoParaUsar && initialParticipant.rawData.ListaVinculo.length === 1) {
                vinculoParaUsar = initialParticipant.rawData.ListaVinculo[0];
            }

            // 3. Se um vínculo foi selecionado, preenche os dados
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

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    let newValue = value;
    if (name === 'phone') newValue = formatPhone(value);
    if (name === 'name' && newValue.length > 100) newValue = newValue.slice(0, 100);
    if (name === 'email' && newValue.length > 254) newValue = newValue.slice(0, 254);
    setParticipant({ ...participant, [name]: newValue });
  };
    const handleCnpjChange = (e) => setCnpj(formatCNPJ(e.target.value));

    const handleCredentialing = async (e) => {
        e.preventDefault(); 
        setLoading(true);
        try {
            const payload = {
                ...participant, 
                company, 
                vinculo, 
                consentGiven,
                atendente: session.attendantName, 
                ticketId: session.ticketId,
                eventId: session.eventId
            };
            
            // Register in 4.events first
            const res = await fetch('/api/4events-register', {
                method: 'POST', 
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message);
            
            // Send to N8N webhook
            await fetch('/api/webhook-notify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...payload, registrationId: data.registrationId }),
            });
            
            onCredentialingSuccess(participant.email);
        } catch (err) {
            alert(`Erro no Credenciamento: ${err.message}`);
            setLoading(false);
        }
    };
    
    return (
        <form onSubmit={handleCredentialing} className="space-y-4 animate-fade-in">
            <div className="flex justify-between items-center"><h2 className="text-xl font-semibold text-gray-800">Confirme os Dados</h2><span className="text-xs font-bold text-white bg-gray-500 px-2 py-1 rounded-full">Fonte: {participant.source?.toUpperCase()}</span></div>
            <div><label htmlFor="name" className="text-sm font-medium text-gray-700">Nome Completo ou Nome Social</label><input type="text" name="name" value={participant.name} onChange={handleInputChange} className="w-full px-4 py-3 mt-1 border border-gray-300 rounded-xl shadow-sm" maxLength={100} /></div>
            <div><label htmlFor="email" className="text-sm font-medium text-gray-700">E-mail</label>{emailHint && <p className="text-xs text-red-600 mt-1">{emailHint}</p>}<input type="email" name="email" value={participant.email} onChange={handleInputChange} className={`w-full px-4 py-3 mt-1 border rounded-xl shadow-sm ${emailHint ? 'border-red-500' : 'border-gray-300'}`} maxLength={254} /></div>
            <div><label htmlFor="phone" className="text-sm font-medium text-gray-700">Telefone</label><input type="text" name="phone" value={participant.phone} onChange={handleInputChange} className="w-full px-4 py-3 mt-1 border border-gray-300 rounded-xl shadow-sm" placeholder="(99) 99999-9999" maxLength={15} /></div>
            <div className="pt-4 border-t"><label className="flex items-center space-x-2"><input type="checkbox" checked={linkCompany} onChange={() => setLinkCompany(!linkCompany)} className="h-4 w-4 rounded"/><span className="text-sm font-medium text-gray-700">Vincular a uma empresa?</span></label></div>
            {linkCompany && (<div className="space-y-4 p-4 bg-gray-50 rounded-lg"><label htmlFor="cnpj" className="text-sm font-medium text-gray-600">Informe o CNPJ</label><div className="flex space-x-2"><input id="cnpj" type="text" value={cnpj} onChange={handleCnpjChange} className="form-input flex-grow" placeholder="00.000.000/0000-00"/><button type="button" onClick={() => handleSearchCompany(cnpj)} disabled={companyLoading} className="btn btn-primary px-4 py-2 text-sm flex-shrink-0 w-auto">{companyLoading ? 'Buscando...' : 'Buscar'}</button></div>{companyError && <p className="text-sm text-red-500">{companyError}</p>}{company && (<div className="space-y-3 animate-fade-in"><div className="text-sm text-green-700 bg-green-100 p-3 rounded-md"><strong>Empresa:</strong> {company.razaoSocial}</div><div><label htmlFor="vinculo" className="text-sm font-medium text-gray-700">Vínculo com a empresa</label><select id="vinculo" value={vinculo} onChange={(e) => setVinculo(e.target.value)} className="w-full px-4 py-3 mt-1 border border-gray-300 rounded-xl shadow-sm bg-white" required><option value="" disabled>Selecione o vínculo...</option>{VINCULO_OPTIONS.map(option => (<option key={option} value={option}>{option}</option>))}</select></div></div>)}</div>)}
            <div className="pt-4 border-t"><label className="flex items-center space-x-3"><input type="checkbox" checked={consentGiven} onChange={() => setConsentGiven(!consentGiven)} className="h-5 w-5 rounded" /><span className="text-sm font-medium text-gray-700">O participante consente com a coleta e atualização de seus dados (LGPD).</span></label></div>
            <button type="submit" disabled={loading || !consentGiven} className="btn btn-success">{loading ? 'Processando...' : 'Confirmar e Credenciar'}</button>
            <button type="button" onClick={onCancel} className="btn btn-secondary mt-2">Cancelar</button>
        </form>
    );
};

export default function HomePage() {
  const { data: authSession, status } = useSession();
  const [session, setSession] = useState(null);
  const [cpf, setCpf] = useState('');
  const [participant, setParticipant] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [lastEmail, setLastEmail] = useState('');
  const [alreadyRegistered, setAlreadyRegistered] = useState(null);

  useEffect(() => {
    const savedSession = sessionStorage.getItem('credenciamento-session');
    if (savedSession) {
      setSession(JSON.parse(savedSession));
    }
  }, []);

  const handleSessionStart = (sessionData) => {
    sessionStorage.setItem('credenciamento-session', JSON.stringify(sessionData));
    setSession(sessionData);
  };

  const handleEndShift = () => {
    sessionStorage.removeItem('credenciamento-session');
    setSession(null);
    setCpf(''); setParticipant(null); setLoading(false); setError(''); setSuccess(false); setAlreadyRegistered(null);
  };

  const handleNewSearch = () => {
    setSuccess(false); setError(''); setCpf(''); setParticipant(null); setAlreadyRegistered(null);
  };
  
  const handleCopyAndOpenPanel = (email) => {
    if (!email) {
        alert('Não há e-mail para copiar.');
        handleNewSearch();
        return;
    }
    navigator.clipboard.writeText(email).then(() => {
        alert(`E-mail "${email}" copiado! Abrindo o painel...`);
        window.open('https://app.4.events/admin/cred', '4eventsCredPanel');
    }).catch(err => {
        console.error('Falha ao copiar e-mail: ', err);
        alert('Não foi possível copiar o e-mail.');
    });
    handleNewSearch();
  };

  const onCredentialingSuccess = (email) => {
    setSuccess(true);
    setLastEmail(email);
    setParticipant(null);
    setCpf('');
  };

  const handleSearch = async () => {
    setError('');
    setAlreadyRegistered(null);
    if (!validateCPF(cpf)) {
      setError('CPF inválido. Por favor, verifique o número digitado.');
      return;
    }
    setLoading(true);
    
    try {
      // Step 1: Check if already registered in 4.events
      const checkRes = await fetch('/api/4events-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cpf, eventId: session.eventId }),
      });
      const checkData = await checkRes.json();
      if (checkData.isRegistered) {
        setAlreadyRegistered(checkData.participant);
        return;
      }

      // Step 2: Search in SAS
      const sasRes = await fetch('/api/search-sas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cpf: cpf.replace(/\D/g, '') }),
      });
      
      if (sasRes.ok) {
        const sasData = await sasRes.json();
        setParticipant({ ...sasData, source: 'sas' });
        return;
      }

      // Step 3: Search in CPE
      const cpeRes = await fetch('/api/search-cpe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cpf: cpf.replace(/\D/g, '') }),
      });
      
      if (cpeRes.ok) {
        const cpeData = await cpeRes.json();
        setParticipant({ ...cpeData, source: 'cpe' });
        return;
      }

      // Step 4: No data found, open manual registration
      const fallbackUrl = process.env.NEXT_PUBLIC_FALLBACK_URL;
      window.open(fallbackUrl, '_blank');
      setError('CPF não encontrado. O cadastro manual foi aberto em uma nova aba.');
      
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Check authentication after all hooks
  if (status === 'loading') return <div>Carregando...</div>;
  if (status === 'unauthenticated') {
    return (
      <div className="app-container">
        <div className="card">
          <h1 className="card-title">Acesso Negado</h1>
          <p className="card-subtitle">Você precisa estar logado para acessar esta página.</p>
          <button onClick={() => signIn('keycloak')} className="btn btn-primary">
            Fazer Login
          </button>
        </div>
      </div>
    );
  }
  
  if (!session) {
    return <ConfigurationScreen onSessionStart={handleSessionStart} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1E67C3] to-[#0A4DA6] flex flex-col">
      <Header attendantName={session.attendantName} onEndShift={handleEndShift} />
      
      <main className="flex-1 flex items-center justify-center px-4 py-8">
          <div className="w-full max-w-2xl">
            <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-8">
              <h1 className="text-2xl font-semibold text-white text-center mb-2">
                {session.eventName}
              </h1>
              <p className="text-white/80 text-center mb-8">
                Digite o CPF do participante para iniciar
              </p>
              
              {success ? (
                <SuccessScreen onNewSearch={handleNewSearch} onCopyAndNewSearch={handleCopyAndOpenPanel} email={lastEmail} />
              ) : alreadyRegistered ? (
                <div className="text-center space-y-6 animate-fade-in">
                  <h2 className="text-2xl font-bold text-orange-300">Participante Já Inscrito!</h2>
                  <p className="text-white/80">Este CPF já consta na lista de inscritos do evento.</p>
                  <div className="text-left bg-white/10 border border-white/20 backdrop-blur-sm p-4 rounded-xl">
                    <p className="text-white"><strong>Nome:</strong> {alreadyRegistered.name}</p>
                    <p className="text-white"><strong>E-mail:</strong> {alreadyRegistered.email}</p>
                  </div>
                  <button 
                    onClick={() => handleCopyAndOpenPanel(alreadyRegistered.email)} 
                    className="w-full bg-white/20 hover:bg-white/30 text-white font-semibold py-3 px-6 rounded-xl backdrop-blur-sm border border-white/30 transition-all duration-200"
                  >
                    Copiar E-mail e Abrir Painel
                  </button>
                </div>
              ) : participant ? (
                <ConfirmationScreen
                  initialParticipant={participant}
                  onCancel={handleNewSearch}
                  session={session}
                  onCredentialingSuccess={onCredentialingSuccess}
                />
              ) : (
                <InitialScreen onSearch={handleSearch} cpf={cpf} setCpf={setCpf} loading={loading} error={error} />
              )}
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="w-full p-4 text-center text-white/60 text-sm">
          © {new Date().getFullYear()} Sebrae - Credenciamento 4Events
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
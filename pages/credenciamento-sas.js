import { useState, useEffect } from 'react';
import {
  validateCPF,
  formatCPF,
  formatCNPJ,
  formatPhone,
  unformatPhone,
} from '../utils/validators';
import { getCurrentDateTimeGMT4 } from '../lib/utils/timezone';
import packageJson from '../package.json';
import { useSession } from 'next-auth/react';

// --- LISTA DE OPÇÕES (EDITÁVEL) ---
const VINCULO_OPTIONS = [
  'PROPRIETÁRIO OU SÓCIO',
  'CONTADOR',
  'REPRESENTANTE',
  'FUNCIONÁRIO',
  'RESPONSÁVEL',
];

// --- COMPONENTES DA UI ---
const Header = ({ attendantName, onEndShift }) => (
  <header className="w-full p-4 flex justify-between items-center">
    <img
      src="/sebrae-logo-white.png"
      alt="Sebrae"
      className="h-10 transition-transform hover:scale-105"
    />
    <div className="text-center">
      <span className="text-white text-sm font-medium hidden sm:block">
        Atendente: {attendantName}
      </span>
    </div>
    <button
      onClick={onEndShift}
      className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-xl backdrop-blur-sm border border-white/20 transition-all duration-300 text-sm font-medium"
    >
      Encerrar Turno
    </button>
  </header>
);

const ConfigurationScreen = ({ onSessionStart }) => {
  const [eventCode, setEventCode] = useState('');
  const [eventTitle, setEventTitle] = useState('');
  const [searchMode, setSearchMode] = useState('code'); // 'code' | 'name'
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
      year: 'numeric',
    });
  };

  const handleSearchEvent = async () => {
    setError('');
    // Validar inputs conforme modo
    if (searchMode === 'code') {
      if (!eventCode) {
        setError('Digite o código do evento SAS');
        return;
      }
      // Busca por código usa API Selecionar existente em /api/fetch-sas-event (sem período obrigatório)
      setLoading(true);
      try {
        const res = await fetch(`/api/fetch-sas-event?codEvento=${encodeURIComponent(eventCode)}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Erro ao buscar evento por código');
        // O retorno atual é { message, evento, source }
        if (!data?.evento) throw new Error('Evento não encontrado');

        // Add source information to event
        const eventoComOrigem = {
          ...data.evento,
          _dataSource: data.source || 'unknown',
          _sourceMessage: data.message || '',
        };

        setEvents([eventoComOrigem]);
        setSelectedEvent(eventoComOrigem);

        // Show success message with source info
        const sourceText =
          data.source === 'cache'
            ? '✅ Evento carregado do banco de dados local (cache)'
            : '✅ Evento carregado da API do SAS';
        console.log(sourceText);
      } catch (err) {
        setError(err.message);
        setEvents([]);
        setSelectedEvent(null);
      } finally {
        setLoading(false);
      }
      return;
    }

    if (searchMode === 'name') {
      if (!eventTitle) {
        setError('Digite o título do evento');
        return;
      }
      if (!startDate || !endDate) {
        setError('Selecione o período de busca');
        return;
      }
      setLoading(true);
      try {
        const periodoInicial = formatDateToBR(startDate);
        const periodoFinal = formatDateToBR(endDate);
        const url = `/api/sas-events?tituloEvento=${encodeURIComponent(eventTitle)}&periodoInicial=${periodoInicial}&periodoFinal=${periodoFinal}`;
        const response = await fetch(url);
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Erro ao buscar evento por nome');
        if (!Array.isArray(data) || data.length === 0) {
          setError('Nenhum evento encontrado para o nome e período informados');
          setEvents([]);
          setSelectedEvent(null);
          return;
        }
        setEvents(data);
        setSelectedEvent(data[0]);
      } catch (err) {
        setError(err.message);
        setEvents([]);
        setSelectedEvent(null);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleStart = async () => {
    if (!selectedEvent) {
      setError('Selecione um evento válido.');
      return;
    }
    if (!session?.user?.name) {
      setError('Usuário não autenticado.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Sincronizar evento SAS com banco local automaticamente (minimal logging)
      const syncResponse = await fetch('/api/sync-sas-event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventDetails: selectedEvent }),
      });

      const syncData = await syncResponse.json();

      if (!syncResponse.ok) {
        console.error('Erro na sincronização:', syncData);
      } else {
        console.log('Evento sincronizado com sucesso');
      }

      // Continuar com o fluxo normal
      onSessionStart({
        attendantName: session.user.name,
        eventId: selectedEvent.id,
        eventName: selectedEvent.nome,
        eventDetails: selectedEvent,
        localEventId: syncData?.event?.id, // ID do evento no banco local (se sincronizado)
      });
    } catch (err) {
      console.error('Erro na sincronização do evento:', err);
      // Mesmo com erro na sincronização, permite continuar
      console.warn('Continuando sem sincronização local');
      onSessionStart({
        attendantName: session.user.name,
        eventId: selectedEvent.id,
        eventName: selectedEvent.nome,
        eventDetails: selectedEvent,
      });
    } finally {
      setLoading(false);
    }
  };

  const isDisabled = !selectedEvent || loading || !session?.user;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1E67C3] to-[#0A4DA6] flex flex-col">
      {/* Header com Logo */}
      <header className="w-full p-4 flex justify-between items-center">
        <button
          onClick={handleBackToMenu}
          className="hover:opacity-80 transition-opacity focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-transparent rounded"
          title="Voltar ao início"
        >
          <img
            src="/sebrae-logo-white.png"
            alt="Sebrae - Voltar ao início"
            className="h-10 transition-transform hover:scale-105"
          />
        </button>
        <div className="text-center">
          <span className="text-white text-sm font-medium hidden sm:block">
            Usuário: {session?.user?.name || session?.user?.username || 'admin'}
          </span>
        </div>
      </header>

      {/* Conteúdo Principal */}
      <main className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-2xl">
          <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-8">
            <h1 className="text-2xl font-semibold text-white text-center mb-2">
              Configuração do Credenciamento SAS
            </h1>
            <p className="text-white/80 text-center mb-8">
              Configure sua sessão para iniciar o credenciamento
            </p>

            {/* Nome do usuário logado */}
            <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-4 mb-6">
              <p className="text-white text-sm">
                Usuário: <strong>{session?.user?.name || 'Não autenticado'}</strong>
              </p>
            </div>

            <div className="space-y-6">
              {/* Toggle de modo de busca */}
              <div className="flex flex-col gap-2">
                <label className="text-white/80 text-sm">Tipo de Busca</label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setSearchMode('code')}
                    className={`py-3 rounded-xl text-sm font-medium border transition ${
                      searchMode === 'code'
                        ? 'bg-blue-500 text-white border-blue-400'
                        : 'bg-white/10 text-white border-white/20 hover:bg-white/20'
                    }`}
                    disabled={loading}
                  >
                    Por Código
                  </button>
                  <button
                    type="button"
                    onClick={() => setSearchMode('name')}
                    className={`py-3 rounded-xl text-sm font-medium border transition ${
                      searchMode === 'name'
                        ? 'bg-blue-500 text-white border-blue-400'
                        : 'bg-white/10 text-white border-white/20 hover:bg-white/20'
                    }`}
                    disabled={loading}
                  >
                    Por Nome
                  </button>
                </div>
              </div>

              {searchMode === 'code' ? (
                <div>
                  <label htmlFor="eventCode" className="block text-sm font-medium text-white mb-2">
                    Código do Evento SAS
                  </label>
                  <input
                    id="eventCode"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={eventCode}
                    onChange={(e) => setEventCode(e.target.value)}
                    className="w-full bg-white/10 text-white placeholder-white/50 py-3 px-4 rounded-xl backdrop-blur-sm border border-white/20 focus:outline-none focus:ring-2 focus:ring-white/30 text-lg font-medium"
                    placeholder="Digite o código do evento"
                    maxLength={12}
                    disabled={loading}
                  />
                </div>
              ) : (
                <>
                  <div>
                    <label
                      htmlFor="eventTitle"
                      className="block text-sm font-medium text-white mb-2"
                    >
                      Nome do Evento
                    </label>
                    <input
                      id="eventTitle"
                      type="text"
                      value={eventTitle}
                      onChange={(e) => setEventTitle(e.target.value)}
                      className="w-full bg-white/10 text-white placeholder-white/50 py-3 px-4 rounded-xl backdrop-blur-sm border border-white/20 focus:outline-none focus:ring-2 focus:ring-white/30 text-lg font-medium"
                      placeholder="Digite parte do nome do evento"
                      disabled={loading}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label
                        htmlFor="startDate"
                        className="block text-sm font-medium text-white mb-2"
                      >
                        Data Inicial
                      </label>
                      <input
                        id="startDate"
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="w-full bg-white/10 text-white py-3 px-4 rounded-xl backdrop-blur-sm border border-white/20 focus:outline-none focus:ring-2 focus:ring-white/30"
                        disabled={loading}
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="endDate"
                        className="block text-sm font-medium text-white mb-2"
                      >
                        Data Final
                      </label>
                      <input
                        id="endDate"
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="w-full bg-white/10 text-white py-3 px-4 rounded-xl backdrop-blur-sm border border-white/20 focus:outline-none focus:ring-2 focus:ring-white/30"
                        disabled={loading}
                      />
                    </div>
                  </div>
                  {/* Lista de resultados quando vierem vários eventos */}
                  {Array.isArray(events) && events.length > 1 && (
                    <div className="mt-4 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-3 max-h-60 overflow-auto">
                      <p className="text-white/80 text-sm mb-2">Selecione um evento encontrado</p>
                      <ul className="space-y-2">
                        {events.map((ev) => (
                          <li key={ev.id}>
                            <button
                              type="button"
                              onClick={() => setSelectedEvent(ev)}
                              className={`w-full text-left px-3 py-2 rounded-lg transition border ${
                                selectedEvent?.id === ev.id
                                  ? 'bg-blue-500/80 text-white border-blue-400'
                                  : 'bg-white/5 text-white border-white/10 hover:bg-white/15'
                              }`}
                            >
                              <div className="font-medium">{ev.nome}</div>
                              <div className="text-xs text-white/70">
                                {ev.cidade || 'Cidade não informada'} • {ev.modalidade || '—'}
                              </div>
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              )}

              {(() => {
                // Habilitar o botão conforme o modo selecionado
                const missingRequired =
                  searchMode === 'code' ? !eventCode : !eventTitle || !startDate || !endDate;
                const isSearchDisabled = loading || missingRequired;
                return (
                  <button
                    onClick={handleSearchEvent}
                    disabled={isSearchDisabled}
                    className={`w-full mt-6 py-3 px-4 rounded-xl font-medium transition-all duration-300 ${
                      loading
                        ? 'bg-white/20 text-white cursor-wait border border-white/20'
                        : isSearchDisabled
                          ? 'bg-white/5 text-white/40 cursor-not-allowed border border-white/10'
                          : 'bg-white/20 hover:bg-white/30 text-white border border-white/20'
                    }`}
                  >
                    {loading ? 'Buscando...' : 'Buscar Evento'}
                  </button>
                );
              })()}
            </div>

            {selectedEvent && (
              <div className="mt-6 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-white">Evento Selecionado:</h3>
                  {selectedEvent._dataSource && (
                    <span
                      className={`text-xs px-2 py-1 rounded-full font-medium ${
                        selectedEvent._dataSource === 'cache'
                          ? 'bg-blue-500/20 text-blue-200 border border-blue-400/30'
                          : 'bg-green-500/20 text-green-200 border border-green-400/30'
                      }`}
                      title={
                        selectedEvent._dataSource === 'cache'
                          ? 'Dados carregados do banco local (mais rápido)'
                          : 'Dados carregados da API do SAS'
                      }
                    >
                      {selectedEvent._dataSource === 'cache' ? '💾 Database Local' : '🌐 API SAS'}
                    </span>
                  )}
                </div>
                <p className="text-white font-medium mb-3">{selectedEvent.nome}</p>
                <div className="space-y-2 text-sm text-white/80">
                  <p>
                    <strong>Código:</strong> {selectedEvent.id}
                  </p>
                  <p>
                    <strong>Data/Hora:</strong>{' '}
                    {selectedEvent.dataEvento
                      ? new Date(selectedEvent.dataEvento).toLocaleString('pt-BR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : 'Data não informada'}
                  </p>
                  <p>
                    <strong>Local:</strong> {selectedEvent.local || 'Local não informado'}
                  </p>
                  <p>
                    <strong>Modalidade:</strong> {selectedEvent.modalidade || 'Não informado'}
                  </p>
                  <p>
                    <strong>Instrumento:</strong> {selectedEvent.instrumento || 'Não informado'}
                  </p>
                  <p>
                    <strong>Carga Horária:</strong> {selectedEvent.cargaHoraria}h
                  </p>
                  <p>
                    <strong>Participantes:</strong> {selectedEvent.minParticipante} a{' '}
                    {selectedEvent.maxParticipante}
                  </p>
                  <p>
                    <strong>Vagas Disponíveis:</strong> {selectedEvent.vagasDisponiveis}
                  </p>
                  <p>
                    <strong>Gratuito:</strong> {selectedEvent.gratuito ? 'Sim' : 'Não'}
                  </p>
                  {selectedEvent.preco > 0 && (
                    <p>
                      <strong>Preço:</strong> R$ {selectedEvent.preco.toFixed(2)}
                    </p>
                  )}
                  <p>
                    <strong>Situação:</strong> {selectedEvent.situacao}
                  </p>
                  {selectedEvent.projeto && (
                    <p>
                      <strong>Projeto:</strong> {selectedEvent.projeto}
                    </p>
                  )}
                </div>
              </div>
            )}

            {error && (
              <div className="mt-4 bg-red-500/20 backdrop-blur-sm border border-red-400/30 rounded-xl p-4">
                <p className="text-red-200 text-sm">{error}</p>
              </div>
            )}

            <button
              onClick={handleStart}
              disabled={!selectedEvent || loading || !session?.user}
              className={`w-full mt-6 py-3 px-4 rounded-xl font-medium transition-all duration-300 ${
                !selectedEvent || loading || !session?.user
                  ? 'bg-white/5 text-white/40 cursor-not-allowed border border-white/10'
                  : 'bg-blue-500/80 hover:bg-blue-600/80 text-white border border-blue-400/30'
              }`}
            >
              {loading ? 'Carregando...' : 'Iniciar Turno'}
            </button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full p-4 text-center text-white/60 text-sm">
        © {new Date().getFullYear()} Sebrae - Sistema de Credenciamento SAS
      </footer>

      {/* Loading Overlay */}
      {loading && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-white/20 border-t-white"></div>
        </div>
      )}
    </div>
  );
};

const InitialScreen = ({ onSearch, cpf, setCpf, loading, error }) => {
  const handleCpfChange = (e) => {
    setCpf(formatCPF(e.target.value));
  };
  return (
    <div className="space-y-6">
      <div>
        <label htmlFor="cpf" className="block text-sm font-medium text-white mb-2">
          CPF do Participante
        </label>
        <input
          id="cpf"
          type="text"
          value={cpf}
          onChange={handleCpfChange}
          className="w-full bg-white/10 text-white placeholder-white/50 py-3 px-4 rounded-xl backdrop-blur-sm border border-white/20 focus:outline-none focus:ring-2 focus:ring-white/30 text-lg font-medium"
          placeholder="000.000.000-00"
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
        className={`w-full py-3 px-4 rounded-xl font-medium transition-all duration-300 ${
          loading || !cpf
            ? 'bg-white/5 text-white/40 cursor-not-allowed border border-white/10'
            : 'bg-blue-500/80 hover:bg-blue-600/80 text-white border border-blue-400/30'
        }`}
      >
        {loading ? 'Buscando...' : 'Buscar Participante'}
      </button>
      {error && <p className="feedback-error">{error}</p>}
    </div>
  );
};

const ParticipantForm = ({ onSubmit, loading, initialParticipant, onCancel }) => {
  const [formData, setFormData] = useState(
    initialParticipant || {
      name: '',
      email: '',
      phone: '',
      cpf: '',
      consentGiven: false,
    }
  );
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
    if (
      initialParticipant?.source === 'sas' &&
      initialParticipant.rawData?.ListaVinculo?.length > 0
    ) {
      let vinculoParaUsar = initialParticipant.rawData.ListaVinculo.find(
        (v) => v.IndPrincipal === 1
      );

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

    setFormData((prev) => ({
      ...prev,
      [name]: newValue,
    }));

    // Limpar erro do campo quando ele é modificado
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
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
      if (
        data.cnpj &&
        initialParticipant.rawData?.cpfPessoaResponsavel ===
          initialParticipant.cpf.replace(/\D/g, '')
      ) {
        setVinculo('PROPRIETÁRIO OU SÓCIO');
      }
    } catch (err) {
      setCompanyError(err.message);
    } finally {
      setCompanyLoading(false);
    }
  };

  const handleCPFChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      cpf: formatCPF(e.target.value),
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
    <form onSubmit={handleSubmit} className="space-y-5 animate-fade-in">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-white">Confirme os Dados</h2>
        <span className="text-xs font-semibold text-white/90 bg-white/10 border border-white/20 px-2 py-1 rounded-full">
          Fonte:{' '}
          {(formData.source || formData.dataOrigin || formData.fromSystem || 'cpe').toUpperCase()}
        </span>
      </div>

      <div>
        <label htmlFor="name" className="text-sm font-medium text-white">
          Nome Completo ou Nome Social
        </label>
        <input
          id="name"
          type="text"
          name="name"
          value={formData.name}
          onChange={handleChange}
          className="w-full bg-white/10 text-white placeholder-white/50 px-4 py-3 mt-1 rounded-xl border border-white/20 focus:outline-none focus:ring-2 focus:ring-white/30"
        />
      </div>

      <div>
        <label htmlFor="email" className="text-sm font-medium text-white">
          E-mail
        </label>
        {emailHint && <p className="text-xs text-amber-300 mt-1">{emailHint}</p>}
        <input
          id="email"
          type="email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          className={`w-full px-4 py-3 mt-1 rounded-xl border focus:outline-none focus:ring-2 focus:ring-white/30 bg-white/10 text-white placeholder-white/50 ${
            emailHint ? 'border-amber-300' : 'border-white/20'
          }`}
        />
      </div>

      <div>
        <label htmlFor="phone" className="text-sm font-medium text-white">
          Telefone
        </label>
        <input
          id="phone"
          type="text"
          name="phone"
          value={formData.phone}
          onChange={handleChange}
          className="w-full px-4 py-3 mt-1 rounded-xl border border-white/20 bg-white/10 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/30"
          placeholder="(99) 99999-9999"
          maxLength={15}
        />
      </div>

      <div className="pt-4 border-t border-white/10">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={linkCompany}
            onChange={() => setLinkCompany(!linkCompany)}
            className="h-4 w-4 rounded accent-blue-500"
          />
          <span className="text-sm font-medium text-white">Vincular a uma empresa?</span>
        </label>
      </div>

      {linkCompany && (
        <div className="space-y-4 p-4 bg-white/5 border border-white/10 rounded-xl">
          <label htmlFor="cnpj" className="text-sm font-medium text-white/80">
            Informe o CNPJ
          </label>
          <div className="flex gap-2">
            <input
              id="cnpj"
              type="text"
              value={cnpj}
              onChange={(e) => setCnpj(formatCNPJ(e.target.value))}
              className="flex-grow bg-white/10 text-white placeholder-white/50 px-4 py-3 rounded-xl border border-white/20 focus:outline-none focus:ring-2 focus:ring-white/30"
              placeholder="00.000.000/0000-00"
            />
            <button
              type="button"
              onClick={() => handleSearchCompany(cnpj)}
              disabled={companyLoading}
              className={`px-4 py-3 text-sm rounded-xl border transition flex-shrink-0 ${
                companyLoading
                  ? 'bg-white/20 text-white cursor-wait border-white/20'
                  : 'bg-blue-500/80 hover:bg-blue-600/80 text-white border-blue-400/30'
              }`}
            >
              {companyLoading ? 'Buscando...' : 'Buscar'}
            </button>
          </div>
          {companyError && <p className="text-sm text-red-200">{companyError}</p>}
          {company && (
            <div className="space-y-3 animate-fade-in">
              <div className="text-sm text-green-100 bg-green-500/20 border border-green-400/30 p-3 rounded-md">
                <strong>Empresa:</strong> {company.razaoSocial}
              </div>
              <div>
                <label htmlFor="vinculo" className="text-sm font-medium text-white">
                  Vínculo com a empresa
                </label>
                <select
                  id="vinculo"
                  value={vinculo}
                  onChange={(e) => setVinculo(e.target.value)}
                  className="w-full px-4 py-3 mt-1 rounded-xl border border-white/20 bg-white/10 text-white focus:outline-none focus:ring-2 focus:ring-white/30"
                  required
                >
                  <option className="bg-[#0A4DA6]" value="" disabled>
                    Selecione o vínculo...
                  </option>
                  {VINCULO_OPTIONS.map((option) => (
                    <option className="bg-[#0A4DA6]" key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="pt-4 border-t border-white/10">
        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            name="consentGiven"
            checked={formData.consentGiven}
            onChange={handleChange}
            className="h-5 w-5 rounded accent-blue-500"
          />
          <span className="text-sm font-medium text-white">
            O participante consente com a coleta e atualização de seus dados (LGPD).
          </span>
        </label>
        {errors.consent && <p className="text-red-200 text-sm mt-1">{errors.consent}</p>}
      </div>

      <div className="flex flex-col space-y-2">
        <button
          type="submit"
          disabled={loading || !formData.consentGiven}
          className={`w-full py-3 rounded-xl font-medium border transition ${
            loading || !formData.consentGiven
              ? 'bg-white/5 text-white/40 cursor-not-allowed border-white/10'
              : 'bg-blue-500/80 hover:bg-blue-600/80 text-white border-blue-400/30'
          }`}
        >
          {loading ? 'Processando...' : 'Confirmar e Credenciar'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="w-full py-3 rounded-xl font-medium border transition bg-white/10 hover:bg-white/20 text-white border-white/20"
        >
          Nova Pesquisa
        </button>
      </div>
    </form>
  );
};

const SuccessScreen = ({ onNewRegistration }) => (
  <div className="text-center space-y-6">
    <svg
      className="mx-auto h-16 w-16 text-green-400"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
    <h2 className="text-2xl font-bold text-white">Participante Credenciado!</h2>
    <p className="text-white/80">O participante foi registrado com sucesso no sistema.</p>
    <button
      onClick={onNewRegistration}
      className="bg-blue-500/80 hover:bg-blue-600/80 text-white py-3 px-6 rounded-xl backdrop-blur-sm border border-blue-400/30 transition-all duration-300 font-medium"
    >
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
      // Montar dados consolidados com TODOS os campos do formulário
      const participantData = {
        name: formData.name,
        email: formData.email || '',
        phone: unformatPhone(formData.phone) || '', // somente dígitos
        cpf: formData.cpf,
        source: formData.source || participant?.source || 'manual',

        // Campos adicionais que podem vir do formulário
        birthDate: formData.birthDate || participant?.birthDate || null,
        gender: formData.gender || participant?.gender || null,
        education: formData.education || participant?.education || null,
        profession: formData.profession || participant?.profession || null,
        position: formData.position || formData.cargo || participant?.position || null,
        address: formData.address || participant?.address || null,

        // Campos específicos do SAS
        CodParceiro: participant?.rawData?.CodParceiro || '',
      };

      // Detect if any data was changed during credentialing
      const detectDataChanges = () => {
        if (!participant) return false; // New participant, no original data to compare

        // Compare key fields that might have been edited
        const originalName = participant.name || '';
        const originalEmail = participant.email || '';
        const originalPhone = unformatPhone(participant.phone) || '';

        const formName = formData.name || '';
        const formEmail = formData.email || '';
        const formPhone = unformatPhone(formData.phone) || '';

        // Check if any field was modified
        const nameChanged = originalName !== formName;
        const emailChanged = originalEmail !== formEmail;
        const phoneChanged = originalPhone !== formPhone;

        return nameChanged || emailChanged || phoneChanged;
      };

      const teveMudanca = detectDataChanges();

      const webhookData = {
        participant: participantData,
        event: session.eventDetails,
        attendant: { name: session.attendantName },
        source: participantData.source,
        teve_mudanca: teveMudanca ? 'sim' : 'nao',
        company: formData.company
          ? {
              cnpj: formData.company.cnpj || '',
              razaoSocial: formData.company.razaoSocial || formData.company.razao_social || '',
              nomeFantasia: formData.company.nomeFantasia || formData.company.nome_fantasia || '',
              telefone: formData.company.telefone ? unformatPhone(formData.company.telefone) : '',
              email: formData.company.email || '',
              endereco: formData.company.endereco || null,
            }
          : null,
        companyRelation: formData.vinculo || formData.cargo || null,
        registrationTimestamp: getCurrentDateTimeGMT4(), // Usar GMT-4 (Amazonas)
      };

      // 2.5) DUPLICATE CHECK: Already performed in handleSearch
      // Users who reach this point either:
      // a) Don't have a previous check-in, OR
      // b) Explicitly chose to proceed despite duplicate warning
      // Keep verification for safety, but now as secondary check
      try {
        const checkRes = await fetch('/api/check-existing-checkin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            cpf: formData.cpf.replace(/\D/g, ''),
            eventId: session.localEventId || session.eventDetails.id,
          }),
        });

        if (checkRes.ok) {
          const checkData = await checkRes.json();

          if (checkData.alreadyCheckedIn) {
            console.log('[SUBMIT] Duplicate confirmed (already warned in search), proceeding...');
            // User was already warned during handleSearch and chose to proceed
            // No need to ask again, just log for tracking
          }
        }
      } catch (checkError) {
        console.warn('Erro ao verificar credenciamento existente:', checkError);
        // Don't block flow if verification fails
      }

      // 3) Mostrar sucesso imediatamente e disparar processos em background
      setSuccess(true);
      setLoading(false);

      // Disparar em background (sem aguardar)
      // a) Enviar dados para o webhook de check-in (N8N)
      fetch('/api/webhook-checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(webhookData),
      })
        .then(async (r) => {
          if (!r.ok) {
            const t = await r.text().catch(() => '');
            console.error('Falha ao enviar webhook de check-in:', r.status, r.statusText, t);
          }
        })
        .catch((err) => console.error('Erro no envio do webhook de check-in:', err));

      // b) Registrar credenciamento no banco local com dados da empresa
      const localResponse = await fetch('/api/register-local-credenciamento', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          participant: participantData,
          company: formData.company || null, // Incluir dados da empresa
          eventDetails: session.eventDetails,
          attendantName: session.attendantName,
          localEventId: session.localEventId,
        }),
      });

      const localData = await localResponse.json();

      if (!localResponse.ok) {
        console.error('Erro ao registrar no banco local:', localData?.message);
        // Continue mesmo com erro no local - não bloqueia o fluxo
      } else {
        // Verificar se já tinha check-in HOJE
        if (localData.warning === 'duplicate_checkin_today' && !localData.isNewCheckIn) {
          const checkInDate = new Date(localData.previousCheckIn.date);
          const formattedDate = checkInDate.toLocaleDateString('pt-BR');
          const formattedTime = checkInDate.toLocaleTimeString('pt-BR', {
            hour: '2-digit',
            minute: '2-digit',
          });

          const shouldContinue = confirm(
            `⚠️ ATENÇÃO: PARTICIPANTE JÁ FEZ CHECK-IN HOJE!\n\n` +
              `📋 Nome: ${participantData.name}\n` +
              `📅 Check-in anterior: ${formattedDate} às ${formattedTime}\n` +
              `👤 Atendente: ${localData.previousCheckIn.attendant}\n\n` +
              `O check-in foi atualizado. Clique OK para continuar.`
          );

          if (!shouldContinue) {
            setLoading(false);
            return; // Cancela se usuário não quiser continuar
          }
        }
      }
    } catch (error) {
      // Somente erros de preparação (antes de disparar background) devem ser mostrados
      setLoading(false);
      alert('Erro ao credenciar participante: ' + error.message);
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
      const cleanCpf = cpf.replace(/\D/g, '');

      // STEP 1: Search in local database first (PRIORITY)
      try {
        const localSearchRes = await fetch('/api/search-local-participant', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            cpf: cleanCpf,
            eventId:
              session.localEventId ||
              session.eventDetails?.id ||
              session.eventDetails?.codevento_sas,
          }),
        });

        if (localSearchRes.ok) {
          const localData = await localSearchRes.json();

          if (localData.found && localData.isEnrolled) {
            console.log('[SEARCH] Participante encontrado no banco local');

            // STEP 1.1: If already checked in, show warning IMMEDIATELY
            if (localData.hasCheckIn) {
              const checkInDate = new Date(localData.checkInData.data_check_in);
              const formattedDate = checkInDate.toLocaleDateString('pt-BR');
              const formattedTime = checkInDate.toLocaleTimeString('pt-BR', {
                hour: '2-digit',
                minute: '2-digit',
              });

              const shouldContinue = confirm(
                `⚠️ ATENÇÃO: PARTICIPANTE JÁ CREDENCIADO!\n\n` +
                  `📋 Nome: ${localData.participant.name}\n` +
                  `📅 Data: ${formattedDate} às ${formattedTime}\n` +
                  `👤 Por: ${localData.checkInData.responsavel_credenciamento}\n\n` +
                  `Este participante já foi credenciado anteriormente neste evento.\n\n` +
                  `Deseja prosseguir mesmo assim para ver os dados?`
              );

              if (!shouldContinue) {
                setLoading(false);
                return; // Cancel if user doesn't want to proceed
              }
            }

            // Use local data (show form with local database information)
            setParticipant({
              ...localData.participant,
              cpf: formatCPF(cpf),
              source: 'local', // Mark as coming from local database
            });
            setLoading(false);
            return; // Exit - data found in local database
          }
        }
      } catch (localError) {
        console.warn('[SEARCH] Erro ao buscar no banco local:', localError);
        // Continue to external search if local search fails
      }

      // STEP 2: Not found locally, search external sources (SAS/CPE)
      console.log('[SEARCH] Participante não encontrado localmente, buscando em SAS/CPE...');

      const searchRes = await fetch('/api/search-participant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cpf: cleanCpf }),
      });

      if (!searchRes.ok && searchRes.status !== 404) {
        throw new Error('Erro ao buscar dados do participante');
      }

      const searchData = await searchRes.json();

      // If participant found in external sources, show data in form
      if (searchData) {
        setParticipant({
          ...searchData,
          cpf: formatCPF(cpf),
          source: searchData.source || searchData.dataOrigin || searchData.fromSystem || 'cpe',
        });
      } else {
        // Not found anywhere
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
    <div className="min-h-screen bg-gradient-to-br from-[#1E67C3] to-[#0A4DA6] flex flex-col">
      <Header attendantName={session.attendantName} onEndShift={handleEndShift} />

      <main className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-2xl">
          <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-8">
            {/* Informações do Evento */}
            <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-4 mb-6">
              <h2 className="text-lg font-semibold text-white mb-2">{session.eventName}</h2>
              <div className="space-y-1 text-sm text-white/80">
                <p>
                  <strong>Código:</strong> {session.eventId}
                </p>
                {session.eventDetails?.dataEvento && (
                  <p>
                    <strong>Data/Hora:</strong>{' '}
                    {new Date(session.eventDetails.dataEvento).toLocaleString('pt-BR', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                )}
                {session.eventDetails?.local && (
                  <p>
                    <strong>Local:</strong> {session.eventDetails.local}
                  </p>
                )}
                {session.eventDetails?.modalidade && (
                  <p>
                    <strong>Modalidade:</strong> {session.eventDetails.modalidade}
                  </p>
                )}
                {session.eventDetails?.vagasDisponiveis !== undefined && (
                  <p>
                    <strong>Vagas Disponíveis:</strong> {session.eventDetails.vagasDisponiveis}
                  </p>
                )}
              </div>
            </div>

            <h1 className="text-2xl font-semibold text-white text-center mb-2">
              Credenciamento SAS
            </h1>
            <p className="text-white/80 text-center mb-8">
              Registre um novo participante diretamente no sistema
            </p>

            {success ? (
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
      </main>

      {/* Footer */}
      <footer className="w-full p-4 text-center text-white/60 text-sm">
        © {new Date().getFullYear()} UTIC - Sebrae RR - Sistema de Credenciamento | v
        {packageJson.version}
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

import { useState, useEffect } from 'react';
import {
  validateCPF,
  formatCPF,
  formatCNPJ,
  formatPhone,
  unformatPhone,
} from '../utils/validators';

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
        // O retorno atual é { message, evento, debug }
        if (!data?.evento) throw new Error('Evento não encontrado');
        setEvents([data.evento]);
        setSelectedEvent(data.evento);
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
      // Sincronizar evento SAS com banco local automaticamente
      console.log('Sincronizando evento SAS com banco local...');
      const syncResponse = await fetch('/api/sync-sas-event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventDetails: selectedEvent }),
      });

      const syncData = await syncResponse.json();

      if (!syncResponse.ok) {
        console.error('Erro na sincronização:', syncData);
        // Não bloqueia o fluxo - apenas loga o erro
        console.warn('Evento não foi sincronizado, mas continuando com credenciamento SAS normal');
      } else {
        console.log('Evento sincronizado:', syncData.action, syncData.event?.id);
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
                <h3 className="font-semibold text-white mb-2">Evento Selecionado:</h3>
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
      // 1) Buscar dados completos do participante (rápido e necessário para montar payload)
      const searchRes = await fetch('/api/search-participant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cpf: formData.cpf.replace(/\D/g, '') }),
      });

      if (!searchRes.ok && searchRes.status !== 404) {
        throw new Error('Erro ao buscar dados do participante');
      }

      const searchData = await searchRes.json();

      // 2) Montar dados consolidados
      const participantData = {
        ...searchData,
        name: formData.name,
        email: formData.email,
        phone: unformatPhone(formData.phone), // somente dígitos
        cpf: formData.cpf,
        source: formData.source || searchData?.source || 'manual',
        CodParceiro: searchData?.source === 'sas' ? searchData?.rawData?.CodParceiro || '' : '',
      };

      const webhookData = {
        participant: participantData,
        event: session.eventDetails,
        attendant: { name: session.attendantName },
        source: participantData.source,
        company: formData.company
          ? {
              ...formData.company,
              telefone: formData.company.telefone
                ? unformatPhone(formData.company.telefone)
                : formData.company.telefone,
            }
          : null,
        companyRelation: formData.vinculo || null,
        registrationTimestamp: new Date().toISOString(),
      };

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

      // b) Registrar credenciamento no banco local (background, não bloqueante)
      fetch('/api/register-local-credenciamento', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          participant: participantData,
          eventDetails: session.eventDetails,
          attendantName: session.attendantName,
          localEventId: session.localEventId,
        }),
      })
        .then(async (r) => {
          const body = await r.json().catch(() => ({}));
          if (!r.ok) {
            console.error(
              'Erro ao registrar no banco local (background):',
              body?.message || `${r.status} ${r.statusText}`
            );
          } else {
            console.log('Credenciamento registrado no banco local (background):', body?.message);
          }
        })
        .catch((err) => console.error('Erro na API local (background):', err));
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
      // Primeiro, buscar dados do participante no SAS
      const searchRes = await fetch('/api/search-participant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cpf: cpf.replace(/\D/g, '') }),
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
          source: searchData.source || searchData.dataOrigin || searchData.fromSystem || 'cpe',
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
}

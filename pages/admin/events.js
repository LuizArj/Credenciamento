import { useState } from 'react';
import { useRouter } from 'next/router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AdminLayout from '../../components/AdminLayout';
import { withAdminProtection } from '../../components/withAdminProtection';

const EventsManagement = () => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    date: '',
    location: '',
    capacity: '',
    modalidade: '',
    tipoEvento: '',
    publico: '',
    status: 'active',
    publicoAlvo: '',
    gerente: '',
    coordenador: '',
    solucao: '',
    unidade: '',
    tipoAcao: ''
  });

  // Buscar eventos
  const { data: events, isLoading, error } = useQuery({
    queryKey: ['events'],
    queryFn: async () => {
      const response = await fetch('/api/admin/events-management');
      if (!response.ok) {
        throw new Error('Falha ao carregar eventos');
      }
      return response.json();
    }
  });

  // Criar evento
  const createEventMutation = useMutation({
    mutationFn: async (eventData) => {
      const response = await fetch('/api/admin/events-management', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(eventData)
      });

      if (!response.ok) {
        throw new Error('Falha ao criar evento');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      closeModal();
    }
  });

  // Atualizar evento
  const updateEventMutation = useMutation({
    mutationFn: async (eventData) => {
      const response = await fetch('/api/admin/events-management', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(eventData)
      });

      if (!response.ok) {
        throw new Error('Falha ao atualizar evento');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      closeModal();
    }
  });

  // Remover evento
  const deleteEventMutation = useMutation({
    mutationFn: async (eventId) => {
      const response = await fetch(`/api/admin/events-management?id=${eventId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('Falha ao remover evento');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
    }
  });

  const openModal = (event = null) => {
    if (event) {
      setEditingEvent(event);
      setFormData({
        name: event.name,
        date: event.date,
        location: event.location,
        capacity: event.capacity,
        modalidade: event.modalidade || '',
        tipoEvento: event.tipoEvento || '',
        publico: event.publico || '',
        status: event.status || 'active',
        publicoAlvo: event.publicoAlvo || '',
        gerente: event.gerente || '',
        coordenador: event.coordenador || '',
        solucao: event.solucao || '',
        unidade: event.unidade || '',
        tipoAcao: event.tipoAcao || ''
      });
    } else {
      setEditingEvent(null);
      setFormData({
        name: '',
        date: '',
        location: '',
        capacity: '',
        modalidade: '',
        tipoEvento: '',
        publico: '',
        status: 'active',
        publicoAlvo: '',
        gerente: '',
        coordenador: '',
        solucao: '',
        unidade: '',
        tipoAcao: ''
      });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingEvent(null);
    setFormData({
      name: '',
      date: '',
      location: '',
      capacity: '',
      modalidade: '',
      tipoEvento: '',
      publico: '',
      status: 'active',
      publicoAlvo: '',
      gerente: '',
      coordenador: '',
      solucao: '',
      unidade: '',
      tipoAcao: ''
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (editingEvent) {
      await updateEventMutation.mutateAsync({
        id: editingEvent.id,
        ...formData
      });
    } else {
      await createEventMutation.mutateAsync(formData);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100">
        <div className="flex justify-center items-center h-screen">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100">
        <div className="flex justify-center items-center h-screen">
          <div className="text-red-600">Erro ao carregar dados: {error.message}</div>
        </div>
      </div>
    );
  }

  return (
    <AdminLayout title="Gerenciar Eventos">
        {/* Header */}
        <div className="md:flex md:items-center md:justify-between mb-6">
          <div className="flex-1 min-w-0">
            <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
              Eventos
            </h2>
          </div>
          <div className="mt-4 flex md:mt-0 md:ml-4">
            <button
              onClick={() => openModal()}
              className="ml-3 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Adicionar Evento
            </button>
          </div>
        </div>

        {/* Lista de Eventos */}
        <div className="flex flex-col">
          <div className="-my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
            <div className="py-2 align-middle inline-block min-w-full sm:px-6 lg:px-8">
              <div className="shadow overflow-hidden border-b border-gray-200 sm:rounded-lg">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Nome
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Data
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Local
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Modalidade
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Tipo
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Capacidade
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Inscritos
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th scope="col" className="relative px-6 py-3">
                        <span className="sr-only">Ações</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {events?.map((event) => (
                      <tr key={event.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {event.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(event.date).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {event.location}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {event.modalidade}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {event.tipoEvento}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {event.capacity}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {event.registeredParticipants}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            event.status === 'active'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {event.status === 'active' ? 'Ativo' : 'Inativo'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={() => openModal(event)}
                            className="text-blue-600 hover:text-blue-900 mr-4"
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => deleteEventMutation.mutate(event.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            Remover
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      {/* Modal de Criação/Edição */}
      {isModalOpen && (
        <div className="fixed z-50 inset-0 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>

            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <form onSubmit={handleSubmit}>
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <div className="mb-4">
                    <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="name">
                      Nome do Evento
                    </label>
                    <input
                      type="text"
                      id="name"
                      className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="mb-4">
                    <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="date">
                      Data
                    </label>
                    <input
                      type="date"
                      id="date"
                      className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      required
                    />
                  </div>
                  <div className="mb-4">
                    <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="location">
                      Local
                    </label>
                    <input
                      type="text"
                      id="location"
                      className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      required
                    />
                  </div>
                  <div className="mb-4">
                    <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="capacity">
                      Capacidade
                    </label>
                    <input
                      type="number"
                      id="capacity"
                      className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                      value={formData.capacity}
                      onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                      required
                    />
                  </div>
                  <div className="mb-4">
                    <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="modalidade">
                      Modalidade
                    </label>
                    <select
                      id="modalidade"
                      className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                      value={formData.modalidade}
                      onChange={(e) => setFormData({ ...formData, modalidade: e.target.value })}
                      required
                    >
                      <option value="">Selecione</option>
                      <option value="PRESENCIAL">Presencial</option>
                      <option value="ONLINE">Online</option>
                      <option value="HIBRIDO">Híbrido</option>
                    </select>
                  </div>
                  <div className="mb-4">
                    <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="tipoEvento">
                      Tipo de Evento
                    </label>
                    <select
                      id="tipoEvento"
                      className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                      value={formData.tipoEvento}
                      onChange={(e) => setFormData({ ...formData, tipoEvento: e.target.value })}
                      required
                    >
                      <option value="">Selecione</option>
                      <option value="CURSO">Curso</option>
                      <option value="PALESTRA">Palestra</option>
                      <option value="SEMINARIO">Seminário</option>
                      <option value="WORKSHOP">Workshop</option>
                    </select>
                  </div>
                  <div className="mb-4">
                    <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="publico">
                      Público
                    </label>
                    <input
                      type="text"
                      id="publico"
                      className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                      value={formData.publico}
                      onChange={(e) => setFormData({ ...formData, publico: e.target.value })}
                      required
                    />
                  </div>
                  <div className="mb-4">
                    <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="publicoAlvo">
                      Público-Alvo
                    </label>
                    <input
                      type="text"
                      id="publicoAlvo"
                      className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                      value={formData.publicoAlvo}
                      onChange={(e) => setFormData({ ...formData, publicoAlvo: e.target.value })}
                      required
                    />
                  </div>
                  <div className="mb-4">
                    <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="gerente">
                      Gerente
                    </label>
                    <input
                      type="text"
                      id="gerente"
                      className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                      value={formData.gerente}
                      onChange={(e) => setFormData({ ...formData, gerente: e.target.value })}
                      required
                    />
                  </div>
                  <div className="mb-4">
                    <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="coordenador">
                      Coordenador
                    </label>
                    <input
                      type="text"
                      id="coordenador"
                      className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                      value={formData.coordenador}
                      onChange={(e) => setFormData({ ...formData, coordenador: e.target.value })}
                      required
                    />
                  </div>
                  <div className="mb-4">
                    <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="solucao">
                      Solução
                    </label>
                    <input
                      type="text"
                      id="solucao"
                      className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                      value={formData.solucao}
                      onChange={(e) => setFormData({ ...formData, solucao: e.target.value })}
                      required
                    />
                  </div>
                  <div className="mb-4">
                    <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="unidade">
                      Unidade
                    </label>
                    <input
                      type="text"
                      id="unidade"
                      className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                      value={formData.unidade}
                      onChange={(e) => setFormData({ ...formData, unidade: e.target.value })}
                      required
                    />
                  </div>
                  <div className="mb-4">
                    <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="tipoAcao">
                      Tipo de Ação
                    </label>
                    <input
                      type="text"
                      id="tipoAcao"
                      className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                      value={formData.tipoAcao}
                      onChange={(e) => setFormData({ ...formData, tipoAcao: e.target.value })}
                      required
                    />
                  </div>
                  <div className="mb-4">
                    <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="status">
                      Status
                    </label>
                    <select
                      id="status"
                      className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      required
                    >
                      <option value="active">Ativo</option>
                      <option value="inactive">Inativo</option>
                    </select>
                  </div>
                </div>
                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                  <button
                    type="submit"
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm"
                  >
                    {editingEvent ? 'Atualizar' : 'Criar'}
                  </button>
                  <button
                    type="button"
                    className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                    onClick={closeModal}
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

export default withAdminProtection(EventsManagement);
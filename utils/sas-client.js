import { cpeAuth } from './cpe-auth';

const BASE_URL = 'https://base-url-da-api-sas';  // Ajuste a URL base conforme necessário

export async function getSasEvents() {
  try {
    const token = await cpeAuth();
    const response = await fetch(`${BASE_URL}/eventos`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error('Falha ao buscar eventos do SAS');
    }

    const data = await response.json();
    
    // Mapeando os dados do SAS para o formato esperado pela aplicação
    return data.map(event => ({
      id: event.id,
      name: event.nome,
      date: event.dataInicio,
      location: event.local,
      capacity: event.capacidade,
      registeredParticipants: event.participantesRegistrados,
      status: event.status === 'ATIVO' ? 'active' : 'inactive',
      endDate: event.dataFim,
      description: event.descricao,
      type: event.tipo,
      category: event.categoria
    }));
  } catch (error) {
    console.error('Erro ao buscar eventos do SAS:', error);
    throw error;
  }
}

export async function createSasEvent(eventData) {
  try {
    const token = await cpeAuth();
    const response = await fetch(`${BASE_URL}/eventos`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        nome: eventData.name,
        dataInicio: eventData.date,
        local: eventData.location,
        capacidade: eventData.capacity,
        dataFim: eventData.endDate,
        descricao: eventData.description,
        tipo: eventData.type,
        categoria: eventData.category
      })
    });

    if (!response.ok) {
      throw new Error('Falha ao criar evento no SAS');
    }

    return response.json();
  } catch (error) {
    console.error('Erro ao criar evento no SAS:', error);
    throw error;
  }
}

export async function updateSasEvent(eventId, eventData) {
  try {
    const token = await cpeAuth();
    const response = await fetch(`${BASE_URL}/eventos/${eventId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        nome: eventData.name,
        dataInicio: eventData.date,
        local: eventData.location,
        capacidade: eventData.capacity,
        dataFim: eventData.endDate,
        descricao: eventData.description,
        tipo: eventData.type,
        categoria: eventData.category
      })
    });

    if (!response.ok) {
      throw new Error('Falha ao atualizar evento no SAS');
    }

    return response.json();
  } catch (error) {
    console.error('Erro ao atualizar evento no SAS:', error);
    throw error;
  }
}

export async function deleteSasEvent(eventId) {
  try {
    const token = await cpeAuth();
    const response = await fetch(`${BASE_URL}/eventos/${eventId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error('Falha ao deletar evento no SAS');
    }

    return true;
  } catch (error) {
    console.error('Erro ao deletar evento no SAS:', error);
    throw error;
  }
}
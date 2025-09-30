import { useQuery, useMutation } from '@tanstack/react-query';
import { Participant, ApiResponse } from '@/types';

const searchParticipant = async (cpf: string): Promise<ApiResponse<Participant>> => {
  const response = await fetch('/api/search-participant', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cpf }),
  });
  
  if (!response.ok) {
    throw new Error(`Error: ${response.status}`);
  }
  
  return response.json();
};

export const useParticipantSearch = (cpf: string, enabled = false) => {
  return useQuery({
    queryKey: ['participant', cpf],
    queryFn: () => searchParticipant(cpf),
    enabled,
    retry: (failureCount, error: any) => {
      // Não repetir para 404
      if (error?.response?.status === 404) return false;
      return failureCount < 3;
    },
  });
};

export const useParticipantCredential = () => {
  return useMutation({
    mutationFn: async (data: { participant: Participant; eventId: string }) => {
      const response = await fetch('/api/process-credenciamento', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('Erro ao processar credenciamento');
      }

      return response.json();
    },
  });
};
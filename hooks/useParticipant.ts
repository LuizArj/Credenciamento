// DEPRECATED: This hook is not used in the current SAS credenciamento flow.
// It referenced /api/process-credenciamento which has been discontinued.
// Intentionally throws in development to reveal accidental usage.

export const useParticipantSearch = () => {
  if (process.env.NODE_ENV !== 'production') {
    throw new Error(
      'hooks/useParticipant.ts is deprecated. Use the SAS credenciamento flow UI + /api/webhook-checkin.'
    );
  }
  return { data: null, isLoading: false, error: null } as any;
};

export const useParticipantCredential = () => {
  if (process.env.NODE_ENV !== 'production') {
    throw new Error(
      'hooks/useParticipant.ts is deprecated. Use the SAS credenciamento flow UI + /api/webhook-checkin.'
    );
  }
  return {
    mutateAsync: async () => {
      throw new Error('Deprecated');
    },
  } as any;
};

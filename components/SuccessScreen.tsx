import { FC } from 'react';

interface SuccessScreenProps {
  onNewRegistration: () => void;
}

export const SuccessScreen: FC<SuccessScreenProps> = ({ onNewRegistration }) => (
  <div className="text-center space-y-6 animate-fade-in">
    <svg className="mx-auto h-16 w-16 text-sebrae-green" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
    <h2 className="text-2xl font-bold text-gray-800">Participante Credenciado!</h2>
    <p className="text-gray-600">O participante foi registrado com sucesso no sistema.</p>
    <button onClick={onNewRegistration} className="btn btn-primary">
      Novo Credenciamento
    </button>
  </div>
);
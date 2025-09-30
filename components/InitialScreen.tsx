import { FC } from 'react';
import { formatCPF } from '@/utils/validators';

interface InitialScreenProps {
  onSearch: () => void;
  cpf: string;
  setCpf: (value: string) => void;
  loading: boolean;
  error?: string;
}

export const InitialScreen: FC<InitialScreenProps> = ({ onSearch, cpf, setCpf, loading, error }) => {
  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCpf(formatCPF(e.target.value));
  };

  return (
    <div className="form-group">
      <div>
        <label htmlFor="cpf" className="form-label">
          CPF do Participante
        </label>
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
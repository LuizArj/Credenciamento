import { useState } from 'react';

export default function ConfigurationScreen({ onSessionStart }) {
  const [attendantName, setAttendantName] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (attendantName.trim()) {
      onSessionStart({ attendantName });
    }
  };

  return (
    <div className="app-container">
      <div className="card">
        <div>
          <img src="/sebrae-logo-white.png" alt="Logo Sebrae" className="h-12 mx-auto" />
          <h2 className="card-title">
            Configuração do Turno
          </h2>
          <p className="card-subtitle">
            Insira suas informações para iniciar o atendimento
          </p>
        </div>
        <form className="form-group" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="attendantName" className="form-label">
              Nome do Atendente
            </label>
            <div className="mt-1">
              <input
                id="attendantName"
                name="attendantName"
                type="text"
                required
                value={attendantName}
                onChange={(e) => setAttendantName(e.target.value)}
                className="form-input"
                placeholder="Digite seu nome"
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              className="btn btn-primary"
            >
              Iniciar Turno
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
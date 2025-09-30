import { FC } from 'react';

interface HeaderProps {
  attendantName: string;
  onEndShift: () => void;
}

export const Header: FC<HeaderProps> = ({ attendantName, onEndShift }) => (
  <header className="w-full bg-sebrae-blue-dark p-4 shadow-lg flex justify-between items-center fixed top-0 left-0 z-10">
    <div className="w-1/3">
      <img src="/sebrae-logo-white.png" alt="Logo Sebrae" className="h-8" />
    </div>
    <div className="w-1/3 text-center">
      <span className="text-white text-sm font-semibold hidden sm:block">
        Atendente: {attendantName}
      </span>
    </div>
    <div className="w-1/3 flex justify-end">
      <button
        onClick={onEndShift}
        className="bg-sebrae-danger-red hover:bg-sebrae-danger-red-hover text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
      >
        Encerrar Turno
      </button>
    </div>
  </header>
);
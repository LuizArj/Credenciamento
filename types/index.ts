export interface Participant {
    cpf: string;
    name: string;
    email: string;
    phone: string;
    source: 'sas' | 'cpe' | 'manual';
    situacao?: string;
    rawData?: any;
    company?: Company | null;
    ListaVinculo?: Array<any>;
}

export interface Company {
    cnpj: string;
    razaoSocial: string;
    cargo?: string;
    telefone?: string;
}

export interface Event {
    id: string;
    nome: string;
    dataEvento: string;
    local?: string;
    status?: string;
    [key: string]: any;
}

export interface SessionData {
    attendantName: string;
    eventId: string;
    eventName: string;
    eventDetails: Event;
}

export interface ApiResponse<T> {
    data?: T;
    error?: string;
    message?: string;
    status: number;
}
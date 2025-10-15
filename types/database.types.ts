export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export interface Database {
  public: {
    Tables: {
      events: {
        Row: {
          id: string;
          nome: string;
          descricao: string | null;
          data_inicio: string;
          data_fim: string | null;
          local: string;
          modalidade: string | null;
          tipo_evento: string | null;
          publico_alvo: string | null;
          gerente: string | null;
          coordenador: string | null;
          solucao: string | null;
          unidade: string | null;
          tipo_acao: string | null;
          status: string;
          meta_participantes: number | null;
          observacoes: string | null;
          ativo: boolean;
          created_at: string;
          updated_at: string;
          codevento_sas: string | null;
        };
        Insert: {
          id?: string;
          nome: string;
          descricao?: string | null;
          data_inicio: string;
          data_fim?: string | null;
          local: string;
          modalidade?: string | null;
          tipo_evento?: string | null;
          publico_alvo?: string | null;
          gerente?: string | null;
          coordenador?: string | null;
          solucao?: string | null;
          unidade?: string | null;
          tipo_acao?: string | null;
          status: string;
          meta_participantes?: number | null;
          observacoes?: string | null;
          ativo?: boolean;
          created_at?: string;
          updated_at?: string;
          codevento_sas?: string | null;
        };
        Update: {
          id?: string;
          nome?: string;
          descricao?: string | null;
          data_inicio?: string;
          data_fim?: string | null;
          local?: string;
          modalidade?: string | null;
          tipo_evento?: string | null;
          publico_alvo?: string | null;
          gerente?: string | null;
          coordenador?: string | null;
          solucao?: string | null;
          unidade?: string | null;
          tipo_acao?: string | null;
          status?: string;
          meta_participantes?: number | null;
          observacoes?: string | null;
          ativo?: boolean;
          created_at?: string;
          updated_at?: string;
          codevento_sas?: string | null;
        };
      };
      participants: {
        Row: {
          id: string;
          cpf: string;
          nome: string;
          email: string;
          telefone: string | null;
          data_nascimento: string | null;
          genero: string | null;
          escolaridade: string | null;
          profissao: string | null;
          cargo: string | null;
          endereco: string | null;
          fonte: string | null;
          company_id: string | null;
          observacoes: string | null;
          ativo: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          cpf: string;
          nome: string;
          email: string;
          telefone?: string | null;
          data_nascimento?: string | null;
          genero?: string | null;
          escolaridade?: string | null;
          profissao?: string | null;
          cargo?: string | null;
          endereco?: string | null;
          fonte?: string | null;
          company_id?: string | null;
          observacoes?: string | null;
          ativo?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          cpf?: string;
          nome?: string;
          email?: string;
          telefone?: string | null;
          data_nascimento?: string | null;
          genero?: string | null;
          escolaridade?: string | null;
          profissao?: string | null;
          cargo?: string | null;
          endereco?: string | null;
          fonte?: string | null;
          company_id?: string | null;
          observacoes?: string | null;
          ativo?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      registrations: {
        Row: {
          id: string;
          event_id: string;
          participant_id: string;
          ticket_category_id: string | null;
          data_inscricao: string;
          status: 'registered' | 'confirmed' | 'cancelled' | 'waitlist';
          forma_pagamento: string | null;
          valor_pago: number | null;
          codigo_inscricao: string | null;
          dados_adicionais: Json | null;
          observacoes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          event_id: string;
          participant_id: string;
          ticket_category_id?: string | null;
          data_inscricao?: string;
          status?: 'registered' | 'confirmed' | 'cancelled' | 'waitlist';
          forma_pagamento?: string | null;
          valor_pago?: number | null;
          codigo_inscricao?: string | null;
          dados_adicionais?: Json | null;
          observacoes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          event_id?: string;
          participant_id?: string;
          ticket_category_id?: string | null;
          data_inscricao?: string;
          status?: 'registered' | 'confirmed' | 'cancelled' | 'waitlist';
          forma_pagamento?: string | null;
          valor_pago?: number | null;
          codigo_inscricao?: string | null;
          dados_adicionais?: Json | null;
          observacoes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      check_ins: {
        Row: {
          id: string;
          registration_id: string;
          data_check_in: string;
          responsavel_credenciamento: string | null;
          observacoes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          registration_id: string;
          data_check_in?: string;
          responsavel_credenciamento?: string | null;
          observacoes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          registration_id?: string;
          data_check_in?: string;
          responsavel_credenciamento?: string | null;
          observacoes?: string | null;
          created_at?: string;
        };
      };
      ticket_categories: {
        Row: {
          id: string;
          event_id: string;
          nome: string;
          descricao: string | null;
          preco: number;
          quantidade_disponivel: number;
          quantidade_vendida: number;
          data_inicio_venda: string | null;
          data_fim_venda: string | null;
          ativo: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          event_id: string;
          nome: string;
          descricao?: string | null;
          preco: number;
          quantidade_disponivel: number;
          quantidade_vendida?: number;
          data_inicio_venda?: string | null;
          data_fim_venda?: string | null;
          ativo?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          event_id?: string;
          nome?: string;
          descricao?: string | null;
          preco?: number;
          quantidade_disponivel?: number;
          quantidade_vendida?: number;
          data_inicio_venda?: string | null;
          data_fim_venda?: string | null;
          ativo?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      credenciamento_admin_users: {
        Row: {
          id: string;
          username: string;
          password: string;
          name: string;
          email: string | null;
          active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          username: string;
          password: string;
          name: string;
          email?: string | null;
          active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          username?: string;
          password?: string;
          name?: string;
          email?: string | null;
          active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      roles: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          created_at?: string;
        };
      };
      permissions: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          created_at?: string;
        };
      };
      role_permissions: {
        Row: {
          role_id: string;
          permission_id: string;
          created_at: string;
        };
        Insert: {
          role_id: string;
          permission_id: string;
          created_at?: string;
        };
        Update: {
          role_id?: string;
          permission_id?: string;
          created_at?: string;
        };
      };
      user_roles: {
        Row: {
          user_id: string;
          role_id: string;
          created_at: string;
        };
        Insert: {
          user_id: string;
          role_id: string;
          created_at?: string;
        };
        Update: {
          user_id?: string;
          role_id?: string;
          created_at?: string;
        };
      };
    };
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}

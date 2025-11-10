import { IncomingForm } from 'formidable';
import { readFile } from 'fs/promises';
import XLSX from 'xlsx';
import { query, withTransaction } from '../../../lib/config/database';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';

// Desabilitar o body parser padrão do Next.js
export const config = {
  api: {
    bodyParser: false,
  },
};

/**
 * Valida e formata CPF
 */
function formatCPF(cpf) {
  if (!cpf) return null;
  
  // Remove tudo que não é dígito
  const cleanCPF = String(cpf).replace(/\D/g, '');
  
  // Verifica se tem 11 dígitos
  if (cleanCPF.length !== 11) return null;
  
  // Formata como XXX.XXX.XXX-XX
  return cleanCPF.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

/**
 * Valida e formata CNPJ
 */
function formatCNPJ(cnpj) {
  if (!cnpj) return null;
  
  // Remove tudo que não é dígito
  const cleanCNPJ = String(cnpj).replace(/\D/g, '');
  
  // Verifica se tem 14 dígitos
  if (cleanCNPJ.length !== 14) return null;
  
  // Formata como XX.XXX.XXX/XXXX-XX
  return cleanCNPJ.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
}

/**
 * Processa uma linha da planilha
 */
async function processRow(row, rowIndex, client) {
  const errors = [];
  const warnings = [];
  
  try {
    // 1. Validar e formatar CPF
    const cpf = formatCPF(row.CPF || row.cpf);
    if (!cpf) {
      errors.push(`Linha ${rowIndex}: CPF inválido ou ausente`);
      return { success: false, errors, warnings };
    }
    
    // 2. Validar nome
    const nome = String(row.NOME || row.nome || '').trim();
    if (!nome) {
      errors.push(`Linha ${rowIndex}: Nome ausente`);
      return { success: false, errors, warnings };
    }
    
    // 3. Origem (SAS ou CPE)
    const origem = String(row.ORIGEM || row.origem || 'SAS').toUpperCase();
    
    // 4. Empresa (opcional)
    const empresaNome = String(row.EMPRESA || row.empresa || '').trim();
    let companyId = null;
    
    if (empresaNome) {
      // Buscar empresa pelo nome
      const companyRes = await client.query(
        'SELECT id FROM companies WHERE UPPER(razao_social) = UPPER($1) OR UPPER(nome_fantasia) = UPPER($1) LIMIT 1',
        [empresaNome]
      );
      
      if (companyRes.rows.length > 0) {
        companyId = companyRes.rows[0].id;
      } else {
        warnings.push(`Linha ${rowIndex}: Empresa "${empresaNome}" não encontrada, participante será criado sem empresa`);
      }
    }
    
    // 5. Validar data
    let dataInscricao = new Date();
    if (row.Data || row.data) {
      try {
        const dateValue = row.Data || row.data;
        // Se for número (Excel date serial)
        if (typeof dateValue === 'number') {
          dataInscricao = XLSX.SSF.parse_date_code(dateValue);
          dataInscricao = new Date(dataInscricao.y, dataInscricao.m - 1, dataInscricao.d);
        } else {
          dataInscricao = new Date(dateValue);
        }
        
        if (isNaN(dataInscricao.getTime())) {
          warnings.push(`Linha ${rowIndex}: Data inválida, usando data atual`);
          dataInscricao = new Date();
        }
      } catch (e) {
        warnings.push(`Linha ${rowIndex}: Erro ao processar data, usando data atual`);
        dataInscricao = new Date();
      }
    }
    
    // 6. Buscar ou criar evento
    const eventoNome = String(row.Evento_Nome || row.evento_nome || '').trim();
    const codEvento = String(row.Cod_Evento || row.cod_evento || '').trim();
    
    if (!eventoNome && !codEvento) {
      errors.push(`Linha ${rowIndex}: Nome do evento ou código do evento ausente`);
      return { success: false, errors, warnings };
    }
    
    let eventId = null;
    
    // Buscar evento por código SAS ou por nome
    if (codEvento) {
      const eventRes = await client.query(
        'SELECT id FROM events WHERE codevento_sas = $1 LIMIT 1',
        [codEvento]
      );
      
      if (eventRes.rows.length > 0) {
        eventId = eventRes.rows[0].id;
      }
    }
    
    // Se não encontrou por código, buscar por nome
    if (!eventId && eventoNome) {
      const eventRes = await client.query(
        'SELECT id FROM events WHERE UPPER(nome) = UPPER($1) LIMIT 1',
        [eventoNome]
      );
      
      if (eventRes.rows.length > 0) {
        eventId = eventRes.rows[0].id;
      } else {
        // Criar evento se não existir
        const newEventRes = await client.query(
          `INSERT INTO events (nome, codevento_sas, data_inicio, data_fim, status, fonte, created_at, updated_at)
           VALUES ($1, $2, $3, $4, 'active', 'importacao', NOW(), NOW())
           RETURNING id`,
          [eventoNome, codEvento || null, dataInscricao, dataInscricao]
        );
        eventId = newEventRes.rows[0].id;
        warnings.push(`Linha ${rowIndex}: Evento "${eventoNome}" criado automaticamente`);
      }
    }
    
    // 7. Buscar ou criar participante
    const email = String(row.EMAIL || row.email || '').trim() || `${cpf.replace(/\D/g, '')}@temp.com`;
    
    const participantRes = await client.query(
      'SELECT id FROM participants WHERE cpf = $1 LIMIT 1',
      [cpf]
    );
    
    let participantId;
    
    if (participantRes.rows.length > 0) {
      // Participante já existe - apenas usar o ID existente
      // NÃO atualizar email, telefone ou empresa para preservar dados enriquecidos
      participantId = participantRes.rows[0].id;
    } else {
      // Criar novo participante
      const newParticipantRes = await client.query(
        `INSERT INTO participants (cpf, nome, email, company_id, fonte, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
         RETURNING id`,
        [cpf, nome, email, companyId, origem]
      );
      participantId = newParticipantRes.rows[0].id;
    }
    
    // 8. Criar ou atualizar registro de inscrição
    const registrationRes = await client.query(
      'SELECT id FROM registrations WHERE event_id = $1 AND participant_id = $2 LIMIT 1',
      [eventId, participantId]
    );
    
    if (registrationRes.rows.length > 0) {
      warnings.push(`Linha ${rowIndex}: Participante já inscrito no evento`);
    } else {
      await client.query(
        `INSERT INTO registrations (event_id, participant_id, data_inscricao, status, created_at, updated_at)
         VALUES ($1, $2, $3, 'confirmed', NOW(), NOW())`,
        [eventId, participantId, dataInscricao]
      );
    }
    
    return { success: true, errors: [], warnings };
    
  } catch (error) {
    console.error(`Erro ao processar linha ${rowIndex}:`, error);
    errors.push(`Linha ${rowIndex}: ${error.message}`);
    return { success: false, errors, warnings };
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }
  
  try {
    // Verificar autenticação
    const session = await getServerSession(req, res, authOptions);
    if (!session) {
      return res.status(401).json({ error: 'Não autenticado' });
    }
    
    // Verificar permissões (apenas admin e manager)
    const userRoles = session.user?.roles || [];
    if (!userRoles.includes('admin') && !userRoles.includes('manager')) {
      return res.status(403).json({ error: 'Sem permissão para importar dados' });
    }
    
    // Parse do arquivo usando formidable
    const form = new IncomingForm({
      maxFileSize: 10 * 1024 * 1024, // 10MB
      keepExtensions: true,
    });
    
    const [fields, files] = await new Promise((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) reject(err);
        else resolve([fields, files]);
      });
    });
    
    const uploadedFile = files.file?.[0] || files.file;
    
    if (!uploadedFile) {
      return res.status(400).json({ error: 'Nenhum arquivo enviado' });
    }
    
    // Ler arquivo
    const fileBuffer = await readFile(uploadedFile.filepath);
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);
    
    if (data.length === 0) {
      return res.status(400).json({ error: 'Planilha vazia ou formato inválido' });
    }
    
    // Processar dados em transação
    const results = {
      total: data.length,
      success: 0,
      errors: 0,
      warnings: 0,
      details: [],
    };
    
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const rowIndex = i + 2; // +2 porque linha 1 é cabeçalho
      
      const result = await withTransaction(async (client) => {
        return await processRow(row, rowIndex, client);
      });
      
      if (result.success) {
        results.success++;
      } else {
        results.errors++;
      }
      
      if (result.warnings.length > 0) {
        results.warnings += result.warnings.length;
      }
      
      results.details.push({
        row: rowIndex,
        success: result.success,
        errors: result.errors,
        warnings: result.warnings,
      });
    }
    
    return res.status(200).json(results);
    
  } catch (error) {
    console.error('Erro na importação:', error);
    return res.status(500).json({ 
      error: 'Erro ao processar importação',
      message: error.message 
    });
  }
}

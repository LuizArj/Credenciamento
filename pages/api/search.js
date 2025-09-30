import { getCpeToken } from "../../utils/cpe-auth";
import { getServerSession } from "next-auth";
import { authOptions } from "./auth/[...nextauth]";

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);

  if (!session) {
    return res.status(401).json({ message: "Não autenticado" });
  }
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }
  const { cpf } = req.body;

  try {
    const sebraeApiUrl = `${process.env.NEXT_PUBLIC_SEBRAE_API_URL}/SelecionarPessoaFisica?CgcCpf=${cpf}`;
    const response = await fetch(sebraeApiUrl, {
        headers: {
            'x-req': process.env.SEBRAE_API_KEY,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/98.0.4758.102 Safari/537.36'
        },
    });
    if (!response.ok) throw new Error('Falha na API SAS');
    
    const data = await response.json();
    if (!data || (Array.isArray(data) && data.length === 0)) {
      throw new Error('CPF não encontrado na API SAS');
    }
    const person = Array.isArray(data) ? data[0] : data;

    // --- CORREÇÃO AQUI: Verificação mais segura dos dados de contato ---
    const email = person.ListaInformacoesContato?.find(c => c && c.DescComunic && c.DescComunic.toUpperCase() === 'E-MAIL')?.Numero || '';
    const phone = person.ListaInformacoesContato?.find(c => c && c.DescComunic && c.DescComunic.toUpperCase() === 'TELEFONE CELULAR')?.Numero || '';
    // --- FIM DA CORREÇÃO ---

    return res.status(200).json({
      cpf,
      name: person.NomeRazaoSocial || '',
      email: email,
      phone: phone,
      source: 'sas',
      rawData: person 
    });

  } catch (error) {
    console.warn("Consulta na API SAS falhou:", error.message);
    console.log("Acionando fallback para a API CPE...");
    try {
      const token = await getCpeToken();
      const cpeApiUrl = `https://api-gateway.sebrae.com.br/cpe/v1/pessoa-fisica?cpf=${cpf}`;
      const cpeResponse = await fetch(cpeApiUrl, { headers: { 'Authorization': `Bearer ${token}` } });
      if (!cpeResponse.ok) { throw new Error('Falha ao consultar a API CPE.'); }
      const cpeResponseData = await cpeResponse.json();
      let cpeData;
      if (Array.isArray(cpeResponseData) && cpeResponseData.length > 0) {
          cpeData = cpeResponseData[0];
      } else if (!Array.isArray(cpeResponseData) && cpeResponseData && cpeResponseData.cpf) {
          cpeData = cpeResponseData;
      } else {
          throw new Error('CPF não encontrado na API CPE ou resposta inválida.');
      }
      const name = cpeData.nome || '';
      const emailObj = cpeData.comunicacoes?.find(c => c.tipoComunicacao?.descricao.toUpperCase() === 'E-MAIL');
      const phoneObj = cpeData.comunicacoes?.find(c => c.tipoComunicacao?.descricao.toUpperCase() === 'TELEFONE CELULAR');
      const email = emailObj ? emailObj.comunicacao : '';
      const phone = phoneObj ? phoneObj.comunicacao : '';
      if (!name) { throw new Error('CPF encontrado na CPE, mas sem dados essenciais (nome).'); }
      return res.status(200).json({
        cpf,
        name: name,
        email: email,
        phone: phone,
        source: 'cpe', 
        rawData: cpeData
      });
    } catch (cpeError) {
      console.error("Consulta na API CPE também falhou:", cpeError.message);
      return res.status(404).json({
        message: 'Participante não encontrado em nenhuma base.',
        fallbackUrl: process.env.NEXT_PUBLIC_FALLBACK_URL
      });
    }
  }
}
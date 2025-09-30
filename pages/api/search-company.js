// pages/api/search-company.js

import { getCpeToken } from "../../utils/cpe-auth";

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const { cnpj } = req.body;
  // Garante que o CNPJ seja tratado como string
  const cnpjSemMascara = String(cnpj).replace(/\D/g, '');

  try {
    const token = await getCpeToken();
    const apiUrl = `https://api-gateway.sebrae.com.br/cpe/v1/pessoa-juridica?cnpj=${cnpjSemMascara}`;
    
    const response = await fetch(apiUrl, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('CNPJ não encontrado na base da Receita.');
      }
      throw new Error('Erro ao consultar a API de empresas.');
    }

    const responseData = await response.json();

    // --- CORREÇÃO FINAL AQUI ---
    // Lógica para lidar com as duas respostas possíveis da API CPE: [objeto] ou objeto
    let company;
    if (Array.isArray(responseData) && responseData.length > 0) {
        company = responseData[0]; // Se for uma lista, pega o primeiro item
    } else if (!Array.isArray(responseData) && responseData && responseData.cnpj) {
        company = responseData; // Se for um objeto único, usa ele diretamente
    } else {
        throw new Error('CNPJ não encontrado na base da Receita ou resposta inválida.');
    }
    // --- FIM DA CORREÇÃO ---

    return res.status(200).json({
      cnpj: company.cnpj,
      razaoSocial: company.razaoSocial || '',
      nomeFantasia: company.nomeFantasia || '',
    });

  } catch (error) {
    console.error("Erro na busca de CNPJ:", error.message);
    return res.status(404).json({ message: error.message });
  }
}
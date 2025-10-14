// Endpoint para o N8N enviar retorno final do fluxo
// Trabalha apenas no backend: loga e, no futuro, pode atualizar DB/estado assíncrono

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { retorno, message, correlationId, payload } = req.body || {};
    // Log estruturado para auditoria/observabilidade
    console.log(
      '[N8N RETORNO] correlationId=%s retorno=%s message=%s',
      correlationId || '-',
      retorno || '',
      message || ''
    );

    // TODO: aqui podemos atualizar registro em banco, métricas, ou filas, se necessário
    // Exemplo: salvar retorno em uma coleção para consulta posterior

    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error('Erro ao processar retorno do N8N:', error);
    return res.status(500).json({ ok: false, error: error.message });
  }
}

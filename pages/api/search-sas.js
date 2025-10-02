export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { cpf } = req.body;

  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_SEBRAE_API_URL}/SelecionarPF`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.SEBRAE_API_KEY}`,
      },
      body: JSON.stringify({
        CodUf: process.env.SEBRAE_COD_UF,
        CpfCnpj: cpf,
      }),
    });

    if (!response.ok) {
      return res.status(404).json({ message: 'CPF não encontrado no SAS' });
    }

    const data = await response.json();
    
    return res.status(200).json({
      cpf: cpf,
      name: data.NomCli || '',
      email: data.EmlCli || '',
      phone: data.TelCli || '',
      rawData: data,
    });
  } catch (error) {
    console.error('Error searching SAS:', error);
    return res.status(500).json({ message: 'Erro ao buscar no SAS' });
  }
}

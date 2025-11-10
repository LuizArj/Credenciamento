import { useState } from 'react';
import { useSession } from 'next-auth/react';
import AdminLayout from '../../components/AdminLayout';
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle, AlertTriangle, Download } from 'lucide-react';

export default function ImportParticipantsPage() {
  const { data: session } = useSession();
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState('');

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      // Validar extensão
      const validExtensions = ['.xlsx', '.xls', '.csv'];
      const fileExtension = selectedFile.name.substring(selectedFile.name.lastIndexOf('.')).toLowerCase();
      
      if (!validExtensions.includes(fileExtension)) {
        setError('Formato de arquivo inválido. Use Excel (.xlsx, .xls) ou CSV (.csv)');
        setFile(null);
        return;
      }
      
      setFile(selectedFile);
      setError('');
      setResults(null);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Selecione um arquivo primeiro');
      return;
    }

    setUploading(true);
    setError('');
    setResults(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/admin/import-participants', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.message || 'Erro ao importar dados');
      }

      setResults(data);
      setFile(null);
      
      // Limpar input de arquivo
      const fileInput = document.getElementById('file-upload');
      if (fileInput) fileInput.value = '';
      
    } catch (err) {
      console.error('Erro na importação:', err);
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const downloadTemplate = () => {
    // Criar CSV de exemplo
    const csvContent = `CPF,NOME,ORIGEM,EMPRESA,Data,Evento_Nome,Cod_Evento
123.456.789-00,João da Silva,SAS,Empresa Exemplo LTDA,2024-01-15,Workshop de Empreendedorismo,WKS2024001
987.654.321-00,Maria Santos,CPE,Outra Empresa SA,2024-01-20,Palestra de Inovação,PAL2024002`;

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', 'template-importacao.csv');
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <AdminLayout title="Importar Participantes">
      <div className="max-w-5xl mx-auto py-6 px-4">
        {/* Cabeçalho */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Importar Participantes</h1>
          <p className="text-gray-600">
            Importe dados de participantes, empresas e eventos a partir de uma planilha Excel ou CSV
          </p>
        </div>

        {/* Instruções */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold text-blue-900 mb-3 flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5" />
            Formato da Planilha
          </h2>
          <p className="text-blue-800 mb-4">
            Sua planilha deve conter as seguintes colunas (exatamente com esses nomes):
          </p>
          <div className="bg-white rounded-md p-4 mb-4">
            <ul className="space-y-2 text-sm">
              <li className="flex items-start gap-2">
                <span className="font-mono bg-gray-100 px-2 py-1 rounded text-blue-600">CPF</span>
                <span className="text-gray-700">- CPF do participante (obrigatório)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-mono bg-gray-100 px-2 py-1 rounded text-blue-600">NOME</span>
                <span className="text-gray-700">- Nome completo (obrigatório)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-mono bg-gray-100 px-2 py-1 rounded text-blue-600">ORIGEM</span>
                <span className="text-gray-700">- SAS ou CPE (opcional, padrão: SAS)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-mono bg-gray-100 px-2 py-1 rounded text-blue-600">EMPRESA</span>
                <span className="text-gray-700">- Nome da empresa (opcional)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-mono bg-gray-100 px-2 py-1 rounded text-blue-600">Data</span>
                <span className="text-gray-700">- Data da inscrição (opcional)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-mono bg-gray-100 px-2 py-1 rounded text-blue-600">Evento_Nome</span>
                <span className="text-gray-700">- Nome do evento (obrigatório)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-mono bg-gray-100 px-2 py-1 rounded text-blue-600">Cod_Evento</span>
                <span className="text-gray-700">- Código do evento no SAS (opcional)</span>
              </li>
            </ul>
          </div>
          <button
            onClick={downloadTemplate}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
          >
            <Download className="w-4 h-4" />
            Baixar Planilha Modelo
          </button>
        </div>

        {/* Upload de arquivo */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Selecionar Arquivo</h2>
          
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
            <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            
            <input
              id="file-upload"
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileChange}
              className="hidden"
            />
            
            <label
              htmlFor="file-upload"
              className="cursor-pointer inline-block px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition"
            >
              Escolher Arquivo
            </label>
            
            {file && (
              <div className="mt-4 flex items-center justify-center gap-2 text-sm text-gray-600">
                <FileSpreadsheet className="w-4 h-4" />
                <span>{file.name}</span>
                <span className="text-gray-400">({(file.size / 1024).toFixed(2)} KB)</span>
              </div>
            )}
          </div>

          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <span className="text-red-800">{error}</span>
            </div>
          )}

          <button
            onClick={handleUpload}
            disabled={!file || uploading}
            className="mt-6 w-full px-4 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
          >
            {uploading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                <span>Importando...</span>
              </>
            ) : (
              <>
                <Upload className="w-5 h-5" />
                <span>Importar Dados</span>
              </>
            )}
          </button>
        </div>

        {/* Resultados */}
        {results && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Resultado da Importação</h2>
            
            {/* Resumo */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-2xl font-bold text-gray-900">{results.total}</div>
                <div className="text-sm text-gray-600">Total de linhas</div>
              </div>
              <div className="bg-green-50 rounded-lg p-4">
                <div className="text-2xl font-bold text-green-600">{results.success}</div>
                <div className="text-sm text-gray-600">Importadas</div>
              </div>
              <div className="bg-red-50 rounded-lg p-4">
                <div className="text-2xl font-bold text-red-600">{results.errors}</div>
                <div className="text-sm text-gray-600">Erros</div>
              </div>
              <div className="bg-yellow-50 rounded-lg p-4">
                <div className="text-2xl font-bold text-yellow-600">{results.warnings}</div>
                <div className="text-sm text-gray-600">Avisos</div>
              </div>
            </div>

            {/* Detalhes */}
            {results.details && results.details.length > 0 && (
              <div className="max-h-96 overflow-y-auto">
                <h3 className="font-semibold text-gray-900 mb-3">Detalhes por Linha</h3>
                <div className="space-y-2">
                  {results.details.map((detail, index) => (
                    <div
                      key={index}
                      className={`p-3 rounded-md border ${
                        detail.success
                          ? 'bg-green-50 border-green-200'
                          : 'bg-red-50 border-red-200'
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        {detail.success ? (
                          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                        ) : (
                          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                        )}
                        <div className="flex-1">
                          <div className="font-medium text-sm">
                            Linha {detail.row}
                          </div>
                          
                          {detail.errors && detail.errors.length > 0 && (
                            <ul className="mt-1 space-y-1">
                              {detail.errors.map((error, i) => (
                                <li key={i} className="text-sm text-red-700">• {error}</li>
                              ))}
                            </ul>
                          )}
                          
                          {detail.warnings && detail.warnings.length > 0 && (
                            <ul className="mt-1 space-y-1">
                              {detail.warnings.map((warning, i) => (
                                <li key={i} className="text-sm text-yellow-700 flex items-start gap-1">
                                  <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                                  <span>{warning}</span>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

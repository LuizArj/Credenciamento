/**
 * Teste de Concorrência - Credenciamento Simultâneo
 *
 * Simula múltiplos atendentes tentando credenciar o mesmo participante
 * ao mesmo tempo para validar a robustez do sistema.
 *
 * Como executar:
 * node tests/concurrency-test.js
 */

const fetch = require('node-fetch');

const API_URL = process.env.API_URL || 'http://localhost:3000';
const NUM_CONCURRENT_REQUESTS = 10;
const TEST_EVENT_ID = process.env.TEST_EVENT_ID || '123456';

// Dados de teste
const testParticipant = {
  cpf: '12345678900',
  name: 'João Silva Teste',
  email: 'joao.teste@example.com',
  phone: '(95) 99999-9999',
  source: 'sas',
};

const testEvent = {
  id: TEST_EVENT_ID,
  nome: 'Evento Teste de Concorrência',
  data_inicio: new Date().toISOString(),
};

/**
 * Simula uma requisição de credenciamento
 */
async function simulateCheckIn(attendantNumber) {
  const startTime = Date.now();

  try {
    const response = await fetch(`${API_URL}/api/register-local-credenciamento`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        participant: testParticipant,
        eventDetails: testEvent,
        attendantName: `Atendente ${attendantNumber}`,
        localEventId: null,
      }),
    });

    const duration = Date.now() - startTime;
    const data = await response.json();

    return {
      attendant: attendantNumber,
      success: response.ok,
      status: response.status,
      duration,
      message: data.message,
      isNewCheckIn: data.data?.isNewCheckIn,
      error: data.error,
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    return {
      attendant: attendantNumber,
      success: false,
      status: 'ERROR',
      duration,
      error: error.message,
    };
  }
}

/**
 * Executa teste de concorrência
 */
async function runConcurrencyTest() {
  console.log('🚀 Iniciando Teste de Concorrência');
  console.log(`📍 API: ${API_URL}`);
  console.log(`👥 Atendentes simultâneos: ${NUM_CONCURRENT_REQUESTS}`);
  console.log(`📋 Participante: ${testParticipant.name} (CPF: ${testParticipant.cpf})`);
  console.log('');

  const startTime = Date.now();

  // Disparar todas as requisições simultaneamente
  const promises = Array.from({ length: NUM_CONCURRENT_REQUESTS }, (_, i) =>
    simulateCheckIn(i + 1)
  );

  console.log('⏳ Executando requisições simultâneas...\n');

  const results = await Promise.all(promises);
  const totalDuration = Date.now() - startTime;

  // Análise dos resultados
  const successful = results.filter((r) => r.success);
  const failed = results.filter((r) => !r.success);
  const newCheckIns = results.filter((r) => r.isNewCheckIn === true);
  const duplicates = results.filter((r) => r.isNewCheckIn === false);

  console.log('📊 RESULTADOS:');
  console.log('═══════════════════════════════════════════');
  console.log(`✅ Requisições bem-sucedidas: ${successful.length}/${NUM_CONCURRENT_REQUESTS}`);
  console.log(`❌ Requisições com erro: ${failed.length}/${NUM_CONCURRENT_REQUESTS}`);
  console.log(`🆕 Check-ins criados: ${newCheckIns.length}`);
  console.log(`🔄 Check-ins duplicados (esperado): ${duplicates.length}`);
  console.log(`⏱️  Tempo total: ${totalDuration}ms`);
  console.log(
    `⏱️  Tempo médio por requisição: ${Math.round(totalDuration / NUM_CONCURRENT_REQUESTS)}ms`
  );
  console.log('');

  // Detalhar cada resultado
  console.log('📋 DETALHAMENTO POR ATENDENTE:');
  console.log('═══════════════════════════════════════════');
  results.forEach((result) => {
    const icon = result.success ? '✅' : '❌';
    const statusInfo = result.isNewCheckIn ? '🆕 NOVO' : '🔄 DUPLICADO';
    console.log(
      `${icon} Atendente ${result.attendant}: ${result.status} (${result.duration}ms) - ${statusInfo}`
    );
    if (result.error) {
      console.log(`   └─ Erro: ${result.error}`);
    }
  });
  console.log('');

  // Validação dos resultados
  console.log('🔍 VALIDAÇÃO:');
  console.log('═══════════════════════════════════════════');

  const validations = [];

  // 1. Apenas 1 check-in deve ser criado
  if (newCheckIns.length === 1) {
    validations.push('✅ Apenas 1 check-in criado (correto)');
  } else {
    validations.push(`❌ ${newCheckIns.length} check-ins criados (esperado: 1)`);
  }

  // 2. Todas as outras requisições devem detectar duplicata
  if (duplicates.length === NUM_CONCURRENT_REQUESTS - 1) {
    validations.push('✅ Duplicatas detectadas corretamente');
  } else {
    validations.push(
      `⚠️ ${duplicates.length} duplicatas detectadas (esperado: ${NUM_CONCURRENT_REQUESTS - 1})`
    );
  }

  // 3. Nenhuma requisição deve falhar
  if (failed.length === 0) {
    validations.push('✅ Nenhuma requisição falhou');
  } else {
    validations.push(`❌ ${failed.length} requisições falharam`);
  }

  // 4. Todas devem retornar success
  if (successful.length === NUM_CONCURRENT_REQUESTS) {
    validations.push('✅ Todas as requisições foram bem-sucedidas');
  } else {
    validations.push(
      `⚠️ ${successful.length}/${NUM_CONCURRENT_REQUESTS} requisições bem-sucedidas`
    );
  }

  validations.forEach((v) => console.log(v));
  console.log('');

  // Resultado final
  const allTestsPassed =
    newCheckIns.length === 1 &&
    duplicates.length === NUM_CONCURRENT_REQUESTS - 1 &&
    failed.length === 0 &&
    successful.length === NUM_CONCURRENT_REQUESTS;

  if (allTestsPassed) {
    console.log('🎉 TESTE PASSOU! Sistema é robusto para concorrência.');
    console.log('');
    console.log('✓ Apenas 1 check-in foi criado');
    console.log('✓ Duplicatas foram detectadas corretamente');
    console.log('✓ Nenhuma requisição falhou');
    console.log('✓ Todas as requisições retornaram sucesso');
    process.exit(0);
  } else {
    console.log('❌ TESTE FALHOU! Sistema precisa de ajustes.');
    process.exit(1);
  }
}

// Executar teste
runConcurrencyTest().catch((error) => {
  console.error('💥 Erro fatal no teste:', error);
  process.exit(1);
});

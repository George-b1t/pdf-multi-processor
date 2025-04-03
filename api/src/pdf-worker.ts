import fs from 'fs/promises';
import pdf from 'pdf-parse';
import { parentPort } from 'worker_threads';

// Defina as interfaces de Job/Result iguais às do pool
interface PDFJob {
  filePath: string;
  fileName: string;
}

interface PDFResult {
  fileName: string;
  text: string | null;
  error: string | null;
}

if (!parentPort) {
  throw new Error('Este script deve ser executado como worker thread.');
}

// Recebe o job
parentPort.on('message', async (job: PDFJob) => {
  if (!parentPort) {
    return;
  }

  // Simula um atraso de n segundos
  await new Promise(resolve => setTimeout(resolve, 1000));

  console.log(`[Worker:${process.pid}] Iniciando processamento de "${job.fileName}"...`);

  try {
    // Lê o PDF
    const dataBuffer = await fs.readFile(job.filePath);
    const data = await pdf(dataBuffer);

    // Simula erro em ~30% das vezes
    if (Math.random() < 0.3) {
      throw new Error('Erro simulado ao processar o PDF.');
    }

    // Se deu certo, manda de volta
    const result: PDFResult = {
      fileName: job.fileName,
      text: data.text,
      error: null
    };
    parentPort.postMessage(result);

  } catch (error: any) {
    // Se deu erro, retornamos via "message", preenchendo "error"
    const result: PDFResult = {
      fileName: job.fileName,
      text: null,
      error: error.message
    };
    parentPort.postMessage(result);
  }
});

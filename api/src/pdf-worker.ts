import { parentPort } from 'worker_threads';
import fs from 'fs/promises';
import pdf from 'pdf-parse';
import { PDFJob, PDFResult } from './worker-pool';

if (!parentPort) {
  throw new Error('Este script deve ser executado como worker thread.');
}

parentPort.on('message', async (job: PDFJob) => {
  if (!parentPort) {
    throw new Error('Este script deve ser executado como worker thread.');
  }

  await new Promise(resolve => setTimeout(resolve, 1000));
  console.log('Iniciando processamento do arquivo:', job.fileName);

  try {
    const dataBuffer = await fs.readFile(job.filePath);
    const data = await pdf(dataBuffer);
    const result: PDFResult = {
      fileName: job.fileName,
      text: data.text,
      error: null
    };
    parentPort.postMessage(result);
  } catch (error: any) {
    const result: PDFResult = {
      fileName: job.fileName,
      text: null,
      error: error.message
    };
    parentPort.postMessage(result);
  }
});

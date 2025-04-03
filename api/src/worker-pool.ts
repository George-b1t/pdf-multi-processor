import path from 'path';
import { Worker } from 'worker_threads';

export interface PDFJob {
  filePath: string;
  fileName: string;
}

export interface PDFResult {
  fileName: string;
  text: string | null;
  error: string | null;
}

interface QueueItem {
  job: PDFJob;
  resolve: (value: PDFResult) => void;
  reject: (reason?: any) => void;
}

// Cada Worker do pool
interface WorkerData {
  worker: Worker;
  busy: boolean;
  threadId: number;
  currentTask?: {
    resolve: (value: PDFResult) => void;
    reject: (reason: any) => void;
  };
}

export class Pool {
  private queue: QueueItem[];
  private workers: WorkerData[];

  constructor(maxThreads: number) {
    this.queue = [];
    this.workers = [];

    // Cria os Workers imediatamente, até maxThreads
    for (let i = 0; i < maxThreads; i++) {
      this.createWorker();
    }
  }

  // Cria um novo Worker e configura seus handlers
  private createWorker(): void {
    const workerPath = path.resolve(__dirname, '../src/pdf-worker.js');
    const worker = new Worker(workerPath);

    const workerData: WorkerData = {
      worker,
      busy: false,
      threadId: worker.threadId
    };

    console.log(`[Pool] Criando novo Worker com threadId=${worker.threadId}.`);

    // Quando o Worker envia uma mensagem (resultado do PDF)
    worker.on('message', (result: PDFResult) => {
      // Se vier error no objeto, significa que deu falha no *Worker*
      if (result.error) {
        console.log(`[Pool] Worker threadId=${workerData.threadId} concluiu com ERRO: ${result.error}. Terminando o Worker...`);

        // Se quiser notificar quem chamou
        if (workerData.currentTask) {
          // Aqui podemos "resolver" com erro ou "rejeitar" – escolha conforme sua lógica
          workerData.currentTask.resolve(result);
          workerData.currentTask = undefined;
        }

        // Marca como livre para não travar a fila
        workerData.busy = false;

        // **Apenas** chamamos terminate() – vamos recriar no 'exit'
        worker.terminate();
        return;
      }

      // Se chegou aqui, deu sucesso
      console.log(`[Pool] Worker threadId=${workerData.threadId} concluiu com sucesso: "${result.fileName}".`);
      workerData.busy = false;

      // Resolve a Promise do job atual
      if (workerData.currentTask) {
        workerData.currentTask.resolve(result);
        workerData.currentTask = undefined;
      }

      // Chama para ver se tem mais jobs esperando
      this.processQueue();
    });

    // Caso ocorra erro *não-capturado* no Worker (exceção fatal)
    worker.on('error', (error: Error) => {
      console.error(`[Pool] ERRO não-capturado no Worker threadId=${workerData.threadId}: ${error.message}`);

      // Se havia job em andamento, rejeitamos a Promise
      if (workerData.currentTask) {
        workerData.currentTask.reject(error);
        workerData.currentTask = undefined;
      }

      workerData.busy = false;

      // Também chamamos terminate(); e a recriação ocorrerá no 'exit'
      console.log(`[Pool] Terminando Worker threadId=${workerData.threadId} por erro fatal...`);
      worker.terminate();
    });

    // Se o Worker sair (exit), verificamos o código
    worker.on('exit', (code) => {
      // Remove este worker do array
      this.removeWorker(workerData);

      if (code !== 0) {
        console.warn(`[Pool] Worker threadId=${workerData.threadId} saiu com código ${code}. Criando substituto...`);
        this.createWorker();
      } else {
        // Se code=0, foi encerrado normalmente. Em 99% dos casos, não precisamos recriar.
        console.log(`[Pool] Worker threadId=${workerData.threadId} saiu com code=0 (encerrado normalmente).`);
      }

      // Sempre confere se há jobs pendentes
      this.processQueue();
    });

    this.workers.push(workerData);
  }

  // Método exposto publicamente para processar PDF
  public processPDF(job: PDFJob): Promise<PDFResult> {
    return new Promise((resolve, reject) => {
      // Adiciona à fila
      this.queue.push({ job, resolve, reject });
      // Tenta processar imediatamente (se houver Worker livre)
      this.processQueue();
    });
  }

  // Atribui jobs aos Workers livres
  private processQueue(): void {
    // Enquanto tiver job e Worker livre, processa
    while (this.queue.length > 0) {
      const idleWorker = this.workers.find(w => !w.busy);
      if (!idleWorker) break; // se não achou Worker livre, sai

      // Pega um job da fila
      const { job, resolve, reject } = this.queue.shift()!;
      idleWorker.busy = true;
      idleWorker.currentTask = { resolve, reject };

      console.log(`[Pool] Designando "${job.fileName}" ao Worker threadId=${idleWorker.threadId}.`);
      idleWorker.worker.postMessage(job);
    }
  }

  // Remove Worker do array local
  private removeWorker(workerData: WorkerData) {
    const index = this.workers.indexOf(workerData);
    if (index !== -1) {
      this.workers.splice(index, 1);
    }
  }
}

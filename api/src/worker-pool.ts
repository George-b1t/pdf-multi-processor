import { Worker } from 'worker_threads';
import path from 'path';

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

export class Pool {
  private maxThreads: number;
  private queue: QueueItem[];
  private activeWorkers: Worker[];

  constructor(maxThreads: number) {
    this.maxThreads = maxThreads;
    this.queue = [];
    this.activeWorkers = [];
  }

  public processPDF(job: PDFJob): Promise<PDFResult> {
    return new Promise((resolve, reject) => {
      const worker = this.getWorker();
      if (!worker) {
        this.queue.push({ job, resolve, reject });
        return;
      }
      this.runWorker(worker, job, resolve, reject);
    });
  }

  private getWorker(): Worker | null {
    if (this.activeWorkers.length < this.maxThreads) {
      // Importante: após a compilação, o arquivo TypeScript se torna .js.
      const worker = new Worker(path.resolve(__dirname, 'pdf-worker.js'));
      this.activeWorkers.push(worker);
      return worker;
    }
    return null;
  }

  private runWorker(worker: Worker, job: PDFJob, resolve: (value: PDFResult) => void, reject: (reason?: any) => void) {
    const messageHandler = (result: PDFResult) => {
      worker.removeListener('error', errorHandler);
      this.removeWorker(worker);
      resolve(result);
      this.processQueue();
    };

    const errorHandler = (error: Error) => {
      worker.removeListener('message', messageHandler);
      this.removeWorker(worker);
      reject(error);
      this.processQueue();
    };

    worker.once('message', messageHandler);
    worker.once('error', errorHandler);
    worker.postMessage(job);
  }

  private removeWorker(worker: Worker) {
    this.activeWorkers = this.activeWorkers.filter(w => w !== worker);
  }

  private processQueue() {
    if (this.queue.length === 0) return;

    const { job, resolve, reject } = this.queue.shift()!;
    const worker = this.getWorker();
    if (worker) {
      this.runWorker(worker, job, resolve, reject);
    } else {
      // Se não houver worker disponível, re-adiciona o job na fila.
      this.queue.unshift({ job, resolve, reject });
    }
  }
}

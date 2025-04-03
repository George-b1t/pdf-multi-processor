import cors from 'cors';
import express, { Request, Response } from 'express';
import fs from 'fs/promises';
import multer from 'multer';
import path from 'path';
import { Pool } from './worker-pool'; // Importa a classe Pool do arquivo worker-pool.ts

const app = express();
const upload = multer({ dest: 'uploads/' });

// Cria a pool com n workers
const pool = new Pool(1);

// Servir arquivos estáticos da pasta uploads, se precisar acessar publicamente
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Configuração de CORS (ajuste conforme necessidade)
app.use(cors({
  origin: 'http://localhost:3000',
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type']
}));

// Rota para upload e processamento
app.post('/upload', upload.array('pdfs'), async (req: Request, res: Response): Promise<void> => {
  try {
    const startTime = Date.now();
    console.log('Iniciando o processamento dos arquivos PDF...');

    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      res.status(400).json({ error: 'Nenhum arquivo foi enviado.' });
      return;
    }

    // Mapeia os arquivos recebidos em jobs
    const jobs = files.map(file => ({
      filePath: file.path,
      fileName: file.originalname
    }));

    console.log('Jobs:', jobs);

    // Processa cada PDF de forma concorrente usando a pool
    const results = await Promise.all(jobs.map(job => pool.processPDF(job)));

    // Remove arquivos temporários da pasta 'uploads'
    console.log('Removendo arquivos temporários...');
    await Promise.all(files.map(file => fs.unlink(file.path)));
    console.log('Arquivos temporários removidos.');

    const endTime = Date.now();
    const elapsedTime = endTime - startTime;
    console.log(`Processamento concluído em ${elapsedTime} ms`);

    // Retorna o resultado de cada PDF
    res.json(results);

  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Inicia o servidor se estiver executando diretamente
if (require.main === module) {
  const PORT = process.env.PORT || 3001;
  app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
  });
}

export { app };


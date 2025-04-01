import express, { Request, Response } from 'express';
import multer from 'multer';
import { Pool } from './worker-pool';
import path from 'path';
import fs from 'fs/promises';
import cors from 'cors';

const app = express();
const upload = multer({ dest: 'uploads/' });
const pool = new Pool(3);

app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.use(cors({
  origin: 'http://localhost:3000',
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type']
}));

app.post('/upload', upload.array('pdfs'), async (req: Request, res: Response): Promise<any> => {
  try {
    const startTime = Date.now();
    console.log('Iniciando o processamento dos arquivos PDF...');

    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'Nenhum arquivo foi enviado.' });
    }

    const jobs = files.map(file => ({
      filePath: file.path,
      fileName: file.originalname
    }));

    console.log('Jobs:', jobs);
    const results = await Promise.all(jobs.map(job => pool.processPDF(job)));

    console.log('Removendo arquivos temporários...');
    await Promise.all(files.map(file => fs.unlink(file.path)));
    console.log('Arquivos temporários removidos.');

    const endTime = Date.now();
    const elapsedTime = endTime - startTime;
    console.log(`Processamento concluído em ${elapsedTime} ms`);

    res.json(results);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});

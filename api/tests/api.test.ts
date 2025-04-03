import request from 'supertest';
import path from 'path';
import fs from 'fs/promises';
import { app } from '../src/server';

describe('Testes da API /upload', () => {
  let samplePdfPath: string;
  let multiplePdfPaths: string[];

  beforeAll(async () => {
    // Cria um PDF de teste (conteúdo fictício)
    samplePdfPath = path.join(__dirname, 'sample.pdf');
    const pdfContent = '%PDF-1.4\n%âãÏÓ\n1 0 obj\n<< /Type /Catalog >>\nendobj\n';
    await fs.writeFile(samplePdfPath, pdfContent);

    // Cria múltiplos PDFs para testes de concorrência
    multiplePdfPaths = [];
    for (let i = 0; i < 3; i++) {
      const filePath = path.join(__dirname, `sample${i}.pdf`);
      await fs.writeFile(filePath, pdfContent);
      multiplePdfPaths.push(filePath);
    }
  });

  afterAll(async () => {
    // Remove os arquivos temporários de teste
    await fs.unlink(samplePdfPath);
    for (const filePath of multiplePdfPaths) {
      await fs.unlink(filePath);
    } 
  });

  it('deve processar um PDF válido', async () => {
    const response = await request(app)
      .post('/upload')
      .attach('pdfs', samplePdfPath);

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBe(1);
    const result = response.body[0];
    expect(result).toHaveProperty('fileName');
    expect(result).toHaveProperty('text');
    expect(result).toHaveProperty('error');

    // Se o processamento foi bem-sucedido, "error" deve ser null e "text" uma string.
    if (result.error === null) {
      expect(typeof result.text).toBe('string');
    }
  });

  it('deve processar múltiplos PDFs de forma concorrente', async () => {
    const req = request(app).post('/upload');
    for (const filePath of multiplePdfPaths) {
      req.attach('pdfs', filePath);
    }
    const response = await req;
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBe(multiplePdfPaths.length);
    response.body.forEach((result: any) => {
      expect(result).toHaveProperty('fileName');
      expect(result).toHaveProperty('text');
      expect(result).toHaveProperty('error');
    });
  });

  it('deve retornar erro quando nenhum arquivo é enviado', async () => {
    const response = await request(app).post('/upload');
    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'Nenhum arquivo foi enviado.' });
  });

  it('deve simular erro no processamento forçando Math.random a retornar valor abaixo do limiar', async () => {
    // Força a simulação de erro sobrescrevendo temporariamente Math.random
    const originalRandom = Math.random;
    Math.random = () => 0.25; // Valor abaixo de 0.3 para disparar a simulação de erro

    const response = await request(app)
      .post('/upload')
      .attach('pdfs', samplePdfPath);

    // Restaura Math.random
    Math.random = originalRandom;

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    const result = response.body[0];
    // Neste cenário, esperamos que o processamento retorne um erro simulado
    expect(result.error).not.toBeNull();
    expect(result.text).toBeNull();
  });
});

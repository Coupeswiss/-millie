import fs from 'fs';
import path from 'path';
import { addVector, saveVectors, embedText } from './vectorStore';
import { loadVectors } from './vectorStore';

const KNOWLEDGE_DIR = path.join(__dirname, 'knowledge', 'docs');

const CHUNK_SIZE = 800; // approx characters per chunk

async function ingest() {
  loadVectors();

  const files = fs.readdirSync(KNOWLEDGE_DIR);
  for (const file of files) {
    const ext = path.extname(file);
    if (!['.txt', '.md'].includes(ext)) continue;
    const fullPath = path.join(KNOWLEDGE_DIR, file);
    const content = fs.readFileSync(fullPath, 'utf8');
    const chunks = chunkText(content, CHUNK_SIZE);
    console.log(`[Ingest] ${file}: ${chunks.length} chunks`);
    for (const chunk of chunks) {
      const embedding = await embedText(chunk);
      addVector({ text: chunk, embedding });
    }
  }

  saveVectors();
  console.log('[Ingest] Complete!');
}

ingest();

function chunkText(text: string, size: number): string[] {
  const chunks: string[] = [];
  let start = 0;
  while (start < text.length) {
    chunks.push(text.slice(start, start + size));
    start += size;
  }
  return chunks;
} 
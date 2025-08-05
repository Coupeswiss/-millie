import fs from 'fs';
import path from 'path';
import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

const VECTORS_FILE = path.join(__dirname, 'knowledge', 'vectors.json');
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface VectorRecord {
  text: string;
  embedding: number[];
}

let vectors: VectorRecord[] = [];

export const loadVectors = () => {
  try {
    const raw = fs.readFileSync(VECTORS_FILE, 'utf8');
    vectors = JSON.parse(raw);
    console.log(`[VectorStore] Loaded ${vectors.length} vectors.`);
  } catch {
    console.warn('[VectorStore] No vectors file found; starting empty.');
    vectors = [];
  }
};

export const saveVectors = () => {
  fs.mkdirSync(path.dirname(VECTORS_FILE), { recursive: true });
  fs.writeFileSync(VECTORS_FILE, JSON.stringify(vectors, null, 2));
};

export const addVector = (record: VectorRecord) => {
  vectors.push(record);
};

const cosineSimilarity = (a: number[], b: number[]) => {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
};

export const embedText = async (text: string): Promise<number[]> => {
  const resp = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text,
  });
  return resp.data[0].embedding;
};

export const search = async (query: string, k = 3): Promise<string[]> => {
  if (vectors.length === 0) return [];
  const queryEmbedding = await embedText(query);
  const scored = vectors.map((v) => ({
    text: v.text,
    score: cosineSimilarity(queryEmbedding, v.embedding),
  }));
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, k).map((s) => s.text);
}; 
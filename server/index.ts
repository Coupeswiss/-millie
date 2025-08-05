/* eslint-disable */
// @ts-nocheck
import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import OpenAI from 'openai';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { loadVectors, search as searchVectors, addVector, saveVectors } from './vectorStore';
import { webSearch } from './webSearch';

dotenv.config();

const PORT = process.env.PORT || 4000;
const JWT_SECRET = process.env.JWT_SECRET || 'changeme';
const DATA_FILE = path.join(__dirname, 'users.json');

// ---------- Transcript / Weekly Meeting Storage ----------
const TRANSCRIPTS_META_FILE = path.join(__dirname, 'knowledge', 'transcripts.json');

interface TranscriptMeta {
  date: string; // ISO string
  topic: string;
  keyPoints: string[];
  file: string; // relative path to transcript file
}

const readTranscriptMeta = (): TranscriptMeta[] => {
  try {
    const raw = fs.readFileSync(TRANSCRIPTS_META_FILE, 'utf8');
    return JSON.parse(raw);
  } catch {
    return [];
  }
};

const writeTranscriptMeta = (data: TranscriptMeta[]) => {
  fs.mkdirSync(path.dirname(TRANSCRIPTS_META_FILE), { recursive: true });
  fs.writeFileSync(TRANSCRIPTS_META_FILE, JSON.stringify(data, null, 2));
};

const CHUNK_SIZE = 800;

// ---------- Dashboard Storage ----------
const DASHBOARD_FILE = path.join(__dirname, 'knowledge', 'dashboard.json');

interface DashboardData {
  dailyQuotes: string[];
  communityNews: { title: string; content: string; type: string }[];
  coinOfWeek: {
    name: string;
    symbol: string;
    reason: string;
    targetPrice: string;
    analysis: string;
  };
}

const readDashboard = (): DashboardData | null => {
  try {
    const raw = fs.readFileSync(DASHBOARD_FILE, 'utf8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

const writeDashboard = (data: DashboardData) => {
  fs.mkdirSync(path.dirname(DASHBOARD_FILE), { recursive: true });
  fs.writeFileSync(DASHBOARD_FILE, JSON.stringify(data, null, 2));
};

const chunkText = (text: string, size: number): string[] => {
  const chunks: string[] = [];
  let start = 0;
  while (start < text.length) {
    chunks.push(text.slice(start, start + size));
    start += size;
  }
  return chunks;
};

interface UserRecord {
  email: string;
  passwordHash: string;
}

const readUsers = (): UserRecord[] => {
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    return JSON.parse(raw);
  } catch {
    return [];
  }
};

const writeUsers = (users: UserRecord[]) => {
  fs.writeFileSync(DATA_FILE, JSON.stringify(users, null, 2));
};

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Load vectors into memory at startup
loadVectors();

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Registration
app.post('/api/register', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password required' });
  }
  const users = readUsers();
  if (users.find((u) => u.email === email)) {
    return res.status(400).json({ message: 'Email already registered' });
  }
  const passwordHash = await bcrypt.hash(password, 10);
  users.push({ email, passwordHash });
  writeUsers(users);
  res.status(201).json({ message: 'Registered successfully' });
});

// Login
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password required' });
  }
  const users = readUsers();
  const user = users.find((u) => u.email === email);
  if (!user) return res.status(400).json({ message: 'Invalid credentials' });

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return res.status(400).json({ message: 'Invalid credentials' });

  const token = jwt.sign({ email }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token });
});

// Middleware to verify token
const authMiddleware: express.RequestHandler = (_req, _res, next) => {
  // Temporarily disable JWT validation for demo purposes
  next();
};

app.post('/api/chat', authMiddleware, async (req, res) => {
  const { messages } = req.body; // expecting array of { role, content }
  if (!Array.isArray(messages)) {
    return res.status(400).json({ message: 'messages array required' });
  }

  const userQuestion = messages[messages.length - 1]?.content || '';

  // Retrieve relevant context
  let context = '';
  try {
    const hits = await searchVectors(userQuestion, 3);
    context = hits.join('\n---\n');
  } catch (err) {
    console.warn('[RAG] search failed', err);
  }

  // Add web search for real-time info
  const needsSearch = userQuestion.toLowerCase().includes('price') || 
                     userQuestion.toLowerCase().includes('latest') ||
                     userQuestion.toLowerCase().includes('today') ||
                     userQuestion.toLowerCase().includes('current') ||
                     userQuestion.toLowerCase().includes('now');
  
  if (needsSearch) {
    try {
      const searchResults = await webSearch(userQuestion);
      if (searchResults) {
        context += '\n---\nWeb search results:\n' + searchResults;
      }
    } catch (err) {
      console.warn('[Web search] failed', err);
    }
  }

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are Millie, the friendly mentor inside Queen of Millions.
Tone: warm, conversational, encouraging—but also clear and data-driven.
Audience: women who are becoming financially sovereign through crypto.
Guidelines:
• Speak in “you” language (“you can”, “your portfolio”), never hype.
• Simplify jargon in plain English; offer analogies when helpful.
• Celebrate small wins and reassure around market volatility.
• Keep answers concise (≈3 short paragraphs) unless the user requests deep detail.
• If you don’t know something, say so and suggest where to find the answer.`,
        },
        {
          role: 'system',
          content: `Relevant facts:\n${context}`,
        },
        ...messages,
      ],
    });
    res.json({ content: completion.choices[0].message.content });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ message: 'OpenAI error', detail: err.message });
  }
});

// ---------- Transcript Upload ----------
app.post('/api/transcripts', async (req, res) => {
  const { text, date } = req.body as { text?: string; date?: string };
  if (!text) {
    return res.status(400).json({ message: 'text field required' });
  }

  const transcriptDate = date || new Date().toISOString();

  // Write transcript file
  const fileName = `${Date.now()}.txt`;
  const docsDir = path.join(__dirname, 'knowledge', 'docs');
  fs.mkdirSync(docsDir, { recursive: true });
  const filePath = path.join(docsDir, fileName);
  fs.writeFileSync(filePath, text, 'utf8');

  // Embed & add to vector store
  const chunks = chunkText(text, CHUNK_SIZE);
  for (const chunk of chunks) {
    try {
      const emb = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: chunk,
      });
      addVector({ text: chunk, embedding: emb.data[0].embedding });
    } catch (err) {
      console.warn('[Transcript] embedding failed', err);
    }
  }
  saveVectors();

  // Generate summary
  let topic = 'Weekly Meeting';
  let keyPoints: string[] = [];
  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content:
            `You are Millie, the mentor voice of Queen of Millions. Summarize the following transcript for busy community members.
Return ONLY valid JSON with keys "topic" (string) and "keyPoints" (array of 3-5 short bullet strings). Do not wrap in markdown.`
        },
        { role: 'user', content: text.slice(0, 8000) }, // limit tokens
      ],
    });
    const json = JSON.parse(completion.choices[0].message.content || '{}');
    if (typeof json.topic === 'string' && Array.isArray(json.keyPoints)) {
      topic = json.topic;
      keyPoints = json.keyPoints;
    }
  } catch (err) {
    console.warn('[Transcript] summarization failed', err);
  }

  const metas = readTranscriptMeta();
  metas.push({ date: transcriptDate, topic, keyPoints, file: fileName });
  metas.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  writeTranscriptMeta(metas);

  // ---------- Generate dashboard content ----------
  try {
    const dashCompletion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content:
            `You are Millie, crafting dashboard content for the Queen of Millions community.
Based on the transcript, create JSON with these keys:
 dailyQuotes — array of 3 inspiring crypto quotes in Millie's voice,
 communityNews — up to 3 objects {title, content, type: "update"|"partnership"|"milestone"},
 coinOfWeek — {name, symbol, reason, targetPrice, analysis} - focus on top performing coins from the PulseChain ecosystem or other high-potential projects mentioned.
Keep copy warm, empowering, jargon-light. Return ONLY JSON, no markdown.`
        },
        { role: 'user', content: text.slice(0, 8000) },
      ],
    });

    const dashJson = JSON.parse(dashCompletion.choices[0].message.content || '{}');
    if (dashJson.dailyQuotes && dashJson.communityNews && dashJson.coinOfWeek) {
      writeDashboard(dashJson);
    }
  } catch (err) {
    console.warn('[Transcript] dashboard generation failed', err);
  }

  res.status(201).json({ message: 'Transcript ingested', topic, keyPoints });
});

// ---------- Weekly Summary ----------
app.get('/api/weekly', (_req, res) => {
  const metas = readTranscriptMeta();
  if (metas.length === 0) return res.status(404).json({ message: 'No transcripts found' });
  res.json(metas[0]);
});

// ---------- Dashboard Summary ----------
app.get('/api/summary', (_req, res) => {
  const weekly = readTranscriptMeta()[0] || null;
  const dash = readDashboard() || {};
  res.json({ weeklyMeeting: weekly, ...dash });
});

// -------- Serve React static build ---------
const staticPath = path.join(__dirname, '..', 'dist');
app.use(express.static(staticPath));
// For any GET request that doesn\'t match an API route, send back index.html
app.get('*', (_req, res) => {
  res.sendFile(path.join(staticPath, 'index.html'));
});

app.listen(PORT, () => console.log(`Server listening on port ${PORT}`)); 
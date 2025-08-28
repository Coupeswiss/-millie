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
// Use a configurable storage directory so data persists across deployments.
const STORAGE_DIR = process.env.STORAGE_DIR || path.join(__dirname, 'storage');
fs.mkdirSync(STORAGE_DIR, { recursive: true });

// Admin bootstrap credentials (can be overridden via env vars)
const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || 'admin@qom.com').toLowerCase();
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'millieadmin';

const DATA_FILE = path.join(STORAGE_DIR, 'users.json');
const WHITELIST_FILE = path.join(STORAGE_DIR, 'whitelist.json');
const UPLOAD_HISTORY_FILE = path.join(__dirname, 'upload-history.json');

// ---------- Transcript / Weekly Meeting Storage ----------
const TRANSCRIPTS_META_FILE = path.join(__dirname, 'knowledge', 'transcripts.json');

interface TranscriptMeta {
  date: string; // ISO string
  weekNumber?: number; // Week number in the year
  topic: string;
  keyPoints: string[];
  mentionedCoins?: string[];
  actionItems?: string[];
  file: string; // relative path to transcript file
  uploadedAt: string; // When it was uploaded
}

interface UploadHistoryEntry {
  id: string;
  type: 'transcript' | 'collective' | 'document';
  uploadedAt: string;
  uploadedBy?: string;
  title: string;
  metadata?: any;
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

// ---------- Upload History Management ----------
const readUploadHistory = (): UploadHistoryEntry[] => {
  try {
    const raw = fs.readFileSync(UPLOAD_HISTORY_FILE, 'utf8');
    return JSON.parse(raw);
  } catch {
    return [];
  }
};

const writeUploadHistory = (data: UploadHistoryEntry[]) => {
  fs.writeFileSync(UPLOAD_HISTORY_FILE, JSON.stringify(data, null, 2));
};

const addToUploadHistory = (entry: Omit<UploadHistoryEntry, 'id' | 'uploadedAt'>) => {
  const history = readUploadHistory();
  const newEntry: UploadHistoryEntry = {
    ...entry,
    id: Date.now().toString(),
    uploadedAt: new Date().toISOString(),
  };
  history.unshift(newEntry); // Add to beginning
  // Keep only last 100 entries
  if (history.length > 100) {
    history.splice(100);
  }
  writeUploadHistory(history);
  return newEntry;
};

const getWeekNumber = (date: Date): number => {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1)/7);
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
  lastUpdated?: string;
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
  const dataWithTimestamp = { ...data, lastUpdated: new Date().toISOString() };
  fs.writeFileSync(DASHBOARD_FILE, JSON.stringify(dataWithTimestamp, null, 2));
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

// Ensure an admin user exists and is whitelisted
const bootstrapAdminUser = () => {
  try {
    const users = readUsers();
    const adminExists = users.some((u) => u.email.toLowerCase() === ADMIN_EMAIL);
    if (!adminExists) {
      const passwordHash = bcrypt.hashSync(ADMIN_PASSWORD, 10);
      users.push({ email: ADMIN_EMAIL, passwordHash });
      writeUsers(users);
      console.log(`[Bootstrap] Created admin user ${ADMIN_EMAIL}`);
    }
    addToWhitelist(ADMIN_EMAIL);
  } catch (err) {
    console.warn('[Bootstrap admin] failed', err);
  }
};

// Whitelist management
interface WhitelistData {
  allowedEmails: string[];
}

const readWhitelist = (): WhitelistData => {
  try {
    const raw = fs.readFileSync(WHITELIST_FILE, 'utf8');
    return JSON.parse(raw);
  } catch {
    return { allowedEmails: ['admin@qom.com'] };
  }
};

const writeWhitelist = (data: WhitelistData) => {
  fs.mkdirSync(path.dirname(WHITELIST_FILE), { recursive: true });
  fs.writeFileSync(WHITELIST_FILE, JSON.stringify(data, null, 2));
};

const isEmailWhitelisted = (email: string): boolean => {
  const whitelist = readWhitelist();
  return whitelist.allowedEmails.includes(email.toLowerCase());
};

const addToWhitelist = (email: string) => {
  const whitelist = readWhitelist();
  if (!whitelist.allowedEmails.includes(email.toLowerCase())) {
    whitelist.allowedEmails.push(email.toLowerCase());
    writeWhitelist(whitelist);
  }
};

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Load vectors into memory at startup
loadVectors();

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Bootstrap admin after basic middleware
bootstrapAdminUser();

// Registration
app.post('/api/register', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password required' });
  }
  
  // Check whitelist
  if (!isEmailWhitelisted(email)) {
    return res.status(403).json({ message: 'Registration is by invitation only. Please contact an administrator.' });
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
  
  // Add transcript metadata for date context
  try {
    const transcripts = readTranscriptMeta();
    if (transcripts.length > 0) {
      const latest = transcripts[0];
      const currentWeek = getWeekNumber(new Date());
      context = `[IMPORTANT CONTEXT: The most recent weekly meeting was on ${new Date(latest.date).toLocaleDateString()} (Week ${latest.weekNumber}). Current week is ${currentWeek}. There are ${transcripts.length} total weekly transcripts available.]\n\n` + context;
    }
  } catch (err) {
    console.warn('[Transcript context] failed', err);
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
          content: readSystemPrompt(),
        },
        {
          role: 'system',
          content: `Relevant facts:\n${context}`,
        },
        ...messages,
      ],
    });
    
    const assistantResponse = completion.choices[0].message.content || '';
    
    // Save Q&A pair to knowledge base
    try {
      const qaText = `Q: ${userQuestion}\nA: ${assistantResponse}`;
      const emb = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: qaText,
      });
      addVector({ text: qaText, embedding: emb.data[0].embedding });
      saveVectors();
    } catch (err) {
      console.warn('[Q&A save] failed', err);
    }
    
    res.json({ content: assistantResponse });
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
  
  // Also add a structured summary to knowledge base
  try {
    const structuredSummary = `Weekly Meeting Transcript Summary:
Date: ${transcriptDate}
Key Topics Discussed:
${text.slice(0, 2000)}

This content is from a Queen of Millions community meeting and should be used to answer questions about recent updates, strategies, and community initiatives.`;
    
    const summaryEmb = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: structuredSummary,
    });
    addVector({ text: structuredSummary, embedding: summaryEmb.data[0].embedding });
  } catch (err) {
    console.warn('[Transcript summary] embedding failed', err);
  }
  
  saveVectors();

  // Generate summary
  let topic = 'Weekly Meeting';
  let keyPoints: string[] = [];
  let mentionedCoins: string[] = [];
  let actionItems: string[] = [];
  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content:
            `You are Millie, the mentor voice of Queen of Millions. Analyze this community meeting transcript and extract key information.
Return ONLY valid JSON with these keys:
- "topic" (string): Main theme or title of the meeting
- "keyPoints" (array of 3-5 strings): Most important takeaways, strategies, or announcements
- "mentionedCoins" (array): Any cryptocurrencies discussed with reasons
- "actionItems" (array): Specific actions community members should take
Do not wrap in markdown.`
        },
        { role: 'user', content: text.slice(0, 8000) }, // limit tokens
      ],
    });
    const json = JSON.parse(completion.choices[0].message.content || '{}');
    if (typeof json.topic === 'string') topic = json.topic;
    if (Array.isArray(json.keyPoints)) keyPoints = json.keyPoints;
    if (Array.isArray(json.mentionedCoins)) mentionedCoins = json.mentionedCoins;
    if (Array.isArray(json.actionItems)) actionItems = json.actionItems;
  } catch (err) {
    console.warn('[Transcript] summarization failed', err);
  }

  const metas = readTranscriptMeta();
  const transcriptDateObj = new Date(transcriptDate);
  const weekNum = getWeekNumber(transcriptDateObj);
  
  metas.push({ 
    date: transcriptDate,
    weekNumber: weekNum,
    topic, 
    keyPoints, 
    mentionedCoins,
    actionItems,
    file: fileName,
    uploadedAt: new Date().toISOString()
  });
  metas.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  writeTranscriptMeta(metas);
  
  // Add to upload history
  addToUploadHistory({
    type: 'transcript',
    title: `Week ${weekNum} - ${topic}`,
    metadata: {
      date: transcriptDate,
      weekNumber: weekNum,
      keyPointsCount: keyPoints.length,
      mentionedCoins: mentionedCoins
    }
  });

  // ---------- Generate dashboard content ----------
  try {
    const dashCompletion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content:
            `You are Millie, crafting comprehensive dashboard content for the Queen of Millions community.
Analyze this transcript thoroughly and create JSON with these keys:
 dailyQuotes — array of 3 inspiring quotes from the transcript or in Millie's voice based on topics discussed,
 communityNews — up to 3 objects {title, content, type: "update"|"partnership"|"milestone"} - MUST reflect actual announcements, updates, or initiatives mentioned in the transcript,
 coinOfWeek — {name, symbol, reason, targetPrice, analysis} - choose the most discussed or recommended coin from the transcript, preferably from PulseChain ecosystem.
 
IMPORTANT: Extract real information from the transcript. If specific coins, strategies, or announcements are mentioned, use those. Make the dashboard reflect what was actually discussed in the meeting.
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

// ---------- Upload History ----------
app.get('/api/admin/upload-history', (_req, res) => {
  const history = readUploadHistory();
  res.json(history);
});

app.get('/api/admin/transcripts-all', (_req, res) => {
  const metas = readTranscriptMeta();
  res.json(metas);
});

// ---------- Admin Whitelist Management ----------
app.get('/api/admin/whitelist', (_req, res) => {
  const whitelist = readWhitelist();
  res.json(whitelist);
});

app.post('/api/admin/whitelist/add', (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ message: 'Email required' });
  }
  addToWhitelist(email);
  res.json({ message: 'Email added to whitelist' });
});

app.post('/api/admin/whitelist/upload', (req, res) => {
  const { emails } = req.body;
  if (!Array.isArray(emails)) {
    return res.status(400).json({ message: 'Emails array required' });
  }
  
  const whitelist = readWhitelist();
  emails.forEach(email => {
    if (email && typeof email === 'string' && !whitelist.allowedEmails.includes(email.toLowerCase())) {
      whitelist.allowedEmails.push(email.toLowerCase());
    }
  });
  writeWhitelist(whitelist);
  res.json({ message: `Added ${emails.length} emails to whitelist` });
});

// ---------- Collective Consciousness ----------
app.post('/api/admin/collective', async (req, res) => {
  const { text, type, date } = req.body;
  if (!text) {
    return res.status(400).json({ message: 'Text required' });
  }
  
  try {
    // Add to knowledge base with special prefix
    const prefix = `[Collective Consciousness - ${type || 'general'}] ${date ? new Date(date).toLocaleDateString() : new Date().toLocaleDateString()}:\n`;
    const fullText = prefix + text;
    
    // Chunk and embed
    const chunks = chunkText(fullText, CHUNK_SIZE);
    for (const chunk of chunks) {
      try {
        const emb = await openai.embeddings.create({
          model: 'text-embedding-3-small',
          input: chunk,
        });
        addVector({ text: chunk, embedding: emb.data[0].embedding });
      } catch (err) {
        console.warn('[Collective] embedding failed', err);
      }
    }
    saveVectors();
    
    // Add to upload history
    addToUploadHistory({
      type: 'collective',
      title: `Collective Consciousness - ${type || 'general'}`,
      metadata: {
        type: type || 'general',
        date: date || new Date().toISOString(),
        textLength: text.length
      }
    });
    
    res.json({ message: 'Added to collective consciousness' });
  } catch (err) {
    console.error('[Collective] error', err);
    res.status(500).json({ message: 'Failed to process' });
  }
});

// ---------- System Prompt Management ----------
const SYSTEM_PROMPT_FILE = path.join(__dirname, 'system-prompt.json');

const readSystemPrompt = (): string => {
  try {
    const raw = fs.readFileSync(SYSTEM_PROMPT_FILE, 'utf8');
    const data = JSON.parse(raw);
    return data.prompt || '';
  } catch {
    // Default prompt if file doesn't exist
    return `You are Millie, the friendly mentor inside Queen of Millions.
Tone: warm, conversational, encouraging—but also clear and data-driven.
Audience: women who are becoming financially sovereign through crypto.
Guidelines:
• Speak in "you" language ("you can", "your portfolio"), never hype.
• Simplify jargon in plain English; offer analogies when useful.
• Celebrate small wins and reassure around market volatility.
• Keep answers concise (≈3 short paragraphs) unless the user requests deep detail.
• If you don't know something, say so and suggest where to find the answer.`;
  }
};

const writeSystemPrompt = (prompt: string) => {
  fs.writeFileSync(SYSTEM_PROMPT_FILE, JSON.stringify({ prompt, updatedAt: new Date().toISOString() }, null, 2));
};

app.get('/api/admin/system-prompt', (_req, res) => {
  res.json({ prompt: readSystemPrompt() });
});

app.post('/api/admin/system-prompt', (req, res) => {
  const { prompt } = req.body;
  if (!prompt) {
    return res.status(400).json({ message: 'Prompt required' });
  }
  writeSystemPrompt(prompt);
  res.json({ message: 'System prompt updated' });
});

// ---------- Daily Quotes Management ----------
app.post('/api/admin/daily-quotes', (req, res) => {
  const { quotes } = req.body;
  if (!Array.isArray(quotes)) {
    return res.status(400).json({ message: 'Quotes array required' });
  }
  
  const dashboard = readDashboard();
  dashboard.dailyQuotes = quotes;
  writeDashboard(dashboard);
  res.json({ message: 'Daily quotes updated' });
});

// -------- Serve React static build ---------
const staticPath = path.join(__dirname, '..', 'dist');
app.use(express.static(staticPath));
// For any GET request that doesn\'t match an API route, send back index.html
app.get('*', (_req, res) => {
  res.sendFile(path.join(staticPath, 'index.html'));
});

app.listen(PORT, () => console.log(`Server listening on port ${PORT}`)); 
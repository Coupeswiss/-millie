# Crypto Classroom Chatbot

A sleek desktop-style landing page where your community can log in with their OpenAI API key and chat with an AI tutor focused on cryptocurrency.

## Features

* Modern dark UI powered by MUI (Material UI)
* Simple login gate – users supply their own API key (no backend required for the demo)
* Streaming-style chat interface with message bubbles
* Uses OpenAI `chat/completions` endpoint under the hood
* Easy to extend with your own knowledge base (see below)

## Getting started

1. Install dependencies:

```bash
npm install
```

2. Run the dev server:

```bash
npm run dev
```

3. The app will open at <http://localhost:5173>.

## Custom knowledge base

In `src/pages/ChatPage.tsx` the **system message** primes the assistant. Replace or enrich that string with whatever context you want (FAQ, course material, etc.).

For a more robust solution you might:

* Vector-store your documents (e.g. using pinecone, chroma) and assemble dynamic context.
* Host your own backend that injects context and calls OpenAI securely without exposing the key.

## Building for production

```bash
npm run build
npm run preview
```

---

Made with ❤️ for crypto learners. 
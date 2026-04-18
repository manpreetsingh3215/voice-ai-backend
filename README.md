# Voice AI Backend

A Node.js backend for voice AI interactions with OpenAI's GPT, Whisper, and TTS.

## Installation

1. Clone the repository
2. Run `npm install` to install dependencies
3. Create a `.env` file with your OpenAI API key:
   ```
   OPENAI_API_KEY=your_openai_api_key_here
   PORT=3000
   ```

## Usage

Start the server:

```
npm start
```

The server will run on port 3000 by default (or PORT from environment).

## API Endpoints

### Text Chat

- `POST /api/ai/chat` - Send text message to GPT-4
- `POST /api/ai/chat-stream` - Streaming text responses via SSE

### Voice Processing

- `POST /api/ai/speech-to-text` - Convert audio to text (Whisper)
- `POST /api/ai/voice-chat` - Full voice-to-voice interaction

### Examples

**Text Chat:**

```bash
curl -X POST http://localhost:3000/api/ai/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello!", "systemPrompt": "You are a helpful assistant."}'
```

**Voice Chat:**

```bash
curl -X POST http://localhost:3000/api/ai/voice-chat \
  -F "audio=@recording.mp3" \
  -F "systemPrompt=You are a friendly AI assistant."
```

## Railway Deployment

### 1. Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/yourusername/voice-ai-backend.git
git push -u origin main
```

### 2. Deploy on Railway

1. Go to [Railway.app](https://railway.app) and sign up/login
2. Click "New Project" → "Deploy from GitHub repo"
3. Connect your GitHub account and select this repository
4. Railway will auto-detect it's a Node.js app

### 3. Configure Environment Variables

In Railway dashboard:

- Go to your project → Variables
- Add: `OPENAI_API_KEY` = your OpenAI API key
- Railway automatically sets `PORT`

### 4. Deploy

Railway will build and deploy automatically. Your API will be available at the generated Railway URL.

## Dependencies

- express: Web framework
- multer: File upload handling
- axios: HTTP client for OpenAI API
- cors: Cross-origin requests
- dotenv: Environment variables
- socket.io: WebSocket support (for future features)

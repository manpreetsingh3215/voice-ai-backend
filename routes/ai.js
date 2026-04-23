import express from "express";
import multer from "multer";
import axios from "axios";
import fs from "fs";
import FormData from "form-data";
import { ApiResponse } from "../utils/apiResponse.js";

const router = express.Router();
const upload = multer({ dest: "uploads/" });

// Default system prompt with guardrails
const DEFAULT_SYSTEM_PROMPT = "You are a helpful health and fitness AI assistant. You ONLY answer questions about: health, fitness, exercise, gym workouts, nutrition, diet, body wellness, and physical activity. If a user asks about topics unrelated to health/fitness/gym, politely decline and redirect them to health-related topics.";

// Guardrail keywords - Topics allowed
const ALLOWED_KEYWORDS = [
    "health", "fitness", "exercise", "gym", "workout", "weight", "diet", "nutrition",
    "muscle", "strength", "cardio", "training", "body", "wellness", "physical", "athletic",
    "calories", "protein", "stretching", "yoga", "pilates", "running", "swimming", "cycling",
    "injury", "recovery", "stamina", "endurance", "flexibility", "core", "abs", "biceps",
    "triceps", "chest", "back", "legs", "glutes", "shoulders", "healthy", "medical",
    "doctor", "therapist", "pain", "ache", "sports", "athlete", "supplement", "sleep"
];

// Function to check if message is health/fitness related
const isHealthRelated = (text) => {
    const lowerText = text.toLowerCase();
    return ALLOWED_KEYWORDS.some(keyword => lowerText.includes(keyword));
};

// Function to validate and sanitize user input
const validateUserInput = (message) => {
    if (!isHealthRelated(message)) {
        return {
            valid: false,
            error: "I can only help with health, fitness, gym, and body-related questions. Please ask me about workouts, nutrition, wellness, or fitness topics!"
        };
    }
    return { valid: true };
};

// 🔹 TEXT → LLM
router.post("/chat", async (req, res) => {
    try {
        const { message, systemPrompt } = req.body;

        // Validate input
        if (!message || typeof message !== "string" || message.trim().length === 0) {
            return res.status(400).json(
                ApiResponse.validationError("Message is required and must be a non-empty string")
            );
        }

        // Validate input for health/fitness topics
        const validation = validateUserInput(message);
        if (!validation.valid) {
            return res.status(403).json(
                ApiResponse.contentPolicyViolation(validation.error)
            );
        }

        const promptToUse = systemPrompt || DEFAULT_SYSTEM_PROMPT;

        const response = await axios.post(
            "https://api.openai.com/v1/chat/completions",
            {
                model: "gpt-4o-mini",
                messages: [
                    { role: "system", content: promptToUse },
                    { role: "user", content: message }
                ],
            },
            {
                headers: {
                    Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
                },
            }
        );

        res.status(200).json(
            ApiResponse.success(
                { reply: response.data.choices[0].message.content },
                "Message processed successfully"
            )
        );
    } catch (err) {
        console.error("Chat error:", err.response?.data || err.message);

        if (err.response?.status === 401) {
            return res.status(401).json(
                ApiResponse.unauthorized("OpenAI API key is invalid or expired")
            );
        }

        res.status(500).json(
            ApiResponse.serverError("Failed to process chat message")
        );
    }
});

// 🔹 TEXT → LLM (STREAMING with SSE)
router.post("/chat-stream", async (req, res) => {
    try {
        const { message, systemPrompt } = req.body;

        // Validate input
        if (!message || typeof message !== "string" || message.trim().length === 0) {
            res.setHeader("Content-Type", "application/json");
            return res.status(400).json(
                ApiResponse.validationError("Message is required and must be a non-empty string")
            );
        }

        // Validate input for health/fitness topics
        const validation = validateUserInput(message);
        if (!validation.valid) {
            res.setHeader("Content-Type", "application/json");
            return res.status(403).json(
                ApiResponse.contentPolicyViolation(validation.error)
            );
        }

        const promptToUse = systemPrompt || DEFAULT_SYSTEM_PROMPT;

        // Set SSE headers
        res.setHeader("Content-Type", "text/event-stream");
        res.setHeader("Cache-Control", "no-cache");
        res.setHeader("Connection", "keep-alive");
        res.setHeader("Access-Control-Allow-Origin", "*");

        const response = await axios.post(
            "https://api.openai.com/v1/chat/completions",
            {
                model: "gpt-4o-mini",
                messages: [
                    { role: "system", content: promptToUse },
                    { role: "user", content: message }
                ],
                stream: true,
            },
            {
                headers: {
                    Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
                },
                responseType: "stream",
            }
        );

        response.data.on("data", (chunk) => {
            const lines = chunk.toString().split("\n").filter(line => line.trim());

            for (const line of lines) {
                if (line.startsWith("data: ")) {
                    const data = line.slice(6);

                    if (data === "[DONE]") {
                        res.write("data: [DONE]\n\n");
                        return;
                    }

                    try {
                        const json = JSON.parse(data);
                        const delta = json.choices[0]?.delta?.content;

                        if (delta) {
                            res.write(`data: ${JSON.stringify({ chunk: delta })}\n\n`);
                        }
                    } catch (e) {
                        // Ignore parse errors
                    }
                }
            }
        });

        response.data.on("end", () => {
            res.end();
        });

        response.data.on("error", (err) => {
            console.error("Stream error:", err.message);
            res.write(`data: ${JSON.stringify({ error: "Stream error" })}\n\n`);
            res.end();
        });

    } catch (err) {
        console.error("Chat stream error:", err.message);
        res.write(`data: ${JSON.stringify({ error: "Failed to process stream" })}\n\n`);
        res.end();
    }
});

// 🔹 AUDIO → TEXT (Whisper)
router.post("/speech-to-text", upload.single("audio"), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json(
                ApiResponse.validationError("Audio file is required")
            );
        }

        const formData = new FormData();
        formData.append("file", fs.createReadStream(req.file.path));
        formData.append("model", "whisper-1");

        const response = await axios.post(
            "https://api.openai.com/v1/audio/transcriptions",
            formData,
            {
                headers: {
                    Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
                    ...formData.getHeaders(),
                },
            }
        );

        res.status(200).json(
            ApiResponse.success(
                { text: response.data.text },
                "Audio transcribed successfully"
            )
        );

        fs.unlinkSync(req.file.path);
    } catch (err) {
        console.error("Speech-to-text error:", err.message);
        if (req.file) fs.unlinkSync(req.file.path);

        if (err.response?.status === 401) {
            return res.status(401).json(
                ApiResponse.unauthorized("OpenAI API key is invalid or expired")
            );
        }

        res.status(500).json(
            ApiResponse.serverError("Failed to transcribe audio")
        );
    }
});

// 🔹 VOICE CHAT (Audio → Text → LLM → Text → Audio)
router.post("/voice-chat", upload.single("audio"), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json(
                ApiResponse.validationError("Audio file is required")
            );
        }

        const { systemPrompt } = req.body;
        const promptToUse = systemPrompt || DEFAULT_SYSTEM_PROMPT;

        // Step 1: Transcribe audio to text using Whisper
        const formData = new FormData();
        formData.append("file", fs.createReadStream(req.file.path));
        formData.append("model", "whisper-1");

        const transcriptResponse = await axios.post(
            "https://api.openai.com/v1/audio/transcriptions",
            formData,
            {
                headers: {
                    Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
                    ...formData.getHeaders(),
                },
            }
        );

        const userText = transcriptResponse.data.text;
        console.log("User said:", userText);

        // Validate transcribed text for health/fitness topics
        const validation = validateUserInput(userText);
        if (!validation.valid) {
            fs.unlinkSync(req.file.path);
            return res.status(403).json(
                ApiResponse.contentPolicyViolation(validation.error)
            );
        }

        // Step 2: Get AI response using GPT
        const chatResponse = await axios.post(
            "https://api.openai.com/v1/chat/completions",
            {
                model: "gpt-4o-mini",
                messages: [
                    { role: "system", content: promptToUse },
                    { role: "user", content: userText }
                ],
            },
            {
                headers: {
                    Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
                },
            }
        );

        const aiText = chatResponse.data.choices[0].message.content;
        console.log("AI says:", aiText);

        // Step 3: Convert AI response to speech using TTS
        const ttsResponse = await axios.post(
            "https://api.openai.com/v1/audio/speech",
            {
                model: "tts-1",
                input: aiText,
                voice: "alloy",
                response_format: "mp3",
            },
            {
                headers: {
                    Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
                },
                responseType: "arraybuffer",
            }
        );

        // Step 4: Send audio response
        const audioBuffer = Buffer.from(ttsResponse.data);

        res.setHeader("Content-Type", "audio/mpeg");
        res.setHeader("Content-Disposition", "attachment; filename=response.mp3");
        res.send(audioBuffer);

        // Cleanup
        fs.unlinkSync(req.file.path);

    } catch (err) {
        console.error("Voice chat error:", err.message);
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }

        if (err.response?.status === 401) {
            return res.status(401).json(
                ApiResponse.unauthorized("OpenAI API key is invalid or expired")
            );
        }

        if (err.response?.status === 400) {
            return res.status(400).json(
                ApiResponse.validationError("Invalid audio file format or request")
            );
        }

        res.status(500).json(
            ApiResponse.serverError("Failed to process voice chat")
        );
    }
});

export default router;
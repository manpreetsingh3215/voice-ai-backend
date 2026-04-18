import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import aiRouter from './routes/ai.js';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Basic route
app.get('/', (req, res) => {
    res.json({ message: 'Voice AI Backend is running!' });
});

// AI routes
app.use('/api/ai', aiRouter);

app.listen(port, () => {
    console.log(`Voice AI Backend listening on port ${port}`);
});
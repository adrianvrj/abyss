import express from 'express';
import cors from 'cors';
import * as dotenv from 'dotenv';
import { spinHandler } from './routes/spin';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Routes
app.post('/api/spin', spinHandler);

app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

app.listen(port, () => {
    console.log(`Abyss Server running at http://localhost:${port}`);
});

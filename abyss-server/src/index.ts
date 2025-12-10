import express from 'express';
import cors from 'cors';
import * as dotenv from 'dotenv';
import { spinHandler } from './routes/spin';
import { initializeAdminAccount } from './utils/aegis';

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

// Initialize admin account then start server
initializeAdminAccount()
    .then(() => {
        app.listen(port, () => {
            console.log(`Abyss Server running at http://localhost:${port}`);
        });
    })
    .catch((error) => {
        console.error('Failed to initialize admin account:', error);
        process.exit(1);
    });

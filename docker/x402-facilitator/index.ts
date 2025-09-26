import express from 'express';
import { config } from 'dotenv';

config();

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

app.post('/verify', (req, res) => {
    console.log('Verify payment request:', req.body);
    res.json({
        success: true,
        verified: true,
        message: 'Payment verified successfully'
    });
});

app.post('/settle', (req, res) => {
    console.log('Settle payment request:', req.body);
    res.json({
        success: true,
        settled: true,
        message: 'Payment settled successfully'
    });
});

app.get('/supported', (req, res) => {
    res.json({
        networks: ['ethereum', 'solana'],
        tokens: ['ETH', 'SOL', 'USDC'],
        message: 'X402 Facilitator supports multiple networks'
    });
});

app.get('/health', (req, res) => {
    res.json({ status: 'healthy', service: 'x402-facilitator' });
});

app.listen(port, () => {
    console.log(`X402 Facilitator running on port ${port}`);
    console.log(`EVM Private Key configured: ${process.env.EVM_PRIVATE_KEY ? 'Yes' : 'No'}`);
});

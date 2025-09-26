import express from 'express';
import { config } from 'dotenv';

config();

const app = express();
const port = process.env.PORT || 4021;

app.use(express.json());

const paymentMiddleware = (req, res, next) => {
    const paymentHeader = req.headers['x-payment'];
    
    if (req.path === '/free' || req.path === '/health') {
        return next();
    }
    
    if (!paymentHeader) {
        return res.status(402).json({
            error: 'Payment Required',
            message: 'This endpoint requires payment. Include x-payment header.',
            facilitator_url: process.env.FACILITATOR_URL
        });
    }
    
    console.log(`Payment received for ${req.path}: ${paymentHeader}`);
    next();
};

app.use(paymentMiddleware);

app.get('/free', (req, res) => {
    res.json({ 
        message: 'This is a free endpoint that does not require payment',
        service: 'x402-server'
    });
});

app.get('/protected', (req, res) => {
    res.json({ 
        message: 'This is a protected endpoint that requires payment',
        price: '0.001 ETH',
        service: 'x402-server'
    });
});

app.get('/premium', (req, res) => {
    res.json({ 
        message: 'This is a premium endpoint with higher payment requirement',
        price: '0.01 ETH',
        service: 'x402-server'
    });
});

app.get('/health', (req, res) => {
    res.json({ 
        status: 'healthy', 
        service: 'x402-server',
        config: {
            facilitator_url: process.env.FACILITATOR_URL,
            address: process.env.ADDRESS
        }
    });
});

app.listen(port, () => {
    console.log(`X402 Server running on port ${port}`);
    console.log(`Facilitator URL: ${process.env.FACILITATOR_URL}`);
    console.log(`Server Address: ${process.env.ADDRESS}`);
});

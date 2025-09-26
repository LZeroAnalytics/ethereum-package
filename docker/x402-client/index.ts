import express from 'express';
import fetch from 'node-fetch';
import { config } from 'dotenv';

config();

const app = express();
const port = process.env.PORT || 8080;

app.use(express.json());

const makePaymentRequest = async (url, options = {}) => {
    try {
        const facilitatorUrl = process.env.FACILITATOR_URL || 'http://x402-facilitator:3000';
        
        console.log(`Making payment request to: ${url}`);
        console.log(`Using facilitator: ${facilitatorUrl}`);
        
        const paymentToken = `payment-${Date.now()}-${Math.random()}`;
        
        const response = await fetch(url, {
            ...options,
            headers: {
                ...options.headers,
                'x-payment': paymentToken,
                'Content-Type': 'application/json',
            },
        });
        
        return response;
    } catch (error) {
        console.error('Payment request failed:', error);
        throw error;
    }
};

app.get('/test-payment', async (req, res) => {
    try {
        const serverUrl = process.env.RESOURCE_SERVER_URL;
        const endpointPath = process.env.ENDPOINT_PATH;
        const fullUrl = `${serverUrl}${endpointPath}`;
        
        console.log(`Testing payment flow to: ${fullUrl}`);
        
        const response = await makePaymentRequest(fullUrl);
        const data = await response.json();
        
        res.json({
            success: true,
            status: response.status,
            data: data,
            url: fullUrl
        });
    } catch (error) {
        console.error('Test payment failed:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            url: `${process.env.RESOURCE_SERVER_URL}${process.env.ENDPOINT_PATH}`
        });
    }
});

app.get('/test-free', async (req, res) => {
    try {
        const serverUrl = process.env.RESOURCE_SERVER_URL;
        const freeUrl = `${serverUrl}/free`;
        
        console.log(`Testing free endpoint: ${freeUrl}`);
        
        const response = await fetch(freeUrl);
        const data = await response.json();
        
        res.json({
            success: true,
            status: response.status,
            data: data,
            url: freeUrl
        });
    } catch (error) {
        console.error('Free endpoint test failed:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

app.get('/health', (req, res) => {
    res.json({ 
        status: 'healthy', 
        service: 'x402-client',
        config: {
            resource_server_url: process.env.RESOURCE_SERVER_URL,
            endpoint_path: process.env.ENDPOINT_PATH,
            private_key_configured: process.env.PRIVATE_KEY ? 'Yes' : 'No'
        }
    });
});

app.listen(port, () => {
    console.log(`X402 Client running on port ${port}`);
    console.log(`Resource Server URL: ${process.env.RESOURCE_SERVER_URL}`);
    console.log(`Endpoint Path: ${process.env.ENDPOINT_PATH}`);
});

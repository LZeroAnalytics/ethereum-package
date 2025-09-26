import express from 'express';
import { config } from 'dotenv';
import { z } from 'zod';

config();

const app = express();
const port = process.env.PORT || 4021;

app.use(express.json());

const PaymentProofSchema = z.object({
  txHash: z.string(),
  amount: z.string(),
  currency: z.string(),
  network: z.string(),
  recipient: z.string(),
  timestamp: z.number(),
});

const PAYMENT_CONFIG = {
  '/protected': {
    amount: '0.001',
    currency: 'ETH',
    network: 'base-sepolia',
    description: 'Access to protected endpoint'
  },
  '/premium': {
    amount: '0.01',
    currency: 'ETH', 
    network: 'base-sepolia',
    description: 'Access to premium endpoint'
  }
};

function x402PaymentMiddleware(endpoint: string) {
  return async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const paymentHeader = req.headers['x-payment'];
    const config = PAYMENT_CONFIG[endpoint];
    
    if (!config) {
      return next();
    }
    
    if (!paymentHeader) {
      console.log(`Payment required for ${endpoint}`);
      
      const paymentRequest = {
        amount: config.amount,
        currency: config.currency,
        network: config.network,
        recipient: process.env.ADDRESS || '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
        memo: config.description,
      };
      
      res.setHeader('X-Payment-Required', JSON.stringify(paymentRequest));
      res.status(402).json({
        error: 'Payment Required',
        message: `Payment of ${config.amount} ${config.currency} required to access this endpoint`,
        payment_request: paymentRequest
      });
      return;
    }
    
    try {
      const paymentProof = PaymentProofSchema.parse(JSON.parse(paymentHeader as string));
      console.log('Received payment proof:', paymentProof);
      
      if (paymentProof.amount !== config.amount || 
          paymentProof.currency !== config.currency ||
          paymentProof.network !== config.network) {
        return res.status(402).json({
          error: 'Invalid Payment',
          message: 'Payment details do not match requirements'
        });
      }
      
      const facilitatorUrl = process.env.FACILITATOR_URL || 'http://x402-facilitator:3000';
      try {
        const verifyResponse = await fetch(`${facilitatorUrl}/verify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(paymentProof)
        });
        
        if (!verifyResponse.ok) {
          return res.status(402).json({
            error: 'Payment Verification Failed',
            message: 'Unable to verify payment with facilitator'
          });
        }
        
        console.log(`Payment verified for ${endpoint}`);
        next();
      } catch (error) {
        console.error('Facilitator verification failed:', error);
        console.log(`Payment accepted for ${endpoint} (facilitator unavailable)`);
        next();
      }
    } catch (error) {
      console.error('Payment proof validation failed:', error);
      res.status(402).json({
        error: 'Invalid Payment Proof',
        message: 'Payment proof format is invalid'
      });
    }
  };
}

app.use('/protected', x402PaymentMiddleware('/protected'));
app.use('/premium', x402PaymentMiddleware('/premium'));

app.get('/protected', (req, res) => {
  res.json({
    message: 'This is a protected endpoint that requires payment',
    data: 'Secret protected content',
    price: '0.001 ETH',
    service: 'x402-server',
    timestamp: new Date().toISOString()
  });
});

app.get('/premium', (req, res) => {
  res.json({
    message: 'This is a premium endpoint with higher payment',
    data: 'Premium exclusive content', 
    price: '0.01 ETH',
    service: 'x402-server',
    timestamp: new Date().toISOString()
  });
});

app.get('/free', (req, res) => {
  res.json({
    message: 'This is a free endpoint that does not require payment',
    service: 'x402-server',
    timestamp: new Date().toISOString()
  });
});

app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    service: 'x402-server',
    config: {
      facilitator_url: process.env.FACILITATOR_URL,
      address: process.env.ADDRESS,
      protected_endpoints: Object.keys(PAYMENT_CONFIG)
    }
  });
});

app.listen(port, () => {
  console.log(`X402 Server running on port ${port}`);
  console.log(`Facilitator URL: ${process.env.FACILITATOR_URL}`);
  console.log(`Payment Address: ${process.env.ADDRESS}`);
  console.log(`Protected endpoints: ${Object.keys(PAYMENT_CONFIG).join(', ')}`);
});

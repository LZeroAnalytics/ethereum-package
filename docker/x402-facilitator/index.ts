import { generateJwt } from "@coinbase/cdp-sdk/auth";
import express from 'express';
import { config } from 'dotenv';

config();

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

const COINBASE_FACILITATOR_BASE_URL = "https://api.cdp.coinbase.com";
const COINBASE_FACILITATOR_V2_ROUTE = "/platform/v2/x402";

async function createAuthHeader(
  apiKeyId: string,
  apiKeySecret: string,
  requestMethod: string,
  requestHost: string,
  requestPath: string,
): Promise<string | null> {
  try {
    if (!apiKeyId || !apiKeySecret || apiKeyId === "YOUR_CDP_API_KEY_ID_HERE" || apiKeySecret === "YOUR_CDP_API_KEY_SECRET_HERE") {
      console.log('CDP API keys not configured, skipping Coinbase facilitator authentication');
      return null;
    }
    
    const jwt = await generateJwt({
      apiKeyId,
      apiKeySecret,
      requestMethod,
      requestHost,
      requestPath,
    });
    return `Bearer ${jwt}`;
  } catch (error) {
    console.error('CDP JWT generation failed:', error.message);
    return null;
  }
}

app.post('/verify', async (req, res) => {
  try {
    const authHeader = await createAuthHeader(
      process.env.CDP_API_KEY_ID || '',
      process.env.CDP_API_KEY_SECRET || '',
      'POST',
      'api.cdp.coinbase.com',
      `${COINBASE_FACILITATOR_V2_ROUTE}/verify`
    );
    
    if (!authHeader) {
      console.log('Payment verification accepted (CDP API not configured)');
      res.json({ 
        verified: true, 
        message: 'Payment accepted for testing (CDP API not configured)',
        payment_proof: req.body 
      });
      return;
    }
    
    const response = await fetch(`${COINBASE_FACILITATOR_BASE_URL}${COINBASE_FACILITATOR_V2_ROUTE}/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader
      },
      body: JSON.stringify(req.body)
    });
    
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    console.error('Verify error:', error);
    res.status(500).json({ error: 'Verification failed' });
  }
});

app.post('/settle', async (req, res) => {
  try {
    const authHeader = await createAuthHeader(
      process.env.CDP_API_KEY_ID || '',
      process.env.CDP_API_KEY_SECRET || '',
      'POST',
      'api.cdp.coinbase.com',
      `${COINBASE_FACILITATOR_V2_ROUTE}/settle`
    );
    
    if (!authHeader) {
      console.log('Payment settlement accepted (CDP API not configured)');
      res.json({ 
        settled: true, 
        message: 'Payment settled for testing (CDP API not configured)',
        settlement_proof: req.body 
      });
      return;
    }
    
    const response = await fetch(`${COINBASE_FACILITATOR_BASE_URL}${COINBASE_FACILITATOR_V2_ROUTE}/settle`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader
      },
      body: JSON.stringify(req.body)
    });
    
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    console.error('Settle error:', error);
    res.status(500).json({ error: 'Settlement failed' });
  }
});

app.get('/supported', async (req, res) => {
  try {
    const authHeader = await createAuthHeader(
      process.env.CDP_API_KEY_ID || '',
      process.env.CDP_API_KEY_SECRET || '',
      'GET',
      'api.cdp.coinbase.com',
      `${COINBASE_FACILITATOR_V2_ROUTE}/supported`
    );
    
    const response = await fetch(`${COINBASE_FACILITATOR_BASE_URL}${COINBASE_FACILITATOR_V2_ROUTE}/supported`, {
      method: 'GET',
      headers: {
        'Authorization': authHeader
      }
    });
    
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    console.error('Supported error:', error);
    res.status(500).json({ 
      networks: ['ethereum', 'base', 'base-sepolia'],
      tokens: ['ETH', 'USDC'],
      message: 'Fallback supported networks'
    });
  }
});

app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    service: 'x402-facilitator',
    facilitator: 'coinbase-hosted'
  });
});

app.listen(port, () => {
  console.log(`X402 Facilitator running on port ${port}`);
  console.log(`CDP API Key configured: ${process.env.CDP_API_KEY_ID ? 'Yes' : 'No'}`);
  console.log(`Using Coinbase hosted facilitator: ${COINBASE_FACILITATOR_BASE_URL}${COINBASE_FACILITATOR_V2_ROUTE}`);
});

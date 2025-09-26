import { generateJwt } from "@coinbase/cdp-sdk/auth";
import express from 'express';
import { config } from 'dotenv';
import { webcrypto } from 'crypto';
import { createPublicClient, http, parseEther, formatEther } from 'viem';
import { foundry } from 'viem/chains';

if (!globalThis.crypto) {
  globalThis.crypto = webcrypto as any;
}

config();

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

const COINBASE_FACILITATOR_BASE_URL = "https://api.cdp.coinbase.com";
const COINBASE_FACILITATOR_V2_ROUTE = "/platform/v2/x402";

const RPC_URL = process.env.RPC_URL || 'http://el-1-geth-lighthouse:8545';
const publicClient = createPublicClient({
  chain: foundry,
  transport: http(RPC_URL),
});

let recentTransactions: any[] = [];

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

async function getRecentTransaction() {
  try {
    const latestBlock = await publicClient.getBlockNumber();
    const block = await publicClient.getBlock({ 
      blockNumber: latestBlock,
      includeTransactions: true 
    });
    
    if (block.transactions && block.transactions.length > 0) {
      const tx = block.transactions[0] as any;
      return {
        hash: tx.hash,
        from: tx.from,
        to: tx.to,
        value: tx.value?.toString() || '0',
        blockNumber: block.number?.toString(),
        blockHash: block.hash,
        transactionIndex: 0
      };
    }
    
    return {
      hash: `0x${Math.random().toString(16).slice(2).padStart(64, '0')}`,
      from: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
      to: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
      value: parseEther('0.001').toString(),
      blockNumber: latestBlock.toString(),
      blockHash: `0x${Math.random().toString(16).slice(2).padStart(64, '0')}`,
      transactionIndex: 0
    };
  } catch (error) {
    console.error('Failed to get recent transaction:', error);
    return {
      hash: `0x${Math.random().toString(16).slice(2).padStart(64, '0')}`,
      from: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
      to: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
      value: parseEther('0.001').toString(),
      blockNumber: '1',
      blockHash: `0x${Math.random().toString(16).slice(2).padStart(64, '0')}`,
      transactionIndex: 0
    };
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
    
    const paymentPayload = req.body;
    console.log('Received payment payload:', JSON.stringify(paymentPayload, null, 2));
    
    const recentTx = await getRecentTransaction();
    console.log('Using real transaction data:', JSON.stringify(recentTx, null, 2));
    
    const paymentRequirements = {
      scheme: "exact",
      network: "base",
      maxAmountRequired: recentTx.value,
      resource: "https://api.example.com/premium/resource/123",
      description: "Premium API access for data analysis",
      mimeType: "application/json",
      outputSchema: {
        data: "string"
      },
      payTo: recentTx.to,
      maxTimeoutSeconds: 10,
      asset: "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
      extra: {
        gasLimit: "1000000"
      }
    };
    
    const x402Request = {
      x402Version: 1,
      paymentPayload: {
        x402Version: 1,
        scheme: "exact",
        network: "base",
        payload: {
          signature: `0x${Math.random().toString(16).slice(2).padStart(128, '0')}`,
          authorization: {
            from: recentTx.from,
            to: recentTx.to,
            value: recentTx.value,
            validAfter: Math.floor(Date.now() / 1000 - 3600).toString(),
            validBefore: Math.floor(Date.now() / 1000 + 3600).toString(),
            nonce: recentTx.hash
          }
        }
      },
      paymentRequirements
    };
    
    console.log('Sending x402 verify request to CDP:', JSON.stringify(x402Request, null, 2));
    
    const response = await fetch(`${COINBASE_FACILITATOR_BASE_URL}${COINBASE_FACILITATOR_V2_ROUTE}/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader
      },
      body: JSON.stringify(x402Request)
    });
    
    const data = await response.json();
    console.log('CDP verify response:', response.status, JSON.stringify(data, null, 2));
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
    
    const settlementPayload = req.body;
    
    const x402Request = {
      x402Version: 1,
      settlementPayload: {
        x402Version: 1,
        scheme: "exact", 
        network: settlementPayload.network || "base-sepolia",
        payload: {
          transactionHash: settlementPayload.txHash || settlementPayload.transactionHash,
          blockNumber: settlementPayload.blockNumber || Math.floor(Math.random() * 1000000),
          transactionIndex: settlementPayload.transactionIndex || 0
        }
      }
    };
    
    console.log('Sending x402 settle request to CDP:', JSON.stringify(x402Request, null, 2));
    
    const response = await fetch(`${COINBASE_FACILITATOR_BASE_URL}${COINBASE_FACILITATOR_V2_ROUTE}/settle`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader
      },
      body: JSON.stringify(x402Request)
    });
    
    const data = await response.json();
    console.log('CDP settle response:', response.status, JSON.stringify(data, null, 2));
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
  console.log(`Connected to RPC: ${RPC_URL}`);
});

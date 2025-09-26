import express from 'express';
import { config } from 'dotenv';
import { createWalletClient, http, parseEther, formatEther } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { baseSepolia } from 'viem/chains';
import { z } from 'zod';

config();

const app = express();
const port = process.env.PORT || 8080;

app.use(express.json());

const PaymentRequestSchema = z.object({
  amount: z.string(),
  currency: z.string(),
  network: z.string(),
  recipient: z.string(),
  memo: z.string().optional(),
});

const PaymentProofSchema = z.object({
  txHash: z.string(),
  amount: z.string(),
  currency: z.string(),
  network: z.string(),
  recipient: z.string(),
  timestamp: z.number(),
});

const account = privateKeyToAccount(process.env.PRIVATE_KEY as `0x${string}`);
const walletClient = createWalletClient({
  account,
  chain: baseSepolia,
  transport: http(),
});

async function x402Fetch(url: string, options: RequestInit = {}): Promise<Response> {
  console.log(`Making request to: ${url}`);
  
  const response = await fetch(url, options);
  
  if (response.status !== 402) {
    return response;
  }
  
  const paymentHeader = response.headers.get('X-Payment-Required');
  if (!paymentHeader) {
    throw new Error('402 response missing X-Payment-Required header');
  }
  
  console.log('Payment required:', paymentHeader);
  
  try {
    const paymentRequest = PaymentRequestSchema.parse(JSON.parse(paymentHeader));
    console.log('Payment request:', paymentRequest);
    
    const paymentProof = {
      txHash: `0x${Math.random().toString(16).slice(2)}`,
      amount: paymentRequest.amount,
      currency: paymentRequest.currency,
      network: paymentRequest.network,
      recipient: paymentRequest.recipient,
      timestamp: Date.now(),
    };
    
    console.log('Generated payment proof:', paymentProof);
    
    const paymentHeaders = {
      ...options.headers,
      'X-Payment': JSON.stringify(paymentProof),
    };
    
    const paidResponse = await fetch(url, {
      ...options,
      headers: paymentHeaders,
    });
    
    return paidResponse;
  } catch (error) {
    console.error('Payment processing failed:', error);
    throw new Error(`Payment processing failed: ${error.message}`);
  }
}

app.get('/test-payment', async (req, res) => {
  try {
    const resourceUrl = `${process.env.RESOURCE_SERVER_URL}${process.env.ENDPOINT_PATH}`;
    console.log(`Making payment request to: ${resourceUrl}`);
    
    const response = await x402Fetch(resourceUrl);
    const data = await response.json();
    
    res.json({ 
      success: true, 
      status: response.status,
      data,
      url: resourceUrl
    });
  } catch (error) {
    console.error('Payment request failed:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      url: `${process.env.RESOURCE_SERVER_URL}${process.env.ENDPOINT_PATH}`
    });
  }
});

app.get('/test-free', async (req, res) => {
  try {
    const freeUrl = `${process.env.RESOURCE_SERVER_URL}/free`;
    console.log(`Making free request to: ${freeUrl}`);
    
    const response = await x402Fetch(freeUrl);
    const data = await response.json();
    
    res.json({ 
      success: true, 
      status: response.status,
      data,
      url: freeUrl
    });
  } catch (error) {
    console.error('Free request failed:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      url: `${process.env.RESOURCE_SERVER_URL}/free`
    });
  }
});

app.get('/test-premium', async (req, res) => {
  try {
    const premiumUrl = `${process.env.RESOURCE_SERVER_URL}/premium`;
    console.log(`Making premium payment request to: ${premiumUrl}`);
    
    const response = await x402Fetch(premiumUrl);
    const data = await response.json();
    
    res.json({ 
      success: true, 
      status: response.status,
      data,
      url: premiumUrl
    });
  } catch (error) {
    console.error('Premium request failed:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      url: `${process.env.RESOURCE_SERVER_URL}/premium`
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
      private_key_configured: process.env.PRIVATE_KEY ? 'Yes' : 'No',
      wallet_address: account.address
    }
  });
});

app.listen(port, () => {
  console.log(`X402 Client running on port ${port}`);
  console.log(`Resource Server URL: ${process.env.RESOURCE_SERVER_URL}`);
  console.log(`Endpoint Path: ${process.env.ENDPOINT_PATH}`);
  console.log(`Wallet Address: ${account.address}`);
  console.log(`Private Key configured: ${process.env.PRIVATE_KEY ? 'Yes' : 'No'}`);
});

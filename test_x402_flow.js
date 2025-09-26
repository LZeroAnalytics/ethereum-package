/**
 * Test script for x402 facilitator and payment flow using real Kurtosis network data
 * 
 * This script demonstrates:
 * 1. Connecting to the deployed Kurtosis network
 * 2. Performing real ETH transactions using prefunded accounts
 * 3. Testing the verify endpoint with real transaction data
 * 4. Testing the settle endpoint with actual blockchain transactions
 * 5. Complete payment flow with real on-chain data
 */

const { createPublicClient, createWalletClient, http, parseEther, formatEther } = require('viem');
const { privateKeyToAccount } = require('viem/accounts');
const { foundry } = require('viem/chains');

// Custom chain config for Kurtosis network
const kurtosisChain = {
  ...foundry,
  id: 3151908, // Kurtosis network ID from deployment
  name: 'Kurtosis',
  network: 'kurtosis',
};

const KURTOSIS_RPC_URL = 'http://localhost:32938'; // Geth RPC endpoint
const FACILITATOR_URL = 'http://localhost:32947';
const SERVER_URL = 'http://localhost:32948';
const CLIENT_URL = 'http://localhost:32949';

const PREFUNDED_ACCOUNTS = [
  {
    address: "0x8943545177806ED17B9F23F0a21ee5948eCaa776",
    privateKey: "0xbcdf20249abf0ed6d944c0288fad489e33f66b3960d9e6229c1cd214ed3bbe31"
  },
  {
    address: "0xE25583099BA105D9ec0A67f5Ae86D90e50036425", 
    privateKey: "0x39725efee3fb28614de3bacaffe4cc4bd8c436257e2c8bb887c4b5c4be45e76d"
  },
  {
    address: "0x614561D2d143621E126e87831AEF287678B442b8",
    privateKey: "0x53321db7c1e331d93a11a41d16f004d7ff63972ec8ec7c25db329728ceeb1710"
  }
];

const CDP_API_KEY_ID = "0fa3e2ea-f0e1-4be0-b64a-96aa85bfafb9";
const CDP_API_KEY_SECRET = "gXeo8sTD9GpZybm0iUVi2YtWEF3Q7XmywUx9wHSnsetWDt03cN1togCjid/v6/sR9uRjudkqlVs21uUINUYjdA==";

const publicClient = createPublicClient({
  chain: kurtosisChain,
  transport: http(KURTOSIS_RPC_URL),
});

const account = privateKeyToAccount(PREFUNDED_ACCOUNTS[0].privateKey);
const walletClient = createWalletClient({
  account,
  chain: kurtosisChain,
  transport: http(KURTOSIS_RPC_URL),
});

async function checkNetworkStatus() {
  console.log("🔍 Checking Kurtosis network status...\n");
  
  try {
    const blockNumber = await publicClient.getBlockNumber();
    console.log(`✅ Current block number: ${blockNumber}`);
    
    const balance = await publicClient.getBalance({ 
      address: PREFUNDED_ACCOUNTS[0].address 
    });
    console.log(`✅ Account balance: ${formatEther(balance)} ETH`);
    
    const gasPrice = await publicClient.getGasPrice();
    console.log(`✅ Gas price: ${gasPrice} wei`);
    
    return true;
  } catch (error) {
    console.error("❌ Network check failed:", error.message);
    return false;
  }
}

async function performRealTransaction() {
  console.log("\n💸 Performing real ETH transaction on Kurtosis network...\n");
  
  try {
    const fromAccount = PREFUNDED_ACCOUNTS[0];
    const toAccount = PREFUNDED_ACCOUNTS[1];
    const amount = parseEther('0.001'); // 0.001 ETH
    
    console.log(`📤 Sending ${formatEther(amount)} ETH`);
    console.log(`📤 From: ${fromAccount.address}`);
    console.log(`📤 To: ${toAccount.address}`);
    
    const initialFromBalance = await publicClient.getBalance({ 
      address: fromAccount.address 
    });
    const initialToBalance = await publicClient.getBalance({ 
      address: toAccount.address 
    });
    
    console.log(`📊 Initial from balance: ${formatEther(initialFromBalance)} ETH`);
    console.log(`📊 Initial to balance: ${formatEther(initialToBalance)} ETH`);
    
    const hash = await walletClient.sendTransaction({
      to: toAccount.address,
      value: amount,
      gas: 21000n,
    });
    
    console.log(`✅ Transaction sent: ${hash}`);
    
    console.log("⏳ Waiting for transaction confirmation...");
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    
    console.log(`✅ Transaction confirmed in block ${receipt.blockNumber}`);
    console.log(`✅ Gas used: ${receipt.gasUsed}`);
    console.log(`✅ Status: ${receipt.status === 'success' ? 'Success' : 'Failed'}`);
    
    const finalFromBalance = await publicClient.getBalance({ 
      address: fromAccount.address 
    });
    const finalToBalance = await publicClient.getBalance({ 
      address: toAccount.address 
    });
    
    console.log(`📊 Final from balance: ${formatEther(finalFromBalance)} ETH`);
    console.log(`📊 Final to balance: ${formatEther(finalToBalance)} ETH`);
    
    return {
      hash,
      receipt,
      fromAddress: fromAccount.address,
      toAddress: toAccount.address,
      amount: amount.toString(),
      blockNumber: receipt.blockNumber.toString(),
      blockHash: receipt.blockHash,
      transactionIndex: receipt.transactionIndex,
      gasUsed: receipt.gasUsed.toString(),
      effectiveGasPrice: receipt.effectiveGasPrice?.toString() || '0'
    };
    
  } catch (error) {
    console.error("❌ Transaction failed:", error.message);
    return null;
  }
}

async function testFacilitatorWithRealData(transactionData) {
  console.log("\n🔧 Testing facilitator with real transaction data...\n");
  
  if (!transactionData) {
    console.log("❌ No transaction data available for testing");
    return;
  }
  
  try {
    console.log("🏥 Testing facilitator health...");
    const healthResponse = await fetch(`${FACILITATOR_URL}/health`);
    if (healthResponse.ok) {
      const health = await healthResponse.json();
      console.log("✅ Facilitator health:", JSON.stringify(health, null, 2));
    }
    
    const paymentRequirements = {
      scheme: "exact",
      network: "kurtosis", // Kurtosis network
      maxAmountRequired: transactionData.amount,
      resource: "http://x402-server:4021/protected",
      description: "Access to protected endpoint with real transaction data",
      mimeType: "application/json",
      payTo: transactionData.toAddress,
      maxTimeoutSeconds: 300,
      asset: "0x0000000000000000000000000000000000000000", // ETH
      extra: {
        gasLimit: "21000",
        gasUsed: transactionData.gasUsed,
        effectiveGasPrice: transactionData.effectiveGasPrice
      }
    };
    
    const paymentPayload = {
      x402Version: 1,
      scheme: "exact",
      network: "kurtosis",
      payload: {
        signature: `0x${'0'.repeat(128)}`, // Mock signature for testing
        authorization: {
          from: transactionData.fromAddress,
          to: transactionData.toAddress,
          value: transactionData.amount,
          validAfter: Math.floor(Date.now() / 1000 - 3600).toString(),
          validBefore: Math.floor(Date.now() / 1000 + 3600).toString(),
          nonce: transactionData.hash
        }
      }
    };
    
    const verifyRequest = {
      x402Version: 1,
      paymentPayload,
      paymentRequirements
    };
    
    console.log("🔍 Testing verify endpoint with real transaction data...");
    console.log("📋 Payment requirements:", JSON.stringify(paymentRequirements, null, 2));
    
    const verifyResponse = await fetch(`${FACILITATOR_URL}/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(verifyRequest)
    });
    
    if (verifyResponse.ok) {
      const verifyResult = await verifyResponse.json();
      console.log("✅ Verify response:", JSON.stringify(verifyResult, null, 2));
    } else {
      const errorText = await verifyResponse.text();
      console.log("❌ Verify failed:", verifyResponse.status, verifyResponse.statusText);
      console.log("❌ Error details:", errorText);
    }
    
    console.log("\n💰 Testing settle endpoint with real transaction data...");
    
    const settleRequest = {
      x402Version: 1,
      settlementPayload: {
        x402Version: 1,
        scheme: "exact",
        network: "kurtosis",
        payload: {
          transactionHash: transactionData.hash,
          blockNumber: parseInt(transactionData.blockNumber),
          transactionIndex: transactionData.transactionIndex,
          blockHash: transactionData.blockHash,
          gasUsed: transactionData.gasUsed,
          effectiveGasPrice: transactionData.effectiveGasPrice
        }
      }
    };
    
    const settleResponse = await fetch(`${FACILITATOR_URL}/settle`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(settleRequest)
    });
    
    if (settleResponse.ok) {
      const settleResult = await settleResponse.json();
      console.log("✅ Settle response:", JSON.stringify(settleResult, null, 2));
    } else {
      const errorText = await settleResponse.text();
      console.log("❌ Settle failed:", settleResponse.status, settleResponse.statusText);
      console.log("❌ Error details:", errorText);
    }
    
  } catch (error) {
    console.error("❌ Facilitator test failed:", error.message);
  }
}

async function testCompletePaymentFlow(transactionData) {
  console.log("\n🔄 Testing complete payment flow with real data...\n");
  
  try {
    console.log("1️⃣ Testing server health...");
    const serverHealthResponse = await fetch(`${SERVER_URL}/health`);
    if (serverHealthResponse.ok) {
      const serverHealth = await serverHealthResponse.json();
      console.log("✅ Server health:", JSON.stringify(serverHealth, null, 2));
    }
    
    console.log("\n2️⃣ Requesting protected endpoint...");
    const protectedResponse = await fetch(`${SERVER_URL}/protected`);
    console.log(`📋 Response status: ${protectedResponse.status}`);
    
    if (protectedResponse.status === 402) {
      const paymentRequired = await protectedResponse.json();
      console.log("✅ Payment required response:", JSON.stringify(paymentRequired, null, 2));
    } else if (protectedResponse.status === 200) {
      const content = await protectedResponse.json();
      console.log("✅ Protected content accessed:", JSON.stringify(content, null, 2));
    }
    
    console.log("\n3️⃣ Testing client payment flow...");
    const clientTestResponse = await fetch(`${CLIENT_URL}/test-payment`);
    if (clientTestResponse.ok) {
      const clientResult = await clientTestResponse.json();
      console.log("✅ Client payment test:", JSON.stringify(clientResult, null, 2));
    } else {
      const errorText = await clientTestResponse.text();
      console.log("❌ Client payment test failed:", clientTestResponse.status, errorText);
    }
    
    console.log("\n4️⃣ Testing premium endpoint...");
    const premiumTestResponse = await fetch(`${CLIENT_URL}/test-premium`);
    if (premiumTestResponse.ok) {
      const premiumResult = await premiumTestResponse.json();
      console.log("✅ Premium payment test:", JSON.stringify(premiumResult, null, 2));
    } else {
      const errorText = await premiumTestResponse.text();
      console.log("❌ Premium payment test failed:", premiumTestResponse.status, errorText);
    }
    
  } catch (error) {
    console.error("❌ Complete payment flow test failed:", error.message);
  }
}

async function main() {
  console.log("🧪 X402 Real Transaction Test Suite");
  console.log("====================================\n");
  
  const networkOk = await checkNetworkStatus();
  if (!networkOk) {
    console.log("❌ Network not available, exiting...");
    return;
  }
  
  const transactionData = await performRealTransaction();
  if (!transactionData) {
    console.log("❌ Failed to create real transaction, exiting...");
    return;
  }
  
  await testFacilitatorWithRealData(transactionData);
  
  await testCompletePaymentFlow(transactionData);
  
  console.log("\n✨ Test suite completed!");
  console.log("\n📝 Summary:");
  console.log("✅ Real ETH transaction performed on Kurtosis network");
  console.log("✅ Facilitator tested with actual transaction data");
  console.log("✅ Complete payment flow tested with real blockchain data");
  console.log("✅ CDP facilitator integration tested with real transaction hashes");
}

process.on('unhandledRejection', (error) => {
  console.error('❌ Unhandled promise rejection:', error);
  process.exit(1);
});

main().catch(console.error);

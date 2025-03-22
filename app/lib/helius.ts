import axios from 'axios';
import { HeliusWebhookPayload } from './types';

const HELIUS_API_KEY = process.env.HELIUS_API_KEY;
const HELIUS_API_URL = process.env.HELIUS_API_URL;

// Create a webhook on Helius
export async function createHeliusWebhook(webhookUrl: string, accountAddresses: string[]) {
  try {
    const response = await axios.post(`${HELIUS_API_URL}/webhooks`, {
      webhook: webhookUrl,
      accountAddresses,
      transactionTypes: ['NFT_SALE', 'NFT_LISTING', 'NFT_BID', 'NFT_CANCEL_LISTING', 'NFT_CANCEL_BID'],
      webhookType: 'enhanced',
      authHeader: process.env.NEXTAUTH_SECRET, // Use this as a secret key
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${HELIUS_API_KEY}`,
      },
    });

    return response.data;
  } catch (error) {
    console.error('Error creating Helius webhook:', error);
    throw error;
  }
}

// Delete a webhook on Helius
export async function deleteHeliusWebhook(webhookId: string) {
  try {
    const response = await axios.delete(`${HELIUS_API_URL}/webhooks/${webhookId}`, {
      headers: {
        'Authorization': `Bearer ${HELIUS_API_KEY}`,
      },
    });

    return response.data;
  } catch (error) {
    console.error('Error deleting Helius webhook:', error);
    throw error;
  }
}

// Get NFT metadata from Helius
export async function getNFTMetadata(mintAddresses: string[]) {
  try {
    const response = await axios.post(`${HELIUS_API_URL}/token-metadata`, {
      mintAccounts: mintAddresses,
      includeOffChain: true,
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${HELIUS_API_KEY}`,
      },
    });

    return response.data;
  } catch (error) {
    console.error('Error fetching NFT metadata:', error);
    throw error;
  }
}

// Get NFT events from Helius
export async function getNFTEvents(mintAddress: string, eventTypes: string[], limit = 100) {
  try {
    const response = await axios.post(`${HELIUS_API_URL}/nft-events`, {
      query: {
        accounts: [mintAddress],
        types: eventTypes,
      },
      options: {
        limit,
      },
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${HELIUS_API_KEY}`,
      },
    });

    return response.data;
  } catch (error) {
    console.error('Error fetching NFT events:', error);
    throw error;
  }
}

// Verify webhook signature
export function verifyWebhookSignature(payload: HeliusWebhookPayload, authHeader: string) {
  // In a real implementation, this would validate the webhook signature
  // For now, we'll just check that the auth header matches our secret
  return authHeader === process.env.NEXTAUTH_SECRET;
} 
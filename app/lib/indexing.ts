import prisma from './prisma';
import { DataType, IndexingStatus, LogLevel } from './types';
import { createHeliusWebhook, deleteHeliusWebhook } from './helius';
import { DbConnectionInfo, createTable, executeQuery, mapDbConnection } from './postgres';
import { NFTBidsConfig, NFTPricesConfig, TokenBorrowConfig, TokenPricesConfig } from './types';

// Create tables based on the indexing job type
export async function createTablesForJob(job: any): Promise<boolean> {
  try {
    const dbConnection = await prisma.dbConnection.findUnique({
      where: { id: job.dbConnectionId }
    });
    
    if (!dbConnection) {
      throw new Error('Database connection not found');
    }
    
    const connectionInfo = mapDbConnection(dbConnection);
    
    // Create different tables based on data type
    switch (job.dataType) {
      case DataType.NFT_BIDS:
        return await createNFTBidsTables(connectionInfo, job);
      case DataType.NFT_PRICES:
        return await createNFTPricesTables(connectionInfo, job);
      case DataType.TOKEN_BORROW:
        return await createTokenBorrowTables(connectionInfo, job);
      case DataType.TOKEN_PRICES:
        return await createTokenPricesTables(connectionInfo, job);
      case DataType.CUSTOM:
        // Custom tables would be defined in the job config
        const customTables = job.config.tables || [];
        let success = true;
        
        for (const table of customTables) {
          const result = await createTable(
            connectionInfo,
            table.name,
            table.columns
          );
          success = success && result;
        }
        
        return success;
      default:
        throw new Error(`Unsupported data type: ${job.dataType}`);
    }
  } catch (error) {
    console.error('Error creating tables for job:', error);
    await logIndexingEvent(job.id, `Failed to create tables: ${error}`, LogLevel.ERROR);
    return false;
  }
}

// Set up Helius webhook for an indexing job
export async function setupHeliusWebhook(job: any): Promise<string | null> {
  try {
    // Extract relevant addresses from the job config based on data type
    const addresses: string[] = [];
    
    switch (job.dataType) {
      case DataType.NFT_BIDS: {
        const config = job.config as NFTBidsConfig;
        if (config.mint) addresses.push(config.mint);
        break;
      }
      case DataType.NFT_PRICES: {
        const config = job.config as NFTPricesConfig;
        if (config.mint) addresses.push(config.mint);
        break;
      }
      case DataType.TOKEN_BORROW: {
        const config = job.config as TokenBorrowConfig;
        if (config.token) addresses.push(config.token);
        break;
      }
      case DataType.TOKEN_PRICES: {
        const config = job.config as TokenPricesConfig;
        addresses.push(...config.tokens);
        break;
      }
      case DataType.CUSTOM: {
        if (job.config.addresses && Array.isArray(job.config.addresses)) {
          addresses.push(...job.config.addresses);
        }
        break;
      }
    }
    
    // If we couldn't extract any addresses, log a warning
    if (addresses.length === 0) {
      await logIndexingEvent(
        job.id,
        'No addresses found for webhook setup',
        LogLevel.WARNING
      );
      return null;
    }
    
    // Base URL where our webhook endpoint is hosted
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    
    // Create the webhook
    const webhookUrl = `${baseUrl}/api/webhooks/helius/${job.id}`;
    const response = await createHeliusWebhook(webhookUrl, addresses);
    
    // Log the successful webhook creation
    await logIndexingEvent(
      job.id,
      `Helius webhook created with ID: ${response.webhookID}`,
      LogLevel.INFO,
      { webhookId: response.webhookID }
    );
    
    return response.webhookID;
  } catch (error) {
    console.error('Error setting up Helius webhook:', error);
    await logIndexingEvent(
      job.id,
      `Failed to set up Helius webhook: ${error}`,
      LogLevel.ERROR
    );
    return null;
  }
}

// Create a log entry for an indexing job
export async function logIndexingEvent(
  indexingJobId: string,
  message: string,
  level: LogLevel,
  metadata: Record<string, any> = {}
): Promise<void> {
  try {
    await prisma.indexingLog.create({
      data: {
        indexingJobId,
        message,
        level,
        metadata: metadata as any
      }
    });
  } catch (error) {
    console.error('Error logging indexing event:', error);
  }
}

// Update the status of an indexing job
export async function updateJobStatus(
  jobId: string,
  status: IndexingStatus
): Promise<void> {
  try {
    await prisma.indexingJob.update({
      where: { id: jobId },
      data: { status, lastRun: status === IndexingStatus.ACTIVE ? new Date() : undefined }
    });
  } catch (error) {
    console.error(`Error updating job status to ${status}:`, error);
  }
}

// Clean up resources when a job is stopped or deleted
export async function cleanupJob(jobId: string): Promise<void> {
  try {
    const job = await prisma.indexingJob.findUnique({
      where: { id: jobId }
    });
    
    if (!job) {
      console.error(`Job ${jobId} not found for cleanup`);
      return;
    }
    
    // If there's a webhook ID, delete the webhook
    if (job.webhookUrl) {
      try {
        await deleteHeliusWebhook(job.webhookUrl);
      } catch (error) {
        console.error('Error deleting webhook:', error);
      }
    }
    
    // Update the job status
    await updateJobStatus(jobId, IndexingStatus.INACTIVE);
  } catch (error) {
    console.error('Error cleaning up job:', error);
  }
}

// Helper table creation functions
async function createNFTBidsTables(connectionInfo: DbConnectionInfo, job: any): Promise<boolean> {
  return await createTable(connectionInfo, 'nft_bids', [
    { name: 'id', type: 'SERIAL', constraints: 'PRIMARY KEY' },
    { name: 'mint_address', type: 'VARCHAR(255)', constraints: 'NOT NULL' },
    { name: 'bidder_address', type: 'VARCHAR(255)', constraints: 'NOT NULL' },
    { name: 'marketplace', type: 'VARCHAR(100)', constraints: 'NOT NULL' },
    { name: 'price_lamports', type: 'BIGINT', constraints: 'NOT NULL' },
    { name: 'price_usd', type: 'DECIMAL(18, 6)' },
    { name: 'transaction_signature', type: 'VARCHAR(128)', constraints: 'UNIQUE' },
    { name: 'created_at', type: 'TIMESTAMP', constraints: 'NOT NULL DEFAULT CURRENT_TIMESTAMP' },
    { name: 'expires_at', type: 'TIMESTAMP' },
    { name: 'status', type: 'VARCHAR(50)', constraints: 'NOT NULL DEFAULT \'active\'' }
  ]);
}

async function createNFTPricesTables(connectionInfo: DbConnectionInfo, job: any): Promise<boolean> {
  return await createTable(connectionInfo, 'nft_prices', [
    { name: 'id', type: 'SERIAL', constraints: 'PRIMARY KEY' },
    { name: 'mint_address', type: 'VARCHAR(255)', constraints: 'NOT NULL' },
    { name: 'marketplace', type: 'VARCHAR(100)', constraints: 'NOT NULL' },
    { name: 'price_lamports', type: 'BIGINT', constraints: 'NOT NULL' },
    { name: 'price_usd', type: 'DECIMAL(18, 6)' },
    { name: 'seller_address', type: 'VARCHAR(255)', constraints: 'NOT NULL' },
    { name: 'transaction_signature', type: 'VARCHAR(128)', constraints: 'UNIQUE' },
    { name: 'created_at', type: 'TIMESTAMP', constraints: 'NOT NULL DEFAULT CURRENT_TIMESTAMP' },
    { name: 'status', type: 'VARCHAR(50)', constraints: 'NOT NULL DEFAULT \'active\'' }
  ]);
}

async function createTokenBorrowTables(connectionInfo: DbConnectionInfo, job: any): Promise<boolean> {
  return await createTable(connectionInfo, 'token_borrow_offers', [
    { name: 'id', type: 'SERIAL', constraints: 'PRIMARY KEY' },
    { name: 'token_mint', type: 'VARCHAR(255)', constraints: 'NOT NULL' },
    { name: 'platform', type: 'VARCHAR(100)', constraints: 'NOT NULL' },
    { name: 'amount', type: 'DECIMAL(36, 18)', constraints: 'NOT NULL' },
    { name: 'interest_rate', type: 'DECIMAL(10, 6)' },
    { name: 'collateral_required', type: 'DECIMAL(36, 18)' },
    { name: 'lender_address', type: 'VARCHAR(255)', constraints: 'NOT NULL' },
    { name: 'transaction_signature', type: 'VARCHAR(128)', constraints: 'UNIQUE' },
    { name: 'created_at', type: 'TIMESTAMP', constraints: 'NOT NULL DEFAULT CURRENT_TIMESTAMP' },
    { name: 'expires_at', type: 'TIMESTAMP' },
    { name: 'status', type: 'VARCHAR(50)', constraints: 'NOT NULL DEFAULT \'active\'' }
  ]);
}

async function createTokenPricesTables(connectionInfo: DbConnectionInfo, job: any): Promise<boolean> {
  const successTokens = await createTable(connectionInfo, 'token_prices', [
    { name: 'id', type: 'SERIAL', constraints: 'PRIMARY KEY' },
    { name: 'token_mint', type: 'VARCHAR(255)', constraints: 'NOT NULL' },
    { name: 'platform', type: 'VARCHAR(100)', constraints: 'NOT NULL' },
    { name: 'price_usd', type: 'DECIMAL(36, 18)', constraints: 'NOT NULL' },
    { name: 'volume_24h_usd', type: 'DECIMAL(36, 18)' },
    { name: 'last_updated_at', type: 'TIMESTAMP', constraints: 'NOT NULL DEFAULT CURRENT_TIMESTAMP' }
  ]);
  
  const successHistory = await createTable(connectionInfo, 'token_price_history', [
    { name: 'id', type: 'SERIAL', constraints: 'PRIMARY KEY' },
    { name: 'token_mint', type: 'VARCHAR(255)', constraints: 'NOT NULL' },
    { name: 'platform', type: 'VARCHAR(100)', constraints: 'NOT NULL' },
    { name: 'price_usd', type: 'DECIMAL(36, 18)', constraints: 'NOT NULL' },
    { name: 'volume_usd', type: 'DECIMAL(36, 18)' },
    { name: 'timestamp', type: 'TIMESTAMP', constraints: 'NOT NULL DEFAULT CURRENT_TIMESTAMP' }
  ]);
  
  return successTokens && successHistory;
} 
import { NextRequest, NextResponse } from 'next/server';
import { HeliusWebhookPayload } from '@/app/lib/types';
import prisma from '@/app/lib/prisma';
import { verifyWebhookSignature } from '@/app/lib/helius';
import { logIndexingEvent } from '@/app/lib/indexing';
import { LogLevel, DataType } from '@/app/lib/types';
import { executeQuery, mapDbConnection } from '@/app/lib/postgres';

// Process NFT bid events
async function processNFTBid(payload: HeliusWebhookPayload, job: any, dbConnection: any): Promise<boolean> {
  try {
    // Extract bid details from the payload
    const { transactionSignature, metadata } = payload;
    
    if (!metadata || !metadata.amount || !metadata.buyer || !metadata.nft) {
      await logIndexingEvent(job.id, 'Received incomplete NFT bid data', LogLevel.WARNING);
      return false;
    }
    
    // Insert into the database
    const query = `
      INSERT INTO nft_bids (
        mint_address, bidder_address, marketplace, price_lamports, 
        price_usd, transaction_signature, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (transaction_signature) DO NOTHING
      RETURNING id;
    `;
    
    const params = [
      metadata.nft.mint,
      metadata.buyer,
      metadata.source || 'unknown',
      metadata.amount,
      metadata.amountUsd || null,
      transactionSignature,
      new Date(payload.timestamp)
    ];
    
    const result = await executeQuery(mapDbConnection(dbConnection), query, params);
    const success = result && result.length > 0;
    
    if (success) {
      await logIndexingEvent(
        job.id,
        `Indexed NFT bid for mint ${metadata.nft.mint}`,
        LogLevel.INFO,
        { transactionSignature, amount: metadata.amount }
      );
    }
    
    return success;
  } catch (error) {
    await logIndexingEvent(job.id, `Error processing NFT bid: ${error}`, LogLevel.ERROR);
    return false;
  }
}

// Process NFT price/listing events
async function processNFTPrice(payload: HeliusWebhookPayload, job: any, dbConnection: any): Promise<boolean> {
  try {
    // Extract listing details from the payload
    const { transactionSignature, metadata } = payload;
    
    if (!metadata || !metadata.amount || !metadata.seller || !metadata.nft) {
      await logIndexingEvent(job.id, 'Received incomplete NFT price data', LogLevel.WARNING);
      return false;
    }
    
    // Insert into the database
    const query = `
      INSERT INTO nft_prices (
        mint_address, marketplace, price_lamports, 
        price_usd, seller_address, transaction_signature, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (transaction_signature) DO NOTHING
      RETURNING id;
    `;
    
    const params = [
      metadata.nft.mint,
      metadata.source || 'unknown',
      metadata.amount,
      metadata.amountUsd || null,
      metadata.seller,
      transactionSignature,
      new Date(payload.timestamp)
    ];
    
    const result = await executeQuery(mapDbConnection(dbConnection), query, params);
    const success = result && result.length > 0;
    
    if (success) {
      await logIndexingEvent(
        job.id,
        `Indexed NFT listing for mint ${metadata.nft.mint}`,
        LogLevel.INFO,
        { transactionSignature, amount: metadata.amount }
      );
    }
    
    return success;
  } catch (error) {
    await logIndexingEvent(job.id, `Error processing NFT price: ${error}`, LogLevel.ERROR);
    return false;
  }
}

// Process token borrow offers
async function processTokenBorrow(payload: HeliusWebhookPayload, job: any, dbConnection: any): Promise<boolean> {
  try {
    // This would require a custom implementation based on specific lending protocols
    // For this example, we'll log that it's not fully implemented
    await logIndexingEvent(job.id, 'Token borrow processing not fully implemented', LogLevel.WARNING);
    return false;
  } catch (error) {
    await logIndexingEvent(job.id, `Error processing token borrow: ${error}`, LogLevel.ERROR);
    return false;
  }
}

// Process token price updates
async function processTokenPrice(payload: HeliusWebhookPayload, job: any, dbConnection: any): Promise<boolean> {
  try {
    // This would typically integrate with price feeds or exchanges
    // For this example, we'll log that it's not fully implemented
    await logIndexingEvent(job.id, 'Token price processing not fully implemented', LogLevel.WARNING);
    return false;
  } catch (error) {
    await logIndexingEvent(job.id, `Error processing token price: ${error}`, LogLevel.ERROR);
    return false;
  }
}

// Process custom data
async function processCustomData(payload: HeliusWebhookPayload, job: any, dbConnection: any): Promise<boolean> {
  try {
    // Custom processing would be defined in the job config
    const processor = job.config.processor;
    
    if (!processor || !processor.table || !processor.columns || !processor.mapping) {
      await logIndexingEvent(job.id, 'Invalid custom processor configuration', LogLevel.ERROR);
      return false;
    }
    
    // Extract values based on the mapping
    const values: any[] = [];
    const columns: string[] = [];
    
    for (const [column, path] of Object.entries(processor.mapping)) {
      let value = payload;
      const pathSegments = (path as string).split('.');
      
      for (const segment of pathSegments) {
        if (value === null || value === undefined) break;
        value = (value as any)[segment];
      }
      
      columns.push(column);
      values.push(value);
    }
    
    if (columns.length === 0) {
      await logIndexingEvent(job.id, 'No valid columns mapped for custom processing', LogLevel.WARNING);
      return false;
    }
    
    // Construct and execute the query
    const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');
    const query = `
      INSERT INTO ${processor.table} (${columns.join(', ')})
      VALUES (${placeholders})
      RETURNING id;
    `;
    
    const result = await executeQuery(mapDbConnection(dbConnection), query, values);
    const success = result && result.length > 0;
    
    if (success) {
      await logIndexingEvent(
        job.id,
        `Indexed custom data for transaction ${payload.transactionSignature}`,
        LogLevel.INFO
      );
    }
    
    return success;
  } catch (error) {
    await logIndexingEvent(job.id, `Error processing custom data: ${error}`, LogLevel.ERROR);
    return false;
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const jobId = (await params).jobId;
  
  try {
    // Get the job details
    const job = await prisma.indexingJob.findUnique({
      where: { id: jobId },
      include: { dbConnection: true }
    });
    
    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }
    
    // Check if the job is active
    if (job.status !== 'ACTIVE') {
      return NextResponse.json({ error: 'Job is not active' }, { status: 400 });
    }
    
    // Verify the webhook signature
    const authHeader = request.headers.get('Authorization') || '';
    // Not using verifyWebhookSignature here as it's just a basic check in this implementation
    if (authHeader !== `Bearer ${process.env.NEXTAUTH_SECRET}`) {
      await logIndexingEvent(jobId, 'Invalid webhook signature', LogLevel.ERROR);
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }
    
    // Parse the payload
    const payload = await request.json() as HeliusWebhookPayload;
    
    // Process the data based on the job type
    let success = false;
    
    switch (job.dataType as DataType) {
      case DataType.NFT_BIDS:
        success = await processNFTBid(payload, job, job.dbConnection);
        break;
      case DataType.NFT_PRICES:
        success = await processNFTPrice(payload, job, job.dbConnection);
        break;
      case DataType.TOKEN_BORROW:
        success = await processTokenBorrow(payload, job, job.dbConnection);
        break;
      case DataType.TOKEN_PRICES:
        success = await processTokenPrice(payload, job, job.dbConnection);
        break;
      case DataType.CUSTOM:
        success = await processCustomData(payload, job, job.dbConnection);
        break;
      default:
        await logIndexingEvent(jobId, `Unsupported data type: ${job.dataType}`, LogLevel.ERROR);
        return NextResponse.json({ error: 'Unsupported data type' }, { status: 400 });
    }
    
    // Return the result
    if (success) {
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json({ success: false, error: 'Failed to process data' });
    }
  } catch (error) {
    console.error('Error processing webhook:', error);
    await logIndexingEvent(jobId, `Error processing webhook: ${error}`, LogLevel.ERROR);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 
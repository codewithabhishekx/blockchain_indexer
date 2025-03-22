import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import prisma from '@/app/lib/prisma';
import { ApiResponse, DataType, IndexingJobFormData, IndexingStatus } from '@/app/lib/types';
import { createTablesForJob, setupHeliusWebhook } from '@/app/lib/indexing';

// Get all indexing jobs for the current user
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    
    if (!session || !session.user?.id) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: 'Unauthorized',
      }, { status: 401 });
    }
    
    const indexingJobs = await prisma.indexingJob.findMany({
      where: {
        userId: session.user.id,
      },
      orderBy: {
        updatedAt: 'desc',
      },
      include: {
        dbConnection: {
          select: {
            id: true,
            name: true,
            isActive: true,
          },
        },
      },
    });
    
    return NextResponse.json<ApiResponse<typeof indexingJobs>>({
      success: true,
      data: indexingJobs,
    });
  } catch (error) {
    console.error('Error fetching indexing jobs:', error);
    return NextResponse.json<ApiResponse<null>>({
      success: false,
      error: 'Failed to fetch indexing jobs',
    }, { status: 500 });
  }
}

// Create a new indexing job
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    
    if (!session || !session.user?.id) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: 'Unauthorized',
      }, { status: 401 });
    }
    
    const data = await request.json() as IndexingJobFormData;
    
    // Validate required fields
    if (!data.name || !data.dbConnectionId || !data.dataType) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: 'Required fields missing',
      }, { status: 400 });
    }
    
    // Check if the database connection exists and belongs to the user
    const dbConnection = await prisma.dbConnection.findUnique({
      where: {
        id: data.dbConnectionId,
        userId: session.user.id,
      },
    });
    
    if (!dbConnection) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: 'Database connection not found',
      }, { status: 404 });
    }
    
    // Create the indexing job
    const indexingJob = await prisma.indexingJob.create({
      data: {
        name: data.name,
        description: data.description,
        dataType: data.dataType as DataType,
        config: data.config,
        userId: session.user.id,
        dbConnectionId: data.dbConnectionId,
        status: IndexingStatus.INACTIVE,
      },
    });
    
    // Create tables in the database for this job
    const tablesCreated = await createTablesForJob(indexingJob);
    
    if (!tablesCreated) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: 'Failed to create tables in the database',
      }, { status: 500 });
    }
    
    // Setup Helius webhook for this job if tables were created successfully
    const webhookId = await setupHeliusWebhook(indexingJob);
    
    // Update the job with the webhook ID if it was created
    if (webhookId) {
      await prisma.indexingJob.update({
        where: { id: indexingJob.id },
        data: { webhookUrl: webhookId },
      });
    }
    
    // Get the updated job
    const updatedJob = await prisma.indexingJob.findUnique({
      where: { id: indexingJob.id },
      include: {
        dbConnection: {
          select: {
            id: true,
            name: true,
            isActive: true,
          },
        },
      },
    });
    
    return NextResponse.json<ApiResponse<typeof updatedJob>>({
      success: true,
      data: updatedJob,
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating indexing job:', error);
    return NextResponse.json<ApiResponse<null>>({
      success: false,
      error: 'Failed to create indexing job',
    }, { status: 500 });
  }
} 
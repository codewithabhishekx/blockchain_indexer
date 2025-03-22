import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import prisma from '@/app/lib/prisma';
import { ApiResponse, IndexingStatus } from '@/app/lib/types';
import { updateJobStatus, cleanupJob } from '@/app/lib/indexing';

// Get a specific indexing job
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession();
    
    if (!session || !session.user?.id) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: 'Unauthorized',
      }, { status: 401 });
    }
    
    const indexingJob = await prisma.indexingJob.findUnique({
      where: {
        id: (await params).id,
        userId: session.user.id,
      },
      include: {
        dbConnection: {
          select: {
            id: true,
            name: true,
            host: true,
            port: true,
            database: true,
            isActive: true,
          },
        },
        indexingLogs: {
          orderBy: {
            timestamp: 'desc',
          },
          take: 20,
        },
      },
    });
    
    if (!indexingJob) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: 'Indexing job not found',
      }, { status: 404 });
    }
    
    return NextResponse.json<ApiResponse<typeof indexingJob>>({
      success: true,
      data: indexingJob,
    });
  } catch (error) {
    console.error('Error fetching indexing job:', error);
    return NextResponse.json<ApiResponse<null>>({
      success: false,
      error: 'Failed to fetch indexing job',
    }, { status: 500 });
  }
}

// Update a specific indexing job
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession();
    
    if (!session || !session.user?.id) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: 'Unauthorized',
      }, { status: 401 });
    }
    
    // Check if the job exists and belongs to the user
    const existingJob = await prisma.indexingJob.findUnique({
      where: {
        id: (await params).id,
        userId: session.user.id,
      },
    });
    
    if (!existingJob) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: 'Indexing job not found',
      }, { status: 404 });
    }
    
    const data = await request.json();
    
    // Update the job
    const updatedJob = await prisma.indexingJob.update({
      where: { id: (await params).id },
      data: {
        name: data.name,
        description: data.description,
        config: data.config,
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
    
    return NextResponse.json<ApiResponse<typeof updatedJob>>({
      success: true,
      data: updatedJob,
    });
  } catch (error) {
    console.error('Error updating indexing job:', error);
    return NextResponse.json<ApiResponse<null>>({
      success: false,
      error: 'Failed to update indexing job',
    }, { status: 500 });
  }
}

// Delete a specific indexing job
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession();
    
    if (!session || !session.user?.id) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: 'Unauthorized',
      }, { status: 401 });
    }
    
    // Check if the job exists and belongs to the user
    const existingJob = await prisma.indexingJob.findUnique({
      where: {
        id: (await params).id,
        userId: session.user.id,
      },
    });
    
    if (!existingJob) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: 'Indexing job not found',
      }, { status: 404 });
    }
    
    // Clean up any resources
    await cleanupJob((await params).id);
    
    // Delete the job
    await prisma.indexingJob.delete({
      where: { id: (await params).id },
    });
    
    return NextResponse.json<ApiResponse<{ id: string }>>({
      success: true,
      data: { id: (await params).id },
    });
  } catch (error) {
    console.error('Error deleting indexing job:', error);
    return NextResponse.json<ApiResponse<null>>({
      success: false,
      error: 'Failed to delete indexing job',
    }, { status: 500 });
  }
}

// Action endpoints for job control (start/stop)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession();
    
    if (!session || !session.user?.id) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: 'Unauthorized',
      }, { status: 401 });
    }
    
    // Check if the job exists and belongs to the user
    const job = await prisma.indexingJob.findUnique({
      where: {
        id: (await params).id,
        userId: session.user.id,
      },
      include: {
        dbConnection: true,
      },
    });
    
    if (!job) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: 'Indexing job not found',
      }, { status: 404 });
    }
    
    // Parse the action from the request
    const { action } = await request.json();
    
    if (!action) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: 'Action is required',
      }, { status: 400 });
    }
    
    // Check if the database connection is active
    if (!job.dbConnection.isActive) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: 'Database connection is not active',
      }, { status: 400 });
    }
    
    // Process the action
    switch (action) {
      case 'start':
        await updateJobStatus((await params).id, IndexingStatus.ACTIVE);
        break;
      case 'stop':
        await updateJobStatus((await params).id, IndexingStatus.INACTIVE);
        break;
      case 'pause':
        await updateJobStatus((await params).id, IndexingStatus.PAUSED);
        break;
      default:
        return NextResponse.json<ApiResponse<null>>({
          success: false,
          error: 'Invalid action',
        }, { status: 400 });
    }
    
    // Get updated job
    const updatedJob = await prisma.indexingJob.findUnique({
      where: { id: (await params).id },
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
    });
  } catch (error) {
    console.error('Error processing job action:', error);
    return NextResponse.json<ApiResponse<null>>({
      success: false,
      error: 'Failed to process job action',
    }, { status: 500 });
  }
} 
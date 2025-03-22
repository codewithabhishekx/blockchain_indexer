import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import prisma from '@/app/lib/prisma';
import { testConnection, mapDbConnection } from '@/app/lib/postgres';
import { ApiResponse, DbConnectionFormData } from '@/app/lib/types';

// Get a specific connection
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
    
    const connection = await prisma.dbConnection.findUnique({
      where: {
        id: (await params).id,
        userId: session.user.id,
      },
      select: {
        id: true,
        name: true,
        host: true,
        port: true,
        database: true,
        username: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    
    if (!connection) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: 'Connection not found',
      }, { status: 404 });
    }
    
    return NextResponse.json<ApiResponse<typeof connection>>({
      success: true,
      data: connection,
    });
  } catch (error) {
    console.error('Error fetching connection:', error);
    return NextResponse.json<ApiResponse<null>>({
      success: false,
      error: 'Failed to fetch connection',
    }, { status: 500 });
  }
}

// Update a specific connection
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
    
    // Check if the connection exists and belongs to the user
    const existingConnection = await prisma.dbConnection.findUnique({
      where: {
        id: (await params).id,
        userId: session.user.id,
      },
    });
    
    if (!existingConnection) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: 'Connection not found',
      }, { status: 404 });
    }
    
    const data = await request.json() as Partial<DbConnectionFormData>;
    
    // Build update object
    const updateData: any = {};
    if (data.name) updateData.name = data.name;
    if (data.host) updateData.host = data.host;
    if (data.port) updateData.port = data.port;
    if (data.database) updateData.database = data.database;
    if (data.username) updateData.username = data.username;
    if (data.password) updateData.password = data.password;
    
    // Update the connection in the database
    const updatedConnection = await prisma.dbConnection.update({
      where: { id: (await params).id },
      data: updateData,
    });
    
    // Test the connection
    const connectionInfo = mapDbConnection(updatedConnection);
    const isConnected = await testConnection(connectionInfo);
    
    // Update the connection status based on the test result
    await prisma.dbConnection.update({
      where: { id: (await params).id },
      data: { isActive: isConnected },
    });
    
    // Return the connection without the password
    const { password, ...connectionWithoutPassword } = updatedConnection;
    
    return NextResponse.json<ApiResponse<typeof connectionWithoutPassword>>({
      success: true,
      data: { ...connectionWithoutPassword, isActive: isConnected },
    });
  } catch (error) {
    console.error('Error updating connection:', error);
    return NextResponse.json<ApiResponse<null>>({
      success: false,
      error: 'Failed to update connection',
    }, { status: 500 });
  }
}

// Delete a specific connection
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
    
    // Check if the connection exists and belongs to the user
    const existingConnection = await prisma.dbConnection.findUnique({
      where: {
        id: (await params).id,
        userId: session.user.id,
      },
    });
    
    if (!existingConnection) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: 'Connection not found',
      }, { status: 404 });
    }
    
    // Check if there are any indexing jobs using this connection
    const jobsUsingConnection = await prisma.indexingJob.count({
      where: { dbConnectionId: (await params).id },
    });
    
    if (jobsUsingConnection > 0) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: 'Cannot delete connection as it is being used by active indexing jobs',
      }, { status: 400 });
    }
    
    // Delete the connection
    await prisma.dbConnection.delete({
      where: { id: (await params).id },
    });
    
    return NextResponse.json<ApiResponse<{ id: string }>>({
      success: true,
      data: { id: (await params).id },
    });
  } catch (error) {
    console.error('Error deleting connection:', error);
    return NextResponse.json<ApiResponse<null>>({
      success: false,
      error: 'Failed to delete connection',
    }, { status: 500 });
  }
}

// Test a specific connection
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
    
    // Check if the connection exists and belongs to the user
    const connection = await prisma.dbConnection.findUnique({
      where: {
        id: (await params).id,
        userId: session.user.id,
      },
    });
    
    if (!connection) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: 'Connection not found',
      }, { status: 404 });
    }
    
    // Test the connection
    const connectionInfo = mapDbConnection(connection);
    const isConnected = await testConnection(connectionInfo);
    
    // Update the connection status based on the test result
    await prisma.dbConnection.update({
      where: { id: (await params).id },
      data: { isActive: isConnected },
    });
    
    return NextResponse.json<ApiResponse<{ isConnected: boolean }>>({
      success: true,
      data: { isConnected },
    });
  } catch (error) {
    console.error('Error testing connection:', error);
    return NextResponse.json<ApiResponse<null>>({
      success: false,
      error: 'Failed to test connection',
    }, { status: 500 });
  }
} 
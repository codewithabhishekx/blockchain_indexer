import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import prisma from '@/app/lib/prisma';
import { authOptions } from '../auth/[...nextauth]/route';
import { testConnection, mapDbConnection } from '@/app/lib/postgres';
import { ApiResponse, DbConnectionFormData } from '@/app/lib/types';

// Get all connections for the current user
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user?.id) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: 'Unauthorized',
      }, { status: 401 });
    }
    
    const connections = await prisma.dbConnection.findMany({
      where: {
        userId: session.user.id,
      },
      orderBy: {
        createdAt: 'desc',
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
    
    return NextResponse.json<ApiResponse<typeof connections>>({
      success: true,
      data: connections,
    });
  } catch (error) {
    console.error('Error fetching connections:', error);
    return NextResponse.json<ApiResponse<null>>({
      success: false,
      error: 'Failed to fetch connections',
    }, { status: 500 });
  }
}

// Create a new connection
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    console.log("Session data:", session)
    if (!session || !session.user?.id) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: 'Unauthorized',
      }, { status: 401 });
    }
    
    const data = await request.json() as DbConnectionFormData;
    
    // Validate required fields
    if (!data.name || !data.host || !data.port || !data.database || !data.username || !data.password) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: 'All fields are required',
      }, { status: 400 });
    }
    const ConnectionInfo = {
      id: 'temp',
      host: data.host,
      port: data.port,
      database: data.database,
      username: data.username,
      password: data.password
    };
    const isConnected = await testConnection(ConnectionInfo) ;
   
    // Create the connection in the database
    const connection = await prisma.dbConnection.create({
      data: {
        name: data.name,
        host: data.host,
        port: data.port,
        database: data.database,
        username: data.username,
        password: data.password,
        userId: session.user.id,
        isActive:isConnected
      },
    });
    
    // Test the connection
    // const connectionInfo = mapDbConnection(connection);
    // const isConnected = await testConnection(connectionInfo);
    
    // if (!isConnected) {
    //   // If connection test fails, mark as inactive and return error
    //   await prisma.dbConnection.update({
    //     where: { id: connection.id },
    //     data: { isActive: false },
    //   });

      
    //   return NextResponse.json<ApiResponse<null>>({
    //     success: false,
    //     error: 'Failed to connect to database with provided credentials',
    //   }, { status: 400 });
    // }
    
    // Return the connection without the password
    const { password, ...connectionWithoutPassword } = connection;
    
  //   return NextResponse.json<ApiResponse<typeof connectionWithoutPassword>>({
  //     success: true,
  //     data: connectionWithoutPassword,
  //   }, { status: 201 });
  // } catch (error) {
  //   console.error('Error creating connection:', error);
  //   return NextResponse.json<ApiResponse<null>>({
  //     success: false,
  //     error: 'Failed to create connection',
  //   }, { status: 500 });
  // }
  return NextResponse.json<ApiResponse<typeof connectionWithoutPassword>>({
    success: true,
    data: { ...connectionWithoutPassword, isActive: isConnected },
  }, { status: 201 });
} catch (error) {
  console.error('Error creating connection:', error);
  return NextResponse.json<ApiResponse<null>>({
    success: false,
    error: 'Failed to create connection',
  }, { status: 500 });
}
} 
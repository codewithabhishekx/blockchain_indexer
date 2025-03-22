import { getServerSession } from 'next-auth';
import Link from 'next/link';
import prisma from '@/app/lib/prisma';

// Define the specific type structure we need for connections
interface Connection {
  id: string;
  name: string;
  host: string;
  port: number;
  database: string;
  username: string;
  isActive: boolean;
  lastTested?: Date | null;
}

export default async function ConnectionsPage() {
  const session = await getServerSession();
  
  if (!session || !session.user) {
    return null; // Layout will handle the redirect
  }
  
  // Fetch all connections for the user
  const connections = await prisma.dbConnection.findMany({
    where: {
      userId: session.user.id,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });
  
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold">Database Connections</h1>
        <Link
          href="/dashboard/connections/new"
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
        >
          Add Connection
        </Link>
      </div>
      
      {connections.length === 0 ? (
        <div className="bg-white p-8 rounded-lg shadow text-center">
          <h2 className="text-xl font-medium mb-2">No connections yet</h2>
          <p className="text-gray-500 mb-6">
            Add your first database connection to start indexing blockchain data.
          </p>
          <Link
            href="/dashboard/connections/new"
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            Add Your First Connection
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {connections.map((connection: Connection) => (
            <div key={connection.id} className="bg-white p-6 rounded-lg shadow">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-lg font-medium">{connection.name}</h2>
                <div className="flex items-center">
                  <span 
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mr-2 ${
                      connection.isActive 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {connection.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
              
              <div className="space-y-2 mb-6">
                <div className="flex text-sm">
                  <div className="text-gray-500 w-24">Host:</div>
                  <div className="text-gray-900">{connection.host}</div>
                </div>
                <div className="flex text-sm">
                  <div className="text-gray-500 w-24">Database:</div>
                  <div className="text-gray-900">{connection.database}</div>
                </div>
                <div className="flex text-sm">
                  <div className="text-gray-500 w-24">Port:</div>
                  <div className="text-gray-900">{connection.port}</div>
                </div>
                <div className="flex text-sm">
                  <div className="text-gray-500 w-24">Username:</div>
                  <div className="text-gray-900">{connection.username}</div>
                </div>
                <div className="flex text-sm">
                  <div className="text-gray-500 w-24">Last Tested:</div>
                  <div className="text-gray-900">
                    {connection.lastTested 
                      ? new Date(connection.lastTested).toLocaleString() 
                      : 'Never'}
                  </div>
                </div>
              </div>
              
              <div className="flex space-x-3">
                <Link
                  href={`/dashboard/connections/${connection.id}`}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  Edit
                </Link>
                <Link
                  href={`/api/connections/${connection.id}`}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  Test
                </Link>
                <button
                  className="text-sm text-red-600 hover:text-red-800"
                  // In a real app, you would handle this with client-side JS
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
} 
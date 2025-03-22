import { getServerSession } from 'next-auth';
import Link from 'next/link';
import prisma from '@/app/lib/prisma';

export default async function DashboardPage() {
  const session = await getServerSession();
  
  if (!session || !session.user) {
    return null; // Layout will handle the redirect
  }
  
  // Fetch connection count
  const connectionCount = await prisma.dbConnection.count({
    where: { userId: session.user.id },
  });
  
  // Fetch active connection count
  const activeConnectionCount = await prisma.dbConnection.count({
    where: { 
      userId: session.user.id,
      isActive: true,
    },
  });
  
  // Fetch indexing job count
  const indexingJobCount = await prisma.indexingJob.count({
    where: { userId: session.user.id },
  });
  
  // Fetch active indexing job count
  const activeIndexingJobCount = await prisma.indexingJob.count({
    where: {
      userId: session.user.id,
      status: 'ACTIVE',
    },
  });
  
  // Fetch recent indexing logs
  const recentLogs = await prisma.indexingLog.findMany({
    take: 5,
    orderBy: { timestamp: 'desc' },
    include: {
      indexingJob: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    where: {
      indexingJob: {
        userId: session.user.id,
      },
    },
  });
  
  return (
    <div>
      <h1 className="text-2xl font-semibold mb-6">Dashboard</h1>
      
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-sm font-medium text-gray-500">Database Connections</div>
          <div className="mt-2 flex items-baseline">
            <div className="text-3xl font-semibold">{connectionCount}</div>
            <div className="ml-2 text-sm text-gray-500">
              ({activeConnectionCount} active)
            </div>
          </div>
          <div className="mt-4">
            <Link
              href="/dashboard/connections"
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Manage connections →
            </Link>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-sm font-medium text-gray-500">Indexing Jobs</div>
          <div className="mt-2 flex items-baseline">
            <div className="text-3xl font-semibold">{indexingJobCount}</div>
            <div className="ml-2 text-sm text-gray-500">
              ({activeIndexingJobCount} active)
            </div>
          </div>
          <div className="mt-4">
            <Link
              href="/dashboard/indexing-jobs"
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Manage jobs →
            </Link>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-sm font-medium text-gray-500">Quick Actions</div>
          <div className="mt-4 flex flex-col gap-2">
            <Link
              href="/dashboard/connections/new"
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Add database connection →
            </Link>
            <Link
              href="/dashboard/indexing-jobs/new"
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Create indexing job →
            </Link>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-sm font-medium text-gray-500">System Status</div>
          <div className="mt-2 flex items-center">
            <div className="h-4 w-4 rounded-full bg-green-500 mr-2"></div>
            <div className="text-sm font-medium">All systems operational</div>
          </div>
          <div className="mt-4 text-sm text-gray-500">
            Helius API: <span className="text-green-600">Connected</span>
          </div>
        </div>
      </div>
      
      {/* Recent Logs */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-lg font-medium mb-4">Recent Logs</h2>
        
        {recentLogs.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Job
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Level
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Message
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {recentLogs.map((log) => (
                  <tr key={log.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <Link
                        href={`/dashboard/indexing-jobs/${log.indexingJob.id}`}
                        className="hover:text-blue-600"
                      >
                        {log.indexingJob.name}
                      </Link>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium 
                          ${log.level === 'INFO' ? 'bg-blue-100 text-blue-800' : ''}
                          ${log.level === 'WARNING' ? 'bg-yellow-100 text-yellow-800' : ''}
                          ${log.level === 'ERROR' ? 'bg-red-100 text-red-800' : ''}
                          ${log.level === 'DEBUG' ? 'bg-gray-100 text-gray-800' : ''}
                        `}
                      >
                        {log.level}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 truncate max-w-md">
                      {log.message}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-gray-500 text-sm">No logs available yet.</div>
        )}
        
        {recentLogs.length > 0 && (
          <div className="mt-4 text-right">
            <Link
              href="/dashboard/logs"
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              View all logs →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
} 
import { getServerSession } from 'next-auth';
import Link from 'next/link';
import prisma from '@/app/lib/prisma';

// Define the IndexingJob type
interface IndexingJob {
  id: string;
  name: string;
  description?: string | null;
  status: string;
  dataType: string;
  lastRun?: Date | null;
  dbConnection: {
    name: string;
    isActive: boolean;
  };
}

export default async function IndexingJobsPage() {
  const session = await getServerSession();
  
  if (!session || !session.user) {
    return null; // Layout will handle the redirect
  }
  
  // Fetch all indexing jobs for the user
  const jobs = await prisma.indexingJob.findMany({
    where: {
      userId: session.user.id,
    },
    orderBy: {
      createdAt: 'desc',
    },
    include: {
      dbConnection: {
        select: {
          name: true,
          isActive: true,
        }
      }
    }
  });
  
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold">Indexing Jobs</h1>
        <Link
          href="/dashboard/indexing-jobs/new"
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
        >
          Create New Job
        </Link>
      </div>
      
      {jobs.length === 0 ? (
        <div className="bg-white p-8 rounded-lg shadow text-center">
          <h2 className="text-xl font-medium mb-2">No indexing jobs yet</h2>
          <p className="text-gray-500 mb-6">
            Create your first indexing job to start collecting blockchain data.
          </p>
          <Link
            href="/dashboard/indexing-jobs/new"
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            Create Your First Job
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {jobs.map((job: IndexingJob) => (
            <div key={job.id} className="bg-white p-6 rounded-lg shadow">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-4">
                <div>
                  <h2 className="text-lg font-medium">{job.name}</h2>
                  {job.description && (
                    <p className="text-gray-500 mt-1">{job.description}</p>
                  )}
                </div>
                <div className="flex items-center mt-2 sm:mt-0">
                  <span 
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mr-2 ${
                      job.status === 'ACTIVE' 
                        ? 'bg-green-100 text-green-800' 
                        : job.status === 'PAUSED'
                        ? 'bg-yellow-100 text-yellow-800'
                        : job.status === 'ERROR'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {job.status.charAt(0) + job.status.slice(1).toLowerCase()}
                  </span>
                </div>
              </div>
              
              <div className="space-y-2 mb-6">
                <div className="flex text-sm">
                  <div className="text-gray-500 w-28">Data Type:</div>
                  <div className="text-gray-900">{job.dataType.replace(/_/g, ' ')}</div>
                </div>
                <div className="flex text-sm">
                  <div className="text-gray-500 w-28">Database:</div>
                  <div className="text-gray-900 flex items-center">
                    {job.dbConnection.name}
                    <span 
                      className={`ml-2 inline-flex h-2 w-2 rounded-full ${
                        job.dbConnection.isActive ? 'bg-green-500' : 'bg-red-500'
                      }`}
                    />
                  </div>
                </div>
                <div className="flex text-sm">
                  <div className="text-gray-500 w-28">Last Run:</div>
                  <div className="text-gray-900">
                    {job.lastRun 
                      ? new Date(job.lastRun).toLocaleString() 
                      : 'Never'}
                  </div>
                </div>
              </div>
              
              <div className="flex flex-wrap gap-2">
                <Link
                  href={`/dashboard/indexing-jobs/${job.id}`}
                  className="px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-800 text-sm rounded transition-colors"
                >
                  Details
                </Link>
                
                {job.status === 'ACTIVE' ? (
                  <button className="px-3 py-1 bg-yellow-100 hover:bg-yellow-200 text-yellow-800 text-sm rounded transition-colors">
                    Pause
                  </button>
                ) : job.status === 'PAUSED' || job.status === 'INACTIVE' ? (
                  <button className="px-3 py-1 bg-green-100 hover:bg-green-200 text-green-800 text-sm rounded transition-colors">
                    Start
                  </button>
                ) : null}
                
                <button className="px-3 py-1 bg-red-100 hover:bg-red-200 text-red-800 text-sm rounded transition-colors">
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
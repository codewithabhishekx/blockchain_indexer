import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession();

  if (!session || !session.user) {
    redirect('/api/auth/signin');
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 justify-between">
            <div className="flex">
              <div className="flex flex-shrink-0 items-center">
                <Link href="/" className="text-xl font-bold text-blue-600">
                  Blockchain Indexer
                </Link>
              </div>
              <div className="ml-6 flex items-center space-x-4">
                <Link
                  href="/dashboard"
                  className="px-3 py-2 text-sm font-medium text-gray-900 hover:text-blue-600"
                >
                  Overview
                </Link>
                <Link
                  href="/dashboard/connections"
                  className="px-3 py-2 text-sm font-medium text-gray-900 hover:text-blue-600"
                >
                  Connections
                </Link>
                <Link
                  href="/dashboard/indexing-jobs"
                  className="px-3 py-2 text-sm font-medium text-gray-900 hover:text-blue-600"
                >
                  Indexing Jobs
                </Link>
              </div>
            </div>
            <div className="flex items-center">
              <div className="flex items-center">
                <div className="text-sm font-medium text-gray-500 mr-2">
                  {session.user.email}
                </div>
                <Link
                  href="/api/auth/signout"
                  className="text-sm font-medium text-gray-900 hover:text-blue-600"
                >
                  Sign out
                </Link>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="py-6">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {children}
        </div>
      </main>
    </div>
  );
} 
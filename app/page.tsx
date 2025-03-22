import Link from 'next/link';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 md:p-24">
      <div className="max-w-5xl w-full text-center">
        <h1 className="text-4xl md:text-6xl font-bold mb-6">
          Blockchain Indexing Platform
        </h1>
        <p className="text-xl md:text-2xl mb-12 max-w-3xl mx-auto">
          Easily index blockchain data into your PostgreSQL database without running your own RPC or validator nodes.
        </p>
        
        <div className="flex flex-col md:flex-row gap-4 justify-center">
          <Link
            href="/api/auth/signin"
            className="rounded-md bg-blue-600 px-6 py-3 text-lg font-semibold text-white hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Sign In
          </Link>
          <Link
            href="/dashboard"
            className="rounded-md bg-gray-200 px-6 py-3 text-lg font-semibold text-gray-800 hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500"
          >
            Dashboard
          </Link>
        </div>
        
        <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="border rounded-lg p-6 text-left">
            <h2 className="text-2xl font-bold mb-4">NFT Data</h2>
            <p>Track NFT bids, prices, and sales across various marketplaces in real-time.</p>
          </div>
          
          <div className="border rounded-lg p-6 text-left">
            <h2 className="text-2xl font-bold mb-4">Token Prices</h2>
            <p>Monitor token prices across different platforms for accurate market data.</p>
          </div>
          
          <div className="border rounded-lg p-6 text-left">
            <h2 className="text-2xl font-bold mb-4">Custom Indexing</h2>
            <p>Create custom indexing rules to track specific on-chain activities.</p>
          </div>
        </div>
        
        <div className="mt-16">
          <h2 className="text-3xl font-bold mb-6">How It Works</h2>
          <div className="flex flex-col md:flex-row gap-6 justify-between text-left">
            <div className="flex-1">
              <div className="bg-blue-100 rounded-full h-12 w-12 flex items-center justify-center mb-4">
                <span className="text-blue-600 font-bold text-lg">1</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">Connect Database</h3>
              <p>Provide your PostgreSQL database credentials to establish a connection.</p>
            </div>
            
            <div className="flex-1">
              <div className="bg-blue-100 rounded-full h-12 w-12 flex items-center justify-center mb-4">
                <span className="text-blue-600 font-bold text-lg">2</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">Configure Indexing</h3>
              <p>Choose what blockchain data you want to index and how it should be structured.</p>
            </div>
            
            <div className="flex-1">
              <div className="bg-blue-100 rounded-full h-12 w-12 flex items-center justify-center mb-4">
                <span className="text-blue-600 font-bold text-lg">3</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">Start Indexing</h3>
              <p>Begin receiving real-time blockchain data directly into your database.</p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

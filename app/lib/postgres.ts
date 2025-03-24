import { Pool, PoolClient ,Client} from 'pg';

// Database connection type
export interface DbConnectionInfo {
  id: string;
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
}

// Mapping function to convert Prisma DB connection to our interface
export function mapDbConnection(connection: any): DbConnectionInfo {
  return {
    id: connection.id,
    host: connection.host,
    port: connection.port,
    database: connection.database,
    username: connection.username,
    password: connection.password
  };
}

// Cache for database pools
const connectionPools = new Map<string, Pool>();

// Get or create a connection pool for a specific database
export function getConnectionPool(dbConnection: DbConnectionInfo): Pool {
  const { id, host, port, database, username, password } = dbConnection;
  
  // Check if we already have a pool for this connection
  if (connectionPools.has(id)) {
    return connectionPools.get(id) as Pool;
  }
  
  // Create a new pool
  const pool = new Pool({
    host,
    port,
    database,
    user: username,
    password,
    ssl: false, // Can be made configurable later
  });
  
  // Add connection error handler
  pool.on('error', (err: Error) => {
    console.error('Unexpected PostgreSQL pool error:', err);
    // Remove the pool from cache if it has a fatal error
    connectionPools.delete(id);
  });
  
  // Store in cache
  connectionPools.set(id, pool);
  
  return pool;
}

// Test a database connection
// export async function testConnection(dbConnection: DbConnectionInfo): Promise<boolean> {
  // const pool = getConnectionPool(dbConnection);
  // let client: PoolClient | null = null;
  
  // try {
  //   // Try to get a client from the pool
  //   client = await pool.connect();
  //   // Run a simple query
  //   await client.query('SELECT 1');
  //   return true;
  // } catch (error) {
  //   console.error('Failed to connect to database:', error);
  //   return false;
  // } finally {
  //   // Release the client back to the pool
  //   if (client) client.release();
  // }
  // Test a database connection
// }
export async function testConnection(dbConnection: DbConnectionInfo): Promise<boolean> {
  try {
    // Create a temporary client instead of using pool for testing
    const client = new Client({
      host: dbConnection.host,
      port: dbConnection.port,
      database: dbConnection.database,
      user: dbConnection.username,
      password: dbConnection.password,
      connectionTimeoutMillis: 5000, // 5 second timeout
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });

    await client.connect();
    await client.query('SELECT NOW()');
    await client.end();
    
    return true;
  } catch (error) {
    console.error('Database connection test failed:', error);
    return false;
  }
}



// Execute a query on a specific database
export async function executeQuery(
  dbConnection: DbConnectionInfo,
  query: string,
  params: unknown[] = []
): Promise<any> {
  const pool = getConnectionPool(dbConnection);
  let client: PoolClient | null = null;
  
  try {
    client = await pool.connect();
    const result = await client.query(query, params);
    return result.rows;
  } catch (error) {
    console.error('Error executing query:', error);
    throw error;
  } finally {
    if (client) client.release();
  }
}

// Create a table in the database
export async function createTable(
  dbConnection: DbConnectionInfo,
  tableName: string,
  columns: { name: string; type: string; constraints?: string }[]
): Promise<boolean> {
  const columnDefinitions = columns
    .map(col => `${col.name} ${col.type}${col.constraints ? ' ' + col.constraints : ''}`)
    .join(', ');
  
  const query = `
    CREATE TABLE IF NOT EXISTS ${tableName} (
      ${columnDefinitions}
    );
  `;
  
  try {
    await executeQuery(dbConnection, query);
    return true;
  } catch (error) {
    console.error(`Error creating table ${tableName}:`, error);
    return false;
  }
}

// Close all connection pools
export function closeAllPools(): Promise<void[]> {
  const closingPromises: Promise<void>[] = [];
  
  for (const pool of connectionPools.values()) {
    closingPromises.push(pool.end());
  }
  
  connectionPools.clear();
  return Promise.all(closingPromises);
} 
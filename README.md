# Blockchain Indexing Platform

A platform that enables developers to easily integrate and index blockchain data into a PostgreSQL database using Helius webhooks for seamless data indexing.

## Features

- **PostgreSQL Integration**: Connect your own PostgreSQL database to store blockchain data
- **Custom Data Indexing**: Choose what types of blockchain data to index (NFT bids, prices, token data, etc.)
- **Real-time Updates**: Leverage Helius webhooks for real-time blockchain data indexing
- **User Authentication**: Secure access to your indexing jobs and database connections
- **No Infrastructure Needed**: No need to run your own RPC, Geyser, or Validator nodes

## Tech Stack

- Next.js 15
- TypeScript
- Prisma ORM
- PostgreSQL
- TailwindCSS
- NextAuth.js for authentication
- Helius API for blockchain data

## Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL database
- Helius API key

### Installation

1. Clone the repository

```bash
git clone <repository-url>
cd blockchain-indexer
```

2. Install dependencies

```bash
npm install
```

3. Set up environment variables by copying the example file

```bash
cp .env.example .env
```

4. Update the `.env` file with your configuration:

```
# Database connection
DATABASE_URL="postgresql://username:password@localhost:5432/blockchain_indexer?schema=public"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key"

# Helius API
HELIUS_API_KEY="your-helius-api-key"
HELIUS_API_URL="https://api.helius.xyz/v0"
```

5. Set up the database

```bash
npx prisma db push
```

6. Start the development server

```bash
npm run dev
```

Your application should now be running at http://localhost:3000

## Usage

1. **Sign up/Login**: Create an account or log in to access the dashboard
2. **Add Database Connection**: Provide your PostgreSQL credentials to create a connection
3. **Create Indexing Job**: Choose what blockchain data you want to index
4. **Start Indexing**: Activate your job to begin indexing data into your database

## Available Indexing Types

- **NFT Bids**: Track current bids on NFTs
- **NFT Prices**: Monitor NFT prices across marketplaces
- **Token Borrow**: Index token borrowing offers and rates
- **Token Prices**: Track token prices across various platforms
- **Custom**: Define your own custom indexing format

## Deployment

The application can be deployed to any platform that supports Next.js, such as Vercel:

```bash
npm run build
npm run start
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

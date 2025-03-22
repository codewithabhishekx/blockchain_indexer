import { Session, DefaultSession } from "next-auth";

// Enum for data types to index - these should match those defined in schema.prisma
export enum DataType {
  NFT_BIDS = "NFT_BIDS",
  NFT_PRICES = "NFT_PRICES",
  TOKEN_BORROW = "TOKEN_BORROW",
  TOKEN_PRICES = "TOKEN_PRICES",
  CUSTOM = "CUSTOM"
}

// Enum for indexing job status
export enum IndexingStatus {
  ACTIVE = "ACTIVE",
  INACTIVE = "INACTIVE",
  PAUSED = "PAUSED",
  ERROR = "ERROR",
  COMPLETED = "COMPLETED"
}

// Enum for log levels
export enum LogLevel {
  INFO = "INFO",
  WARNING = "WARNING",
  ERROR = "ERROR",
  DEBUG = "DEBUG"
}

// Extend NextAuth Session type with userId
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      // name?: string | null;
      // email?: string | null;
      // image?: string | null;
    }& DefaultSession["user"];
  }
}

// Database connection form data
export interface DbConnectionFormData {
  name: string;
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
}

// Blockchain indexing job form data
export interface IndexingJobFormData {
  name: string;
  description?: string;
  dbConnectionId: string;
  dataType: DataType;
  config: Record<string, any>;
}

// Config types for different data types
export interface NFTBidsConfig {
  collection?: string;
  mint?: string;
  marketplaces?: string[];
  priceRange?: {
    min?: number;
    max?: number;
  };
}

export interface NFTPricesConfig {
  collection?: string;
  mint?: string;
  marketplaces?: string[];
  trackFloorPrice?: boolean;
}

export interface TokenBorrowConfig {
  token?: string;
  platforms?: string[];
  minAmount?: number;
}

export interface TokenPricesConfig {
  tokens: string[];
  platforms?: string[];
  updateInterval?: number;
}

// Helius webhook payload types
export interface HeliusWebhookPayload {
  webhookId: string;
  accountAddresses: string[];
  transactionSignature: string;
  type: string;
  timestamp: number;
  metadata?: Record<string, any>;
}

// API response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
} 
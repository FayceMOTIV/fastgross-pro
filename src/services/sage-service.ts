/**
 * SAGE Integration Service (Stub)
 *
 * This service provides a stub implementation for SAGE ERP integration.
 * In production, this would connect to the SAGE API or use file-based import/export.
 *
 * Common integration patterns:
 * - SAGE 100 via COM/ODBC
 * - SAGE X3 via REST API
 * - File-based import/export (EDI, CSV, XML)
 */

import type { Client, Product, Order, SageSyncLog } from "@/types";


// Simulated delay for stub responses
const simulateDelay = (ms = 500) => new Promise((resolve) => setTimeout(resolve, ms));

export interface SageClient {
  CT_Num: string;
  CT_Intitule: string;
  CT_Adresse: string;
  CT_CodePostal: string;
  CT_Ville: string;
  CT_Telephone: string;
  CT_EMail: string;
  CT_Siret: string;
}

export interface SageProduct {
  AR_Ref: string;
  AR_Design: string;
  AR_PrixVen: number;
  AR_QteStock: number;
  FA_CodeFamille: string;
}

export interface SageOrder {
  DO_Piece: string;
  DO_Date: string;
  DO_Ref: string;
  CT_Num: string;
  DO_TotalHT: number;
  DO_TotalTTC: number;
}

// Check SAGE connection status
export async function checkConnection(): Promise<boolean> {
  await simulateDelay(200);
  // Stub: always returns true in development
  console.log("[SAGE] Connection check - stub mode");
  return true;
}

// Import clients from SAGE
export async function importClients(): Promise<{
  imported: number;
  updated: number;
  errors: string[];
}> {
  await simulateDelay(1500);
  console.log("[SAGE] Import clients - stub mode");

  // Stub response
  return {
    imported: 15,
    updated: 8,
    errors: [],
  };
}

// Export clients to SAGE
export async function exportClients(clients: Client[]): Promise<{
  exported: number;
  errors: string[];
}> {
  await simulateDelay(1000);
  console.log("[SAGE] Export clients - stub mode", clients.length);

  return {
    exported: clients.length,
    errors: [],
  };
}

// Import products from SAGE
export async function importProducts(): Promise<{
  imported: number;
  updated: number;
  errors: string[];
}> {
  await simulateDelay(2000);
  console.log("[SAGE] Import products - stub mode");

  return {
    imported: 150,
    updated: 45,
    errors: [],
  };
}

// Export order to SAGE
export async function exportOrder(order: Order): Promise<{
  success: boolean;
  sageOrderId?: string;
  error?: string;
}> {
  await simulateDelay(800);
  console.log("[SAGE] Export order - stub mode", order.id);

  // Generate fake SAGE order ID
  const sageOrderId = `BC${Date.now().toString().slice(-8)}`;

  return {
    success: true,
    sageOrderId,
  };
}

// Get stock levels from SAGE
export async function getStockLevels(productRefs: string[]): Promise<
  Record<string, number>
> {
  await simulateDelay(500);
  console.log("[SAGE] Get stock levels - stub mode", productRefs.length);

  // Stub: return random stock levels
  const stocks: Record<string, number> = {};
  productRefs.forEach((ref) => {
    stocks[ref] = Math.floor(Math.random() * 500);
  });

  return stocks;
}

// Create sync log
export async function createSyncLog(
  type: SageSyncLog["type"],
  direction: SageSyncLog["direction"]
): Promise<SageSyncLog> {
  const log: SageSyncLog = {
    id: `sync_${Date.now()}`,
    type,
    direction,
    status: "success",
    itemsProcessed: 0,
    startedAt: new Date(),
  };

  return log;
}

// Update sync log
export function updateSyncLog(
  log: SageSyncLog,
  _updates: Partial<SageSyncLog>
): SageSyncLog {
  return {
    ...log,
    ..._updates,
  };
}

// Full sync process
export async function runFullSync(): Promise<{
  clients: { imported: number; exported: number };
  products: { imported: number };
  orders: { exported: number };
  duration: number;
}> {
  const startTime = Date.now();

  console.log("[SAGE] Starting full sync - stub mode");

  // Simulate sync process
  await simulateDelay(3000);

  const duration = Date.now() - startTime;

  return {
    clients: { imported: 15, exported: 5 },
    products: { imported: 150 },
    orders: { exported: 12 },
    duration,
  };
}

// Map SAGE client to our Client type
export function mapSageClientToClient(sageClient: SageClient): Partial<Client> {
  return {
    nom: sageClient.CT_Intitule,
    siret: sageClient.CT_Siret,
    adresse: sageClient.CT_Adresse,
    codePostal: sageClient.CT_CodePostal,
    ville: sageClient.CT_Ville,
    telephone: sageClient.CT_Telephone,
    email: sageClient.CT_EMail,
  };
}

// Map SAGE product to our Product type
export function mapSageProductToProduct(sageProduct: SageProduct): Partial<Product> {
  return {
    ref: sageProduct.AR_Ref,
    nom: sageProduct.AR_Design,
    prix: sageProduct.AR_PrixVen,
    stockActuel: sageProduct.AR_QteStock,
    categorie: sageProduct.FA_CodeFamille as Product['categorie'],
  };
}

// Map our Order to SAGE format
export function mapOrderToSageOrder(order: Order): Partial<SageOrder> {
  return {
    DO_Ref: order.id,
    DO_Date: new Date(order.createdAt).toISOString().split("T")[0],
    CT_Num: order.clientId,
    DO_TotalHT: order.totalHT,
    DO_TotalTTC: order.totalTTC,
  };
}

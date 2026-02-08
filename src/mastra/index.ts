/**
 * Configuration principale Mastra pour FASTGROSS PRO
 * 5 Agents IA pour optimiser les ventes et la logistique
 */

import { Mastra } from "@mastra/core";
import { salesAgent } from "./agents/sales-agent";
import { scanAgent } from "./agents/scan-agent";
import { b2bAgent } from "./agents/b2b-agent";
import { managerAgent } from "./agents/manager-agent";
import { deliveryAgent } from "./agents/delivery-agent";

export const mastra = new Mastra({
  agents: {
    salesAgent,
    scanAgent,
    b2bAgent,
    managerAgent,
    deliveryAgent,
  },
});

// Export individual agents for direct access
export { salesAgent, scanAgent, b2bAgent, managerAgent, deliveryAgent };

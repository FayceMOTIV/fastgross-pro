/**
 * API Route: Chat avec les agents IA Mastra
 * POST /api/ai/chat
 */

import { NextRequest, NextResponse } from "next/server";
import { mastra } from "@/mastra";

interface ChatRequest {
  agent: "sales" | "scan" | "b2b" | "manager" | "delivery";
  message: string;
  history?: Array<{ role: string; content: string }>;
}

const AGENT_MAP = {
  sales: "salesAgent",
  scan: "scanAgent",
  b2b: "b2bAgent",
  manager: "managerAgent",
  delivery: "deliveryAgent",
} as const;

export async function POST(request: NextRequest) {
  try {
    const body: ChatRequest = await request.json();
    const { agent, message, history } = body;

    if (!agent || !message) {
      return NextResponse.json(
        { error: "Agent et message requis" },
        { status: 400 }
      );
    }

    const agentName = AGENT_MAP[agent];
    if (!agentName) {
      return NextResponse.json(
        { error: "Agent non reconnu" },
        { status: 400 }
      );
    }

    // Get the agent from Mastra
    const mastraAgent = mastra.getAgent(agentName);
    if (!mastraAgent) {
      return NextResponse.json(
        { error: "Agent non disponible" },
        { status: 500 }
      );
    }

    // Build context from history
    let contextMessage = message;
    if (history && history.length > 0) {
      const historyContext = history
        .slice(-5) // Last 5 messages
        .map((msg) => `${msg.role === "user" ? "Utilisateur" : "Assistant"}: ${msg.content}`)
        .join("\n");
      contextMessage = `Contexte de la conversation:\n${historyContext}\n\nNouvelle question: ${message}`;
    }

    // Generate response from agent using simple string input
    const result = await mastraAgent.generate(contextMessage);

    // Extract text response
    const responseText = result.text || "Je n'ai pas pu générer de réponse.";

    return NextResponse.json({
      response: responseText,
      agent: agentName,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Erreur API chat:", error);
    return NextResponse.json(
      {
        error: "Erreur lors du traitement de la requête",
        details: error instanceof Error ? error.message : "Erreur inconnue",
      },
      { status: 500 }
    );
  }
}

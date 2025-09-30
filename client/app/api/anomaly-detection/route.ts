import { type NextRequest, NextResponse } from "next/server";
import { generateText } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";

export async function POST(request: NextRequest) {
  try {
    const { batchData, transferHistory, medicalRecords } = await request.json();

    // Initialize Google AI with API key
    const google = createGoogleGenerativeAI({
      apiKey: process.env.GOOGLE_GEMINI_API_KEY,
    });

    const prompt = `You are an expert pharmaceutical supply chain auditor. Analyze this data and provide a structured, professional assessment.

BATCH INFORMATION:
- Batch ID: ${batchData.batchId}
- Drug Name: ${batchData.drugName}
- Manufacturer: ${batchData.manufacturer}
- Manufacturing Date: ${batchData.manufacturingDate}
- Expiry Date: ${batchData.expiryDate}
- Quantity: ${batchData.quantity}

TRANSFER HISTORY:
${transferHistory
  .map(
    (transfer: any, index: number) => `
${index + 1}. ${transfer.from} → ${transfer.to}
   Date: ${transfer.timestamp}
   Location: ${transfer.location}
   Temperature: ${transfer.temperature}°C
   Condition: ${transfer.condition}
`
  )
  .join("")}

Medical Records: ${medicalRecords.length} associated records

Provide your analysis in this EXACT format:

RISK SCORE: [number from 1-10]

EXECUTIVE SUMMARY:
[2-3 sentence overview of findings]

CRITICAL ISSUES:
[List any critical problems found, or write "None identified"]

WARNINGS:
[List any moderate concerns, or write "None identified"]

OBSERVATIONS:
[List any minor notes or positive findings]

COMPLIANCE STATUS:
[Brief assessment of regulatory compliance]

RECOMMENDATIONS:
[Numbered list of 3-5 specific action items]

Keep responses concise and actionable. Focus on facts, not speculation.`;

    const { text } = await generateText({
      model: google("gemini-2.0-flash-exp"),
      prompt,
      maxTokens: 1500,
      temperature: 0.3,
    });

    // Extract risk score with multiple patterns
    const riskScoreMatch =
      text.match(/RISK\s*SCORE[:\s]*(\d+)/i) ||
      text.match(/risk[:\s]*(\d+)/i) ||
      text.match(/score[:\s]*(\d+)/i);
    const riskScore = riskScoreMatch ? Number.parseInt(riskScoreMatch[1]) : 5;

    // Parse the structured response
    const sections = {
      riskScore,
      executiveSummary: extractSection(text, "EXECUTIVE SUMMARY"),
      criticalIssues: extractSection(text, "CRITICAL ISSUES"),
      warnings: extractSection(text, "WARNINGS"),
      observations: extractSection(text, "OBSERVATIONS"),
      complianceStatus: extractSection(text, "COMPLIANCE STATUS"),
      recommendations: extractSection(text, "RECOMMENDATIONS"),
    };

    return NextResponse.json({
      analysis: text,
      riskScore,
      structured: sections,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Anomaly detection error:", error);
    return NextResponse.json(
      { error: "Failed to analyze data for anomalies" },
      { status: 500 }
    );
  }
}

function extractSection(text: string, sectionName: string): string {
  const regex = new RegExp(
    `${sectionName}[:\\s]*([\\s\\S]*?)(?=\\n\\n[A-Z]+:|$)`,
    "i"
  );
  const match = text.match(regex);
  return match ? match[1].trim() : "Not available";
}

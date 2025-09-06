
import { GoogleGenAI, Type } from "@google/genai";
import type { AnalysisResult } from '../types';

if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable is not set.");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const clauseAnalysisSchema = {
    type: Type.OBJECT,
    properties: {
        interpretation: {
            type: Type.STRING,
            description: "A neutral, technical explanation of what the clause enables or controls. What does it do?"
        },
        exposure: {
            type: Type.STRING,
            description: "An analysis of potential vulnerabilities, risks, or liabilities for the organization reviewing the contract. Where could this clause cause problems?"
        },
        opportunity: {
            type: Type.STRING,
            description: "An analysis of potential leverage, negotiation hooks, or remedies available. How can this clause be used to our advantage or improved?"
        },
        clauseTag: {
            type: Type.STRING,
            description: "Classify the clause using ONE of the following 10 tags: TEC, LEG, FIN, COM, IPX, TRM, DIS, DOC, EXE, EXT."
        },
        riskScore: {
            type: Type.STRING,
            description: "Assign a risk score from one of the following 3 tiers: Critical, Material, Procedural."
        },
        riskCategories: {
            type: Type.ARRAY,
            items: {
                type: Type.STRING
            },
            description: "List all applicable risk categories from the following: Financial, Legal, Operational, Compliance, Reputational, Strategic."
        },
        negotiationRecommendation: {
            type: Type.STRING,
            description: "Provide a concise, actionable recommendation for negotiation. E.g., 'Suggest adding a cap on liability' or 'Clarify the definition of Confidential Information'."
        }
    },
    required: ["interpretation", "exposure", "opportunity", "clauseTag", "riskScore", "riskCategories", "negotiationRecommendation"]
};


async function splitContractIntoClauses(contractText: string): Promise<string[]> {
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: `Given the following legal contract, split it into individual clauses. A clause is typically a numbered or lettered paragraph. Return the result as a JSON array of strings, where each string is a complete clause. Do not include introductory text that is not part of a numbered clause.
            
            Contract:
            ${contractText}`,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        clauses: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.STRING,
                                description: "A single clause from the contract."
                            }
                        }
                    },
                    required: ["clauses"]
                }
            }
        });
        
        const jsonResponse = JSON.parse(response.text);
        if (jsonResponse && Array.isArray(jsonResponse.clauses)) {
            return jsonResponse.clauses;
        }
        throw new Error("Invalid format for clause splitting response.");

    } catch (error) {
        console.error("Error splitting contract into clauses:", error);
        throw new Error("Failed to split contract into clauses. The AI model may be temporarily unavailable.");
    }
}

async function analyzeClause(clauseText: string): Promise<Omit<AnalysisResult, 'clause'>> {
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: `Analyze the following contract clause according to the NEEX Legal Contract Review Blueprint. Your response MUST be a single JSON object that conforms to the provided schema. Do not include any markdown formatting.

            Clause to Analyze: "${clauseText}"`,
            config: {
                systemInstruction: "You are a world-class legal AI assistant specializing in contract review. You must follow the NEEX Legal Contract Review Blueprint for Service & Deliverables Contracts. For the given contract clause, you must perform a comprehensive, clause-by-clause analysis based on three layers: Interpretation (what it does), Exposure (risks), and Opportunity (leverage).",
                responseMimeType: "application/json",
                responseSchema: clauseAnalysisSchema,
            }
        });

        const jsonResponse = JSON.parse(response.text);
        // Basic validation
        if (jsonResponse && jsonResponse.interpretation && jsonResponse.riskScore) {
             return jsonResponse as Omit<AnalysisResult, 'clause'>;
        }
        throw new Error("AI response is missing required fields.");

    } catch (error) {
        console.error(`Error analyzing clause: "${clauseText}"`, error);
        throw new Error(`Failed to analyze clause: "${clauseText.substring(0, 50)}...". The model may have returned an invalid format.`);
    }
}

export async function performFullAnalysis(
    contractText: string,
    onProgress: (progress: { current: number, total: number }) => void
): Promise<AnalysisResult[]> {
    const clauses = await splitContractIntoClauses(contractText);
    if (clauses.length === 0) {
        throw new Error("No clauses were identified in the provided text.");
    }

    const totalClauses = clauses.length;
    onProgress({ current: 0, total: totalClauses });
    
    const analysisResults: AnalysisResult[] = [];
    
    for (let i = 0; i < totalClauses; i++) {
        const clause = clauses[i];
        const analysisData = await analyzeClause(clause);
        analysisResults.push({
            clause,
            ...analysisData
        });
        onProgress({ current: i + 1, total: totalClauses });
    }

    return analysisResults;
}

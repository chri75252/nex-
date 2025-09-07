import OpenAI from 'openai';
import type { ChatCompletion } from 'openai/resources/chat';
import type { AnalysisResult, ClauseTag } from '../types';

// WARNING: Storing API keys in client-side code is insecure and should not be done in production.
// This is for demonstration purposes only, as per the user's request.
const apiKey = "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";

if (!apiKey) {
    throw new Error("API_KEY is not set.");
}

const ai = new OpenAI({
    apiKey,
    dangerouslyAllowBrowser: true, // This is required for client-side usage
});

const MODEL = 'gpt-5';

/**
 * A wrapper for the ai.chat.completions.create call that includes a retry mechanism
 * with exponential backoff to handle transient API errors.
 */
async function chatCompletionWithRetry(
    params: OpenAI.Chat.ChatCompletionCreateParams,
    maxRetries = 3,
    initialDelay = 1000
): Promise<ChatCompletion> {
    let lastError: Error | null = null;
    for (let i = 0; i < maxRetries; i++) {
        try {
            const response = await ai.chat.completions.create(params);
            if (response && response.choices && response.choices.length > 0 && response.choices[0].message?.content) {
                 return response;
            }
            throw new Error("Received an empty or invalid response from the API.");
        } catch (error) {
            lastError = error as Error;
            console.warn(`API call attempt ${i + 1} of ${maxRetries} failed. Retrying in ${initialDelay * (2 ** i)}ms...`, error);
            if (i < maxRetries - 1) {
                await new Promise(resolve => setTimeout(resolve, initialDelay * (2 ** i)));
            }
        }
    }
    // If all retries fail, throw the last captured error.
    throw lastError;
}


// A JSON schema definition for the OpenAI prompt
const clauseAnalysisSchema = {
    type: "object",
    properties: {
        interpretation: {
            type: "string",
            description: "A neutral, technical explanation of what the clause enables or controls. What does it do?"
        },
        exposure: {
            type: "string",
            description: "An analysis of potential vulnerabilities, risks, or liabilities for the organization reviewing the contract. Where could this clause cause problems?"
        },
        opportunity: {
            type: "string",
            description: "An analysis of potential leverage, negotiation hooks, or remedies available. How can this clause be used to our advantage or improved?"
        },
        clauseTag: {
            type: "string",
            description: "Classify the clause using ONE of the following 10 tags: TEC, LEG, FIN, COM, IPX, TRM, DIS, DOC, EXE, EXT."
        },
        riskScore: {
            type: "string",
            description: "Assign a risk score from one of the following 3 tiers: Critical, Material, Procedural."
        },
        riskCategories: {
            type: "array",
            items: {
                type: "string"
            },
            description: "List all applicable risk categories from the following: Financial, Legal, Operational, Compliance, Reputational, Strategic."
        },
        negotiationRecommendation: {
            type: "string",
            description: "Provide a concise, actionable recommendation for negotiation. E.g., 'Suggest adding a cap on liability' or 'Clarify the definition of Confidential Information'."
        },
        aiInvestigatoryQuestion: {
            type: "string",
            description: "An insightful, probing question an analyst should ask to uncover hidden risks or clarify ambiguity. E.g., 'Does 'best efforts' have a measurable definition in this context?'"
        },
        suggestedRedline: {
            type: "string",
            description: "If a textual change is recommended, provide the re-written clause as a 'redline' suggestion. This should be a direct, drop-in replacement for the original clause. If no change is needed, return an empty string."
        }
    },
    required: ["interpretation", "exposure", "opportunity", "clauseTag", "riskScore", "riskCategories", "negotiationRecommendation", "aiInvestigatoryQuestion", "suggestedRedline"]
};

const schemaAsString = JSON.stringify(clauseAnalysisSchema, null, 2);

async function splitContractIntoClauses(contractText: string): Promise<string[]> {
    try {
        const response = await chatCompletionWithRetry({
            model: MODEL,
            messages: [
                {
                    role: 'system',
                    content: 'You are a helpful assistant designed to output JSON.'
                },
                {
                    role: 'user',
                    content: `Given the following legal contract, split it into individual clauses. A clause is typically a numbered or lettered paragraph. Return the result as a JSON object with a single key "clauses" which is an array of strings, where each string is a complete clause. Do not include introductory text that is not part of a numbered clause.
            
                    Contract:
                    ${contractText}`
                }
            ],
            response_format: { type: "json_object" },
        });
        
        const content = response.choices[0].message.content;
        if (!content) {
            throw new Error("API returned no content.");
        }
        const jsonResponse = JSON.parse(content);
        if (jsonResponse && Array.isArray(jsonResponse.clauses)) {
            return jsonResponse.clauses;
        }
        throw new Error("Invalid format for clause splitting response.");

    } catch (error) {
        console.error("Error splitting contract into clauses after multiple retries:", error);
        throw new Error("Failed to split contract into clauses. The AI model seems to be unavailable or is returning an error. Please try again in a moment.");
    }
}

async function analyzeClause(clauseText: string): Promise<Omit<AnalysisResult, 'clause'>> {
    try {
        const response = await chatCompletionWithRetry({
            model: MODEL,
            messages: [
                 {
                    role: 'system',
                    content: "You are a world-class legal AI assistant specializing in contract review. You must follow the NEEX Legal Contract Review Blueprint for Service & Deliverables Contracts. For the given contract clause, you must perform a comprehensive, clause-by-clause analysis based on three layers: Interpretation (what it does), Exposure (risks), and Opportunity (leverage). Crucially, you must also formulate an 'AI Investigatory Question' and, if necessary, provide a 'Suggested Redline' with improved text for the clause to enhance clarity and defensibility. Your response MUST be a single JSON object that conforms to the provided schema. Do not include any markdown formatting or explanatory text."
                 },
                 {
                    role: 'user',
                    content: `Analyze the following contract clause according to the NEEX Legal Contract Review Blueprint. Your response MUST be a single JSON object that conforms to the schema provided below.
                    
                    Schema:
                    \`\`\`json
                    ${schemaAsString}
                    \`\`\`

                    Clause to Analyze: "${clauseText}"`
                 }
            ],
            response_format: { type: "json_object" },
        });

        const content = response.choices[0].message.content;
        if (!content) {
            throw new Error("API returned no content.");
        }

        const jsonResponse = JSON.parse(content);
        
        // Basic validation
        if (jsonResponse && jsonResponse.interpretation && jsonResponse.riskScore && jsonResponse.aiInvestigatoryQuestion && jsonResponse.suggestedRedline !== undefined) {
             return jsonResponse as Omit<AnalysisResult, 'clause'>;
        }
        throw new Error("AI response is missing required fields.");

    } catch (error) {
        console.error(`Error analyzing clause after multiple retries: "${clauseText}"`, error);
        throw new Error(`Failed to analyze clause: "${clauseText.substring(0, 50)}...". The model may have returned an invalid format or is currently unavailable.`);
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

        // Add a delay between clause analyses to avoid hitting API rate limits.
        // We don't need to wait after the very last clause.
        if (i < totalClauses - 1) {
            await new Promise(resolve => setTimeout(resolve, 250));
        }
    }

    return analysisResults;
}

export async function generateMissingClauseReport(clauseTags: ClauseTag[]): Promise<string> {
    const prompt = `Based on the NEEX Legal Contract Review Blueprint, a contract has been analyzed and found to contain clauses with the following tags: ${JSON.stringify(clauseTags)}.

The blueprint's modular checklist for a standard Service & Deliverables contract is as follows:
- BASE COMPONENTS: Scope of Work (TEC), Service Standards (TEC), Deliverables (TEC), Payment (FIN), Currency (FIN), Timeline (TEC/FIN), Term (TRM), Termination (TRM), Breach (TRM).
- RISK/LIABILITY: Indemnification (LEG), Limitations of Liability (LEG), Warranties (LEG), Force Majeure (LEG).
- OWNERSHIP/CONFIDENTIALITY: IP Assignment (IPX), Confidentiality (COM).
- COMPLIANCE/LEGAL: Compliance Statement (COM), Governing Law (DIS), Dispute Resolution (DIS).

Analyze the provided list of tags and identify which key components from the checklist appear to be missing. For each potentially missing component, provide a brief, high-level explanation of the risk associated with its absence. Structure your response as a markdown-formatted string. If no significant components are missing, state that the contract appears to be structurally comprehensive.`;

    try {
        const response = await chatCompletionWithRetry({
            model: MODEL,
            messages: [
                {
                    role: 'system',
                    content: 'You are a helpful legal AI assistant. Your response should be in markdown format.'
                },
                {
                    role: 'user',
                    content: prompt
                }
            ],
        });
        const content = response.choices[0].message.content;
        if (!content) {
            throw new Error("API returned no content for missing clause report.");
        }
        return content;
    } catch (error) {
        console.error("Error generating missing clause report after multiple retries:", error);
        throw new Error("Failed to generate the missing clauses report. The AI model may be unavailable.");
    }
}

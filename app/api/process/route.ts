import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini client
const apiKey = process.env.GEMINI_API_KEY;

export async function POST(request: Request) {
    if (!apiKey) {
        return NextResponse.json(
            { error: 'GEMINI_API_KEY is not defined' },
            { status: 500 }
        );
    }

    try {
        const { text, existingProjects } = await request.json();

        if (!text) {
            return NextResponse.json({ error: 'Text is required' }, { status: 400 });
        }

        // Construct the dynamic list of existing projects for context
        const projectContext = existingProjects && existingProjects.length > 0
            ? `EXISTING PROJECTS (ID: Name): \n${existingProjects.map((p: any) => `- ${p.id}: ${p.name}`).join('\n')}`
            : 'NO EXISTING PROJECTS.';

        const SYSTEM_PROMPT = `
You are the Action Processor of a GTD-based Second Brain.
Your goal is to transform a raw thought into a standardized Task, and assign it to a Project.

${projectContext}

INSTRUCTIONS:
1. **REWRITE**: Clarify the thought into an actionable task title, BUT KEEP IT CLOSE TO THE ORIGINAL.
    - Start with a strong verb if missing (e.g., "Email", "Call", "Draft", "Buy").
    - **CRITICAL**: Do NOT remove specific details. Do NOT rewrite so heavily that the original meaning or "voice" is lost.
    - If the input is "Buy milk", KEEP IT as "Buy milk". Do NOT change to "Purchase dairy product".
    - Only clarify if the input is too vague to be actionable.
2. **CLASSIFY (GTD LIST)**:
    - "next": Do it ASAP.
    - "waiting": Waiting for someone else.
    - "someday": Good idea, maybe later.
3. **TAG**: Assign exactly one Time tag, and any relevant Context tags.
4. **MATCH PROJECT**: 
    - Attempt to match the task to an EXISTING PROJECT from the list above.
    - If it's a perfect match, set 'isNew' to false and provide the ID.
    - If it DOES NOT fit an existing project, suggest a NEW PROJECT name and a specific OUTCOME for that project. Set 'isNew' to true.
    - Assign a 'confidence' score (0-100) for your project choice. 

ALLOWED TAGS:
- Time: "5 min", "15 min", "30 min", "60 min+"
- Contexts: "@calls", "@computer", "@errands", "@home", "@office", "Admin"

OUTPUT JSON FORMAT:
{
  "rewrittenTitle": "string",
  "list": "next" | "waiting" | "someday",
  "tags": {
    "time": "5 min" | "15 min" | "30 min" | "60 min+",
    "contexts": ["string"]
  },
  "projectMatch": {
    "id": "string (existing ID)" | null,
    "name": "string (existing or new name)",
    "isNew": boolean,
    "outcome": "string (required if isNew, else null)",
    "confidence": number (0-100)
  }
}
`;

        console.log('Using Gemini API Key:', apiKey ? '***Present***' : 'Missing');
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({
            model: "gemini-flash-latest",
            generationConfig: { responseMimeType: "application/json" }
        });

        const result = await model.generateContent(`${SYSTEM_PROMPT}\n\nInput: ${text}`);
        const content = result.response.text();

        if (!content) {
            throw new Error('No content returned from AI');
        }

        const parsedResult = JSON.parse(content);

        return NextResponse.json(parsedResult);
    } catch (error) {
        console.error('AI Processing Error:', error);
        return NextResponse.json(
            { error: 'Failed to process thought' },
            { status: 500 }
        );
    }
}

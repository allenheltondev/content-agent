import { DynamoDBClient, GetItemCommand } from "@aws-sdk/client-dynamodb";
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { BedrockAgentCoreClient, RetrieveMemoryRecordsCommand } from '@aws-sdk/client-bedrock-agentcore';
import { createSuggestionsTool, saveBrandAuditTool } from "../tools/index.mjs";
import { convertToBedrockTools } from "../utils/tools.mjs";
import { converse, getMemoryId } from "../utils/agents.mjs";
import { loadContent } from "../utils/content.mjs";

const ddb = new DynamoDBClient();
const agentCore = new BedrockAgentCoreClient();

const tools = convertToBedrockTools([saveBrandAuditTool, createSuggestionsTool]);
const AGENT_ID = 'brand-auditor';
export const handler = async (event) => {
  try {
    const { tenantId, sessionId, contentId } = event;
    const actorId = `${AGENT_ID}/${tenantId}/${contentId}`;
    const content = await loadContent(tenantId, contentId);
    const providedBrandInformation = await buildProvidedInformationBlock(tenantId);
    const learnedBrandInformation = await buildLearnedInformationBlock(tenantId);

    const systemPrompt = `
### Role
You are **Brand-Auditor**, an editorial analysis agent. Your responsibility is to evaluate how authentically a draft reflects the author's brand voice. You will compare the draft against two inputs: (1) the author's provided brand information (their self-declared tone and style), and (2) the learned brand information (patterns of how they actually write, extracted from prior content). When the two differ, give greater weight to the learned brand information, as it reflects the author's real voice in practice.
${providedBrandInformation}
${learnedBrandInformation}

### Instructions
- Use both the provided grand information and learned brand information to ground your analysis, always prioritizing learned information when it conflicts with the provided brand info. If learned brand information isn't provided, go solely from the information provided by the author.
- Focus only on tone, style, and brand alignment. Do not evaluate grammar, factual correctness, or AI-likeness.
- Always record your audit once with the \`saveBrandAudit\` tool.
- Only propose surgical edits if they make the draft more authentically aligned to the author's brand.

### Steps
1. Audit & Score
   - Compare the draft directly against the provided brand information sources:
     - Tone alignment (40%) - match of emotional feel, register, and confidence relative to the author's declared tone and especially the learned tone.
     - Style alignment (40%) - match of sentence flow, rhythm, level of detail, and structural patterns compared to both provided and learned style, with greater weight on learned.
     - Consistency (20%) - whether the draft maintains the same brand voice throughout or drifts between conflicting tones/styles.
   - Assign each dimension a 0-1 score (lower = less aligned, more off-brand). Blend into an overall weighted score.
   - Provide a short rationale (2-3 sentences) explaining where the draft aligns and where it drifts, explicitly citing both provided vs. learned brand cues.
   - Add 2-3 red-flag bullets (e.g., "too formal compared to learned casual style," "reads corporate vs. declared approachable tone").

2. Record Results
   - Call \`saveBrandAudit\` exactly once with \`{ contentId, scores, rationale, redFlags } \`.

3. Suggest Edits (Optional)
   - If minor fixes will bring the draft closer to the author's authentic brand voice, call \`createSuggestions\`:
     - ≤ 10 proposals.
     - Each must include the exact \`anchorText\` and precise replacement.
     - Prioritize: high (text that directly contradicts learned voice), medium (generic or inconsistent phrasing), low (light polish).
   - Skip suggestions if the draft already aligns closely to both provided and learned brand info.

### End goal / Expectations
- Produce an audit that makes clear whether the draft authentically sounds like the author.
- Explicitly reference both provided and learned brand inputs, clarifying when they agree or diverge.
- Give the author confidence that their draft reflects their true voice, or highlight exactly where it doesn't, but relay that information only in the saveBrandAudit tool.
- Provide a concise response back to the user indicating the audit was performed successfully and optionally the number of suggestions made. Only do this to keep your response small.

### Narrowing / Novelty
- Narrow scope: evaluate only voice/tone/style alignment to the author's brand profile. Leave AI detection, grammar, and fact-checking to other agents.
- Novelty: emphasize weighting of learned brand information over provided declarations if they conflict, since the learned signals reflect actual writing behavior.
- Always act as an ally: suggest only minimal, surgical edits to keep the content feeling like the author's own work.
`;

    const userPrompt = `
contentId: ${contentId}
content:
${content.body}
`;
    const response = await converse('amazon.nova-lite-v1:0', systemPrompt, userPrompt, tools, {
      tenantId,
      sessionId,
      actorId
    });

    return { message: response };
  } catch (err) {
    console.error(err);
    throw err;
  }
};

const buildProvidedInformationBlock = async (tenantId) => {
  try {
    const response = await ddb.send(new GetItemCommand({
      TableName: process.env.TABLE_NAME,
      Key: marshall({
        pk: tenantId,
        sk: 'profile'
      })
    }));
    if (!response) {
      return '';
    }

    const brand = unmarshall(response.Item);

    return `

## Provided information
The author has provided the following information about how they perceive the way they write.

### Tone
${brand.tone}

### Style
${brand.style}
`;
  } catch (err) {
    console.warn('Could not load brand data', err);
    return '';
  }
};

const buildLearnedInformationBlock = async (tenantId) => {
  try {
    const memoryId = await getMemoryId();
    const response = await agentCore.send(new RetrieveMemoryRecordsCommand({
      memoryId,
      namespace: `${tenantId}-writing`,
      searchCriteria: {
        searchQuery: 'What are the defining characteristics of the tone and writing style of the actor',
        topK: 15
      }
    }));

    let learnedInformationBlock = `

    ## Learned information
    `;
    if (!response.memoryRecordSummaries?.length) {
      learnedInformationBlock += 'There is no learned information about how the author writes yet.';
    } else {
      learnedInformationBlock += `The information below comes from information extracted from previous content of the user. Below you will find the facts and the scores of the relevance of each fact:
      ${response.memoryRecordSummaries.map(mrs => `- fact: ${mrs.content}
          score: ${mrs.score}`).join('\n')}`;
    }
    return learnedInformationBlock;
  } catch (err) {
    console.warn('Could not load learned data', err);
    return '';
  }
};

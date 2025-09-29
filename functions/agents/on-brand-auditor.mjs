import { DynamoDBClient, GetItemCommand } from "@aws-sdk/client-dynamodb";
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { BedrockAgentCoreClient, RetrieveMemoryRecordsCommand } from '@aws-sdk/client-bedrock-agentcore';
import { createSuggestionsTool } from "../tools/index.mjs";
import { convertToBedrockTools } from "../utils/tools.mjs";
import { converse, getMemoryId } from "../utils/agents.mjs";
import { loadContent } from "../utils/content.mjs";

const ddb = new DynamoDBClient();
const agentCore = new BedrockAgentCoreClient();

const tools = convertToBedrockTools([saveLlmAuditTool, createSuggestionsTool]);
const AGENT_ID = 'brand-auditor';
export const handler = async (event) => {
  try {
    const { tenantId, sessionId, contentId } = event;
    const actorId = `${AGENT_ID}/${tenantId}/${contentId}`;
    const content = await loadContent(tenantId, contentId);
    const providedBrandInformation = await buildProvidedInformationBlock(tenantId);
    const learnedBrandInformation = await buildLearnedInformationBlock(tenantId);

    const systemPrompt = `
You are Brand-Auditor, an editorial auditor. Your job on each run:

1) Grade how much the article reads like it was authentically written by the author.
2) Record your audit via the **saveBrandAudit** tool (call it exactly once).
3) If changes are needed to make the author appear more on-brand, propose **minimal, surgical edits**.
   - You will be provided the entire content, provide the text and start/end offsets of your change to the tool.
   - You are not tasked with rewriting the entire article, but making suggestions how to make it sound like the author authentically wrote it.
${providedBrandInformation}
${learnedBrandInformation}

### Scoring rubric (0..1, higher = more LLM-like)
- style (35%): cliché/template tone
- specificity (25%): lack of concrete details (higher = more generic)
- repetition (20%): redundancy density
- risk_hallucination (20%): unsupported/confident claims
Compute **overall** as the weighted blend. Keep rationale to 2-3 sentences and add short red-flag bullets.

### Suggestions (minimal, safe, actionable)
- Prefer small patches: replace a phrase, split a long sentence, adjust structure, change a metaphor
- Send the exact text and characters to the tool you'd like to replace. It will not succeed if the textToReplace does not match the content exactly.
- ≤ 10 proposals per run. Use priorities: high (cliché openers, template conclusions, unsupported claims), medium (de-jargonize, split), low (polish).
- If you do not have offsets, DO NOT guess. Include exact text strings in the saveLlmAudit call.

### Tool policy
- **Always call saveBrandAudit once** with: { contentId, scores, rationale, redFlags }.
- **Only call createSuggestions** if recommendations are minor. Otherwise the author can rewrite themselves.
- Do not echo article text except inside anchorText of proposals.

You will receive:
- content identifier (contentId)
- user content text (content)

Proceed:
1) Score and prepare audit.
2) Call saveBrandAudit (always). If offsets are available and you prepared patches, call createSuggestions afterward with at most 10 items.
3) If no further action is needed, return a concise confirmation message.
`;

    const userPrompt = `
contentId: ${contentId}
content:
${content.body}
`;
    const response = await converse('amazon.nova-pro-v1:0', systemPrompt, userPrompt, tools, {
      tenantId,
      sessionId,
      actorId
    });

    return response;
  } catch (err) {
    console.error(err);
  }
};

const buildProvidedInformationBlock = async (tenantId) => {
  try {
    const response = await ddb.send(new GetItemCommand({
      TableName: process.env.TABLE_NAME,
      Key: marshall({
        pk: tenantId,
        sk: 'brand'
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

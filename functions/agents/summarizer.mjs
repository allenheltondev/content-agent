import { DynamoDBClient, PutItemCommand, QueryCommand } from "@aws-sdk/client-dynamodb";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";
import { converse } from "../utils/agents.mjs";
import { loadContent, getReadability } from "../utils/content.mjs";

const ddb = new DynamoDBClient();

export const handler = async (event) => {
  try {
    const { tenantId, contentId } = event;
    const content = await loadContent(tenantId, contentId);
    const metrics = getReadability(content.body);
    const audits = await loadAudits(tenantId, contentId, content.version);

    const systemPrompt = `
You are a content audit summarizer. Your job is to create a brief, informative 3-sentence summary of content audit results.

## Your Task

Write exactly 3 sentences that summarize the audit findings:

**Sentence 1**: Overview of the content and its overall quality
- Mention content type/topic if relevant
- Give the general impression (excellent, good, needs improvement, poor)

**Sentence 2**: Key strengths or what's working well
- Highlight positive audit results
- Mention specific areas of success (brand alignment, readability, quality)

**Sentence 3**: Primary areas for improvement
- Focus on the most important issues found
- Be specific but concise about what needs attention
- If content is excellent across the board, reinforce strengths or mention minor polish opportunities

## Writing Style

- Be clear and professional
- Use specific terminology from the audits (readability grade, brand alignment, etc.)
- Avoid jargon when simpler language works
- Be constructive, not critical
- Make it actionable - readers should understand what matters most

## Examples

**Mostly Good Content:**
"This 1,200-word blog post on cloud security demonstrates strong technical accuracy and brand voice alignment. The writing is clear with good readability (8th grade level, Flesch score 65) and maintains consistent terminology throughout. Minor improvements needed include simplifying 3 overly complex sentences and addressing 2 passive voice instances for better directness."

**Content Needing Work:**
"This product announcement contains solid information but requires significant refinement before publication. Brand voice is inconsistent in tone, and the content includes 8 grammar issues that impact professionalism. Readability is challenging (college level, Flesch score 42) with numerous long sentences averaging 28 words that should be broken up for clarity."

**Excellent Content:**
"This customer success story is publication-ready with strong performance across all quality metrics. The writing achieves an ideal balance of professionalism and accessibility (9th grade level, Flesch score 68) while perfectly aligning with brand guidelines. Only 2 minor suggestions for word choice optimization were identified."

## Output Format

Provide only the 3-sentence summary. No introduction, no bullet points, no additional commentary.

`;

    const userPrompt = `
title: ${content.title}
readability metrics:
${metrics}
audits:
${audits}
`;
    const response = await converse('amazon.nova-pro-v1:0', systemPrompt, userPrompt, []);

    await ddb.send(new PutItemCommand({
      TableName: process.env.TABLE_NAME,
      Item: marshall({
        pk: `${tenantId}#${contentId}`,
        sk: `summary#${content.version}`,
        summary: response
      })
    }));

    return { message: response };
  } catch (err) {
    console.error(err);
    throw err;
  }
};

const loadAudits = async (tenantId, contentId, version) => {
  try {
    const response = await ddb.send(new QueryCommand({
      TableName: process.env.TABLE_NAME,
      KeyConditionExpression: 'pk = :pk and begins_with(sk, :sk)',
      ExpressionAttributeValues: marshall({
        ':pk': `${tenantId}#${contentId}`,
        ':sk': `audit#${version}`
      })
    }));

    const audits = response.Items.map(item => {
      const audit = unmarshall(item);
      const type = audit.sk.split('#')[2];
      return `
      ${type.toUpperCase()} AUDIT
      ---------------------------
      Scores:
        ${Object.entries(audit.scores).map((key, value) => `${key}: ${value}`).join('\n        ')}
      Rationale:
        ${audit.rationale}
      Red Flags:
        ${audit.redFlags.length ? audit.redFlags.join('\n        - ') : 'None'}
      `;
    });

    return audits.join('\n\n');
  } catch (err) {
    console.error(err);
    return '';
  }
};

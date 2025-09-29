
import { z } from 'zod';
import { DynamoDBClient, PutItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall } from '@aws-sdk/util-dynamodb';
import { loadContent } from '../utils/content.mjs';

const ddb = new DynamoDBClient();

export const saveBrandAuditTool = {
  name: 'saveBrandAudit',
  description: 'Saves the audit results for on-brand-ness for content',
  schema: z.object({
    contentId: z.string().describe('Identifier of the content'),
    scores: z.object({
      overall: z.number().min(0).max(1).describe('How much the content reads like it was written by the author'),
      knownStyle: z.number().min(0).max(1).describe('How much the style is consistent with learned style about the author. Use 0 if author\'s learned style is unknown'),
      providedStyle: z.number().min(0).max(1).describe('How much the style is consistent with the author-provided style'),
      knownTone: z.number().min(0).max(1).describe('How much the tone feels like the learned tone of the author. Use 0 if the author\'s learned tone is unknown'),
      providedTone: z.number().min(0).max(1).describe('How much the tone feels like the provided tone of the author')
    }),
    rationale: z.string().min(1).max(500).describe('Brief summary of why the content received the scores'),
    redFlags: z.array(z.string().min(1)).max(20),
  }),
  handler: async (tenantId, { contentId, scores, rationale, redFlags }) => {
    try {
      let content;
      try {
        content = await loadContent(tenantId, contentId);
      } catch (e) {
        console.error(e);
        return { error: e.message };
      }

      await ddb.send(new PutItemCommand({
        TableName: process.env.TABLE_NAME,
        Item: marshall({
          pk: `${tenantId}#${contentId}`,
          sk: `audit#${content.version}#brand`,
          scores,
          rationale,
          redFlags,
          createdAt: Date.now()
        })
      }));

      return { message: `Audit saved for v${content.version} of the content` };
    } catch (err) {
      console.error(err);
      return { error: 'Something went wrong' };
    }
  }
};

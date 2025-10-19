import { BedrockAgentCoreClient, RetrieveMemoryRecordsCommand } from '@aws-sdk/client-bedrock-agentcore';
import { formatResponse } from '../utils/responses.mjs';
import { getTenantStatistics } from '../utils/tenant-statistics.mjs';
import { getMemoryId } from '../utils/agents.mjs';

const agentCore = new BedrockAgentCoreClient();

export const handler = async (event) => {
  try {
    const { tenantId } = event.requestContext.authorizer;

    if (!tenantId) {
      console.error('Missing tenantId in authorizer context');
      return formatResponse(401, { error: 'Unauthorized' });
    }

    const [statistics, insights] = await Promise.all([
      getTenantStatistics(tenantId),
      generateWritingInsights(tenantId)
    ]);

    const stats = statistics || {
      totalPosts: 0,
      totalSuggestions: 0,
      acceptedSuggestions: 0,
      rejectedSuggestions: 0,
      skippedSuggestions: 0,
      deletedSuggestions: 0,
      suggestionsByType: {
        grammar: { total: 0, accepted: 0, rejected: 0 },
        spelling: { total: 0, accepted: 0, rejected: 0 },
        style: { total: 0, accepted: 0, rejected: 0 },
        fact: { total: 0, accepted: 0, rejected: 0 },
        brand: { total: 0, accepted: 0, rejected: 0 }
      }
    };

    const totalPosts = stats.totalPosts || 0;
    const acceptanceRate = stats.totalSuggestions > 0
      ? stats.acceptedSuggestions / stats.totalSuggestions
      : 0;

    const response = {
      totalPosts,
      totalSuggestions: stats.totalSuggestions,
      acceptedSuggestions: stats.acceptedSuggestions,
      rejectedSuggestions: stats.rejectedSuggestions,
      skippedSuggestions: stats.skippedSuggestions,
      deletedSuggestions: stats.deletedSuggestions,
      acceptanceRate: Math.round(acceptanceRate * 100) / 100,
      suggestionsByType: stats.suggestionsByType,
      insights: insights || []
    };

    return formatResponse(200, response);
  } catch (error) {
    console.error('Get stats error:', error);
    return formatResponse(500, { message: 'Something went wrong' });
  }
};

const generateWritingInsights = async (tenantId) => {
  try {
    const memoryId = await getMemoryId();
    const response = await agentCore.send(new RetrieveMemoryRecordsCommand({
      memoryId,
      namespace: `${tenantId}-writing`,
      searchCriteria: {
        searchQuery: 'What are the defining characteristics of the tone and writing style of the actor',
        topK: 5
      }
    }));

    let writingInsights = 'You have not written enough content yet for insights';
    if (response.memoryRecordSummaries?.length) {
      writingInsights = `We have learned this about your writing: \n${response.memoryRecordSummaries.map(mrs => mrs.content).join('\n• ')}`;
    }
    return writingInsights;
  } catch (error) {
    console.error('Error generating writing insights:', error);
    return 'Could not load insight data.';
  }
};

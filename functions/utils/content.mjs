import { DynamoDBClient, GetItemCommand, QueryCommand } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import * as readability from 'text-readability-ts';

const tr = readability.default;
const ddb = new DynamoDBClient();

export const loadContent = async (tenantId, contentId) => {
  const foundContent = await ddb.send(new GetItemCommand({
    TableName: process.env.TABLE_NAME,
    Key: marshall({
      pk: `${tenantId}#${contentId}`,
      sk: 'content'
    })
  }));

  if (!foundContent.Item) {
    throw new Error(`Content with the id '${contentId}' could not be found.`);
  }

  const content = unmarshall(foundContent.Item);
  if (content.status == 'published' || content.status == 'abandoned') {
    throw new Error(`The content is in a '${content.status}' status and cannot be modified.`);
  }

  return content;
};

export const getReadability = (content) => {
  const wordCount = tr.lexiconCount(content);
  const difficultWords = tr.difficultWords(content);
  const metrics = {
    wordCount,
    difficultWords,
    sentences: tr.sentenceCount(content),
    fleschReadingEase: tr.fleschReadingEase(content),
    avgSentenceLength: tr.averageSentenceLength(content),
    avgSyllablePerWord: tr.averageSyllablePerWord(content),
    difficultWordRate: wordCount ? difficultWords / wordCount : 0,
    textStandard: tr.textStandard(content)
  };

  return metrics;
};
/**
 * Get the most recent summary for a content item
 * @param {string} tenantId - The tenant identifier
 * @param {string} contentId - The content identifier
 * @returns {Promise<string|null>} The most recent summary or null if none exists
 */
export const getMostRecentSummary = async (tenantId, contentId) => {
  try {
    // Query for all summaries for this content
    const response = await ddb.send(new QueryCommand({
      TableName: process.env.TABLE_NAME,
      KeyConditionExpression: 'pk = :pk AND begins_with(sk, :summaryPrefix)',
      ExpressionAttributeValues: marshall({
        pk: `${tenantId}#${contentId}`,
        summaryPrefix: 'summary#'
      })
    }));

    if (!response.Items || response.Items.length === 0) {
      return null;
    }

    // Parse versions and find the most recent one
    const summaries = response.Items.map(item => {
      const unmarshalled = unmarshall(item);
      const versionStr = unmarshalled.sk.replace('summary#', '');
      return {
        version: versionStr,
        summary: unmarshalled.summary,
        item: unmarshalled
      };
    });

    // Sort by version (handle both old integer format and new major.minor format)
    summaries.sort((a, b) => {
      const parseVersion = (version) => {
        if (typeof version === 'string' && version.includes('.')) {
          const [major, minor] = version.split('.').map(Number);
          return { major: major || 0, minor: minor || 0 };
        }
        // Handle legacy integer versions or string numbers
        const num = parseInt(version) || 0;
        return { major: num, minor: 0 };
      };

      const versionA = parseVersion(a.version);
      const versionB = parseVersion(b.version);

      if (versionA.major !== versionB.major) {
        return versionB.major - versionA.major; // Descending
      }
      return versionB.minor - versionA.minor; // Descending
    });

    return summaries[0].summary;
  } catch (error) {
    console.error('Error getting most recent summary:', error);
    return null;
  }
};

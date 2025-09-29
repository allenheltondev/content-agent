import { DynamoDBClient, GetItemCommand } from '@aws-sdk/client-dynamodb';
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

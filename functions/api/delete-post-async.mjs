import { DynamoDBClient, QueryCommand, BatchWriteItemCommand, DeleteItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';

const ddb = new DynamoDBClient();

export const handler = async (event) => {
  try {
    const { tenantId, postId } = event.detail;

    if (!tenantId || !postId) {
      throw new Error('Missing required parameters: tenantId and postId');
    }

    await cleanupSuggestions(tenantId, postId);
    await cleanupAuditReports(tenantId, postId);

    const message = { success: true };
    console.log(JSON.stringify(message));
    return message;
  } catch (error) {
    console.error(error);
    return { success: false };
  }
};

const cleanupSuggestions = async (tenantId, postId) => {
  try {
    const suggestions = await querySuggestions(tenantId, postId);

    if (suggestions.length === 0) {
      console.log('No suggestions found to delete', { tenantId, postId });
      return { deletedCount: 0, errors: [] };
    }

    const deleteResult = await batchDeleteItems(suggestions);

    console.log('Suggestions cleanup completed', {
      operation: 'cleanupSuggestions',
      tenantId,
      postId,
      foundCount: suggestions.length,
      deletedCount: deleteResult.deletedCount,
      errorCount: deleteResult.errors.length
    });

    return deleteResult;

  } catch (error) {
    console.error('Suggestions cleanup failed', {
      operation: 'cleanupSuggestions',
      tenantId,
      postId,
      error: error.message,
      stack: error.stack
    });

    return { deletedCount: 0, errors: [error.message] };
  }
};

const cleanupAuditReports = async (tenantId, postId) => {
  try {
    const audits = await queryAuditReports(tenantId, postId);

    if (audits.length === 0) {
      console.log('No audit reports found to delete', { tenantId, postId });
      return { deletedCount: 0, errors: [] };
    }

    const deleteResult = await batchDeleteItems(audits);

    console.log('Audit reports cleanup completed', {
      operation: 'cleanupAuditReports',
      tenantId,
      postId,
      foundCount: audits.length,
      deletedCount: deleteResult.deletedCount,
      errorCount: deleteResult.errors.length
    });

    return deleteResult;

  } catch (error) {
    console.error('Audit reports cleanup failed', {
      operation: 'cleanupAuditReports',
      tenantId,
      postId,
      error: error.message,
      stack: error.stack
    });

    return { deletedCount: 0, errors: [error.message] };
  }
};

const querySuggestions = async (tenantId, postId) => {
  const items = [];
  let lastEvaluatedKey = null;
  const partitionKey = `${tenantId}#${postId}`;

  do {
    const queryParams = {
      TableName: process.env.TABLE_NAME,
      KeyConditionExpression: 'pk = :pk AND begins_with(sk, :sk_prefix)',
      ExpressionAttributeValues: {
        ':pk': { S: partitionKey },
        ':sk_prefix': { S: 'suggestion#' }
      },
      ProjectionExpression: 'pk, sk',
      Limit: 100
    };

    if (lastEvaluatedKey) {
      queryParams.ExclusiveStartKey = lastEvaluatedKey;
    }

    const response = await ddb.send(new QueryCommand(queryParams));

    if (response.Items && response.Items.length > 0) {
      const validatedItems = response.Items
        .map(item => unmarshall(item))
        .filter(item => {
          const itemTenantId = item.pk.split('#')[0];
          if (itemTenantId !== tenantId) {
            return false;
          }
          return true;
        });

      items.push(...validatedItems);
    }

    lastEvaluatedKey = response.LastEvaluatedKey;

  } while (lastEvaluatedKey);

  return items;
};

const queryAuditReports = async (tenantId, postId) => {
  const items = [];
  let lastEvaluatedKey = null;
  const partitionKey = `${tenantId}#${postId}`;

  do {
    const queryParams = {
      TableName: process.env.TABLE_NAME,
      KeyConditionExpression: 'pk = :pk AND begins_with(sk, :sk_prefix)',
      ExpressionAttributeValues: {
        ':pk': { S: partitionKey },
        ':sk_prefix': { S: 'audit#' }
      },
      ProjectionExpression: 'pk, sk',
      Limit: 100
    };

    if (lastEvaluatedKey) {
      queryParams.ExclusiveStartKey = lastEvaluatedKey;
    }

    const response = await ddb.send(new QueryCommand(queryParams));

    if (response.Items && response.Items.length > 0) {
      const validatedItems = response.Items
        .map(item => unmarshall(item))
        .filter(item => {
          const itemTenantId = item.pk.split('#')[0];
          if (itemTenantId !== tenantId) {
            return false;
          }
          return true;
        });

      items.push(...validatedItems);
    }
    lastEvaluatedKey = response.LastEvaluatedKey;
  } while (lastEvaluatedKey);

  return items;
};

const batchDeleteItems = async (items) => {
  if (!items || items.length === 0) {
    return { deletedCount: 0, errors: [] };
  }

  const errors = [];
  const batchSize = 25;
  let totalDeleted = 0;

  const batches = [];
  for (let i = 0; i < items.length; i += batchSize) {
    batches.push(items.slice(i, i + batchSize));
  }

  for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
    const batch = batches[batchIndex];

    try {
      const result = await deleteBatchWithRetry(batch, batchIndex + 1);
      totalDeleted += result.deletedCount;

      if (result.errors.length > 0) {
        errors.push(...result.errors);
      }
    } catch (error) {
      const errorMsg = `Batch ${batchIndex + 1} failed completely: ${error.message}`;
      console.error('Batch deletion failed', {
        operation: 'batchDeleteItems',
        batchIndex: batchIndex + 1,
        batchSize: batch.length,
        error: error.message,
        stack: error.stack
      });
      errors.push(errorMsg);
    }
  }

  return { deletedCount: totalDeleted, errors };
};

const deleteBatchWithRetry = async (batch, batchNumber, maxRetries = 3) => {
  let itemsToDelete = [...batch];
  let deletedCount = 0;
  const errors = [];
  const originalBatchSize = batch.length;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    if (itemsToDelete.length === 0) {
      console.log(`Batch ${batchNumber} completed - all items processed`, {
        operation: 'deleteBatchWithRetry',
        batchNumber,
        attempt,
        deletedCount
      });
      break;
    }

    try {
      const deleteRequests = itemsToDelete.map(item => ({
        DeleteRequest: {
          Key: marshall({ pk: item.pk, sk: item.sk })
        }
      }));

      const batchWriteParams = {
        RequestItems: {
          [process.env.TABLE_NAME]: deleteRequests
        }
      };

      const response = await ddb.send(new BatchWriteItemCommand(batchWriteParams));
      const unprocessedCount = response.UnprocessedItems?.[process.env.TABLE_NAME]?.length || 0;
      const successfulDeletes = deleteRequests.length - unprocessedCount;
      deletedCount += successfulDeletes;
      if (response.UnprocessedItems && response.UnprocessedItems[process.env.TABLE_NAME]) {
        itemsToDelete = response.UnprocessedItems[process.env.TABLE_NAME].map(item =>
          unmarshall(item.DeleteRequest.Key)
        );

        if (attempt < maxRetries) {
          const backoffMs = Math.pow(2, attempt) * 100;
          await new Promise(resolve => setTimeout(resolve, backoffMs));
        }
      } else {
        itemsToDelete = [];
      }

    } catch (error) {
      console.error(`Batch ${batchNumber} attempt ${attempt} failed`, {
        operation: 'deleteBatchWithRetry',
        batchNumber,
        attempt,
        error: error.message,
        itemCount: itemsToDelete.length,
        isLastAttempt: attempt === maxRetries
      });

      if (attempt === maxRetries) {
        const individualResult = await deleteItemsIndividually(itemsToDelete, batchNumber);
        deletedCount += individualResult.deletedCount;
        errors.push(...individualResult.errors);
        itemsToDelete = [];
      } else {
        const backoffMs = Math.pow(2, attempt) * 100;
        console.log(`Batch ${batchNumber} waiting ${backoffMs}ms before retry after error`, {
          operation: 'deleteBatchWithRetry',
          batchNumber,
          attempt,
          backoffMs
        });
        await new Promise(resolve => setTimeout(resolve, backoffMs));
      }
    }
  }

  if (itemsToDelete.length > 0) {
    const errorMsg = `Batch ${batchNumber}: Failed to delete ${itemsToDelete.length} items after ${maxRetries} attempts and individual fallback`;
    console.error('Persistent batch deletion failure', {
      operation: 'deleteBatchWithRetry',
      batchNumber,
      remainingItems: itemsToDelete.length,
      maxRetries
    });
    errors.push(errorMsg);
  }
  return { deletedCount, errors };
};

const deleteItemsIndividually = async (items, batchNumber) => {
  if (!items || items.length === 0) {
    return { deletedCount: 0, errors: [] };
  }

  let deletedCount = 0;
  const errors = [];

  for (let i = 0; i < items.length; i++) {
    const item = items[i];

    try {
      await ddb.send(new DeleteItemCommand({
        TableName: process.env.TABLE_NAME,
        Key: marshall({ pk: item.pk, sk: item.sk })
      }));

      deletedCount++;
    } catch (error) {
      const errorMsg = `Failed to delete item ${item.pk}#${item.sk}: ${error.message}`;

      console.error('Individual item deletion failed', {
        operation: 'deleteItemsIndividually',
        batchNumber,
        itemIndex: i + 1,
        pk: item.pk,
        sk: item.sk,
        error: error.message,
        errorCode: error.name
      });

      errors.push(errorMsg);
    }

    if (i < items.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 10));
    }
  }

  return { deletedCount, errors };
};

import { DynamoDBClient, GetItemCommand, PutItemCommand, UpdateItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';

const ddb = new DynamoDBClient();
const TABLE_NAME = process.env.TABLE_NAME;

/**
 * Get tenant statistics record
 * @param {string} tenantId - The tenant identifier
 * @returns {Promise<Object|null>} Statistics record or null if not found
 */
export const getTenantStatistics = async (tenantId) => {
  try {
    const response = await ddb.send(new GetItemCommand({
      TableName: TABLE_NAME,
      Key: marshall({
        pk: tenantId,
        sk: 'stats'
      })
    }));

    return response.Item ? unmarshall(response.Item) : null;
  } catch (error) {
    console.error('Error getting tenant statistics:', error);
    throw error;
  }
};

/**
 * Create initial tenant statistics record
 * @param {string} tenantId - The tenant identifier
 * @returns {Promise<Object>} Created statistics record
 */
export const createTenantStatistics = async (tenantId) => {
  const now = new Date().toISOString();
  const initialStats = {
    pk: tenantId,
    sk: 'stats',
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
    },
    createdAt: now,
    updatedAt: now
  };

  try {
    await ddb.send(new PutItemCommand({
      TableName: TABLE_NAME,
      Item: marshall(initialStats),
      ConditionExpression: 'attribute_not_exists(pk) AND attribute_not_exists(sk)'
    }));

    return initialStats;
  } catch (error) {
    if (error.name === 'ConditionalCheckFailedException') {
      // Record already exists, get and return it
      return await getTenantStatistics(tenantId);
    }
    console.error('Error creating tenant statistics:', error);
    throw error;
  }
};

/**
 * Increment suggestion counter for creation
 * @param {string} tenantId - The tenant identifier
 * @param {string} suggestionType - Type of suggestion (grammar, spelling, style, fact, brand)
 * @returns {Promise<void>}
 */
export const incrementSuggestionCreated = async (tenantId, suggestionType) => {
  const now = new Date().toISOString();

  try {
    await ddb.send(new UpdateItemCommand({
      TableName: TABLE_NAME,
      Key: marshall({
        pk: tenantId,
        sk: 'stats'
      }),
      UpdateExpression: 'ADD totalSuggestions :one, suggestionsByType.#type.total :one SET updatedAt = :now',
      ExpressionAttributeNames: {
        '#type': suggestionType
      },
      ExpressionAttributeValues: marshall({
        ':one': 1,
        ':now': now
      })
    }));
  } catch (error) {
    if (error.name === 'ValidationException' && error.message.includes('does not exist')) {
      await createTenantStatistics(tenantId);
      await incrementSuggestionCreated(tenantId, suggestionType);
    } else {
      console.error('Error incrementing suggestion created:', error);
      throw error;
    }
  }
};

/**
 * Update suggestion status counters
 * @param {string} tenantId - The tenant identifier
 * @param {string} suggestionType - Type of suggestion (grammar, spelling, style, fact, brand)
 * @param {string} newStatus - New status (accepted, rejected, deleted, skipped)
 * @param {string} [oldStatus] - Previous status for decrementing (optional)
 * @returns {Promise<void>}
 */
export const updateSuggestionStatus = async (tenantId, suggestionType, newStatus, oldStatus = null) => {
  const now = new Date().toISOString();

  // Build update expression parts
  const addExpressions = [];
  const setExpressions = ['updatedAt = :now'];
  const expressionAttributeNames = {
    '#type': suggestionType
  };
  const expressionAttributeValues = {
    ':now': now,
    ':one': 1,
    ':minusOne': -1
  };

  // Increment new status counters
  if (newStatus === 'accepted') {
    addExpressions.push('acceptedSuggestions :one');
    addExpressions.push('suggestionsByType.#type.accepted :one');
  } else if (newStatus === 'rejected') {
    addExpressions.push('rejectedSuggestions :one');
    addExpressions.push('suggestionsByType.#type.rejected :one');
  } else if (newStatus === 'deleted') {
    addExpressions.push('deletedSuggestions :one');
  } else if (newStatus === 'skipped') {
    addExpressions.push('skippedSuggestions :one');
  }

  // Decrement old status counters if provided
  if (oldStatus && oldStatus !== newStatus) {
    if (oldStatus === 'accepted') {
      addExpressions.push('acceptedSuggestions :minusOne');
      addExpressions.push('suggestionsByType.#type.accepted :minusOne');
    } else if (oldStatus === 'rejected') {
      addExpressions.push('rejectedSuggestions :minusOne');
      addExpressions.push('suggestionsByType.#type.rejected :minusOne');
    } else if (oldStatus === 'deleted') {
      addExpressions.push('deletedSuggestions :minusOne');
    } else if (oldStatus === 'skipped') {
      addExpressions.push('skippedSuggestions :minusOne');
    }
  }

  // Build final update expression
  let updateExpression = '';
  if (addExpressions.length > 0) {
    updateExpression += 'ADD ' + addExpressions.join(', ');
  }
  if (setExpressions.length > 0) {
    if (updateExpression) updateExpression += ' ';
    updateExpression += 'SET ' + setExpressions.join(', ');
  }

  try {
    await ddb.send(new UpdateItemCommand({
      TableName: TABLE_NAME,
      Key: marshall({
        pk: tenantId,
        sk: 'stats'
      }),
      UpdateExpression: updateExpression,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: marshall(expressionAttributeValues)
    }));
  } catch (error) {
    if (error.name === 'ValidationException' && error.message.includes('does not exist')) {
      // Statistics record doesn't exist, create it first
      await createTenantStatistics(tenantId);
      // Retry the update
      await updateSuggestionStatus(tenantId, suggestionType, newStatus, oldStatus);
    } else {
      console.error('Error updating suggestion status:', error);
      throw error;
    }
  }
};

/**
 * Bulk update suggestion statuses (for batch operations)
 * @param {string} tenantId - The tenant identifier
 * @param {Array} updates - Array of {suggestionType, newStatus, oldStatus} objects
 * @returns {Promise<void>}
 */
export const bulkUpdateSuggestionStatuses = async (tenantId, updates) => {
  if (!updates || updates.length === 0) return;

  const now = new Date().toISOString();

  // Aggregate all updates
  const counters = {
    totalSuggestions: 0,
    acceptedSuggestions: 0,
    rejectedSuggestions: 0,
    skippedSuggestions: 0,
    deletedSuggestions: 0,
    byType: {}
  };

  updates.forEach(({ suggestionType, newStatus, oldStatus }) => {
    // Initialize type counters if needed
    if (!counters.byType[suggestionType]) {
      counters.byType[suggestionType] = { accepted: 0, rejected: 0 };
    }

    // Increment new status
    if (newStatus === 'accepted') {
      counters.acceptedSuggestions++;
      counters.byType[suggestionType].accepted++;
    } else if (newStatus === 'rejected') {
      counters.rejectedSuggestions++;
      counters.byType[suggestionType].rejected++;
    } else if (newStatus === 'deleted') {
      counters.deletedSuggestions++;
    } else if (newStatus === 'skipped') {
      counters.skippedSuggestions++;
    }

    // Decrement old status if different
    if (oldStatus && oldStatus !== newStatus) {
      if (oldStatus === 'accepted') {
        counters.acceptedSuggestions--;
        counters.byType[suggestionType].accepted--;
      } else if (oldStatus === 'rejected') {
        counters.rejectedSuggestions--;
        counters.byType[suggestionType].rejected--;
      } else if (oldStatus === 'deleted') {
        counters.deletedSuggestions--;
      } else if (oldStatus === 'skipped') {
        counters.skippedSuggestions--;
      }
    }
  });

  // Build update expression
  const addExpressions = [];
  const setExpressions = ['updatedAt = :now'];
  const expressionAttributeNames = {};
  const expressionAttributeValues = { ':now': now };

  // Add main counters
  Object.entries(counters).forEach(([key, value]) => {
    if (key !== 'byType' && value !== 0) {
      const valueKey = `:${key}`;
      addExpressions.push(`${key} ${valueKey}`);
      expressionAttributeValues[valueKey] = value;
    }
  });

  // Add type-specific counters
  Object.entries(counters.byType).forEach(([type, typeCounters]) => {
    const typeAttr = `#type_${type}`;
    expressionAttributeNames[typeAttr] = type;

    Object.entries(typeCounters).forEach(([status, count]) => {
      if (count !== 0) {
        const valueKey = `:${type}_${status}`;
        addExpressions.push(`suggestionsByType.${typeAttr}.${status} ${valueKey}`);
        expressionAttributeValues[valueKey] = count;
      }
    });
  });

  if (addExpressions.length === 0) {
    // Only update timestamp
    await ddb.send(new UpdateItemCommand({
      TableName: TABLE_NAME,
      Key: marshall({
        pk: tenantId,
        sk: 'stats'
      }),
      UpdateExpression: 'SET updatedAt = :now',
      ExpressionAttributeValues: marshall({ ':now': now })
    }));
    return;
  }

  const updateExpression = `ADD ${addExpressions.join(', ')} SET ${setExpressions.join(', ')}`;

  try {
    await ddb.send(new UpdateItemCommand({
      TableName: TABLE_NAME,
      Key: marshall({
        pk: tenantId,
        sk: 'stats'
      }),
      UpdateExpression: updateExpression,
      ExpressionAttributeNames: Object.keys(expressionAttributeNames).length > 0 ? expressionAttributeNames : undefined,
      ExpressionAttributeValues: marshall(expressionAttributeValues)
    }));
  } catch (error) {
    if (error.name === 'ValidationException' && error.message.includes('does not exist')) {
      // Statistics record doesn't exist, create it first
      await createTenantStatistics(tenantId);
      // Retry the bulk update
      await bulkUpdateSuggestionStatuses(tenantId, updates);
    } else {
      console.error('Error bulk updating suggestion statuses:', error);
      throw error;
    }
  }
};
/**
 * Increment post count when creating posts
 * @param {string} tenantId - The tenant identifier
 * @returns {Promise<void>}
 */
export const incrementPostCount = async (tenantId) => {
  const now = new Date().toISOString();

  try {
    await ddb.send(new UpdateItemCommand({
      TableName: TABLE_NAME,
      Key: marshall({
        pk: tenantId,
        sk: 'stats'
      }),
      UpdateExpression: 'ADD totalPosts :one SET updatedAt = :now',
      ExpressionAttributeValues: marshall({
        ':one': 1,
        ':now': now
      })
    }));
  } catch (error) {
    if (error.name === 'ValidationException' && error.message.includes('does not exist')) {
      // Statistics record doesn't exist, create it first
      await createTenantStatistics(tenantId);
      // Retry the increment
      await incrementPostCount(tenantId);
    } else {
      console.error('Error incrementing post count:', error);
      // Don't throw error to avoid blocking post creation
    }
  }
};

/**
 * Decrement post count when deleting posts
 * @param {string} tenantId - The tenant identifier
 * @returns {Promise<void>}
 */
export const decrementPostCount = async (tenantId) => {
  const now = new Date().toISOString();

  try {
    // First check if the record exists and has a positive post count
    const stats = await getTenantStatistics(tenantId);
    if (!stats || (stats.totalPosts || 0) <= 0) {
      console.warn(`Cannot decrement post count for tenant ${tenantId}: count is already zero or record doesn't exist`);
      return;
    }

    await ddb.send(new UpdateItemCommand({
      TableName: TABLE_NAME,
      Key: marshall({
        pk: tenantId,
        sk: 'stats'
      }),
      UpdateExpression: 'ADD totalPosts :minusOne SET updatedAt = :now',
      ConditionExpression: 'totalPosts > :zero',
      ExpressionAttributeValues: marshall({
        ':minusOne': -1,
        ':zero': 0,
        ':now': now
      })
    }));
  } catch (error) {
    if (error.name === 'ConditionalCheckFailedException') {
      console.warn(`Cannot decrement post count for tenant ${tenantId}: count would go below zero`);
    } else if (error.name === 'ValidationException' && error.message.includes('does not exist')) {
      console.warn(`Cannot decrement post count for tenant ${tenantId}: statistics record doesn't exist`);
    } else {
      console.error('Error decrementing post count:', error);
      // Don't throw error to avoid blocking post deletion
    }
  }
};

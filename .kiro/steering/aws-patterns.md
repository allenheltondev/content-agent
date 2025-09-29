# AWS Integration Patterns

## DynamoDB Patterns

### Key Structure
Use composite keys for efficient querying:
```javascript
// Primary key pattern
pk: `${tenantId}#${contentId}`
sk: 'content' | `suggestion#${suggestionId}`

// GSI pattern for user queries
GSI1PK: `${tenantId}`
GSI1SK: `${entityType}#${timestamp}`
```

### Data Operations
```javascript
// Standard DynamoDB operations
import { DynamoDBClient, GetItemCommand, PutItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';

const ddb = new DynamoDBClient();

// Get item
const response = await ddb.send(new GetItemCommand({
  TableName: process.env.TABLE_NAME,
  Key: marshall({ pk, sk })
}));

// Put item with condition
await ddb.send(new PutItemCommand({
  TableName: process.env.TABLE_NAME,
  ConditionExpression: 'attribute_not_exists(pk) AND attribute_not_exists(sk)',
  Item: marshall(item)
}));
```

## Lambda Function Patterns

### Handler Structure
```javascript
export const handler = async (event) => {
  try {
    // Extract required parameters
    const { tenantId, sessionId, contentId } = event;

    // Validate inputs
    if (!tenantId || !contentId) {
      throw new Error('Missing required parameters');
    }

    // Business logic
    const result = await processRequest(tenantId, contentId);

    return {
      statusCode: 200,
      body: JSON.stringify(result)
    };
  } catch (err) {
    console.error('Handler error:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
};
```

### Environment Configuration
Always use environment variables for configuration:
```javascript
const TABLE_NAME = process.env.TABLE_NAME;
const MEMORY_PARAMETER = process.env.MEMORY_PARAMETER;
const BUCKET_NAME = process.env.BUCKET_NAME;
```

## Bedrock Agent Integration

### Tool Definition Pattern
```javascript
import { z } from 'zod';

export const toolName = {
  name: 'toolName',
  description: 'Clear description of tool functionality',
  schema: z.object({
    contentId: z.string().describe('Content identifier'),
    // Additional parameters with descriptions
  }),
  handler: async (tenantId, input) => {
    // Never trust tenantId from LLM input
    // Always validate and sanitize inputs
    const validatedInput = toolName.schema.parse(input);

    try {
      // Tool implementation
      return result;
    } catch (error) {
      console.error(`Tool ${toolName.name} error:`, error);
      return { error: error.message };
    }
  }
};
```

### Agent Conversation Pattern
```javascript
import { converse } from '../utils/agents.mjs';
import { convertToBedrockTools } from '../utils/tools.mjs';

const tools = convertToBedrockTools([tool1, tool2]);

const systemPrompt = `
Clear instructions for the AI agent including:
- Role and responsibilities
- Expected behavior
- Tool usage guidelines
- Output format requirements
`;

const response = await converse(
  'amazon.nova-pro-v1:0',
  systemPrompt,
  userPrompt,
  tools,
  { tenantId, sessionId, actorId }
);
```

## Security Best Practices

### Tenant Isolation
- Always validate tenant access
- Never trust tenant IDs from external input
- Use IAM policies for resource-level permissions
- Implement proper data segregation

### Input Validation
```javascript
// Use Zod for schema validation
const schema = z.object({
  contentId: z.string().min(1),
  title: z.string().max(200),
  body: z.string().max(50000)
});

const validatedData = schema.parse(input);
```

### Error Handling
- Log errors with context but don't expose sensitive data
- Return generic error messages to clients
- Use structured logging for debugging
- Implement proper monitoring and alerting

## Performance Optimization

### Connection Reuse
```javascript
// Reuse AWS service clients
const ddb = new DynamoDBClient();
const bedrock = new BedrockRuntimeClient();
```

### Efficient Queries
- Use appropriate DynamoDB query patterns
- Implement pagination for large result sets
- Use projection expressions to limit returned data
- Consider using GSIs for different access patterns

### Memory and Timeout Configuration
```yaml
# SAM template configuration
Globals:
  Function:
    Runtime: nodejs22.x
    Timeout: 25
    MemorySize: 1024
    Environment:
      Variables:
        AWS_NODEJS_CONNECTION_REUSE_ENABLED: 1
```

## Monitoring and Logging

### Structured Logging
```javascript
console.log('Operation completed', {
  operation: 'createSuggestion',
  contentId,
  tenantId,
  duration: Date.now() - startTime
});
```

### Error Tracking
- Use AWS X-Ray for distributed tracing
- Implement CloudWatch custom metrics
- Set up appropriate alarms and notifications
- Monitor Lambda cold starts and performance

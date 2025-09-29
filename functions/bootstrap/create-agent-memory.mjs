import { BedrockAgentCoreControlClient, CreateMemoryCommand, DeleteMemoryCommand } from '@aws-sdk/client-bedrock-agentcore-control';
import { SSMClient, GetParameterCommand, PutParameterCommand, DeleteParameterCommand } from '@aws-sdk/client-ssm';

const ssm = new SSMClient();
const agentCore = new BedrockAgentCoreControlClient();

export const handler = async (event, context) => {
  try {
    const param = await ssm.send(new GetParameterCommand({ Name: process.env.MEMORY_PARAMETER }));
    if (event.RequestType === 'Delete') {
      if (param.Parameter?.Value) {
        await agentCore.send(new DeleteMemoryCommand({ memoryId: param.Parameter.Value }));
        await ssm.send(new DeleteParameterCommand({ Name: process.env.MEMORY_PARAMETER }));

        await sendResponse(event, context, 'SUCCESS', {
          reason: 'Delete completed successfully',
          physicalResourceId: event.physicalResourceId
        });
      }
    } else {
      let memoryId;
      if (!param.Parameter?.Value || param.Parameter.Value == 'placeholder') {
        const memory = await agentCore.send(new CreateMemoryCommand({
          name: 'contentAgentMemory',
          eventExpiryDuration: 90,
          memoryStrategies: [
            {
              userPreferenceMemoryStrategy: {
                name: 'authorWritingToneAndStyle',
                description: 'Defines the usual tone and writing style the author portrays when writing content',
                namespaces: ['{actorId}-writing']
              }
            },
            {
              semanticMemoryStrategy: {
                name: 'authorWritingTopics',
                description: 'The topics and categories the author writes about',
                namespaces: ['{actorId}-writing-topics']
              },
            }
          ]
        }));

        memoryId = memory.memory.id;

        await ssm.send(new PutParameterCommand({
          Name: process.env.MEMORY_PARAMETER,
          Value: memoryId,
          Overwrite: true
        }));
      } else {
        memoryId = param.Parameter.Value;
      }

      await sendResponse(event, context, 'SUCCESS', {
        reason: 'AgentCore Memory bootstrap complete',
        physicalResourceId: memoryId,
        responseData: {
          MemoryId: memoryId,
          Action: param.Parameter.Value ? 'Skipped' : 'Created'
        }
      });
    }
  } catch (err) {
    console.error(JSON.stringify(err));
    await sendResponse(event, context, 'FAILED', {
      reason: `Failed to bootstrap AgentCore memory: ${err.message}`,
      physicalResourceId: event.PhysicalResourceId || context.logStreamName
    });
  }
};

const sendResponse = async (event, context, status, data = {}) => {
  const responseBody = JSON.stringify({
    Status: status,
    Reason: data.reason || `See CloudWatch Log Stream: ${context.logStreamName}`,
    PhysicalResourceId: data.physicalResourceId || context.logStreamName,
    StackId: event.StackId,
    RequestId: event.RequestId,
    LogicalResourceId: event.LogicalResourceId,
    Data: data.responseData || {}
  });

  console.log('Response body:', responseBody);

  try {
    const response = await fetch(event.ResponseURL, {
      method: 'PUT',
      headers: {
        'Content-Type': '',
        'Content-Length': responseBody.length
      },
      body: responseBody
    });
    console.log('Response sent successfully:', response.status);
  } catch (error) {
    console.error('Failed to send response:', error);
  }
};

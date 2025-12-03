const AWS = require('aws-sdk');
const dynamo = new AWS.DynamoDB.DocumentClient();
const { requireRole } = require('../utils/authMiddleware');

module.exports.handler = async (event) => {
  try {
    // 1. SEGURIDAD: Staff interno (Admin y Workers)
    requireRole(event, ['admin', 'worker']);

    // El tenantId viene del token del usuario logueado
    const tenantId = event.requestContext.authorizer.tenantId;

    // Usamos Query en vez de Scan porque buscamos solo las cocinas DE ESTE TENANT
    const result = await dynamo.query({
      TableName: process.env.KITCHEN_TABLE,
      KeyConditionExpression: "tenantId = :tid",
      ExpressionAttributeValues: {
        ":tid": tenantId
      }
    }).promise();

    return {
      statusCode: 200,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify(result.Items)
    };

  } catch (error) {
    const statusCode = error.message.includes('FORBIDDEN') ? 403 : 500;
    return { statusCode, body: JSON.stringify({ error: error.message }) };
  }
};

const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');
const dynamo = new AWS.DynamoDB.DocumentClient();
const { requireRole } = require('../utils/authMiddleware');

module.exports.handler = async (event) => {
  try {
    // 1. SEGURIDAD: Solo Admin configura infraestructura
    requireRole(event, ['admin']);

    const body = JSON.parse(event.body);
    const tenantId = event.requestContext.authorizer.tenantId;
    const now = new Date().toISOString();

    const kitchen = {
      tenantId: tenantId,
      kitchenId: `KITCHEN-${uuidv4()}`,
      name: body.name || "Nueva Cocina",
      active: true,
      currentCooking: 0,
      maxCooking: body.maxCooking || 5,
      createdAt: now,
      updatedAt: now
    };

    await dynamo.put({
      TableName: process.env.KITCHEN_TABLE,
      Item: kitchen
    }).promise();

    return {
      statusCode: 201,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify(kitchen)
    };

  } catch (error) {
    const statusCode = error.message.includes('FORBIDDEN') ? 403 : 500;
    return { statusCode, body: JSON.stringify({ error: error.message }) };
  }
};

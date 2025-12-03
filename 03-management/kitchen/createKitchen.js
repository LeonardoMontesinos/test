const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');
const dynamo = new AWS.DynamoDB.DocumentClient();

module.exports.handler = async (event) => {
  const body = JSON.parse(event.body);
  const tenantId = event.requestContext.authorizer.tenantId;
  const now = new Date().toISOString();

  const kitchen = {
    tenantId: tenantId,
    // ID tipo: KITCHEN-UUID
    kitchenId: `KITCHEN-${uuidv4()}`, 
    name: body.name || "Cocina Nueva",
    active: true,
    currentCooking: 0,
    maxCooking: body.maxCooking || 5, // Default 5
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
};

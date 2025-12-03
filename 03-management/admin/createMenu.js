const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');
const dynamo = new AWS.DynamoDB.DocumentClient();

module.exports.handler = async (event) => {
  const body = JSON.parse(event.body);
  const tenantId = event.requestContext.authorizer.tenantId;
  const now = new Date().toISOString();

  const newItem = {
    tenantId: tenantId,
    // ID tipo: DISH-UUID
    dishId: `DISH-${uuidv4()}`,
    name: body.name,
    description: body.description,
    price: body.price,
    available: true,
    createdAt: now,
    updatedAt: now
  };

  await dynamo.put({
    TableName: process.env.MENU_TABLE,
    Item: newItem
  }).promise();

  return {
    statusCode: 201,
    headers: { "Access-Control-Allow-Origin": "*" },
    body: JSON.stringify(newItem)
  };
};

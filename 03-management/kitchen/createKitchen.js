const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');
const dynamo = new AWS.DynamoDB.DocumentClient();

module.exports.handler = async (event) => {
  const body = JSON.parse(event.body);
  const tenantId = event.requestContext.authorizer.tenantId;

  const kitchen = {
    tenantId: tenantId,
    kitchenId: uuidv4(),
    name: body.name
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
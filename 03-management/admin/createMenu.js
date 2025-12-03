const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');
const dynamo = new AWS.DynamoDB.DocumentClient();

module.exports.handler = async (event) => {
  const body = JSON.parse(event.body);
  const tenantId = event.requestContext.authorizer.tenantId;

  const newItem = {
    tenantId: tenantId, // Partition Key
    dishId: uuidv4(),   // Sort Key
    name: body.name,
    price: body.price,
    description: body.description
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
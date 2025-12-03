const AWS = require('aws-sdk');
const dynamo = new AWS.DynamoDB.DocumentClient();

module.exports.handler = async (event) => {
  const body = JSON.parse(event.body);
  const tenantId = event.requestContext.authorizer.tenantId;
  const { dishId, price, name } = body;

  await dynamo.update({
    TableName: process.env.MENU_TABLE,
    Key: { tenantId, dishId },
    UpdateExpression: "set #p = :p, #n = :n",
    ExpressionAttributeNames: { "#p": "price", "#n": "name" },
    ExpressionAttributeValues: { ":p": price, ":n": name }
  }).promise();

  return {
    statusCode: 200,
    headers: { "Access-Control-Allow-Origin": "*" },
    body: JSON.stringify({ message: "Menu actualizado" })
  };
};
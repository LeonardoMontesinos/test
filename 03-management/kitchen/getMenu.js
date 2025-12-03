const AWS = require('aws-sdk');
const dynamo = new AWS.DynamoDB.DocumentClient();

module.exports.handler = async (event) => {
  // endpoint público: menu?tenantId=123
  const tenantId = event.queryStringParameters?.tenantId; 

  if (!tenantId) {
    return { statusCode: 400, body: JSON.stringify({ error: "Falta tenantId" }) };
  }

  const result = await dynamo.query({
    TableName: process.env.MENU_TABLE,
    KeyConditionExpression: "tenantId = :tid",
    ExpressionAttributeValues: { ":tid": tenantId }
  }).promise();

  return {
    statusCode: 200,
    headers: { "Access-Control-Allow-Origin": "*" },
    body: JSON.stringify(result.Items)
  };
};
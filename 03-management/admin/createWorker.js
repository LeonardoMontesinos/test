const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');
const dynamo = new AWS.DynamoDB.DocumentClient();

module.exports.handler = async (event) => {
  const body = JSON.parse(event.body);
  const tenantId = event.requestContext.authorizer.tenantId; // Viene del Authorizer

  const newWorker = {
    userId: uuidv4(),
    tenantId: tenantId,
    email: body.email,
    username: body.username,
    role: 'worker', // Forzamos el rol
    createdAt: new Date().toISOString()
    // Nota: En un caso real, aquí deberías hashear una password temporal
  };

  await dynamo.put({
    TableName: process.env.USER_TABLE,
    Item: newWorker
  }).promise();

  return {
    statusCode: 201,
    headers: { "Access-Control-Allow-Origin": "*" },
    body: JSON.stringify(newWorker)
  };
};
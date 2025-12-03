const AWS = require('aws-sdk');
const dynamo = new AWS.DynamoDB.DocumentClient();

module.exports.handler = async (event) => {
  // Obtenemos el ID único de la conexión que asigna AWS
  const connectionId = event.requestContext.connectionId;
  // El frontend debe enviar el tenantId como query param
  const tenantId = event.queryStringParameters?.tenantId;

  if (!tenantId) {
    return { statusCode: 400, body: "Falta tenantId" };
  }

  // Guardamos: "Este usuario del Tenant X tiene la conexión Y"
  await dynamo.put({
    TableName: process.env.CONNECTIONS_TABLE,
    Item: {
      tenantId: tenantId,
      connectionId: connectionId,
      createdAt: new Date().toISOString()
    }
  }).promise();

  return { statusCode: 200, body: "Connected" };
};

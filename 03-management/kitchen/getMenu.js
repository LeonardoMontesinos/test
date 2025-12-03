const AWS = require('aws-sdk');
const dynamo = new AWS.DynamoDB.DocumentClient();

module.exports.handler = async (event) => {
  try {
    // Al ser público, obtenemos el tenantId de los Query Parameters
    const tenantId = event.queryStringParameters ? event.queryStringParameters.tenantId : null;

    if (!tenantId) {
      return {
        statusCode: 400,
        headers: { "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ error: "Falta el parámetro 'tenantId' en la URL" })
      };
    }

    // Consultamos solo los platos de ese Tenant y que estén disponibles
    const result = await dynamo.query({
      TableName: process.env.MENU_TABLE,
      KeyConditionExpression: "tenantId = :tid",
      ExpressionAttributeValues: { ":tid": tenantId }
    }).promise();

    // Opcional: Filtrar en código solo los disponibles (available: true)
    const availableItems = result.Items.filter(item => item.available === true);

    return {
      statusCode: 200,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify(availableItems)
    };
  } catch (error) {
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};

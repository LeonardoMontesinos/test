const AWS = require('aws-sdk');
const dynamo = new AWS.DynamoDB.DocumentClient();

module.exports.handler = async (event) => {
  // Nota: Si el endpoint es público, tenantId debe venir por QueryParam.
  // Si está protegido, viene del authorizer. Asumo protegido o hardcodeado para test.
  // Para simplificar, listaremos todo (Scan) o filtrado si envían tenantId.
  
  const params = { TableName: process.env.KITCHEN_TABLE };
  
  const result = await dynamo.scan(params).promise();

  return {
    statusCode: 200,
    headers: { "Access-Control-Allow-Origin": "*" },
    body: JSON.stringify(result.Items)
  };
};
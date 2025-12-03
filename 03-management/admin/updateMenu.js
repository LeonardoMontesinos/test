const AWS = require('aws-sdk');
const dynamo = new AWS.DynamoDB.DocumentClient();
// Importamos el helper de seguridad
const { requireRole } = require('../utils/authMiddleware');

module.exports.handler = async (event) => {
  try {
    // 1. SEGURIDAD: Solo el Admin puede cambiar el menú
    requireRole(event, ['admin']);

    const body = JSON.parse(event.body);
    const tenantId = event.requestContext.authorizer.tenantId;
    const { dishId, price, name, description, available } = body;
    const now = new Date().toISOString();

    // Construimos la expresión de actualización dinámica
    // Esto permite actualizar solo el precio, o solo el nombre, etc.
    let updateExp = "set updatedAt = :u";
    let expAttrNames = {};
    let expAttrValues = { ":u": now };

    if (price !== undefined) {
      updateExp += ", #p = :p";
      expAttrNames["#p"] = "price";
      expAttrValues[":p"] = price;
    }
    if (name !== undefined) {
      updateExp += ", #n = :n";
      expAttrNames["#n"] = "name";
      expAttrValues[":n"] = name;
    }
    if (description !== undefined) {
      updateExp += ", #d = :d";
      expAttrNames["#d"] = "description";
      expAttrValues[":d"] = description;
    }
    if (available !== undefined) {
      updateExp += ", available = :a";
      expAttrValues[":a"] = available;
    }

    await dynamo.update({
      TableName: process.env.MENU_TABLE,
      Key: { tenantId, dishId },
      UpdateExpression: updateExp,
      ExpressionAttributeNames: Object.keys(expAttrNames).length ? expAttrNames : undefined,
      ExpressionAttributeValues: expAttrValues
    }).promise();

    return {
      statusCode: 200,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ message: "Item de menú actualizado" })
    };

  } catch (error) {
    const statusCode = error.message.includes('FORBIDDEN') ? 403 : 500;
    return { statusCode, body: JSON.stringify({ error: error.message }) };
  }
};const AWS = require('aws-sdk');
const dynamo = new AWS.DynamoDB.DocumentClient();
// Importamos el helper de seguridad
const { requireRole } = require('../utils/authMiddleware');

module.exports.handler = async (event) => {
  try {
    // 1. SEGURIDAD: Solo el Admin puede cambiar el menú
    requireRole(event, ['admin']);

    const body = JSON.parse(event.body);
    const tenantId = event.requestContext.authorizer.tenantId;
    const { dishId, price, name, description, available } = body;
    const now = new Date().toISOString();

    // Construimos la expresión de actualización dinámica
    // Esto permite actualizar solo el precio, o solo el nombre, etc.
    let updateExp = "set updatedAt = :u";
    let expAttrNames = {};
    let expAttrValues = { ":u": now };

    if (price !== undefined) {
      updateExp += ", #p = :p";
      expAttrNames["#p"] = "price";
      expAttrValues[":p"] = price;
    }
    if (name !== undefined) {
      updateExp += ", #n = :n";
      expAttrNames["#n"] = "name";
      expAttrValues[":n"] = name;
    }
    if (description !== undefined) {
      updateExp += ", #d = :d";
      expAttrNames["#d"] = "description";
      expAttrValues[":d"] = description;
    }
    if (available !== undefined) {
      updateExp += ", available = :a";
      expAttrValues[":a"] = available;
    }

    await dynamo.update({
      TableName: process.env.MENU_TABLE,
      Key: { tenantId, dishId },
      UpdateExpression: updateExp,
      ExpressionAttributeNames: Object.keys(expAttrNames).length ? expAttrNames : undefined,
      ExpressionAttributeValues: expAttrValues
    }).promise();

    return {
      statusCode: 200,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ message: "Item de menú actualizado" })
    };

  } catch (error) {
    const statusCode = error.message.includes('FORBIDDEN') ? 403 : 500;
    return { statusCode, body: JSON.stringify({ error: error.message }) };
  }
};

const AWS = require('aws-sdk');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const dynamo = new AWS.DynamoDB.DocumentClient();

// Importamos el helper
const { requireRole } = require('../utils/authMiddleware');

module.exports.handler = async (event) => {
  try {
    // 1. VALIDACIÓN DE SEGURIDAD (Solo Admin)
    requireRole(event, ['admin']);

    const body = JSON.parse(event.body);
    const tenantId = event.requestContext.authorizer.tenantId;

    // Generar ID USR-HEX
    const randomHex = crypto.randomBytes(8).toString('hex');
    const userId = `USR-${randomHex}`;

    // Contraseña temporal o default
    const tempPassword = body.password || "bembos123";
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    const newWorker = {
      userId: userId,
      tenantId: tenantId,
      email: body.email,
      username: body.username,
      password: hashedPassword,
      role: 'worker', // Forzamos rol worker
      createdAt: new Date().toISOString()
    };

    await dynamo.put({
      TableName: process.env.USER_TABLE,
      Item: newWorker
    }).promise();

    // No devolvemos la password en la respuesta
    delete newWorker.password;

    return {
      statusCode: 201,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify(newWorker)
    };
  } catch (error) {
    console.error(error);
    // Manejo de códigos de error
    const statusCode = error.message.includes('FORBIDDEN') ? 403 : 500;
    return { statusCode, body: JSON.stringify({ error: error.message }) };
  }
};

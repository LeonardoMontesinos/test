const AWS = require('aws-sdk');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const dynamo = new AWS.DynamoDB.DocumentClient();

module.exports.handler = async (event) => {
  try {
    const body = JSON.parse(event.body);
    const { email, password, username, tenantId } = body;

    if (!email || !password || !tenantId) {
      return { statusCode: 400, body: JSON.stringify({ message: "Faltan datos" }) };
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const userId = uuidv4();

    const newUser = {
      userId: userId,
      tenantId: tenantId, // Sort Key
      email: email,
      username: username || email.split('@')[0],
      password: hashedPassword,
      role: 'admin', // Por defecto admin al registrarse
      createdAt: new Date().toISOString()
    };

    await dynamo.put({
      TableName: process.env.USER_TABLE,
      Item: newUser
    }).promise();

    return {
      statusCode: 201,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ message: "Usuario registrado", userId })
    };
  } catch (error) {
    console.error(error);
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};
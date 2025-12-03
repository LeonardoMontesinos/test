const AWS = require('aws-sdk');
const bcrypt = require('bcryptjs');
const crypto = require('crypto'); // Nativo de Node.js
const dynamo = new AWS.DynamoDB.DocumentClient();

module.exports.handler = async (event) => {
  try {
    const body = JSON.parse(event.body);
    const { email, password, username, tenantId, role } = body;

    // Generar ID tipo: USR-5c4054878c207a30
    const randomHex = crypto.randomBytes(8).toString('hex');
    const userId = `USR-${randomHex}`;

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = {
      userId: userId,
      tenantId: tenantId, 
      email: email,
      username: username,
      password: hashedPassword, // Se guarda el hash, no el plano
      role: role || 'user'
    };

    await dynamo.put({
      TableName: process.env.USER_TABLE,
      Item: newUser
    }).promise();

    return {
      statusCode: 201,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify(newUser)
    };
  } catch (error) {
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};

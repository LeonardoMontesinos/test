const AWS = require('aws-sdk');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const dynamo = new AWS.DynamoDB.DocumentClient();

module.exports.handler = async (event) => {
  try {
    const body = JSON.parse(event.body);
    const { email, password, tenantId } = body;

    // Buscamos el usuario usando el índice secundario (EmailIndex)
    // porque la tabla principal usa userId como clave.
    const result = await dynamo.query({
      TableName: process.env.USER_TABLE,
      IndexName: 'EmailIndex',
      KeyConditionExpression: 'email = :email AND tenantId = :tenantId',
      ExpressionAttributeValues: {
        ':email': email,
        ':tenantId': tenantId
      }
    }).promise();

    const user = result.Items[0];

    if (!user || !await bcrypt.compare(password, user.password)) {
      return {
        statusCode: 401,
        headers: { "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ message: "Credenciales inválidas" })
      };
    }

    // Crear token JWT
    const token = jwt.sign({
      userId: user.userId,
      tenantId: user.tenantId,
      email: user.email,
      role: user.role
    }, process.env.JWT_SECRET, { expiresIn: '8h' });

    return {
      statusCode: 200,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ token })
    };
  } catch (error) {
    console.error(error);
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};
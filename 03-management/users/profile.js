const AWS = require('aws-sdk');
const bcrypt = require('bcryptjs');
const dynamo = new AWS.DynamoDB.DocumentClient();

module.exports.handler = async (event) => {
  const method = event.httpMethod;
  // Obtenemos datos del token (Authorizer)
  const { userId, tenantId } = event.requestContext.authorizer;
  
  const TABLE = process.env.USER_TABLE;

  try {
    // --- GET: Ver mi información ---
    if (method === 'GET') {
      const result = await dynamo.get({
        TableName: TABLE,
        Key: { userId: userId, tenantId: tenantId }
      }).promise();

      if (!result.Item) return { statusCode: 404, body: JSON.stringify({ error: "Usuario no encontrado" }) };
      
      // Seguridad: Eliminamos el password del objeto antes de enviarlo
      const { password, ...safeData } = result.Item;
      
      return {
        statusCode: 200,
        headers: { "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify(safeData)
      };
    }

    // --- PUT: Actualizar mi perfil ---
    if (method === 'PUT' || method === 'PATCH') {
      const body = JSON.parse(event.body);
      // Solo permitimos cambiar username y password
      const { username, newPassword } = body;
      
      let updateExp = "set updatedAt = :u";
      let expValues = { ":u": new Date().toISOString() };
      let expNames = {};

      if (username) {
        updateExp += ", username = :n";
        expValues[":n"] = username;
      }
      
      if (newPassword) {
        // Hasheamos la contraseña nueva
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        updateExp += ", password = :p";
        expValues[":p"] = hashedPassword;
      }

      await dynamo.update({
        TableName: TABLE,
        Key: { userId: userId, tenantId: tenantId },
        UpdateExpression: updateExp,
        ExpressionAttributeValues: expValues
      }).promise();

      return {
        statusCode: 200,
        headers: { "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ message: "Perfil actualizado correctamente" })
      };
    }

    // --- DELETE: Eliminar mi cuenta ---
    if (method === 'DELETE') {
        await dynamo.delete({
            TableName: TABLE,
            Key: { userId: userId, tenantId: tenantId }
        }).promise();
        
        return {
            statusCode: 200,
            headers: { "Access-Control-Allow-Origin": "*" },
            body: JSON.stringify({ message: "Cuenta eliminada exitosamente" })
        };
    }

    return { statusCode: 405, body: "Method Not Allowed" };

  } catch (error) {
    console.error(error);
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};

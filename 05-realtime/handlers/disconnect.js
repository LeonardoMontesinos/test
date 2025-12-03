const AWS = require('aws-sdk');
const dynamo = new AWS.DynamoDB.DocumentClient();

module.exports.handler = async (event) => {
  const connectionId = event.requestContext.connectionId;
  // Nota: Para borrar eficientemente, en producción se suele buscar primero el tenantId
  // o usar TTL. Por simplicidad académica, aquí asumimos un borrado lógico o cleanup job.
  // Pero para que funcione exacto: necesitamos saber el tenantId al desconectar.
  // AWS no lo persiste solo. 
  
  // Opción simple: No hacemos nada, y manejamos errores 410 (Gone) al intentar enviar mensajes.
  return { statusCode: 200, body: "Disconnected" };
};

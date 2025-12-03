const AWS = require('aws-sdk');
const dynamo = new AWS.DynamoDB.DocumentClient();

const TABLE = process.env.ORDERS_TABLE;

module.exports.handler = async (event) => {
  try {
    // 1. Datos del Usuario (Token)
    const { userId, tenantId, role } = event.requestContext.authorizer;
    // 2. Datos de la URL (ID de orden)
    // Nota: El ID en la URL viene como "ORD-xxxx", pero en la BD es SK="ORDER#ORD-xxxx"
    // Debemos manejar ambos casos o asumir que el front envía solo el UUID. 
    // Asumiremos que el front envía "ORD-1234..."
    const orderIdParam = event.pathParameters.id; 
    
    // Construimos las llaves exactas de DynamoDB
    const pk = `TENANT#${tenantId}`;
    const sk = `ORDER#${orderIdParam}`;

    // 3. Obtener la orden
    const result = await dynamo.get({
      TableName: TABLE,
      Key: { PK: pk, SK: sk }
    }).promise();

    if (!result.Item) {
      return { 
        statusCode: 404, 
        headers: { "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ error: "Orden no encontrada" }) 
      };
    }

    const order = result.Item;

    // 4. VALIDACIÓN DE PERMISOS
    // Si el rol es 'user', DEBE ser el creador de la orden
    if (role === 'user' && order.createdBy !== userId) {
      return { 
        statusCode: 403, 
        headers: { "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ error: "No tienes permiso para cancelar esta orden" }) 
      };
    }

    // 5. VALIDACIÓN DE ESTADO
    // Solo permitimos cancelar si está pendiente. Si ya está cocinando, no se puede.
    const cancelableStatuses = ['PENDING', 'CREATED', 'VALIDATED'];
    if (!cancelableStatuses.includes(order.status)) {
      return { 
        statusCode: 400, 
        headers: { "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ error: `No se puede cancelar la orden en estado: ${order.status}` }) 
      };
    }

    // 6. EJECUTAR CANCELACIÓN
    const now = new Date().toISOString();
    await dynamo.update({
      TableName: TABLE,
      Key: { PK: pk, SK: sk },
      UpdateExpression: "set #s = :s, updatedAt = :u",
      ExpressionAttributeNames: { "#s": "status" },
      ExpressionAttributeValues: { ":s": "CANCELLED", ":u": now }
    }).promise();

    return {
      statusCode: 200,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ 
        message: "Orden cancelada exitosamente", 
        orderId: order.orderId, 
        status: "CANCELLED" 
      })
    };

  } catch (error) {
    console.error(error);
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};

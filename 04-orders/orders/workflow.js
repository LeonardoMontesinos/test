const AWS = require('aws-sdk');
const dynamo = new AWS.DynamoDB.DocumentClient();

const TABLE = process.env.ORDERS_TABLE;
const CONNECTIONS_TABLE = process.env.CONNECTIONS_TABLE;

// Inicializamos el API Gateway Management (necesita la URL https)
const apigwManagementApi = new AWS.ApiGatewayManagementApi({
  apiVersion: '2018-11-29',
  endpoint: process.env.WEBSOCKET_ENDPOINT
});

// --- HELPER PARA NOTIFICAR WEBSOCKET ---
const notifyFrontend = async (tenantId, payload) => {
  try {
    // 1. Buscar todas las conexiones activas de este Tenant
    const connections = await dynamo.query({
      TableName: CONNECTIONS_TABLE,
      KeyConditionExpression: 'tenantId = :tid',
      ExpressionAttributeValues: { ':tid': tenantId }
    }).promise();

    // 2. Enviar mensaje a cada conexión
    const postCalls = connections.Items.map(async ({ connectionId }) => {
      try {
        await apigwManagementApi.postToConnection({
          ConnectionId: connectionId,
          Data: JSON.stringify(payload)
        }).promise();
      } catch (e) {
        if (e.statusCode === 410) {
          // Si da 410, el usuario cerró la ventana. Borramos la conexión.
          console.log(`Borrando conexión inactiva: ${connectionId}`);
          await dynamo.delete({
            TableName: CONNECTIONS_TABLE,
            Key: { tenantId, connectionId }
          }).promise();
        }
      }
    });

    await Promise.all(postCalls);
  } catch (e) {
    console.error("Error notificando sockets:", e);
  }
};

// --- FUNCIÓN ACTUALIZADA DE UPDATE STATUS ---
const updateStatus = async (tenantId, orderId, status) => {
  const now = new Date().toISOString();
  
  // 1. Actualizar DB
  await dynamo.update({
    TableName: TABLE,
    Key: { 
        PK: `TENANT#${tenantId}`, 
        SK: `ORDER#${orderId}`
    },
    UpdateExpression: "set #s = :s, updatedAt = :u",
    ExpressionAttributeNames: { "#s": "status" },
    ExpressionAttributeValues: { ":s": status, ":u": now }
  }).promise();

  // 2. NOTIFICAR EN TIEMPO REAL
  await notifyFrontend(tenantId, {
    type: 'ORDER_UPDATE',
    orderId: orderId,
    status: status,
    updatedAt: now
  });
};

// --- PASO 1: VALIDATE ---
module.exports.validate = async (event) => {
  // El 'event' es lo que llega del paso anterior o del inicio
  const { tenantId, orderId, items } = event;
  
  // Lógica de validación (ej: stock, pago)
  if (!items || items.length === 0) {
    throw new Error("No hay items en la orden"); // Esto mandará al flujo de Error
  }

  await updateStatus(tenantId, orderId, 'VALIDATED');
  
  // Retornamos los datos para el siguiente paso
  return event; 
};

// --- PASO 2: KITCHEN ---
module.exports.kitchen = async (event) => {
  const { tenantId, orderId } = event;
  await updateStatus(tenantId, orderId, 'COOKING');
  
  // Simular tiempo de cocina (en vida real esto no se hace con sleep, pero sirve para demo)
  await new Promise(r => setTimeout(r, 2000));
  
  return event;
};

// --- PASO 3: PACKAGING ---
module.exports.packaging = async (event) => {
  const { tenantId, orderId } = event;
  await updateStatus(tenantId, orderId, 'PACKAGING');
  return event;
};

// --- PASO 4: DELIVERY ---
module.exports.delivery = async (event) => {
  const { tenantId, orderId } = event;
  await updateStatus(tenantId, orderId, 'DELIVERING');
  
  // Aquí es donde el diagrama dice "Timeout". 
  // En un caso real, aquí usaríamos un 'Callback Pattern' esperando que el motorizado confirme.
  // Para este demo, asumimos que sale a ruta inmediatamente.
  return event;
};

// --- PASO 5: COMPLETE ---
module.exports.complete = async (event) => {
  const { tenantId, orderId } = event;
  await updateStatus(tenantId, orderId, 'COMPLETED');
  return { status: "Order Finished", orderId };
};

// --- ERROR HANDLER ---
module.exports.errorHandler = async (error) => {
  console.log("Ocurrió un error en el flujo:", error);
  // Aquí podrías poner el estado en 'FAILED' en DynamoDB
  return { status: "ERROR_HANDLED" };
};

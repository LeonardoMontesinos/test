const AWS = require('aws-sdk');
const dynamo = new AWS.DynamoDB.DocumentClient();

const TABLE = process.env.ORDERS_TABLE;

// Función auxiliar para actualizar DynamoDB
const updateStatus = async (tenantId, orderId, status) => {
  console.log(`Updating Order ${orderId} to ${status}`);
  await dynamo.update({
    TableName: TABLE,
    Key: { PK: tenantId, SK: orderId },
    UpdateExpression: "set #s = :s",
    ExpressionAttributeNames: { "#s": "status" },
    ExpressionAttributeValues: { ":s": status }
  }).promise();
  // Aquí es donde también enviarías el evento a EventBridge/SNS si quisieras
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
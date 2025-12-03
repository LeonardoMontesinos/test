const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');
const dynamo = new AWS.DynamoDB.DocumentClient();
const stepFunctions = new AWS.StepFunctions();

const TABLE = process.env.ORDERS_TABLE;
const STATE_MACHINE_ARN = process.env.STATE_MACHINE_ARN;

const response = (code, body) => ({
  statusCode: code,
  headers: { "Access-Control-Allow-Origin": "*" },
  body: JSON.stringify(body)
});

// 1. Crear Orden
module.exports.create = async (event) => {
  try {
    const body = JSON.parse(event.body);
    // Datos del usuario logueado (vienen del token)
    const { tenantId, userId } = event.requestContext.authorizer;
    
    // Generar ID de Orden: ORD-UUID
    const rawOrderId = `ORD-${uuidv4()}`;
    const now = new Date().toISOString();

    const newOrder = {
      // --- Claves DynamoDB (Single Table Design) ---
      PK: `TENANT#${tenantId}`,
      SK: `ORDER#${rawOrderId}`,
      
      // --- Campos de Datos ---
      tenantId: tenantId,
      orderId: rawOrderId,
      createdBy: userId, // Ej: USR-5c4054...
      
      // Items: Guardamos el array directo (Dynamo soporta List)
      // Si quieres guardarlo como STRING como en tu ejemplo: JSON.stringify(body.items)
      items: body.items, 
      
      total: body.total || 0,
      status: 'PENDING', // O "READY_PICKUP" segun tu flujo
      type: body.type || 'STORE',
      kitchenId: null, // Se asignará luego o viene en el body
      createdAt: now,
      updatedAt: now
    };

    // A. Guardar en DynamoDB
    await dynamo.put({ TableName: TABLE, Item: newOrder }).promise();

    // B. Iniciar Step Functions (Igual que antes, pero pasamos el ID correcto)
    if (STATE_MACHINE_ARN) {
        await stepFunctions.startExecution({
        stateMachineArn: STATE_MACHINE_ARN,
        name: `Exec-${rawOrderId}`,
        input: JSON.stringify({ tenantId, orderId: rawOrderId, items: body.items })
        }).promise();
    }

    return response(201, newOrder);

  } catch (e) {
    console.error(e);
    return response(500, { error: e.message });
  }
};

// 2. Obtener Orden (Ajustado para leer PK/SK correctos)
module.exports.get = async (event) => {
  try {
    const tenantId = event.requestContext.authorizer.tenantId;
    const orderId = event.pathParameters.id; // El cliente manda "ORD-xxx"

    const result = await dynamo.get({
      TableName: TABLE,
      Key: { 
        PK: `TENANT#${tenantId}`, 
        SK: `ORDER#${orderId}` 
      }
    }).promise();

    if (!result.Item) return response(404, { error: "Orden no encontrada" });
    return response(200, result.Item);
  } catch (e) {
    return response(500, { error: e.message });
  }
};

// 3. Obtener una Orden específica
module.exports.get = async (event) => {
  try {
    const tenantId = event.requestContext.authorizer.tenantId;
    const orderId = event.pathParameters.id;

    const result = await dynamo.get({
      TableName: TABLE,
      Key: { PK: tenantId, SK: orderId }
    }).promise();

    if (!result.Item) return response(404, { error: "Orden no encontrada" });
    return response(200, result.Item);
  } catch (e) {
    return response(500, { error: e.message });
  }
};

// 4. Actualizar Estado (Patch)
module.exports.updateStatus = async (event) => {
  try {
    const tenantId = event.requestContext.authorizer.tenantId;
    const orderId = event.pathParameters.id;
    const body = JSON.parse(event.body); // { "status": "COOKING" }

    await dynamo.update({
      TableName: TABLE,
      Key: { PK: tenantId, SK: orderId },
      UpdateExpression: "set #s = :s",
      ExpressionAttributeNames: { "#s": "status" },
      ExpressionAttributeValues: { ":s": body.status }
    }).promise();

    return response(200, { message: "Estado actualizado", status: body.status });
  } catch (e) {
    return response(500, { error: e.message });
  }
};

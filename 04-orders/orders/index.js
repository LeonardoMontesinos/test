const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');
const dynamo = new AWS.DynamoDB.DocumentClient();
const stepFunctions = new AWS.StepFunctions();

// Importamos el helper
const { requireRole } = require('../utils/authMiddleware');

const TABLE = process.env.ORDERS_TABLE;
const STATE_MACHINE_ARN = process.env.STATE_MACHINE_ARN;

const response = (code, body) => ({
  statusCode: code,
  headers: { "Access-Control-Allow-Origin": "*" },
  body: JSON.stringify(body)
});

// --- CREATE (Público para cualquier usuario logueado) ---
module.exports.create = async (event) => {
  // ... (El código de create que te di antes va aquí igual) ...
  // No requiere validación de rol especial, solo estar logueado.
  try {
    const body = JSON.parse(event.body);
    const { tenantId, userId } = event.requestContext.authorizer;
    
    const rawOrderId = `ORD-${uuidv4()}`;
    const now = new Date().toISOString();

    const newOrder = {
      PK: `TENANT#${tenantId}`,
      SK: `ORDER#${rawOrderId}`,
      tenantId: tenantId,
      orderId: rawOrderId,
      createdBy: userId,
      items: body.items, 
      total: body.total || 0,
      status: 'PENDING',
      type: body.type || 'STORE',
      kitchenId: null,
      createdAt: now,
      updatedAt: now
    };

    await dynamo.put({ TableName: TABLE, Item: newOrder }).promise();

    if (STATE_MACHINE_ARN) {
        await stepFunctions.startExecution({
          stateMachineArn: STATE_MACHINE_ARN,
          name: `Exec-${rawOrderId}`,
          input: JSON.stringify({ tenantId, orderId: rawOrderId, items: body.items })
        }).promise();
    }
    return response(201, newOrder);
  } catch (e) {
    return response(500, { error: e.message });
  }
};

// --- LIST (Lógica Condicional) ---
module.exports.list = async (event) => {
  try {
    const { tenantId, role, userId } = event.requestContext.authorizer;

    let params = {
      TableName: TABLE,
      KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
      ExpressionAttributeValues: {
        ":pk": `TENANT#${tenantId}`,
        ":sk": "ORDER#"
      }
    };

    // LÓGICA DE VISIBILIDAD
    if (role === 'admin' || role === 'worker') {
      // Caso 1: Staff ve TODO. No agregamos filtros extra.
      console.log(`Staff ${role} listando todas las órdenes`);
    } else {
      // Caso 2: Cliente solo ve SUS órdenes.
      // Agregamos un filtro en DynamoDB (Scan en los resultados de la Query)
      // Nota: Lo ideal es un GSI, pero FilterExpression funciona para este volumen.
      params.FilterExpression = "createdBy = :uid";
      params.ExpressionAttributeValues[":uid"] = userId;
    }

    const result = await dynamo.query(params).promise();
    return response(200, result.Items);

  } catch (e) {
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
    // 1. VALIDACIÓN: Solo Admin o Worker pueden mover el estado
    requireRole(event, ['admin', 'worker']);

    const tenantId = event.requestContext.authorizer.tenantId;
    const orderId = event.pathParameters.id;
    const body = JSON.parse(event.body); // { "status": "COOKING" }
    const now = new Date().toISOString();

    await dynamo.update({
      TableName: TABLE,
      Key: { PK: `TENANT#${tenantId}`, SK: `ORDER#${orderId}` },
      UpdateExpression: "set #s = :s, updatedAt = :u",
      ExpressionAttributeNames: { "#s": "status" },
      ExpressionAttributeValues: { ":s": body.status, ":u": now }
    }).promise();

    return response(200, { message: "Estado actualizado", status: body.status });

  } catch (e) {
    const statusCode = e.message.includes('FORBIDDEN') ? 403 : 500;
    return response(statusCode, { error: e.message });
  }
};

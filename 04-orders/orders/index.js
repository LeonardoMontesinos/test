const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');
const dynamo = new AWS.DynamoDB.DocumentClient();
const stepFunctions = new AWS.StepFunctions(); // Importar Step Functions

const TABLE = process.env.ORDERS_TABLE;
const STATE_MACHINE_ARN = process.env.STATE_MACHINE_ARN; // Viene del serverless.yml

const response = (code, body) => ({
  statusCode: code,
  headers: { "Access-Control-Allow-Origin": "*" },
  body: JSON.stringify(body)
});

// 1. Crear Orden E INICIAR FLUJO
module.exports.create = async (event) => {
  try {
    const body = JSON.parse(event.body);
    // El tenantId viene del token del usuario logueado
    const tenantId = event.requestContext.authorizer.tenantId; 
    const orderId = uuidv4();

    const newOrder = {
      PK: tenantId,
      SK: orderId,
      items: body.items,
      total: body.total,
      status: 'CREATED', // Estado inicial antes de que el Step Function lo tome
      createdAt: new Date().toISOString()
    };

    // A. Guardar en DynamoDB
    await dynamo.put({ TableName: TABLE, Item: newOrder }).promise();

    // B. Iniciar la Máquina de Estados (Step Function)
    await stepFunctions.startExecution({
      stateMachineArn: STATE_MACHINE_ARN,
      name: `Order-${orderId}`, // Nombre único para la ejecución
      input: JSON.stringify({   // Datos que pasaremos al "Paso 1: Validate"
        tenantId: tenantId,
        orderId: orderId,
        items: body.items
      })
    }).promise();

    return response(201, { 
      message: "Orden recibida y procesando", 
      orderId: orderId 
    });

  } catch (e) {
    console.error(e);
    return response(500, { error: e.message });
  }
};

// 2. Listar Órdenes (del Tenant)
module.exports.list = async (event) => {
  try {
    const tenantId = event.requestContext.authorizer.tenantId;

    const result = await dynamo.query({
      TableName: TABLE,
      KeyConditionExpression: "PK = :pk",
      ExpressionAttributeValues: { ":pk": tenantId }
    }).promise();

    return response(200, result.Items);
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
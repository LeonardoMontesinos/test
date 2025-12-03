const jwt = require('jsonwebtoken');

// Generador de políticas IAM
const generatePolicy = (principalId, effect, resource, context) => {
  const authResponse = { principalId };
  if (effect && resource) {
    authResponse.policyDocument = {
      Version: '2012-10-17',
      Statement: [{
        Action: 'execute-api:Invoke',
        Effect: effect,
        Resource: resource // O '*' para evitar problemas de caché en desarrollo
      }]
    };
  }
  if (context) authResponse.context = context;
  return authResponse;
};

module.exports.handler = async (event) => {
  try {
    // Soportar mayúsculas o minúsculas en el header
    const token = event.headers.Authorization || event.headers.authorization;

    if (!token) throw new Error('No token provided');

    const tokenValue = token.replace('Bearer ', '');
    const decoded = jwt.verify(tokenValue, process.env.JWT_SECRET);

    // Permitir acceso y pasar datos del usuario al contexto
    return generatePolicy(decoded.userId, 'Allow', event.methodArn, {
      tenantId: decoded.tenantId,
      role: decoded.role
    });

  } catch (error) {
    console.log('Auth Error:', error.message);
    return generatePolicy('user', 'Deny', event.methodArn);
  }
};
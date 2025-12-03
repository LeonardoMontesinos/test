const requireRole = (event, allowedRoles) => {
  // El Authorizer nos pasa el rol en el requestContext
  // Si no hay authorizer (pruebas locales mal configuradas), fallará seguro.
  const userRole = event.requestContext.authorizer ? event.requestContext.authorizer.role : null;

  if (!userRole) {
    throw new Error('UNAUTHORIZED: No se encontró información de rol.');
  }

  // allowedRoles debe ser un array, ej: ['admin', 'worker']
  if (!allowedRoles.includes(userRole)) {
    throw new Error(`FORBIDDEN: El rol '${userRole}' no tiene permiso para realizar esta acción.`);
  }

  // Retornamos el rol por si la función lo necesita
  return userRole;
};

module.exports = { requireRole };

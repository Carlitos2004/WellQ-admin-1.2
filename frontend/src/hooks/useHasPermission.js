import { getStoredUser } from '../services/auth';

/**
 * Verifica si el usuario autenticado posee un permiso específico.
 *
 * Reglas de evaluación (en orden):
 *   1. Si no hay usuario en localStorage → false.
 *   2. Si el usuario tiene `role === 'super_admin'` → true siempre
 *      (backward compatibility: el super_admin nunca es bloqueado).
 *   3. Si `user.permissions` no es un array → false (payload malformado).
 *   4. Retorna true si el string `permission` existe en `user.permissions[]`.
 *
 * Uso:
 *   const canViewClinics = useHasPermission('clinics.view');
 *   const canManageRoles = useHasPermission('roles.manage');
 *
 * @param   {string}  permission  Identificador del permiso (ej: 'clinics.view').
 * @returns {boolean}
 */
const useHasPermission = (permission) => {
  const user = getStoredUser();

  if (!user) return false;
  if (user.role === 'super_admin') return true;
  if (!Array.isArray(user.permissions)) return false;

  return user.permissions.includes(permission);
};

export default useHasPermission;

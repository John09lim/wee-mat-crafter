export type ProtectedRole = "principal" | "supervisor";

export const rolePinStorageKey = (role: ProtectedRole) => `weelmat_${role}_pin_verified`;

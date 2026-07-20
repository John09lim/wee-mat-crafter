import { supabase } from "@/integrations/supabase/client";

const PRINCIPAL_REPAIR_FUNCTION = "repair_current_principal_account";

export async function repairCurrentPrincipalAccount() {
  const { error } = await supabase.rpc(PRINCIPAL_REPAIR_FUNCTION as never);

  if (error) {
    throw new Error(
      error.message.includes("not registered as a school head")
        ? "This account is not registered as a school head. Ask the supervisor to link your official school-head email."
        : error.message,
    );
  }
}

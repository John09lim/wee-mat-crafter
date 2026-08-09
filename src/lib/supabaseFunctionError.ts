/**
 * Extract a human-readable error message from a Supabase Edge Function
 * invocation error. Edge function errors may arrive as FunctionsHttpError,
 * FunctionsRelayError, or FunctionsFetchError, each wrapping the response
 * differently. This helper normalizes them into a single string.
 */
export const getSupabaseFunctionErrorMessage = async (
  error: unknown,
): Promise<string> => {
  const fallback = "Something went wrong. Please try again.";

  if (error instanceof Error) {
    // FunctionsHttpError stores the raw Response on .context
    const context = (error as { context?: Response }).context;
    if (context) {
      try {
        const body = await context.json();
        if (body?.error && typeof body.error === "string") return body.error;
        if (body?.message && typeof body.message === "string") return body.message;
      } catch {
        // Response body wasn't JSON — fall through
      }
    }
    return error.message || fallback;
  }

  if (typeof error === "string") return error;
  return fallback;
};

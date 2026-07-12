import { useState, type FormEvent } from "react";
import { KeyRound, Loader2, Lock, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { AuthField } from "@/components/auth/AuthPortal";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";

const getErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error && error.message ? error.message : fallback;

interface PasswordResetDialogProps {
  open: boolean;
  onClose: () => void;
}

const PasswordResetDialog = ({ open, onClose }: PasswordResetDialogProps) => {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const handlePasswordChange = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);

    if (!newPassword || !confirmPassword) {
      const message = "Please fill in both password fields.";
      setFormError(message);
      toast.error(message);
      return;
    }

    if (newPassword.length < 6) {
      const message = "Password must be at least 6 characters.";
      setFormError(message);
      toast.error(message);
      return;
    }

    if (newPassword !== confirmPassword) {
      const message = "Passwords do not match.";
      setFormError(message);
      toast.error(message);
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      toast.success("Password updated successfully!");
      setNewPassword("");
      setConfirmPassword("");
      setFormError(null);
      onClose();
    } catch (error: unknown) {
      const message = getErrorMessage(error, "Failed to update password");
      console.error("Password update error:", error);
      setFormError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const mismatchError = formError === "Passwords do not match." ? formError : null;
  const lengthError = formError === "Password must be at least 6 characters." ? formError : null;

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen && !loading) {
          setFormError(null);
          onClose();
        }
      }}
    >
      <DialogContent className="w-[calc(100%-2rem)] rounded-2xl border-[#D8D0C4] bg-[#FFFCF7] p-6 text-[#142019] shadow-[0_24px_70px_-35px_rgba(23,63,42,0.55)] sm:max-w-md sm:p-8">
        <DialogHeader className="text-left">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-[#173F2A] text-white shadow-sm">
            <ShieldCheck className="h-6 w-6" aria-hidden="true" />
          </div>
          <DialogTitle className="font-display text-2xl font-semibold leading-tight text-[#173F2A]">
            Change your password
          </DialogTitle>
          <DialogDescription className="text-sm leading-6 text-[#5D675F]">
            Choose a secure password with at least six characters, then confirm it below.
          </DialogDescription>
        </DialogHeader>

        <form className="mt-2 space-y-5" onSubmit={handlePasswordChange} aria-busy={loading}>
          <AuthField
            id="new-password"
            name="new-password"
            label="New password"
            icon={Lock}
            type="password"
            value={newPassword}
            onChange={(event) => {
              setNewPassword(event.target.value);
              if (lengthError) setFormError(null);
            }}
            placeholder="Enter a new password"
            autoComplete="new-password"
            helper={lengthError ? undefined : "Use at least 6 characters."}
            error={lengthError}
            minLength={6}
            required
            autoFocus
          />

          <AuthField
            id="confirm-password"
            name="confirm-password"
            label="Confirm new password"
            icon={KeyRound}
            type="password"
            value={confirmPassword}
            onChange={(event) => {
              setConfirmPassword(event.target.value);
              if (mismatchError) setFormError(null);
            }}
            placeholder="Enter the new password again"
            autoComplete="new-password"
            error={mismatchError}
            minLength={6}
            required
          />

          {formError && !mismatchError && !lengthError ? (
            <p
              role="alert"
              className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold leading-6 text-red-800"
            >
              {formError}
            </p>
          ) : null}

          <Button
            type="submit"
            disabled={loading}
            className="h-[3.25rem] w-full rounded-lg bg-[#236130] text-base font-bold text-white hover:bg-[#173F2A] focus-visible:ring-[#D6A73D]"
          >
            {loading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
                Updating…
              </>
            ) : (
              <>
                <ShieldCheck className="h-5 w-5" aria-hidden="true" />
                Update password
              </>
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default PasswordResetDialog;

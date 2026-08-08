import { useState } from "react";
import { AlertTriangle, Loader2, MapPin, School } from "lucide-react";
import { toast } from "sonner";

import SchoolDistrictPicker from "@/components/SchoolDistrictPicker";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { hasCompleteSchoolIdentity } from "@/lib/schoolIdentity";

interface CompleteSchoolProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called after a successful save with the new school/district values. */
  onSaved?: (school: string, district: string) => void;
  /** Pre-fill with existing values (placeholders will be empty strings). */
  initialSchool?: string;
  initialDistrict?: string;
}

const CompleteSchoolProfileDialog = ({
  open,
  onOpenChange,
  onSaved,
  initialSchool = "",
  initialDistrict = "",
}: CompleteSchoolProfileDialogProps) => {
  const [school, setSchool] = useState(initialSchool);
  const [district, setDistrict] = useState(initialDistrict);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    setError(null);

    if (!school.trim() || !district.trim()) {
      const message = "Please select both your school and district.";
      setError(message);
      toast.error(message);
      return;
    }

    if (!hasCompleteSchoolIdentity(school, district)) {
      const message = "Please choose a real school and district name.";
      setError(message);
      toast.error(message);
      return;
    }

    setSaving(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Your session has expired. Please sign in again.");
        return;
      }

      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          school: school.trim(),
          district_name: district.trim(),
        })
        .eq("user_id", user.id);

      if (updateError) throw updateError;

      toast.success("School information updated successfully!");
      onSaved?.(school.trim(), district.trim());
      onOpenChange(false);
    } catch (err: unknown) {
      const message =
        err instanceof Error && err.message
          ? err.message
          : "Could not update your school information. Please try again.";
      console.error("Complete school profile error:", err);
      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen && !saving) {
      setError(null);
    }
    onOpenChange(isOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="w-[calc(100%-2rem)] rounded-2xl border-[#D8D0C4] bg-[#FFFCF7] p-6 text-[#142019] shadow-[0_24px_70px_-35px_rgba(23,63,42,0.55)] sm:max-w-md sm:p-8">
        <DialogHeader className="text-left">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-[#FFF7DF] text-[#9A6A00] shadow-sm ring-1 ring-[#D6A73D]/40">
            <AlertTriangle className="h-6 w-6" aria-hidden="true" />
          </div>
          <DialogTitle className="font-display text-2xl font-semibold leading-tight text-[#173F2A]">
            Complete your school information
          </DialogTitle>
          <DialogDescription className="text-sm leading-6 text-[#5D675F]">
            Your account is missing a school or district. Select your school from the
            list below so your submissions are tracked correctly. You can also type
            it manually if it isn't listed.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-2 space-y-4">
          <SchoolDistrictPicker
            school={school}
            district={district}
            onSchoolChange={setSchool}
            onDistrictChange={setDistrict}
            required
          />

          {error && (
            <p
              role="alert"
              className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold leading-6 text-red-800"
            >
              {error}
            </p>
          )}

          <Button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="h-[3.25rem] w-full rounded-lg bg-[#236130] text-base font-bold text-white hover:bg-[#173F2A] focus-visible:ring-[#D6A73D]"
          >
            {saving ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
                Saving…
              </>
            ) : (
              <>
                <MapPin className="h-5 w-5" aria-hidden="true" />
                Save school information
              </>
            )}
          </Button>

          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="w-full text-center text-sm text-muted-foreground underline-offset-4 hover:underline"
          >
            I'll do this later
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CompleteSchoolProfileDialog;

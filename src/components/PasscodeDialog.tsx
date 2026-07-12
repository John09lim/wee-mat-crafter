import { type FormEvent, useState } from "react";
import {
  BarChart3,
  BookOpen,
  FileText,
  Info,
  LoaderCircle,
  LockKeyhole,
  ScanLine,
  School,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface PasscodeDialogProps {
  open: boolean;
  onPasscodeVerified: () => void;
}

const upcomingFeatures = [
  {
    icon: BookOpen,
    name: "Lesson plan generator",
    description: "Build a structured lesson plan from your weekly matrix.",
  },
  {
    icon: FileText,
    name: "Periodical test and TOS",
    description: "Prepare aligned assessments and tables of specifications.",
  },
  {
    icon: ScanLine,
    name: "Grade scanner",
    description: "Digitize class records with a faster review step.",
  },
  {
    icon: BarChart3,
    name: "Learning analytics",
    description: "Follow completion and performance patterns over time.",
  },
] as const;

export const PasscodeDialog = ({ open, onPasscodeVerified }: PasscodeDialogProps) => {
  const [passcode, setPasscode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError("");

    await new Promise<void>((resolve) => window.setTimeout(resolve, 500));

    const correctPasscode = import.meta.env.VITE_DASHBOARD_PASSCODE;

    if (passcode === correctPasscode) {
      localStorage.setItem("dashboard_passcode_verified", "true");
      onPasscodeVerified();
    } else {
      setError("Invalid passcode. Please contact your administrator.");
    }

    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={() => undefined}>
      <DialogContent className="max-h-[calc(100dvh-1.5rem)] overflow-y-auto border-warm-border bg-paper [&>button]:hidden sm:max-w-lg">
        <DialogHeader className="space-y-3 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-forest text-paper shadow-sm">
            <School aria-hidden="true" className="h-7 w-7" />
          </div>
          <DialogTitle>Educator workspace access</DialogTitle>
          <DialogDescription>
            <span className="font-semibold text-forest">Bacong District, Negros Oriental</span>
            <br />
            Enter the school-issued passcode to continue to the WeeLMat dashboard.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <Alert className="border-info/20 bg-info/5 text-ink">
            <Info aria-hidden="true" className="h-4 w-4 text-info" />
            <AlertDescription className="text-sm leading-6">
              WeeLMat is being improved in phases. The generator remains available while new
              planning and reporting tools are prepared.
            </AlertDescription>
          </Alert>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-ink" htmlFor="passcode">
                <LockKeyhole aria-hidden="true" className="h-4 w-4 text-primary" />
                Access passcode
              </Label>
              <Input
                aria-describedby={error ? "passcode-error" : "passcode-help"}
                aria-invalid={Boolean(error)}
                autoComplete="off"
                autoFocus
                className="text-center font-mono tracking-[0.3em]"
                disabled={loading}
                id="passcode"
                inputMode="numeric"
                onChange={(event) => setPasscode(event.target.value)}
                placeholder="Enter passcode"
                type="password"
                value={passcode}
              />
              <p className="text-xs text-muted-foreground" id="passcode-help">
                Use the passcode provided by your school administrator.
              </p>
              {error && (
                <p className="text-sm font-medium text-destructive" id="passcode-error" role="alert">
                  {error}
                </p>
              )}
            </div>

            <Button
              className="w-full gap-2 bg-forest text-paper hover:bg-primary"
              disabled={loading || !passcode.trim()}
              type="submit"
            >
              {loading ? (
                <>
                  <LoaderCircle
                    aria-hidden="true"
                    className="h-4 w-4 animate-spin motion-reduce:animate-none"
                  />
                  Verifying passcode
                </>
              ) : (
                <>
                  <LockKeyhole aria-hidden="true" className="h-4 w-4" />
                  Access dashboard
                </>
              )}
            </Button>
          </form>

          <section aria-labelledby="upcoming-tools-title" className="border-t border-warm-border pt-4">
            <h3 className="text-sm font-semibold text-forest" id="upcoming-tools-title">
              Tools in development
            </h3>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {upcomingFeatures.map((feature) => (
                <div
                  className="flex items-start gap-3 rounded-xl border border-warm-border bg-cream/45 p-3"
                  key={feature.name}
                >
                  <feature.icon
                    aria-hidden="true"
                    className="mt-0.5 h-4 w-4 shrink-0 text-primary"
                  />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-forest">{feature.name}</p>
                    <p className="mt-0.5 text-xs leading-5 text-muted-foreground">
                      {feature.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <p className="text-center text-xs text-muted-foreground">
            Need access support? Contact your school administrator.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

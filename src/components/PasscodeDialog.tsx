import { useState } from "react";
import { Lock, School, BookOpen, FileText, ScanLine, BarChart3 } from "lucide-react";
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

export const PasscodeDialog: React.FC<PasscodeDialogProps> = ({ open, onPasscodeVerified }) => {
  const [passcode, setPasscode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    // Simulate validation delay for better UX
    await new Promise(resolve => setTimeout(resolve, 500));

    const correctPasscode = import.meta.env.VITE_DASHBOARD_PASSCODE;
    
    if (passcode === correctPasscode) {
      localStorage.setItem("dashboard_passcode_verified", "true");
      onPasscodeVerified();
    } else {
      setError("Invalid passcode. Please contact your administrator.");
    }
    
    setLoading(false);
  };

  const upcomingFeatures = [
    { icon: BookOpen, name: "Lesson Plan Generator", description: "Create comprehensive lesson plans automatically" },
    { icon: FileText, name: "Periodical Test & TOS Generator", description: "Generate assessments and table of specifications" },
    { icon: ScanLine, name: "Grade Scanner", description: "Scan and digitize student grades efficiently" },
    { icon: BarChart3, name: "Analytics Dashboard", description: "Track learning progress and performance" },
  ];

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center space-y-3">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
            <School className="w-8 h-8 text-primary" />
          </div>
          <DialogTitle className="text-xl font-semibold">WeeLMat Generator Access</DialogTitle>
          <DialogDescription className="text-base">
            <span className="font-medium text-primary">Bacong District, Negros Oriental</span>
            <br />
            School Initiative Platform
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <Alert className="border-accent/20 bg-accent/5">
            <AlertDescription className="text-sm text-center">
              <strong>Platform Status:</strong> Currently upgrading and improving features.
              <br />
              New educational tools will be available soon!
            </AlertDescription>
          </Alert>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="passcode" className="flex items-center gap-2">
                <Lock className="w-4 h-4" />
                Enter Access Passcode
              </Label>
              <Input
                id="passcode"
                type="password"
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                placeholder="Enter passcode to continue"
                disabled={loading}
                className="text-center"
                autoFocus
              />
              {error && (
                <p className="text-destructive text-sm text-center">{error}</p>
              )}
            </div>

            <Button type="submit" disabled={loading || !passcode.trim()} className="w-full">
              {loading ? "Verifying..." : "Access Dashboard"}
            </Button>
          </form>

          <div className="space-y-3">
            <h4 className="text-sm font-medium text-center text-muted-foreground">
              Upcoming Features
            </h4>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {upcomingFeatures.map((feature, index) => (
                <div key={index} className="flex items-start gap-2 p-2 rounded-lg bg-muted/30">
                  <feature.icon className="w-3 h-3 text-primary mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-primary">{feature.name}</p>
                    <p className="text-muted-foreground leading-tight">{feature.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="text-center">
            <p className="text-xs text-muted-foreground">
              For access support, contact your school administrator
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
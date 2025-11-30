import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, School } from "lucide-react";

interface School {
  id: string;
  school_name: string;
  address: string | null;
  district_name: string;
  principal_name: string | null;
  principal_email: string | null;
}

interface SchoolManagementProps {
  districtName: string;
  supervisorId: string;
  schools: School[];
  onRefresh: () => void;
}

export function SchoolManagement({ 
  districtName, 
  supervisorId,
  schools,
  onRefresh 
}: SchoolManagementProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [schoolName, setSchoolName] = useState("");
  const [address, setAddress] = useState("");
  const [principalName, setPrincipalName] = useState("");
  const [principalEmail, setPrincipalEmail] = useState("");

  const handleAddSchool = async () => {
    if (!schoolName || !principalName || !principalEmail) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Check if principal already exists in the system
      const { data: existingPrincipal } = await supabase
        .from("profiles")
        .select("user_id")
        .eq("email", principalEmail.toLowerCase())
        .maybeSingle();

      // Insert school with principal_id if exists
      const { error: insertError } = await supabase
        .from("schools")
        .insert({
          school_name: schoolName,
          address: address || null,
          district_name: districtName,
          principal_name: principalName,
          principal_email: principalEmail.toLowerCase(),
          principal_id: existingPrincipal?.user_id || null,
          supervisor_id: supervisorId,
        });

      if (insertError) throw insertError;

      toast({
        title: "School Added",
        description: existingPrincipal
          ? `${schoolName} has been added and linked to existing principal ${principalName}.`
          : `${schoolName} has been added. Principal will be linked when they sign up.`,
      });

      // Reset form
      setSchoolName("");
      setAddress("");
      setPrincipalName("");
      setPrincipalEmail("");
      setIsAdding(false);
      onRefresh();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Manage Schools</CardTitle>
          <Button onClick={() => setIsAdding(!isAdding)} size="sm">
            <Plus className="w-4 h-4 mr-2" />
            Add School
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {isAdding && (
          <div className="p-4 border rounded-lg space-y-4 bg-muted/50">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="schoolName">School Name *</Label>
                <Input
                  id="schoolName"
                  value={schoolName}
                  onChange={(e) => setSchoolName(e.target.value)}
                  placeholder="e.g., Central High School"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="e.g., 123 Main Street"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="principalName">Principal Name *</Label>
                <Input
                  id="principalName"
                  value={principalName}
                  onChange={(e) => setPrincipalName(e.target.value)}
                  placeholder="e.g., Dr. Juan Dela Cruz"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="principalEmail">Principal Email *</Label>
                <Input
                  id="principalEmail"
                  type="email"
                  value={principalEmail}
                  onChange={(e) => setPrincipalEmail(e.target.value)}
                  placeholder="e.g., principal@school.edu"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleAddSchool}>
                Save School
              </Button>
              <Button variant="outline" onClick={() => setIsAdding(false)}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        <div className="grid gap-4">
          {schools.map((school) => (
            <div key={school.id} className="flex items-center gap-4 p-4 border rounded-lg">
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                <School className="w-6 h-6 text-muted-foreground" />
              </div>
              <div className="flex-1">
                <p className="font-medium">{school.school_name}</p>
                {school.address && (
                  <p className="text-sm text-muted-foreground">{school.address}</p>
                )}
                <p className="text-sm text-muted-foreground">
                  Principal: {school.principal_name}
                </p>
                <p className="text-sm text-muted-foreground">
                  {school.principal_email}
                </p>
              </div>
            </div>
          ))}
          {schools.length === 0 && !isAdding && (
            <p className="text-center text-muted-foreground py-8">
              No schools added yet. Click "Add School" to get started.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
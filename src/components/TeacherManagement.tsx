import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Upload, User } from "lucide-react";

interface Teacher {
  id: string;
  teacher_name: string | null;
  teacher_email: string | null;
  grade_level: string | null;
  section: string | null;
  profile_image_url: string | null;
}

interface TeacherManagementProps {
  schoolName: string;
  districtName: string;
  principalId: string;
  teachers: Teacher[];
  onRefresh: () => void;
}

export function TeacherManagement({ 
  schoolName, 
  districtName, 
  principalId,
  teachers,
  onRefresh 
}: TeacherManagementProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [teacherName, setTeacherName] = useState("");
  const [teacherEmail, setTeacherEmail] = useState("");
  const [gradeLevel, setGradeLevel] = useState("");
  const [section, setSection] = useState("");
  const [uploading, setUploading] = useState(false);
  const [profileImage, setProfileImage] = useState<File | null>(null);

  const handleAddTeacher = async () => {
    if (!teacherName || !teacherEmail || !gradeLevel || !section) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    try {
      let profileImageUrl = null;

      // Upload profile image if provided
      if (profileImage) {
        setUploading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Not authenticated");

        const fileExt = profileImage.name.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `${user.id}/teacher-profiles/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('weelmat')
          .upload(filePath, profileImage);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('weelmat')
          .getPublicUrl(filePath);

        profileImageUrl = publicUrl;
      }

      // Insert teacher into school_assignments
      const { error } = await supabase
        .from("school_assignments")
        .insert({
          user_id: null as any, // Will be linked when teacher signs up
          school_name: schoolName,
          district_name: districtName,
          principal_id: principalId,
          teacher_name: teacherName,
          teacher_email: teacherEmail.toLowerCase(),
          grade_level: gradeLevel,
          section: section,
          profile_image_url: profileImageUrl,
        });

      if (error) throw error;

      toast({
        title: "Teacher Added",
        description: `${teacherName} has been added to your school.`,
      });

      // Reset form
      setTeacherName("");
      setTeacherEmail("");
      setGradeLevel("");
      setSection("");
      setProfileImage(null);
      setIsAdding(false);
      onRefresh();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Manage Teachers</CardTitle>
          <Button onClick={() => setIsAdding(!isAdding)} size="sm">
            <Plus className="w-4 h-4 mr-2" />
            Add Teacher
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {isAdding && (
          <div className="p-4 border rounded-lg space-y-4 bg-muted/50">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="teacherName">Teacher Name *</Label>
                <Input
                  id="teacherName"
                  value={teacherName}
                  onChange={(e) => setTeacherName(e.target.value)}
                  placeholder="e.g., Maria Santos"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="teacherEmail">Email *</Label>
                <Input
                  id="teacherEmail"
                  type="email"
                  value={teacherEmail}
                  onChange={(e) => setTeacherEmail(e.target.value)}
                  placeholder="e.g., maria@school.edu"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="gradeLevel">Grade Level *</Label>
                <Input
                  id="gradeLevel"
                  value={gradeLevel}
                  onChange={(e) => setGradeLevel(e.target.value)}
                  placeholder="e.g., Grade 7"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="section">Section *</Label>
                <Input
                  id="section"
                  value={section}
                  onChange={(e) => setSection(e.target.value)}
                  placeholder="e.g., A"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="profileImage">Profile Image (Optional)</Label>
              <label htmlFor="profileImage" className="cursor-pointer">
                <div className="flex items-center gap-3 p-4 border-2 border-dashed rounded-lg hover:border-[#236130] transition-colors">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: "#236130" }}>
                    <Upload className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium" style={{ color: "#236130" }}>
                      {profileImage ? profileImage.name : "Upload Teacher Photo"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Click to choose an image file
                    </p>
                  </div>
                </div>
              </label>
              <Input
                id="profileImage"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => setProfileImage(e.target.files?.[0] || null)}
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleAddTeacher} disabled={uploading}>
                {uploading ? "Uploading..." : "Save Teacher"}
              </Button>
              <Button variant="outline" onClick={() => setIsAdding(false)}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        <div className="grid gap-4">
          {teachers.map((teacher) => (
            <div key={teacher.id} className="flex items-start gap-4 p-4 border rounded-lg hover:shadow-md transition-shadow bg-card">
              <div className="w-20 h-24 rounded-lg bg-muted flex items-center justify-center overflow-hidden flex-shrink-0 border-2 border-border">
                {teacher.profile_image_url ? (
                  <img 
                    src={teacher.profile_image_url} 
                    alt={teacher.teacher_name || "Teacher"} 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="w-8 h-8 text-muted-foreground" />
                )}
              </div>
              <div className="flex-1 space-y-1">
                <p className="font-semibold text-lg">{teacher.teacher_name}</p>
                <p className="text-sm text-muted-foreground">{teacher.teacher_email}</p>
                <div className="flex gap-2 mt-2">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-[#236130]/10 text-[#236130]">
                    {teacher.grade_level}
                  </span>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-[#f5ca47]/20 text-[#236130]">
                    Section {teacher.section}
                  </span>
                </div>
              </div>
            </div>
          ))}
          {teachers.length === 0 && !isAdding && (
            <p className="text-center text-muted-foreground py-8">
              No teachers added yet. Click "Add Teacher" to get started.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
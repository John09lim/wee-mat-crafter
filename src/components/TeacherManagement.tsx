import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Upload, User, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

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

// Helper function to get sort order for grade levels
const getGradeLevelSortOrder = (gradeLevel: string | null): number => {
  if (!gradeLevel) return 9999;
  
  const normalized = gradeLevel.toLowerCase().trim();
  
  // SPED comes first
  if (normalized.includes('sped') || normalized.includes('special education')) return 0;
  
  // Kinder comes second
  if (normalized.includes('kinder')) return 1;
  
  // Grades 1-12
  const gradeMatch = normalized.match(/grade\s*(\d+)|(\d+)/);
  if (gradeMatch) {
    const gradeNum = parseInt(gradeMatch[1] || gradeMatch[2]);
    if (gradeNum >= 1 && gradeNum <= 12) {
      return 1 + gradeNum; // 2-13 for Grade 1-12
    }
  }
  
  // Everything else (subject teachers) comes last
  return 9999;
};

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
  const [deletingId, setDeletingId] = useState<string | null>(null);
  
  // Sort teachers by grade level hierarchy
  const sortedTeachers = [...teachers].sort((a, b) => {
    const orderA = getGradeLevelSortOrder(a.grade_level);
    const orderB = getGradeLevelSortOrder(b.grade_level);
    return orderA - orderB;
  });

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

  const handleDeleteTeacher = async (teacherId: string, teacherName: string | null) => {
    try {
      setDeletingId(teacherId);
      
      const { error } = await supabase
        .from("school_assignments")
        .delete()
        .eq("id", teacherId);

      if (error) throw error;

      toast({
        title: "Teacher Removed",
        description: `${teacherName || "Teacher"} has been removed from your school.`,
      });

      onRefresh();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setDeletingId(null);
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
          {sortedTeachers.map((teacher) => (
            <div key={teacher.id} className="relative flex items-start gap-4 p-4 border rounded-lg hover:shadow-md transition-shadow bg-card">
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
              <div className="flex-shrink-0">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="text-red-600 border-red-300 hover:bg-red-50 hover:text-red-700 hover:border-red-400"
                      disabled={deletingId === teacher.id}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Remove Teacher?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to remove <strong>{teacher.teacher_name}</strong> from your school? 
                        This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => handleDeleteTeacher(teacher.id, teacher.teacher_name)}
                        className="bg-red-600 hover:bg-red-700"
                      >
                        Remove
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
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
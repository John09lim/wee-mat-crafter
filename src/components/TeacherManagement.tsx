import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Upload, User, Trash2, Pencil, X } from "lucide-react";
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
  assignments?: Teacher[];
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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [teacherName, setTeacherName] = useState("");
  const [teacherEmail, setTeacherEmail] = useState("");
  const [gradeLevel, setGradeLevel] = useState("");
  const [section, setSection] = useState("");
  const [subject, setSubject] = useState("");
  const [teacherType, setTeacherType] = useState<"regular" | "subject">("regular");
  const [uploading, setUploading] = useState(false);
  const [profileImage, setProfileImage] = useState<File | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [gradeSubjectPairs, setGradeSubjectPairs] = useState<{ gradeLevel: string; subject: string }[]>([
    { gradeLevel: "", subject: "" }
  ]);
  
  // Group teachers by email (for subject teachers with multiple assignments)
  const teachersByEmail = teachers.reduce((acc, teacher) => {
    const email = teacher.teacher_email || "";
    if (!acc[email]) {
      acc[email] = [];
    }
    acc[email].push(teacher);
    return acc;
  }, {} as Record<string, Teacher[]>);

  // Create unique teacher entries (one per email, with grouped data)
  const uniqueTeachers = Object.values(teachersByEmail).map(group => {
    const primary = group[0];
    return {
      ...primary,
      assignments: group
    };
  });

  // Sort by grade level hierarchy
  const sortedTeachers = uniqueTeachers.sort((a, b) => {
    const orderA = getGradeLevelSortOrder(a.grade_level);
    const orderB = getGradeLevelSortOrder(b.grade_level);
    return orderA - orderB;
  });

  const handleAddTeacher = async () => {
    // Validation for regular teachers
    if (teacherType === "regular" && (!teacherName || !teacherEmail || !gradeLevel || !section)) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    // Validation for subject teachers
    if (teacherType === "subject" && (!teacherName || !teacherEmail)) {
      toast({
        title: "Missing Information",
        description: "Please fill in teacher name and email.",
        variant: "destructive",
      });
      return;
    }

    if (teacherType === "subject") {
      const hasEmptyPairs = gradeSubjectPairs.some(pair => !pair.gradeLevel || !pair.subject);
      if (hasEmptyPairs) {
        toast({
          title: "Missing Information",
          description: "Please fill in all Grade Level and Subject pairs.",
          variant: "destructive",
        });
        return;
      }
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

      // Fetch principal's profile information
      const { data: principalProfile } = await supabase
        .from("profiles")
        .select("teacher_name, profile_image_url")
        .eq("user_id", principalId)
        .single();

      // Get supervisor for this district
      const { data: supervisor } = await supabase
        .from("profiles")
        .select("user_id")
        .eq("district_name", districtName)
        .not("district_name", "is", null)
        .limit(1)
        .maybeSingle();

      // Query user_roles to verify it's actually a supervisor
      let supervisorId = null;
      if (supervisor) {
        const { data: roleCheck } = await supabase
          .from("user_roles")
          .select("user_id")
          .eq("user_id", supervisor.user_id)
          .eq("role", "supervisor")
          .maybeSingle();
        
        if (roleCheck) {
          supervisorId = supervisor.user_id;
        }
      }

      // Insert teacher into school_assignments
      if (teacherType === "regular") {
        // Single insert for regular teachers
        const { error } = await supabase
          .from("school_assignments")
          .insert({
            user_id: null as any,
            school_name: schoolName,
            district_name: districtName,
            principal_id: principalId,
            principal_name: principalProfile?.teacher_name || null,
            principal_profile_image_url: principalProfile?.profile_image_url || null,
            supervisor_id: supervisorId,
            teacher_name: teacherName,
            teacher_email: teacherEmail.toLowerCase(),
            grade_level: gradeLevel,
            section: section,
            profile_image_url: profileImageUrl,
          });

        if (error) throw error;
      } else {
        // Multiple inserts for subject teachers (one per grade/subject pair)
        const inserts = gradeSubjectPairs.map(pair => ({
          user_id: null as any,
          school_name: schoolName,
          district_name: districtName,
          principal_id: principalId,
          principal_name: principalProfile?.teacher_name || null,
          principal_profile_image_url: principalProfile?.profile_image_url || null,
          supervisor_id: supervisorId,
          teacher_name: teacherName,
          teacher_email: teacherEmail.toLowerCase(),
          grade_level: pair.gradeLevel,
          section: pair.subject,
          profile_image_url: profileImageUrl,
        }));

        const { error } = await supabase
          .from("school_assignments")
          .insert(inserts);

        if (error) throw error;
      }

      toast({
        title: "Teacher Added",
        description: `${teacherName} has been added to your school.`,
      });

      // Reset form
      setTeacherName("");
      setTeacherEmail("");
      setGradeLevel("");
      setSection("");
      setSubject("");
      setTeacherType("regular");
      setProfileImage(null);
      setGradeSubjectPairs([{ gradeLevel: "", subject: "" }]);
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

  const handleEditTeacher = (teacher: Teacher) => {
    setEditingId(teacher.id);
    
    // Check if this is a subject teacher with multiple assignments
    const isSubject = teacher.assignments && teacher.assignments.length > 1;
    setTeacherType(isSubject ? "subject" : "regular");
    setTeacherName(teacher.teacher_name || "");
    setTeacherEmail(teacher.teacher_email || "");
    
    if (isSubject && teacher.assignments) {
      // Load all grade/subject pairs
      setGradeSubjectPairs(teacher.assignments.map(a => ({
        gradeLevel: a.grade_level || "",
        subject: a.section || ""
      })));
      setGradeLevel("");
      setSection("");
    } else {
      // Regular teacher
      setGradeLevel(teacher.grade_level || "");
      setSection(teacher.section || "");
      setGradeSubjectPairs([{ gradeLevel: "", subject: "" }]);
    }
    
    setIsAdding(false);
  };

  const handleUpdateTeacher = async () => {
    // Validation for regular teachers
    if (teacherType === "regular" && (!teacherName || !teacherEmail || !gradeLevel || !section)) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    // Validation for subject teachers
    if (teacherType === "subject" && (!teacherName || !teacherEmail)) {
      toast({
        title: "Missing Information",
        description: "Please fill in teacher name and email.",
        variant: "destructive",
      });
      return;
    }

    if (teacherType === "subject") {
      const hasEmptyPairs = gradeSubjectPairs.some(pair => !pair.gradeLevel || !pair.subject);
      if (hasEmptyPairs) {
        toast({
          title: "Missing Information",
          description: "Please fill in all Grade Level and Subject pairs.",
          variant: "destructive",
        });
        return;
      }
    }

    try {
      let profileImageUrl = null;

      // Upload new profile image if provided
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

      // Fetch principal's profile information for consistency
      const { data: principalProfile } = await supabase
        .from("profiles")
        .select("teacher_name, profile_image_url")
        .eq("user_id", principalId)
        .single();

      // Get supervisor for this district
      const { data: supervisor } = await supabase
        .from("profiles")
        .select("user_id")
        .eq("district_name", districtName)
        .not("district_name", "is", null)
        .limit(1)
        .maybeSingle();

      let supervisorId = null;
      if (supervisor) {
        const { data: roleCheck } = await supabase
          .from("user_roles")
          .select("user_id")
          .eq("user_id", supervisor.user_id)
          .eq("role", "supervisor")
          .maybeSingle();
        
        if (roleCheck) {
          supervisorId = supervisor.user_id;
        }
      }

      if (teacherType === "regular") {
        // Single update for regular teacher
        const updateData: any = {
          teacher_name: teacherName,
          teacher_email: teacherEmail.toLowerCase(),
          grade_level: gradeLevel,
          section: section,
        };

        if (profileImageUrl) {
          updateData.profile_image_url = profileImageUrl;
        }

        const { error } = await supabase
          .from("school_assignments")
          .update(updateData)
          .eq("id", editingId);

        if (error) throw error;
      } else {
        // For subject teachers: delete all old assignments and insert new ones
        // First get all assignment IDs for this teacher email
        const { data: oldAssignments } = await supabase
          .from("school_assignments")
          .select("id")
          .eq("teacher_email", teacherEmail.toLowerCase())
          .eq("school_name", schoolName);

        if (oldAssignments && oldAssignments.length > 0) {
          const { error: deleteError } = await supabase
            .from("school_assignments")
            .delete()
            .in("id", oldAssignments.map(a => a.id));

          if (deleteError) throw deleteError;
        }

        // Insert new assignments
        const inserts = gradeSubjectPairs.map(pair => ({
          user_id: null as any,
          school_name: schoolName,
          district_name: districtName,
          principal_id: principalId,
          principal_name: principalProfile?.teacher_name || null,
          principal_profile_image_url: principalProfile?.profile_image_url || null,
          supervisor_id: supervisorId,
          teacher_name: teacherName,
          teacher_email: teacherEmail.toLowerCase(),
          grade_level: pair.gradeLevel,
          section: pair.subject,
          profile_image_url: profileImageUrl || null,
        }));

        const { error } = await supabase
          .from("school_assignments")
          .insert(inserts);

        if (error) throw error;
      }

      toast({
        title: "Teacher Updated",
        description: `${teacherName} has been updated successfully.`,
      });

      // Reset form
      setTeacherName("");
      setTeacherEmail("");
      setGradeLevel("");
      setSection("");
      setSubject("");
      setTeacherType("regular");
      setProfileImage(null);
      setGradeSubjectPairs([{ gradeLevel: "", subject: "" }]);
      setEditingId(null);
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

  const handleDeleteTeacher = async (teacherId: string, teacherName: string | null, teacherEmail: string | null) => {
    try {
      setDeletingId(teacherId);
      
      // Delete all assignments for this teacher email (handles subject teachers with multiple rows)
      const { error } = await supabase
        .from("school_assignments")
        .delete()
        .eq("teacher_email", teacherEmail?.toLowerCase())
        .eq("school_name", schoolName);

      if (error) throw error;

      onRefresh();
      
      toast({
        title: "Teacher Removed",
        description: `${teacherName || "Teacher"} has been removed from your school.`,
      });
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

  const handleCancelEdit = () => {
    setEditingId(null);
    setTeacherName("");
    setTeacherEmail("");
    setGradeLevel("");
    setSection("");
    setSubject("");
    setTeacherType("regular");
    setProfileImage(null);
    setGradeSubjectPairs([{ gradeLevel: "", subject: "" }]);
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
            <h4 className="font-semibold text-lg" style={{ color: "#236130" }}>Add New Teacher</h4>
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
              <div className="space-y-2 col-span-2">
                <Label>Teacher Type *</Label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="teacherType"
                      checked={teacherType === "regular"}
                      onChange={() => setTeacherType("regular")}
                      className="w-4 h-4"
                    />
                    <span>Regular Teacher</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="teacherType"
                      checked={teacherType === "subject"}
                      onChange={() => setTeacherType("subject")}
                      className="w-4 h-4"
                    />
                    <span>Subject Teacher</span>
                  </label>
                </div>
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
              {teacherType === "regular" ? (
                <div className="space-y-2">
                  <Label htmlFor="section">Section *</Label>
                  <Input
                    id="section"
                    value={section}
                    onChange={(e) => setSection(e.target.value)}
                    placeholder="e.g., A"
                  />
                </div>
              ) : (
                <div className="col-span-2 space-y-3">
                  <Label>Grade Level & Subjects *</Label>
                  <div className="space-y-2">
                    {gradeSubjectPairs.map((pair, index) => (
                      <div key={index} className="flex gap-2 items-end">
                        <div className="flex-1">
                          <Input
                            value={pair.gradeLevel}
                            onChange={(e) => {
                              const newPairs = [...gradeSubjectPairs];
                              newPairs[index].gradeLevel = e.target.value;
                              setGradeSubjectPairs(newPairs);
                            }}
                            placeholder="Grade Level (e.g., Grade 1)"
                          />
                        </div>
                        <div className="flex-1">
                          <Input
                            value={pair.subject}
                            onChange={(e) => {
                              const newPairs = [...gradeSubjectPairs];
                              newPairs[index].subject = e.target.value;
                              setGradeSubjectPairs(newPairs);
                            }}
                            placeholder="Subject (e.g., MAPEH)"
                          />
                        </div>
                        {gradeSubjectPairs.length > 1 && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="text-red-600 border-red-300 hover:bg-red-50"
                            onClick={() => {
                              setGradeSubjectPairs(gradeSubjectPairs.filter((_, i) => i !== index));
                            }}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      style={{ borderColor: "#236130", color: "#236130" }}
                      className="hover:bg-[#236130]/10"
                      onClick={() => setGradeSubjectPairs([...gradeSubjectPairs, { gradeLevel: "", subject: "" }])}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Another Grade Level & Subject
                    </Button>
                  </div>
                </div>
              )}
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
            <div key={teacher.id}>
              {editingId === teacher.id ? (
                <div className="p-4 border rounded-lg space-y-4 bg-muted/50">
                  <h4 className="font-semibold text-lg" style={{ color: "#236130" }}>Edit Teacher</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="editTeacherName">Teacher Name *</Label>
                      <Input
                        id="editTeacherName"
                        value={teacherName}
                        onChange={(e) => setTeacherName(e.target.value)}
                        placeholder="e.g., Maria Santos"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="editTeacherEmail">Email *</Label>
                      <Input
                        id="editTeacherEmail"
                        type="email"
                        value={teacherEmail}
                        onChange={(e) => setTeacherEmail(e.target.value)}
                        placeholder="e.g., maria@school.edu"
                      />
                    </div>
                    <div className="space-y-2 col-span-2">
                      <Label>Teacher Type *</Label>
                      <div className="flex gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="editTeacherType"
                            checked={teacherType === "regular"}
                            onChange={() => setTeacherType("regular")}
                            className="w-4 h-4"
                          />
                          <span>Regular Teacher</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="editTeacherType"
                            checked={teacherType === "subject"}
                            onChange={() => setTeacherType("subject")}
                            className="w-4 h-4"
                          />
                          <span>Subject Teacher</span>
                        </label>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="editGradeLevel">Grade Level *</Label>
                      <Input
                        id="editGradeLevel"
                        value={gradeLevel}
                        onChange={(e) => setGradeLevel(e.target.value)}
                        placeholder="e.g., Grade 7"
                      />
                    </div>
                    {teacherType === "regular" ? (
                      <div className="space-y-2">
                        <Label htmlFor="editSection">Section *</Label>
                        <Input
                          id="editSection"
                          value={section}
                          onChange={(e) => setSection(e.target.value)}
                          placeholder="e.g., A"
                        />
                      </div>
                    ) : (
                      <div className="col-span-2 space-y-3">
                        <Label>Grade Level & Subjects *</Label>
                        <div className="space-y-2">
                          {gradeSubjectPairs.map((pair, index) => (
                            <div key={index} className="flex gap-2 items-end">
                              <div className="flex-1">
                                <Input
                                  value={pair.gradeLevel}
                                  onChange={(e) => {
                                    const newPairs = [...gradeSubjectPairs];
                                    newPairs[index].gradeLevel = e.target.value;
                                    setGradeSubjectPairs(newPairs);
                                  }}
                                  placeholder="Grade Level (e.g., Grade 1)"
                                />
                              </div>
                              <div className="flex-1">
                                <Input
                                  value={pair.subject}
                                  onChange={(e) => {
                                    const newPairs = [...gradeSubjectPairs];
                                    newPairs[index].subject = e.target.value;
                                    setGradeSubjectPairs(newPairs);
                                  }}
                                  placeholder="Subject (e.g., MAPEH)"
                                />
                              </div>
                              {gradeSubjectPairs.length > 1 && (
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="text-red-600 border-red-300 hover:bg-red-50"
                                  onClick={() => {
                                    setGradeSubjectPairs(gradeSubjectPairs.filter((_, i) => i !== index));
                                  }}
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              )}
                            </div>
                          ))}
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            style={{ borderColor: "#236130", color: "#236130" }}
                            className="hover:bg-[#236130]/10"
                            onClick={() => setGradeSubjectPairs([...gradeSubjectPairs, { gradeLevel: "", subject: "" }])}
                          >
                            <Plus className="w-4 h-4 mr-2" />
                            Add Another Grade Level & Subject
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="editProfileImage">Update Profile Image (Optional)</Label>
                    <label htmlFor="editProfileImage" className="cursor-pointer">
                      <div className="flex items-center gap-3 p-4 border-2 border-dashed rounded-lg hover:border-[#236130] transition-colors">
                        <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: "#236130" }}>
                          <Upload className="w-6 h-6 text-white" />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium" style={{ color: "#236130" }}>
                            {profileImage ? profileImage.name : "Upload New Photo"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Click to choose an image file
                          </p>
                        </div>
                      </div>
                    </label>
                    <Input
                      id="editProfileImage"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => setProfileImage(e.target.files?.[0] || null)}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleUpdateTeacher} disabled={uploading}>
                      {uploading ? "Updating..." : "Update Teacher"}
                    </Button>
                    <Button variant="outline" onClick={handleCancelEdit}>
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="relative flex items-start gap-4 p-4 border rounded-lg hover:shadow-md transition-shadow bg-card">
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
                    <div className="flex flex-wrap gap-2 mt-2">
                      {teacher.assignments && teacher.assignments.length > 1 ? (
                        // Subject teacher with multiple assignments
                        teacher.assignments.map((assignment, idx) => (
                          <div key={idx} className="flex gap-1">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-[#236130]/10 text-[#236130]">
                              {assignment.grade_level}
                            </span>
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-[#f5ca47]/20 text-[#236130]">
                              {assignment.section}
                            </span>
                          </div>
                        ))
                      ) : (
                        // Regular teacher with single assignment
                        <>
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-[#236130]/10 text-[#236130]">
                            {teacher.grade_level}
                          </span>
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-[#f5ca47]/20 text-[#236130]">
                            {teacher.section || "Subject Teacher"}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <Button 
                      variant="outline" 
                      size="sm"
                      style={{ borderColor: "#236130", color: "#236130" }}
                      className="hover:bg-[#236130]/10"
                      onClick={() => handleEditTeacher(teacher)}
                    >
                      <Pencil className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
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
                            onClick={() => handleDeleteTeacher(teacher.id, teacher.teacher_name, teacher.teacher_email)}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            Remove
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              )}
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
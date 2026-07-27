import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Upload, User, Trash2, Pencil, X } from "lucide-react";
import {
  collapseTeacherAssignments,
  normalizeTeacherEmail,
  parseSubjectAssignments,
  SUBJECT_TEACHER_LABEL,
  type TeacherAssignmentRecord,
} from "@/lib/teacherManagement";
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

type Teacher = TeacherAssignmentRecord;

type MembershipRpcError = {
  code?: string;
  message?: string;
};

type UpsertMembershipResult = {
  assignment_id: string;
  linked_user_id: string | null;
  teacher_name: string;
  teacher_email: string;
};

type MembershipRpcClient = {
  rpc: (
    functionName:
      | "upsert_principal_teacher_membership"
      | "remove_principal_teacher_membership",
    parameters: Record<string, unknown>,
  ) => Promise<{
    data: UpsertMembershipResult | number | null;
    error: MembershipRpcError | null;
  }>;
};

const membershipRpcClient = supabase as unknown as MembershipRpcClient;

interface TeacherManagementProps {
  schoolName: string;
  districtName: string;
  principalId: string;
  teachers: Teacher[];
  onRefresh: () => void | Promise<void>;
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
  teachers,
  onRefresh 
}: TeacherManagementProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [teacherName, setTeacherName] = useState("");
  const [teacherEmail, setTeacherEmail] = useState("");
  const [gradeLevel, setGradeLevel] = useState("");
  const [section, setSection] = useState("");
  const [teacherType, setTeacherType] = useState<"regular" | "subject">("regular");
  const [uploading, setUploading] = useState(false);
  const [profileImage, setProfileImage] = useState<File | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [gradeSubjectPairs, setGradeSubjectPairs] = useState<{ gradeLevel: string; subject: string }[]>([
    { gradeLevel: "", subject: "" }
  ]);
  
  const uniqueTeachers = collapseTeacherAssignments(teachers);

  // Sort by grade level hierarchy
  const sortedTeachers = uniqueTeachers.sort((a, b) => {
    const orderA = getGradeLevelSortOrder(a.grade_level);
    const orderB = getGradeLevelSortOrder(b.grade_level);
    return orderA - orderB;
  });

  const resetForm = () => {
    setTeacherName("");
    setTeacherEmail("");
    setGradeLevel("");
    setSection("");
    setTeacherType("regular");
    setProfileImage(null);
    setGradeSubjectPairs([{ gradeLevel: "", subject: "" }]);
  };

  const describeDatabaseError = (error: unknown, fallback: string) => {
    const databaseError = error as { code?: string; message?: string };
    if (databaseError.code === "23505") {
      return "This teacher is already connected to your school.";
    }
    if (databaseError.code === "42501") {
      return "You can only manage teachers assigned to your own school.";
    }
    if (databaseError.code === "P0002") {
      return "The teacher record was not found. The list has been refreshed.";
    }
    if (
      databaseError.code === "PGRST202" ||
      databaseError.message?.includes("upsert_principal_teacher_membership") ||
      databaseError.message?.includes("remove_principal_teacher_membership")
    ) {
      return "The teacher-management database update has not been installed yet.";
    }
    return databaseError.message || fallback;
  };

  const validateTeacherForm = () => {
    const normalizedEmail = normalizeTeacherEmail(teacherEmail);
    const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail);
    const subjectPairsComplete =
      gradeSubjectPairs.length > 0 &&
      gradeSubjectPairs.every((pair) => pair.subject.trim());

    if (
      !teacherName.trim() ||
      !validEmail ||
      (teacherType === "regular" && (!gradeLevel.trim() || !section.trim())) ||
      (teacherType === "subject" && !subjectPairsComplete)
    ) {
      toast({
        title: "Missing or invalid information",
        description:
          teacherType === "subject"
            ? "Enter the teacher name, a valid email, and every subject."
            : "Enter the teacher name, a valid email, grade level, and section.",
        variant: "destructive",
      });
      return false;
    }

    return true;
  };

  const uploadTeacherImage = async () => {
    if (!profileImage) return null;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const fileExt = profileImage.name.split(".").pop();
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `${user.id}/teacher-profiles/${fileName}`;
    const { error: uploadError } = await supabase.storage
      .from("weelmat")
      .upload(filePath, profileImage);

    if (uploadError) throw uploadError;

    return supabase.storage.from("weelmat").getPublicUrl(filePath).data.publicUrl;
  };

  const saveTeacherMembership = async (assignmentId: string | null) => {
    if (!validateTeacherForm()) return false;

    setUploading(true);
    try {
      const profileImageUrl = await uploadTeacherImage();
      const subjects = Array.from(
        new Set(
          gradeSubjectPairs
            .map((pair) => pair.subject.trim())
            .filter(Boolean),
        ),
      );
      const classification =
        teacherType === "subject" ? SUBJECT_TEACHER_LABEL : gradeLevel.trim();
      const classOrSubjects =
        teacherType === "subject" ? subjects.join(", ") : section.trim();

      const { data, error } = await membershipRpcClient.rpc(
        "upsert_principal_teacher_membership",
        {
          p_assignment_id: assignmentId,
          p_teacher_name: teacherName.trim(),
          p_teacher_email: normalizeTeacherEmail(teacherEmail),
          p_grade_level: classification,
          p_section: classOrSubjects,
          p_profile_image_url: profileImageUrl,
        },
      );

      if (error) throw error;
      if (!data || typeof data === "number" || !data.assignment_id) {
        throw new Error("The database did not confirm the teacher membership.");
      }

      await onRefresh();
      toast({
        title: assignmentId ? "Teacher updated" : "Teacher added",
        description: data.linked_user_id
          ? `${data.teacher_name} is linked to the existing teacher account.`
          : `${data.teacher_name} is ready and will link when that teacher signs in.`,
      });
      resetForm();
      setIsAdding(false);
      setEditingId(null);
      return true;
    } catch (error: unknown) {
      await onRefresh();
      toast({
        title: "Teacher was not saved",
        description: describeDatabaseError(
          error,
          assignmentId
            ? "Failed to update the teacher."
            : "Failed to add the teacher.",
        ),
        variant: "destructive",
      });
      return false;
    } finally {
      setUploading(false);
    }
  };

  const handleAddTeacher = async () => {
    await saveTeacherMembership(null);
  };

  const handleEditTeacher = (teacher: Teacher) => {
    setEditingId(teacher.id);
    
    const isSubject =
      teacher.grade_level?.trim().toLocaleLowerCase() ===
        SUBJECT_TEACHER_LABEL.toLocaleLowerCase() ||
      Boolean(teacher.assignments && teacher.assignments.length > 1);
    setTeacherType(isSubject ? "subject" : "regular");
    setTeacherName(teacher.teacher_name || "");
    setTeacherEmail(teacher.teacher_email || "");
    
    if (isSubject) {
      setGradeSubjectPairs(parseSubjectAssignments(teacher));
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
    if (!editingId) return;
    await saveTeacherMembership(editingId);
  };

  const handleDeleteTeacher = async (teacherId: string, teacherName: string | null) => {
    try {
      setDeletingId(teacherId);
      const { data, error } = await membershipRpcClient.rpc(
        "remove_principal_teacher_membership",
        { p_assignment_id: teacherId },
      );
      if (error) throw error;
      if (typeof data !== "number" || data < 1) {
        throw new Error("The database did not remove a teacher membership.");
      }

      await onRefresh();
      toast({
        title: "Teacher Removed",
        description: `${teacherName || "Teacher"} was removed from this school. The teacher's main account was not deleted.`,
      });
    } catch (error: unknown) {
      await onRefresh();
      toast({
        title: "Teacher was not removed",
        description: describeDatabaseError(error, "Failed to remove the teacher."),
        variant: "destructive",
      });
    } finally {
      setDeletingId(null);
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    resetForm();
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
                            Remove this teacher from your school? This will remove{" "}
                            <strong>{teacher.teacher_name}</strong> from your Principal
                            Dashboard but will not automatically delete the teacher&apos;s
                            main account.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDeleteTeacher(teacher.id, teacher.teacher_name)}
                            disabled={deletingId === teacher.id}
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
          {sortedTeachers.length === 0 && !isAdding && (
            <p className="text-center text-muted-foreground py-8">
              No teachers added yet. Click "Add Teacher" to get started.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

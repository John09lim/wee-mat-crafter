import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { FileText, Send, Eye, Upload, Plus, User, School, Mail, Edit2, Save, X, CheckCircle, Clock, XCircle, Lock, LogOut } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import PasswordResetDialog from "@/components/PasswordResetDialog";

interface UserProfile {
  teacher_name: string;
  email: string;
  school: string;
  district_name: string | null;
  profile_image_url: string | null;
}

interface TeacherSubmission {
  id: string;
  subject: string;
  grade_level: string;
  section: string;
  week_start: string;
  week_end: string;
  status: string;
  file_url: string;
  created_at: string;
  principal_notes: string | null;
}

interface SchoolOption {
  principal_id: string;
  principal_name: string;
  principal_profile_image_url: string | null;
  school_name: string;
}

const MyAccount = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedProfile, setEditedProfile] = useState<UserProfile | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  
  // Submission form state
  const [submitting, setSubmitting] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [submissions, setSubmissions] = useState<TeacherSubmission[]>([]);
  const [schoolOptions, setSchoolOptions] = useState<SchoolOption[]>([]);
  const [selectedSchool, setSelectedSchool] = useState<SchoolOption | null>(null);
  const [formData, setFormData] = useState({
    teacherName: "",
    gradeLevel: "",
    section: "",
    subject: "",
    weekStart: "",
    weekEnd: "",
  });

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
    toast.success("Logged out successfully");
  };

  useEffect(() => {
    void checkAuthAndFetchData();
    // Account bootstrap should run once; subsequent refreshes are triggered by successful mutations.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const checkAuthAndFetchData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      // AUTO-LINK: Check if this teacher's email matches any unlinked school_assignments
      const { data: unlinkedAssignment } = await supabase
        .from("school_assignments")
        .select("id, school_name, district_name, principal_id")
        .eq("teacher_email", user.email!.toLowerCase())
        .is("user_id", null)
        .maybeSingle();

      if (unlinkedAssignment) {
        // Link the teacher to this assignment
        await supabase
          .from("school_assignments")
          .update({ user_id: user.id })
          .eq("id", unlinkedAssignment.id);
        
        toast.success(`You've been linked to ${unlinkedAssignment.school_name}!`);
      }

      // My Account is the teacher workspace. Repair legacy accounts whose
      // auth user exists but whose role trigger did not create a teacher row.
      let { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "teacher")
        .maybeSingle();

      if (!roleData) {
        const metadataRole = user.user_metadata?.role;
        if (metadataRole === "school_head") {
          navigate("/principal-dashboard", { replace: true });
          return;
        }
        if (metadataRole === "supervisor") {
          navigate("/supervisor-dashboard", { replace: true });
          return;
        }

        const { error: roleRepairError } = await supabase
          .from("user_roles")
          .insert({ user_id: user.id, role: "teacher" });

        if (roleRepairError && !roleRepairError.message.includes("duplicate")) {
          throw new Error(`Unable to activate the teacher workspace: ${roleRepairError.message}`);
        }

        roleData = { role: "teacher" };
      }

      setUserRole("teacher");

      // Fetch user profile
      let { data: profileData } = await supabase
        .from("profiles")
        .select("teacher_name, email, school, district_name, profile_image_url")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!profileData) {
        const fallbackProfile = {
          user_id: user.id,
          email: user.email || "",
          teacher_name: user.user_metadata?.full_name || user.email?.split("@")[0] || "Teacher",
          school: "Please update",
          district_name: "Please update",
        };
        const { error: profileRepairError } = await supabase.from("profiles").upsert(fallbackProfile, { onConflict: "user_id" });
        if (profileRepairError) throw profileRepairError;
        profileData = { ...fallbackProfile, profile_image_url: null };
      }

      if (profileData) {
        setProfile(profileData);
        setEditedProfile(profileData);
        
        // Pre-fill submission form
        setFormData(prev => ({
          ...prev,
          teacherName: profileData.teacher_name || "",
        }));
      }

      // Fetch submission history (only for teachers)
      if (roleData?.role === 'teacher') {
        const { data: submissionsData, error: submissionsError } = await supabase
          .from("teacher_submissions")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        if (submissionsError) {
          console.error("Error fetching submissions:", submissionsError);
        } else {
          setSubmissions(submissionsData || []);
        }
        
        // Fetch assigned principals
        await fetchAssignedPrincipals();
      }
    } catch (error: unknown) {
      console.error("Error:", error);
      toast.error("Failed to load account data");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!editedProfile) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from("profiles")
        .update({
          teacher_name: editedProfile.teacher_name,
          school: editedProfile.school,
          district_name: editedProfile.district_name,
        })
        .eq("user_id", user.id);

      if (error) throw error;

      setProfile(editedProfile);
      setIsEditing(false);
      toast.success("Profile updated successfully!");
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error("Failed to update profile");
    }
  };

  const handleProfileImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error("Please upload an image file");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image size should be less than 5MB");
      return;
    }

    setUploadingImage(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Upload to storage with user_id in path
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/teacher-profiles/profile-${Date.now()}.${fileExt}`;
      
      const { error: uploadError, data } = await supabase.storage
        .from('weelmat')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('weelmat')
        .getPublicUrl(fileName);

      // Update profile with new image URL
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ profile_image_url: publicUrl })
        .eq("user_id", user.id);

      if (updateError) throw updateError;

      // Update local state
      setProfile(prev => prev ? { ...prev, profile_image_url: publicUrl } : null);
      setEditedProfile(prev => prev ? { ...prev, profile_image_url: publicUrl } : null);

      toast.success("Profile photo updated successfully!");
    } catch (error) {
      console.error("Error uploading profile image:", error);
      toast.error("Failed to upload profile photo");
    } finally {
      setUploadingImage(false);
    }
  };

  const fetchAssignedPrincipals = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Query school_assignments where this teacher is assigned
      const { data: assignments, error } = await supabase
        .from("school_assignments")
        .select("principal_id, principal_name, principal_profile_image_url, school_name")
        .or(`user_id.eq.${user.id},teacher_email.ilike.${user.email}`)
        .not("principal_id", "is", null);

      if (error) throw error;

      if (!assignments || assignments.length === 0) {
        setSchoolOptions([]);
        return;
      }

      // Map assignments directly to school options
      const options: SchoolOption[] = assignments.map(assignment => ({
        principal_id: assignment.principal_id!,
        principal_name: assignment.principal_name || "School Head",
        principal_profile_image_url: assignment.principal_profile_image_url,
        school_name: assignment.school_name,
      }));

      setSchoolOptions(options);
      
      // Auto-select if only one option
      if (options.length === 1) {
        setSelectedSchool(options[0]);
      }
    } catch (error) {
      console.error("Error fetching assigned principals:", error);
      setSchoolOptions([]);
    }
  };

  const handleSubmitWeelMat = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!file) {
      toast.error("Please select a file to upload");
      return;
    }

    if (!selectedSchool) {
      toast.error("Please select your school and principal");
      return;
    }

    setSubmitting(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const submitFormData = new FormData();
      submitFormData.append("file", file);
      submitFormData.append("teacherName", formData.teacherName);
      submitFormData.append("gradeLevel", formData.gradeLevel);
      submitFormData.append("section", formData.section);
      submitFormData.append("subject", formData.subject);
      submitFormData.append("weekStart", formData.weekStart);
      submitFormData.append("weekEnd", formData.weekEnd);
      submitFormData.append("principalId", selectedSchool.principal_id);
      submitFormData.append("schoolHeadName", selectedSchool.principal_name);
      submitFormData.append("schoolName", selectedSchool.school_name);
      submitFormData.append("districtName", profile?.district_name || "");

      const response = await fetch(
        `https://velpueasbsrptocrjljg.supabase.co/functions/v1/submit-weelmat`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
          body: submitFormData,
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Submission failed");
      }

      toast.success("WeeLMat submitted successfully to your School Head!");
      
      // Reset form
      setFile(null);
      setFormData(prev => ({
        ...prev,
        gradeLevel: "",
        section: "",
        subject: "",
        weekStart: "",
        weekEnd: "",
      }));
      
      // Refresh submissions
      checkAuthAndFetchData();
    } catch (error: unknown) {
      console.error("Submission error:", error);
      toast.error(error instanceof Error ? error.message : "Submission failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleViewFile = (fileUrl: string) => {
    const viewerUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(fileUrl)}`;
    window.open(viewerUrl, '_blank');
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "submitted": return <CheckCircle className="h-5 w-5 text-blue-600" />;
      case "accepted": return <CheckCircle className="h-5 w-5 text-green-600" />;
      case "pending": return <Clock className="h-5 w-5 text-yellow-600" />;
      case "returned": return <XCircle className="h-5 w-5 text-red-600" />;
      case "reviewed": return <Eye className="h-5 w-5 text-blue-600" />;
      default: return <FileText className="h-5 w-5" />;
    }
  };

  const getRoleLabel = () => {
    switch (userRole) {
      case 'teacher': return 'Teacher';
      case 'school_head': return 'School Head / Principal';
      case 'supervisor': return 'Supervisor';
      default: return 'User';
    }
  };

  if (loading) {
    return (
      <main className="flex min-h-[calc(100dvh-4rem)] items-center justify-center bg-background" aria-busy="true">
        <div className="text-center" role="status" aria-live="polite">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
          <p className="font-medium text-foreground">Loading your workspace…</p>
          <p className="mt-1 text-sm text-muted-foreground">Profile, files, and submissions are being prepared.</p>
        </div>
      </main>
    );
  }

  return (
    <>
      <PasswordResetDialog 
        open={showPasswordDialog} 
        onClose={() => setShowPasswordDialog(false)} 
      />
      
      <main className="min-h-[calc(100dvh-4rem)] bg-background py-8 sm:py-12">
        <div className="container max-w-7xl">
          {/* Welcome Section */}
          <header className="mb-8 grid gap-6 border-b border-border pb-8 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <h1 className="font-display text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">My workspace</h1>
              <p className="mt-3 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">Keep your profile, files, and submissions in one place.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={() => setShowPasswordDialog(true)}
                variant="outline"
                className="gap-2"
              >
                <Lock className="h-4 w-4" aria-hidden="true" />
                Change Password
              </Button>
              <Button
                onClick={handleLogout}
                variant="ghost"
                className="gap-2 text-muted-foreground hover:text-destructive"
              >
                <LogOut className="h-4 w-4" aria-hidden="true" />
                Sign out
              </Button>
            </div>
          </header>

        {/* Profile Card */}
        <Card className="mb-8 border-border bg-card p-5 shadow-[0_18px_50px_-42px_rgba(20,32,25,.55)] sm:p-7">
          <div className="mb-6 flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary"><User className="h-5 w-5" aria-hidden="true" /></span>
              <div><h2 className="font-display text-2xl font-semibold text-foreground">Profile</h2><p className="mt-1 text-sm text-muted-foreground">The account details used across your WeeLMat workspace.</p></div>
            </div>
            {!isEditing ? (
              <Button
                onClick={() => setIsEditing(true)}
                variant="outline"
                className="gap-2"
              >
                <Edit2 className="mr-2 h-4 w-4" />
                Edit Profile
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button
                  onClick={handleSaveProfile}
                  className="gap-2"
                >
                  <Save className="mr-2 h-4 w-4" />
                  Save
                </Button>
                <Button
                  onClick={() => {
                    setIsEditing(false);
                    setEditedProfile(profile);
                  }}
                  variant="outline"
                >
                  <X className="mr-2 h-4 w-4" />
                  Cancel
                </Button>
              </div>
            )}
          </div>

          <div className="grid gap-7 lg:grid-cols-[14rem_minmax(0,1fr)]">
            {/* Profile Photo Section - Left Side */}
            <div className="flex flex-col items-center gap-4 rounded-xl border border-border bg-muted/35 p-4">
              <div className="h-40 w-36 overflow-hidden rounded-xl border border-border bg-card flex items-center justify-center">
                {profile?.profile_image_url ? (
                  <img 
                    src={profile.profile_image_url} 
                    alt="Profile" 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="h-16 w-16 text-muted-foreground" aria-hidden="true" />
                )}
              </div>
              {isEditing && (
                <div className="w-full">
                  <input
                    type="file"
                    id="profile-image"
                    accept="image/*"
                    onChange={handleProfileImageUpload}
                    className="hidden"
                    disabled={uploadingImage}
                  />
                  <label htmlFor="profile-image">
                    <Button
                      type="button"
                      onClick={() => document.getElementById('profile-image')?.click()}
                      disabled={uploadingImage}
                      className="w-full gap-2"
                    >
                      <Upload className="mr-2 h-4 w-4" />
                      {uploadingImage ? "Uploading..." : "Upload Photo"}
                    </Button>
                  </label>
                </div>
              )}
            </div>

            {/* Profile Information - Right Side */}
            <div className="grid content-start gap-5 md:grid-cols-2">
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Role</Label>
              <div className="mt-1 flex items-center gap-2">
                <span className="font-semibold text-lg">{getRoleLabel()}</span>
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium text-muted-foreground">Email</Label>
              <div className="mt-1 flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span>{profile?.email}</span>
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium text-muted-foreground">Name</Label>
              {isEditing ? (
                <Input
                  value={editedProfile?.teacher_name || ""}
                  onChange={(e) => setEditedProfile(prev => prev ? {...prev, teacher_name: e.target.value} : null)}
                  className="mt-1"
                />
              ) : (
                <div className="mt-1">
                  <span className="font-medium">{profile?.teacher_name}</span>
                </div>
              )}
            </div>

            <div>
              <Label className="text-sm font-medium text-muted-foreground">
                {userRole === 'supervisor' ? 'District/Division' : 'School'}
              </Label>
              {isEditing ? (
                <Input
                  value={editedProfile?.school || ""}
                  onChange={(e) => setEditedProfile(prev => prev ? {...prev, school: e.target.value} : null)}
                  className="mt-1"
                />
              ) : (
                <div className="mt-1 flex items-center gap-2">
                  <School className="h-4 w-4 text-muted-foreground" />
                  <span>{profile?.school}</span>
                </div>
              )}
            </div>

            {profile?.district_name && (
              <div>
                <Label className="text-sm font-medium text-muted-foreground">District</Label>
                {isEditing ? (
                  <Input
                    value={editedProfile?.district_name || ""}
                    onChange={(e) => setEditedProfile(prev => prev ? {...prev, district_name: e.target.value} : null)}
                    className="mt-1"
                  />
                ) : (
                  <div className="mt-1">
                    <span>{profile?.district_name}</span>
                  </div>
                )}
              </div>
            )}
            </div>
          </div>
        </Card>

        {/* Teacher Hub - Only for Teachers */}
        {userRole === 'teacher' && (
          <section className="mb-8 grid gap-6 lg:grid-cols-3" aria-labelledby="teacher-actions-heading">
            <h2 id="teacher-actions-heading" className="sr-only">Teacher actions</h2>
            {/* Create WeeLMat Card */}
            <button 
              type="button"
              className="group rounded-2xl border border-primary/20 bg-primary p-7 text-left text-primary-foreground shadow-[0_18px_45px_-38px_rgba(20,32,25,.8)] transition-transform duration-200 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              onClick={() => navigate("/dashboard")}
            >
              <div className="flex h-full flex-col justify-between gap-8">
                <div className="flex h-12 w-12 items-center justify-center rounded-full border border-secondary/60 text-secondary">
                  <Plus className="h-6 w-6" aria-hidden="true" />
                </div>
                <div>
                  <h3 className="font-display text-3xl font-semibold">Create a WeeLMat</h3>
                  <p className="mt-3 text-sm leading-6 text-primary-foreground/75">Start a new Weekly Learning Matrix from your DLP, DLL, or learning material.</p>
                  <span className="mt-6 inline-flex items-center text-sm font-semibold text-secondary">Open creator <span className="ml-2 transition-transform group-hover:translate-x-1">→</span></span>
                </div>
              </div>
            </button>

            {/* Submit WeeLMat Card */}
            <Card className="border-border bg-card shadow-[0_18px_50px_-42px_rgba(20,32,25,.55)] lg:col-span-2">
              <CardHeader className="border-b border-border">
                <CardTitle className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                    <Send className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <div>
                    <div className="font-display text-2xl font-semibold text-foreground">Submit WeeLMat</div>
                    <p className="text-sm font-normal text-muted-foreground">Upload your completed WeeLMat for principal review</p>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {schoolOptions.length === 0 ? (
                    <div className="rounded-xl border border-warning/25 bg-warning/10 p-6 text-center">
                    <XCircle className="mx-auto mb-3 h-10 w-10 text-warning" aria-hidden="true" />
                    <p className="mb-2 text-lg font-semibold text-warning">
                      Cannot Submit WeeLMat Yet
                    </p>
                    <p className="text-sm leading-6 text-warning/85">
                      Please wait for your School Head to add you to their school in the Principal Dashboard.
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handleSubmitWeelMat} className="space-y-6">
                    {/* Form Fields */}
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="account-submission-teacher">Teacher name</Label>
                        <Input
                          id="account-submission-teacher"
                          value={formData.teacherName}
                          onChange={(e) => setFormData({...formData, teacherName: e.target.value})}
                          required
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="account-submission-school">School name</Label>
                        <Input
                          id="account-submission-school"
                          value={selectedSchool?.school_name || profile?.school || ""}
                          readOnly
                          className="bg-muted"
                        />
                      </div>

                      {schoolOptions.length > 1 && (
                        <div className="md:col-span-2">
                          <Label htmlFor="account-submission-principal">School head</Label>
                          <Select
                            value={selectedSchool?.principal_id || ""}
                            onValueChange={(value) => {
                              const school = schoolOptions.find(s => s.principal_id === value);
                              setSelectedSchool(school || null);
                            }}
                            required
                          >
                            <SelectTrigger id="account-submission-principal">
                              <SelectValue placeholder="Select your school head" />
                            </SelectTrigger>
                            <SelectContent>
                              {schoolOptions.map((school) => (
                                <SelectItem key={school.principal_id} value={school.principal_id}>
                                  {school.principal_name} ({school.school_name})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                    <div>
                      <Label htmlFor="account-submission-subject">Learning area</Label>
                      <Input
                        id="account-submission-subject"
                        value={formData.subject}
                        onChange={(e) => setFormData({...formData, subject: e.target.value})}
                        placeholder="e.g., Mathematics"
                        required
                      />
                    </div>

                    <div>
                      <Label>Grade and section</Label>
                      <div className="flex gap-2">
                        <Input
                          aria-label="Grade level"
                          value={formData.gradeLevel}
                          onChange={(e) => setFormData({...formData, gradeLevel: e.target.value})}
                          placeholder="Grade"
                          className="flex-1"
                          required
                        />
                        <Input
                          aria-label="Section"
                          value={formData.section}
                          onChange={(e) => setFormData({...formData, section: e.target.value})}
                          placeholder="Section"
                          className="flex-1"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="account-submission-week-start">Week begins</Label>
                      <Input
                        id="account-submission-week-start"
                        type="date"
                        value={formData.weekStart}
                        onChange={(e) => setFormData({...formData, weekStart: e.target.value})}
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="account-submission-week-end">Week ends</Label>
                      <Input
                        id="account-submission-week-end"
                        type="date"
                        value={formData.weekEnd}
                        onChange={(e) => setFormData({...formData, weekEnd: e.target.value})}
                        required
                      />
                    </div>
                  </div>

                  {/* Beautiful Upload Area */}
                  <div>
                    <Label htmlFor="file-upload" className="text-base font-semibold">Upload WeeLMat file</Label>
                    <div className="mt-3">
                      <label
                        htmlFor="file-upload"
                        className="flex min-h-40 w-full cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-primary/40 bg-primary/5 transition-colors duration-200 hover:bg-primary/10 focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2"
                      >
                        <input
                          id="file-upload"
                          type="file"
                          accept=".docx,.pdf"
                          onChange={(e) => setFile(e.target.files?.[0] || null)}
                          required
                          className="hidden"
                        />
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                          <div 
                            className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm"
                          >
                            <Upload className="h-8 w-8 text-white" />
                          </div>
                          {file ? (
                            <div className="text-center">
                              <p className="mb-1 text-lg font-semibold text-primary">
                                {file.name}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                Click to change file
                              </p>
                            </div>
                          ) : (
                            <div className="text-center">
                              <p className="mb-1 text-lg font-semibold text-primary">
                                Click to upload or drag and drop
                              </p>
                              <p className="text-sm text-muted-foreground">
                                DOCX or PDF (Max 10MB)
                              </p>
                            </div>
                          )}
                        </div>
                      </label>
                    </div>
                  </div>

                  {/* School Head Display */}
                  {selectedSchool && (
                    <div className="rounded-xl border border-primary/20 bg-primary/5 p-5">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-14 rounded-lg bg-muted flex items-center justify-center overflow-hidden flex-shrink-0 border-2 border-border">
                          {selectedSchool.principal_profile_image_url ? (
                            <img 
                              src={selectedSchool.principal_profile_image_url} 
                              alt={selectedSchool.principal_name} 
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <User className="h-6 w-6 text-primary" aria-hidden="true" />
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-muted-foreground mb-1">
                            Submitting to:
                          </p>
                          <p className="font-display text-xl font-semibold text-primary">
                            {selectedSchool.principal_name}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {selectedSchool.school_name}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  <Button 
                    type="submit" 
                    disabled={submitting || !selectedSchool}
                    className="h-12 w-full text-base font-semibold"
                  >
                    <Send className="mr-2 h-5 w-5" />
                    {submitting ? "Submitting..." : "Submit to School Head"}
                  </Button>
                </form>
                )}
              </CardContent>
            </Card>
          </section>
        )}

        {/* Submission History - Only for Teachers */}
        {userRole === 'teacher' && (
          <Card className="border-border bg-card p-5 shadow-[0_18px_50px_-42px_rgba(20,32,25,.55)] sm:p-7">
            <div className="mb-6 flex items-center gap-3 border-b border-border pb-5">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary"><FileText className="h-5 w-5" aria-hidden="true" /></span>
              <h2 className="font-display text-2xl font-semibold text-foreground">
                Submission History
              </h2>
            </div>

            {submissions.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="mx-auto mb-4 h-12 w-12 text-muted-foreground" aria-hidden="true" />
                <h3 className="font-display mb-2 text-2xl font-semibold">No submissions yet</h3>
                <p className="text-muted-foreground">
                  You haven't submitted any WeeLMats yet. Fill out the form above to submit your first one!
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-border">
                <Table>
                  <caption className="sr-only">Your Weekly Learning Matrix submissions</caption>
                  <TableHeader>
                    <TableRow className="bg-muted/45">
                      <TableHead>Subject</TableHead>
                      <TableHead>Grade</TableHead>
                      <TableHead>Section</TableHead>
                      <TableHead>Week</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {submissions.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.subject}</TableCell>
                        <TableCell>{item.grade_level}</TableCell>
                        <TableCell>{item.section}</TableCell>
                        <TableCell>
                          {new Date(item.week_start).toLocaleDateString()} - {new Date(item.week_end).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getStatusIcon(item.status)}
                            <span className="text-sm capitalize font-medium">{item.status}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-end">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleViewFile(item.file_url)}
                              aria-label={`View ${item.subject} submission in a new tab`}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              View
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </Card>
        )}
        </div>
      </main>
    </>
  );
};

export default MyAccount;

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { FileText, Send, Eye, Upload, Plus, User, School, Mail, Edit2, Save, X, CheckCircle, Clock, XCircle } from "lucide-react";
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

  useEffect(() => {
    checkAuthAndFetchData();
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

      // Fetch user role
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .single();

      setUserRole(roleData?.role || null);

      // Fetch user profile
      const { data: profileData } = await supabase
        .from("profiles")
        .select("teacher_name, email, school, district_name, profile_image_url")
        .eq("user_id", user.id)
        .single();

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
    } catch (error: any) {
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
      
      // First try by user_id
      let { data: assignments } = await supabase
        .from("school_assignments")
        .select("id, principal_id, school_name, district_name, user_id")
        .eq("user_id", user.id)
        .not("principal_id", "is", null);
      
      // If no results, check by email and auto-link
      if (!assignments || assignments.length === 0) {
        const { data: emailAssignments } = await supabase
          .from("school_assignments")
          .select("id, principal_id, school_name, district_name, user_id")
          .eq("teacher_email", user.email!.toLowerCase())
          .not("principal_id", "is", null);
        
        if (emailAssignments && emailAssignments.length > 0) {
          // Auto-link any with NULL user_id
          for (const assignment of emailAssignments) {
            if (!assignment.user_id) {
              await supabase
                .from("school_assignments")
                .update({ user_id: user.id })
                .eq("id", assignment.id);
            }
          }
          assignments = emailAssignments;
        }
      }
      
      if (assignments && assignments.length > 0) {
        // Get principal names from profiles first
        const principalIds = [...new Set(assignments.map(a => a.principal_id))];
        const { data: principalProfiles } = await supabase
          .from("profiles")
          .select("user_id, teacher_name")
          .in("user_id", principalIds);
        
        // Get principal names from schools table as fallback
        const schoolNames = [...new Set(assignments.map(a => a.school_name))];
        const { data: schoolsData } = await supabase
          .from("schools")
          .select("principal_id, principal_name")
          .in("school_name", schoolNames);
        
        // Build options with principal names
        const options = assignments.map(assignment => {
          const principal = principalProfiles?.find(p => p.user_id === assignment.principal_id);
          const schoolData = schoolsData?.find(s => s.principal_id === assignment.principal_id);
          
          // Try profile name first, then school principal_name, then default
          const principalName = principal?.teacher_name || schoolData?.principal_name || "School Head";
          
          return {
            principal_id: assignment.principal_id!,
            principal_name: principalName,
            school_name: assignment.school_name
          };
        });
        
        setSchoolOptions(options);
        
        // Auto-select if only one option
        if (options.length === 1) {
          setSelectedSchool(options[0]);
        }
      } else {
        setSchoolOptions([]);
      }
    } catch (error) {
      console.error("Error fetching assigned principals:", error);
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
    } catch (error: any) {
      console.error("Submission error:", error);
      toast.error(error.message || "Submission failed");
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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading your account...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#f9f0eb" }}>
      <div className="container py-12 max-w-6xl mx-auto">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2" style={{ color: "#236130" }}>
            My Account
          </h1>
          <p className="text-muted-foreground">
            Manage your profile and view your activity
          </p>
        </div>

        {/* Profile Card */}
        <Card className="p-6 shadow-lg mb-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <User className="h-6 w-6" style={{ color: "#236130" }} />
              <h2 className="text-2xl font-bold" style={{ color: "#236130" }}>
                Profile Information
              </h2>
            </div>
            {!isEditing ? (
              <Button
                onClick={() => setIsEditing(true)}
                variant="outline"
                style={{ borderColor: "#236130", color: "#236130" }}
              >
                <Edit2 className="mr-2 h-4 w-4" />
                Edit Profile
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button
                  onClick={handleSaveProfile}
                  style={{ backgroundColor: "#236130", color: "white" }}
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

          <div className="flex gap-8">
            {/* Profile Photo Section - Left Side */}
            <div className="flex flex-col items-center gap-4">
              <div className="w-48 h-56 rounded-lg border-2 border-border overflow-hidden bg-muted flex items-center justify-center">
                {profile?.profile_image_url ? (
                  <img 
                    src={profile.profile_image_url} 
                    alt="Profile" 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="h-24 w-24 text-muted-foreground" />
                )}
              </div>
              {isEditing && (
                <div className="w-48">
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
                      style={{ backgroundColor: "#236130", color: "white" }}
                      className="w-full"
                    >
                      <Upload className="mr-2 h-4 w-4" />
                      {uploadingImage ? "Uploading..." : "Upload Photo"}
                    </Button>
                  </label>
                </div>
              )}
            </div>

            {/* Profile Information - Right Side */}
            <div className="flex-1 grid md:grid-cols-2 gap-6">
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
          <div className="grid lg:grid-cols-3 gap-6 mb-8">
            {/* Create WeeLMat Card */}
            <Card 
              className="p-6 hover:shadow-xl transition-all cursor-pointer border-2"
              style={{ borderColor: "#236130" }}
              onClick={() => navigate("/dashboard")}
            >
              <div className="flex flex-col items-center text-center gap-4">
                <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ backgroundColor: "#236130" }}>
                  <Plus className="h-8 w-8 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold mb-1" style={{ color: "#236130" }}>
                    Create WeeLMat
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Generate a new Weekly Learning Matrix
                  </p>
                </div>
              </div>
            </Card>

            {/* Submit WeeLMat Card */}
            <Card className="lg:col-span-2 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: "#236130" }}>
                    <Send className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <div style={{ color: "#236130" }}>Submit WeeLMat</div>
                    <p className="text-sm font-normal text-muted-foreground">Upload your completed WeeLMat for principal review</p>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {schoolOptions.length === 0 ? (
                  <div className="p-6 bg-yellow-50 border-2 border-yellow-200 rounded-lg text-center">
                    <XCircle className="h-12 w-12 text-yellow-600 mx-auto mb-3" />
                    <p className="text-yellow-800 font-semibold text-lg mb-2">
                      Cannot Submit WeeLMat Yet
                    </p>
                    <p className="text-yellow-700">
                      Please wait for your School Head to add you to their school in the Principal Dashboard.
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handleSubmitWeelMat} className="space-y-6">
                    {/* Form Fields */}
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <Label>Teacher Name</Label>
                        <Input
                          value={formData.teacherName}
                          onChange={(e) => setFormData({...formData, teacherName: e.target.value})}
                          required
                        />
                      </div>
                      
                      <div>
                        <Label>School Name</Label>
                        <Input
                          value={selectedSchool?.school_name || profile?.school || ""}
                          readOnly
                          className="bg-muted"
                        />
                      </div>

                      {schoolOptions.length > 1 && (
                        <div className="md:col-span-2">
                          <Label>Select School Head (if multiple)</Label>
                          <Select
                            value={selectedSchool?.principal_id || ""}
                            onValueChange={(value) => {
                              const school = schoolOptions.find(s => s.principal_id === value);
                              setSelectedSchool(school || null);
                            }}
                            required
                          >
                            <SelectTrigger>
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
                      <Label>Subject</Label>
                      <Input
                        value={formData.subject}
                        onChange={(e) => setFormData({...formData, subject: e.target.value})}
                        placeholder="e.g., Mathematics"
                        required
                      />
                    </div>

                    <div>
                      <Label>Grade & Section</Label>
                      <div className="flex gap-2">
                        <Input
                          value={formData.gradeLevel}
                          onChange={(e) => setFormData({...formData, gradeLevel: e.target.value})}
                          placeholder="Grade"
                          className="flex-1"
                          required
                        />
                        <Input
                          value={formData.section}
                          onChange={(e) => setFormData({...formData, section: e.target.value})}
                          placeholder="Section"
                          className="flex-1"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <Label>Week Start</Label>
                      <Input
                        type="date"
                        value={formData.weekStart}
                        onChange={(e) => setFormData({...formData, weekStart: e.target.value})}
                        required
                      />
                    </div>

                    <div>
                      <Label>Week End</Label>
                      <Input
                        type="date"
                        value={formData.weekEnd}
                        onChange={(e) => setFormData({...formData, weekEnd: e.target.value})}
                        required
                      />
                    </div>
                  </div>

                  {/* Beautiful Upload Area */}
                  <div>
                    <Label className="text-base font-semibold">Upload WeeLMat File</Label>
                    <div className="mt-3">
                      <label
                        htmlFor="file-upload"
                        className="flex flex-col items-center justify-center w-full h-40 border-3 border-dashed rounded-xl cursor-pointer hover:bg-muted/50 transition-all duration-300"
                        style={{ borderColor: "#236130" }}
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
                            className="w-16 h-16 rounded-full flex items-center justify-center mb-4 shadow-lg"
                            style={{ backgroundColor: "#236130" }}
                          >
                            <Upload className="h-8 w-8 text-white" />
                          </div>
                          {file ? (
                            <div className="text-center">
                              <p className="font-semibold text-lg mb-1" style={{ color: "#236130" }}>
                                {file.name}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                Click to change file
                              </p>
                            </div>
                          ) : (
                            <div className="text-center">
                              <p className="font-semibold text-lg mb-1" style={{ color: "#236130" }}>
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
                    <div 
                      className="p-5 rounded-xl border-2"
                      style={{ backgroundColor: "#f9f0eb", borderColor: "#236130" }}
                    >
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0"
                          style={{ backgroundColor: "#236130" }}
                        >
                          <User className="h-6 w-6 text-white" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-muted-foreground mb-1">
                            Submitting to:
                          </p>
                          <p className="text-xl font-bold" style={{ color: "#236130" }}>
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
                    className="w-full h-12 text-base font-semibold hover:shadow-lg transition-all duration-300"
                    style={{ backgroundColor: "#236130", color: "white" }}
                  >
                    <Send className="mr-2 h-5 w-5" />
                    {submitting ? "Submitting..." : "Submit to School Head"}
                  </Button>
                </form>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Submission History - Only for Teachers */}
        {userRole === 'teacher' && (
          <Card className="p-6 shadow-lg">
            <div className="flex items-center gap-3 mb-6">
              <FileText className="h-6 w-6" style={{ color: "#236130" }} />
              <h2 className="text-2xl font-bold" style={{ color: "#236130" }}>
                Submission History
              </h2>
            </div>

            {submissions.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold mb-2">No Submissions Yet</h3>
                <p className="text-muted-foreground">
                  You haven't submitted any WeeLMats yet. Fill out the form above to submit your first one!
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
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
                              title="View in new tab"
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
    </div>
  );
};

export default MyAccount;
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { FileText, Eye, Upload, Plus, User, School, Mail, Edit2, Save, X, CheckCircle, Clock, XCircle } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface UserProfile {
  teacher_name: string;
  email: string;
  school: string;
  district_name: string | null;
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

const MyAccount = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedProfile, setEditedProfile] = useState<UserProfile | null>(null);
  
  // Submission history state
  const [submissions, setSubmissions] = useState<TeacherSubmission[]>([]);

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
        .select("teacher_name, email, school, district_name")
        .eq("user_id", user.id)
        .single();

      if (profileData) {
        setProfile(profileData);
        setEditedProfile(profileData);
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

          <div className="grid md:grid-cols-2 gap-6">
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
        </Card>

        {/* Teacher Hub - Only for Teachers */}
        {userRole === 'teacher' && (
          <div className="mb-8">
            {/* Create WeeLMat Card */}
            <Card 
              className="p-8 hover:shadow-xl transition-all cursor-pointer border-2"
              style={{ borderColor: "#236130" }}
              onClick={() => navigate("/dashboard")}
            >
              <div className="flex flex-col items-center text-center gap-4">
                <div className="w-20 h-20 rounded-full flex items-center justify-center" style={{ backgroundColor: "#236130" }}>
                  <Plus className="h-10 w-10 text-white" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold mb-2" style={{ color: "#236130" }}>
                    Create WeeLMat
                  </h3>
                  <p className="text-base text-muted-foreground">
                    Generate a new Weekly Learning Matrix
                  </p>
                </div>
              </div>
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
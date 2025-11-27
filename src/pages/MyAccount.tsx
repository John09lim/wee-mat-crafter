import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { FileText, Send, Eye, Download, Plus, User, School, Mail, Edit2, Save, X } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface WeeLMatMatrix {
  id: string;
  subject: string;
  grade_level: string;
  section: string;
  date_from: string;
  date_to: string;
  docx_url: string | null;
  student_docx_url: string | null;
  created_at: string;
}

interface UserProfile {
  teacher_name: string;
  email: string;
  school: string;
  district_name: string | null;
}

const MyAccount = () => {
  const navigate = useNavigate();
  const [history, setHistory] = useState<WeeLMatMatrix[]>([]);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedProfile, setEditedProfile] = useState<UserProfile | null>(null);

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

      // Fetch WeeLMat history (only for teachers)
      if (roleData?.role === 'teacher') {
        const { data, error } = await supabase
          .from("weelmat_matrices")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(5);

        if (error) throw error;
        setHistory(data || []);
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

  const handleDownload = async (url: string | null, filename: string) => {
    if (!url) {
      toast.error("Download URL not available");
      return;
    }

    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error("Download error:", error);
      toast.error("Failed to download file");
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

        {/* Quick Actions - Only for Teachers */}
        {userRole === 'teacher' && (
          <div className="grid md:grid-cols-2 gap-6 mb-12">
            <Card 
              className="p-8 hover:shadow-xl transition-all cursor-pointer border-2"
              style={{ borderColor: "#236130" }}
              onClick={() => navigate("/dashboard")}
            >
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ backgroundColor: "#236130" }}>
                  <Plus className="h-8 w-8 text-white" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold mb-1" style={{ color: "#236130" }}>
                    Create WeeLMat
                  </h3>
                  <p className="text-muted-foreground">
                    Generate a new Weekly Learning Matrix
                  </p>
                </div>
              </div>
            </Card>

            <Card 
              className="p-8 hover:shadow-xl transition-all cursor-pointer border-2"
              style={{ borderColor: "#f5ca47" }}
              onClick={() => navigate("/teacher-submission")}
            >
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ backgroundColor: "#f5ca47" }}>
                  <Send className="h-8 w-8" style={{ color: "#236130" }} />
                </div>
                <div>
                  <h3 className="text-2xl font-bold mb-1" style={{ color: "#236130" }}>
                    Submit WeeLMat
                  </h3>
                  <p className="text-muted-foreground">
                    Submit your completed WeeLMat to principal
                  </p>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Recent WeeLMats - Only for Teachers */}
        {userRole === 'teacher' && (
          <Card className="p-6 shadow-lg">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <FileText className="h-6 w-6" style={{ color: "#236130" }} />
                <h2 className="text-2xl font-bold" style={{ color: "#236130" }}>
                  Recent WeeLMats
                </h2>
              </div>
              {history.length > 0 && (
                <Button 
                  variant="outline" 
                  onClick={() => navigate("/weelmat-history")}
                  style={{ borderColor: "#236130", color: "#236130" }}
                >
                  View All
                </Button>
              )}
            </div>

            {history.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold mb-2">No WeeLMats Yet</h3>
                <p className="text-muted-foreground mb-6">
                  You haven't generated any WeeLMats yet. Create your first one!
                </p>
                <Button 
                  onClick={() => navigate("/dashboard")}
                  style={{ backgroundColor: "#236130", color: "white" }}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Create Your First WeeLMat
                </Button>
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
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {history.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.subject}</TableCell>
                        <TableCell>{item.grade_level}</TableCell>
                        <TableCell>{item.section}</TableCell>
                        <TableCell>
                          {new Date(item.date_from).toLocaleDateString()} - {new Date(item.date_to).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => navigate(`/premium/weelmat?matrixId=${item.id}`)}
                              title="View Preview"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDownload(
                                item.docx_url,
                                `WeeLMat_Teacher_${item.subject}_${item.grade_level}.docx`
                              )}
                              title="Download Teacher Version"
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDownload(
                                item.student_docx_url,
                                `WeeLMat_Student_${item.subject}_${item.grade_level}.docx`
                              )}
                              title="Download Student Version"
                            >
                              <Download className="h-4 w-4" />
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
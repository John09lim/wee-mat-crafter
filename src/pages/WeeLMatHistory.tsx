import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Download, Eye, RefreshCw, FileText } from "lucide-react";
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
import { Input } from "@/components/ui/input";

interface WeeLMatMatrix {
  id: string;
  subject: string;
  grade_level: string;
  section: string;
  date_from: string;
  date_to: string;
  docx_url: string | null;
  student_docx_url: string | null;
  ai_json: any;
  created_at: string;
}

const WeeLMatHistory = () => {
  const navigate = useNavigate();
  const [history, setHistory] = useState<WeeLMatMatrix[]>([]);
  const [filteredHistory, setFilteredHistory] = useState<WeeLMatMatrix[]>([]);
  const [loading, setLoading] = useState(true);
  const [subjectFilter, setSubjectFilter] = useState<string>("all");
  const [gradeFilter, setGradeFilter] = useState<string>("all");
  const [sectionFilter, setSectionFilter] = useState<string>("");

  useEffect(() => {
    fetchHistory();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [history, subjectFilter, gradeFilter, sectionFilter]);

  const fetchHistory = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      const { data, error } = await supabase
        .from("weelmat_matrices")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      setHistory(data || []);
    } catch (error: any) {
      console.error("Error fetching history:", error);
      toast.error("Failed to load WeeLMat history");
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...history];

    if (subjectFilter !== "all") {
      filtered = filtered.filter(item => item.subject === subjectFilter);
    }

    if (gradeFilter !== "all") {
      filtered = filtered.filter(item => item.grade_level === gradeFilter);
    }

    if (sectionFilter) {
      filtered = filtered.filter(item => 
        item.section.toLowerCase().includes(sectionFilter.toLowerCase())
      );
    }

    setFilteredHistory(filtered);
  };

  const handleViewPreview = (matrixId: string) => {
    navigate(`/weelmatgeneratorpremium/weelmat?matrixId=${matrixId}`);
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

  const handleRegenerate = (matrix: WeeLMatMatrix) => {
    if (!matrix.ai_json) {
      toast.error("Cannot regenerate: Original data not available");
      return;
    }

    const aiData = matrix.ai_json;
    const prefillData = {
      subject: matrix.subject,
      gradeLevel: matrix.grade_level,
      section: matrix.section,
      dateFrom: matrix.date_from,
      dateTo: matrix.date_to,
      mondayCompetency: aiData.competency?.mon || "",
      mondayExamType: aiData.examType?.mon || "",
      mondayQuestions: aiData.questions?.mon || "",
      tuesdayCompetency: aiData.competency?.tue || "",
      tuesdayExamType: aiData.examType?.tue || "",
      tuesdayQuestions: aiData.questions?.tue || "",
      wednesdayCompetency: aiData.competency?.wed || "",
      wednesdayExamType: aiData.examType?.wed || "",
      wednesdayQuestions: aiData.questions?.wed || "",
      thursdayCompetency: aiData.competency?.thu || "",
      thursdayExamType: aiData.examType?.thu || "",
      thursdayQuestions: aiData.questions?.thu || "",
      fridayCompetency: aiData.competency?.fri || "",
      fridayExamType: aiData.examType?.fri || "",
      fridayQuestions: aiData.questions?.fri || "",
    };

    navigate("/dashboard", { state: { prefillData } });
  };

  const uniqueSubjects = Array.from(new Set(history.map(h => h.subject)));
  const uniqueGrades = Array.from(new Set(history.map(h => h.grade_level)));

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading your WeeLMats...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground">My Saved WeeLMats</h1>
            <p className="text-muted-foreground mt-1">
              View, download, and regenerate your past Weekly Learning Matrices
            </p>
          </div>
          <Button onClick={() => navigate("/dashboard")}>
            <FileText className="mr-2 h-4 w-4" />
            Create New WeeLMat
          </Button>
        </div>

        {history.length === 0 ? (
          <div className="text-center py-12 bg-card rounded-lg border">
            <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">No WeeLMats Yet</h2>
            <p className="text-muted-foreground mb-4">
              You haven't generated any WeeLMats yet. Create your first one!
            </p>
            <Button onClick={() => navigate("/dashboard")}>
              Create Your First WeeLMat
            </Button>
          </div>
        ) : (
          <>
            <div className="bg-card rounded-lg border p-4 mb-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Subject</label>
                  <Select value={subjectFilter} onValueChange={setSubjectFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Subjects" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Subjects</SelectItem>
                      {uniqueSubjects.map(subject => (
                        <SelectItem key={subject} value={subject}>
                          {subject}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Grade Level</label>
                  <Select value={gradeFilter} onValueChange={setGradeFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Grades" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Grades</SelectItem>
                      {uniqueGrades.map(grade => (
                        <SelectItem key={grade} value={grade}>
                          {grade}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Section</label>
                  <Input
                    placeholder="Search section..."
                    value={sectionFilter}
                    onChange={(e) => setSectionFilter(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="bg-card rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Subject</TableHead>
                    <TableHead>Grade</TableHead>
                    <TableHead>Section</TableHead>
                    <TableHead>Week</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredHistory.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.subject}</TableCell>
                      <TableCell>{item.grade_level}</TableCell>
                      <TableCell>{item.section}</TableCell>
                      <TableCell>
                        {new Date(item.date_from).toLocaleDateString()} - {new Date(item.date_to).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        {new Date(item.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleViewPreview(item.id)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDownload(
                              item.docx_url,
                              `WeeLMat_Teacher_${item.subject}_${item.grade_level}_${item.section}.docx`
                            )}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDownload(
                              item.student_docx_url,
                              `WeeLMat_Student_${item.subject}_${item.grade_level}_${item.section}.docx`
                            )}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleRegenerate(item)}
                          >
                            <RefreshCw className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {filteredHistory.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No WeeLMats match your filter criteria
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default WeeLMatHistory;

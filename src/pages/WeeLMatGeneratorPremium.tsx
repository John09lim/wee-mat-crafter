import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { FileText, GraduationCap, ClipboardList, Loader2, Download, Sparkles } from "lucide-react";

type FormValues = {
  subject: string;
  gradeLevel: string;
  section: string;
  mondayCompetency: string;
  mondayReference: string;
  mondayExamType: string;
  tuesdayCompetency: string;
  tuesdayReference: string;
  tuesdayExamType: string;
  wednesdayCompetency: string;
  wednesdayReference: string;
  wednesdayExamType: string;
  thursdayCompetency: string;
  thursdayReference: string;
  thursdayExamType: string;
  fridayCompetency: string;
  fridayReference: string;
  fridayExamType: string;
  dateFrom: string;
  dateTo: string;
  language?: string;
};

const WeeLMatGeneratorPremium = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("weelmat");

  // WeeLMat state
  const [weelmatLoading, setWeelmatLoading] = useState(false);
  const [weelmatData, setWeelmatData] = useState<any>(null);
  const [weelmatProgress, setWeelmatProgress] = useState(0);

  // Lesson Plan state
  const [lessonPlanLoading, setLessonPlanLoading] = useState(false);
  const [lessonPlanData, setLessonPlanData] = useState<any>(null);
  const [lessonPlanForm, setLessonPlanForm] = useState({
    subject: "",
    gradeLevel: "",
    section: "",
    topic: "",
    competencies: "",
    duration: "",
    language: "English",
  });

  // Periodical Test state
  const [testLoading, setTestLoading] = useState(false);
  const [testData, setTestData] = useState<any>(null);
  const [testForm, setTestForm] = useState({
    subject: "",
    gradeLevel: "",
    section: "",
    quarter: "1st",
    competencies: "",
    multipleChoice: "20",
    trueFalse: "10",
    identification: "10",
    essay: "5",
    language: "English",
  });

  useEffect(() => {
    document.title = "Premium WeeLMat Generator";
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute("content", "Generate WeeLMat, Lesson Plans, and Periodical Tests with AI");
    }
  }, []);

  // WeeLMat Generation
  const handleWeelmatGenerate = async () => {
    const formValues = JSON.parse(sessionStorage.getItem("weelmatFormValues") || "{}") as FormValues;
    
    if (!formValues.subject || !formValues.gradeLevel) {
      toast.error("Please fill in the form first");
      navigate("/dashboard");
      return;
    }

    setWeelmatLoading(true);
    setWeelmatProgress(0);

    const progressSteps = [
      { progress: 20, message: "Analyzing competencies..." },
      { progress: 40, message: "Generating learning activities..." },
      { progress: 60, message: "Creating assessment tasks..." },
      { progress: 80, message: "Finalizing WeeLMat..." },
      { progress: 95, message: "Preparing document..." },
    ];

    let currentStep = 0;
    const progressInterval = setInterval(() => {
      if (currentStep < progressSteps.length) {
        setWeelmatProgress(progressSteps[currentStep].progress);
        currentStep++;
      }
    }, 3000);

    try {
      const { data, error } = await supabase.functions.invoke("generate-weelmat", {
        body: formValues,
      });

      clearInterval(progressInterval);

      if (error) throw error;
      if (!data?.matrixId || !data?.docxUrl) throw new Error("Invalid response");

      setWeelmatProgress(100);
      setWeelmatData(data);
    } catch (error: any) {
      clearInterval(progressInterval);
      toast.error(error.message || "Failed to generate WeeLMat");
      setWeelmatLoading(false);
    }
  };

  // Lesson Plan Generation
  const handleLessonPlanGenerate = async () => {
    if (!lessonPlanForm.subject || !lessonPlanForm.topic || !lessonPlanForm.competencies) {
      toast.error("Please fill in all required fields");
      return;
    }

    setLessonPlanLoading(true);
    
    try {
      const { data, error } = await supabase.functions.invoke("generate-lesson-plan", {
        body: lessonPlanForm,
      });

      if (error) throw error;
      if (!data?.docxUrl) throw new Error("Invalid response");

      setLessonPlanData(data);
      toast.success("Lesson plan generated successfully!");
    } catch (error: any) {
      toast.error(error.message || "Failed to generate lesson plan");
    } finally {
      setLessonPlanLoading(false);
    }
  };

  // Periodical Test Generation
  const handleTestGenerate = async () => {
    if (!testForm.subject || !testForm.competencies) {
      toast.error("Please fill in all required fields");
      return;
    }

    setTestLoading(true);
    
    try {
      const { data, error } = await supabase.functions.invoke("generate-periodical-test", {
        body: testForm,
      });

      if (error) throw error;
      if (!data?.docxUrl) throw new Error("Invalid response");

      setTestData(data);
      toast.success("Periodical test generated successfully!");
    } catch (error: any) {
      toast.error(error.message || "Failed to generate test");
    } finally {
      setTestLoading(false);
    }
  };

  const downloadFile = async (url: string, filename: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
      toast.success("Download started!");
    } catch (error) {
      toast.error("Failed to download file");
    }
  };

  useEffect(() => {
    if (activeTab === "weelmat" && !weelmatData && !weelmatLoading) {
      handleWeelmatGenerate();
    }
  }, [activeTab]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/5">
      <div className="container mx-auto py-8 px-4">
        <div className="mb-8 text-center">
          <div className="inline-flex items-center gap-2 mb-4 px-4 py-2 bg-primary/10 rounded-full">
            <Sparkles className="w-5 h-5 text-primary" />
            <span className="text-sm font-semibold text-primary">Premium Features</span>
          </div>
          <h1 className="text-4xl font-bold mb-2">WeeLMat Generator Premium</h1>
          <p className="text-muted-foreground">Generate comprehensive teaching materials with AI</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full max-w-3xl mx-auto grid-cols-3 mb-8">
            <TabsTrigger value="weelmat" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              WeeLMat
            </TabsTrigger>
            <TabsTrigger value="lessonplan" className="flex items-center gap-2">
              <GraduationCap className="w-4 h-4" />
              Lesson Plan
            </TabsTrigger>
            <TabsTrigger value="test" className="flex items-center gap-2">
              <ClipboardList className="w-4 h-4" />
              Periodical Test
            </TabsTrigger>
          </TabsList>

          {/* WeeLMat Tab */}
          <TabsContent value="weelmat">
            {weelmatLoading && !weelmatData ? (
              <Card className="max-w-2xl mx-auto">
                <CardContent className="pt-6">
                  <div className="text-center space-y-6">
                    <Loader2 className="w-16 h-16 animate-spin mx-auto text-primary" />
                    <div>
                      <h3 className="text-xl font-semibold mb-2">Generating Your WeeLMat</h3>
                      <p className="text-muted-foreground mb-4">Please wait while we create your weekly learning matrix...</p>
                      <div className="w-full bg-secondary rounded-full h-2 overflow-hidden">
                        <div 
                          className="h-full bg-primary transition-all duration-500"
                          style={{ width: `${weelmatProgress}%` }}
                        />
                      </div>
                      <p className="text-sm text-muted-foreground mt-2">{weelmatProgress}%</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : weelmatData ? (
              <Card className="max-w-[95%] mx-auto">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    WeeLMat Ready
                  </CardTitle>
                  <CardDescription>Your weekly learning matrix has been generated</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-4">
                    <Button onClick={() => downloadFile(weelmatData.docxUrl, "WeeLMat.docx")} className="flex-1">
                      <Download className="w-4 h-4 mr-2" />
                      Download DOCX
                    </Button>
                    <Button variant="outline" onClick={() => navigate("/dashboard")}>
                      Generate Another
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : null}
          </TabsContent>

          {/* Lesson Plan Tab */}
          <TabsContent value="lessonplan">
            {!lessonPlanData ? (
              <Card className="max-w-2xl mx-auto">
                <CardHeader>
                  <CardTitle>Generate Lesson Plan</CardTitle>
                  <CardDescription>Create comprehensive lesson plans automatically</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Subject *</Label>
                      <Input 
                        value={lessonPlanForm.subject}
                        onChange={(e) => setLessonPlanForm({...lessonPlanForm, subject: e.target.value})}
                        placeholder="e.g., Mathematics"
                      />
                    </div>
                    <div>
                      <Label>Grade Level *</Label>
                      <Input 
                        value={lessonPlanForm.gradeLevel}
                        onChange={(e) => setLessonPlanForm({...lessonPlanForm, gradeLevel: e.target.value})}
                        placeholder="e.g., Grade 7"
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Section</Label>
                    <Input 
                      value={lessonPlanForm.section}
                      onChange={(e) => setLessonPlanForm({...lessonPlanForm, section: e.target.value})}
                      placeholder="e.g., Section A"
                    />
                  </div>
                  <div>
                    <Label>Topic/Lesson Title *</Label>
                    <Input 
                      value={lessonPlanForm.topic}
                      onChange={(e) => setLessonPlanForm({...lessonPlanForm, topic: e.target.value})}
                      placeholder="e.g., Introduction to Algebra"
                    />
                  </div>
                  <div>
                    <Label>Learning Competencies *</Label>
                    <Textarea 
                      value={lessonPlanForm.competencies}
                      onChange={(e) => setLessonPlanForm({...lessonPlanForm, competencies: e.target.value})}
                      placeholder="Enter the learning competencies..."
                      rows={4}
                    />
                  </div>
                  <div>
                    <Label>Duration</Label>
                    <Input 
                      value={lessonPlanForm.duration}
                      onChange={(e) => setLessonPlanForm({...lessonPlanForm, duration: e.target.value})}
                      placeholder="e.g., 1 hour"
                    />
                  </div>
                  <div>
                    <Label>Language</Label>
                    <Select value={lessonPlanForm.language} onValueChange={(v) => setLessonPlanForm({...lessonPlanForm, language: v})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="English">English</SelectItem>
                        <SelectItem value="Filipino">Filipino</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button onClick={handleLessonPlanGenerate} disabled={lessonPlanLoading} className="w-full">
                    {lessonPlanLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <GraduationCap className="w-4 h-4 mr-2" />}
                    Generate Lesson Plan
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <Card className="max-w-2xl mx-auto">
                <CardHeader>
                  <CardTitle>Lesson Plan Ready</CardTitle>
                  <CardDescription>Your lesson plan has been generated</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button onClick={() => downloadFile(lessonPlanData.docxUrl, "LessonPlan.docx")} className="w-full">
                    <Download className="w-4 h-4 mr-2" />
                    Download Lesson Plan
                  </Button>
                  <Button variant="outline" onClick={() => setLessonPlanData(null)} className="w-full">
                    Generate Another
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Periodical Test Tab */}
          <TabsContent value="test">
            {!testData ? (
              <Card className="max-w-2xl mx-auto">
                <CardHeader>
                  <CardTitle>Generate Periodical Test & TOS</CardTitle>
                  <CardDescription>Generate assessments and table of specifications</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Subject *</Label>
                      <Input 
                        value={testForm.subject}
                        onChange={(e) => setTestForm({...testForm, subject: e.target.value})}
                        placeholder="e.g., Science"
                      />
                    </div>
                    <div>
                      <Label>Grade Level *</Label>
                      <Input 
                        value={testForm.gradeLevel}
                        onChange={(e) => setTestForm({...testForm, gradeLevel: e.target.value})}
                        placeholder="e.g., Grade 8"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Section</Label>
                      <Input 
                        value={testForm.section}
                        onChange={(e) => setTestForm({...testForm, section: e.target.value})}
                        placeholder="e.g., Section B"
                      />
                    </div>
                    <div>
                      <Label>Quarter</Label>
                      <Select value={testForm.quarter} onValueChange={(v) => setTestForm({...testForm, quarter: v})}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1st">1st Quarter</SelectItem>
                          <SelectItem value="2nd">2nd Quarter</SelectItem>
                          <SelectItem value="3rd">3rd Quarter</SelectItem>
                          <SelectItem value="4th">4th Quarter</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label>Competencies *</Label>
                    <Textarea 
                      value={testForm.competencies}
                      onChange={(e) => setTestForm({...testForm, competencies: e.target.value})}
                      placeholder="Enter the competencies to cover (one per line)..."
                      rows={4}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Multiple Choice</Label>
                      <Input 
                        type="number"
                        value={testForm.multipleChoice}
                        onChange={(e) => setTestForm({...testForm, multipleChoice: e.target.value})}
                      />
                    </div>
                    <div>
                      <Label>True/False</Label>
                      <Input 
                        type="number"
                        value={testForm.trueFalse}
                        onChange={(e) => setTestForm({...testForm, trueFalse: e.target.value})}
                      />
                    </div>
                    <div>
                      <Label>Identification</Label>
                      <Input 
                        type="number"
                        value={testForm.identification}
                        onChange={(e) => setTestForm({...testForm, identification: e.target.value})}
                      />
                    </div>
                    <div>
                      <Label>Essay</Label>
                      <Input 
                        type="number"
                        value={testForm.essay}
                        onChange={(e) => setTestForm({...testForm, essay: e.target.value})}
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Language</Label>
                    <Select value={testForm.language} onValueChange={(v) => setTestForm({...testForm, language: v})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="English">English</SelectItem>
                        <SelectItem value="Filipino">Filipino</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button onClick={handleTestGenerate} disabled={testLoading} className="w-full">
                    {testLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ClipboardList className="w-4 h-4 mr-2" />}
                    Generate Test & TOS
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <Card className="max-w-2xl mx-auto">
                <CardHeader>
                  <CardTitle>Periodical Test Ready</CardTitle>
                  <CardDescription>Your test and TOS have been generated</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button onClick={() => downloadFile(testData.docxUrl, "PeriodicalTest.docx")} className="w-full">
                    <Download className="w-4 h-4 mr-2" />
                    Download Test & TOS
                  </Button>
                  <Button variant="outline" onClick={() => setTestData(null)} className="w-full">
                    Generate Another
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default WeeLMatGeneratorPremium;

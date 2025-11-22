import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { FileText, Loader2, Download, ArrowLeft, Home } from "lucide-react";

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

const WeeLMatGeneratorWeeLMat = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    document.title = "WeeLMat Generator - Premium";
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute("content", "Generate Weekly Learning Matrices with AI");
    }
    handleGenerate();
  }, []);

  const handleGenerate = async () => {
    const formValues = JSON.parse(sessionStorage.getItem("weelmatFormValues") || "{}") as FormValues;
    
    if (!formValues.subject || !formValues.gradeLevel) {
      toast.error("Please fill in the form first");
      navigate("/dashboard");
      return;
    }

    setLoading(true);
    setProgress(0);

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
        setProgress(progressSteps[currentStep].progress);
        currentStep++;
      }
    }, 3000);

    try {
      const { data: result, error } = await supabase.functions.invoke("generate-weelmat", {
        body: formValues,
      });

      clearInterval(progressInterval);

      if (error) throw error;
      if (!result?.matrixId || !result?.docxUrl) throw new Error("Invalid response");

      setProgress(100);
      setData(result);
      toast.success("WeeLMat generated successfully!");
    } catch (error: any) {
      clearInterval(progressInterval);
      toast.error(error.message || "Failed to generate WeeLMat");
      setLoading(false);
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/5">
      <div className="container mx-auto py-8 px-4">
        <div className="mb-6">
          <Button variant="ghost" onClick={() => navigate("/weelmatgeneratorpremium")} className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back to Premium
          </Button>
        </div>

        <div className="mb-8 text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <FileText className="w-8 h-8 text-primary" />
            <h1 className="text-4xl font-bold">WeeLMat Generator</h1>
          </div>
          <p className="text-muted-foreground">Generate comprehensive weekly learning matrices</p>
        </div>

        {loading && !data ? (
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
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">{progress}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : data ? (
          <Card className="max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                WeeLMat Ready
              </CardTitle>
              <CardDescription>Your weekly learning matrix has been generated successfully</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <Button onClick={() => downloadFile(data.docxUrl, "WeeLMat.docx")} className="flex-1">
                  <Download className="w-4 h-4 mr-2" />
                  Download DOCX
                </Button>
                <Button variant="outline" onClick={() => navigate("/dashboard")}>
                  <Home className="w-4 h-4 mr-2" />
                  Back to Dashboard
                </Button>
              </div>
              <Button 
                variant="secondary" 
                onClick={() => navigate("/weelmatgeneratorpremium")}
                className="w-full"
              >
                Generate Another Document
              </Button>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  );
};

export default WeeLMatGeneratorWeeLMat;

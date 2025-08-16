import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download } from "lucide-react";

interface MatrixRow {
  id: string;
  subject: string;
  grade_level: string;
  section: string;
  date_from: string;
  date_to: string;
  created_at: string;
  docx_url: string | null;
  pdf_url: string | null;
  ai_json: any;
}

interface WeeLMatPreviewProps {
  matrix: MatrixRow;
  children: React.ReactNode;
}

const WeeLMatPreview = ({ matrix, children }: WeeLMatPreviewProps) => {
  const [open, setOpen] = useState(false);

  const downloadFile = async (url: string, filename: string) => {
    const res = await fetch(url);
    const blob = await res.blob();
    const objUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = objUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(objUrl);
  };

  const buildFilename = (ext: string) => {
    const safe = (s?: string) => (s || "").replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "").toLowerCase();
    return `weelmat-${safe(matrix.subject)}-${safe(matrix.grade_level)}-${safe(matrix.section)}-${matrix.date_from}-${matrix.date_to}.${ext}`;
  };

  const calculateWeekdayDates = () => {
    const start = new Date(matrix.date_from);
    const end = new Date(matrix.date_to);
    const dates = [];
    const current = new Date(start);

    while (current <= end && dates.length < 5) {
      const dayOfWeek = current.getDay();
      if (dayOfWeek >= 1 && dayOfWeek <= 5) {
        dates.push(new Date(current));
      }
      current.setDate(current.getDate() + 1);
    }

    return dates.map(date => 
      date.toLocaleDateString('en-US', { 
        weekday: 'long', 
        month: 'short', 
        day: 'numeric' 
      })
    );
  };

  const weekdayDates = calculateWeekdayDates();
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            {matrix.subject} {matrix.grade_level} - {matrix.section}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Coverage: {matrix.date_from} to {matrix.date_to} • Created {new Date(matrix.created_at).toLocaleDateString()}
          </p>
        </DialogHeader>
        
        <div className="mt-6">
          {matrix.ai_json ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-32">Day</TableHead>
                    <TableHead>Competency</TableHead>
                    <TableHead>Learning Activities</TableHead>
                    <TableHead>Assessment</TableHead>
                    <TableHead>References</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {days.map((day, index) => {
                    const dayData = matrix.ai_json[day.toLowerCase()];
                    const dateStr = weekdayDates[index] || day;
                    
                    return (
                      <TableRow key={day}>
                        <TableCell className="font-medium">
                          <div className="text-sm">
                            <div className="font-semibold">{day}</div>
                            <div className="text-muted-foreground text-xs">{dateStr}</div>
                          </div>
                        </TableCell>
                        <TableCell className="max-w-48">
                          <div className="text-sm whitespace-pre-wrap">
                            {dayData?.competency || 'Loading...'}
                          </div>
                        </TableCell>
                        <TableCell className="max-w-64">
                          <div className="text-sm">
                            {Array.isArray(dayData?.activities) ? (
                              <ul className="list-disc list-inside space-y-1">
                                {dayData.activities.map((activity: string, i: number) => (
                                  <li key={i} className="text-xs">{activity}</li>
                                ))}
                              </ul>
                            ) : (
                              <span className="text-xs">{dayData?.activities || 'Loading...'}</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="max-w-48">
                          <div className="text-sm">
                            {Array.isArray(dayData?.assessment) ? (
                              <ul className="list-disc list-inside space-y-1">
                                {dayData.assessment.map((item: string, i: number) => (
                                  <li key={i} className="text-xs">{item}</li>
                                ))}
                              </ul>
                            ) : (
                              <span className="text-xs">{dayData?.assessment || 'Loading...'}</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="max-w-48">
                          <div className="text-sm">
                            {Array.isArray(dayData?.references) ? (
                              <ul className="list-disc list-inside space-y-1">
                                {dayData.references.map((ref: string, i: number) => (
                                  <li key={i} className="text-xs">{ref}</li>
                                ))}
                              </ul>
                            ) : (
                              <span className="text-xs">{dayData?.references || 'Loading...'}</span>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No preview data available
            </div>
          )}
        </div>

        <div className="flex justify-center mt-6 border-t pt-4">
          <Button 
            disabled={!matrix.docx_url} 
            onClick={() => matrix.docx_url && downloadFile(matrix.docx_url, buildFilename("docx"))}
            className="flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Download DOCX
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default WeeLMatPreview;
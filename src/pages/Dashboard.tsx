import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/components/ui/sonner";

const schema = z.object({
  subject: z.string().min(1, "Subject is required"),
  gradeLevel: z.string().min(1, "Grade is required"),
  section: z.string().min(1, "Section is required"),
  dateFrom: z.string().min(1, "From date is required"),
  dateTo: z.string().min(1, "To date is required"),
  mondayCompetency: z.string().min(1, "Monday competency is required").transform(s => s.trim()),
  tuesdayCompetency: z.string().min(1, "Tuesday competency is required").transform(s => s.trim()),
  wednesdayCompetency: z.string().min(1, "Wednesday competency is required").transform(s => s.trim()),
  thursdayCompetency: z.string().min(1, "Thursday competency is required").transform(s => s.trim()),
  fridayCompetency: z.string().min(1, "Friday competency is required").transform(s => s.trim()),
  code: z.string().optional().or(z.literal("")),
  customInstructions: z.string().optional().or(z.literal("")),
  language: z.enum(["English","Filipino"]).default("English"),
}).refine((data) => new Date(data.dateFrom) <= new Date(data.dateTo), {
  message: "From date must be before or equal to To date",
  path: ["dateFrom"],
});

type FormValues = z.infer<typeof schema>;

const grades = ["Kinder","Grade 1","Grade 2","Grade 3","Grade 4","Grade 5","Grade 6","Grade 7","Grade 8","Grade 9","Grade 10"];
const subjectSuggestions = ["Filipino","English","Math","Science","AP","EsP","MAPEH","EPP/TLE"];

const Step = ({active, text}:{active:boolean;text:string}) => (
  <div className={`flex items-center gap-2 ${active?"text-primary":"text-muted-foreground"}`}>
    <div className={`h-2 w-2 rounded-full ${active?"bg-primary":"bg-border"}`}/>
    <span className="text-sm">{text}</span>
  </div>
)

const Dashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const steps = useMemo(() => [
    "Planning daily competencies…",
    "Selecting trusted references…",
    "Drafting learning activities…",
    "Finalizing DOCX & PDF…",
  ], []);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session?.user) navigate("/auth");
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user) navigate("/auth");
    });
    return () => subscription.unsubscribe();
  }, [navigate]);

const { register, handleSubmit, formState: { errors }, setValue, watch, reset } = useForm<FormValues>({
  resolver: zodResolver(schema),
  defaultValues: {
    gradeLevel: "",
    language: "English",
  }
});

  const onSubmit = async (values: FormValues) => {
    setLoading(true);
    navigate("/weelmatgenerator", { state: values });
  }

  const [result, setResult] = useState<{subject:string;grade:string;section:string;dates:string;docx?:string;pdf?:string}|null>(null);

  return (
    <main className="min-h-[calc(100vh-160px)] py-12 bg-background">
      <section className="container grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <div className="rounded-2xl border bg-card p-6 shadow-sm">
            <h1 className="text-2xl font-semibold mb-4">Create a Weekly Learning Matrix</h1>
            <form className="grid gap-5" onSubmit={handleSubmit(onSubmit)}>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <Label>Subject Area</Label>
                  <Input placeholder={`e.g., ${subjectSuggestions.join(', ')}`} {...register("subject")} />
                  {errors.subject && <p className="text-destructive text-sm mt-1">{errors.subject.message}</p>}
                </div>
                <div>
                  <Label>Grade Level</Label>
                  <Select onValueChange={(v)=>setValue("gradeLevel", v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select grade" />
                    </SelectTrigger>
                    <SelectContent>
                      {grades.map((g)=> (<SelectItem key={g} value={g}>{g}</SelectItem>))}
                    </SelectContent>
                  </Select>
                  {errors.gradeLevel && <p className="text-destructive text-sm mt-1">{errors.gradeLevel.message}</p>}
                </div>
              </div>

              <div>
                <Label>Language Used</Label>
                <Select onValueChange={(v)=>setValue("language", v as any)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select language" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="English">English</SelectItem>
                    <SelectItem value="Filipino">Filipino</SelectItem>
                  </SelectContent>
                </Select>
                {errors.language && <p className="text-destructive text-sm mt-1">{errors.language.message}</p>}
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <Label>Section</Label>
                  <Input {...register("section")} />
                  {errors.section && <p className="text-destructive text-sm mt-1">{errors.section.message}</p>}
                </div>
                <div>
                  <Label>From</Label>
                  <Input type="date" {...register("dateFrom")} />
                  {errors.dateFrom && <p className="text-destructive text-sm mt-1">{errors.dateFrom.message}</p>}
                </div>
                <div>
                  <Label>To</Label>
                  <Input type="date" {...register("dateTo")} />
                  {errors.dateTo && <p className="text-destructive text-sm mt-1">{errors.dateTo.message}</p>}
                </div>
              </div>

              <div>
                <Label className="text-base font-medium">Daily Competencies</Label>
                <p className="text-sm text-muted-foreground mb-4">Enter the exact competency for each day. These will appear exactly as typed in your WeeLMat.</p>
                <div className="grid gap-4">
                  <div>
                    <Label htmlFor="mondayCompetency">Monday Competency</Label>
                    <Textarea rows={2} placeholder="Enter Monday's competency exactly as you want it to appear" {...register("mondayCompetency")} />
                    {errors.mondayCompetency && <p className="text-destructive text-sm mt-1">{errors.mondayCompetency.message}</p>}
                  </div>
                  <div>
                    <Label htmlFor="tuesdayCompetency">Tuesday Competency</Label>
                    <Textarea rows={2} placeholder="Enter Tuesday's competency exactly as you want it to appear" {...register("tuesdayCompetency")} />
                    {errors.tuesdayCompetency && <p className="text-destructive text-sm mt-1">{errors.tuesdayCompetency.message}</p>}
                  </div>
                  <div>
                    <Label htmlFor="wednesdayCompetency">Wednesday Competency</Label>
                    <Textarea rows={2} placeholder="Enter Wednesday's competency exactly as you want it to appear" {...register("wednesdayCompetency")} />
                    {errors.wednesdayCompetency && <p className="text-destructive text-sm mt-1">{errors.wednesdayCompetency.message}</p>}
                  </div>
                  <div>
                    <Label htmlFor="thursdayCompetency">Thursday Competency</Label>
                    <Textarea rows={2} placeholder="Enter Thursday's competency exactly as you want it to appear" {...register("thursdayCompetency")} />
                    {errors.thursdayCompetency && <p className="text-destructive text-sm mt-1">{errors.thursdayCompetency.message}</p>}
                  </div>
                  <div>
                    <Label htmlFor="fridayCompetency">Friday Competency</Label>
                    <Textarea rows={2} placeholder="Enter Friday's competency exactly as you want it to appear" {...register("fridayCompetency")} />
                    {errors.fridayCompetency && <p className="text-destructive text-sm mt-1">{errors.fridayCompetency.message}</p>}
                  </div>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label>Code (optional)</Label>
                  <Input placeholder="e.g., EN6V-Ia-1" {...register("code")} />
                </div>
                <div>
                  <Label>Custom Instructions (optional)</Label>
                  <Textarea rows={4} placeholder="Additional context, language preferences, differentiation needs, specific constraints or requirements…" {...register("customInstructions")} />
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Button type="submit" disabled={loading}>{loading?"Generating…":"Generate WeeLMat (DOCX)"}</Button>
                <Button type="button" variant="outline" onClick={() => reset()} disabled={loading}>Reset</Button>
              </div>
            </form>
          </div>
        </div>
        <aside className="space-y-6">
          <div className="rounded-2xl border bg-card p-6 shadow-sm">
            <p className="font-semibold mb-3">Status</p>
            <div className="space-y-2">
              {steps.map((s, i)=> (<Step key={s} active={i<=stepIndex && loading} text={s} />))}
            </div>
          </div>

          {result && (
            <div className="rounded-2xl border bg-card p-6 shadow-sm">
              <p className="font-semibold mb-2">Success</p>
              <p className="text-sm text-muted-foreground mb-4">Saved to My Files</p>
              <div className="text-sm mb-4">
                <p><span className="text-muted-foreground">Subject:</span> {result.subject}</p>
                <p><span className="text-muted-foreground">Grade/Section:</span> {result.grade} • {result.section}</p>
                <p><span className="text-muted-foreground">Dates:</span> {result.dates}</p>
              </div>
              <div className="flex gap-3">
                <Button variant="secondary" asChild disabled={!result.docx}>
                  <a href={result.docx} target="_blank" rel="noreferrer">Download DOCX</a>
                </Button>
                <Button variant="outline" asChild disabled={!result.pdf}>
                  <a href={result.pdf} target="_blank" rel="noreferrer">Download PDF</a>
                </Button>
              </div>
              <Button className="mt-4" variant="ghost" onClick={()=>{ setResult(null); reset(); }}>Create another</Button>
            </div>
          )}
        </aside>
      </section>
      
      <section className="mt-12 p-6 bg-muted/30 rounded-lg border">
        <h3 className="text-lg font-semibold mb-4 text-foreground">Important Disclaimer</h3>
        <div className="space-y-3 text-sm text-muted-foreground">
          <p>
            <strong>1.</strong> This website is not officially endorsed by DepEd NIR Region. This website is to address and help the rising concerns of teachers in the creation of WeeLMat Matrix, thus giving a load of burden for teachers. If you use this site, this is at your own cost.
          </p>
          <p>
            <strong>2.</strong> Tokens are very expensive for multiple users using the site. That's why it took longer time to make alternative ways to make it FREE of use for everyone.
          </p>
          <p>
            <strong>3.</strong> AI outputs and links are suggestions. Please review, edit, and ensure alignment with your curriculum, division policies, and class context before use.
          </p>
          <p>
            <strong>4.</strong> The site (domain, hosting, and launch) and the AI token credits were paid out-of-pocket by the creator so the tool is usable by everyone. The sole intention is to help teachers reduce workload.
          </p>
          <p>
            <strong>5.</strong> The creator/developer of this site plans to be anonymous. This is not to make him known to everyone, only to help teachers.
          </p>
        </div>
      </section>
    </main>
  );
};

export default Dashboard;
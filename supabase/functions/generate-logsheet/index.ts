import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface LogSheetRequest {
  subject: string;
  gradeLevel: string;
  section: string;
  dateFrom: string;
  dateTo: string;
  mondayCompetency: string;
  tuesdayCompetency: string;
  wednesdayCompetency: string;
  thursdayCompetency: string;
  fridayCompetency: string;
  language?: string;
}

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    const requestData: LogSheetRequest = await req.json();

    console.log('Generate LogSheet request:', requestData);

    // Validate required fields
    const requiredFields = ['subject', 'gradeLevel', 'section', 'mondayCompetency', 'tuesdayCompetency', 'wednesdayCompetency', 'thursdayCompetency', 'fridayCompetency'];
    for (const field of requiredFields) {
      if (!requestData[field as keyof LogSheetRequest]) {
        return new Response(
          JSON.stringify({ error: `Missing required field: ${field}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Calculate weekday dates
    const calculateWeekdayDates = (dateFrom: string, dateTo: string) => {
      try {
        const startDate = new Date(dateFrom);
        const endDate = new Date(dateTo);
        
        // Find the Monday of the week containing startDate
        const monday = new Date(startDate);
        const dayOfWeek = monday.getDay();
        const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
        monday.setDate(monday.getDate() + daysToMonday);
        
        const weekdays = [];
        for (let i = 0; i < 5; i++) {
          const currentDay = new Date(monday);
          currentDay.setDate(monday.getDate() + i);
          
          if (currentDay >= startDate && currentDay <= endDate) {
            const options: Intl.DateTimeFormatOptions = { 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            };
            weekdays.push(currentDay.toLocaleDateString('en-US', options));
          } else {
            weekdays.push('');
          }
        }
        return weekdays;
      } catch (error) {
        console.error('Error calculating dates:', error);
        return ['', '', '', '', ''];
      }
    };

    const weekdayDates = calculateWeekdayDates(requestData.dateFrom, requestData.dateTo);

    // Load template file from public folder
    const templateUrl = `${supabaseUrl}/storage/v1/object/public/weelmat/WEELMAT%20NEW%20TEMPLATE%20LOGSHEET.docx`;
    console.log('Fetching template from:', templateUrl);
    
    const templateResponse = await fetch(templateUrl);
    if (!templateResponse.ok) {
      throw new Error(`Failed to fetch template: ${templateResponse.status} ${templateResponse.statusText}`);
    }
    
    const templateBuffer = await templateResponse.arrayBuffer();
    console.log('Template loaded, size:', templateBuffer.byteLength);

    // Load docx manipulation libraries
    const { default: PizZip } = await import('https://esm.sh/pizzip@3.1.6');
    const { default: Docxtemplater } = await import('https://esm.sh/docxtemplater@3.47.2');

    try {
      // Load template using PizZip and Docxtemplater
      const zip = new PizZip(templateBuffer);
      const doc = new Docxtemplater(zip, {
        paragraphLoop: true,
        linebreaks: true,
      });

      // Set data for template variables
      doc.setData({
        subject: requestData.subject.toUpperCase(),
        gradeLevel: requestData.gradeLevel,
        section: requestData.section,
        mondayCompetency: requestData.mondayCompetency || '',
        tuesdayCompetency: requestData.tuesdayCompetency || '',
        wednesdayCompetency: requestData.wednesdayCompetency || '',
        thursdayCompetency: requestData.thursdayCompetency || '',
        fridayCompetency: requestData.fridayCompetency || '',
        mondayDate: weekdayDates[0] || '',
        tuesdayDate: weekdayDates[1] || '',
        wednesdayDate: weekdayDates[2] || '',
        thursdayDate: weekdayDates[3] || '',
        fridayDate: weekdayDates[4] || '',
      });

      // Render the document
      doc.render();

      // Generate the modified document
      const docxBuffer = doc.getZip().generate({ 
        type: "uint8array",
        mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      });

      // Generate filename
      const now = new Date();
      const dateStr = now.getFullYear().toString() + 
                     (now.getMonth() + 1).toString().padStart(2, '0') + 
                     now.getDate().toString().padStart(2, '0');
      
      const safe = (s: string) => s.replace(/[^a-z0-9]+/gi, "_").replace(/^_+|_+$/g, "").toUpperCase();
      const filename = `COMPETENCY_CHECKLIST_${safe(requestData.subject)}_${safe(requestData.gradeLevel)}_${safe(requestData.section)}_${dateStr}.docx`;

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('weelmat')
        .upload(`logsheets/${filename}`, docxBuffer, {
          contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          upsert: true
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw new Error(`Failed to upload file: ${uploadError.message}`);
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('weelmat')
        .getPublicUrl(`logsheets/${filename}`);

      console.log('LogSheet generated successfully:', urlData.publicUrl);

      return new Response(
        JSON.stringify({
          success: true,
          docx_url: urlData.publicUrl,
          filename: filename
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );

    } catch (docError) {
      console.error('Document processing error:', docError);
      throw new Error(`Failed to process template: ${docError.message}`);
    }

  } catch (error) {
    console.error('Error in generate-logsheet function:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to generate LogSheet' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
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
const deepseekApiKey = Deno.env.get('DEEPSEEK_API_KEY');

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

    // Enhance competencies with DeepSeek API if available
    const enhanceCompetencies = async (competencies: string[], language: string = 'English') => {
      if (!deepseekApiKey) {
        console.log('DeepSeek API key not available, using original competencies');
        return competencies;
      }

      try {
        const prompt = `Please enhance and format the following competencies for a ${language} educational log sheet. Keep the meaning intact but make them more professionally formatted and clear:

${competencies.map((comp, i) => `${i + 1}. ${comp}`).join('\n')}

Return only the enhanced competencies, one per line, without numbers or extra formatting.`;

        const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${deepseekApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'deepseek-chat',
            messages: [
              { role: 'system', content: 'You are an educational content formatter. Enhance competencies while preserving their original meaning.' },
              { role: 'user', content: prompt }
            ],
            max_completion_tokens: 1000,
            temperature: 0.3,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          const enhancedText = data.choices[0]?.message?.content?.trim();
          if (enhancedText) {
            const enhanced = enhancedText.split('\n').filter(line => line.trim()).map(line => line.trim());
            console.log('Competencies enhanced with DeepSeek');
            return enhanced.length === 5 ? enhanced : competencies;
          }
        }
      } catch (error) {
        console.log('DeepSeek enhancement failed, using original:', error.message);
      }
      
      return competencies;
    };

    const originalCompetencies = [
      requestData.mondayCompetency,
      requestData.tuesdayCompetency,
      requestData.wednesdayCompetency,
      requestData.thursdayCompetency,
      requestData.fridayCompetency
    ];

    const enhancedCompetencies = await enhanceCompetencies(originalCompetencies, requestData.language);
    const weekdayDates = calculateWeekdayDates(requestData.dateFrom, requestData.dateTo);

    // Try multiple template sources - first try to get from GitHub, fallback to storage
    let templateBuffer: ArrayBuffer | null = null;
    
    // Method 1: Try GitHub raw URL first
    try {
      const githubUrl = 'https://raw.githubusercontent.com/John09lim/wee-mat-crafter/main/public/WEELMAT%20NEW%20TEMPLATE%20LOGSHEET.docx';
      console.log('Trying GitHub template from:', githubUrl);
      
      const githubResponse = await fetch(githubUrl);
      if (githubResponse.ok) {
        templateBuffer = await githubResponse.arrayBuffer();
        console.log('Template loaded from GitHub, size:', templateBuffer.byteLength);
      }
    } catch (error) {
      console.log('GitHub fetch failed:', error.message);
    }

    // Method 2: Try Supabase storage if GitHub failed
    if (!templateBuffer) {
      try {
        const encodedFilename = encodeURIComponent('WEELMAT NEW TEMPLATE LOGSHEET.docx');
        const storageUrl = `${supabaseUrl}/storage/v1/object/public/weelmat/${encodedFilename}`;
        console.log('Trying Supabase storage from:', storageUrl);
        
        const storageResponse = await fetch(storageUrl);
        if (storageResponse.ok) {
          templateBuffer = await storageResponse.arrayBuffer();
          console.log('Template loaded from storage, size:', templateBuffer.byteLength);
        } else {
          console.log('Storage response not ok:', storageResponse.status, storageResponse.statusText);
        }
      } catch (error) {
        console.log('Storage fetch failed:', error.message);
      }
    }

    // Method 3: Create basic template if both failed
    if (!templateBuffer) {
      console.log('Both template sources failed, will create basic template structure');
      throw new Error('Template file not found. Please ensure the DOCX template is available.');
    }

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

      // Set data for template variables (Column 1: Competencies, Column 2: Dates)
      doc.setData({
        subject: requestData.subject.toUpperCase(),
        gradeLevel: requestData.gradeLevel,
        section: requestData.section,
        // Column 1 - Enhanced Competencies
        mondayCompetency: enhancedCompetencies[0] || '',
        tuesdayCompetency: enhancedCompetencies[1] || '',
        wednesdayCompetency: enhancedCompetencies[2] || '',
        thursdayCompetency: enhancedCompetencies[3] || '',
        fridayCompetency: enhancedCompetencies[4] || '',
        // Column 2 - Calculated Dates
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
          status: 200,
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
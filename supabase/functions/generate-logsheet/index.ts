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

    // Generate DOCX content using doctemplates
    const { default: PizZip } = await import('https://esm.sh/pizzip@3.1.6');
    const { default: Docxtemplater } = await import('https://esm.sh/docxtemplater@3.47.2');

    // Create a basic DOCX structure
    const docxTemplate = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<pkg:package xmlns:pkg="http://schemas.microsoft.com/office/2006/xmlPackage">
  <pkg:part pkg:name="/_rels/.rels" pkg:contentType="application/vnd.openxmlformats-package.relationships+xml">
    <pkg:xmlData>
      <Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
        <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
      </Relationships>
    </pkg:xmlData>
  </pkg:part>
  <pkg:part pkg:name="/word/_rels/document.xml.rels" pkg:contentType="application/vnd.openxmlformats-package.relationships+xml">
    <pkg:xmlData>
      <Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
        <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
      </Relationships>
    </pkg:xmlData>
  </pkg:part>
  <pkg:part pkg:name="/[Content_Types].xml" pkg:contentType="application/vnd.openxmlformats-package.content-types+xml">
    <pkg:xmlData>
      <Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
        <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
        <Default Extension="xml" ContentType="application/xml"/>
        <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
        <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
      </Types>
    </pkg:xmlData>
  </pkg:part>
  <pkg:part pkg:name="/word/styles.xml" pkg:contentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml">
    <pkg:xmlData>
      <w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
        <w:docDefaults>
          <w:rPrDefault>
            <w:rPr>
              <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/>
              <w:sz w:val="22"/>
            </w:rPr>
          </w:rPrDefault>
        </w:docDefaults>
      </w:styles>
    </pkg:xmlData>
  </pkg:part>
  <pkg:part pkg:name="/word/document.xml" pkg:contentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml">
    <pkg:xmlData>
      <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
        <w:body>
          <w:sectPr>
            <w:pgSz w:w="15840" w:h="12240" w:orient="landscape"/>
            <w:pgMar w:top="720" w:right="720" w:bottom="720" w:left="720"/>
          </w:sectPr>
          
          <!-- Header Section -->
          <w:p>
            <w:pPr><w:jc w:val="center"/></w:pPr>
            <w:r><w:t>Republic of the Philippines</w:t></w:r>
          </w:p>
          <w:p>
            <w:pPr><w:jc w:val="center"/></w:pPr>
            <w:r><w:t>Department of Education</w:t></w:r>
          </w:p>
          <w:p>
            <w:pPr><w:jc w:val="center"/></w:pPr>
            <w:r><w:t>NAME OF REGION</w:t></w:r>
          </w:p>
          <w:p>
            <w:pPr><w:jc w:val="center"/></w:pPr>
            <w:r><w:t>SCHOOLS DIVISION OF _____________</w:t></w:r>
          </w:p>
          <w:p>
            <w:pPr><w:jc w:val="center"/></w:pPr>
            <w:r><w:t>NAME OF SCHOOL</w:t></w:r>
          </w:p>
          <w:p>
            <w:pPr><w:jc w:val="center"/></w:pPr>
            <w:r><w:t>SCHOOL ADDRESS</w:t></w:r>
          </w:p>
          
          <!-- Horizontal Line -->
          <w:p>
            <w:pPr>
              <w:pBdr>
                <w:bottom w:val="single" w:sz="6" w:space="1" w:color="auto"/>
              </w:pBdr>
            </w:pPr>
          </w:p>
          
          <!-- Title Block -->
          <w:p>
            <w:pPr><w:jc w:val="center"/></w:pPr>
            <w:r><w:rPr><w:b/></w:rPr><w:t>COMPETENCY CHECKLIST IN ${requestData.subject.toUpperCase()}</w:t></w:r>
          </w:p>
          <w:p>
            <w:pPr><w:jc w:val="center"/></w:pPr>
            <w:r><w:rPr><w:b/></w:rPr><w:t>GRADE ${requestData.gradeLevel}</w:t></w:r>
          </w:p>
          <w:p>
            <w:pPr><w:jc w:val="center"/></w:pPr>
            <w:r><w:rPr><w:b/></w:rPr><w:t>SECTION: ${requestData.section}</w:t></w:r>
          </w:p>
          
          <!-- Table with 7 rows x 6 columns -->
          <w:tbl>
            <w:tblPr>
              <w:tblBorders>
                <w:top w:val="single" w:sz="4" w:space="0" w:color="auto"/>
                <w:left w:val="single" w:sz="4" w:space="0" w:color="auto"/>
                <w:bottom w:val="single" w:sz="4" w:space="0" w:color="auto"/>
                <w:right w:val="single" w:sz="4" w:space="0" w:color="auto"/>
                <w:insideH w:val="single" w:sz="4" w:space="0" w:color="auto"/>
                <w:insideV w:val="single" w:sz="4" w:space="0" w:color="auto"/>
              </w:tblBorders>
              <w:tblGrid>
                <w:gridCol/>
                <w:gridCol/>
                <w:gridCol/>
                <w:gridCol/>
                <w:gridCol/>
                <w:gridCol/>
              </w:tblGrid>
            </w:tblPr>
            
            <!-- Header Row 1 with merged cells -->
            <w:tr>
              <w:tc>
                <w:tcPr><w:vAlign w:val="top"/></w:tcPr>
                <w:p>
                  <w:pPr><w:jc w:val="center"/></w:pPr>
                  <w:r><w:rPr><w:b/></w:rPr><w:t>LIST OF COMPETENCIES</w:t></w:r>
                </w:p>
              </w:tc>
              <w:tc>
                <w:tcPr><w:vAlign w:val="top"/></w:tcPr>
                <w:p>
                  <w:pPr><w:jc w:val="center"/></w:pPr>
                  <w:r><w:rPr><w:b/></w:rPr><w:t>DURATION</w:t></w:r>
                </w:p>
              </w:tc>
              <w:tc>
                <w:tcPr>
                  <w:gridSpan w:val="2"/>
                  <w:vAlign w:val="top"/>
                </w:tcPr>
                <w:p>
                  <w:pPr><w:jc w:val="center"/></w:pPr>
                  <w:r><w:rPr><w:b/></w:rPr><w:t>LEARNERS PERFORMANCE</w:t></w:r>
                </w:p>
              </w:tc>
              <w:tc>
                <w:tcPr>
                  <w:gridSpan w:val="2"/>
                  <w:vAlign w:val="top"/>
                </w:tcPr>
                <w:p>
                  <w:pPr><w:jc w:val="center"/></w:pPr>
                  <w:r><w:rPr><w:b/></w:rPr><w:t>REMARKS</w:t></w:r>
                </w:p>
              </w:tc>
            </w:tr>
            
            <!-- Header Row 2 with sub-headers -->
            <w:tr>
              <w:tc>
                <w:tcPr><w:vAlign w:val="top"/></w:tcPr>
                <w:p><w:r><w:t></w:t></w:r></w:p>
              </w:tc>
              <w:tc>
                <w:tcPr><w:vAlign w:val="top"/></w:tcPr>
                <w:p><w:r><w:t></w:t></w:r></w:p>
              </w:tc>
              <w:tc>
                <w:tcPr><w:vAlign w:val="top"/></w:tcPr>
                <w:p>
                  <w:pPr><w:jc w:val="center"/></w:pPr>
                  <w:r><w:rPr><w:b/></w:rPr><w:t>Mastered the competencies</w:t></w:r>
                </w:p>
              </w:tc>
              <w:tc>
                <w:tcPr><w:vAlign w:val="top"/></w:tcPr>
                <w:p>
                  <w:pPr><w:jc w:val="center"/></w:pPr>
                  <w:r><w:rPr><w:b/></w:rPr><w:t>Not mastered the competencies</w:t></w:r>
                </w:p>
              </w:tc>
              <w:tc>
                <w:tcPr><w:vAlign w:val="top"/></w:tcPr>
                <w:p>
                  <w:pPr><w:jc w:val="center"/></w:pPr>
                  <w:r><w:rPr><w:b/></w:rPr><w:t>Teacher's (NOTE for not achieving the competency or intervention to address the least mastered competency)</w:t></w:r>
                </w:p>
              </w:tc>
              <w:tc>
                <w:tcPr><w:vAlign w:val="top"/></w:tcPr>
                <w:p>
                  <w:pPr><w:jc w:val="center"/></w:pPr>
                  <w:r><w:rPr><w:b/></w:rPr><w:t>School Heads and Other Instructional Supervisors (Feedback or agreement during their observation visits)</w:t></w:r>
                </w:p>
              </w:tc>
            </w:tr>
            
            <!-- Monday (Row 3) -->
            <w:tr>
              <w:tc>
                <w:tcPr><w:vAlign w:val="top"/></w:tcPr>
                <w:p><w:r><w:t>${requestData.mondayCompetency}</w:t></w:r></w:p>
              </w:tc>
              <w:tc>
                <w:tcPr><w:vAlign w:val="top"/></w:tcPr>
                <w:p><w:r><w:t>${weekdayDates[0]}</w:t></w:r></w:p>
              </w:tc>
              <w:tc>
                <w:tcPr><w:vAlign w:val="top"/></w:tcPr>
                <w:p><w:r><w:t xml:space="preserve">____out of ___ learners have mastered the competencies</w:t></w:r></w:p>
                <w:p><w:r><w:t></w:t></w:r></w:p>
                <w:p><w:r><w:t xml:space="preserve">___Present</w:t></w:r></w:p>
                <w:p><w:r><w:t xml:space="preserve">___Absent</w:t></w:r></w:p>
              </w:tc>
              <w:tc>
                <w:tcPr><w:vAlign w:val="top"/></w:tcPr>
                <w:p><w:r><w:t xml:space="preserve">____out of ___ learners have not mastered the competencies</w:t></w:r></w:p>
              </w:tc>
              <w:tc>
                <w:tcPr><w:vAlign w:val="top"/></w:tcPr>
                <w:p><w:r><w:t xml:space="preserve">_____Continue with the new lesson </w:t></w:r></w:p>
                <w:p><w:r><w:t xml:space="preserve">  _____Give remedial instruction to learners who have not master the lesson </w:t></w:r></w:p>
                <w:p><w:r><w:t xml:space="preserve">   ______Reteach the lesson.</w:t></w:r></w:p>
              </w:tc>
              <w:tc>
                <w:tcPr><w:vAlign w:val="top"/></w:tcPr>
                <w:p><w:r><w:t></w:t></w:r></w:p>
                <w:p><w:r><w:t></w:t></w:r></w:p>
                <w:p><w:r><w:t></w:t></w:r></w:p>
              </w:tc>
            </w:tr>
            
            <!-- Tuesday (Row 4) -->
            <w:tr>
              <w:tc>
                <w:tcPr><w:vAlign w:val="top"/></w:tcPr>
                <w:p><w:r><w:t>${requestData.tuesdayCompetency}</w:t></w:r></w:p>
              </w:tc>
              <w:tc>
                <w:tcPr><w:vAlign w:val="top"/></w:tcPr>
                <w:p><w:r><w:t>${weekdayDates[1]}</w:t></w:r></w:p>
              </w:tc>
              <w:tc>
                <w:tcPr><w:vAlign w:val="top"/></w:tcPr>
                <w:p><w:r><w:t xml:space="preserve">____out of ___ learners have mastered the competencies</w:t></w:r></w:p>
                <w:p><w:r><w:t></w:t></w:r></w:p>
                <w:p><w:r><w:t xml:space="preserve">___Present</w:t></w:r></w:p>
                <w:p><w:r><w:t xml:space="preserve">___Absent</w:t></w:r></w:p>
              </w:tc>
              <w:tc>
                <w:tcPr><w:vAlign w:val="top"/></w:tcPr>
                <w:p><w:r><w:t xml:space="preserve">____out of ___ learners have not mastered the competencies</w:t></w:r></w:p>
              </w:tc>
              <w:tc>
                <w:tcPr><w:vAlign w:val="top"/></w:tcPr>
                <w:p><w:r><w:t xml:space="preserve">_____Continue with the new lesson </w:t></w:r></w:p>
                <w:p><w:r><w:t xml:space="preserve">  _____Give remedial instruction to learners who have not master the lesson </w:t></w:r></w:p>
                <w:p><w:r><w:t xml:space="preserve">   ______Reteach the lesson.</w:t></w:r></w:p>
              </w:tc>
              <w:tc>
                <w:tcPr><w:vAlign w:val="top"/></w:tcPr>
                <w:p><w:r><w:t></w:t></w:r></w:p>
                <w:p><w:r><w:t></w:t></w:r></w:p>
                <w:p><w:r><w:t></w:t></w:r></w:p>
              </w:tc>
            </w:tr>
            
            <!-- Wednesday (Row 5) -->
            <w:tr>
              <w:tc>
                <w:tcPr><w:vAlign w:val="top"/></w:tcPr>
                <w:p><w:r><w:t>${requestData.wednesdayCompetency}</w:t></w:r></w:p>
              </w:tc>
              <w:tc>
                <w:tcPr><w:vAlign w:val="top"/></w:tcPr>
                <w:p><w:r><w:t>${weekdayDates[2]}</w:t></w:r></w:p>
              </w:tc>
              <w:tc>
                <w:tcPr><w:vAlign w:val="top"/></w:tcPr>
                <w:p><w:r><w:t xml:space="preserve">____out of ___ learners have mastered the competencies</w:t></w:r></w:p>
                <w:p><w:r><w:t></w:t></w:r></w:p>
                <w:p><w:r><w:t xml:space="preserve">___Present</w:t></w:r></w:p>
                <w:p><w:r><w:t xml:space="preserve">___Absent</w:t></w:r></w:p>
              </w:tc>
              <w:tc>
                <w:tcPr><w:vAlign w:val="top"/></w:tcPr>
                <w:p><w:r><w:t xml:space="preserve">____out of ___ learners have not mastered the competencies</w:t></w:r></w:p>
              </w:tc>
              <w:tc>
                <w:tcPr><w:vAlign w:val="top"/></w:tcPr>
                <w:p><w:r><w:t xml:space="preserve">_____Continue with the new lesson </w:t></w:r></w:p>
                <w:p><w:r><w:t xml:space="preserve">  _____Give remedial instruction to learners who have not master the lesson </w:t></w:r></w:p>
                <w:p><w:r><w:t xml:space="preserve">   ______Reteach the lesson.</w:t></w:r></w:p>
              </w:tc>
              <w:tc>
                <w:tcPr><w:vAlign w:val="top"/></w:tcPr>
                <w:p><w:r><w:t></w:t></w:r></w:p>
                <w:p><w:r><w:t></w:t></w:r></w:p>
                <w:p><w:r><w:t></w:t></w:r></w:p>
              </w:tc>
            </w:tr>
            
            <!-- Thursday (Row 6) -->
            <w:tr>
              <w:tc>
                <w:tcPr><w:vAlign w:val="top"/></w:tcPr>
                <w:p><w:r><w:t>${requestData.thursdayCompetency}</w:t></w:r></w:p>
              </w:tc>
              <w:tc>
                <w:tcPr><w:vAlign w:val="top"/></w:tcPr>
                <w:p><w:r><w:t>${weekdayDates[3]}</w:t></w:r></w:p>
              </w:tc>
              <w:tc>
                <w:tcPr><w:vAlign w:val="top"/></w:tcPr>
                <w:p><w:r><w:t xml:space="preserve">____out of ___ learners have mastered the competencies</w:t></w:r></w:p>
                <w:p><w:r><w:t></w:t></w:r></w:p>
                <w:p><w:r><w:t xml:space="preserve">___Present</w:t></w:r></w:p>
                <w:p><w:r><w:t xml:space="preserve">___Absent</w:t></w:r></w:p>
              </w:tc>
              <w:tc>
                <w:tcPr><w:vAlign w:val="top"/></w:tcPr>
                <w:p><w:r><w:t xml:space="preserve">____out of ___ learners have not mastered the competencies</w:t></w:r></w:p>
              </w:tc>
              <w:tc>
                <w:tcPr><w:vAlign w:val="top"/></w:tcPr>
                <w:p><w:r><w:t xml:space="preserve">_____Continue with the new lesson </w:t></w:r></w:p>
                <w:p><w:r><w:t xml:space="preserve">  _____Give remedial instruction to learners who have not master the lesson </w:t></w:r></w:p>
                <w:p><w:r><w:t xml:space="preserve">   ______Reteach the lesson.</w:t></w:r></w:p>
              </w:tc>
              <w:tc>
                <w:tcPr><w:vAlign w:val="top"/></w:tcPr>
                <w:p><w:r><w:t></w:t></w:r></w:p>
                <w:p><w:r><w:t></w:t></w:r></w:p>
                <w:p><w:r><w:t></w:t></w:r></w:p>
              </w:tc>
            </w:tr>
            
            <!-- Friday (Row 7) -->
            <w:tr>
              <w:tc>
                <w:tcPr><w:vAlign w:val="top"/></w:tcPr>
                <w:p><w:r><w:t>${requestData.fridayCompetency}</w:t></w:r></w:p>
              </w:tc>
              <w:tc>
                <w:tcPr><w:vAlign w:val="top"/></w:tcPr>
                <w:p><w:r><w:t>${weekdayDates[4]}</w:t></w:r></w:p>
              </w:tc>
              <w:tc>
                <w:tcPr><w:vAlign w:val="top"/></w:tcPr>
                <w:p><w:r><w:t xml:space="preserve">____out of ___ learners have mastered the competencies</w:t></w:r></w:p>
                <w:p><w:r><w:t></w:t></w:r></w:p>
                <w:p><w:r><w:t xml:space="preserve">___Present</w:t></w:r></w:p>
                <w:p><w:r><w:t xml:space="preserve">___Absent</w:t></w:r></w:p>
              </w:tc>
              <w:tc>
                <w:tcPr><w:vAlign w:val="top"/></w:tcPr>
                <w:p><w:r><w:t xml:space="preserve">____out of ___ learners have not mastered the competencies</w:t></w:r></w:p>
              </w:tc>
              <w:tc>
                <w:tcPr><w:vAlign w:val="top"/></w:tcPr>
                <w:p><w:r><w:t xml:space="preserve">_____Continue with the new lesson </w:t></w:r></w:p>
                <w:p><w:r><w:t xml:space="preserve">  _____Give remedial instruction to learners who have not master the lesson </w:t></w:r></w:p>
                <w:p><w:r><w:t xml:space="preserve">   ______Reteach the lesson.</w:t></w:r></w:p>
              </w:tc>
              <w:tc>
                <w:tcPr><w:vAlign w:val="top"/></w:tcPr>
                <w:p><w:r><w:t></w:t></w:r></w:p>
                <w:p><w:r><w:t></w:t></w:r></w:p>
                <w:p><w:r><w:t></w:t></w:r></w:p>
              </w:tc>
            </w:tr>
          </w:tbl>
        </w:body>
      </w:document>
    </pkg:xmlData>
  </pkg:part>
</pkg:package>`;

    // Convert XML to binary DOCX format
    const encoder = new TextEncoder();
    const docxBuffer = encoder.encode(docxTemplate);

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
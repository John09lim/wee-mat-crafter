import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  AlignmentType,
  WidthType,
  BorderStyle,
  Header,
  ImageRun,
  PageOrientation,
} from "https://esm.sh/docx@8.5.0";
import { PDFDocument, StandardFonts, rgb } from "https://esm.sh/pdf-lib@1.17.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const DEEPSEEK_API_KEY = Deno.env.get("DEEPSEEK_API_KEY");
const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY");
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
const TAVILY_API_KEY = Deno.env.get("TAVILY_API_KEY");

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing Supabase environment variables");
}

console.log("Available API Keys:", {
  hasDeepSeek: !!DEEPSEEK_API_KEY,
  hasOpenRouter: !!OPENROUTER_API_KEY,
  hasOpenAI: !!OPENAI_API_KEY,
  hasTavily: !!TAVILY_API_KEY
});

const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

// ==================== SUBJECT-SPECIFIC CONTENT GENERATORS ====================

interface SubjectContent {
  motivation: string;
  learningActivity: string;
  examples: string[];
}

// Get grade level category for content adaptation
const getGradeCategory = (gradeLevel: string): 'primary' | 'intermediate' | 'junior' | 'senior' => {
  const grade = gradeLevel.toLowerCase();
  if (grade.includes('kinder') || grade.includes('grade 1') || grade.includes('grade 2') || grade.includes('grade 3')) {
    return 'primary';
  } else if (grade.includes('grade 4') || grade.includes('grade 5') || grade.includes('grade 6')) {
    return 'intermediate';
  } else if (grade.includes('grade 7') || grade.includes('grade 8') || grade.includes('grade 9') || grade.includes('grade 10')) {
    return 'junior';
  }
  return 'senior';
};

// Filipino Subject Content Generator
const getFilipinoContent = (competency: string, gradeCategory: string, language: string): SubjectContent => {
  const comp = competency.toLowerCase();
  
  if (comp.includes('pang-uri') || comp.includes('adjective')) {
    return {
      motivation: language === 'Filipino' 
        ? "Tumingin sa iyong paligid. Ano ang kulay ng dingding? Malaki ba o maliit ang iyong mesa? Ang mga salitang ito ay tinatawag na pang-uri!"
        : "Look around you. What color is the wall? Is your desk big or small? These words are called adjectives!",
      learningActivity: language === 'Filipino'
        ? "Basahin ang maikling kwento at bilugan ang mga pang-uri: 'Ang maliit na pusa ay tumakbo sa malaking bakuran. Nakita niya ang pulang bulaklak at berdeng damo.'"
        : "Read the short story and circle the adjectives: 'The small cat ran in the big yard. It saw the red flower and green grass.'",
      examples: language === 'Filipino'
        ? ["Maganda ang babae. (maganda = pang-uri)", "Malaki ang bahay namin. (malaki = pang-uri)", "Matanda ang lolo ko. (matanda = pang-uri)"]
        : ["The beautiful girl. (beautiful = adjective)", "The big house. (big = adjective)", "The old grandfather. (old = adjective)"]
    };
  } else if (comp.includes('pandiwa') || comp.includes('verb')) {
    return {
      motivation: language === 'Filipino'
        ? "Ano ang ginagawa mo ngayon? Nakaupo ka ba? Nagbabasa? Ang mga salitang ito ay nagpapakita ng kilos o gawa!"
        : "What are you doing now? Sitting? Reading? These words show actions!",
      learningActivity: language === 'Filipino'
        ? "Isulat ang tatlong bagay na ginagawa mo tuwing umaga. Salungguhitan ang mga pandiwa."
        : "Write three things you do every morning. Underline the verbs.",
      examples: language === 'Filipino'
        ? ["Tumatakbo ang bata. (tumatakbo = pandiwa)", "Kumakain ako ng almusal. (kumakain = pandiwa)", "Naglalaro sila sa labas. (naglalaro = pandiwa)"]
        : ["The child runs. (runs = verb)", "I eat breakfast. (eat = verb)", "They play outside. (play = verb)"]
    };
  } else if (comp.includes('pangngalan') || comp.includes('noun')) {
    return {
      motivation: language === 'Filipino'
        ? "Tingnan ang iyong silid-aralan. Makikita mo ang mga mesa, upuan, pisara, at libro. Ang mga ito ay tinatawag na pangngalan!"
        : "Look at your classroom. You can see desks, chairs, board, and books. These are called nouns!",
      learningActivity: language === 'Filipino'
        ? "Gumawa ng listahan ng 10 pangngalan na makikita sa inyong bahay."
        : "Make a list of 10 nouns you can find in your house.",
      examples: language === 'Filipino'
        ? ["Tao: guro, nanay, kapatid", "Bagay: lapis, bag, telepono", "Lugar: paaralan, parke, palengke"]
        : ["People: teacher, mother, sibling", "Things: pencil, bag, phone", "Places: school, park, market"]
    };
  }
  
  // Default Filipino content
  return {
    motivation: language === 'Filipino'
      ? "Ang pagkatuto ng Filipino ay mahalaga sa ating pang-araw-araw na komunikasyon. Gamitin natin ang ating wikang pambansa!"
      : "Learning Filipino is important for our daily communication. Let's use our national language!",
    learningActivity: language === 'Filipino'
      ? "Basahin ang teksto at sagutin ang mga tanong tungkol sa nilalaman nito."
      : "Read the text and answer the questions about its content.",
    examples: language === 'Filipino'
      ? ["Halimbawa 1: Pagsulat ng maikling kwento", "Halimbawa 2: Pagbasa ng tula", "Halimbawa 3: Paggamit ng wastong baybay"]
      : ["Example 1: Writing a short story", "Example 2: Reading a poem", "Example 3: Using correct spelling"]
  };
};

// English Subject Content Generator
const getEnglishContent = (competency: string, gradeCategory: string, language: string): SubjectContent => {
  const comp = competency.toLowerCase();
  
  if (comp.includes('visual elements') || comp.includes('graphics') || comp.includes('images')) {
    return {
      motivation: language === 'Filipino'
        ? "Tumingin sa iyong paborito mong libro. Ano ang nakikita mo sa pabalat? Ang mga larawan at disenyo ay nagkukwento din!"
        : "Look at your favorite book cover. What do you see? Pictures and designs also tell stories!",
      learningActivity: language === 'Filipino'
        ? "Tingnan ang ibinigay na larawan at isulat ang limang detalye na iyong napansin."
        : "Look at the given picture and write five details you noticed.",
      examples: language === 'Filipino'
        ? ["Mga kulay: pula, asul, dilaw - nagpapakita ng emosyon", "Mga hugis: bilog, parisukat - nagpapakita ng organisasyon", "Mga linya: pahilis, patayo - nagpapakita ng direksyon"]
        : ["Colors: red, blue, yellow - show emotions", "Shapes: circle, square - show organization", "Lines: diagonal, vertical - show direction"]
    };
  } else if (comp.includes('multimedia') || comp.includes('photographs') || comp.includes('drawings')) {
    return {
      motivation: language === 'Filipino'
        ? "Gumagamit tayo ng mga larawan, video, at audio upang mas maintindihan ang mensahe. Ito ang multimedia!"
        : "We use pictures, videos, and audio to better understand messages. This is multimedia!",
      learningActivity: language === 'Filipino'
        ? "Gumawa ng poster gamit ang tatlong uri ng multimedia elements: teksto, larawan, at drawing."
        : "Create a poster using three types of multimedia elements: text, photograph, and drawing.",
      examples: language === 'Filipino'
        ? ["Photograph: tunay na larawan mula sa camera", "Drawing: guhit na ginawa ng tao", "Graph: tsart na nagpapakita ng datos"]
        : ["Photograph: real image from a camera", "Drawing: illustration made by a person", "Graph: chart showing data"]
    };
  } else if (comp.includes('fact') || comp.includes('non-fact') || comp.includes('real') || comp.includes('make-believe')) {
    return {
      motivation: language === 'Filipino'
        ? "May mga bagay na totoo at may mga gawa-gawa lamang. Paano mo malalaman kung alin ang katotohanan?"
        : "Some things are real and some are made up. How do you know which is true?",
      learningActivity: language === 'Filipino'
        ? "Tingnan ang mga larawan at isulat kung ito ay totoo (fact) o kathang-isip (non-fact)."
        : "Look at the pictures and write whether it is real (fact) or make-believe (non-fact).",
      examples: language === 'Filipino'
        ? ["FACT: Ang araw ay umiikot ang mundo.", "NON-FACT: Ang mga unicorn ay nakatira sa kagubatan.", "FACT: Ang tubig ay nagpapatatag sa temperatura ng katawan."]
        : ["FACT: The earth revolves around the sun.", "NON-FACT: Unicorns live in forests.", "FACT: Water regulates body temperature."]
    };
  }
  
  // Default English content
  return {
    motivation: language === 'Filipino'
      ? "Ang English ay nagbubukas ng mga oportunidad sa buong mundo. Matuto tayo nang masaya!"
      : "English opens opportunities around the world. Let's learn joyfully!",
    learningActivity: language === 'Filipino'
      ? "Basahin ang teksto at tukuyin ang pangunahing ideya at mga sumusuportang detalye."
      : "Read the text and identify the main idea and supporting details.",
    examples: language === 'Filipino'
      ? ["Halimbawa: Pagbasa ng maikling kwento", "Halimbawa: Pagsulat ng talata", "Halimbawa: Pagsasalita sa harap ng klase"]
      : ["Example: Reading a short story", "Example: Writing a paragraph", "Example: Speaking in front of class"]
  };
};

// Math Subject Content Generator
const getMathContent = (competency: string, gradeCategory: string, language: string): SubjectContent => {
  const comp = competency.toLowerCase();
  
  if (comp.includes('addition') || comp.includes('pagdaragdag') || comp.includes('sum')) {
    const examples = gradeCategory === 'primary' 
      ? (language === 'Filipino' 
          ? ["3 + 2 = 5 (tatlong mansanas at dalawang mansanas)", "5 + 4 = 9 (limang lapis at apat na lapis)", "7 + 3 = 10 (pitong bata at tatlong bata)"]
          : ["3 + 2 = 5 (three apples and two apples)", "5 + 4 = 9 (five pencils and four pencils)", "7 + 3 = 10 (seven children and three children)"])
      : (language === 'Filipino'
          ? ["125 + 234 = 359", "1,456 + 2,789 = 4,245", "Word Problem: Kung may 156 na mag-aaral sa Grade 4 at 178 sa Grade 5, ilan ang kabuuan?"]
          : ["125 + 234 = 359", "1,456 + 2,789 = 4,245", "Word Problem: If there are 156 students in Grade 4 and 178 in Grade 5, what is the total?"]);
    return {
      motivation: language === 'Filipino'
        ? "Kapag bumibili ka sa tindahan, ginagamit mo ang addition! Halimbawa: 2 kendi + 3 kendi = 5 kendi."
        : "When you buy at the store, you use addition! Example: 2 candies + 3 candies = 5 candies.",
      learningActivity: language === 'Filipino'
        ? "Lutasin ang mga sumusunod na word problems gamit ang addition."
        : "Solve the following word problems using addition.",
      examples
    };
  } else if (comp.includes('multiplication') || comp.includes('pagpaparami') || comp.includes('product')) {
    return {
      motivation: language === 'Filipino'
        ? "Kapag may 3 grupo at bawat grupo ay may 4 na tao, ilan ang lahat? 3 × 4 = 12! Ito ang multiplication."
        : "If there are 3 groups and each group has 4 people, how many in all? 3 × 4 = 12! This is multiplication.",
      learningActivity: language === 'Filipino'
        ? "Gumamit ng array o grouping upang lutasin ang mga problema sa multiplication."
        : "Use arrays or grouping to solve the multiplication problems.",
      examples: language === 'Filipino'
        ? ["4 × 5 = 20 (4 na hanay, 5 sa bawat hanay)", "3 × 6 = 18 (3 grupo ng 6)", "7 × 8 = 56"]
        : ["4 × 5 = 20 (4 rows, 5 in each row)", "3 × 6 = 18 (3 groups of 6)", "7 × 8 = 56"]
    };
  } else if (comp.includes('fraction') || comp.includes('praksyon')) {
    return {
      motivation: language === 'Filipino'
        ? "Kung hahatiin mo ang isang pizza sa 4 na parte at kinuha mo ang 1, kinuha mo ang 1/4 ng pizza!"
        : "If you divide a pizza into 4 parts and take 1, you took 1/4 of the pizza!",
      learningActivity: language === 'Filipino'
        ? "Iguhit ang mga bilog at hatiin ito upang ipakita ang mga fraction."
        : "Draw circles and divide them to show the fractions.",
      examples: language === 'Filipino'
        ? ["1/2 - kalahati ng mansanas", "1/4 - isang bahagi ng pizza na hinati sa apat", "3/4 - tatlong bahagi ng isang buong cake"]
        : ["1/2 - half of an apple", "1/4 - one slice of pizza cut into four", "3/4 - three parts of a whole cake"]
    };
  }
  
  // Default Math content
  return {
    motivation: language === 'Filipino'
      ? "Ang Math ay nasa paligid natin! Mula sa pagbibilang ng pera hanggang sa pagsukat ng oras."
      : "Math is all around us! From counting money to measuring time.",
    learningActivity: language === 'Filipino'
      ? "Lutasin ang mga sumusunod na problema at ipakita ang iyong solusyon."
      : "Solve the following problems and show your solution.",
    examples: language === 'Filipino'
      ? ["Halimbawa 1: Paglutas ng word problems", "Halimbawa 2: Paggamit ng number line", "Halimbawa 3: Pagkalkula ng perimeter"]
      : ["Example 1: Solving word problems", "Example 2: Using a number line", "Example 3: Calculating perimeter"]
  };
};

// Science Subject Content Generator
const getScienceContent = (competency: string, gradeCategory: string, language: string): SubjectContent => {
  const comp = competency.toLowerCase();
  
  if (comp.includes('plant') || comp.includes('halaman') || comp.includes('photosynthesis')) {
    return {
      motivation: language === 'Filipino'
        ? "Bakit kaya berde ang dahon ng halaman? At bakit kailangan nila ang araw? Tuklasin natin!"
        : "Why are plant leaves green? And why do they need sunlight? Let's discover!",
      learningActivity: language === 'Filipino'
        ? "Obserbahan ang isang halaman sa loob ng 5 araw. Isulat ang mga pagbabago na iyong napansin."
        : "Observe a plant for 5 days. Write down the changes you notice.",
      examples: language === 'Filipino'
        ? ["Chlorophyll - nagbibigay ng berdeng kulay sa dahon", "Photosynthesis - proseso ng pagkain ng halaman gamit ang sikat ng araw", "Parts: ugat, tangkay, dahon, bulaklak, bunga"]
        : ["Chlorophyll - gives green color to leaves", "Photosynthesis - process where plants make food using sunlight", "Parts: roots, stem, leaves, flower, fruit"]
    };
  } else if (comp.includes('animal') || comp.includes('hayop')) {
    return {
      motivation: language === 'Filipino'
        ? "Alam mo ba na may mga hayop na lumilipad, lumalangoy, at gumagapang? Pag-aralan natin sila!"
        : "Did you know some animals fly, swim, and crawl? Let's study them!",
      learningActivity: language === 'Filipino'
        ? "Gumawa ng Venn diagram na naghahambing ng dalawang hayop."
        : "Create a Venn diagram comparing two animals.",
      examples: language === 'Filipino'
        ? ["Mammals - may balahibo, nagpapasuso (aso, pusa)", "Birds - may pakpak at balahibo (maya, lawin)", "Reptiles - malamig ang dugo (buwaya, butiki)"]
        : ["Mammals - have fur, give milk (dog, cat)", "Birds - have wings and feathers (sparrow, eagle)", "Reptiles - cold-blooded (crocodile, lizard)"]
    };
  } else if (comp.includes('matter') || comp.includes('bagay') || comp.includes('solid') || comp.includes('liquid') || comp.includes('gas')) {
    return {
      motivation: language === 'Filipino'
        ? "Ang tubig ay pwedeng maging yelo, likido, o singaw! Paano ito nangyayari?"
        : "Water can become ice, liquid, or steam! How does this happen?",
      learningActivity: language === 'Filipino'
        ? "Magsagawa ng eksperimento: Ilagay ang tubig sa freezer at obserbahan ang pagbabago."
        : "Conduct an experiment: Put water in the freezer and observe the changes.",
      examples: language === 'Filipino'
        ? ["Solid: yelo, bato, kahoy - may tiyak na hugis", "Liquid: tubig, gatas, juice - umaagos", "Gas: hangin, singaw - kumakalat sa ere"]
        : ["Solid: ice, rock, wood - has definite shape", "Liquid: water, milk, juice - flows", "Gas: air, steam - spreads in air"]
    };
  }
  
  // Default Science content
  return {
    motivation: language === 'Filipino'
      ? "Ang Science ay tumutulong sa atin na maintindihan ang mundo sa ating paligid!"
      : "Science helps us understand the world around us!",
    learningActivity: language === 'Filipino'
      ? "Magsagawa ng simpleng eksperimento at isulat ang iyong obserbasyon."
      : "Conduct a simple experiment and write your observations.",
    examples: language === 'Filipino'
      ? ["Halimbawa: Obserbahan ang panahon sa loob ng isang linggo", "Halimbawa: Tukuyin ang iba't ibang uri ng hayop", "Halimbawa: Suriin ang mga parte ng halaman"]
      : ["Example: Observe the weather for a week", "Example: Identify different types of animals", "Example: Examine the parts of a plant"]
  };
};

// Araling Panlipunan (AP) Content Generator
const getAPContent = (competency: string, gradeCategory: string, language: string): SubjectContent => {
  const comp = competency.toLowerCase();
  
  if (comp.includes('pamahalaan') || comp.includes('government') || comp.includes('kagawaran')) {
    return {
      motivation: language === 'Filipino'
        ? "Alam mo ba kung sino ang mga lider ng ating bansa? Sila ang tumutulong sa pagpapatakbo ng pamahalaan!"
        : "Do you know who leads our country? They help run the government!",
      learningActivity: language === 'Filipino'
        ? "Gumawa ng organizational chart ng mga kagawaran ng pamahalaan."
        : "Create an organizational chart of government departments.",
      examples: language === 'Filipino'
        ? ["DepEd - nangangasiwa sa edukasyon", "DOH - nangangasiwa sa kalusugan", "DSWD - tumutulong sa mahihirap"]
        : ["DepEd - manages education", "DOH - manages health", "DSWD - helps the poor"]
    };
  } else if (comp.includes('programa') || comp.includes('program') || comp.includes('ekonomiya')) {
    return {
      motivation: language === 'Filipino'
        ? "Maraming programa ang pamahalaan upang tulungan ang mga mamamayan. Alam mo ba ang ilan sa mga ito?"
        : "The government has many programs to help citizens. Do you know some of them?",
      learningActivity: language === 'Filipino'
        ? "Magsaliksik ng isang programa ng pamahalaan at ipaliwanag kung paano ito nakakatulong sa komunidad."
        : "Research one government program and explain how it helps the community.",
      examples: language === 'Filipino'
        ? ["4Ps - tulong sa mahihirap na pamilya", "PhilHealth - tulong sa pagpapagamot", "SSS - tulong sa mga manggagawa"]
        : ["4Ps - help for poor families", "PhilHealth - help for medical needs", "SSS - help for workers"]
    };
  }
  
  // Default AP content
  return {
    motivation: language === 'Filipino'
      ? "Ang pag-aaral ng kasaysayan at kultura ay tumutulong sa atin na maunawaan ang ating pagkakakilanlan!"
      : "Studying history and culture helps us understand our identity!",
    learningActivity: language === 'Filipino'
      ? "Gumawa ng timeline o mapa tungkol sa tinalakay na paksa."
      : "Create a timeline or map about the discussed topic.",
    examples: language === 'Filipino'
      ? ["Halimbawa: Pag-aaral ng mga bayani ng Pilipinas", "Halimbawa: Pagkilala sa mga lugar sa mapa", "Halimbawa: Pag-unawa sa mga tradisyon ng komunidad"]
      : ["Example: Studying Philippine heroes", "Example: Identifying places on a map", "Example: Understanding community traditions"]
  };
};

// EPP/TLE Content Generator
const getEPPContent = (competency: string, gradeCategory: string, language: string): SubjectContent => {
  const comp = competency.toLowerCase();
  
  if (comp.includes('pag-aalaga') || comp.includes('care') || comp.includes('poultry') || comp.includes('manok')) {
    return {
      motivation: language === 'Filipino'
        ? "Ang pag-aalaga ng manok ay isang mahalagang hanapbuhay. Alam mo ba ang tamang paraan ng pag-aalaga sa kanila?"
        : "Raising chickens is an important livelihood. Do you know the proper way to care for them?",
      learningActivity: language === 'Filipino'
        ? "Bumisita sa isang manukan at i-record ang mga hakbang sa pag-aalaga ng manok."
        : "Visit a poultry farm and record the steps in caring for chickens.",
      examples: language === 'Filipino'
        ? ["Pagpapakain: Bigyan ng feeds 2-3 beses sa isang araw", "Pagpapainom: Laging may malinis na tubig", "Paglilinis: Linasin ang kulungan araw-araw"]
        : ["Feeding: Give feeds 2-3 times a day", "Watering: Always provide clean water", "Cleaning: Clean the coop daily"]
    };
  } else if (comp.includes('pagtatanim') || comp.includes('planting') || comp.includes('garden')) {
    return {
      motivation: language === 'Filipino'
        ? "Maaari kang magtanim ng sarili mong gulay sa bahay! Subukan natin!"
        : "You can grow your own vegetables at home! Let's try!",
      learningActivity: language === 'Filipino'
        ? "Magtanim ng buto ng kamatis o sili sa maliit na paso at obserbahan ang paglaki."
        : "Plant tomato or pepper seeds in a small pot and observe their growth.",
      examples: language === 'Filipino'
        ? ["Hakbang 1: Maghanda ng lupa at paso", "Hakbang 2: Magbaon ng buto", "Hakbang 3: Diligan araw-araw"]
        : ["Step 1: Prepare soil and pot", "Step 2: Plant the seeds", "Step 3: Water daily"]
    };
  }
  
  // Default EPP content
  return {
    motivation: language === 'Filipino'
      ? "Ang EPP ay nagtuturo ng mga praktikal na kasanayan para sa buhay at hanapbuhay!"
      : "EPP teaches practical skills for life and livelihood!",
    learningActivity: language === 'Filipino'
      ? "Magsanay ng isang praktikal na kasanayan at isulat ang mga hakbang."
      : "Practice a practical skill and write down the steps.",
    examples: language === 'Filipino'
      ? ["Halimbawa: Pagluluto ng simpleng pagkain", "Halimbawa: Pananahi ng butones", "Halimbawa: Pag-aalaga ng halaman"]
      : ["Example: Cooking simple food", "Example: Sewing buttons", "Example: Caring for plants"]
  };
};

// MAPEH Content Generator
const getMAPEHContent = (competency: string, gradeCategory: string, language: string): SubjectContent => {
  const comp = competency.toLowerCase();
  
  if (comp.includes('music') || comp.includes('musika') || comp.includes('rhythm') || comp.includes('melody')) {
    return {
      motivation: language === 'Filipino'
        ? "Ano ang paborito mong kanta? Alam mo ba na ang musika ay may rhythm at melody?"
        : "What is your favorite song? Did you know music has rhythm and melody?",
      learningActivity: language === 'Filipino'
        ? "Makinig sa isang kanta at tukuyin ang rhythm pattern nito. Kumatok sa mesa kasabay ng beat."
        : "Listen to a song and identify its rhythm pattern. Tap on your desk along with the beat.",
      examples: language === 'Filipino'
        ? ["Rhythm: mabilis o mabagal na kumpas", "Melody: ang himig ng kanta", "Beat: ang steady pulse ng musika"]
        : ["Rhythm: fast or slow tempo", "Melody: the tune of the song", "Beat: the steady pulse of music"]
    };
  } else if (comp.includes('art') || comp.includes('sining') || comp.includes('drawing') || comp.includes('color')) {
    return {
      motivation: language === 'Filipino'
        ? "Ang sining ay paraan ng pagpapahayag ng ating damdamin at ideya!"
        : "Art is a way of expressing our feelings and ideas!",
      learningActivity: language === 'Filipino'
        ? "Gumawa ng collage gamit ang mga kulay na nagpapakita ng iyong mood ngayon."
        : "Create a collage using colors that show your mood today.",
      examples: language === 'Filipino'
        ? ["Primary Colors: pula, dilaw, asul", "Secondary Colors: orange, berde, lila", "Warm Colors: pula, orange, dilaw - nagpapakita ng init"]
        : ["Primary Colors: red, yellow, blue", "Secondary Colors: orange, green, violet", "Warm Colors: red, orange, yellow - shows warmth"]
    };
  } else if (comp.includes('pe') || comp.includes('physical') || comp.includes('exercise') || comp.includes('ehersisyo')) {
    return {
      motivation: language === 'Filipino'
        ? "Ang regular na exercise ay nagpapalusog ng ating katawan at isipan!"
        : "Regular exercise keeps our body and mind healthy!",
      learningActivity: language === 'Filipino'
        ? "Magsagawa ng 10-minute workout: jumping jacks, stretching, at running in place."
        : "Do a 10-minute workout: jumping jacks, stretching, and running in place.",
      examples: language === 'Filipino'
        ? ["Warm-up: 2 minutes stretching", "Cardio: 5 minutes jumping jacks", "Cool-down: 3 minutes deep breathing"]
        : ["Warm-up: 2 minutes stretching", "Cardio: 5 minutes jumping jacks", "Cool-down: 3 minutes deep breathing"]
    };
  } else if (comp.includes('health') || comp.includes('kalusugan')) {
    return {
      motivation: language === 'Filipino'
        ? "Ang malusog na katawan ay nagsisimula sa wastong nutrisyon at kalinisan!"
        : "A healthy body starts with proper nutrition and hygiene!",
      learningActivity: language === 'Filipino'
        ? "Gumawa ng food diary para sa isang araw. Tukuyin kung healthy o unhealthy ang iyong mga kinain."
        : "Create a food diary for one day. Identify if your meals are healthy or unhealthy.",
      examples: language === 'Filipino'
        ? ["Go Foods: bigas, tinapay - nagbibigay ng energy", "Grow Foods: karne, isda - tumutulong sa paglaki", "Glow Foods: gulay, prutas - nagpapalakas ng immune system"]
        : ["Go Foods: rice, bread - gives energy", "Grow Foods: meat, fish - helps in growth", "Glow Foods: vegetables, fruits - strengthens immune system"]
    };
  }
  
  // Default MAPEH content
  return {
    motivation: language === 'Filipino'
      ? "Ang MAPEH ay tumutulong sa ating maging malusog at malikhaing indibidwal!"
      : "MAPEH helps us become healthy and creative individuals!",
    learningActivity: language === 'Filipino'
      ? "Pumili ng isang aktibidad (musika, sining, PE, o health) at ipakita ang iyong natutuhan."
      : "Choose one activity (music, art, PE, or health) and demonstrate what you learned.",
    examples: language === 'Filipino'
      ? ["Halimbawa: Pag-awit ng folk song", "Halimbawa: Pagguhit ng landscape", "Halimbawa: Pagsasayaw ng traditional dance"]
      : ["Example: Singing a folk song", "Example: Drawing a landscape", "Example: Dancing a traditional dance"]
  };
};

// ESP (Edukasyon sa Pagpapakatao) Content Generator
const getESPContent = (competency: string, gradeCategory: string, language: string): SubjectContent => {
  const comp = competency.toLowerCase();
  
  if (comp.includes('values') || comp.includes('pagpapahalaga') || comp.includes('virtue')) {
    return {
      motivation: language === 'Filipino'
        ? "Ano ang gagawin mo kung may nakita kang pitaka na nahulog? Ang ating mga desisyon ay nagpapakita ng ating pagpapahalaga!"
        : "What would you do if you found a dropped wallet? Our decisions show our values!",
      learningActivity: language === 'Filipino'
        ? "Basahin ang kwento at tukuyin ang mabuting pagpapahalaga na ipinapakita ng bida."
        : "Read the story and identify the good values shown by the main character.",
      examples: language === 'Filipino'
        ? ["Katapatan: Pagsasauli ng natagpuang bagay", "Pagmamahal: Pagtulong sa kapwa", "Paggalang: Pakikipag-usap nang magalang"]
        : ["Honesty: Returning found items", "Love: Helping others", "Respect: Speaking politely"]
    };
  } else if (comp.includes('responsibility') || comp.includes('pananagutan') || comp.includes('tungkulin')) {
    return {
      motivation: language === 'Filipino'
        ? "Bilang mag-aaral, ano ang mga tungkulin mo sa paaralan at sa bahay?"
        : "As a student, what are your responsibilities at school and at home?",
      learningActivity: language === 'Filipino'
        ? "Gumawa ng checklist ng iyong mga tungkulin at markahan kung nagawa mo na ito."
        : "Create a checklist of your responsibilities and mark if you have done them.",
      examples: language === 'Filipino'
        ? ["Sa Bahay: Maglinis ng kwarto", "Sa Paaralan: Gawin ang assignments", "Sa Komunidad: Huwag magtapon ng basura kahit saan"]
        : ["At Home: Clean your room", "At School: Do your assignments", "In Community: Don't litter"]
    };
  }
  
  // Default ESP content
  return {
    motivation: language === 'Filipino'
      ? "Ang mabuting asal at wastong pagpapahalaga ay susi sa matagumpay na buhay!"
      : "Good conduct and proper values are keys to a successful life!",
    learningActivity: language === 'Filipino'
      ? "Magsulat ng reflection tungkol sa isang pagpapahalaga na gusto mong isabuhay."
      : "Write a reflection about a value you want to live by.",
    examples: language === 'Filipino'
      ? ["Halimbawa: Pagtulong sa mga nangangailangan", "Halimbawa: Pagiging tapat sa lahat ng oras", "Halimbawa: Pagrespeto sa nakatatanda"]
      : ["Example: Helping those in need", "Example: Being honest at all times", "Example: Respecting elders"]
  };
};

// Main function to get subject-specific content
const getSubjectContent = (subject: string, competency: string, gradeLevel: string, language: string): SubjectContent => {
  const subjectLower = subject.toLowerCase();
  const gradeCategory = getGradeCategory(gradeLevel);
  
  if (subjectLower.includes('filipino')) {
    return getFilipinoContent(competency, gradeCategory, language);
  } else if (subjectLower.includes('english')) {
    return getEnglishContent(competency, gradeCategory, language);
  } else if (subjectLower.includes('math') || subjectLower.includes('mathematics')) {
    return getMathContent(competency, gradeCategory, language);
  } else if (subjectLower.includes('science') || subjectLower.includes('agham')) {
    return getScienceContent(competency, gradeCategory, language);
  } else if (subjectLower.includes('araling panlipunan') || subjectLower.includes('ap') || subjectLower.includes('social')) {
    return getAPContent(competency, gradeCategory, language);
  } else if (subjectLower.includes('epp') || subjectLower.includes('tle') || subjectLower.includes('edukasyong pantahanan')) {
    return getEPPContent(competency, gradeCategory, language);
  } else if (subjectLower.includes('mapeh') || subjectLower.includes('music') || subjectLower.includes('art') || subjectLower.includes('pe') || subjectLower.includes('health')) {
    return getMAPEHContent(competency, gradeCategory, language);
  } else if (subjectLower.includes('esp') || subjectLower.includes('edukasyon sa pagpapakatao') || subjectLower.includes('values')) {
    return getESPContent(competency, gradeCategory, language);
  }
  
  // Generic default content
  return {
    motivation: language === 'Filipino'
      ? `Ang pag-aaral ng ${subject} ay mahalaga para sa iyong kinabukasan!`
      : `Learning ${subject} is important for your future!`,
    learningActivity: language === 'Filipino'
      ? "Basahin ang aralin at sagutin ang mga tanong sa ibaba."
      : "Read the lesson and answer the questions below.",
    examples: language === 'Filipino'
      ? ["Halimbawa 1: Pag-apply ng natutuhan sa praktikal na sitwasyon", "Halimbawa 2: Pagbibigay ng real-world examples", "Halimbawa 3: Pagkonekta sa pang-araw-araw na buhay"]
      : ["Example 1: Applying learning to practical situations", "Example 2: Giving real-world examples", "Example 3: Connecting to daily life"]
  };
};

// ==================== END OF SUBJECT-SPECIFIC CONTENT GENERATORS ====================

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    const jwt = authHeader?.split(" ")[1];
    const requestBody = await req.json();
    
    console.log("Edge function received request:", JSON.stringify(requestBody, null, 2));
    
    const {
      subject,
      gradeLevel,
      section,
      dateFrom,
      dateTo,
      mondayCompetency,
      tuesdayCompetency,
      wednesdayCompetency,
      thursdayCompetency,
      fridayCompetency,
      mondayExamType,
      tuesdayExamType,
      wednesdayExamType,
      thursdayExamType,
      fridayExamType,
      mondayQuestionCount,
      tuesdayQuestionCount,
      wednesdayQuestionCount,
      thursdayQuestionCount,
      fridayQuestionCount,
      code,
      customInstructions,
      language,
    } = requestBody;

    // Enhanced validation with detailed logging
    const requiredFields = [
      { name: 'subject', value: subject },
      { name: 'gradeLevel', value: gradeLevel },
      { name: 'section', value: section },
      { name: 'dateFrom', value: dateFrom },
      { name: 'dateTo', value: dateTo },
    ];

    const dailyFields = [
      { day: 'Monday', competency: mondayCompetency, examType: mondayExamType, questionCount: mondayQuestionCount },
      { day: 'Tuesday', competency: tuesdayCompetency, examType: tuesdayExamType, questionCount: tuesdayQuestionCount },
      { day: 'Wednesday', competency: wednesdayCompetency, examType: wednesdayExamType, questionCount: wednesdayQuestionCount },
      { day: 'Thursday', competency: thursdayCompetency, examType: thursdayExamType, questionCount: thursdayQuestionCount },
      { day: 'Friday', competency: fridayCompetency, examType: fridayExamType, questionCount: fridayQuestionCount },
    ];

    console.log("Validating required fields:", requiredFields);
    console.log("Validating daily fields:", dailyFields);

    // Validate required fields
    const missingFields = requiredFields.filter(field => !field.value?.toString().trim());
    if (missingFields.length > 0) {
      console.error("Missing required fields:", missingFields.map(f => f.name));
      return new Response(
        JSON.stringify({
          error: `Missing required fields: ${missingFields.map(f => f.name).join(', ')}`,
          details: missingFields
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate daily fields (allow HOLIDAY as special case)
    const incompleteDays = dailyFields.filter(day => {
      if (day.examType === "HOLIDAY") {
        return !day.competency?.toString().trim() || 
               day.competency?.toString().trim() !== "HOLIDAY" ||
               !day.questionCount ||
               typeof day.questionCount !== 'number';
      }
      return !day.competency?.toString().trim() || 
             !day.examType?.toString().trim() || 
             !day.questionCount ||
             typeof day.questionCount !== 'number' ||
             day.questionCount < 3 || 
             day.questionCount > 20;
    });

    if (incompleteDays.length > 0) {
      console.error("Incomplete daily fields:", incompleteDays);
      return new Response(
        JSON.stringify({
          error: `Incomplete data for days: ${incompleteDays.map(d => d.day).join(', ')}`,
          details: incompleteDays.map(day => ({
            day: day.day,
            issues: [
              !day.competency?.toString().trim() ? 'missing competency' : null,
              !day.examType?.toString().trim() ? 'missing exam type' : null,
              !day.questionCount ? 'missing question count' : null,
              (typeof day.questionCount !== 'number' || day.questionCount < 3 || day.questionCount > 20) ? 'invalid question count (must be 3-20)' : null
            ].filter(Boolean)
          }))
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Validation passed - all required fields present");

    if (!jwt) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const days = ["monday", "tuesday", "wednesday", "thursday", "friday"];
    const competencies = [mondayCompetency, tuesdayCompetency, wednesdayCompetency, thursdayCompetency, fridayCompetency];
    const examTypes = [mondayExamType, tuesdayExamType, wednesdayExamType, thursdayExamType, fridayExamType];
    const questionCounts = [mondayQuestionCount, tuesdayQuestionCount, wednesdayQuestionCount, thursdayQuestionCount, fridayQuestionCount];

    const missingCompetencies = competencies.map((c, i) => {
      const examType = examTypes[i];
      if (examType === "HOLIDAY") {
        return (c?.trim() === "HOLIDAY") ? null : days[i];
      }
      return c?.trim() ? null : days[i];
    }).filter(Boolean);
    if (missingCompetencies.length > 0) {
      return new Response(JSON.stringify({ 
        error: `Missing competencies for: ${missingCompetencies.join(', ')}. Please complete all daily competencies.`
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const missingExamTypes = examTypes.map((e, i) => e ? null : days[i]).filter(Boolean);
    if (missingExamTypes.length > 0) {
      return new Response(JSON.stringify({ 
        error: `Missing exam types for: ${missingExamTypes.join(', ')}. Please select exam types for all days.`
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const invalidQuestionCounts = questionCounts.map((q, i) => {
      const examType = examTypes[i];
      if (examType === "HOLIDAY") {
        return (!q) ? `${days[i]} (${q || 'missing'})` : null;
      }
      return (!q || q < 3 || q > 20) ? `${days[i]} (${q || 'missing'})` : null;
    }).filter(Boolean);
    if (invalidQuestionCounts.length > 0) {
      return new Response(JSON.stringify({ 
        error: `Invalid question counts for: ${invalidQuestionCounts.join(', ')}. Each day must have 3-20 questions.`
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify auth user
    const userResp = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { Authorization: `Bearer ${jwt}`, apikey: SUPABASE_SERVICE_ROLE_KEY! },
    });
    const user = await userResp.json();

    const userId: string | undefined = user?.id;
    if (!userId) {
      return new Response(JSON.stringify({ error: "Invalid user" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const dailyPlan = {
      Monday: {
        competency: mondayCompetency.trim(),
        examType: mondayExamType,
        questionCount: mondayQuestionCount,
      },
      Tuesday: {
        competency: tuesdayCompetency.trim(),
        examType: tuesdayExamType,
        questionCount: tuesdayQuestionCount,
      },
      Wednesday: {
        competency: wednesdayCompetency.trim(),
        examType: wednesdayExamType,
        questionCount: wednesdayQuestionCount,
      },
      Thursday: {
        competency: thursdayCompetency.trim(),
        examType: thursdayExamType,
        questionCount: thursdayQuestionCount,
      },
      Friday: {
        competency: fridayCompetency.trim(),
        examType: fridayExamType,
        questionCount: fridayQuestionCount,
      },
    };

    // Step 1: Search (Tavily if available)
    let curatedSources: Array<{ title: string; url: string; note: string }> = [];
    const searchQuery = `${subject} ${gradeLevel} learning activities references`.slice(0, 256);

    if (TAVILY_API_KEY) {
      try {
        const tavilyRes = await fetch("https://api.tavily.com/search", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${TAVILY_API_KEY}` },
          body: JSON.stringify({
            query: searchQuery,
            include_domains: [
              "deped.gov.ph",
              "lrmds.deped.gov.ph",
              "commons.deped.gov.ph",
              "learningresourceportal.deped.gov.ph",
              "k12.gov.ph",
              "curricula.deped.gov.ph"
            ],
            search_depth: "basic",
            max_results: 8
          }),
        });
        const tavilyData = await tavilyRes.json();
        if (tavilyData?.results) {
          curatedSources = tavilyData.results.slice(0, 5).map((r: any) => ({
            title: r.title || "Educational Resource",
            url: r.url || "",
            note: r.content?.slice(0, 150) || "Learning material reference"
          }));
        }
      } catch (error) {
        console.error("Tavily search failed:", error);
      }
    }

    const effectiveLanguage = language || "English";

    // ENHANCED SYSTEM PROMPT with real learning activities structure
    const systemPrompt = `You are an expert DepEd Philippines curriculum specialist creating Weekly Learning Matrix content for ${subject}, ${gradeLevel}.

CRITICAL REQUIREMENTS:
1. Return ONLY valid JSON - no markdown, explanations, or extra text
2. Generate REAL, PRACTICAL learning activities - NOT just quiz questions
3. Each day MUST have DIFFERENT content based on its unique competency
4. Include REAL EXAMPLES specific to ${gradeLevel} level and ${subject}

LANGUAGE: Generate ALL content in ${effectiveLanguage}

LEARNING ACTIVITY STRUCTURE (for each day):
Each day's activity MUST follow this structure:
1. MOTIVATION/HOOK: A real-world connection or engaging question (2-3 sentences)
2. LEARNING ACTIVITY: A practical task, demonstration, or hands-on exercise (specific and actionable)
3. EXAMPLES: 2-3 concrete, grade-appropriate examples based on the competency
4. QUIZ: Assessment questions (as specified)
5. EXPECTED OUTPUT & CONTINGENCY

Daily Learning Plan (DO NOT MODIFY COMPETENCIES):
- Monday: "${dailyPlan.Monday.competency}" | Exam: ${dailyPlan.Monday.examType} | Questions: ${dailyPlan.Monday.questionCount}
- Tuesday: "${dailyPlan.Tuesday.competency}" | Exam: ${dailyPlan.Tuesday.examType} | Questions: ${dailyPlan.Tuesday.questionCount}
- Wednesday: "${dailyPlan.Wednesday.competency}" | Exam: ${dailyPlan.Wednesday.examType} | Questions: ${dailyPlan.Wednesday.questionCount}
- Thursday: "${dailyPlan.Thursday.competency}" | Exam: ${dailyPlan.Thursday.examType} | Questions: ${dailyPlan.Thursday.questionCount}
- Friday: "${dailyPlan.Friday.competency}" | Exam: ${dailyPlan.Friday.examType} | Questions: ${dailyPlan.Friday.questionCount}

Context:
- Subject: ${subject}
- Grade Level: ${gradeLevel}
- Section: ${section}
- Date Range: ${dateFrom} to ${dateTo}
${code ? `- Curriculum Code: ${code}` : ""}
${customInstructions ? `- Additional Instructions: ${customInstructions}` : ""}

EXAMPLE ACTIVITY FORMAT (${effectiveLanguage === 'Filipino' ? 'Filipino' : 'English'}):
${effectiveLanguage === 'Filipino' 
  ? `"Motivation/Hook: Tumingin sa iyong paligid. Ano ang kulay ng dingding? Malaki ba o maliit ang iyong mesa? Ang mga salitang ito ay tinatawag na pang-uri!

Gawain sa Pagkatuto: Basahin ang maikling kwento at bilugan ang mga pang-uri na ginamit: 'Ang maliit na pusa ay tumakbo sa malaking bakuran. Nakita niya ang pulang bulaklak at berdeng damo.'

Mga Halimbawa:
1. Maganda ang babae. (maganda = pang-uri na naglalarawan sa babae)
2. Malaki ang bahay namin. (malaki = pang-uri na naglalarawan sa bahay)
3. Matanda ang lolo ko. (matanda = pang-uri na naglalarawan sa lolo)

Pagsusulit:
1. Alin ang pang-uri sa pangungusap: 'Ang maliit na bata ay tumatawa.'
   A. Bata
   B. Maliit *
   C. Tumatawa
   D. Ang

[More questions...]

Inaasahang Output: Nakumpleto ang pagsusulit at natukoy ang mga pang-uri sa kwento.
Contingency: Kung nahihirapan, magbigay ng karagdagang halimbawa."`
  : `"Motivation/Hook: Look around you. What color is the wall? Is your desk big or small? These words are called adjectives!

Learning Activity: Read the short story and circle the adjectives: 'The small cat ran in the big yard. It saw the red flower and green grass.'

Examples:
1. The beautiful girl. (beautiful = adjective describing the girl)
2. The big house. (big = adjective describing the house)
3. The old grandfather. (old = adjective describing the grandfather)

Quiz:
1. Which word is the adjective in: 'The small child is laughing.'
   A. Child
   B. Small *
   C. Laughing
   D. The

[More questions...]

Expected Output: Completed quiz and identified adjectives in the story.
Contingency: If struggling, provide additional examples."`}

Return this JSON structure:
{
  "competency": {
    "mon": "${dailyPlan.Monday.competency}",
    "tue": "${dailyPlan.Tuesday.competency}",
    "wed": "${dailyPlan.Wednesday.competency}", 
    "thu": "${dailyPlan.Thursday.competency}",
    "fri": "${dailyPlan.Friday.competency}"
  },
  "references": {
    "mon": "${subject} textbook, DepEd learning materials, K-12 curriculum guides",
    "tue": "${subject} textbook, DepEd learning materials, K-12 curriculum guides",
    "wed": "${subject} textbook, DepEd learning materials, K-12 curriculum guides",
    "thu": "${subject} textbook, DepEd learning materials, K-12 curriculum guides",
    "fri": "${subject} textbook, DepEd learning materials, K-12 curriculum guides"
  },
  "activities": {
    "mon": "Motivation/Hook: [Real-world connection]\\n\\n${effectiveLanguage === 'Filipino' ? 'Gawain sa Pagkatuto' : 'Learning Activity'}: [Practical task]\\n\\n${effectiveLanguage === 'Filipino' ? 'Mga Halimbawa' : 'Examples'}:\\n[2-3 real examples]\\n\\n${effectiveLanguage === 'Filipino' ? 'Pagsusulit' : 'Quiz'}:\\n[Questions]\\n\\n${effectiveLanguage === 'Filipino' ? 'Inaasahang Output' : 'Expected Output'}: [Description]\\n${effectiveLanguage === 'Filipino' ? 'Contingency' : 'Contingency'}: [Backup plan]",
    "tue": "...",
    "wed": "...",
    "thu": "...",
    "fri": "..."
  }
}`;

    // Step 2: AI Generation with prioritized API calls
    let aiJson: any = null;
    let aiError: string | null = null;

    const hasHoliday = [mondayExamType, tuesdayExamType, wednesdayExamType, thursdayExamType, fridayExamType].includes("HOLIDAY");
    console.log("Has HOLIDAY days:", hasHoliday);

    const maxRetries = 3;
    let retryCount = 0;
    
    if (DEEPSEEK_API_KEY && !aiJson && !hasHoliday) {
      while (!aiJson && retryCount < maxRetries) {
        try {
          console.log(`Trying DeepSeek API (attempt ${retryCount + 1}/${maxRetries})...`);
          const deepSeekRes = await fetch("https://api.deepseek.com/chat/completions", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${DEEPSEEK_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "deepseek-chat",
              messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: "Generate the weekly learning matrix content with REAL learning activities and examples. Return valid JSON only." }
              ],
              temperature: 0.3,
              max_tokens: 8192,
            }),
          });

          if (deepSeekRes.ok) {
            const deepSeekData = await deepSeekRes.json();
            const content = deepSeekData.choices?.[0]?.message?.content?.trim();
            console.log("DeepSeek raw response:", content?.substring(0, 500) + "...");
            
            if (content) {
              try {
                let jsonString = content;
                jsonString = jsonString.replace(/```json\s*/, '').replace(/```\s*$/, '');
                const jsonStart = jsonString.indexOf('{');
                const jsonEnd = jsonString.lastIndexOf('}');
                
                if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
                  jsonString = jsonString.substring(jsonStart, jsonEnd + 1);
                  jsonString = jsonString
                    .replace(/[\u0000-\u001F\u007F-\u009F]/g, '')
                    .replace(/\n/g, '\\n')
                    .replace(/\r/g, '\\r')
                    .replace(/\t/g, '\\t');
                  
                  console.log("Cleaned JSON string:", jsonString.substring(0, 200) + "...");
                  aiJson = JSON.parse(jsonString);
                  console.log("DeepSeek API successful on attempt", retryCount + 1);
                  break;
                }
              } catch (parseError) {
                console.error(`DeepSeek JSON parse error (attempt ${retryCount + 1}):`, parseError);
                retryCount++;
                if (retryCount < maxRetries) {
                  await new Promise(resolve => setTimeout(resolve, 1000));
                }
              }
            }
          } else {
            const errorText = await deepSeekRes.text();
            console.error(`DeepSeek API failed (attempt ${retryCount + 1}):`, errorText);
            retryCount++;
          }
        } catch (error) {
          console.error(`DeepSeek API error (attempt ${retryCount + 1}):`, error);
          retryCount++;
        }
      }
    }

    // ENHANCED FALLBACK: Generate real subject-specific content with examples
    if (!aiJson) {
      console.log(hasHoliday ? "HOLIDAY detected, using HOLIDAY template" : "DeepSeek API failed, generating real content with fallback");
      
      const generateRealActivities = (day: string, plan: any) => {
        if (plan.examType === "HOLIDAY") {
          return effectiveLanguage === 'Filipino' ? "Walang klase - Holiday" : "No class - Holiday";
        }
        
        const count = plan.questionCount;
        const type = plan.examType;
        const competency = plan.competency;
        
        // Get subject-specific content
        const subjectContent = getSubjectContent(subject, competency, gradeLevel, effectiveLanguage);
        
        // Build the complete activity with motivation, learning activity, examples, and quiz
        let activity = "";
        
        // 1. Motivation/Hook
        if (effectiveLanguage === 'Filipino') {
          activity += `Motivation/Hook: ${subjectContent.motivation}\n\n`;
          activity += `Gawain sa Pagkatuto: ${subjectContent.learningActivity}\n\n`;
          activity += `Mga Halimbawa:\n`;
        } else {
          activity += `Motivation/Hook: ${subjectContent.motivation}\n\n`;
          activity += `Learning Activity: ${subjectContent.learningActivity}\n\n`;
          activity += `Examples:\n`;
        }
        
        // Add examples
        subjectContent.examples.forEach((example, idx) => {
          activity += `${idx + 1}. ${example}\n`;
        });
        activity += "\n";
        
        // 2. Quiz section
        if (effectiveLanguage === 'Filipino') {
          activity += `Pagsusulit:\n`;
        } else {
          activity += `Quiz:\n`;
        }
        
        // Generate quiz questions based on competency and exam type
        activity += generateQuizQuestions(type, count, competency, subject, effectiveLanguage, day);
        
        // 3. Expected Output and Contingency
        if (effectiveLanguage === 'Filipino') {
          activity += `\nInaasahang Output: Nakumpleto ang gawain at pagsusulit na nagpapakita ng pag-unawa sa kompetensya.\n`;
          activity += `Contingency: Kung nahihirapan, suriin muli ang mga halimbawa at subukang muli.`;
        } else {
          activity += `\nExpected Output: Completed activity and quiz demonstrating understanding of the competency.\n`;
          activity += `Contingency: If struggling, review the examples and try again.`;
        }
        
        return activity;
      };
      
      // Helper function to generate quiz questions
      const generateQuizQuestions = (type: string, count: number, competency: string, subject: string, lang: string, day: string) => {
        let questions = "";
        const competencyPhrase = competency.split(' ').slice(0, 6).join(' ');
        const dayHash = day.length + competency.length;
        
        for (let i = 1; i <= count; i++) {
          const questionSeed = i + dayHash;
          
          switch (type) {
            case "Multiple Choice":
              if (lang === 'Filipino') {
                const mcQuestions = [
                  `${i}. Batay sa "${competencyPhrase}", alin ang tamang sagot?\n   A. Ito ay nagpapakita ng wastong pag-unawa\n   B. Hindi ito nauugnay sa aralin\n   C. Walang koneksyon sa kompetensya\n   D. Lahat ng nabanggit ay mali\n\n`,
                  `${i}. Paano mo maipapakita ang kaalaman sa "${competencyPhrase}"?\n   A. Sa pamamagitan ng tamang pagsasanay at aplikasyon\n   B. Hindi na kailangang aralin pa\n   C. Basta sagutin lamang kahit hindi alam\n   D. Huwag na lang pag-aralan\n\n`,
                  `${i}. Ano ang kahalagahan ng pag-aaral ng "${competencyPhrase}"?\n   A. Nakakatulong ito sa pang-araw-araw na buhay\n   B. Walang praktikal na gamit\n   C. Para sa pagsusulit lamang\n   D. Hindi mahalaga sa kinabukasan\n\n`,
                  `${i}. Sa konteksto ng "${competencyPhrase}", ano ang pinakamabuting gawin?\n   A. Pag-aralan nang mabuti at unawain\n   B. Kalimutan pagkatapos ng klase\n   C. Huwag na lang pansinin\n   D. Kopiyahin na lang sa kaklase\n\n`,
                  `${i}. Tungkol sa "${competencyPhrase}", alin ang tama?\n   A. Kailangan itong maintindihan nang mabuti\n   B. Hindi na kailangan pang pag-aralan\n   C. Madaling kalimutan pagkatapos\n   D. Walang kaugnayan sa pag-aaral\n\n`
                ];
                questions += mcQuestions[questionSeed % mcQuestions.length];
              } else {
                const mcQuestionsEn = [
                  `${i}. Based on "${competencyPhrase}", which is the correct answer?\n   A. This demonstrates proper understanding\n   B. This is not related to the lesson\n   C. No connection to the competency\n   D. All of the above are wrong\n\n`,
                  `${i}. How can you demonstrate knowledge of "${competencyPhrase}"?\n   A. Through proper practice and application\n   B. No need to study anymore\n   C. Just answer without knowing\n   D. Don't bother studying\n\n`,
                  `${i}. What is the importance of learning "${competencyPhrase}"?\n   A. It helps in daily life\n   B. Has no practical use\n   C. Only for tests\n   D. Not important for the future\n\n`,
                  `${i}. In the context of "${competencyPhrase}", what is the best thing to do?\n   A. Study carefully and understand\n   B. Forget after class\n   C. Just ignore it\n   D. Copy from classmates\n\n`,
                  `${i}. About "${competencyPhrase}", which is correct?\n   A. It needs to be understood well\n   B. No need to study anymore\n   C. Easy to forget afterwards\n   D. Not related to learning\n\n`
                ];
                questions += mcQuestionsEn[questionSeed % mcQuestionsEn.length];
              }
              break;
              
            case "True/False":
              if (lang === 'Filipino') {
                const tfQuestions = [
                  `${i}. Ang "${competencyPhrase}" ay mahalaga sa pang-araw-araw na buhay. (Tama/Mali)\n\n`,
                  `${i}. Hindi na kailangan pang pag-aralan ang "${competencyPhrase}". (Tama/Mali)\n\n`,
                  `${i}. Ang pag-unawa sa "${competencyPhrase}" ay nakakatulong sa pagkatuto. (Tama/Mali)\n\n`
                ];
                questions += tfQuestions[questionSeed % tfQuestions.length];
              } else {
                const tfQuestionsEn = [
                  `${i}. "${competencyPhrase}" is important in daily life. (True/False)\n\n`,
                  `${i}. There is no need to study "${competencyPhrase}". (True/False)\n\n`,
                  `${i}. Understanding "${competencyPhrase}" helps in learning. (True/False)\n\n`
                ];
                questions += tfQuestionsEn[questionSeed % tfQuestionsEn.length];
              }
              break;
              
            case "Identification":
              if (lang === 'Filipino') {
                questions += `${i}. Tukuyin ang pangunahing konsepto sa: "${competencyPhrase}" ________\n\n`;
              } else {
                questions += `${i}. Identify the main concept in: "${competencyPhrase}" ________\n\n`;
              }
              break;
              
            case "Essay":
              if (lang === 'Filipino') {
                const essayQuestions = [
                  `${i}. Ipaliwanag ang kahalagahan ng "${competencyPhrase}" sa iyong pag-aaral.\n\n`,
                  `${i}. Paano mo maipapakita ang iyong kaalaman sa "${competencyPhrase}"?\n\n`,
                  `${i}. Magbigay ng halimbawa kung paano ginagamit ang "${competencyPhrase}" sa tunay na buhay.\n\n`
                ];
                questions += essayQuestions[questionSeed % essayQuestions.length];
              } else {
                const essayQuestionsEn = [
                  `${i}. Explain the importance of "${competencyPhrase}" in your studies.\n\n`,
                  `${i}. How can you demonstrate your knowledge of "${competencyPhrase}"?\n\n`,
                  `${i}. Give an example of how "${competencyPhrase}" is used in real life.\n\n`
                ];
                questions += essayQuestionsEn[questionSeed % essayQuestionsEn.length];
              }
              break;
              
            case "Matching Type":
              if (lang === 'Filipino') {
                questions += `${i}. Ipares ang konsepto sa tamang kahulugan:\n   Column A: ${competencyPhrase}\n   Column B: [Tamang paliwanag o halimbawa]\n\n`;
              } else {
                questions += `${i}. Match the concept with the correct definition:\n   Column A: ${competencyPhrase}\n   Column B: [Correct explanation or example]\n\n`;
              }
              break;
              
            case "Performance Task":
              if (lang === 'Filipino') {
                questions += `${i}. Gumawa ng presentasyon o demonstrasyon na nagpapakita ng iyong pag-unawa sa "${competencyPhrase}".\n\n`;
              } else {
                questions += `${i}. Create a presentation or demonstration showing your understanding of "${competencyPhrase}".\n\n`;
              }
              break;
              
            default:
              if (lang === 'Filipino') {
                questions += `${i}. Sagutin: Paano mo maiuugnay ang "${competencyPhrase}" sa iyong pang-araw-araw na buhay?\n\n`;
              } else {
                questions += `${i}. Answer: How can you relate "${competencyPhrase}" to your daily life?\n\n`;
              }
          }
        }
        
        return questions;
      };

      aiJson = {
        competency: {
          mon: dailyPlan.Monday.competency,
          tue: dailyPlan.Tuesday.competency,
          wed: dailyPlan.Wednesday.competency,
          thu: dailyPlan.Thursday.competency,
          fri: dailyPlan.Friday.competency,
        },
        references: {
          mon: dailyPlan.Monday.examType === "HOLIDAY" 
            ? (effectiveLanguage === 'Filipino' ? "Walang sanggunian na kailangan - Holiday" : "No references needed - Holiday")
            : (effectiveLanguage === 'Filipino' 
                ? `${subject} textbook, DepEd na materyales sa pagkatuto, K-12 curriculum guides`
                : `${subject} textbook, DepEd learning materials, K-12 curriculum guides`),
          tue: effectiveLanguage === 'Filipino' 
            ? `${subject} textbook, DepEd na materyales sa pagkatuto, K-12 curriculum guides`
            : `${subject} textbook, DepEd learning materials, K-12 curriculum guides`,
          wed: effectiveLanguage === 'Filipino' 
            ? `${subject} textbook, DepEd na materyales sa pagkatuto, K-12 curriculum guides`
            : `${subject} textbook, DepEd learning materials, K-12 curriculum guides`,
          thu: effectiveLanguage === 'Filipino' 
            ? `${subject} textbook, DepEd na materyales sa pagkatuto, K-12 curriculum guides`
            : `${subject} textbook, DepEd learning materials, K-12 curriculum guides`,
          fri: effectiveLanguage === 'Filipino' 
            ? `${subject} textbook, DepEd na materyales sa pagkatuto, K-12 curriculum guides`
            : `${subject} textbook, DepEd learning materials, K-12 curriculum guides`,
        },
        activities: {
          mon: generateRealActivities("Monday", dailyPlan.Monday),
          tue: generateRealActivities("Tuesday", dailyPlan.Tuesday),
          wed: generateRealActivities("Wednesday", dailyPlan.Wednesday),
          thu: generateRealActivities("Thursday", dailyPlan.Thursday),
          fri: generateRealActivities("Friday", dailyPlan.Friday),
        },
      };
    }

    // Combine competencies for storage
    const combinedCompetency = [
      `Mon: ${dailyPlan.Monday.competency}`,
      `Tue: ${dailyPlan.Tuesday.competency}`,
      `Wed: ${dailyPlan.Wednesday.competency}`,
      `Thu: ${dailyPlan.Thursday.competency}`,
      `Fri: ${dailyPlan.Friday.competency}`
    ].join('; ');

    // Step 3: Save matrix data
    console.log("Saving matrix data to database...");
    const { data: matrixData, error: matrixError } = await supabase
      .from("weelmat_matrices")
      .insert({
        user_id: userId,
        subject,
        grade_level: gradeLevel,
        section,
        date_from: dateFrom,
        date_to: dateTo,
        competency: combinedCompetency,
        code: code || null,
        custom_instructions: customInstructions || null,
        ai_json: aiJson,
      })
      .select()
      .single();

    if (matrixError) {
      console.error("Error saving matrix data:", matrixError);
      return new Response(
        JSON.stringify({ error: "Failed to save matrix data", details: matrixError }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Matrix data saved successfully:", matrixData);

    // Helper function to parse activity content with answer key
    const parseActivityContentWithAnswerKey = (content: string) => {
      if (!content) {
        return [new Paragraph({ children: [new TextRun({ text: "", size: 14 })] })];
      }

      const paragraphs: Paragraph[] = [];
      const lines = content.split(/\n+/);
      
      lines.forEach((line) => {
        if (!line.trim()) return;
        
        // Handle section headers
        if (line.includes('Motivation/Hook:') || line.includes('Learning Activity:') || 
            line.includes('Gawain sa Pagkatuto:') || line.includes('Examples:') ||
            line.includes('Mga Halimbawa:') || line.includes('Quiz:') || 
            line.includes('Pagsusulit:') || line.includes('Expected Output:') ||
            line.includes('Inaasahang Output:') || line.includes('Contingency:') ||
            line.includes('Answer Key:') || line.includes('Susi sa Sagot:')) {
          paragraphs.push(new Paragraph({
            children: [new TextRun({ text: line.trim(), bold: true, size: 14 })],
            spacing: { before: 200, after: 100 }
          }));
        }
        // Handle questions (lines starting with numbers)
        else if (/^\d+\./.test(line.trim())) {
          paragraphs.push(new Paragraph({
            children: [new TextRun({ text: line.trim(), size: 14 })],
            spacing: { before: 150, after: 50 }
          }));
        }
        // Handle multiple choice options
        else if (/^\s*[A-D]\./.test(line.trim())) {
          paragraphs.push(new Paragraph({
            children: [new TextRun({ text: `   ${line.trim()}`, size: 14 })],
            spacing: { before: 50, after: 50 }
          }));
        }
        // Handle regular content
        else {
          paragraphs.push(new Paragraph({
            children: [new TextRun({ text: line.trim(), size: 14 })],
            spacing: { after: 80 }
          }));
        }
      });

      if (paragraphs.length === 0) {
        paragraphs.push(new Paragraph({ children: [new TextRun({ text: "", size: 14 })] }));
      }

      return paragraphs;
    };

    // Helper function to parse student content (without answer keys)
    const parseStudentActivityContent = (content: string) => {
      if (!content) {
        return [new Paragraph({ children: [new TextRun({ text: "", size: 14 })] })];
      }

      let studentContent = content.replace(/(Expected Output|Inaasahang Output):.*?(?=\n\n|$)/gis, '');
      studentContent = studentContent.replace(/(Contingency):.*?(?=\n\n|$)/gis, '');
      studentContent = studentContent.replace(/(Answer Key|Susi sa Sagot):.*?(?=\n\n|$)/gis, '');

      const paragraphs: Paragraph[] = [];
      const lines = studentContent.split(/\n+/);
      
      lines.forEach((line) => {
        if (!line.trim()) return;
        
        if (line.includes('Expected Output:') || line.includes('Inaasahang Output:') ||
            line.includes('Contingency:') || line.includes('Answer Key:') || 
            line.includes('Susi sa Sagot:')) {
          return;
        }
        
        if (line.includes('Motivation/Hook:') || line.includes('Learning Activity:') || 
            line.includes('Gawain sa Pagkatuto:') || line.includes('Examples:') ||
            line.includes('Mga Halimbawa:') || line.includes('Quiz:') || 
            line.includes('Pagsusulit:')) {
          paragraphs.push(new Paragraph({
            children: [new TextRun({ text: line.trim(), bold: true, size: 14 })],
            spacing: { before: 200, after: 100 }
          }));
        }
        else if (/^\d+\./.test(line.trim())) {
          paragraphs.push(new Paragraph({
            children: [new TextRun({ text: line.trim(), size: 14 })],
            spacing: { before: 150, after: 50 }
          }));
        }
        else if (/^\s*[A-D]\./.test(line.trim())) {
          paragraphs.push(new Paragraph({
            children: [new TextRun({ text: `   ${line.trim()}`, size: 14 })],
            spacing: { before: 50, after: 50 }
          }));
        }
        else {
          paragraphs.push(new Paragraph({
            children: [new TextRun({ text: line.trim(), size: 14 })],
            spacing: { after: 80 }
          }));
        }
      });

      if (paragraphs.length === 0) {
        paragraphs.push(new Paragraph({ children: [new TextRun({ text: "", size: 14 })] }));
      }

      return paragraphs;
    };

    // Step 4: Generate Teacher DOCX
    console.log("Generating Teacher version DOCX...");
    const teacherDoc = new Document({
      creator: "WeeLMat Generator - Teacher Version",
      title: `WeeLMat Teacher - ${subject} - ${gradeLevel} - ${section}`,
      description: `Weekly Learning Matrix for ${subject}, ${gradeLevel}, Section ${section} - Full Version`,
      sections: [{
        properties: {
          page: {
            margin: { top: 720, right: 720, bottom: 720, left: 720 },
            size: { orientation: PageOrientation.LANDSCAPE },
          },
        },
        children: [
          new Paragraph({
            children: [
              new TextRun({
                text: effectiveLanguage === 'Filipino' ? "Lingguhang Matris ng Pagkatuto (WeeLMat)" : "Weekly Learning Matrix (WeeLMat)",
                bold: true,
                size: 32,
              }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: effectiveLanguage === 'Filipino' 
                  ? `Asignatura: ${subject} | Antas: ${gradeLevel} | Seksyon: ${section}`
                  : `Subject: ${subject} | Grade Level: ${gradeLevel} | Section: ${section}`,
                size: 24,
              }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: effectiveLanguage === 'Filipino' 
                  ? `Petsa na Nasaklaw: ${dateFrom} hanggang ${dateTo}`
                  : `Covered Dates: ${dateFrom} to ${dateTo}`,
                size: 20,
              }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 },
          }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: "", bold: true, size: 18 })] })],
                    width: { size: 15, type: WidthType.PERCENTAGE },
                    borders: { top: { style: BorderStyle.SINGLE, size: 1 }, bottom: { style: BorderStyle.SINGLE, size: 1 }, left: { style: BorderStyle.SINGLE, size: 1 }, right: { style: BorderStyle.SINGLE, size: 1 } },
                  }),
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: effectiveLanguage === 'Filipino' ? "Lunes" : "Monday", bold: true, size: 18 })], alignment: AlignmentType.CENTER })],
                    width: { size: 17, type: WidthType.PERCENTAGE },
                    borders: { top: { style: BorderStyle.SINGLE, size: 1 }, bottom: { style: BorderStyle.SINGLE, size: 1 }, left: { style: BorderStyle.SINGLE, size: 1 }, right: { style: BorderStyle.SINGLE, size: 1 } },
                  }),
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: effectiveLanguage === 'Filipino' ? "Martes" : "Tuesday", bold: true, size: 18 })], alignment: AlignmentType.CENTER })],
                    width: { size: 17, type: WidthType.PERCENTAGE },
                    borders: { top: { style: BorderStyle.SINGLE, size: 1 }, bottom: { style: BorderStyle.SINGLE, size: 1 }, left: { style: BorderStyle.SINGLE, size: 1 }, right: { style: BorderStyle.SINGLE, size: 1 } },
                  }),
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: effectiveLanguage === 'Filipino' ? "Miyerkules" : "Wednesday", bold: true, size: 18 })], alignment: AlignmentType.CENTER })],
                    width: { size: 17, type: WidthType.PERCENTAGE },
                    borders: { top: { style: BorderStyle.SINGLE, size: 1 }, bottom: { style: BorderStyle.SINGLE, size: 1 }, left: { style: BorderStyle.SINGLE, size: 1 }, right: { style: BorderStyle.SINGLE, size: 1 } },
                  }),
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: effectiveLanguage === 'Filipino' ? "Huwebes" : "Thursday", bold: true, size: 18 })], alignment: AlignmentType.CENTER })],
                    width: { size: 17, type: WidthType.PERCENTAGE },
                    borders: { top: { style: BorderStyle.SINGLE, size: 1 }, bottom: { style: BorderStyle.SINGLE, size: 1 }, left: { style: BorderStyle.SINGLE, size: 1 }, right: { style: BorderStyle.SINGLE, size: 1 } },
                  }),
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: effectiveLanguage === 'Filipino' ? "Biyernes" : "Friday", bold: true, size: 18 })], alignment: AlignmentType.CENTER })],
                    width: { size: 17, type: WidthType.PERCENTAGE },
                    borders: { top: { style: BorderStyle.SINGLE, size: 1 }, bottom: { style: BorderStyle.SINGLE, size: 1 }, left: { style: BorderStyle.SINGLE, size: 1 }, right: { style: BorderStyle.SINGLE, size: 1 } },
                  }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: effectiveLanguage === 'Filipino' ? "Kompetensya" : "Competency", bold: true, size: 16 })] })],
                    borders: { top: { style: BorderStyle.SINGLE, size: 1 }, bottom: { style: BorderStyle.SINGLE, size: 1 }, left: { style: BorderStyle.SINGLE, size: 1 }, right: { style: BorderStyle.SINGLE, size: 1 } },
                  }),
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: dailyPlan.Monday.competency, size: 14 })] })],
                    borders: { top: { style: BorderStyle.SINGLE, size: 1 }, bottom: { style: BorderStyle.SINGLE, size: 1 }, left: { style: BorderStyle.SINGLE, size: 1 }, right: { style: BorderStyle.SINGLE, size: 1 } },
                  }),
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: dailyPlan.Tuesday.competency, size: 14 })] })],
                    borders: { top: { style: BorderStyle.SINGLE, size: 1 }, bottom: { style: BorderStyle.SINGLE, size: 1 }, left: { style: BorderStyle.SINGLE, size: 1 }, right: { style: BorderStyle.SINGLE, size: 1 } },
                  }),
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: dailyPlan.Wednesday.competency, size: 14 })] })],
                    borders: { top: { style: BorderStyle.SINGLE, size: 1 }, bottom: { style: BorderStyle.SINGLE, size: 1 }, left: { style: BorderStyle.SINGLE, size: 1 }, right: { style: BorderStyle.SINGLE, size: 1 } },
                  }),
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: dailyPlan.Thursday.competency, size: 14 })] })],
                    borders: { top: { style: BorderStyle.SINGLE, size: 1 }, bottom: { style: BorderStyle.SINGLE, size: 1 }, left: { style: BorderStyle.SINGLE, size: 1 }, right: { style: BorderStyle.SINGLE, size: 1 } },
                  }),
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: dailyPlan.Friday.competency, size: 14 })] })],
                    borders: { top: { style: BorderStyle.SINGLE, size: 1 }, bottom: { style: BorderStyle.SINGLE, size: 1 }, left: { style: BorderStyle.SINGLE, size: 1 }, right: { style: BorderStyle.SINGLE, size: 1 } },
                  }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: effectiveLanguage === 'Filipino' ? "Mungkahing Materyales/Sanggunian" : "Suggested Learning Material/Reference", bold: true, size: 16 })] })],
                    borders: { top: { style: BorderStyle.SINGLE, size: 1 }, bottom: { style: BorderStyle.SINGLE, size: 1 }, left: { style: BorderStyle.SINGLE, size: 1 }, right: { style: BorderStyle.SINGLE, size: 1 } },
                  }),
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: aiJson?.references?.mon || "", size: 14 })] })],
                    borders: { top: { style: BorderStyle.SINGLE, size: 1 }, bottom: { style: BorderStyle.SINGLE, size: 1 }, left: { style: BorderStyle.SINGLE, size: 1 }, right: { style: BorderStyle.SINGLE, size: 1 } },
                  }),
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: aiJson?.references?.tue || "", size: 14 })] })],
                    borders: { top: { style: BorderStyle.SINGLE, size: 1 }, bottom: { style: BorderStyle.SINGLE, size: 1 }, left: { style: BorderStyle.SINGLE, size: 1 }, right: { style: BorderStyle.SINGLE, size: 1 } },
                  }),
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: aiJson?.references?.wed || "", size: 14 })] })],
                    borders: { top: { style: BorderStyle.SINGLE, size: 1 }, bottom: { style: BorderStyle.SINGLE, size: 1 }, left: { style: BorderStyle.SINGLE, size: 1 }, right: { style: BorderStyle.SINGLE, size: 1 } },
                  }),
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: aiJson?.references?.thu || "", size: 14 })] })],
                    borders: { top: { style: BorderStyle.SINGLE, size: 1 }, bottom: { style: BorderStyle.SINGLE, size: 1 }, left: { style: BorderStyle.SINGLE, size: 1 }, right: { style: BorderStyle.SINGLE, size: 1 } },
                  }),
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: aiJson?.references?.fri || "", size: 14 })] })],
                    borders: { top: { style: BorderStyle.SINGLE, size: 1 }, bottom: { style: BorderStyle.SINGLE, size: 1 }, left: { style: BorderStyle.SINGLE, size: 1 }, right: { style: BorderStyle.SINGLE, size: 1 } },
                  }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: effectiveLanguage === 'Filipino' ? "Mga Gawain/Aktividad sa Pagkatuto" : "Learning Activities/Tasks", bold: true, size: 16 })] })],
                    borders: { top: { style: BorderStyle.SINGLE, size: 1 }, bottom: { style: BorderStyle.SINGLE, size: 1 }, left: { style: BorderStyle.SINGLE, size: 1 }, right: { style: BorderStyle.SINGLE, size: 1 } },
                  }),
                  new TableCell({
                    children: parseActivityContentWithAnswerKey(aiJson?.activities?.mon || ""),
                    borders: { top: { style: BorderStyle.SINGLE, size: 1 }, bottom: { style: BorderStyle.SINGLE, size: 1 }, left: { style: BorderStyle.SINGLE, size: 1 }, right: { style: BorderStyle.SINGLE, size: 1 } },
                  }),
                  new TableCell({
                    children: parseActivityContentWithAnswerKey(aiJson?.activities?.tue || ""),
                    borders: { top: { style: BorderStyle.SINGLE, size: 1 }, bottom: { style: BorderStyle.SINGLE, size: 1 }, left: { style: BorderStyle.SINGLE, size: 1 }, right: { style: BorderStyle.SINGLE, size: 1 } },
                  }),
                  new TableCell({
                    children: parseActivityContentWithAnswerKey(aiJson?.activities?.wed || ""),
                    borders: { top: { style: BorderStyle.SINGLE, size: 1 }, bottom: { style: BorderStyle.SINGLE, size: 1 }, left: { style: BorderStyle.SINGLE, size: 1 }, right: { style: BorderStyle.SINGLE, size: 1 } },
                  }),
                  new TableCell({
                    children: parseActivityContentWithAnswerKey(aiJson?.activities?.thu || ""),
                    borders: { top: { style: BorderStyle.SINGLE, size: 1 }, bottom: { style: BorderStyle.SINGLE, size: 1 }, left: { style: BorderStyle.SINGLE, size: 1 }, right: { style: BorderStyle.SINGLE, size: 1 } },
                  }),
                  new TableCell({
                    children: parseActivityContentWithAnswerKey(aiJson?.activities?.fri || ""),
                    borders: { top: { style: BorderStyle.SINGLE, size: 1 }, bottom: { style: BorderStyle.SINGLE, size: 1 }, left: { style: BorderStyle.SINGLE, size: 1 }, right: { style: BorderStyle.SINGLE, size: 1 } },
                  }),
                ],
              }),
            ],
          }),
        ],
      }],
    });

    const teacherDocxBuffer = await Packer.toBuffer(teacherDoc);

    // Step 5: Generate Student DOCX
    console.log("Generating Student version DOCX...");
    const studentDoc = new Document({
      creator: "WeeLMat Generator - Student Version",
      title: `WeeLMat Student - ${subject} - ${gradeLevel} - ${section}`,
      description: `Weekly Learning Matrix for ${subject}, ${gradeLevel}, Section ${section} - Student Version`,
      sections: [{
        properties: {
          page: {
            margin: { top: 720, right: 720, bottom: 720, left: 720 },
            size: { orientation: PageOrientation.LANDSCAPE },
          },
        },
        children: [
          new Paragraph({
            children: [
              new TextRun({
                text: effectiveLanguage === 'Filipino' ? "Lingguhang Matris ng Pagkatuto (WeeLMat) - Para sa Mag-aaral" : "Weekly Learning Matrix (WeeLMat) - Student Copy",
                bold: true,
                size: 32,
              }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: effectiveLanguage === 'Filipino' 
                  ? `Asignatura: ${subject} | Antas: ${gradeLevel} | Seksyon: ${section}`
                  : `Subject: ${subject} | Grade Level: ${gradeLevel} | Section: ${section}`,
                size: 24,
              }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: effectiveLanguage === 'Filipino' 
                  ? `Petsa na Nasaklaw: ${dateFrom} hanggang ${dateTo}`
                  : `Covered Dates: ${dateFrom} to ${dateTo}`,
                size: 20,
              }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 },
          }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: "", bold: true, size: 18 })] })],
                    width: { size: 15, type: WidthType.PERCENTAGE },
                    borders: { top: { style: BorderStyle.SINGLE, size: 1 }, bottom: { style: BorderStyle.SINGLE, size: 1 }, left: { style: BorderStyle.SINGLE, size: 1 }, right: { style: BorderStyle.SINGLE, size: 1 } },
                  }),
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: effectiveLanguage === 'Filipino' ? "Lunes" : "Monday", bold: true, size: 18 })], alignment: AlignmentType.CENTER })],
                    width: { size: 17, type: WidthType.PERCENTAGE },
                    borders: { top: { style: BorderStyle.SINGLE, size: 1 }, bottom: { style: BorderStyle.SINGLE, size: 1 }, left: { style: BorderStyle.SINGLE, size: 1 }, right: { style: BorderStyle.SINGLE, size: 1 } },
                  }),
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: effectiveLanguage === 'Filipino' ? "Martes" : "Tuesday", bold: true, size: 18 })], alignment: AlignmentType.CENTER })],
                    width: { size: 17, type: WidthType.PERCENTAGE },
                    borders: { top: { style: BorderStyle.SINGLE, size: 1 }, bottom: { style: BorderStyle.SINGLE, size: 1 }, left: { style: BorderStyle.SINGLE, size: 1 }, right: { style: BorderStyle.SINGLE, size: 1 } },
                  }),
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: effectiveLanguage === 'Filipino' ? "Miyerkules" : "Wednesday", bold: true, size: 18 })], alignment: AlignmentType.CENTER })],
                    width: { size: 17, type: WidthType.PERCENTAGE },
                    borders: { top: { style: BorderStyle.SINGLE, size: 1 }, bottom: { style: BorderStyle.SINGLE, size: 1 }, left: { style: BorderStyle.SINGLE, size: 1 }, right: { style: BorderStyle.SINGLE, size: 1 } },
                  }),
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: effectiveLanguage === 'Filipino' ? "Huwebes" : "Thursday", bold: true, size: 18 })], alignment: AlignmentType.CENTER })],
                    width: { size: 17, type: WidthType.PERCENTAGE },
                    borders: { top: { style: BorderStyle.SINGLE, size: 1 }, bottom: { style: BorderStyle.SINGLE, size: 1 }, left: { style: BorderStyle.SINGLE, size: 1 }, right: { style: BorderStyle.SINGLE, size: 1 } },
                  }),
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: effectiveLanguage === 'Filipino' ? "Biyernes" : "Friday", bold: true, size: 18 })], alignment: AlignmentType.CENTER })],
                    width: { size: 17, type: WidthType.PERCENTAGE },
                    borders: { top: { style: BorderStyle.SINGLE, size: 1 }, bottom: { style: BorderStyle.SINGLE, size: 1 }, left: { style: BorderStyle.SINGLE, size: 1 }, right: { style: BorderStyle.SINGLE, size: 1 } },
                  }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: effectiveLanguage === 'Filipino' ? "Kompetensya" : "Competency", bold: true, size: 16 })] })],
                    borders: { top: { style: BorderStyle.SINGLE, size: 1 }, bottom: { style: BorderStyle.SINGLE, size: 1 }, left: { style: BorderStyle.SINGLE, size: 1 }, right: { style: BorderStyle.SINGLE, size: 1 } },
                  }),
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: dailyPlan.Monday.competency, size: 14 })] })],
                    borders: { top: { style: BorderStyle.SINGLE, size: 1 }, bottom: { style: BorderStyle.SINGLE, size: 1 }, left: { style: BorderStyle.SINGLE, size: 1 }, right: { style: BorderStyle.SINGLE, size: 1 } },
                  }),
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: dailyPlan.Tuesday.competency, size: 14 })] })],
                    borders: { top: { style: BorderStyle.SINGLE, size: 1 }, bottom: { style: BorderStyle.SINGLE, size: 1 }, left: { style: BorderStyle.SINGLE, size: 1 }, right: { style: BorderStyle.SINGLE, size: 1 } },
                  }),
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: dailyPlan.Wednesday.competency, size: 14 })] })],
                    borders: { top: { style: BorderStyle.SINGLE, size: 1 }, bottom: { style: BorderStyle.SINGLE, size: 1 }, left: { style: BorderStyle.SINGLE, size: 1 }, right: { style: BorderStyle.SINGLE, size: 1 } },
                  }),
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: dailyPlan.Thursday.competency, size: 14 })] })],
                    borders: { top: { style: BorderStyle.SINGLE, size: 1 }, bottom: { style: BorderStyle.SINGLE, size: 1 }, left: { style: BorderStyle.SINGLE, size: 1 }, right: { style: BorderStyle.SINGLE, size: 1 } },
                  }),
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: dailyPlan.Friday.competency, size: 14 })] })],
                    borders: { top: { style: BorderStyle.SINGLE, size: 1 }, bottom: { style: BorderStyle.SINGLE, size: 1 }, left: { style: BorderStyle.SINGLE, size: 1 }, right: { style: BorderStyle.SINGLE, size: 1 } },
                  }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: effectiveLanguage === 'Filipino' ? "Mga Gawain/Aktividad sa Pagkatuto" : "Learning Activities/Tasks", bold: true, size: 16 })] })],
                    borders: { top: { style: BorderStyle.SINGLE, size: 1 }, bottom: { style: BorderStyle.SINGLE, size: 1 }, left: { style: BorderStyle.SINGLE, size: 1 }, right: { style: BorderStyle.SINGLE, size: 1 } },
                  }),
                  new TableCell({
                    children: parseStudentActivityContent(aiJson?.activities?.mon || ""),
                    borders: { top: { style: BorderStyle.SINGLE, size: 1 }, bottom: { style: BorderStyle.SINGLE, size: 1 }, left: { style: BorderStyle.SINGLE, size: 1 }, right: { style: BorderStyle.SINGLE, size: 1 } },
                  }),
                  new TableCell({
                    children: parseStudentActivityContent(aiJson?.activities?.tue || ""),
                    borders: { top: { style: BorderStyle.SINGLE, size: 1 }, bottom: { style: BorderStyle.SINGLE, size: 1 }, left: { style: BorderStyle.SINGLE, size: 1 }, right: { style: BorderStyle.SINGLE, size: 1 } },
                  }),
                  new TableCell({
                    children: parseStudentActivityContent(aiJson?.activities?.wed || ""),
                    borders: { top: { style: BorderStyle.SINGLE, size: 1 }, bottom: { style: BorderStyle.SINGLE, size: 1 }, left: { style: BorderStyle.SINGLE, size: 1 }, right: { style: BorderStyle.SINGLE, size: 1 } },
                  }),
                  new TableCell({
                    children: parseStudentActivityContent(aiJson?.activities?.thu || ""),
                    borders: { top: { style: BorderStyle.SINGLE, size: 1 }, bottom: { style: BorderStyle.SINGLE, size: 1 }, left: { style: BorderStyle.SINGLE, size: 1 }, right: { style: BorderStyle.SINGLE, size: 1 } },
                  }),
                  new TableCell({
                    children: parseStudentActivityContent(aiJson?.activities?.fri || ""),
                    borders: { top: { style: BorderStyle.SINGLE, size: 1 }, bottom: { style: BorderStyle.SINGLE, size: 1 }, left: { style: BorderStyle.SINGLE, size: 1 }, right: { style: BorderStyle.SINGLE, size: 1 } },
                  }),
                ],
              }),
            ],
          }),
        ],
      }],
    });

    const studentDocxBuffer = await Packer.toBuffer(studentDoc);

    // Step 6: Upload to storage
    const matrixId = matrixData.id;
    const teacherFilename = `weelmat-teacher-${matrixId}.docx`;
    const studentFilename = `weelmat-student-${matrixId}.docx`;

    console.log("Uploading Teacher DOCX...");
    const { error: teacherUploadError } = await supabase.storage
      .from("weelmat")
      .upload(teacherFilename, teacherDocxBuffer, {
        contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        upsert: true,
      });

    if (teacherUploadError) {
      console.error("Teacher DOCX upload error:", teacherUploadError);
      return new Response(
        JSON.stringify({ error: "Failed to upload teacher DOCX", details: teacherUploadError }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Uploading Student DOCX...");
    const { error: studentUploadError } = await supabase.storage
      .from("weelmat")
      .upload(studentFilename, studentDocxBuffer, {
        contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        upsert: true,
      });

    if (studentUploadError) {
      console.error("Student DOCX upload error:", studentUploadError);
      return new Response(
        JSON.stringify({ error: "Failed to upload student DOCX", details: studentUploadError }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: teacherUrlData } = supabase.storage.from("weelmat").getPublicUrl(teacherFilename);
    const { data: studentUrlData } = supabase.storage.from("weelmat").getPublicUrl(studentFilename);

    const teacherDocxUrl = teacherUrlData.publicUrl;
    const studentDocxUrl = studentUrlData.publicUrl;

    console.log("WeeLMat generation complete. Teacher URL:", teacherDocxUrl);
    console.log("WeeLMat generation complete. Student URL:", studentDocxUrl);

    // Update matrix record with URLs
    await supabase
      .from("weelmat_matrices")
      .update({
        docx_url: teacherDocxUrl,
        student_docx_url: studentDocxUrl,
      })
      .eq("id", matrixId);

    return new Response(
      JSON.stringify({
        id: matrixId,
        aiJson,
        docxUrl: teacherDocxUrl,
        studentDocxUrl: studentDocxUrl,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Edge function error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

import { OpenAI } from "openai";
import JSON5 from "json5";

async function cgptRequest(request: {
  userPrompt?: string;
  systemPrompt: string;
  function?: any;
  useHigherContext?: boolean;
}) {
  // dont think you need to change anything in this function
  const openai = new OpenAI({

    apiKey: process.env.OPENAI_API_KEY,
  });

  const messages = [
    {
      role: "system" as "system" | "user",
      content: request.systemPrompt,
    },
  ];
  let model = "gpt-3.5-turbo";
  if (request.userPrompt) {
    if (request.userPrompt.length > 13000) {
      model = "gpt-3.5-turbo-16k";
    }
    messages.push({ role: "user", content: request.userPrompt });
  }
  if (request.useHigherContext) {
    model = "gpt-3.5-turbo-16k";
  }
  try {
    const completion = await openai.chat.completions.create({
      messages: messages,
      model,
      ...(request.function
        ? {
          functions: [request.function],
          function_call: { name: request.function.name },
        }
        : {}),
    });
    let result: string | undefined | null = null;
    if (request.function) {
      result = completion.choices[0]?.message.function_call?.arguments;
    } else {
      result = completion.choices[0]?.message.content;
    }

    console.log(
      `OpenAI model used: ${completion.model
      }.\nOpenAI response tokens: ${JSON.stringify(completion.usage)}`
    );

    if (!result) {
      throw new Error("Unable to respond to request");
    }
    return result;
  } catch (err: any) {
    console.log(err?.response?.data?.message ?? "Unable to respond to request");
    // throw new HttpsError("unknown", "Unable to analyse text with AI");
  }
}

export async function analyzeTranscript(params: { transcript: string }) {
  // you only need to change the code in this function
  if (!params.transcript) {
    return {
      summary: "Not enough content to summarize",
      keyPoints: "None",
      recommendations: "None",
    };
  }
  const systemPrompt = `Analyze the transcript`;
  const functionPrompt = {
    name: "analyze_transcript",
    description: "Analysis of the information from the phone call transcript",
    parameters: {
      type: "object",
      properties: {
        summary: {
          type: "string",
          description: `Summarize the transcript. The purpose of summaries is to gather key basic information about the circumstances 
          of the interview and give a concise guide to its contents. Summaries need to include 
          names, places, events and topics appearing in each interview, with indications of how 
          substantial the reference is and where in the course of the interview the reference 
          appears. 

          here is an example of a transcript:


          B: So, what sort of toilet facilities did they have at school? 
          A: 
          They were in the school yard. There was a row of them. There was one kept locked for the 
          staff. There was the girls' side and then there was a high wall and then there was the boys' 
          side, and of course, they were, they had the men come and empty the pans once a week. 
          B: When you say "empty the pans"… 
          A: Never conscious of it being done but it was always done. 
          B: What sort of pans were these? 
          A: Well, they were metal pans into wooden seats, you see. 
          B: So, each toilet…? 
          A: Had a wooden seat and metal pan. 
          B: Can you … 
          A: No chains or anything. 
          B: Can you remember what they were like to use? 
          A: Horrible. Well, I thought they were. 
          B: Was that very different to what you had at home? What sort of toilet did you have at home? 
          A: Oh no, we had the same thing at home! Oh yes. Lovely white seat because my sister and I 
          used to scrub it. 
          B: What happened to the pan at home? 
          A: My father emptied that. That went down the fields. 
          B: Did it? 
          A: Buried. So we never had an accumulation, it was always kept very nice. 
          B: So, the school ones weren't, you said they weren't, you didn't like using them? 
          A: I didn't like it but then I was a bit finicky anyway.

          here is the summary: 
         

          Cleaning School : Describes school cleaning. One piano for three classes. No central heating. Coal 
          fire and guard. Later, a stove. Big boiler at side of school. Grandfather stoked 
          boiler. Grandma cleaned school Friday night. Recalls helping to clean brass taps on washbasins; grandma gave her 6d for helping.  

          School Toilets: Describes toilets in schoolyard—one locked for staff. Men emptied the pans 
          (metal pans/wooden seats) once a week. Horrible to use. Had same at home—but 
          lovely white seat—father buried contents in fields. Was “a bit finicky”.
          `,
          // description: "Summary of the transcript.",
        },
        keyPoints: {
          type: "string",
          description: "Key points of the transcript.",
        },
        recommendations: {
          type: "string",
          description:
            "The recommended actions the participants of the phone call should perform.",
        },
      },
      required: ["summary", "keyPoints", "recommendations"],
    },
  };
  let result: string | undefined = "";
  try {
    result = await cgptRequest({
      userPrompt: params.transcript,
      systemPrompt,
      function: functionPrompt,
    });
  } catch (err) {
    result = await cgptRequest({
      userPrompt: params.transcript,
      systemPrompt,
      function: functionPrompt,
      useHigherContext: true,
    });
  }

  try {
    if (!result) {
      throw new Error("Unable to respond to request");
    }
    return JSON5.parse(result) as {
      summary: string;
      keyPoints: string;
      recommendations: string;
    };
  } catch (err) {
    console.log("Error parsing JSON5: " + result);
    return {
      summary: result,
      keyPoints: "None",
      recommendations: "None",
    };
  }
}

async function main() {
  console.log("Running main");
  // test with different transcripts
  //   const transcript = `A: Hello, how are you?
  // B: I'm good, how are you?
  // A: I'm good.
  // B: That's good.
  // A: Yes.
  // B: No.
  // A: Maybe.
  // B: I don't know.
  // A: Okay.
  // B: Bye.`;
  const transcript = `A: There were, there was the infants' room. Next to that was the middle one, school, and then 
                         you went up into the next one, which was, into the next room, which was divided by a 
                         screen. That was all that it was. Just a screen across the… 
                      B: What was the… 
                      A: So if the headmaster shouted while we were in this class you could hear every word of what 
                         he was saying. Anybody got the cane, you could hear it. 
                      B: What was the dividing wall for, or screen for? 
                      A: Well, it was so that if there was an assembly of any kind, it could be opened but it didn't 
                         happen very often, only when the school was hired for the village, local village show or 
                         something like that. We had one piano for those three classes and of course there were no 
                         central heating then and we had a coal fire in the, with a guard round it. Then it eventually 
                         got to a stove, and I think before I left school, the school, I think all that was done away with 
                         and it was central heating then. But the other heat was from a big boiler at the side of the 
                         school which my grandfather used to stoke morning and evening, and that kept the hot water 
                         going. And on Friday nights my grandma had to clean the school thoroughly and we used to 
                         go, my sister and I, and they were brass taps on the wash basins, and we used to go and 
                         polish the brass taps for her and do all the wash basins and she used to give us sixpence each 
                         for doing that. `

  // this is exactly how the function will be called in the cloud function
  // Dont change the below lines
  const result = await analyzeTranscript({ transcript });
  console.log(JSON.stringify(result, null, 2));
}

main();

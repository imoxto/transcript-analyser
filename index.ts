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

          here are some examples:

          Transcription 1
          A: Good morning, Mr. Smith. I hope you're doing well. I wanted to
             follow up with you regarding the roofing project. Has the insurance adjuster reached out to
             schedule an inspection yet?
          B: Good morning! Thanks for checking in. Yes, the adjuster called me yesterday.
             They're planning to come by next Tuesday to inspect the damage.
          A: That's great to hear. It's important that we coordinate closely with the adjuster to ensure
             that all damages are properly documented. Would it be possible for me or one of our team
             members to be present during the inspection? It can be helpful to have someone
             knowledgeable about roofing there to answer any questions or provide clarity.
          B: I think that's a good idea. I'm not too familiar with roofing specifics, so having an
             expert there would be beneficial. What time works best for you?
          A: I appreciate that, Mr. Smith. I can be there at 10 a.m. on Tuesday. Does that align with the
             adjuster's scheduled time?
          B: Yes, they mentioned they'd be here around 10:30 a.m., so that should work perfectly.
          A: Excellent! I'll make sure to be there a bit early to discuss any preliminary concerns with
             you before the adjuster arrives. In the meantime, if you have any questions or need further
             information, please don't hesitate to reach out.
          B: Thank you for being so proactive. I'll see you next Tuesday, then.
          A: Absolutely, Mr. Smith. We're here to ensure the process goes smoothly for you. See you
             next week!
          

          Here is the summary for transcript 1: 

          The roofing salesperson reached out to Mr. Smith to inquire if the insurance adjuster had
scheduled an inspection for the roofing project. Mr. Smith confirmed that the adjuster would be
coming next Tuesday around 10:30 a.m. The salesperson offered to be present during the
inspection to provide expertise, and they agreed to meet slightly before the adjuster's arrival.
          `,
          // description: "Summary of the transcript.",
        },
        keyPoints: {
          type: "string",
          description: `Key points of the transcript.
          Here are some examples:

          Transcription 1
          A: Good morning, Mr. Smith. I hope you're doing well. I wanted to
             follow up with you regarding the roofing project. Has the insurance adjuster reached out to
             schedule an inspection yet?
          B: Good morning! Thanks for checking in. Yes, the adjuster called me yesterday.
             They're planning to come by next Tuesday to inspect the damage.
          A: That's great to hear. It's important that we coordinate closely with the adjuster to ensure
             that all damages are properly documented. Would it be possible for me or one of our team
             members to be present during the inspection? It can be helpful to have someone
             knowledgeable about roofing there to answer any questions or provide clarity.
          B: I think that's a good idea. I'm not too familiar with roofing specifics, so having an
             expert there would be beneficial. What time works best for you?
          A: I appreciate that, Mr. Smith. I can be there at 10 a.m. on Tuesday. Does that align with the
             adjuster's scheduled time?
          B: Yes, they mentioned they'd be here around 10:30 a.m., so that should work perfectly.
          A: Excellent! I'll make sure to be there a bit early to discuss any preliminary concerns with
             you before the adjuster arrives. In the meantime, if you have any questions or need further
             information, please don't hesitate to reach out.
          B: Thank you for being so proactive. I'll see you next Tuesday, then.
          A: Absolutely, Mr. Smith. We're here to ensure the process goes smoothly for you. See you
             next week!
          

          Here are the key points for transcript 1: 

          ● Roofing salesperson inquired about the insurance adjuster's inspection schedule.
          ● Mr. Smith confirmed the adjuster's visit for next Tuesday at 10:30 a.m.
          ● Salesperson offered to be present during the inspection for expertise.
          ● They agreed to meet before the adjuster's arrival.
          ● Schedule the Date: Mark the date and time (next Tuesday, around 10 a.m.) in the
          calendar or scheduling system.
          ● Prepare Documentation: Gather any relevant roofing project details, past assessments,
          or proposals to have on hand during the inspection.
          
          `,
        },
        recommendations: {
          type: "string",
          description:
            `The recommended actions the participants of the phone call should perform.
            Here are some examples:

          Transcription 1
          A: Good morning, Mr. Smith. I hope you're doing well. I wanted to
             follow up with you regarding the roofing project. Has the insurance adjuster reached out to
             schedule an inspection yet?
          B: Good morning! Thanks for checking in. Yes, the adjuster called me yesterday.
             They're planning to come by next Tuesday to inspect the damage.
          A: That's great to hear. It's important that we coordinate closely with the adjuster to ensure
             that all damages are properly documented. Would it be possible for me or one of our team
             members to be present during the inspection? It can be helpful to have someone
             knowledgeable about roofing there to answer any questions or provide clarity.
          B: I think that's a good idea. I'm not too familiar with roofing specifics, so having an
             expert there would be beneficial. What time works best for you?
          A: I appreciate that, Mr. Smith. I can be there at 10 a.m. on Tuesday. Does that align with the
             adjuster's scheduled time?
          B: Yes, they mentioned they'd be here around 10:30 a.m., so that should work perfectly.
          A: Excellent! I'll make sure to be there a bit early to discuss any preliminary concerns with
             you before the adjuster arrives. In the meantime, if you have any questions or need further
             information, please don't hesitate to reach out.
          B: Thank you for being so proactive. I'll see you next Tuesday, then.
          A: Absolutely, Mr. Smith. We're here to ensure the process goes smoothly for you. See you
             next week!
          

             Here are some recomended actions for transcript 1:

             ● Calendar Alert: Set a reminder for 10 a.m. next Tuesday, with a 30-minute prior alert.
             ● Compile Project Notes: Retrieve past notes and assessments related to Mr. Smith's
             project.
             ● Brief Team: Update team members on the inspection and gather necessary
             materials/tools.
             ● Review Insurance Notes: Revisit details from past discussions about Mr. Smith's
             insurance.
             ● List Talking Points: Note key topics for the pre-inspection chat with Mr. Smith.
             ● Set Monday Reminder: Schedule a quick review for Monday evening to ensure
             readiness.
             ● Check-in with Client: Send a brief text or email to Mr. Smith confirming Tuesday's plans.`,
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

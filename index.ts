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
          description: `Summarize the transcript.`,
          // description: "Summary of the transcript.",
        },
        keyPoints: {
          type: "string",
          description: `Key points of the transcript.`,
        },
        recommendations: {
          type: "string",
          description:
            `The recommended actions the participants of the phone call should perform.`,
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

  const transcript = `A: Hey sweetie! How's college life treating you?
  B: Oh, Mom! It's been such a whirlwind. I've made some great friends, and my literature
  class? Absolutely fascinating. We're diving into some classic novels I've never read before.
  A: That sounds wonderful! I always knew you'd thrive in college. Have you been managing
  to get enough sleep though? And eating well?
  B: Mostly! Though, I admit, I've had a few too many late-night pizza runs with my
  roommate, Jenna. She's from New York and insists she knows all the best pizza spots around.
  A: (laughs) Well, as long as it's not every night. Speaking of food, have you thought about
  when you're coming home for Thanksgiving? Your father and I are planning the dinner.
  B: I've been looking at the train schedules. I think I can get a ticket for the Wednesday
  afternoon before Thanksgiving. That way, I'll be home by evening.
  A: Perfect! Oh, and since you've become quite the cook at college, how about you make one
  of the dishes for dinner? Your grandmother always loved it when the family contributed.
  B: Really? I'd love to! Jenna taught me this amazing vegan pumpkin pie recipe. It's a
  twist on the classic, but I think everyone will love it.
  A: Vegan pumpkin pie? Now that's something new for our table! I'm excited to try it. Just
  send me the ingredients you'll need, and I'll have everything ready.
  B: Will do, Mom. I can't wait to be home and see everyone. College is fun, but I've
  missed you all.
  A: We've missed you too, darling. But I'm glad you're enjoying yourself. Just remember to
  study amidst all the fun, okay?
  B: I promise, Mom. Talk to you soon. Love you!
   `

  // this is exactly how the function will be called in the cloud function
  // Dont change the below lines
  const result = await analyzeTranscript({ transcript });
  console.log(JSON.stringify(result, null, 2));
}

main();

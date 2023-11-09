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
      `OpenAI model used: ${
        completion.model
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
  const functionPrompt = {
    name: "analyze_transcript",
    description: "Analysis of the information from the phone call transcript",
    parameters: {
      type: "object",
      properties: {
        summary: {
          type: "string",
          description: "Summary of the transcript.",
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
      systemPrompt: "Analyze the transcript",
      function: functionPrompt,
    });
  } catch (err) {
    result = await cgptRequest({
      userPrompt: params.transcript,
      systemPrompt: "Analyze the transcript",
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
  const transcript = `A: Hello, how are you?
B: I'm good, how are you?
A: I'm good.
B: That's good.
A: Yes.
B: No.
A: Maybe.
B: I don't know.
A: Okay.
B: Bye.`;
  // this is exactly how the function will be called in the cloud function
  // Dont change the below lines
  const result = await analyzeTranscript({ transcript });
  console.log(JSON.stringify(result, null, 2));
}

main();

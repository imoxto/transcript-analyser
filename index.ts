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
          names, places, events, dates, times, monetary amount and topics appearing in each interview, with indications of how 
          substantial the reference is and where in the course of the interview the reference 
          appears.`,
          // description: "Summary of the transcript.",
        },
        keyPoints: {
          type: "string",
          description: `Give me the key points of the transcript. The key points need to include 
          names, places, events, dates, times, monetary amount and topics appearing in each interview, with indications of how 
          substantial the reference is and where in the course of the interview the reference 
          appears.`,
        },
        recommendations: {
          type: "string",
          description:
            `Give me recommended actions the participants of the phone call should perform. The key points need to remind the  
             the the participants to set reminders for certain time and dates from the transcript. 
             Analyze the transcript and infer the goals of the speakers and recommend actions that will help the user achieve those goals.`,
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

  const transcript = `C: Good morning! It's great to see you again. I hope you're doing well today.

  CL: Morning! Yes, I'm quite excited to discuss the renovation plans. I've been looking forward to this.
  
  C: Wonderful. Let's start by reviewing the scope of the project based on our last conversation. You're looking to renovate the kitchen, the master bathroom, and the living room, correct?
  
  CL: That's right. The kitchen and the bathroom are my top priorities, but I'd love to hear your ideas for the living room as well.
  
  C: Absolutely. For the kitchen, you mentioned wanting to go for a modern look with an emphasis on space and light. We've prepared some designs that include white quartz countertops, sleek cabinetry, and a central island with a built-in sink and dishwasher.
  
  CL: Oh, that sounds lovely. I like the idea of a central island. It would be a great place for the family to gather around. What about the lighting?
  
  C: We're thinking of installing recessed LED lights for a clean look, along with pendant lights over the island for a stylish accent. Plus, under-cabinet lighting to illuminate the countertops.
  
  CL: Perfect. I like that. And the cabinets?
  
  C: We've selected a high-gloss finish for the cabinets, which not only looks contemporary but also reflects light to make the space appear larger. We can also incorporate soft-close hinges to add a touch of luxury.
  
  CL: I love that. It's the little details that really make a difference. Now, what about the bathroom?
  
  C: For the master bathroom, we're proposing a walk-in shower with frameless glass doors and a rainfall showerhead. We can add a double vanity with marble countertops and heated floors for those cold mornings.
  
  CL: Heated floors sound amazing. And I've always wanted a rainfall showerhead. What about storage in the bathroom?
  
  C: We can build a custom linen closet with plenty of shelves and drawers. Additionally, we can include a built-in medicine cabinet with a mirror that has hidden storage behind it.
  
  CL: That would be very useful. Now, regarding the living room, I'm not sure what I want yet.
  
  C: The living room is a space where you can really express your style. We can start with a fresh coat of paint and perhaps consider built-in bookshelves or a new fireplace mantle to add character.
  
  CL: I do like the idea of built-in bookshelves. They would provide a place to display my book collection and some family photos.
  
  C: Exactly. And for the fireplace, we can use natural stone to create a focal point in the room. It would complement the bookshelves nicely.
  
  CL: That sounds wonderful. I'm also thinking about the furniture and decor. What are your thoughts on that?
  
  C: We have an excellent interior designer who can help you select furniture that is both comfortable and stylish. They can also assist with choosing color schemes and accessories to tie the whole room together.
  
  CL: I would appreciate that. I want the space to feel cohesive.
  
  C: Definitely. We'll make sure the design flows well from one room to the next. Now, in terms of timeline, we're looking at about three months to complete all the renovations, assuming we don't run into any unforeseen issues.
  
  CL: Three months sounds reasonable. What about the budget?
  
  C: Based on the materials and labor for the renovations we've discussed, you're looking at approximately $50,000. This includes all the high-end finishes and appliances for the kitchen, the bathroom upgrades, and the living room enhancements.
  
  CL: That's within the range I was expecting. Can you provide a detailed quote?
  
  C: Of course. I'll have my office send over an itemized quote by tomorrow afternoon. It will break down the costs for materials, labor, design fees, and any additional expenses.
  
  CL: Great. I'd also like to discuss the possibility of eco-friendly materials and appliances.
  
  C: Absolutely. We can source sustainable materials for the cabinetry and flooring, and choose energy-efficient appliances. It might increase the budget slightly, but it will save you money in the long run on utility bills.
  
  CL: That's important to me. I'm willing to invest a bit more for sustainability.
  
  C: Understood. I'll make sure to include those options in the quote. Now, do you have any other questions or concerns?
  
  CL: Not at the moment. I think we've covered everything for now.
  
  C: Excellent. Once you receive the quote, let's schedule a time to go over it together. You can ask any questions you might have, and we can make adjustments as needed.
  
  CL: Sounds good. I'm really looking forward to seeing everything come together.
  
  C: As are we. We're committed to making your vision a reality. Thank you for trusting us with your home.
  
  CL: Thank you for your time and expertise. I'll look out for the quote.
  
  C: You're welcome. Have a great day, and we'll talk soon.
  
  CL: You too. Goodbye.
  
  C: Goodbye.`

  // this is exactly how the function will be called in the cloud function
  // Dont change the below lines
  const result = await analyzeTranscript({ transcript });
  console.log(JSON.stringify(result, null, 2));
}

main();

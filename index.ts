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
                    
          Transcription 2

          A: 	Good afternoon, class. Today, we'll delve into a niche yet incredibly impactful area of
          marketing: targeting university students. This demographic, often aged between 18 to 24, is
          unique, tech-savvy, and on the cusp of forming brand loyalties that can last a lifetime.
          Understanding the demographic is crucial. University students are digital natives, having grown
          up in the digital age. They're accustomed to online interactions, which makes them highly
          receptive to digital marketing campaigns. With often limited budgets, these students are always
          on the lookout for deals, discounts, and value propositions. Additionally, this generation is moresocially and environmentally aware than its predecessors. Brands that showcase sustainability
          or social responsibility tend to resonate more with them.
          When considering platforms to reach this audience, social media stands out. Platforms like
          Instagram, TikTok, and Snapchat are particularly popular among this age group. Tailoring
          content to these platforms can yield significant engagement. Another effective strategy is
          influencer collaborations. Partnering with student influencers can offer brands an authentic
          endorsement that their peers trust. Furthermore, direct collaborations with university clubs,
          societies, or events can provide a direct and impactful access point to the student community.
          One of the most important things to remember when marketing to this group is the importance
          of authenticity. Students today can easily detect inauthentic marketing and are quick to call it
          out. Brands need to be genuine in their messaging and ensure they uphold any promises made.
          Instead of hard selling, brands should focus on creating engaging content. Content that
          educates, entertains, or resonates on an emotional level tends to be more effective than overt
          sales pitches.
          Lastly, given the ever-evolving nature of the student demographic, it's essential for brands to
          seek regular feedback and be adaptable. Methods like surveys or focus groups can be
          invaluable in helping brands stay relevant and in tune with student needs and preferences.
          A: 	In conclusion, marketing to university students requires a blend of authenticity,
          understanding of their unique characteristics, and adaptability. Brands that can effectively
          engage this demographic stand to not only gain loyal customers during their university years but
          potentially for decades to come. Tomorrow, we'll look into some case studies of brands that
          have successfully cracked this market. Until then, happy studying!
          
          Summary for transcript 2:
          Marketing to University Students: Essentials
          University students, aged 18-24, are digital natives keen on forming brand loyalties. They value
          online engagement, seek deals, and resonate with socially responsible brands. Effective
          engagement platforms include Instagram, TikTok, and Snapchat, with student influencer
          collaborations offering genuine endorsements. Authenticity in brand messaging is crucial, with a
          focus on content that educates or entertains. Continuous feedback, through tools like surveys,
          ensures brands stay aligned with evolving student preferences.

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
          
          Transcription 2

          A: 	Good afternoon, class. Today, we'll delve into a niche yet incredibly impactful area of
          marketing: targeting university students. This demographic, often aged between 18 to 24, is
          unique, tech-savvy, and on the cusp of forming brand loyalties that can last a lifetime.
          Understanding the demographic is crucial. University students are digital natives, having grown
          up in the digital age. They're accustomed to online interactions, which makes them highly
          receptive to digital marketing campaigns. With often limited budgets, these students are always
          on the lookout for deals, discounts, and value propositions. Additionally, this generation is moresocially and environmentally aware than its predecessors. Brands that showcase sustainability
          or social responsibility tend to resonate more with them.
          When considering platforms to reach this audience, social media stands out. Platforms like
          Instagram, TikTok, and Snapchat are particularly popular among this age group. Tailoring
          content to these platforms can yield significant engagement. Another effective strategy is
          influencer collaborations. Partnering with student influencers can offer brands an authentic
          endorsement that their peers trust. Furthermore, direct collaborations with university clubs,
          societies, or events can provide a direct and impactful access point to the student community.
          One of the most important things to remember when marketing to this group is the importance
          of authenticity. Students today can easily detect inauthentic marketing and are quick to call it
          out. Brands need to be genuine in their messaging and ensure they uphold any promises made.
          Instead of hard selling, brands should focus on creating engaging content. Content that
          educates, entertains, or resonates on an emotional level tends to be more effective than overt
          sales pitches.
          Lastly, given the ever-evolving nature of the student demographic, it's essential for brands to
          seek regular feedback and be adaptable. Methods like surveys or focus groups can be
          invaluable in helping brands stay relevant and in tune with student needs and preferences.
          A: 	In conclusion, marketing to university students requires a blend of authenticity,
          understanding of their unique characteristics, and adaptability. Brands that can effectively
          engage this demographic stand to not only gain loyal customers during their university years but
          potentially for decades to come. Tomorrow, we'll look into some case studies of brands that
          have successfully cracked this market. Until then, happy studying!
          
          Key Points:
          ● Digital Natives: Students aged 18-24 are tech-savvy and forming brand loyalties.
          ● Online Engagement: They prefer and respond well to digital interactions.
          ● Value Seekers: Students are always on the lookout for deals and discounts.
          ● Social Responsibility: They resonate with brands promoting sustainability and social
          causes.
          ● Top Platforms: Instagram, TikTok, and Snapchat are essential for engagement.
          ● Influencer Collaborations: Partnering with student influencers provides genuine brand
          endorsements.
          ● Authentic Messaging: Brands must be genuine and avoid overt selling.
          ● Content Strategy: Focus on content that educates, entertains, or emotionally connects.
          ● Feedback is Key: Regular surveys or feedback mechanisms ensure alignment with
          student preferences.

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
             ● Check-in with Client: Send a brief text or email to Mr. Smith confirming Tuesday's plans.
             
            `,
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

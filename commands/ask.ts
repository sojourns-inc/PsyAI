// @ts-nocheck
import Discord from 'discord.js';
import { SlashCommandBuilder } from "@discordjs/builders";
import rp from 'request-promise';
import { sanitizeSubstanceName } from '../include/sanitize-substance-name.js';
import stripeLib from 'stripe';
import { createClient } from '@supabase/supabase-js'

// Initialize Supabase client
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const supabase = createClient(SUPABASE_URL as string, SUPABASE_KEY as string);

// Create a Stripe client
const stripe = new stripeLib(process.env.STRIPE_API_KEY as string, { typescript: true, apiVersion: '2023-08-16' });

async function getUserAssociation(discordUserId: string) {
  try {
    const { data, error } = await supabase
      .from('user_association')
      .select('*')
      .eq('discord_id', discordUserId)
      .single();

    if (error) {
      console.error(error);
      return null;
    }

    return data;
  } catch (error) {
    console.error(`Error fetching user association: ${error}`);
    return null;
  }
}

async function checkStripeSub(discordUserId: string) {
  const user_association = await getUserAssociation(discordUserId);
  return user_association?.subscription_status || false;
}

async function startSubscription(discordUserId: string) {
  const checkoutSession = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    line_items: [
      {
        price: process.env.STRIPE_PLAN_ID,
        quantity: 1,
      },
    ],
    mode: "subscription",
    metadata: { discord_id: discordUserId },
    success_url: "https://psyai-patreon-linker-97bd2997eae8.herokuapp.com/success",
    cancel_url: "https://psyai-patreon-linker-97bd2997eae8.herokuapp.com/cancel",
  });

  // Payment URL
  return checkoutSession.url;
}

const postAndParseURL = async (url: string, payload: any) => {
  try {
    const options = {
      method: 'POST',
      uri: url,
      headers: { "Openai-Api-Key": process.env.OPENAI_API_KEY, "Authorization": `Bearer ${process.env.BEARER_TOKEN}` },
      body: payload,
      json: true // Automatically stringifies the body to JSON
    };
  
    const responseData = await rp(options);
    return {data: responseData}
  } catch (error) {
    console.error(`Error in postAndParseURL: ${error}`);
    return null;
  }
}

const fetchDoseCardFromPsyAI = async (substanceName: string, chatId: string) => {
  try {
    const raw = {
      "model": process.env.LLM_MODEL_ID,
      "question": `${substanceName}\n\n(Please respond in a conversational manner. If the context doesn't have specific information about the query, you can say something like 'I'm not sure, but...' or 'I don't have that information, however...'. Please limit your response to 2000 characters max.)`,
      "temperature": "0.5",
      "max_tokens": 1000,
    };
  

    return postAndParseURL(`${process.env.BRAIN_BASE_URL}/chat/` + chatId + "/question", raw)
  } catch (error) {
    console.error(`Error in fetchDoseCardFromPsyAI: ${error}`);
    return null;
  }
}

const fetchNewChatIdFromPsyAI = async (substanceName: string) => {
  try {
    const raw = {
      "name": "Card => " + substanceName
    }

    return postAndParseURL(`${process.env.BRAIN_BASE_URL}/chat`, raw);
  } catch (error) {
    console.error(`Error in fetchNewChatIdFromPsyAI: ${error}`);
    return null;
  }
}

export const applicationCommandData = new SlashCommandBuilder()
  .setName("ask")
  .setDescription("Ask me anything drug-related.")
  .addStringOption(option => option
    .setName("query")
    .setDescription("The question you'd like to ask")
    .setRequired(true))
  .toJSON() as unknown as Discord.ApplicationCommandData;

export async function performInteraction(interaction: Discord.CommandInteraction) {
  try {

    const discordUserId = interaction.user.id;
    // Check if the user has an active subscription
    if (!(await checkStripeSub(discordUserId))) {
      const paymentUrl = await startSubscription(discordUserId);
      await interaction.user.send(`Hi there, friend!\n\nThat command requires an active subscription.\n\nSupport the devs today, for only $12.40 per YEAR!  ૮₍ ˶ᵔ ᵕᵔ˶₎ა  >[Subscribe Now](${paymentUrl})<`);
    
      // Optionally, you can also reply in the channel to acknowledge the command without revealing the subscription status
      await interaction.reply({ content: "I've sent you an important message (privately) with further details... ˶ᵔᵕᵔ˶", ephemeral: true });
    
      return;
    }

    // Capture messages posted to a given channel and remove all symbols and put everything into lower case
    const query = interaction.options.getString("query", true);
    console.log(`Requesting info for ${query}`);
    // Loads GraphQL query as "query" variable
    await interaction.reply('【Ｌｏａｄｉｎｇ．．．】');
    /* @ts-ignore */
    const { data: dataChat } = await fetchNewChatIdFromPsyAI(query);
    if (!dataChat) {
      await interaction.editReply("Sorry, I couldn't fetch the chat ID. Please try again later.");
      return;
    }
    /* @ts-ignore */
    const { data: dataQuestion } = await fetchDoseCardFromPsyAI(query, dataChat.chat_id);
    if (!dataQuestion) {
      await interaction.editReply("Sorry, I couldn't fetch the dose card. Please try again later.");
      return;
    }
    await interaction.editReply("> " + query + "\n\n" + "```\n" + dataQuestion.assistant + "\n```");
  } catch (error) {
    console.error(`Error in performInteraction: ${error}`);
    await interaction.editReply("Sorry, something went wrong. Please try again later.");
  }
}

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

    if (!data) {
      return await createUserAssociation(discordUserId);
    }

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

async function createUserAssociation(discordUserId: string) {
  try {
    const { data, error } = await supabase
      .from('user_association')
      .upsert([{ discord_id: discordUserId, subscription_status: false, stripe_id: "placeholder", trial_prompts: 5 }]);

    if (error) {
      console.error(error);
      return null;
    }

    return data;
  } catch (error) {
    console.error(`Error creating user association: ${error}`);
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

const fetchDoseCardFromPsyAI = async (query: string, chatId: string) => {
  try {
    const raw = {
      "model": process.env.LLM_MODEL_ID,
      "question": `${query}\n\n(Please respond conversationally to the query without mentioning any external information sources. If you need to, you can say something like "I'm afraid I don't have all the details on that, but from what I know..." and then provide a helpful, relevant response based on your own knowledge. Please keep the response under 2000 characters.)`,
      "temperature": 0.5,
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
    const user_association = await getUserAssociation(discordUserId);

    // If no record exists or an error occurred, exit early
    if (!user_association) {
      // Handle error (maybe send a message to the user or log the error)
      return;
    }

    // Check if the user has an active subscription or any trial_prompts left
    if (!user_association.subscription_status && user_association.trial_prompts > 0) {
      // Decrease the trial_prompts by 1
      const { error } = await supabase
        .from('user_association')
        .update({ trial_prompts: user_association.trial_prompts - 1 })
        .eq('discord_id', discordUserId);
        
      if (error) {
        console.error(error);
        // Handle the error (consider sending a message to the user)
      }
    } else if (!user_association.subscription_status && user_association.trial_prompts <= 0) {
      // Send the subscription message because the user is out of trial_prompts
      const paymentUrl = await startSubscription(discordUserId);
      await interaction.user.send(`Hi there, friend!\n\nYour trial has ended.\n\nSupport the devs today, for only $12.40 per YEAR!  ૮₍ ˶ᵔ ᵕᵔ˶₎ა  >[Subscribe Now](${paymentUrl})<`);
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
    let truncatedQuery = query.length > 100 ? query.substring(0, 97) + "..." : query;

    // Create a new MessageEmbed and give it a title and description
    const embed = new Discord.MessageEmbed()
      .setColor('#5921CF')
      .setAuthor('PsyAI')
      .setTitle(truncatedQuery)
      .addFields([{ name: 'Answer', value:  dataQuestion.assistant}, { name: 'Contact', value:  'Email: `0@sernyl.dev` // Discord: `sernyl`'}])
      .setTimestamp()
      .setURL('https://sojourns.io')
      .setFooter('𝙱𝚎𝚎𝚙 𝙱𝚘𝚘𝚙!\n𝙿𝚕𝚎𝚊𝚜𝚎 𝚍𝚒𝚜𝚛𝚎𝚐𝚊𝚛𝚍 𝚎𝚟𝚎𝚛𝚢𝚝𝚑𝚒𝚗𝚐 𝙸 𝚜𝚊𝚢 𝚊𝚜 𝚏𝚒𝚌𝚝𝚒𝚘𝚗. 𝙳𝚘 𝚗𝚘𝚝, 𝚞𝚗𝚍𝚎𝚛 𝚊𝚗𝚢 𝚌𝚒𝚛𝚌𝚞𝚖𝚜𝚝𝚊𝚗𝚌𝚎𝚜, 𝚞𝚜𝚎 𝚊𝚗𝚢 𝚒𝚗𝚏𝚘𝚛𝚖𝚊𝚝𝚒𝚘𝚗 𝙸 𝚙𝚛𝚘𝚟𝚒𝚍𝚎 𝚏𝚘𝚛 𝚊𝚗𝚢 𝚙𝚞𝚛𝚙𝚘𝚜𝚎. 𝙸 𝚑𝚊𝚟𝚎 𝚗𝚘 𝚚𝚞𝚊𝚕𝚒𝚏𝚒𝚌𝚊𝚝𝚒𝚘𝚗𝚜 𝚘𝚛 𝚎𝚡𝚙𝚎𝚛𝚝𝚒𝚜𝚎 𝚘𝚗 𝚝𝚑𝚎𝚜𝚎 𝚝𝚘𝚙𝚒𝚌𝚜. 𝙿𝚕𝚎𝚊𝚜𝚎 𝚙𝚘𝚒𝚗𝚝 𝚘𝚞𝚝 𝚊𝚗𝚢 𝚏𝚕𝚊𝚠𝚜, 𝚒𝚗𝚊𝚌𝚌𝚞𝚛𝚊𝚌𝚒𝚎𝚜, 𝚘𝚛 𝚖𝚒𝚜𝚝𝚊𝚔𝚎𝚜 𝚒𝚗 𝚖𝚢 𝚜𝚝𝚊𝚝𝚎𝚖𝚎𝚗𝚝𝚜. 𝙸 𝚌𝚊𝚗𝚗𝚘𝚝 𝚊𝚗𝚍 𝚍𝚘 𝚗𝚘𝚝 𝚒𝚗𝚝𝚎𝚗𝚍 𝚝𝚘 𝚙𝚛𝚘𝚟𝚒𝚍𝚎 𝚊𝚗𝚢 𝚏𝚊𝚌𝚝𝚞𝚊𝚕 𝚊𝚍𝚟𝚒𝚌𝚎 𝚘𝚛 𝚒𝚗𝚏𝚘𝚛𝚖𝚊𝚝𝚒𝚘𝚗. 𝙸 𝚊𝚙𝚙𝚛𝚎𝚌𝚒𝚊𝚝𝚎 𝚢𝚘𝚞𝚛 𝚞𝚗𝚍𝚎𝚛𝚜𝚝𝚊𝚗𝚍𝚒𝚗𝚐.', 'https://sernyl.io/logo-notext-dm.png');

    // Edit the reply with the embed
    await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    console.error(`Error in performInteraction: ${error}`);
    await interaction.editReply("Sorry, something went wrong. Please try again later.");
  }
}

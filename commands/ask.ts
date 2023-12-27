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
    return { data: responseData }
  } catch (error) {
    console.error(`Error in postAndParseURL: ${error}`);
    return null;
  }
}

const fetchDoseCardFromPsyAI = async (query: string, chatId: string) => {
  try {
    const raw = {
      "model": process.env.LLM_MODEL_ID,
      "question": `Check your context, and find out: ${query}\n\n(Please respond conversationally to the query. If additional relevant details are available, incorporate that information naturally into your response without directly mentioning the source. If the available information does not fully address the query, feel free to rely on your own knowledge to provide a helpful, friendly response within 30000 characters.)`,
      "temperature": 0.5,
      "max_tokens": 4000,
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

// Utility function to split text into chunks of a specific size
function splitTextIntoParagraphs(text, maxChunkSize) {
  let chunks = [];
  let currentChunk = "";

  text.split("\n").forEach(paragraph => {
    if ((currentChunk.length + paragraph.length) > maxChunkSize) {
      chunks.push(currentChunk);
      currentChunk = paragraph;
    } else {
      currentChunk += (currentChunk.length > 0 ? "\n" : "") + paragraph;
    }
  });

  // Add the last chunk if it's not empty
  if (currentChunk.length > 0) {
    chunks.push(currentChunk);
  }

  return chunks;
}


export async function performInteraction(interaction: Discord.CommandInteraction) {
  try {

    const discordUserId = interaction.user.id;
    const user_association = await getUserAssociation(discordUserId);

    // If no record exists or an error occurred, exit early
    if (!user_association) {
      // Handle error (maybe send a message to the user or log the error)
      return;
    }

    if (interaction.guild != null && (interaction.guild.id == "1032772277223297085" || interaction.guild.id == "1037189729294225518")) {
      console.log("Guild ID: " + interaction.guild.id);
      console.log("Guild Name: " + interaction.guild.name);
      console.log("Guild Owner ID: " + interaction.user.id);
      // The Culture Cave or Josie's Guild
    } else if ((!user_association.subscription_status && user_association.trial_prompts > 0)) { // Culture Cave
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
      await interaction.editReply("Please check your direct messages!");
      return;
    }

    // Capture messages posted to a given channel and remove all symbols and put everything into lower case
    const query = interaction.options.getString("query", true);
    console.log(`Requesting info for ${query}`);
    // Loads GraphQL query as "query" variable
    await interaction.deferReply();
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
    await interaction.deleteReply();
    // Splitting the assistant text into chunks
    const assistantTextChunks = splitTextIntoParagraphs(dataQuestion.assistant, 1024);

    // Create a new MessageEmbed
    const embed = new Discord.MessageEmbed()
      .setColor('#5921CF')
      .setAuthor('PsyAI')
      .setTitle(truncatedQuery)
      .setTimestamp()
      .setURL('https://sojourns.io')
      .setFooter('𝙱𝚎𝚎𝚙 𝙱𝚘𝚘𝚙!\n𝙿𝚕𝚎𝚊𝚜𝚎 𝚍𝚒𝚜𝚛𝚎𝚐𝚊𝚛𝚍 𝚎𝚟𝚎𝚛𝚢𝚝𝚑𝚒𝚗𝚐 𝙸 𝚜𝚊𝚢 𝚊𝚜 𝚏𝚒𝚌𝚝𝚒𝚘𝚗. 𝙸 𝚌𝚊𝚗𝚗𝚘𝚝 𝚊𝚗𝚍 𝚍𝚘 𝚗𝚘𝚝 𝚒𝚗𝚝𝚎𝚗𝚍 𝚝𝚘 𝚙𝚛𝚘𝚟𝚒𝚍𝚎 𝚊𝚗𝚢 𝚏𝚊𝚌𝚝𝚞𝚊𝚕 𝚊𝚍𝚟𝚒𝚌𝚎 𝚘𝚛 𝚒𝚗𝚏𝚘𝚛𝚖𝚊𝚝𝚒𝚘𝚗.');

    // Adding chunks as fields to the embed
    assistantTextChunks.forEach((chunk, index) => {
      embed.addField(`‎`, chunk);
    });

    embed.addField('Contact', 'Email: `0@sernyl.dev` // Discord: `sernyl`');

    // Edit the reply with the embed
    await interaction.followUp({ embeds: [embed] });
  } catch (error) {
    console.error(`Error in performInteraction: ${error}`);
    await interaction.editReply("Sorry, something went wrong. Please try again later.");
  }
}

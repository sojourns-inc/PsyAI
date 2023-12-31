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

function createDrugInfoCard(): string {
  const searchUrl = `https://psychonautwiki.org/w/index.php?search=Gabapentin&title=Special%3ASearch&go=Go`;
  const infoCard = `
[Gabapentin](${searchUrl}) drug information

🔭 *Class*
* ✴️ *Chemical* ➡️ **Gabapentinoids**
* ✴️ *Psychoactive* ➡️ **Depressant**

⚖️ *Dosages*
* ✴️ **ORAL** ✴️
  - *Threshold*: 200mg
  - *Light*: 200 - 600mg
  - *Common*: 600 - 900mg
  - *Strong*: 900 - 1200mg
  - *Heavy*: 1200mg

⏱️ *Duration*
* ✴️ *ORAL* ✴️
  - *Onset*: 30 - 90 minutes
  - *Total*: 5 - 8 hours

⚠️ *Addiction Potential* ⚠️
* No addiction potential information.

🧠 *Subjective Effects* 🧠
  - **Focus enhancement**
  - **Euphoria**

📈 *Tolerance*
  - *Full*: with prolonged continuous usage
  - *Baseline*: 7-14 days
`;

  return infoCard;
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

const fetchDoseCardFromPsyAI = async (substanceName: string, chatId: string) => {
  try {
    const raw = {
      model: process.env.LLM_MODEL_ID, // Assuming LLM_MODEL_ID is a previously defined variable
      question: `Generate a drug information card for ${substanceName}. Respond only with the card. Use the provided example and follow the exact syntax given.\n\n Example drug information card for Gabapentin:\n\n`
        + createDrugInfoCard() // Assuming create_drug_info_card is a function defined elsewhere
        + `\n\nNotes 1. Even though the dosage information in the example card (for Gabapentin) relates to one particular route of administration (ORAL), the information provided by the context for ${substanceName} might pertain to a different route of administration (for example, 'IV' instead of 'ORAL'). Check the context for dosing ranges and units related to the route of administration of ${substanceName}. If there is a scarcity of data about ${substanceName}, obtain this information from anecdotal reports, if they are in your context, or from wherever possible. \n\n2. Not every section from the example dose card is required, and you may add additional sections if needed. Please keep the formatting compact and uniform using HTML.\n\n3. If a dose card for GBL or Gamma-Butyrolactone is requested, the 'threhsold' dose should be 0.3ml, the 'light' dose should start at 0.5ml, the onset should be 3-10 min, and the duration should be 1-2 hours.`,
      temperature: 0.15,
      max_tokens: 4096
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
  .setName("info")
  .setDescription("Get basic info about a substance")
  .addStringOption(option => option
    .setName("substance")
    .setDescription("The substance you want information about")
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

    const substanceName = parseSubstanceName(interaction.options.getString("substance", true));
    const substanceNameCap = substanceName.charAt(0)?.toUpperCase() + substanceName.slice(1);
    console.log(`Requesting info for ${substanceName}`);
    // Loads GraphQL query as "query" variable
    const loadingEmbed = new Discord.MessageEmbed()
      .setColor('#5921CF')
      .setAuthor('PsyAI')
      .setTitle(substanceNameCap + " drug information")
      .addFields([{ name: '~~~~', value: '【 Thinking ．．．⏳】' }, { name: 'Contact', value: 'Email: `0@sernyl.dev` // Discord: `sernyl`' }])
      .setTimestamp()
      .setURL('https://sojourns.io')
      .setFooter('Powered by Sojourns', 'https://sernyl.io/logo-notext-dm.png');
    await interaction.deferReply();
    /* @ts-ignore */
    const { data: dataChat } = await fetchNewChatIdFromPsyAI(substanceName);
    if (!dataChat) {
      await interaction.editReply("Sorry, I couldn't fetch the chat ID. Please try again later.");
      return;
    }
    /* @ts-ignore */
    const { data: dataQuestion } = await fetchDoseCardFromPsyAI(substanceName, dataChat.chat_id);
    if (!dataQuestion) {
      await interaction.editReply("Sorry, I couldn't fetch the dose card. Please try again later.");
      return;
    }
    const assistantTextChunks = splitTextIntoParagraphs(dataQuestion.assistant, 1024);
    // Create a new MessageEmbed and give it a title and description
    const embed = new Discord.MessageEmbed()
      .setColor('#5921CF')
      .setAuthor('PsyAI')
      .setTitle(substanceNameCap)
      //.addFields([{ name: '~~~~', value:  dataQuestion.assistant}, { name: 'Contact', value:  'Email: `0@sernyl.dev` // Discord: `sernyl`'}])
      .setTimestamp()
      .setURL('https://sojourns.io')
      .setFooter('𝙱𝚎𝚎𝚙 𝙱𝚘𝚘𝚙!\n𝙿𝚕𝚎𝚊𝚜𝚎 𝚍𝚒𝚜𝚛𝚎𝚐𝚊𝚛𝚍 𝚎𝚟𝚎𝚛𝚢𝚝𝚑𝚒𝚗𝚐 𝙸 𝚜𝚊𝚢 𝚊𝚜 𝚏𝚒𝚌𝚝𝚒𝚘𝚗. 𝙸 𝚌𝚊𝚗𝚗𝚘𝚝 𝚊𝚗𝚍 𝚍𝚘 𝚗𝚘𝚝 𝚒𝚗𝚝𝚎𝚗𝚍 𝚝𝚘 𝚙𝚛𝚘𝚟𝚒𝚍𝚎 𝚊𝚗𝚢 𝚏𝚊𝚌𝚝𝚞𝚊𝚕 𝚊𝚍𝚟𝚒𝚌𝚎 𝚘𝚛 𝚒𝚗𝚏𝚘𝚛𝚖𝚊𝚝𝚒𝚘𝚗.');

    // Adding chunks as fields to the embed
    assistantTextChunks.forEach((chunk, index) => {
      embed.addField(`‎`, chunk);
    });
    // Edit the reply with the embed
    await interaction.editReply({ embeds: [embed] });

  } catch (error) {
    console.error(`Error in performInteraction: ${error}`);
    await interaction.editReply("Sorry, something went wrong. Please try again later.");
  }
}

// Parses and sanitizes substance name
function parseSubstanceName(str: string) {
  // Sanitizes input names to match PsychonautWiki API names
  return sanitizeSubstanceName(lowerNoSpaceName(str));
}

function lowerNoSpaceName(str: string) {
  return str.toLowerCase()
    .replace(/^[^\s]+ /, '') // remove first word
    .replace(/ /g, '');
}

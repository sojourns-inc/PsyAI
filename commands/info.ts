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
    return { data: responseData }
  } catch (error) {
    console.error(`Error in postAndParseURL: ${error}`);
    return null;
  }
}

const fetchDoseCardFromPsyAI = async (substanceName: string, chatId: string) => {
  try {
    const raw = {
      "model": process.env.LLM_MODEL_ID,
      "question": `Generate a drug information card for ${substanceName}. Respond only with the card. Use the provided example and follow the exact syntax given.\n\n Example drug information card for Gabapentin:\n\n`
          + createDrugInfoCard()
          + `\n\nNote: Not every section from the example dose card is required, and you may add additional sections if needed. Please keep the formatting compact and uniform using Markdown, minimizing the space between the sections.`,
      "temperature": "0.25",
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
  .setName("info")
  .setDescription("Get basic info about a substance")
  .addStringOption(option => option
    .setName("substance")
    .setDescription("The substance you want information about")
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

      const substanceName = parseSubstanceName(interaction.options.getString("substance", true));
      const substanceNameCap = substanceName.charAt(0)?.toUpperCase() + substanceName.slice(1);
      console.log(`Requesting info for ${substanceName}`);
      // Loads GraphQL query as "query" variable
      const loadingEmbed = new Discord.MessageEmbed()
        .setColor('#5921CF')
        .setAuthor('PsyAI')
        .setTitle(substanceNameCap + " drug information")
        .addFields([{ name: '~~~~', value:  '【 Thinking ．．．⏳】'}, { name: 'Contact', value:  'Email: `0@sernyl.dev` // Discord: `sernyl`'}])
        .setTimestamp()
        .setURL('https://sojourns.io')
        .setFooter('Powered by Sojourns', 'https://sernyl.io/logo-notext-dm.png');
      await interaction.reply({embeds: [loadingEmbed]});
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
  
      // Create a new MessageEmbed and give it a title and description
      const embed = new Discord.MessageEmbed()
        .setColor('#5921CF')
        .setAuthor('PsyAI')
        .setTitle(substanceNameCap)
        .addFields([{ name: '~~~~', value:  dataQuestion.assistant}, { name: 'Contact', value:  'Email: `0@sernyl.dev` // Discord: `sernyl`'}])
        .setTimestamp()
        .setURL('https://sojourns.io')
        .setFooter('Powered by Sojourns', 'https://sernyl.io/logo-notext-dm.png');
  
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

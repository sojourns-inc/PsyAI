import Discord from 'discord.js';
import { SlashCommandBuilder } from "@discordjs/builders";
import { sanitizeSubstanceName } from '../include/sanitize-substance-name.js';
import algoliasearch, { SearchIndex } from 'algoliasearch';

const APPLICATION_ID = process.env.ALGO_APP_ID; // replace with your Application ID
const API_KEY = process.env.ALGO_API_KEY; // replace with your API Key

const client = algoliasearch(APPLICATION_ID as string, API_KEY as string);

const index: SearchIndex = client.initIndex(process.env.ALGO_INDEX as string); // replace with your index name

export const applicationCommandData = new SlashCommandBuilder()
  .setName("fx")
  .setDescription("Look up drug, or drug combination effects. (Combination example: `Ketamine|LSD`)")
  .addStringOption(option => option
    .setName("query")
    .setDescription("Drug or drug combo search query")
    .setRequired(true))
  .toJSON() as unknown as Discord.ApplicationCommandData;

export async function performInteraction(interaction: Discord.CommandInteraction) {
  try {
    // Capture messages posted to a given channel and remove all symbols and put everything into lower case
    
    const substanceName = parseSubstanceName(interaction.options.getString("query", true));
    
    const substanceNameCap = substanceName.charAt(0)?.toUpperCase() + substanceName.slice(1);
    console.log(`Requesting FX for ${substanceName}`);
    // Loads GraphQL query as "query" variable
    const loadingEmbed = new Discord.MessageEmbed()
      .setColor('#5921CF')
      .setAuthor('Powered by Algolia Search')
      .setTitle(substanceNameCap + " - " + "User-Reported Effects")
      .addFields([{ name: '~~~~', value:  '【Ｌｏａｄｉｎｇ ＦＸ．．．⏳】'}, { name: 'Contact', value:  'Email: `0@sernyl.dev` // Discord: `sernyl`'}])
      .setTimestamp()
      .setURL('https://sojourns.io')
      .setFooter('Powered by Sojourns', 'https://sernyl.io/logo-notext-dm.png');
    await interaction.reply({embeds: [loadingEmbed]});
    /* @ts-ignore */
    const { hits: results } = await index.search(substanceName);
    if (!results) {
      await interaction.editReply("Sorry, I couldn't fetch the effects. Please try again later.");
      return;
    }

    // Create a new MessageEmbed and give it a title and description
    
    const embed = new Discord.MessageEmbed()
      .setColor('#5921CF')
      .setAuthor('PsyAI')
      .setTitle(substanceNameCap+ " - " + "User-Reported Effects")
      .addFields([{ name: '~~~~', value:  results.map(hit => {
        // @ts-ignore 
        return `* ${hit.effect}` + (hit.detail !== null ?  `: \"${hit.detail}\"` : ""); 
      }).slice(0, 8).join("\n\n")}, { name: 'Contact', value:  'Email: `0@sernyl.dev` // Discord: `sernyl`'}])
      .setTimestamp()
      .setURL('https://sojourns.io')
      .setFooter('Powered by Sojourns', 'https://sernyl.io/logo-notext-dm.png');

    // Edit the reply with the embed
    await interaction.editReply({ embeds: [embed] });

  } catch (error) {
    console.error(`Error in performInteraction: ${JSON.stringify(error)}`);
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

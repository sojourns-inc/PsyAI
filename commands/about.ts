// About message
import Discord from 'discord.js';

import * as Helpers from '../include/helpers.js';

export const applicationCommandData = {
  name: "about",
  description: "Get information about PsyAI"
} as Discord.ApplicationCommandData;

export function performInteraction(interaction: Discord.CommandInteraction) {
  const embed = Helpers.TemplatedMessageEmbed()
    .addField( 'About PsyAI',
      `PsyAI is your AI-powered guide that answers questions about drugs in an unbiased, judgement-free way. The bot sources dosage, duration, tolerance, and harm reduction information from [PsychonautWiki](http://www.psychonautwiki.org), [Effect Index](https://effectindex.com) and a plethora of curated information sources.`);

  interaction.reply({ embeds: [embed], files: ["./assets/logo.png"] });
}

import Discord from 'discord.js';

export function TemplatedMessageEmbed() {
  return new Discord.MessageEmbed()
    .setTimestamp()
    
    // .attachFiles(["./assets/logo.png"])
    .setAuthor('PsyAI', 'attachment://logo.png')
    .setThumbnail('attachment://logo.png')
    .setColor('#747474')
    .setURL("https://github.com/PsyAIredux")
    .setFooter('Please use drugs responsibly', 'attachment://logo.png')
}

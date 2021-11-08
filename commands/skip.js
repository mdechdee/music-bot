const { SlashCommandBuilder } = require('@discordjs/builders');
const { queue } = require('../utils/yt-queue');

const skip = async (interaction) => {
  if (!interaction.member.voice.channel){
    return interaction.reply(
      "You have to be in a voice channel to skip the music!"
    );
  }

  const serverQueue = queue.get(interaction.guild.id);
  if (!serverQueue){
    return interaction.reply("There is no song that I could skip!");
  }
  console.log("Skiping Song")
  
  return interaction.reply("Skipping song")
    .then(() => serverQueue.player.stop());
}

module.exports = {
	data: new SlashCommandBuilder()
		.setName('skip')
		.setDescription('Skip current song'),
	async execute(interaction) {
    skip(interaction);
	},
  skip,
};
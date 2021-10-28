const { SlashCommandBuilder } = require('@discordjs/builders');
const { queue, playSongFromInteraction } = require('../utils/yt-queue');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('skip')
		.setDescription('Skip current song'),
	async execute(interaction) {
      if (!interaction.member.voice.channel){
        return interaction.reply(
          "You have to be in a voice channel to stop the music!"
        );
      }

      const serverQueue = queue.get(interaction.guild.id);
      if (!serverQueue){
        return interaction.reply("There is no song that I could skip!");
      }
      console.log("Skiping Song")
      
      serverQueue.songs.shift();
      return interaction.reply("Skipping song")
        .then(() => playSongFromInteraction(serverQueue.songs[0], interaction));
	},
};
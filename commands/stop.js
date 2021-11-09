const { SlashCommandBuilder } = require('@discordjs/builders');
const { stopConnection } = require('../utils/yt-queue');

const stop = (interaction) => {
	stopConnection(interaction.guild);
	return interaction.reply("Bot stopped, good bye!");
}

module.exports = {
	data: new SlashCommandBuilder()
		.setName('stop')
		.setDescription('Disconnect the subatomic from voice channel and resets queue'),
	async execute(interaction) {
        stop(interaction);
	},
	stop,
};
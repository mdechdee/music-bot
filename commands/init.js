const { SlashCommandBuilder } = require('@discordjs/builders');
const { MessageActionRow, MessageButton } = require('discord.js');

const { guildChannelMap } = require('../utils/yt-queue');

const row = new MessageActionRow()
    .addComponents(
        new MessageButton()
            .setCustomId('primary')
            .setStyle('PRIMARY')
            .setLabel('⏯️')
    );

module.exports = {
    data: new SlashCommandBuilder()
		.setName('init')
		.setDescription('Initialize a channel for music commands'),
	async execute(interaction) {
        console.log(guildChannelMap[interaction.guildId]);
        if(!guildChannelMap[interaction.guildId]){
            let channel = await interaction.guild.channels.create("subatomic-song-request", { reason: 'Needed a cool new channel' })
            guildChannelMap[interaction.guildId] = channel.id;
            let data = JSON.stringify(guildChannelMap);
            console.log("Writing file: ", data);
            fs.writeFileSync(path.resolve(__dirname, "../guild-channel-map.json"), data);
        }
        const channelId = guildChannelMap[interaction.guildId];
        interaction.guild.channels.fetch(channelId)
            .then(channel => {
                console.log(`The music channel name is: ${channel.name}`);
                channel.send({ content: 'GUI Song player wiil come soon!', components: [row] });
            })
        return interaction.reply("init done");
    }
};
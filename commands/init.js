const { SlashCommandBuilder } = require('@discordjs/builders');
const { MessageActionRow, MessageButton, MessageEmbed } = require('discord.js');
const fs = require('fs');
const path = require("path");
const { guildChannelMap } = require('../utils/yt-queue');

const row = new MessageActionRow()
    .addComponents(
        new MessageButton()
            .setCustomId('play/pause')
            .setStyle('PRIMARY')
            .setLabel('⏯️')
    )
    .addComponents(
        new MessageButton()
            .setCustomId('skip')
            .setStyle('PRIMARY')
            .setLabel('⏭️')
    )
    .addComponents(
        new MessageButton()
            .setCustomId('stop')
            .setStyle('PRIMARY')
            .setLabel('⏹')
    );

const initEmbed = new MessageEmbed()
	.setColor('#0099ff')
	.setTitle('Current Song: None')
	.setURL('https://www.youtube.com/')

module.exports = {
    data: new SlashCommandBuilder()
		.setName('init')
		.setDescription('Initialize a channel for music commands'),
	async execute(interaction) {
        console.log(guildChannelMap[interaction.guildId]);  
        if(guildChannelMap[interaction.guildId]){
            const channelId = guildChannelMap[interaction.guildId];
            interaction.guild.channels.fetch(channelId)
                .then(channel => {
                    console.log(`Removing old channel`);
                    channel.delete();
                })
                .catch(err => {
                    console.log(`ChannelId stored but no channel found`);
                })
        }
        let channel = await interaction.guild.channels.create("subatomic-song-request", { reason: 'for request song from subatomic' })
        guildChannelMap[interaction.guildId] = channel.id;
        await channel.send({ content: 'GUI Song player!', components: [row] }).then(msg => msg.pin());
        await channel.send({ content: '**Song queue**', embeds: [initEmbed]}).then(msg => msg.pin());
        let data = JSON.stringify(guildChannelMap);
        console.log("Writing file: ", data);
        fs.writeFileSync(path.resolve(__dirname, "../guild-channel-map.json"), data);
        
        return;
    }
};
const { SlashCommandBuilder } = require('@discordjs/builders');
const {  
    isMemberInVoiceChannel, 
    hasConnectAndSpeakPermission,
    findSong, 
    addSongToQueue 
} = require('../utils/yt-queue');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('play')
		.setDescription('Play a youtube song')
        .addStringOption(option =>
            option.setName('title')
                .setDescription('The title of the song / url')
                .setRequired(true)),
	async execute(interaction) {
        // check permissions
        if(!isMemberInVoiceChannel(interaction.member))
            return interaction.reply("You must be in voice channel to play songs!"); 
    
        if(!hasConnectAndSpeakPermission(interaction.member.voice.channel, interaction.client))
            return interaction.reply("I don't have permission to CONNECT or SPEAK!"); 
            
        // find song
        const title = interaction.options.getString('title');
        const song = await findSong(title);
        if(!song)   return interaction.reply(`Can't find song **${title}**, or it is restricted`);
        
        // add song to queue
        addSongToQueue(song, interaction.guild, interaction.member.voice.channel);
        return interaction.reply(`**${song.title}** is added to queue!`);
	},
};
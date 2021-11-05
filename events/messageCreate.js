const { 
    guildChannelMap, 
    isMemberInVoiceChannel, 
    hasConnectAndSpeakPermission,
    findSong, 
    addSongToQueue 
} = require('../utils/yt-queue');

module.exports = {
	name: 'messageCreate',
	once: false,
	async execute(message) {
		if (message.author.bot) return;
		if(!guildChannelMap[message.guildId] || guildChannelMap[message.guildId] != message.channelId)  return;

        if(!isMemberInVoiceChannel(message.member))
            return message.channel.send("You must be in voice channel to play songs!"); 
        
        if(!hasConnectAndSpeakPermission(message.member.voice.channel, message.client))
            return message.channel.send("I don't have permission to CONNECT or SPEAK!"); 

        // find song
        const title = message.content;
        const song = await findSong(title);
        if(!song)   return message.channel.send(`Can't find song **${title}**, or it is restricted`);
        
        // add song to queue
        addSongToQueue(song, message.guild, message.member.voice.channel);
        return message.channel.send(`**${song.title}** is added to queue!`);
	},
};
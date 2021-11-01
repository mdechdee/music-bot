const { guildChannelMap, queue ,urlFromId, playSongFromInteraction, isYtUrl } = require('../utils/yt-queue');
const ytSearch = require('youtube-search-api');
const ytdl = require("ytdl-core");


module.exports = {
	name: 'messageCreate',
	once: false,
	async execute(message) {
		if (message.author.bot) return;
		if(!guildChannelMap[message.guildId] || guildChannelMap[message.guildId] != message.channelId)  return;

		const voiceChannel = message.member.voice.channel;
        if (!voiceChannel)
            return message.channel.send(
            "You need to be in a voice channel to play music!"
            );
        const permissions = voiceChannel.permissionsFor(message.client.user);
        if (!permissions.has("CONNECT") || !permissions.has("SPEAK")) {
            return message.channel.send(
            "I need the permissions to join and speak in your voice channel!"
            );
        }
        // find song
        const title = message.content;
        
        var songUrl;
        if(isYtUrl(title)){
            songUrl = title;
        }
        else{
            const res = await ytSearch.GetListByKeyword(title);
            if(!res?.items){
                return  message.channel.send(
					"Can't find song TT"
					);
            }
            songUrl = urlFromId(res.items[0].id);
        }
        const songInfo = await ytdl.getInfo(songUrl);
        const song = {
            title: songInfo.videoDetails.title,
            url: songInfo.videoDetails.video_url,
        };
        
        const serverQueue = queue.get(message.guild.id);
        // play song
        if (!serverQueue) {
            const queueContruct = {
                textChannel: message.channel,
                voiceChannel: voiceChannel,
                connection: null,
                songs: [],
                volume: 5,
                playing: true
            };

            queue.set(message.guild.id, queueContruct);
            queueContruct.songs.push(song);

            try {
                playSongFromInteraction(song, message);
            } catch (err) {
                console.log(err);
                queue.delete(message.guild.id);
                return message.channel.send(err);
            }
        } 
        // add song to queue
        else {
            serverQueue.songs.push(song);
			return message.channel.send(`${"`"+song.title+"`"} has been added to the queue!\n ${song.url}`);
        }
	},
};

const {
    AudioPlayerStatus,
	StreamType,
	createAudioResource,
    createAudioPlayer,
	joinVoiceChannel,
    getVoiceConnection,
} = require('@discordjs/voice');
const ytdl = require("ytdl-core");
const fs = require('fs');
const path = require("path");

const queue = new Map();
const raw = fs.readFileSync(path.resolve(__dirname, "../guild-channel-map.json"));
const guildChannelMap = JSON.parse(raw);

module.exports = {
    queue: queue,

    isYtUrl(str){
        return str.startsWith("https://www.youtube.com/watch");
    },
    urlFromId(id){
        return "http://www.youtube.com/watch?v="+id;
    },
    playSongFromInteraction: function playSongFromInteraction(song, interaction){
        const serverQueue = queue.get(interaction.guild.id);
        const voiceChannel = interaction.member.voice.channel;

        var connection = getVoiceConnection(voiceChannel.guild.id);
        if(!connection){
            connection = joinVoiceChannel({
                channelId: voiceChannel.id,
                guildId: interaction.guild.id,
                adapterCreator: interaction.guild.voiceAdapterCreator,
            });
        }

        var player = serverQueue.player;
        if(!player){
            player = createAudioPlayer();
        }

        if (!song) {
            connection.destroy();
            player.stop();
            queue.delete(interaction.guild.id);
            return;
        }

        const stream = ytdl(song.url, { 
            filter: 'audioonly',
        });
        const resource = createAudioResource(stream, { inputType: StreamType.Arbitrary });
        
        connection.subscribe(player);
        player.play(resource);

        if(serverQueue.player === null){
            player.on('error', error => {
                console.error(error);
            });
            
            player.on(AudioPlayerStatus.Idle, () => {
                console.log("Song end, shifting")
                if(!serverQueue)    return;
                serverQueue.songs.shift();
                playSongFromInteraction(serverQueue.songs[0], interaction);
            });

            serverQueue.player = player;
        }
        interaction.channel.send(`Start playing: **${song.title}**`);
        console.log(`Start playing: **${song.title}**`);
    },
    guildChannelMap: guildChannelMap,
}
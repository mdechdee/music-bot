
const {
    AudioPlayerStatus,
	StreamType,
	createAudioResource,
    createAudioPlayer,
	joinVoiceChannel,
} = require('@discordjs/voice');
const ytdl = require("ytdl-core");

queue = new Map();
player = createAudioPlayer(),

module.exports = {
    queue: queue,
    player: player,
    isYtUrl(str){
        return str.startsWith("https://www.youtube.com/watch");
    },
    urlFromId(id){
        return "http://www.youtube.com/watch?v="+id;
    },
    playSongFromInteraction: function playSongFromInteraction(song, interaction){
        const serverQueue = queue.get(interaction.guild.id);
        const voiceChannel = interaction.member.voice.channel;

        const connection = joinVoiceChannel({
            channelId: voiceChannel.id,
            guildId: interaction.guild.id,
            adapterCreator: interaction.guild.voiceAdapterCreator,
        });

        if (!song) {
            connection.destroy();
            queue.delete(interaction.guild.id);
            return;
        }

        const stream = ytdl(song.url, { 
            filter: 'audioonly',
        });
        const resource = createAudioResource(stream, { inputType: StreamType.Arbitrary });
        
        connection.subscribe(player);
        player.play(resource);

        player.on(AudioPlayerStatus.Idle, () => {      
            console.log("Song end, shifting")
            serverQueue.songs.shift();
            playSongFromInteraction(serverQueue.songs[0], interaction);
        });
        interaction.channel.send(`Start playing: **${song.title}**`);
        console.log(`Start playing: **${song.title}**`);
    },
}
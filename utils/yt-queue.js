
const {
    AudioPlayerStatus,
	StreamType,
	createAudioResource,
    createAudioPlayer,
	joinVoiceChannel,
    getVoiceConnection,
} = require('@discordjs/voice');
const fs = require('fs');
const path = require("path");

const ytSearch = require('youtube-search-api');
const ytdl = require("ytdl-core");

const queue = new Map();

const raw = fs.readFileSync(path.resolve(__dirname, "../guild-channel-map.json"));
const guildChannelMap = JSON.parse(raw);

function isYtUrl(str){
    return str.startsWith("https://www.youtube.com/watch");
}

function urlFromId(id){
    return "http://www.youtube.com/watch?v="+id;
}

const isMemberInVoiceChannel = member => {
    const voiceChannel = member.voice.channel;
    if (!voiceChannel)  return false;
    return true;
}

const hasConnectAndSpeakPermission = (voiceChannel, client) => {
    const permissions = voiceChannel.permissionsFor(client.user);
    if (!permissions.has("CONNECT") || !permissions.has("SPEAK")) return false;
    return true;
}

const findSong = async (title) => {
    var songUrls;
    if(isYtUrl(title)){
        songUrls = [title];
    }
    else{
        const res = await ytSearch.GetListByKeyword(title);
        if(!res?.items){
            return  null;
        }
        songUrls = res.items.map(item => urlFromId(item.id));
        // console.log("Song URLs: ", songUrls);
    }
    var songInfo = null;
    for(const songUrl of songUrls){
        try{
            songInfo = await ytdl.getInfo(songUrl);
            console.log("Get info of ", songUrl, " sucessfully");
            break;
        }
        catch (err) {
            // console.log("Downlaod ", songUrl, "failed");
            continue;
        }
    }
    if(songInfo === null) return null;
    return {
        title: songInfo.videoDetails.title,
        url: songInfo.videoDetails.video_url,
    };
}

const playSong = (song, guild, voiceChannel) => {
    const serverQueue = queue.get(guild.id);

    var connection = getVoiceConnection(guild.id);
    var player = serverQueue.player;

    if(!connection){
        connection = joinVoiceChannel({
            channelId: voiceChannel.id,
            guildId: guild.id,
            adapterCreator: guild.voiceAdapterCreator,
        });
    }
    
    if(!player){
        player = createAudioPlayer();
    }

    if (!song) {
        connection.destroy();
        player.stop();
        queue.delete(guild.id);
        return;
    }

    const stream = ytdl(song.url, { filter: 'audioonly' });
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
            playSong(serverQueue.songs[0], guild, voiceChannel);
        });
        serverQueue.player = player;
    }
    const channelId = guildChannelMap[guild.id];
    guild.channels.fetch(channelId)
        .then(channel => {
            channel.send(`Start playing: **${song.title}**`);
        })
    console.log(`Start playing: **${song.title}**`);
}

const addSongToQueue = (song, guild, voiceChannel) => {
    const serverQueue = queue.get(guild.id);
    if (!serverQueue) {
        const queueContruct = {
            voiceChannel: voiceChannel,
            connection: null,
            player: null,
            songs: [],
            isPlaying: false,
        };
        queue.set(guild.id, queueContruct);
        queueContruct.songs.push(song);
        playSong(song, guild, voiceChannel);
    }
    else {
        serverQueue.songs.push(song);
    }
}

module.exports = {
    queue,
    guildChannelMap,
    findSong,
    isMemberInVoiceChannel,
    hasConnectAndSpeakPermission,
    playSong,
    addSongToQueue,
}
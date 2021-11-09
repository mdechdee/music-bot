
const {
    AudioPlayerStatus,
	StreamType,
	createAudioResource,
    createAudioPlayer,
	joinVoiceChannel,
    getVoiceConnection,
    VoiceConnectionStatus,
    entersState
} = require('@discordjs/voice');
const { MessageEmbed } = require('discord.js');
const fs = require('fs');
const path = require("path");

const ytSearch = require('youtube-search-api');
const ytdl = require("ytdl-core");

const queue = new Map();
var sendedRecommendedUrls = [];

const raw = fs.readFileSync(path.resolve(__dirname, "../guild-channel-map.json"));
const guildChannelMap = JSON.parse(raw);

var isAutoplayOn = true;
var queueMessage;

function isYtUrl(str){
    return str.startsWith("https://www.youtube.com/watch");
}

function urlFromId(id){
    if(!id) return undefined;
    return "https://www.youtube.com/watch?v="+id;
}

function getThumbnailFromUrl(url){
    return url.replace("https://www.youtube.com/watch?v=", 'https://img.youtube.com/vi/') + "/default.jpg";
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

const findSong = async (title, isAutoplay) => {
    var songUrls;
    if(isYtUrl(title)){
        songUrls = [title];
    }
    else{
        const res = await ytSearch.GetListByKeyword(title);
        if(!res?.items) return  null;
        songUrls = res.items
            .map(item => urlFromId(item.id))
            .filter(url => !isAutoplay || !sendedRecommendedUrls.includes(url));
        // console.log("Song URLs: ", songUrls);
        // console.log(res.items[0]);
    }
    var songInfo = null;
    for(const songUrl of songUrls){
        try{
            songInfo = await ytdl.getInfo(songUrl);
            console.log("Get info of ", songUrl, " sucessfully");
            // console.log(songInfo.related_videos.splice(0,2))
            break;
        }
        catch (err) {
            // console.log("Downlaod ", songUrl, "failed");
            continue;
        }
    }
    if(!songInfo) return null;
    if(!isAutoplay) sendedRecommendedUrls = [];
    else sendedRecommendedUrls.push(songInfo.videoDetails.video_url);
    console.log(sendedRecommendedUrls);
    return {
        title: songInfo.videoDetails.title,
        url: songInfo.videoDetails.video_url,
        nextSongTitle: songInfo.related_videos[1].title,
        isAutoplay: isAutoplay,
    };
}

const stopConnection = (guild) => {
    const serverQueue = queue.get(guild.id);
    var connection = getVoiceConnection(guild.id);
    var player = serverQueue.player;

    if (connection) {
        connection.destroy();
        player.stop();
        queue.delete(guild.id);
    }
    updateQueueMessage(guild);
    return;
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

        connection.on(VoiceConnectionStatus.Disconnected, async (oldState, newState) => {
            try {
                await Promise.race([
                    entersState(connection, VoiceConnectionStatus.Signalling, 5_000),
                    entersState(connection, VoiceConnectionStatus.Connecting, 5_000),
                ]);
            } catch (error) {
                stopConnection(guild);
            }
        });
    }
    
    if(!player){
        player = createAudioPlayer();
    }

    if (!song) {
        stopConnection(guild);
    }

    const stream = ytdl(song.url, { filter: 'audioonly', highWaterMark: 1024 * 1024 * 32 });
    const resource = createAudioResource(stream, { inputType: StreamType.Arbitrary });
    
    connection.subscribe(player);
    player.play(resource);

    song.isPlaying = true;
    updateQueueMessage(guild);

    if(serverQueue.player === null){
        player.on('error', error => {
            console.error(error);
        });
        
        player.on(AudioPlayerStatus.Idle, async () => {
            console.log("Song end, shifting")
            if(!serverQueue)    return;
            var currentSong = serverQueue.songs[0];
            serverQueue.songs.shift();
            var nextSong = serverQueue.songs[0];
            // console.log(currentSong, nextSong);
            if(!nextSong && isAutoplayOn){
                nextSong = await findSong(currentSong.nextSongTitle, true);
                addSongToQueue(nextSong, guild, voiceChannel);
            }
            playSong(nextSong, guild, voiceChannel);
        });
        serverQueue.player = player;
    }
    const channelId = guildChannelMap[guild.id];
    guild.channels.fetch(channelId)
        .then(channel => {
            song.isAutoplay? 
                channel.send(`Auto playing: **${song.title}**`) :
                channel.send(`Start playing: **${song.title}**`);
        })
    song.isAutoplay?
        console.log(`Auto playing: **${song.title}**`) :
        console.log(`Start playing: **${song.title}**`);
}

const getQueueMessage = async (guild) =>{
    const channelId = guildChannelMap[guild.id];
    const channel = await guild.channels.fetch(channelId);
    const messages = await channel.messages.fetch();
    const queueMessage = messages.filter(msg => msg.content.includes("Song queue"));
    return queueMessage.first();
}

const updateQueueMessage = async (guild) => {
    const serverQueue = queue.get(guild.id);
    if(!queueMessage) queueMessage = await getQueueMessage(guild);

    let newContent = "**Song queue**\n";
    let embed =  new MessageEmbed()
	    .setColor('#0099ff')
        .setTitle('Current Song');
    if(serverQueue){
        for(let [index, song] of serverQueue.songs.entries()){
            if(song.isPlaying) embed.setDescription(song.title + "\n" + song.url).setThumbnail(getThumbnailFromUrl(song.url));
            else newContent += "> " + index.toString() + ". " + song.title + "\n";
        }
    }
    queueMessage.edit({content: newContent, embeds: [embed]})
}

const addSongToQueue = async (song, guild, voiceChannel) => {
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

    updateQueueMessage(guild);
}

module.exports = {
    queue,
    guildChannelMap,
    findSong,
    isMemberInVoiceChannel,
    hasConnectAndSpeakPermission,
    playSong,
    addSongToQueue,
    stopConnection,
}
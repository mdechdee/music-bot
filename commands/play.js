const { SlashCommandBuilder } = require('@discordjs/builders');
const { queue ,urlFromId, playSongFromInteraction, isYtUrl } = require('../utils/yt-queue');
const ytSearch = require('youtube-search-api');
const ytdl = require("ytdl-core");

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
        const voiceChannel = interaction.member.voice.channel;
        if (!voiceChannel)
            return interaction.channel.send(
            "You need to be in a voice channel to play music!"
            );
        const permissions = voiceChannel.permissionsFor(interaction.client.user);
        if (!permissions.has("CONNECT") || !permissions.has("SPEAK")) {
            return interaction.reply(
            "I need the permissions to join and speak in your voice channel!"
            );
        }
        // find song
        const title = interaction.options.getString('title');
        
        var songUrl;
        if(isYtUrl(title)){
            songUrl = title;
        }
        else{
            const res = await ytSearch.GetListByKeyword(title);
            if(!res?.items){
                return interaction.reply("I can't find the song you are looking for :(");
            }
            songUrl = urlFromId(res.items[0].id);
        }
        const songInfo = await ytdl.getInfo(songUrl);
        const song = {
            title: songInfo.videoDetails.title,
            url: songInfo.videoDetails.video_url,
        };
        
        const serverQueue = queue.get(interaction.guild.id);
        // play song
        if (!serverQueue) {
            const queueContruct = {
                textChannel: interaction.channel,
                voiceChannel: voiceChannel,
                connection: null,
                songs: [],
                volume: 5,
                playing: true
            };

            queue.set(interaction.guild.id, queueContruct);
            queueContruct.songs.push(song);

            try {
                playSongFromInteraction(song, interaction);
                return interaction.reply(`${"`"+song.title+"`"} has been added to the queue!\n ${song.url}`);
            } catch (err) {
                console.log(err);
                queue.delete(interaction.guild.id);
                return interaction.reply(err);
            }
        } 
        // add song to queue
        else {
            serverQueue.songs.push(song);
            return interaction.reply(`${"`"+song.title+"`"} has been added to the queue!\n ${song.url}`);
        }
	},
};
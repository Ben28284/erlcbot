const { Client, GatewayIntentBits, EmbedBuilder, SlashCommandBuilder, REST, Routes } = require('discord.js');
require('dotenv').config();

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

let activeSession = null;

// 🔧 REGISTER COMMANDS
const commands = [
  new SlashCommandBuilder()
    .setName('session')
    .setDescription('Manage ERLC sessions')
    .addSubcommand(sub =>
      sub.setName('start')
        .setDescription('Start a session')
        .addStringOption(opt =>
          opt.setName('code')
            .setDescription('Server Code')
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub.setName('end')
        .setDescription('End the session')
    )
];

const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

(async () => {
  try {
    await rest.put(
      Routes.applicationCommands('1497762509380255865'), // 🔥 REPLACE THIS
      { body: commands }
    );
    console.log('Commands registered');
  } catch (err) {
    console.error(err);
  }
})();

// ✅ BOT READY
client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}`);
});

// 🎮 COMMAND HANDLER
client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === 'session') {
    const sub = interaction.options.getSubcommand();

    // 🟢 START SESSION
    if (sub === 'start') {
      if (activeSession) {
        return interaction.reply({ content: '⚠️ A session is already active.', ephemeral: true });
      }

      const code = interaction.options.getString('code');

      activeSession = {
        host: interaction.user.username,
        code,
        startTime: Date.now()
      };

      const embed = new EmbedBuilder()
        .setTitle('🚨 CODE 3 CUSTOMS SESSION STARTED')
        .setColor(0x00BFFF)
        .setDescription('**A new ERLC session is now live! Join up and follow all server rules.**')
        .addFields(
          { name: '👮 Host', value: activeSession.host, inline: true },
          { name: '🔑 Server Code', value: code, inline: true },
          { name: '📢 Status', value: '🟢 Active', inline: true }
        )
        .setImage('https://cdn.discordapp.com/attachments/1478916407474258010/1501437526655766610/file_00000000cf0871f691f5783b432912e2.webp')
        .setFooter({ text: 'Code 3 Customs | Professional ERLC Roleplay' })
        .setTimestamp();

      await interaction.reply({
        content: '@everyone',
        embeds: [embed],
        allowedMentions: { parse: ['everyone'] }
      });
    }

    // 🔴 END SESSION
    if (sub === 'end') {
      if (!activeSession) {
        return interaction.reply({ content: '⚠️ No active session.', ephemeral: true });
      }

      const duration = Math.floor((Date.now() - activeSession.startTime) / 60000);

      const embed = new EmbedBuilder()
        .setTitle('🔴 SESSION ENDED')
        .setColor(0xFF0000)
        .setDescription('**The session has now ended. Thanks for attending! Be sure to kepp checking back for more sessions!**')
        .addFields(
          { name: '👮 Host', value: activeSession.host, inline: true },
          { name: '⏱️ Duration', value: `${duration} minutes`, inline: true },
          { name: '📢 Status', value: '🔴 Ended', inline: true }
        )
        .setFooter({ text: 'Code 3 Customs | See you next session!' })
        .setTimestamp();

      activeSession = null;

      await interaction.reply({ embeds: [embed] });
    }
  }
});

client.login(process.env.TOKEN);

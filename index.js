const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  SlashCommandBuilder,
  REST,
  Routes,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require('discord.js');

require('dotenv').config();

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

let activeSession = null;

// 🔐 PUT YOUR STAFF ROLE ID HERE
const STAFF_ROLE_ID = '1494558019164311590';

// 🔧 COMMANDS
const commands = [
  new SlashCommandBuilder()
    .setName('session')
    .setDescription('Manage ERLC sessions')
    .addSubcommand(sub =>
      sub.setName('start')
        .setDescription('Start session')
        .addStringOption(opt =>
          opt.setName('code')
            .setDescription('Server Code')
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub.setName('end')
        .setDescription('End session')
    )
];

const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

(async () => {
  await rest.put(
    Routes.applicationCommands('1497762509380255865'),
    { body: commands }
  );
})();

// ✅ READY
client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}`);
});

// 🎮 COMMAND HANDLER
client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand() && !interaction.isButton()) return;

  // 🔘 BUTTON HANDLER
  if (interaction.isButton()) {
    if (interaction.customId === 'copy_code') {
      return interaction.reply({
        content: `📋 Server Code: **${activeSession.code}**`,
        ephemeral: true
      });
    }

    if (interaction.customId === 'end_session') {
      if (!interaction.member.roles.cache.has(STAFF_ROLE_ID)) {
        return interaction.reply({ content: '❌ You are not staff.', ephemeral: true });
      }

      if (!activeSession) {
        return interaction.reply({ content: '⚠️ No active session.', ephemeral: true });
      }

      const duration = Math.floor((Date.now() - activeSession.startTime) / 60000);

      const embed = new EmbedBuilder()
        .setTitle('🔴 SESSION ENDED')
        .setColor(0xFF0000)
        .setDescription('Session has been ended by staff.')
        .addFields(
          { name: '👮 Host', value: activeSession.host, inline: true },
          { name: '⏱️ Duration', value: `${duration} minutes`, inline: true }
        )
        .setTimestamp();

      activeSession = null;

      return interaction.update({ embeds: [embed], components: [] });
    }
  }

  // 💬 SLASH COMMANDS
  if (interaction.isChatInputCommand()) {
    if (interaction.commandName === 'session') {
      const sub = interaction.options.getSubcommand();

      // 🟢 START
      if (sub === 'start') {
        if (!interaction.member.roles.cache.has(STAFF_ROLE_ID)) {
          return interaction.reply({ content: '❌ You are not staff.', ephemeral: true });
        }

        if (activeSession) {
          return interaction.reply({ content: '⚠️ Session already active.', ephemeral: true });
        }

        const code = interaction.options.getString('code');

        activeSession = {
          host: interaction.user.username,
          code,
          startTime: Date.now()
        };

        const embed = new EmbedBuilder()
          .setTitle('🚨 CODE 3 CUSTOMS SESSION')
          .setColor(0x00BFFF)
          .setDescription('**A new session is live! Join now!**')
          .addFields(
            { name: '👮 Host', value: activeSession.host, inline: true },
            { name: '🔑 Code', value: code, inline: true },
            { name: '📢 Status', value: '🟢 Active', inline: true }
          )
          .setImage('https://cdn.discordapp.com/attachments/1478916407474258010/1501437526655766610/file_00000000cf0871f691f5783b432912e2.webp')
          .setFooter({ text: 'Code 3 Customs | ERLC' })
          .setTimestamp();

        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('copy_code')
            .setLabel('📋 Copy Code')
            .setStyle(ButtonStyle.Primary),

          new ButtonBuilder()
            .setCustomId('end_session')
            .setLabel('🔴 End Session')
            .setStyle(ButtonStyle.Danger)
        );

        await interaction.reply({
          content: '@everyone',
          embeds: [embed],
          components: [row],
          allowedMentions: { parse: ['everyone'] }
        });
      }

      // 🔴 END COMMAND
      if (sub === 'end') {
        if (!interaction.member.roles.cache.has(STAFF_ROLE_ID)) {
          return interaction.reply({ content: '❌ You are not staff.', ephemeral: true });
        }

        if (!activeSession) {
          return interaction.reply({ content: '⚠️ No active session.', ephemeral: true });
        }

        const duration = Math.floor((Date.now() - activeSession.startTime) / 60000);

        const embed = new EmbedBuilder()
          .setTitle('🔴 SESSION ENDED')
          .setColor(0xFF0000)
          .addFields(
            { name: '👮 Host', value: activeSession.host, inline: true },
            { name: '⏱️ Duration', value: `${duration} minutes`, inline: true }
          );

        activeSession = null;

        await interaction.reply({ embeds: [embed] });
      }
    }
  }
});

client.login(process.env.TOKEN);

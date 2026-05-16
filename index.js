const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  SlashCommandBuilder,
  REST,
  Routes,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionsBitField,
  ChannelType
} = require('discord.js');

const fs = require('fs');
require('dotenv').config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

let activeSession = null;

// ================= LOAD FILES =================

let config = fs.existsSync('./config.json')
  ? JSON.parse(fs.readFileSync('./config.json'))
  : {};

let db = fs.existsSync('./database.json')
  ? JSON.parse(fs.readFileSync('./database.json'))
  : { warnings: {} };

function saveAll() {
  fs.writeFileSync('./config.json', JSON.stringify(config, null, 2));
  fs.writeFileSync('./database.json', JSON.stringify(db, null, 2));
}

function isStaff(member, guildId) {
  return (
    config[guildId]?.staffRole &&
    member.roles.cache.has(config[guildId].staffRole)
  );
}

// ================= COMMANDS =================

const commands = [

  new SlashCommandBuilder()
    .setName('session')
    .setDescription('Manage sessions')
    .addSubcommand(sub =>
      sub
        .setName('start')
        .setDescription('Start session')
        .addStringOption(option =>
          option
            .setName('code')
            .setDescription('Server code')
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('end')
        .setDescription('End session')
    ),

  new SlashCommandBuilder()
    .setName('setapikey')
    .setDescription('Set ERLC API key')
    .addStringOption(option =>
      option
        .setName('key')
        .setDescription('ERLC API key')
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName('configure')
    .setDescription('Configure bot')
    .addRoleOption(option =>
      option
        .setName('staffrole')
        .setDescription('Staff role')
    )
    .addRoleOption(option =>
      option
        .setName('ownerrole')
        .setDescription('Owner role')
    )
    .addRoleOption(option =>
      option
        .setName('ticketrole')
        .setDescription('Ticket support role')
    )
    .addChannelOption(option =>
      option
        .setName('logchannel')
        .setDescription('Log channel')
    ),

  new SlashCommandBuilder()
    .setName('panel')
    .setDescription('Send ticket panel'),

  new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Ban user')
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('User')
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName('reason')
        .setDescription('Reason')
    ),

  new SlashCommandBuilder()
    .setName('kick')
    .setDescription('Kick user')
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('User')
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName('reason')
        .setDescription('Reason')
    ),

  new SlashCommandBuilder()
    .setName('timeout')
    .setDescription('Timeout user')
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('User')
        .setRequired(true)
    )
    .addIntegerOption(option =>
      option
        .setName('minutes')
        .setDescription('Minutes')
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName('warn')
    .setDescription('Warn user')
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('User')
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName('reason')
        .setDescription('Reason')
    ),

  new SlashCommandBuilder()
    .setName('promotion')
    .setDescription('Promote a staff member')
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('User')
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName('rank')
        .setDescription('New rank')
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName('infraction')
    .setDescription('Issue an infraction')
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('User')
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName('reason')
        .setDescription('Reason')
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName('clear')
    .setDescription('Clear messages')
    .addIntegerOption(option =>
      option
        .setName('amount')
        .setDescription('Amount')
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName('lock')
    .setDescription('Lock current channel'),

  new SlashCommandBuilder()
    .setName('unlock')
    .setDescription('Unlock current channel'),

  new SlashCommandBuilder()
    .setName('lockdown')
    .setDescription('Lock all server channels'),

  new SlashCommandBuilder()
    .setName('unlockdown')
    .setDescription('Unlock all server channels'),

  new SlashCommandBuilder()
    .setName('slowmode')
    .setDescription('Set slowmode')
    .addIntegerOption(option =>
      option
        .setName('seconds')
        .setDescription('Seconds')
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName('say')
    .setDescription('Bot says message')
    .addStringOption(option =>
      option
        .setName('message')
        .setDescription('Message')
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName('close')
    .setDescription('Close ticket')

];

const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

(async () => {
  try {

    console.log('Registering slash commands...');

    await rest.put(
      Routes.applicationCommands('1505056547766534165'),
      { body: commands.map(c => c.toJSON()) }
    );

    console.log('Commands registered.');

  } catch (err) {
    console.error(err);
  }
})();

client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}`);
});

// ================= AUTO MOD =================

client.on('messageCreate', async message => {

  if (message.author.bot) return;

  if (message.content.toLowerCase() === 'hi') {
    return message.channel.send('Hello!');
  }

  if (message.content.includes('http')) {
    await message.delete().catch(() => {});
    return message.channel.send('🚫 Links are not allowed.');
  }
});

// ================= INTERACTIONS =================

client.on('interactionCreate', async interaction => {

  if (!interaction.guild) return;

  const guildId = interaction.guild.id;

  if (!config[guildId]) {
    config[guildId] = {};
  }

  // ================= BUTTONS =================

  if (interaction.isButton()) {

    if (interaction.customId === 'create_ticket') {

      const existing = interaction.guild.channels.cache.find(
        c => c.name === `ticket-${interaction.user.username.toLowerCase()}`
      );

      if (existing) {
        return interaction.reply({
          content: `❌ You already have a ticket: ${existing}`,
          ephemeral: true
        });
      }

      const ticketChannel = await interaction.guild.channels.create({
        name: `ticket-${interaction.user.username}`,
        type: ChannelType.GuildText,
        permissionOverwrites: [
          {
            id: interaction.guild.id,
            deny: [PermissionsBitField.Flags.ViewChannel]
          },
          {
            id: interaction.user.id,
            allow: [
              PermissionsBitField.Flags.ViewChannel,
              PermissionsBitField.Flags.SendMessages
            ]
          },
          {
            id: config[guildId].ticketRole || interaction.guild.id,
            allow: [
              PermissionsBitField.Flags.ViewChannel,
              PermissionsBitField.Flags.SendMessages
            ]
          }
        ]
      });

      const embed = new EmbedBuilder()
        .setColor('#3b82f6')
        .setTitle('🎟️ Support Ticket')
        .setDescription(
          `Welcome ${interaction.user}\n\nPlease explain your issue and a Sydney City Roleplay staff member will assist you shortly.`
        )
        .setFooter({
          text: 'Sydney City Roleplay'
        })
        .setTimestamp();

      await ticketChannel.send({
        content: config[guildId].ticketRole
          ? `<@&${config[guildId].ticketRole}>`
          : 'Staff Team',
        embeds: [embed]
      });

      return interaction.reply({
        content: `✅ Ticket created: ${ticketChannel}`,
        ephemeral: true
      });
    }

    if (interaction.customId === 'copy_code') {

      return interaction.reply({
        content: `🔑 Server Code: ${activeSession?.code || 'No Active Session'}`,
        ephemeral: true
      });
    }

    if (interaction.customId === 'session_ping') {

      return interaction.reply({
        content: '@everyone 🚨 Session is active!',
        allowedMentions: {
          parse: ['everyone']
        }
      });
    }
  }

  // ================= CHAT COMMANDS =================

  if (!interaction.isChatInputCommand()) return;

  // ================= CONFIG =================

  if (interaction.commandName === 'configure') {

    if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      return interaction.reply({
        content: '❌ Admin only.',
        ephemeral: true
      });
    }

    const staffRole = interaction.options.getRole('staffrole');
    const ownerRole = interaction.options.getRole('ownerrole');
    const ticketRole = interaction.options.getRole('ticketrole');
    const logChannel = interaction.options.getChannel('logchannel');

    if (staffRole) config[guildId].staffRole = staffRole.id;
    if (ownerRole) config[guildId].ownerRole = ownerRole.id;
    if (ticketRole) config[guildId].ticketRole = ticketRole.id;
    if (logChannel) config[guildId].logChannel = logChannel.id;

    saveAll();

    return interaction.reply({
      content: '✅ Configuration saved.',
      ephemeral: true
    });
  }

  // ================= PANEL =================

  if (interaction.commandName === 'panel') {

    if (
      !config[guildId]?.ownerRole ||
      !interaction.member.roles.cache.has(config[guildId].ownerRole)
    ) {
      return interaction.reply({
        content: '❌ Owner role only.',
        ephemeral: true
      });
    }

    const embed = new EmbedBuilder()
      .setColor('#3b82f6')
      .setTitle('🎫 Sydney City Roleplay Support')
      .setDescription(
        'Need assistance?\n\nClick the button below to contact Sydney City Roleplay Staff.'
      )
      .setFooter({
        text: 'Sydney City Roleplay'
      })
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('create_ticket')
        .setLabel('Open Ticket')
        .setEmoji('🎟️')
        .setStyle(ButtonStyle.Primary)
    );

    return interaction.reply({
      embeds: [embed],
      components: [row]
    });
  }

  // ================= SESSION =================

  if (interaction.commandName === 'session') {

    const sub = interaction.options.getSubcommand();

    if (sub === 'start') {

      if (!isStaff(interaction.member, guildId)) {
        return interaction.reply({
          content: '❌ Not staff.',
          ephemeral: true
        });
      }

      const code = interaction.options.getString('code');

      activeSession = {
        host: interaction.user.username,
        code,
        startTime: Date.now()
      };

      const embed = new EmbedBuilder()
        .setColor('#3b82f6')
        .setTitle('🚓 Sydney City Roleplay Session Started')
        .setDescription(`Hosted by ${interaction.user}`)
        .addFields(
          {
            name: '🔑 Join Code',
            value: `\`${code}\``,
            inline: true
          },
          {
            name: '🕒 Started',
            value: `<t:${Math.floor(Date.now() / 1000)}:R>`,
            inline: true
          }
        )
        .setFooter({
          text: 'Sydney City Roleplay'
        })
        .setTimestamp();

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('copy_code')
          .setLabel('Copy Code')
          .setStyle(ButtonStyle.Primary),

        new ButtonBuilder()
          .setCustomId('session_ping')
          .setLabel('Ping')
          .setStyle(ButtonStyle.Success)
      );

      return interaction.reply({
        content: '@everyone',
        embeds: [embed],
        components: [row],
        allowedMentions: {
          parse: ['everyone']
        }
      });
    }

    if (sub === 'end') {

      activeSession = null;

      return interaction.reply({
        content: '🔴 Session ended.'
      });
    }
  }

});

client.login(process.env.TOKEN);

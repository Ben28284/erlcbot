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
  ActivityType
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

  // SESSION
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

  // PROMOTION
  new SlashCommandBuilder()
    .setName('promote')
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

  // INFRACTION
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

  // CONFIG
  new SlashCommandBuilder()
    .setName('configure')
    .setDescription('Configure bot')
    .addRoleOption(option =>
      option
        .setName('staffrole')
        .setDescription('Staff role')
    )
    .addChannelOption(option =>
      option
        .setName('logchannel')
        .setDescription('Log channel')
    )
  // LOCK CHANNEL
  new SlashCommandBuilder()
    .setName('lock')
    .setDescription('Lock current channel'),

  // UNLOCK CHANNEL
  new SlashCommandBuilder()
    .setName('unlock')
    .setDescription('Unlock current channel'),

  // SERVER LOCKDOWN
  new SlashCommandBuilder()
    .setName('lockdown')
    .setDescription('Lock all server channels'),

  // SERVER UNLOCKDOWN
  new SlashCommandBuilder()
    .setName('unlockdown')
    .setDescription('Unlock all server channels'),
  ];

// ================= REGISTER =================

const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

(async () => {
  try {
    console.log('Registering slash commands...');

    await rest.put(
      Routes.applicationCommands('1497762509380255865'),
      { body: commands.map(c => c.toJSON()) }
    );

    console.log('Commands registered.');
  } catch (err) {
    console.error(err);
  }
})();

// ================= READY =================

client.once('ready', () => {

  console.log(`Logged in as ${client.user.tag}`);

  client.user.setActivity('🚓 TEST Roleplay', {
    type: ActivityType.Watching
  });
});

// ================= AUTO RESPONSES =================

client.on('messageCreate', async message => {

  if (message.author.bot) return;

  // HI RESPONSE
  if (message.content.toLowerCase() === 'hi') {
    return message.reply('👋 Hello!');
  }

  // LINK BLOCKER
  if (message.content.includes('http')) {
    await message.delete().catch(() => {});
    return message.channel.send('🚫 Links are not allowed.');
  }

  // SPAM FILTER
  if (!message.member.spam) {
    message.member.spam = 0;
  }

  message.member.spam++;

  setTimeout(() => {
    message.member.spam--;
  }, 5000);

  if (message.member.spam > 5) {
    await message.member.timeout(60000).catch(() => {});
    return message.channel.send('🚫 Stop spamming.');
  }
});

// ================= INTERACTIONS =================

client.on('interactionCreate', async interaction => {

  if (!interaction.isChatInputCommand() && !interaction.isButton()) return;

  const guildId = interaction.guild.id;

  if (!config[guildId]) {
    config[guildId] = {};
// ================= LOCK =================

if (interaction.commandName === 'lock') {

  if (!isStaff(interaction.member, guildId)) {
    return interaction.reply({
      content: '❌ Not staff.',
      ephemeral: true
    });
  }

  await interaction.channel.permissionOverwrites.edit(
    interaction.guild.roles.everyone,
    {
      SendMessages: false
    }
  );

  const embed = new EmbedBuilder()
    .setColor('#ef4444')
    .setTitle('🔒 Channel Locked')
    .setDescription(
      `This channel has been locked by ${interaction.user}.`
    )
    .setTimestamp();

  return interaction.reply({
    embeds: [embed]
  });
}

// ================= UNLOCK =================

if (interaction.commandName === 'unlock') {

  if (!isStaff(interaction.member, guildId)) {
    return interaction.reply({
      content: '❌ Not staff.',
      ephemeral: true
    });
  }

  await interaction.channel.permissionOverwrites.edit(
    interaction.guild.roles.everyone,
    {
      SendMessages: true
    }
  );

  const embed = new EmbedBuilder()
    .setColor('#22c55e')
    .setTitle('🔓 Channel Unlocked')
    .setDescription(
      `This channel has been unlocked by ${interaction.user}.`
    )
    .setTimestamp();

  return interaction.reply({
    embeds: [embed]
  });
}

// ================= LOCKDOWN =================

if (interaction.commandName === 'lockdown') {

  if (!isStaff(interaction.member, guildId)) {
    return interaction.reply({
      content: '❌ Not staff.',
      ephemeral: true
    });
  }

  await interaction.deferReply();

  let locked = 0;

  for (const channel of interaction.guild.channels.cache.values()) {

    try {

      await channel.permissionOverwrites.edit(
        interaction.guild.roles.everyone,
        {
          SendMessages: false
        }
      );

      locked++;

    } catch (err) {
      console.log(`Failed to lock ${channel.name}`);
    }
  }

  const embed = new EmbedBuilder()
    .setColor('#ef4444')
    .setTitle('🚨 SERVER LOCKDOWN')
    .setDescription(
      'All server channels have been locked.'
    )
    .addFields(
      {
        name: 'Locked By',
        value: interaction.user.tag,
        inline: true
      },
      {
        name: 'Channels Locked',
        value: `${locked}`,
        inline: true
      }
    )
    .setTimestamp();

  return interaction.editReply({
    embeds: [embed]
  });
}

// ================= UNLOCKDOWN =================

if (interaction.commandName === 'unlockdown') {

  if (!isStaff(interaction.member, guildId)) {
    return interaction.reply({
      content: '❌ Not staff.',
      ephemeral: true
    });
  }

  await interaction.deferReply();

  let unlocked = 0;

  for (const channel of interaction.guild.channels.cache.values()) {

    try {

      await channel.permissionOverwrites.edit(
        interaction.guild.roles.everyone,
        {
          SendMessages: true
        }
      );

      unlocked++;

    } catch (err) {
      console.log(`Failed to unlock ${channel.name}`);
    }
  }

  const embed = new EmbedBuilder()
    .setColor('#22c55e')
    .setTitle('✅ SERVER UNLOCKED')
    .setDescription(
      'All server channels have been unlocked.'
    )
    .addFields(
      {
        name: 'Unlocked By',
        value: interaction.user.tag,
        inline: true
      },
      {
        name: 'Channels Unlocked',
        value: `${unlocked}`,
        inline: true
      }
    )
    .setTimestamp();

  return interaction.editReply({
    embeds: [embed]
  });
}  }

  // ================= CONFIG =================

  if (interaction.commandName === 'configure') {

    if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      return interaction.reply({
        content: '❌ Admin only.',
        ephemeral: true
      });
    }

    const role = interaction.options.getRole('staffrole');
    const channel = interaction.options.getChannel('logchannel');

    if (role) {
      config[guildId].staffRole = role.id;
    }

    if (channel) {
      config[guildId].logChannel = channel.id;
    }

    saveAll();

    return interaction.reply({
      content: '✅ Config saved.',
      ephemeral: true
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
        code
      };

      const embed = new EmbedBuilder()
        .setColor('#0099ff')
        .setAuthor({
          name: 'TEST Roleplay',
          iconURL: interaction.guild.iconURL()
        })
        .setTitle('🚨 ACTIVE SESSION')
        .setDescription(
`> Welcome to **TEST Roleplay**
> Enjoy realistic and professional roleplay sessions.

━━━━━━━━━━━━━━━━━━`
        )
        .addFields(
          {
            name: '👥 Players',
            value: '```0/40```',
            inline: true
          },
          {
            name: '📥 Queue',
            value: '```0```',
            inline: true
          },
          {
            name: '🛡️ Staff',
            value: '```1```',
            inline: true
          },
          {
            name: '🔑 Join Code',
            value: `\`\`\`${code}\`\`\``,
            inline: false
          },
          {
            name: '🌐 Server',
            value: '```TEST Roleplay```',
            inline: false
          }
        )
        .setImage('https://cdn.discordapp.com/attachments/1478916407474258010/1501437526655766610/file_00000000cf0871f691f5783b432912e2.webp')
        .setThumbnail(interaction.guild.iconURL())
        .setFooter({
          text: `Hosted by ${interaction.user.username}`
        })
        .setTimestamp();

      const row = new ActionRowBuilder().addComponents(

        new ButtonBuilder()
          .setCustomId('refresh_status')
          .setLabel('Refresh')
          .setEmoji('🔄')
          .setStyle(ButtonStyle.Secondary),

        new ButtonBuilder()
          .setCustomId('session_ping')
          .setLabel('Ping')
          .setEmoji('📢')
          .setStyle(ButtonStyle.Success),

        new ButtonBuilder()
          .setCustomId('copy_code')
          .setLabel('Copy Code')
          .setEmoji('📋')
          .setStyle(ButtonStyle.Primary),

        new ButtonBuilder()
          .setCustomId('end_session')
          .setLabel('End')
          .setEmoji('🛑')
          .setStyle(ButtonStyle.Danger)

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

  // ================= BUTTONS =================

  if (interaction.isButton()) {

    if (interaction.customId === 'copy_code') {
      return interaction.reply({
        content: `📋 Join Code: ${activeSession.code}`,
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

    if (interaction.customId === 'refresh_status') {
      return interaction.reply({
        content: '🔄 Refreshed.',
        ephemeral: true
      });
    }

    if (interaction.customId === 'end_session') {

      activeSession = null;

      return interaction.update({
        content: '🔴 Session Ended',
        embeds: [],
        components: []
      });
    }
  }

  // ================= STAFF CHECK =================

  if (!isStaff(interaction.member, guildId)) {
    return interaction.reply({
      content: '❌ Not staff.',
      ephemeral: true
    });
  }

  // ================= PROMOTION =================

  if (interaction.commandName === 'promote') {

    const user = interaction.options.getUser('user');
    const rank = interaction.options.getString('rank');

    const embed = new EmbedBuilder()
      .setColor('#22c55e')
      .setTitle('📈 Staff Promotion')
      .setDescription(`${user} has been promoted!`)
      .addFields(
        {
          name: 'New Rank',
          value: rank,
          inline: true
        },
        {
          name: 'Promoted By',
          value: interaction.user.tag,
          inline: true
        }
      )
      .setThumbnail(user.displayAvatarURL())
      .setTimestamp();

    await interaction.channel.send({
      embeds: [embed]
    });

    await user.send({
      embeds: [embed]
    }).catch(() => {});

    return interaction.reply({
      content: '✅ Promotion sent.',
      ephemeral: true
    });
  }

  // ================= INFRACTION =================

  if (interaction.commandName === 'infraction') {

    const user = interaction.options.getUser('user');
    const reason = interaction.options.getString('reason');

    const embed = new EmbedBuilder()
      .setColor('#ef4444')
      .setTitle('⚠️ Staff Infraction')
      .addFields(
        {
          name: 'Staff Member',
          value: user.tag,
          inline: true
        },
        {
          name: 'Issued By',
          value: interaction.user.tag,
          inline: true
        },
        {
          name: 'Reason',
          value: reason,
          inline: false
        }
      )
      .setThumbnail(user.displayAvatarURL())
      .setTimestamp();

    await interaction.channel.send({
      embeds: [embed]
    });

    await user.send({
      embeds: [embed]
    }).catch(() => {});

    return interaction.reply({
      content: '✅ Infraction sent.',
      ephemeral: true
    });
  }
});

client.login(process.env.TOKEN);

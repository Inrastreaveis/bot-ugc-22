require("dotenv").config();

const {
    Client,
    GatewayIntentBits,
    Collection
} = require("discord.js");

const fs = require("fs");
const path = require("path");

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.MessageContent
    ]
});

client.commands = new Collection();

const db = require("./database/database");
const registrarComandos = require("./handlers/deployCommands");

// Comandos
const commandsPath = path.join(__dirname, "commands");

for (const file of fs.readdirSync(commandsPath).filter(f => f.endsWith(".js"))) {
    const command = require(path.join(commandsPath, file));
    client.commands.set(command.data.name, command);
}

// Eventos
const interactionCreate = require("./events/interactionCreate");
const selectMenu = require("./events/selectMenu");
const modalCreate = require("./events/modalCreate");
const messageCreate = require("./events/messageCreate");

// Slash Commands
client.on("interactionCreate", async interaction => {

    if (!interaction.isChatInputCommand()) return;

    const command = client.commands.get(interaction.commandName);

    if (!command) return;

    try {
        await command.execute(interaction, client);
    } catch (err) {
        console.error(err);
    }

});

// Botões / RoleSelect / ChannelSelect
client.on("interactionCreate", interaction => {
    interactionCreate(interaction, client);
});

// String Select Menu
client.on("interactionCreate", interaction => {
    selectMenu(interaction, client);
});

// Modais
client.on("interactionCreate", interaction => {
    modalCreate(interaction, client);
});

// Mensagens
client.on("messageCreate", message => {
    messageCreate(message, client);
});

client.once("clientReady", async () => {
    console.log(`${client.user.tag} online!`);

    try {
        await registrarComandos();
    } catch (error) {
        console.error("Erro ao registrar comandos:", error);
    }
});

client.login(process.env.TOKEN);
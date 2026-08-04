const { REST, Routes } = require("discord.js");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

async function registrarComandos() {
    if (!process.env.TOKEN || !process.env.CLIENT_ID) {
        throw new Error("TOKEN e CLIENT_ID precisam estar configurados.");
    }

    const commands = [];
    const commandsPath = path.join(__dirname, "..", "commands");
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith(".js"));

    for (const file of commandFiles) {
        const command = require(path.join(commandsPath, file));
        commands.push(command.data.toJSON());
    }

    const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);

    console.log("Registrando comandos...");
    await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), {
        body: commands
    });
    console.log("✅ Comandos registrados.");
}

if (require.main === module) {
    registrarComandos().catch(error => {
        console.error(error);
        process.exit(1);
    });
}

module.exports = registrarComandos;

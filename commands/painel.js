const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    EmbedBuilder,
    ActionRowBuilder,
    StringSelectMenuBuilder
} = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("painel")
        .setDescription("Envia o painel da loja")
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {

        const embed = new EmbedBuilder()
            .setTitle("🛍️ Loja de Personalização")
            .setDescription(
`Bem-vindo!

Escolha o **corpo** para começar seu pedido.`
            )
            .setColor("Blue");

        const menu = new StringSelectMenuBuilder()
            .setCustomId("cliente_corpo")
            .setPlaceholder("Escolha um corpo")
            .addOptions(
                {
                    label: "Corpo R15",
                    value: "R15",
                    emoji: "🧍"
                },
                {
                    label: "Corpo Fino",
                    value: "FINO",
                    emoji: "✨"
                },
                {
                    label: "Corpo Feminino",
                    value: "FEMININO",
                    emoji: "💃"
                }
            );

        await interaction.reply({
            embeds: [embed],
            components: [
                new ActionRowBuilder().addComponents(menu)
            ],
        });
    },
};
const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder
} = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("configurar")
        .setDescription("Painel de configuração")
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {

        const embed = new EmbedBuilder()
            .setTitle("⚙️ Painel de Configuração")
            .setDescription("Escolha uma opção abaixo.");

        const row1 = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId("cargo_acessorios")
                .setLabel("Cargo Acessórios")
                .setStyle(ButtonStyle.Primary),

            new ButtonBuilder()
                .setCustomId("cargo_roupas")
                .setLabel("Cargo Roupas")
                .setStyle(ButtonStyle.Primary),

            new ButtonBuilder()
                .setCustomId("categoria_acessorios")
                .setLabel("Categoria Acessórios")
                .setStyle(ButtonStyle.Secondary),

            new ButtonBuilder()
                .setCustomId("categoria_roupas")
                .setLabel("Categoria Roupas")
                .setStyle(ButtonStyle.Secondary)
        );

        const row2 = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId("produtos")
                .setLabel("Produtos")
                .setStyle(ButtonStyle.Success),

            new ButtonBuilder()
                .setCustomId("valores")
                .setLabel("Valores")
                .setStyle(ButtonStyle.Success),

            new ButtonBuilder()
                .setCustomId("imagens")
                .setLabel("Imagens")
                .setStyle(ButtonStyle.Success)
        );

        await interaction.reply({
            embeds: [embed],
            components: [row1, row2],
            ephemeral: true
        });

    }
};
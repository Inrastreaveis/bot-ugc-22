const {
    ActionRowBuilder,
    ChannelSelectMenuBuilder,
    ChannelType,
    RoleSelectMenuBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    EmbedBuilder,
    ButtonBuilder,
    ButtonStyle,
    PermissionFlagsBits,
    MessageFlags
} = require("discord.js");

const db = require("../database/database");

const pedidosPendentes = require(
    "../utils/pedidosPendentes"
);

const {
    obterCarrinho,
    adicionarProduto,
    limparCarrinho
} = require("../utils/carrinhos");

function formatarMoeda(valor) {
    return Number(valor || 0)
        .toFixed(2)
        .replace(".", ",");
}

function normalizarCategoria(categoria) {
    const texto = String(categoria || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();

    if (texto.includes("acessor")) {
        return "acessorios";
    }

    return "roupas";
}
async function enviarDM(interaction, usuarioId, mensagem) {
    try {
        const usuario = await interaction.client.users.fetch(
            usuarioId
        );

        await usuario.send(mensagem);

        return true;
    } catch (erro) {
        console.log(
            `Não foi possível enviar DM para ${usuarioId}:`,
            erro.message
        );

        return false;
    }
}

module.exports = async (interaction) => {

    if (interaction.isButton()) {

        if (
            interaction.customId.startsWith(
                "personalizar_produto_"
            )
        ) {

            const produtoId =
                interaction.customId.replace(
                    "personalizar_produto_",
                    ""
                );

            const modal = new ModalBuilder()
                .setCustomId(
                    `modal_personalizar_${produtoId}`
                )
                .setTitle("Personalizar Produto");

            const nome = new TextInputBuilder()
                .setCustomId("nome_personalizacao")
                .setLabel("Nome da personalização")
                .setStyle(TextInputStyle.Short)
                .setRequired(true);

            const inicial = new TextInputBuilder()
                .setCustomId("inicial")
                .setLabel("Inicial")
                .setStyle(TextInputStyle.Short)
                .setMaxLength(3)
                .setRequired(false);

            const simbolo = new TextInputBuilder()
                .setCustomId("simbolo")
                .setLabel("Símbolo")
                .setStyle(TextInputStyle.Short)
                .setRequired(false);

            const observacoes =
                new TextInputBuilder()
                    .setCustomId("observacoes")
                    .setLabel("Observações")
                    .setStyle(
                        TextInputStyle.Paragraph
                    )
                    .setRequired(false);

            modal.addComponents(
                new ActionRowBuilder()
                    .addComponents(nome),

                new ActionRowBuilder()
                    .addComponents(inicial),

                new ActionRowBuilder()
                    .addComponents(simbolo),

                new ActionRowBuilder()
                    .addComponents(observacoes)
            );

            return interaction.showModal(modal);
        }

       if (
    interaction.customId === "cancelar_pedido" ||
    interaction.customId.startsWith("cancelar_pedido_")
) {
    const token = interaction.customId.startsWith("cancelar_pedido_")
        ? interaction.customId.replace("cancelar_pedido_", "")
        : null;

    if (token) {
        const pedidoPendente = pedidosPendentes.get(token);

        if (
            pedidoPendente &&
            pedidoPendente.usuarioId !== interaction.user.id
        ) {
            return interaction.reply({
                content: "❌ Este pedido não pertence a você.",
                flags: MessageFlags.Ephemeral
            });
        }

        pedidosPendentes.delete(token);
    }

    return interaction.update({
        content: "❌ Produto cancelado.",
        embeds: [],
        components: [],
        attachments: []
    });
}

    if (
        interaction.customId.startsWith(
            "adicionar_carrinho_"
        )
    ) {

            const token =
                interaction.customId.replace(
                    "adicionar_carrinho_",
                    ""
                );

            const dadosPedido =
                pedidosPendentes.get(token);

            if (!dadosPedido) {
                return interaction.reply({
                    content:
                        "❌ Este produto expirou. Faça a personalização novamente.",
                    flags:
                        MessageFlags.Ephemeral
                });
            }

            if (
                dadosPedido.usuarioId !==
                interaction.user.id
            ) {
                return interaction.reply({
                    content:
                        "❌ Este produto não pertence a você.",
                    flags:
                        MessageFlags.Ephemeral
                });
            }

            const produto = db.prepare(`
                SELECT *
                FROM produtos
                WHERE id = ?
                AND ativo = 1
            `).get(dadosPedido.produtoId);

            if (!produto) {
                pedidosPendentes.delete(token);

                return interaction.reply({
                    content:
                        "❌ Produto não encontrado.",
                    flags:
                        MessageFlags.Ephemeral
                });
            }

            const resultadoCarrinho =
                adicionarProduto(
                    interaction.user.id,
                    {
                        produtoId:
                            produto.id,

                        nomeProduto:
                            produto.nome,

                        categoria:
                            produto.categoria,

                        tipo:
                            produto.tipo,

                        preco:
                            produto.preco,

                        imagem:
                            produto.imagem,

                        nome:
                            dadosPedido.nome,

                        inicial:
                            dadosPedido.inicial,

                        simbolo:
                            dadosPedido.simbolo,

                        observacoes:
                            dadosPedido.observacoes
                    }
                );

            if (!resultadoCarrinho.sucesso) {

                const categoriaAtual =
                    resultadoCarrinho.categoria ===
                    "acessorios"
                        ? "acessórios"
                        : "roupas";

                return interaction.reply({
                    content:
`❌ Seu carrinho já possui produtos de **${categoriaAtual}**.

Você não pode misturar acessórios e roupas no mesmo pedido.

Finalize ou limpe o carrinho atual antes de adicionar este produto.`,
                    flags:
                        MessageFlags.Ephemeral
                });
            }

            pedidosPendentes.delete(token);

            const carrinho =
                resultadoCarrinho.carrinho;

            const total =
                carrinho.reduce(
                    (soma, item) =>
                        soma + Number(item.preco),
                    0
                );

            return interaction.update({
                content:
`✅ Produto adicionado ao carrinho.

🛒 Itens no carrinho: **${carrinho.length}**
💰 Total: **R$ ${formatarMoeda(total)}**

Escolha outro produto no painel ou finalize o carrinho.`,
                embeds: [],
                components: [],
                attachments: []
            });
        }
                if (
            interaction.customId.startsWith(
                "finalizar_carrinho_"
            )
        ) {

            const token =
                interaction.customId.replace(
                    "finalizar_carrinho_",
                    ""
                );

            const dadosPedido =
                pedidosPendentes.get(token);

            if (!dadosPedido) {
                return interaction.reply({
                    content:
                        "❌ Este produto expirou. Faça a personalização novamente.",
                    flags: MessageFlags.Ephemeral
                });
            }

            if (
                dadosPedido.usuarioId !==
                interaction.user.id
            ) {
                return interaction.reply({
                    content:
                        "❌ Este produto não pertence a você.",
                    flags: MessageFlags.Ephemeral
                });
            }

            const produto = db.prepare(`
                SELECT *
                FROM produtos
                WHERE id = ?
                AND ativo = 1
            `).get(dadosPedido.produtoId);

            if (!produto) {
                pedidosPendentes.delete(token);

                return interaction.reply({
                    content:
                        "❌ Produto não encontrado.",
                    flags: MessageFlags.Ephemeral
                });
            }

            const resultadoCarrinho =
                adicionarProduto(
                    interaction.user.id,
                    {
                        produtoId: produto.id,
                        nomeProduto: produto.nome,
                        categoria: produto.categoria,
                        tipo: produto.tipo,
                        preco: produto.preco,
                        imagem: produto.imagem,
                        nome: dadosPedido.nome,
                        inicial: dadosPedido.inicial,
                        simbolo: dadosPedido.simbolo,
                        observacoes: dadosPedido.observacoes
                    }
                );

            if (!resultadoCarrinho.sucesso) {

                const categoriaAtual =
                    resultadoCarrinho.categoria === "acessorios"
                        ? "acessórios"
                        : "roupas";

                return interaction.reply({
                    content:
`❌ Seu carrinho já possui produtos de **${categoriaAtual}**.

Você não pode misturar acessórios e roupas no mesmo pedido.

Finalize ou limpe o carrinho atual antes de adicionar este produto.`,
                    flags: MessageFlags.Ephemeral
                });
            }

            pedidosPendentes.delete(token);

            const carrinho =
                resultadoCarrinho.carrinho;

            const total =
                carrinho.reduce(
                    (soma, item) =>
                        soma + Number(item.preco),
                    0
                );

            const listaItens =
                carrinho
                    .map(
                        (item, indice) =>
`**${indice + 1}. ${item.nomeProduto}**
Categoria: **${item.categoria}**
Tipo: **${item.tipo}**
Nome: **${item.nome}**
Inicial: **${item.inicial}**
Símbolo: **${item.simbolo}**
Observações: ${item.observacoes}
Valor: **R$ ${formatarMoeda(item.preco)}**`
                    )
                    .join("\n\n");

            const embed =
                new EmbedBuilder()
                    .setTitle("🛒 Confirmar carrinho")
                    .setDescription(
`${listaItens}

Total: **R$ ${formatarMoeda(total)}**`
                    )
                    .setColor("Green");

            const botoes =
                new ActionRowBuilder()
                    .addComponents(

                        new ButtonBuilder()
                            .setCustomId(
                                "confirmar_carrinho"
                            )
                            .setLabel("Confirmar pedido")
                            .setEmoji("✅")
                            .setStyle(ButtonStyle.Success),

                        new ButtonBuilder()
                            .setCustomId(
                                "limpar_carrinho"
                            )
                            .setLabel("Limpar carrinho")
                            .setEmoji("🗑️")
                            .setStyle(ButtonStyle.Danger)
                    );

            return interaction.update({
                content: "",
                embeds: [embed],
                components: [botoes],
                attachments: []
            });
        }

        if (
            interaction.customId ===
            "limpar_carrinho"
        ) {

            limparCarrinho(
                interaction.user.id
            );

            return interaction.update({
                content:
                    "🗑️ Carrinho esvaziado.",
                embeds: [],
                components: [],
                attachments: []
            });
        }
                if (interaction.customId === "confirmar_carrinho") {

            const carrinho = obterCarrinho(interaction.user.id);

            if (!carrinho.length) {
                return interaction.reply({
                    content: "❌ Seu carrinho está vazio.",
                    flags: MessageFlags.Ephemeral
                });
            }

            await interaction.deferReply({
                flags: MessageFlags.Ephemeral
            });

            const categoriaPrincipal =
                normalizarCategoria(carrinho[0].categoria);

            const acessorios =
                categoriaPrincipal === "acessorios";

            const chaveCargo = acessorios
                ? "cargo_acessorios"
                : "cargo_roupas";

            const chaveCategoria = acessorios
                ? "categoria_acessorios"
                : "categoria_roupas";

            const cargoConfig = db.prepare(`
                SELECT valor
                FROM configuracoes
                WHERE chave = ?
            `).get(chaveCargo);

            const categoriaConfig = db.prepare(`
                SELECT valor
                FROM configuracoes
                WHERE chave = ?
            `).get(chaveCategoria);

            if (!cargoConfig || !categoriaConfig) {
                return interaction.editReply({
                    content:
                        "❌ Configure primeiro o cargo e a categoria dos tickets."
                });
            }

            const nomeCanal =
                `pedido-${interaction.user.username}`
                    .toLowerCase()
                    .normalize("NFD")
                    .replace(/[\u0300-\u036f]/g, "")
                    .replace(/[^a-z0-9-]/g, "-")
                    .replace(/-+/g, "-")
                    .slice(0, 90);

            let ticket;

            try {

                ticket =
                    await interaction.guild.channels.create({

                        name: nomeCanal,
                        type: ChannelType.GuildText,
                        parent: categoriaConfig.valor,

                        permissionOverwrites: [

                            {
                                id: interaction.guild.id,
                                deny: [
                                    PermissionFlagsBits.ViewChannel
                                ]
                            },

                            {
                                id: interaction.user.id,
                                allow: [
                                    PermissionFlagsBits.ViewChannel,
                                    PermissionFlagsBits.SendMessages,
                                    PermissionFlagsBits.ReadMessageHistory,
                                    PermissionFlagsBits.AttachFiles
                                ]
                            },

                            {
                                id: cargoConfig.valor,
                                allow: [
                                    PermissionFlagsBits.ViewChannel,
                                    PermissionFlagsBits.SendMessages,
                                    PermissionFlagsBits.ReadMessageHistory,
                                    PermissionFlagsBits.AttachFiles
                                ]
                            },

                            {
                                id: interaction.client.user.id,
                                allow: [
                                    PermissionFlagsBits.ViewChannel,
                                    PermissionFlagsBits.SendMessages,
                                    PermissionFlagsBits.ManageChannels,
                                    PermissionFlagsBits.ReadMessageHistory
                                ]
                            }

                        ]

                    });

            } catch (erro) {

                console.error(erro);

                return interaction.editReply({
                    content: "❌ Não consegui criar o ticket."
                });

            }

            const total =
                carrinho.reduce(
                    (soma, item) =>
                        soma + Number(item.preco),
                    0
                );

            const primeiro = carrinho[0];
                        const nomesProdutos = carrinho
                .map(item => item.nomeProduto)
                .join(", ");

            const personalizacoes = carrinho
                .map(
                    (item, indice) =>
                        `${indice + 1}. ${item.nomeProduto}: ${item.nome}`
                )
                .join(" | ");

            const iniciais = carrinho
                .map(
                    (item, indice) =>
                        `${indice + 1}. ${item.inicial}`
                )
                .join(" | ");

            const simbolos = carrinho
                .map(
                    (item, indice) =>
                        `${indice + 1}. ${item.simbolo}`
                )
                .join(" | ");

            const observacoesGerais = carrinho
                .map(
                    (item, indice) =>
                        `${indice + 1}. ${item.nomeProduto}: ${item.observacoes}`
                )
                .join("\n");

            const info = db.prepare(`
                INSERT INTO pedidos (
                    usuario_id,
                    produto_id,
                    corpo,
                    categoria,
                    tipo,
                    produto,
                    nome_personalizacao,
                    inicial,
                    simbolo,
                    observacoes,
                    valor,
                    ticket_id,
                    status
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).run(
                interaction.user.id,
                primeiro.produtoId,
                "Carrinho",
                primeiro.categoria,
                "Vários produtos",
                nomesProdutos,
                personalizacoes,
                iniciais,
                simbolos,
                observacoesGerais,
                total,
                ticket.id,
                "Pendente"
            );

            const listaTicket = carrinho
                .map(
                    (item, indice) =>
`**${indice + 1}. ${item.nomeProduto}**
Tipo: **${item.tipo}**
Nome: **${item.nome}**
Inicial: **${item.inicial}**
Símbolo: **${item.simbolo}**
Observações: ${item.observacoes}
Valor: **R$ ${formatarMoeda(item.preco)}**`
                )
                .join("\n\n");

            const embed = new EmbedBuilder()
                .setTitle(`🛍️ Pedido #${info.lastInsertRowid}`)
                .setDescription(
`Cliente: <@${interaction.user.id}>

${listaTicket}

Total: **R$ ${formatarMoeda(total)}**

Status: **Pendente**`
                )
                .setColor("Green")
                .setTimestamp();

            const botoes = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId(`assumir_pedido_${info.lastInsertRowid}`)
                        .setLabel("Assumir")
                        .setEmoji("✅")
                        .setStyle(ButtonStyle.Primary),

                    new ButtonBuilder()
                        .setCustomId(`producao_pedido_${info.lastInsertRowid}`)
                        .setLabel("Em produção")
                        .setEmoji("🎨")
                        .setStyle(ButtonStyle.Secondary),

                    new ButtonBuilder()
                        .setCustomId(`finalizar_pedido_${info.lastInsertRowid}`)
                        .setLabel("Finalizar")
                        .setEmoji("📦")
                        .setStyle(ButtonStyle.Success),

                    new ButtonBuilder()
                        .setCustomId(`fechar_pedido_${info.lastInsertRowid}`)
                        .setLabel("Fechar")
                        .setEmoji("🔒")
                        .setStyle(ButtonStyle.Danger)
                );

            await ticket.send({
                content: `<@${interaction.user.id}> <@&${cargoConfig.valor}>`,
                embeds: [embed],
                components: [botoes]
            });

            const imagens = [
                ...new Set(
                    carrinho
                        .map(item => item.imagem)
                        .filter(Boolean)
                )
            ];

            for (const imagem of imagens) {
                await ticket.send({
                    files: [imagem]
                }).catch(console.error);
            }

            limparCarrinho(interaction.user.id);

            return interaction.editReply({
                content: `✅ Pedido criado: ${ticket}`
            });
        }
        if (interaction.customId.startsWith("avaliar_pedido_")) {

    const partes = interaction.customId.split("_");

    const pedidoId = partes[2];
    const nota = Number(partes[3]);

    if (!pedidoId || !nota || nota < 1 || nota > 5) {
        return interaction.reply({
            content: "❌ Avaliação inválida.",
            flags: MessageFlags.Ephemeral
        });
    }

    const pedido = db.prepare(`
        SELECT *
        FROM pedidos
        WHERE id = ?
    `).get(pedidoId);

    if (!pedido) {
        return interaction.reply({
            content: "❌ Pedido não encontrado.",
            flags: MessageFlags.Ephemeral
        });
    }

    if (pedido.usuario_id !== interaction.user.id) {
        return interaction.reply({
            content: "❌ Você não pode avaliar este pedido.",
            flags: MessageFlags.Ephemeral
        });
    }

    const avaliacaoExistente = db.prepare(`
        SELECT *
        FROM avaliacoes
        WHERE pedido_id = ?
        AND usuario_id = ?
    `).get(
        pedidoId,
        interaction.user.id
    );

    if (avaliacaoExistente) {
        return interaction.reply({
            content: "❌ Você já avaliou este pedido.",
            flags: MessageFlags.Ephemeral
        });
    }

    db.prepare(`
        INSERT INTO avaliacoes (
            pedido_id,
            usuario_id,
            nota
        )
        VALUES (?, ?, ?)
    `).run(
        pedidoId,
        interaction.user.id,
        nota
    );

    const estrelas = "⭐".repeat(nota);

    return interaction.update({
        content:
`✅ Obrigado pela sua avaliação!

Pedido: #${pedidoId}
Nota: ${estrelas}`,
        components: []
    });
}
                const acoesPedido = [
            "assumir_pedido_",
            "producao_pedido_",
            "finalizar_pedido_",
            "fechar_pedido_"
        ];

        const acaoEncontrada = acoesPedido.find(prefixo =>
            interaction.customId.startsWith(prefixo)
        );

        if (acaoEncontrada) {

            const pedidoId = interaction.customId.replace(
                acaoEncontrada,
                ""
            );

            const pedido = db.prepare(`
                SELECT *
                FROM pedidos
                WHERE id = ?
            `).get(pedidoId);

            if (!pedido) {
                return interaction.reply({
                    content: "❌ Pedido não encontrado.",
                    flags: MessageFlags.Ephemeral
                });
            }

            const categoriaNormalizada = String(
                pedido.categoria || ""
            )
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "")
                .toLowerCase();

            const acessorios =
                categoriaNormalizada.includes("acessor");

            const chaveCargo = acessorios
                ? "cargo_acessorios"
                : "cargo_roupas";

            const cargoConfig = db.prepare(`
                SELECT valor
                FROM configuracoes
                WHERE chave = ?
            `).get(chaveCargo);

            if (!cargoConfig) {
                return interaction.reply({
                    content:
                        "❌ O cargo da equipe não está configurado.",
                    flags: MessageFlags.Ephemeral
                });
            }

            const membro = await interaction.guild.members
                .fetch(interaction.user.id)
                .catch(() => null);

            const possuiCargo =
                membro &&
                membro.roles.cache.has(cargoConfig.valor);

            const administrador =
                interaction.memberPermissions?.has(
                    PermissionFlagsBits.Administrator
                );

            if (!possuiCargo && !administrador) {
                return interaction.reply({
                    content:
                        "❌ Apenas a equipe responsável pode usar estes botões.",
                    flags: MessageFlags.Ephemeral
                });
            }

            if (acaoEncontrada === "assumir_pedido_") {

                if (pedido.status !== "Pendente") {
                    return interaction.reply({
                        content:
                            `❌ Este pedido já está com o status: **${pedido.status}**.`,
                        flags: MessageFlags.Ephemeral
                    });
                }

                const novoStatus =
                    `Assumido por ${interaction.user.username}`;

                db.prepare(`
                    UPDATE pedidos
                    SET status = ?
                    WHERE id = ?
                `).run(novoStatus, pedidoId);
                await enviarDM(
    interaction,
    pedido.usuario_id,
`🛍️ Seu pedido foi assumido!

👤 Atendente: ${interaction.user.username}

Em breve ele iniciará a produção do seu pedido.

Obrigado por comprar conosco! ❤️`
);

                const embedAtual =
                    interaction.message.embeds[0];

                if (!embedAtual) {
                    return interaction.reply({
                        content: "✅ Pedido assumido.",
                        flags: MessageFlags.Ephemeral
                    });
                }

                const embed =
                    EmbedBuilder.from(embedAtual);

                const descricao =
                    embedAtual.description.replace(
                        /Status: \*\*[^\n]*\*\*/,
                        `Status: **${novoStatus}**`
                    );

                embed
                    .setDescription(descricao)
                    .setColor("Blue");

                await interaction.update({
                    embeds: [embed],
                    components:
                        interaction.message.components
                });

                return interaction.followUp({
                    content:
                        `✅ <@${interaction.user.id}> assumiu o pedido.`,
                    flags: MessageFlags.Ephemeral
                });
            }

            if (acaoEncontrada === "producao_pedido_") {

                const novoStatus = "Em produção";

                db.prepare(`
                    UPDATE pedidos
                    SET status = ?
                    WHERE id = ?
                `).run(novoStatus, pedidoId);

                const embedAtual =
                    interaction.message.embeds[0];

                if (!embedAtual) {
                    return interaction.reply({
                        content:
                            "🎨 Pedido colocado em produção.",
                        flags: MessageFlags.Ephemeral
                    });
                }

                const embed =
                    EmbedBuilder.from(embedAtual);

                const descricao =
                    embedAtual.description.replace(
                        /Status: \*\*[^\n]*\*\*/,
                        `Status: **${novoStatus}**`
                    );

                embed
                    .setDescription(descricao)
                    .setColor("Orange");

                await interaction.update({
                    embeds: [embed],
                    components:
                        interaction.message.components
                });

                await interaction.channel.send({
                    content:
                        `🎨 <@${pedido.usuario_id}>, seu pedido está em produção.`
                });
                await enviarDM(
    interaction,
    pedido.usuario_id,
`🎨 Seu pedido entrou em produção!

Pedido: #${pedidoId}

Nossa equipe já começou a preparar seu produto.`
);

                return;
            }

            if (acaoEncontrada === "finalizar_pedido_") {

                const novoStatus = "Finalizado";

                db.prepare(`
                    UPDATE pedidos
                    SET status = ?
                    WHERE id = ?
                `).run(novoStatus, pedidoId);

                const embedAtual =
                    interaction.message.embeds[0];

                if (!embedAtual) {
                    return interaction.reply({
                        content: "📦 Pedido finalizado.",
                        flags: MessageFlags.Ephemeral
                    });
                }

                const embed =
                    EmbedBuilder.from(embedAtual);

                const descricao =
                    embedAtual.description.replace(
                        /Status: \*\*[^\n]*\*\*/,
                        `Status: **${novoStatus}**`
                    );

                embed
                    .setDescription(descricao)
                    .setColor("Green");

                const botoesDesativados =
                    interaction.message.components.map(
                        row => {

                            const novaLinha =
                                new ActionRowBuilder();

                            for (
                                const botaoAtual
                                of row.components
                            ) {

                                const botao =
                                    ButtonBuilder.from(
                                        botaoAtual
                                    );

                                if (
                                    botaoAtual.customId &&
                                    botaoAtual.customId
                                        .startsWith(
                                            "fechar_pedido_"
                                        )
                                ) {
                                    botao.setDisabled(false);
                                } else {
                                    botao.setDisabled(true);
                                }

                                novaLinha.addComponents(
                                    botao
                                );
                            }

                            return novaLinha;
                        }
                    );

                await interaction.update({
                    embeds: [embed],
                    components: botoesDesativados
                });

                await interaction.channel.send({
                    content:
                        `📦 <@${pedido.usuario_id}>, seu pedido foi finalizado!`
                });
                await enviarDM(
    interaction,
    pedido.usuario_id,
`📦 Seu pedido foi finalizado!

Pedido: #${pedidoId}

Seu produto está pronto. Aguarde as próximas instruções da equipe.`
);

                return;
            }

            if (acaoEncontrada === "fechar_pedido_") {

                db.prepare(`
                    UPDATE pedidos
                    SET status = ?
                    WHERE id = ?
                `).run("Fechado", pedidoId);
                const botoesAvaliacao = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
        .setCustomId(`avaliar_pedido_${pedidoId}_1`)
        .setLabel("1")
        .setEmoji("⭐")
        .setStyle(ButtonStyle.Secondary),

    new ButtonBuilder()
        .setCustomId(`avaliar_pedido_${pedidoId}_2`)
        .setLabel("2")
        .setEmoji("⭐")
        .setStyle(ButtonStyle.Secondary),

    new ButtonBuilder()
        .setCustomId(`avaliar_pedido_${pedidoId}_3`)
        .setLabel("3")
        .setEmoji("⭐")
        .setStyle(ButtonStyle.Primary),

    new ButtonBuilder()
        .setCustomId(`avaliar_pedido_${pedidoId}_4`)
        .setLabel("4")
        .setEmoji("⭐")
        .setStyle(ButtonStyle.Success),

    new ButtonBuilder()
        .setCustomId(`avaliar_pedido_${pedidoId}_5`)
        .setLabel("5")
        .setEmoji("⭐")
        .setStyle(ButtonStyle.Success)
);

try {

    const usuario = await interaction.client.users.fetch(
        pedido.usuario_id
    );

    await usuario.send({
        content:
`🔒 Seu pedido foi concluído!

Pedido: #${pedidoId}

Muito obrigado pela preferência! ❤️

Como foi seu atendimento?

Escolha uma nota de 1 a 5 estrelas:`,
        components: [botoesAvaliacao]
    });

} catch (erro) {

    console.log(
        "Erro ao enviar avaliação:",
        erro
    );

}

                await interaction.reply({
                    content:
                        "🔒 O ticket será f echado em 5 segundos."
                });

                setTimeout(async () => {
                    await interaction.channel
                        .delete(
                            "Pedido fechado pela equipe"
                        )
                        .catch(console.error);
                }, 5000);

                return;
            }
        }
                switch (interaction.customId) {

            case "cargo_acessorios": {

                const row = new ActionRowBuilder().addComponents(
                    new RoleSelectMenuBuilder()
                        .setCustomId("selecionar_cargo_acessorios")
                        .setPlaceholder("Selecione o cargo dos acessórios")
                        .setMinValues(1)
                        .setMaxValues(1)
                );

                return interaction.reply({
                    content: "Selecione o cargo:",
                    components: [row],
                    flags: MessageFlags.Ephemeral
                });
            }

            case "cargo_roupas": {

                const row = new ActionRowBuilder().addComponents(
                    new RoleSelectMenuBuilder()
                        .setCustomId("selecionar_cargo_roupas")
                        .setPlaceholder("Selecione o cargo das roupas")
                        .setMinValues(1)
                        .setMaxValues(1)
                );

                return interaction.reply({
                    content: "Selecione o cargo:",
                    components: [row],
                    flags: MessageFlags.Ephemeral
                });
            }

            case "categoria_acessorios": {

                const row = new ActionRowBuilder().addComponents(
                    new ChannelSelectMenuBuilder()
                        .setCustomId("selecionar_categoria_acessorios")
                        .setPlaceholder("Selecione a categoria")
                        .addChannelTypes(ChannelType.GuildCategory)
                );

                return interaction.reply({
                    content: "Selecione a categoria dos tickets de acessórios.",
                    components: [row],
                    flags: MessageFlags.Ephemeral
                });
            }

            case "categoria_roupas": {

                const row = new ActionRowBuilder().addComponents(
                    new ChannelSelectMenuBuilder()
                        .setCustomId("selecionar_categoria_roupas")
                        .setPlaceholder("Selecione a categoria")
                        .addChannelTypes(ChannelType.GuildCategory)
                );

                return interaction.reply({
                    content: "Selecione a categoria dos tickets de roupas.",
                    components: [row],
                    flags: MessageFlags.Ephemeral
                });
            }
        }
    }

    if (interaction.isRoleSelectMenu()) {

        const cargo = interaction.values[0];

        if (interaction.customId === "selecionar_cargo_acessorios") {

            db.prepare(`
                INSERT OR REPLACE INTO configuracoes(chave, valor)
                VALUES (?, ?)
            `).run("cargo_acessorios", cargo);

            return interaction.update({
                content: "✅ Cargo de acessórios salvo.",
                components: []
            });
        }

        if (interaction.customId === "selecionar_cargo_roupas") {

            db.prepare(`
                INSERT OR REPLACE INTO configuracoes(chave, valor)
                VALUES (?, ?)
            `).run("cargo_roupas", cargo);

            return interaction.update({
                content: "✅ Cargo de roupas salvo.",
                components: []
            });
        }
    }

    if (interaction.isChannelSelectMenu()) {

        const categoria = interaction.values[0];

        if (interaction.customId === "selecionar_categoria_acessorios") {

            db.prepare(`
                INSERT OR REPLACE INTO configuracoes(chave, valor)
                VALUES (?, ?)
            `).run("categoria_acessorios", categoria);

            return interaction.update({
                content: "✅ Categoria de acessórios salva.",
                components: []
            });
        }

        if (interaction.customId === "selecionar_categoria_roupas") {

            db.prepare(`
                INSERT OR REPLACE INTO configuracoes(chave, valor)
                VALUES (?, ?)
            `).run("categoria_roupas", categoria);

            return interaction.update({
                content: "✅ Categoria de roupas salva.",
                components: []
            });
        }
    }
};
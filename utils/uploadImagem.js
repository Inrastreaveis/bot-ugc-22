const fs = require("fs-extra");
const path = require("path");
const { v4: uuid } = require("uuid");

module.exports = async (attachment) => {

    if (!attachment) return null;

    const pasta = path.join(__dirname, "..", "data", "imagens");

    await fs.ensureDir(pasta);

    const extensao = path.extname(attachment.name);

    const nomeArquivo = `${uuid()}${extensao}`;

    const destino = path.join(pasta, nomeArquivo);

    const response = await fetch(attachment.url);

    const buffer = Buffer.from(await response.arrayBuffer());

    await fs.writeFile(destino, buffer);

    return `data/imagens/${nomeArquivo}`;

};
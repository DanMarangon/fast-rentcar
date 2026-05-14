import { NextResponse } from "next/server";

type StatusVeiculo = "disponivel" | "alugado" | "reservado" | "manutencao";
type StatusReserva = "pendente" | "confirmada" | "ativa" | "concluida" | "cancelada";
type StatusDocumento = "pendente" | "aprovado" | "reprovado";

type VeiculoEntrada = {
  id: string;
  locadora: string;
  marca: string;
  modelo: string;
  categoria: string;
  cidade: string;
  cambio: "Manual" | "Automatico";
  combustivel: "Flex" | "Gasolina" | "Diesel" | "Eletrico" | "Hibrido";
  diaria: number;
  disponibilidade: number;
  avaliacao: number;
  status: StatusVeiculo;
  recursos: string[];
};

type ReservaEntrada = {
  cliente: string;
  status: StatusReserva;
};

type UsuarioEntrada = {
  nome: string;
  nascimento?: string;
  cnhEmitidaEm?: string;
  comprovante: StatusDocumento;
  pendenciaFinanceira: boolean;
};

type ConsultorPayload = {
  consulta: string;
  retirada: string;
  devolucao: string;
  usuario: UsuarioEntrada;
  reservas: ReservaEntrada[];
  veiculos: VeiculoEntrada[];
};

type PerfilExtraido = {
  idade?: number | null;
  rendaMensal?: number | null;
  cidade?: string | null;
  objetivo: string;
  periodoDias: number;
  limiteDiaria: number;
  elegivel: boolean;
  motivoElegibilidade?: string | null;
};

type SugestaoConsultor = {
  veiculoId: string;
  score: number;
  motivo: string;
  custoEstimado: number;
  adequacaoFinanceira: string;
  alerta?: string;
  reservavel: boolean;
};

type ConsultoriaResposta = {
  fonte: "integrada";
  resumo: string;
  criterios: string[];
  avisos: string[];
  perfilExtraido: PerfilExtraido;
  sugestoes: SugestaoConsultor[];
};

const moeda = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const marcasConhecidas = [
  "Alfa Romeo",
  "Audi",
  "BMW",
  "BYD",
  "Chevrolet",
  "Citroen",
  "Fiat",
  "Ferrari",
  "Ford",
  "Genesis",
  "GWM",
  "Honda",
  "Hyundai",
  "Jeep",
  "Kia",
  "Lamborghini",
  "Land Rover",
  "Lexus",
  "Maserati",
  "Mazda",
  "McLaren",
  "Mercedes-Benz",
  "Mini",
  "Mitsubishi",
  "Nissan",
  "Peugeot",
  "Porsche",
  "RAM",
  "Renault",
  "Subaru",
  "Tesla",
  "Toyota",
  "Volkswagen",
  "Volvo",
];

const palavrasIgnoradasConsulta = new Set([
  "aqui",
  "alugar",
  "aluguel",
  "ano",
  "anos",
  "ate",
  "carro",
  "cidade",
  "com",
  "daqui",
  "de",
  "dia",
  "diaria",
  "diarias",
  "dias",
  "do",
  "dos",
  "em",
  "eu",
  "estado",
  "estou",
  "indo",
  "limite",
  "locacao",
  "locar",
  "max",
  "maxima",
  "maximo",
  "mensal",
  "mes",
  "meu",
  "meus",
  "minha",
  "minhas",
  "na",
  "nas",
  "no",
  "nos",
  "num",
  "ao",
  "aos",
  "as",
  "os",
  "para",
  "pra",
  "pro",
  "por",
  "preciso",
  "quero",
  "queria",
  "real",
  "reais",
  "renda",
  "sua",
  "tenho",
  "uma",
  "um",
  "ou",
  "uso",
  "veiculo",
  "viagem",
  "viajar",
]);

const aliasesLocalidadePorCidade: Record<string, string[]> = {
  "Sao Paulo": ["sao paulo", "sp", "sampa", "capital paulista", "estado de sao paulo"],
  "Rio de Janeiro": ["rio de janeiro", "rj", "rio", "capital carioca"],
  "Belo Horizonte": ["belo horizonte", "bh", "minas gerais", "minas", "mg"],
  Curitiba: ["curitiba", "parana", "pr"],
  Campinas: ["campinas"],
  "Porto Alegre": ["porto alegre", "rio grande do sul", "rs"],
  Brasilia: ["brasilia", "df", "distrito federal", "centro oeste", "centro-oeste"],
  Goiania: ["goiania", "goias", "go"],
  Salvador: ["salvador", "bahia", "ba"],
  Recife: ["recife", "pernambuco", "pe"],
  Florianopolis: ["florianopolis", "floripa", "santa catarina", "sc"],
  Manaus: ["manaus", "amazonas", "am", "regiao norte", "norte"],
  Belem: ["belem", "belem do para", "estado do para", "pa"],
};

function idadeEmAnos(data?: string) {
  if (!data) return 0;
  const nascimento = new Date(`${data}T12:00:00`);
  if (Number.isNaN(nascimento.getTime())) return 0;
  const agora = new Date();
  let idade = agora.getFullYear() - nascimento.getFullYear();
  const aniversarioEsteAno = new Date(agora.getFullYear(), nascimento.getMonth(), nascimento.getDate());
  if (agora < aniversarioEsteAno) idade -= 1;
  return idade;
}

function diferencaDias(inicio: string, fim: string) {
  const retirada = new Date(`${inicio}T12:00:00`);
  const devolucao = new Date(`${fim}T12:00:00`);
  if (Number.isNaN(retirada.getTime()) || Number.isNaN(devolucao.getTime())) return 1;
  return Math.max(1, Math.round((devolucao.getTime() - retirada.getTime()) / 86400000));
}

function normalizarTexto(texto: string) {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function normalizarBusca(texto: string) {
  return ` ${normalizarTexto(texto).replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim()} `;
}

function tokensNormalizados(texto: string, tamanhoMinimo = 3) {
  return normalizarBusca(texto)
    .trim()
    .split(/\s+/)
    .filter((token) => token.length >= tamanhoMinimo);
}

function tokensBusca(texto: string, tamanhoMinimo = 3) {
  return tokensNormalizados(texto, tamanhoMinimo).filter((token) => !palavrasIgnoradasConsulta.has(token));
}

function tokenNumerico(token: string) {
  return /^\d+$/.test(token);
}

function distanciaEdicao(a: string, b: string) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  const anterior = Array.from({ length: b.length + 1 }, (_, index) => index);
  const atual = Array.from({ length: b.length + 1 }, () => 0);

  for (let i = 1; i <= a.length; i += 1) {
    atual[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const custo = a[i - 1] === b[j - 1] ? 0 : 1;
      atual[j] = Math.min(atual[j - 1] + 1, anterior[j] + 1, anterior[j - 1] + custo);
    }
    for (let j = 0; j <= b.length; j += 1) anterior[j] = atual[j];
  }

  return anterior[b.length];
}

function tokenParecido(entrada: string, alvo: string) {
  if (entrada === alvo) return true;
  if (entrada.length === 3 && alvo.length === 3) {
    return distanciaEdicao(entrada, alvo) <= 1 || entrada.split("").sort().join("") === alvo.split("").sort().join("");
  }
  if (entrada.length < 4 || alvo.length < 4) return false;
  if (Math.abs(entrada.length - alvo.length) > 2) return false;

  const distancia = distanciaEdicao(entrada, alvo);
  if (Math.min(entrada.length, alvo.length) <= 4) return distancia <= 1;

  const maior = Math.max(entrada.length, alvo.length);
  const limite = maior >= 7 ? 2 : 1;
  return distancia <= limite;
}

function termoAproximado(tokens: string[], termo: string, permitirNumerico = false) {
  const partes = normalizarBusca(termo).trim().split(/\s+/).filter(Boolean);
  const compacto = partes.join("");
  return partes.some((parte) => parte.length >= 3 && (permitirNumerico || !tokenNumerico(parte)) && tokens.some((token) => tokenParecido(token, parte))) ||
    Boolean(compacto.length >= 4 && tokens.some((token) => tokenParecido(token, compacto)));
}

function contemTermo(textoNormalizado: string, termo: string) {
  const termoNormalizado = normalizarBusca(termo).trim();
  return termoNormalizado.length >= 2 && textoNormalizado.includes(` ${termoNormalizado} `);
}

function aliasesDaCidade(cidade: string) {
  return Array.from(new Set([cidade, ...(aliasesLocalidadePorCidade[cidade] ?? [])]));
}

function partesBusca(termo: string, tamanhoMinimo = 2) {
  return normalizarBusca(termo)
    .trim()
    .split(/\s+/)
    .filter((parte) => parte.length >= tamanhoMinimo);
}

function aliasLocalidadeCombina(textoNormalizado: string, tokens: string[], alias: string) {
  if (contemTermo(textoNormalizado, alias)) return true;

  const partes = partesBusca(alias);
  if (!partes.length || partes.some((parte) => parte.length <= 2)) return false;

  const encontradas = partes.filter((parte) => tokens.some((token) => tokenParecido(token, parte))).length;
  if (partes.length === 1) return encontradas === 1;
  return encontradas >= Math.min(2, partes.length);
}

function tokensLocalidadeConsulta(consulta: string) {
  const texto = normalizarBusca(consulta);
  const tokens = tokensNormalizados(consulta, 2);
  const bloqueados = new Set<string>();
  const aliases = Object.values(aliasesLocalidadePorCidade).flat();

  aliases.forEach((alias) => {
    const partes = partesBusca(alias, 3);
    if (!partes.length) return;

    const temLocalidade =
      contemTermo(texto, alias) ||
      partes.some((parte) => tokens.some((token) => token === parte || tokenParecido(token, parte)));

    if (!temLocalidade) return;

    tokens.forEach((token) => {
      if (partes.some((parte) => token === parte || tokenParecido(token, parte))) {
        bloqueados.add(token);
      }
    });
  });

  return bloqueados;
}

function tokensIntencaoConsulta(consulta: string) {
  const texto = normalizarBusca(consulta);
  const tokens = tokensNormalizados(consulta, 2);
  const bloqueados = new Set<string>();
  const aliases = [
    "7 lugares",
    "automatico",
    "automatica",
    "baixo consumo",
    "baixo custo",
    "barato",
    "cacamba",
    "caminhonete",
    "compacto",
    "conversivel",
    "diesel",
    "economico",
    "eletrico",
    "eletrica",
    "esportivo",
    "esportiva",
    "superesportivo",
    "executivo",
    "familia",
    "flex",
    "gasolina",
    "hatch",
    "hibrido",
    "hibrida",
    "hybrid",
    "luxo",
    "manual",
    "mecanico",
    "mecanica",
    "minivan",
    "performance",
    "picape",
    "pickup",
    "potente",
    "premium",
    "roadster",
    "sedan",
    "sete lugares",
    "suv",
    "trabalho",
    "utilitario esportivo",
  ];

  aliases.forEach((alias) => {
    const partes = partesBusca(alias, 3);
    if (!partes.length || !aliasLocalidadeCombina(texto, tokens, alias)) return;

    tokens.forEach((token) => {
      if (partes.some((parte) => token === parte || tokenParecido(token, parte))) {
        bloqueados.add(token);
      }
    });
  });

  return bloqueados;
}

function tokensMarcaModelo(consulta: string) {
  const bloqueados = new Set([...tokensLocalidadeConsulta(consulta), ...tokensIntencaoConsulta(consulta)]);
  return tokensBusca(consulta, 2).filter((token) => !bloqueados.has(token));
}

function extrairNumeroBR(valor: string) {
  const normalizado = normalizarTexto(valor).replace(/\s+/g, "");
  if (normalizado.endsWith("k") || normalizado.endsWith("mil")) {
    const base = normalizado.replace(/(?:k|mil)$/, "").replace(/\./g, "").replace(",", ".");
    const numero = Number(base);
    return Number.isFinite(numero) ? numero * 1000 : undefined;
  }

  const limpo = valor.replace(/[^\d,.]/g, "");
  if (!limpo) return undefined;
  const comDecimal = limpo.includes(",") ? limpo.replace(/\./g, "").replace(",", ".") : limpo.replace(/\./g, "");
  const numero = Number(comDecimal);
  return Number.isFinite(numero) ? numero : undefined;
}

function extrairIdade(consulta: string) {
  const texto = normalizarTexto(consulta);
  const match = texto.match(/(?:tenho|idade|sou de|com)\s*(\d{2})\s*anos?/);
  return match ? Number(match[1]) : undefined;
}

function extrairRendaMensal(consulta: string) {
  const texto = normalizarTexto(consulta);
  const renda = texto.match(/(?:ganho|renda|salario|recebo|faco)\D{0,18}(?:r\$)?\s*([\d.]+(?:,\d{1,2})?\s*(?:mil|k)?)/);
  if (!renda) return undefined;
  return extrairNumeroBR(renda[1]);
}

function extrairLimiteDiaria(consulta: string) {
  const texto = normalizarTexto(consulta);
  const limiteAntes = texto.match(/(?:ate|menos de|abaixo de|no maximo|maximo|max|limite de|diaria maxima)\D{0,24}(?:r\$)?\s*([\d.]+(?:,\d{1,2})?\s*(?:mil|k)?)\s*(?:reais|real|r\$)?\s*(?:por dia|ao dia|\/dia|diaria|dia)?/);
  if (limiteAntes) return extrairNumeroBR(limiteAntes[1]);
  const valorAntes = texto.match(/(?:r\$)?\s*([\d.]+(?:,\d{1,2})?\s*(?:mil|k)?)\s*(?:reais|real)?\s*(?:por dia|ao dia|\/dia|de diaria|diaria)/);
  if (valorAntes) return extrairNumeroBR(valorAntes[1]);
  const diaria = texto.match(/(?:diaria|por dia|dia)\D{0,16}(?:ate|maximo|max|r\$)?\s*([\d.]+(?:,\d{1,2})?\s*(?:mil|k)?)/);
  if (diaria) return extrairNumeroBR(diaria[1]);
  const faixa = texto.match(/entre\s*(?:r\$)?\s*[\d.]+(?:,\d{1,2})?\s*(?:mil|k)?\s*(?:e|a)\s*(?:r\$)?\s*([\d.]+(?:,\d{1,2})?\s*(?:mil|k)?)\s*(?:reais|real)?\s*(?:por dia|ao dia|\/dia|de diaria|diaria)?/);
  if (faixa) return extrairNumeroBR(faixa[1]);
  const ateValor = texto.match(/ate\s*r?\$?\s*([\d.]+(?:,\d{1,2})?\s*(?:mil|k)?)\s*(?:por dia|ao dia|\/dia)/);
  return ateValor ? extrairNumeroBR(ateValor[1]) : undefined;
}

function extrairLimiteTotal(consulta: string) {
  const texto = normalizarTexto(consulta);
  const totalAntes = texto.match(/(?:orcamento total|valor total|total|periodo todo|periodo inteiro|no total|tudo)\D{0,24}(?:r\$)?\s*([\d.]+(?:,\d{1,2})?\s*(?:mil|k)?)\s*(?:reais|real)?/);
  if (totalAntes) return extrairNumeroBR(totalAntes[1]);
  const valorAntes = texto.match(/(?:r\$)?\s*([\d.]+(?:,\d{1,2})?\s*(?:mil|k)?)\s*(?:reais|real)?\s*(?:no total|total|para tudo|pelo periodo todo|pelo periodo inteiro)/);
  return valorAntes ? extrairNumeroBR(valorAntes[1]) : undefined;
}

function extrairPeriodoDias(consulta: string, fallback: number) {
  const texto = normalizarTexto(consulta);
  const periodo = texto.match(/(?:por|durante|periodo de|locacao de|aluguel de|alugar por|locar por|ficar)\D{0,12}(\d{1,2})\s*(?:dias|diarias)/);
  if (periodo) return Math.max(1, Math.min(30, Number(periodo[1])));
  if (/fim de semana|final de semana/.test(texto)) return 2;
  return fallback;
}

function extrairCidade(consulta: string, veiculos: VeiculoEntrada[]) {
  const texto = normalizarBusca(consulta);
  const tokens = tokensNormalizados(consulta, 2);
  const cidades = Array.from(new Set(veiculos.map((veiculo) => veiculo.cidade)));
  const encontradas = cidades
    .flatMap((cidade) =>
      aliasesDaCidade(cidade)
        .filter((alias) => aliasLocalidadeCombina(texto, tokens, alias))
        .map((alias) => ({
          cidade,
          score: (contemTermo(texto, alias) ? 100 : 60) + normalizarBusca(alias).trim().length,
        })),
    )
    .sort((a, b) => b.score - a.score);

  return encontradas[0]?.cidade;
}

function extrairMarcaModelo(consulta: string, veiculos: VeiculoEntrada[]) {
  const texto = normalizarBusca(consulta);
  const tokens = tokensMarcaModelo(consulta);
  const marcasDaFrota = Array.from(new Set([...marcasConhecidas, ...veiculos.map((veiculo) => veiculo.marca)])).sort((a, b) => b.length - a.length);
  const marca = marcasDaFrota.find((item) => {
    const marcaNormalizada = normalizarBusca(item).trim();
    const partes = marcaNormalizada.split(/\s+/);
    return contemTermo(texto, item) || partes.some((parte) => parte.length >= 3 && texto.includes(` ${parte} `)) || termoAproximado(tokens, item);
  });

  const modelosCandidatos = veiculos
    .filter((veiculo) => !marca || normalizarBusca(veiculo.marca).trim() === normalizarBusca(marca).trim())
    .map((veiculo) => veiculo.modelo)
    .sort((a, b) => b.length - a.length);
  const modelo = modelosCandidatos.find((item) => {
    const modeloNormalizado = normalizarBusca(item).trim();
    const partes = modeloNormalizado.split(/\s+/).filter((parte) => parte.length >= 2);
    const primeiroTermo = partes.find((parte) => parte.length >= 3);
    return (
      contemTermo(texto, item) ||
      Boolean(primeiroTermo && texto.includes(` ${primeiroTermo} `)) ||
      partes.some((parte) => /[a-z]/.test(parte) && /\d/.test(parte) && tokens.includes(parte)) ||
      partes.some((parte) => parte.length >= 4 && !tokenNumerico(parte) && tokens.includes(parte)) ||
      termoAproximado(tokens, item, Boolean(marca))
    );
  });

  return { marca, modelo };
}

function extrairCategoriaPreferida(consulta: string) {
  const texto = normalizarBusca(consulta);
  const categorias = [
    { valor: "sete-lugares", aliases: ["7 lugares", "sete lugares", "sete pessoas", "familia grande"] },
    { valor: "suv", aliases: ["suv", "utilitario esportivo", "crossover", "jeep alto"] },
    { valor: "esportivo", aliases: ["carro esportivo", "esportivo", "esportiva", "superesportivo", "performance", "potente", "conversivel", "roadster"] },
    { valor: "picape", aliases: ["picape", "pickup", "caminhonete", "cacamba", "utilitario de carga"] },
    { valor: "minivan", aliases: ["minivan", "van familiar"] },
    { valor: "premium", aliases: ["premium", "luxo", "executivo", "luxuoso"] },
    { valor: "sedan", aliases: ["sedan", "seda"] },
    { valor: "hatch", aliases: ["hatch", "compacto", "pequeno"] },
  ];

  const categoria = ultimaPreferencia(consulta, categorias);
  if (categoria === "esportivo" && contemTermo(texto, "utilitario esportivo") && !consultaTemAlias(consulta, ["carro esportivo", "performance", "potente", "conversivel", "roadster"])) {
    return "suv";
  }
  return categoria;
}

function posicaoAlias(textoNormalizado: string, aliases: string[]) {
  const posicoes = aliases
    .map((alias) => textoNormalizado.indexOf(normalizarBusca(alias).trim()))
    .filter((posicao) => posicao >= 0);
  return posicoes.length ? Math.min(...posicoes) : -1;
}

function consultaTemAlias(consulta: string, aliases: string[]) {
  const texto = normalizarBusca(consulta);
  const tokens = tokensBusca(consulta);
  return aliases.some((alias) => aliasLocalidadeCombina(texto, tokens, alias));
}

function ultimaPreferencia<T extends string>(consulta: string, opcoes: Array<{ valor: T; aliases: string[] }>) {
  const texto = normalizarBusca(consulta);
  const encontradas = opcoes
    .filter((opcao) => consultaTemAlias(consulta, opcao.aliases))
    .map((opcao) => {
      const posicao = posicaoAlias(texto, opcao.aliases);
      return { valor: opcao.valor, posicao: posicao >= 0 ? posicao : 0 };
    });

  if (!encontradas.length) return undefined;
  const valores = new Set(encontradas.map((opcao) => opcao.valor));
  if (valores.size === 1) return encontradas[0].valor;
  if (/\bou\b/.test(texto)) return undefined;
  return encontradas.sort((a, b) => b.posicao - a.posicao)[0].valor;
}

function extrairObjetivo(consulta: string) {
  const objetivos = [
    { objetivo: "esportivo", aliases: ["esportivo", "esportiva", "superesportivo", "superesportiva", "potente", "performance", "conversivel", "roadster", "divertido de dirigir"] },
    { objetivo: "economia", aliases: ["economico", "barato", "baixo custo", "economia", "gastar pouco", "mais em conta", "menor preco"] },
    { objetivo: "familia", aliases: ["familia", "filho", "crianca", "7 lugares", "sete lugares", "porta malas", "porta-malas", "familia grande"] },
    { objetivo: "trabalho", aliases: ["trabalho", "carga", "obra", "mudanca", "picape", "pickup", "cacamba", "servico"] },
    { objetivo: "executivo", aliases: ["luxo", "premium", "executivo", "conforto", "reuniao", "evento"] },
    { objetivo: "eficiencia", aliases: ["eletrico", "hibrido", "sustentavel", "baixo consumo", "consome pouco"] },
    { objetivo: "viagem", aliases: ["viagem", "estrada", "longa distancia", "rodovia", "turismo"] },
  ];

  return objetivos.find((item) => item.aliases.some((alias) => consultaTemAlias(consulta, [alias])))?.objetivo ?? "uso geral";
}

function extrairCambio(consulta: string): VeiculoEntrada["cambio"] | undefined {
  const texto = normalizarTexto(consulta);
  if (/(nao quero|evitar|evite|sem|dispenso)\D{0,16}automatic/.test(texto)) return "Manual";
  if (/(nao quero|evitar|evite|sem|dispenso)\D{0,16}manual/.test(texto)) return "Automatico";

  return ultimaPreferencia(consulta, [
    { valor: "Automatico", aliases: ["automatico", "automatica", "auto", "automatizado"] },
    { valor: "Manual", aliases: ["manual", "mecanico", "mecanica"] },
  ]);
}

function extrairCombustivel(consulta: string): VeiculoEntrada["combustivel"] | undefined {
  return ultimaPreferencia(consulta, [
    { valor: "Eletrico", aliases: ["eletrico", "eletrica"] },
    { valor: "Hibrido", aliases: ["hibrido", "hibrida", "hybrid"] },
    { valor: "Diesel", aliases: ["diesel"] },
    { valor: "Gasolina", aliases: ["gasolina"] },
    { valor: "Flex", aliases: ["flex", "alcool", "etanol"] },
  ]);
}

function veiculoBateMarcaModelo(veiculo: VeiculoEntrada, marca?: string, modelo?: string) {
  const marcaOk = !marca || normalizarBusca(veiculo.marca).trim() === normalizarBusca(marca).trim();
  const modeloOk = !modelo || normalizarBusca(veiculo.modelo).includes(normalizarBusca(modelo).trim());
  return marcaOk && modeloOk;
}

function veiculoBateCategoria(veiculo: VeiculoEntrada, categoria?: string) {
  if (!categoria) return true;
  const texto = normalizarTexto(`${veiculo.marca} ${veiculo.modelo} ${veiculo.categoria} ${veiculo.recursos.join(" ")}`);
  if (categoria === "premium") return /premium|luxo|executivo|bmw|mercedes|audi|volvo|porsche|lexus|genesis|lamborghini|ferrari|maserati|mclaren|tesla/.test(texto);
  if (categoria === "sete-lugares") return /7 lugares|sete lugares|minivan|familia grande|spin|commander|sorento|trailblazer|grand cherokee|model x|carnival/.test(texto);
  if (categoria === "esportivo") {
    return /esportiv|superesportivo|performance|turbo|roadster|conversivel|bancos esportivos|lancer|civic|wrx|mx 5|mx5|panamera|taycan|macan|giulia|stelvio|a3|golf|mustang|camaro|lamborghini|huracan|ferrari|roma|911|carrera/.test(
      texto,
    );
  }
  if (categoria === "picape") return /picape|pickup|caminhonete|cacamba|utilitario|toro|saveiro|oroch|hilux|frontier|strada|poer|ram|rampage|s10/.test(texto);
  if (categoria === "minivan") return /minivan|van familiar|7 lugares|sete lugares|spin/.test(texto);
  if (categoria === "hatch") return /hatch|compacto|kwid|fit|golf|fiesta|focus|208|c3|sandero|argo|mobi|cooper|yaris/.test(texto);
  if (categoria === "sedan") return /sedan|seda|civic|corolla|virtus|cronos|onix plus|hb20s|lancer|camry|accord|jetta|cruze|versa|sentra|fusion|elantra|cerato|a3|a4|s60|mazda3|giulia|g70/.test(texto);
  if (categoria === "suv") return /suv|crossover|altura elevada|compass|kicks|pulse|haval|tracker|rav4|hr v|cr v|t cross|tiguan|equinox|trailblazer|bronco|creta|tucson|sportage|sorento|x1|x3|gla|glc|q3|q5|xc40|xc60|2008|3008|cactus|aircross|duster|renegade|commander|wrangler|discovery|range rover|defender|velar|macan|cayenne|model y|model x|song plus|yuan plus|tank|outlander|pajero|asx|eclipse cross|forester|outback|cx 30|cx 5|ux|nx|rx|countryman|stelvio|gv70/.test(texto);
  return texto.includes(categoria);
}

function descreverRestricoes(contexto: {
  marca?: string;
  modelo?: string;
  categoria?: string;
  cidade?: string;
  cambio?: VeiculoEntrada["cambio"];
  combustivel?: VeiculoEntrada["combustivel"];
}) {
  return [
    contexto.marca,
    contexto.modelo,
    rotuloCategoria(contexto.categoria),
    contexto.cidade ? `em ${contexto.cidade}` : "",
    contexto.cambio ? `cambio ${contexto.cambio.toLowerCase()}` : "",
    contexto.combustivel ? contexto.combustivel.toLowerCase() : "",
  ]
    .filter(Boolean)
    .join(", ");
}

function rotuloCategoria(categoria?: string) {
  if (!categoria) return "";
  const rotulos: Record<string, string> = {
    hatch: "hatch",
    minivan: "minivan",
    picape: "picape",
    premium: "premium",
    sedan: "sedan",
    suv: "SUV",
    esportivo: "esportivos",
    "sete-lugares": "com 7 lugares",
  };
  return rotulos[categoria] ?? categoria;
}

function falhasRestricoesFortes(
  veiculo: VeiculoEntrada,
  contexto: {
    marca?: string;
    modelo?: string;
    cidade?: string;
    cambio?: VeiculoEntrada["cambio"];
    combustivel?: VeiculoEntrada["combustivel"];
  },
) {
  const falhas: string[] = [];
  if (contexto.marca && normalizarBusca(veiculo.marca).trim() !== normalizarBusca(contexto.marca).trim()) {
    falhas.push(`nao e ${contexto.marca}`);
  }
  if (contexto.modelo && !normalizarBusca(veiculo.modelo).includes(normalizarBusca(contexto.modelo).trim())) {
    falhas.push(`nao e o modelo ${contexto.modelo}`);
  }
  if (contexto.cidade && veiculo.cidade !== contexto.cidade) {
    falhas.push(`esta em ${veiculo.cidade}, nao em ${contexto.cidade}`);
  }
  if (contexto.cambio && veiculo.cambio !== contexto.cambio) {
    falhas.push(`tem cambio ${veiculo.cambio.toLowerCase()}, mas voce pediu ${contexto.cambio.toLowerCase()}`);
  }
  if (contexto.combustivel && veiculo.combustivel !== contexto.combustivel) {
    falhas.push(`usa ${veiculo.combustivel.toLowerCase()}, mas voce pediu ${contexto.combustivel.toLowerCase()}`);
  }
  return falhas;
}

function statusLabelVeiculo(status: StatusVeiculo) {
  return status === "manutencao" ? "em manutencao" : status;
}

function validarElegibilidade(payload: ConsultorPayload, idadeInformada?: number) {
  const idade = idadeInformada ?? idadeEmAnos(payload.usuario.nascimento);
  const cnhAnos = idadeEmAnos(payload.usuario.cnhEmitidaEm);
  const locacaoAtiva = payload.reservas.some(
    (reserva) => reserva.cliente === payload.usuario.nome && ["ativa", "confirmada", "pendente"].includes(reserva.status),
  );

  if (locacaoAtiva || payload.usuario.pendenciaFinanceira) return { elegivel: false, motivo: "Cliente possui locacao ativa ou pendencia financeira." };
  if (idade > 0 && idade < 21) return { elegivel: false, motivo: "Condutor precisa ter pelo menos 21 anos para reservar nesta plataforma." };
  if (cnhAnos > 0 && cnhAnos < 2) return { elegivel: false, motivo: "CNH precisa ter no minimo 2 anos de emissao." };
  if (payload.usuario.comprovante !== "aprovado") return { elegivel: false, motivo: "Comprovante de residencia ainda nao foi aprovado." };
  return { elegivel: true, motivo: "" };
}

function limitePorRenda(rendaMensal: number | undefined, dias: number, limiteDiariaInformado?: number) {
  if (!rendaMensal && limiteDiariaInformado) return limiteDiariaInformado;
  if (!rendaMensal) return limiteDiariaInformado ?? 360;

  const tetoTotal = rendaMensal * 0.18;
  const tetoDiaria = Math.max(90, Math.round(tetoTotal / Math.max(1, dias) / 1.12));
  return limiteDiariaInformado ? Math.min(tetoDiaria, limiteDiariaInformado) : tetoDiaria;
}

function scoreObjetivo(veiculo: VeiculoEntrada, objetivo: string) {
  const texto = normalizarTexto(`${veiculo.marca} ${veiculo.modelo} ${veiculo.categoria} ${veiculo.combustivel} ${veiculo.recursos.join(" ")}`);
  const regras: Record<string, RegExp> = {
    familia: /suv|familia|isofix|7 lugares|porta-malas|porta malas|minivan|spin|commander/,
    viagem: /suv|sedan|porta-malas|conforto|piloto|diesel|hibrido|controle de cruzeiro/,
    trabalho: /picape|utilitario|cacamba|carga|toro|saveiro|oroch|hilux|frontier|strada|ram|rampage|s10/,
    economia: /economico|baixo consumo|bom consumo|baixo custo|compacto|hatch|kwid|onix|208|c3|yaris/,
    executivo: /executivo|premium|luxo|sedan|acabamento|conforto|bmw|audi|mercedes|volvo|corolla|lamborghini|ferrari|porsche|tesla/,
    eficiencia: /baixo consumo|bom consumo|dolphin|haval|byd|prius|hybrid/,
    esportivo: /esportiv|superesportivo|performance|turbo|lancer|a3|civic|golf|wrx|mx 5|mx5|panamera|taycan|macan|giulia|stelvio|mustang|camaro|lamborghini|huracan|ferrari|roma|911|carrera/,
  };

  if (objetivo === "eficiencia" && (veiculo.combustivel === "Eletrico" || veiculo.combustivel === "Hibrido")) return 24;
  return regras[objetivo]?.test(texto) ? 24 : 0;
}

function scorePreferencias(veiculo: VeiculoEntrada, cambio?: VeiculoEntrada["cambio"], combustivel?: VeiculoEntrada["combustivel"]) {
  let score = 0;
  if (cambio && veiculo.cambio === cambio) score += 12;
  if (combustivel && veiculo.combustivel === combustivel) score += 12;
  return score;
}

function beneficiosComerciais(veiculo: VeiculoEntrada, objetivo: string) {
  const texto = normalizarTexto(`${veiculo.categoria} ${veiculo.combustivel} ${veiculo.recursos.join(" ")} ${veiculo.marca} ${veiculo.modelo}`);
  const beneficios: string[] = [];

  if (/esportiv|superesportivo|lancer|civic|a3|wrx|turbo|performance|mx 5|mx5|panamera|taycan|macan|giulia|stelvio|mustang|camaro|lamborghini|huracan|ferrari|roma|911|carrera/.test(texto)) {
    beneficios.push("direcao mais envolvente para quem quer uma locacao com personalidade");
  }
  if (/suv|altura elevada|eclipse cross|asx|compass|pulse|tracker|kicks|renegade|x1|gla|xc40/.test(texto)) {
    beneficios.push("posicao de dirigir mais alta e boa versatilidade para cidade e estrada");
  }
  if (/sedan|porta-malas|porta malas/.test(texto)) {
    beneficios.push("porta-malas pratico para malas, compras e viagens curtas");
  }
  if (/baixo consumo|bom consumo|economico|baixo custo|hibrido|eletrico/.test(texto)) {
    beneficios.push("custo de uso mais controlado durante o periodo do aluguel");
  }
  if (/premium|luxo|executivo|acabamento|conforto|bancos eletricos|conforto acustico|lamborghini|ferrari|porsche|tesla/.test(texto)) {
    beneficios.push("mais conforto e apresentacao para compromissos profissionais ou ocasioes especiais");
  }
  if (/cacamba|picape|utilitario|trabalho urbano|carga|rampage|s10/.test(texto)) {
    beneficios.push("praticidade extra para trabalho, pequenas cargas ou rotina intensa");
  }
  if (/7 lugares|minivan|isofix|familia|crianca/.test(texto)) {
    beneficios.push("mais espaco e conveniencia para viajar com familia");
  }
  if (veiculo.cambio === "Automatico") {
    beneficios.push("cambio automatico para dirigir com mais conforto no transito");
  }
  if (veiculo.cambio === "Manual") {
    beneficios.push("cambio manual para quem prefere controle direto e diaria mais enxuta");
  }
  if (objetivo === "viagem") {
    beneficios.push("bom encaixe para pegar estrada com mais tranquilidade");
  }
  if (objetivo === "economia") {
    beneficios.push("boa opcao para alugar sem estourar o orcamento");
  }

  return Array.from(new Set(beneficios)).slice(0, 3);
}

function gerarMotivoPersonalizado(
  veiculo: VeiculoEntrada,
  contexto: {
    objetivo: string;
    marca?: string;
    modelo?: string;
    categoria?: string;
    cidade?: string;
    cambio?: VeiculoEntrada["cambio"];
    combustivel?: VeiculoEntrada["combustivel"];
    rendaMensal?: number;
    dias: number;
    limiteDiaria: number;
  },
) {
  const beneficios = beneficiosComerciais(veiculo, contexto.objetivo);
  const custoTotal = Math.round(veiculo.diaria * contexto.dias * 1.12);
  const pesoNaRenda = contexto.rendaMensal ? Math.round((custoTotal / contexto.rendaMensal) * 100) : undefined;
  const destaquePedido =
    contexto.marca && normalizarBusca(veiculo.marca).trim() === normalizarBusca(contexto.marca).trim()
      ? `Esta opcao esta dentro da linha ${veiculo.marca} que voce procurou`
      : `Este modelo foi selecionado pela aderencia ao seu pedido`;
  const detalheRenda = pesoNaRenda
    ? `A locacao estimada fica perto de ${pesoNaRenda}% da renda informada`
    : `A estimativa ja considera ${contexto.dias} diaria(s) com protecao basica`;

  return `${destaquePedido}. O ${veiculo.modelo} se destaca por ${beneficios.join(", ")}. ${detalheRenda}, entao vale reservar agora se esse perfil atende sua viagem.`;
}

function gerarAdequacaoFinanceira(
  veiculo: VeiculoEntrada,
  limiteDiaria: number,
  rendaMensal: number | undefined,
  custoEstimado: number,
  dentroDoOrcamento: boolean,
  orcamentoDefinido: boolean,
) {
  if (!orcamentoDefinido) {
    return `Preco estimado do periodo: ${moeda.format(custoEstimado)} com protecao basica. Uma opcao pronta para reservar com custo claro antes da confirmacao.`;
  }

  const diferenca = Math.abs(limiteDiaria - veiculo.diaria);
  if (dentroDoOrcamento) {
    const folga = limiteDiaria - veiculo.diaria;
    return rendaMensal
      ? `Preco estimado do periodo: ${moeda.format(custoEstimado)}. Fica ${moeda.format(folga)} por dia abaixo do teto calculado para sua renda.`
      : `Preco estimado do periodo: ${moeda.format(custoEstimado)}. Fica ${moeda.format(folga)} por dia abaixo do teto informado.`;
  }

  return `Preco estimado do periodo: ${moeda.format(custoEstimado)}. Passa ${moeda.format(diferenca)} por dia do teto sugerido, mas pode valer pelo conforto e perfil do modelo.`;
}

function veiculosUnicos(veiculos: VeiculoEntrada[]) {
  const vistos = new Set<string>();
  return veiculos.filter((veiculo) => {
    if (vistos.has(veiculo.id)) return false;
    vistos.add(veiculo.id);
    return true;
  });
}

function candidatosAlternativos(
  disponiveis: VeiculoEntrada[],
  contexto: {
    marca?: string;
    modelo?: string;
    categoria?: string;
    cidade?: string;
    cambio?: VeiculoEntrada["cambio"];
    combustivel?: VeiculoEntrada["combustivel"];
  },
) {
  const porCidade = contexto.cidade ? disponiveis.filter((veiculo) => veiculo.cidade === contexto.cidade) : [];
  const porMarca = contexto.marca || contexto.modelo ? disponiveis.filter((veiculo) => veiculoBateMarcaModelo(veiculo, contexto.marca, contexto.modelo)) : [];
  const porCategoria = contexto.categoria ? disponiveis.filter((veiculo) => veiculoBateCategoria(veiculo, contexto.categoria)) : [];
  const porCambio = contexto.cambio ? disponiveis.filter((veiculo) => veiculo.cambio === contexto.cambio) : [];
  const porCombustivel = contexto.combustivel ? disponiveis.filter((veiculo) => veiculo.combustivel === contexto.combustivel) : [];

  return veiculosUnicos([
    ...porCidade.filter((veiculo) => veiculoBateCategoria(veiculo, contexto.categoria) && (!contexto.cambio || veiculo.cambio === contexto.cambio) && (!contexto.combustivel || veiculo.combustivel === contexto.combustivel)),
    ...porCidade.filter((veiculo) => veiculoBateCategoria(veiculo, contexto.categoria)),
    ...porMarca.filter((veiculo) => !contexto.cidade || veiculo.cidade === contexto.cidade),
    ...porMarca,
    ...porCategoria.filter((veiculo) => !contexto.cidade || veiculo.cidade === contexto.cidade),
    ...porCombustivel.filter((veiculo) => !contexto.cidade || veiculo.cidade === contexto.cidade),
    ...porCambio.filter((veiculo) => !contexto.cidade || veiculo.cidade === contexto.cidade),
    ...porCidade,
    ...porCategoria,
    ...porCombustivel,
    ...porCambio,
    ...disponiveis,
  ]);
}

function limitarAlternativasPreferidas(
  alternativas: VeiculoEntrada[],
  contexto: {
    cidade?: string;
    limiteDiaria: number;
    limiteDiariaInformado?: number;
  },
) {
  const dentroDoTeto = contexto.limiteDiariaInformado ? alternativas.filter((veiculo) => veiculo.diaria <= contexto.limiteDiaria) : alternativas;
  const base = dentroDoTeto.length ? dentroDoTeto : alternativas;
  if (!contexto.cidade) return base;

  const naCidade = base.filter((veiculo) => veiculo.cidade === contexto.cidade);
  return naCidade.length ? naCidade : base;
}

function falhasAlternativa(
  veiculo: VeiculoEntrada,
  contexto: {
    marca?: string;
    modelo?: string;
    categoria?: string;
    cidade?: string;
    cambio?: VeiculoEntrada["cambio"];
    combustivel?: VeiculoEntrada["combustivel"];
  },
) {
  const falhas = falhasRestricoesFortes(veiculo, contexto);
  if (contexto.categoria && !veiculoBateCategoria(veiculo, contexto.categoria)) {
    falhas.push(`nao e ${rotuloCategoria(contexto.categoria)}`);
  }
  return falhas;
}

function resumoPedido(
  contexto: {
    marca?: string;
    modelo?: string;
    categoria?: string;
    cidade?: string;
    cambio?: VeiculoEntrada["cambio"];
    combustivel?: VeiculoEntrada["combustivel"];
    objetivo: string;
    limiteDiaria: number;
    dias: number;
    orcamentoDefinido: boolean;
  },
  totalEncontrado: number,
  elegivel: boolean,
  alternativo = false,
) {
  const alvo = contexto.modelo ? `${contexto.marca ?? ""} ${contexto.modelo}`.trim() : contexto.marca ?? contexto.categoria ?? contexto.objetivo;
  if (totalEncontrado === 0) {
    const restricoes = descreverRestricoes(contexto);
    return `No momento nao temos um modelo disponivel que combine exatamente com ${restricoes || alvo}. Remova uma restricao ou tente outro modelo para encontrar uma opcao pronta para aluguel.`;
  }
  const modelos = totalEncontrado === 1 ? "modelo disponivel" : "modelos disponiveis";
  if (alternativo) {
    const restricoes = descreverRestricoes(contexto);
    const base = `Nao encontrei uma opcao exatamente com ${restricoes || alvo}, mas separei ${totalEncontrado} ${modelos} prontos para aluguel como alternativa.`;
    const orcamento = contexto.orcamentoDefinido ? ` Priorizei alternativas proximas de ${moeda.format(contexto.limiteDiaria)} por dia.` : " Priorizei disponibilidade real para voce seguir com a reserva.";
    return elegivel ? `${base}${orcamento}` : `${base} Antes de concluir a reserva, regularize os requisitos da conta.`;
  }

  const descricaoPedido = [
    !contexto.marca && !contexto.modelo ? rotuloCategoria(contexto.categoria) : "",
    contexto.cidade ? `em ${contexto.cidade}` : "",
    contexto.cambio ? `com cambio ${contexto.cambio.toLowerCase()}` : "",
    contexto.combustivel ? contexto.combustivel.toLowerCase() : "",
  ]
    .filter(Boolean)
    .join(" ");
  const base =
    contexto.marca || contexto.modelo
      ? `Aqui ${totalEncontrado === 1 ? "esta" : "estao"} ${totalEncontrado} ${modelos} de ${alvo} para alugar.`
      : descricaoPedido
        ? `Aqui ${totalEncontrado === 1 ? "esta" : "estao"} ${totalEncontrado} ${modelos} ${descricaoPedido} para alugar.`
        : `Aqui ${totalEncontrado === 1 ? "esta" : "estao"} ${totalEncontrado} ${modelos} para alugar conforme seus requisitos.`;
  const orcamento = contexto.orcamentoDefinido
    ? ` Priorizei opcoes proximas de ${moeda.format(contexto.limiteDiaria)} por dia para facilitar sua decisao.`
    : " Escolhi opcoes disponiveis com boa proposta de aluguel e preco estimado visivel antes da reserva.";
  return elegivel ? `${base}${orcamento}` : `${base} Antes de concluir a reserva, regularize os requisitos da conta.`;
}

function criarConsultoriaIntegrada(payload: ConsultorPayload): ConsultoriaResposta {
  const dias = extrairPeriodoDias(payload.consulta, diferencaDias(payload.retirada, payload.devolucao));
  const idadeInformada = extrairIdade(payload.consulta);
  const rendaMensal = extrairRendaMensal(payload.consulta);
  const cidade = extrairCidade(payload.consulta, payload.veiculos);
  const { marca, modelo } = extrairMarcaModelo(payload.consulta, payload.veiculos);
  const categoria = extrairCategoriaPreferida(payload.consulta);
  const objetivo = extrairObjetivo(payload.consulta);
  const cambio = extrairCambio(payload.consulta);
  const combustivel = extrairCombustivel(payload.consulta);
  const limiteTotalInformado = extrairLimiteTotal(payload.consulta);
  const limiteDiariaInformado = limiteTotalInformado ? Math.floor(limiteTotalInformado / Math.max(1, dias) / 1.12) : extrairLimiteDiaria(payload.consulta);
  const disponiveis = payload.veiculos.filter((veiculo) => veiculo.status === "disponivel");
  const orcamentoDefinido = Boolean(rendaMensal || limiteDiariaInformado);
  const maiorDiariaDisponivel = Math.max(...disponiveis.map((veiculo) => veiculo.diaria), 360);
  const limiteDiaria = orcamentoDefinido ? limitePorRenda(rendaMensal, dias, limiteDiariaInformado) : maiorDiariaDisponivel;
  const elegibilidade = validarElegibilidade(payload, idadeInformada);
  const avisos = elegibilidade.motivo ? [elegibilidade.motivo] : [];
  const pedidoMarcaModelo = Boolean(marca || modelo);
  const restricoesFortes = { marca, modelo, cidade, cambio, combustivel };
  let candidatos = disponiveis.filter((veiculo) => falhasRestricoesFortes(veiculo, restricoesFortes).length === 0).filter((veiculo) => veiculoBateCategoria(veiculo, categoria));
  let usouAlternativas = false;

  if (limiteDiariaInformado) {
    const dentroDoTetoInformado = candidatos.filter((veiculo) => veiculo.diaria <= limiteDiaria);
    if (dentroDoTetoInformado.length) {
      candidatos = dentroDoTetoInformado;
    } else {
      usouAlternativas = true;
      avisos.push(`Nenhum modelo disponivel atende o teto de ${moeda.format(limiteDiaria)} por dia com os requisitos informados.`);
      const alternativas = candidatosAlternativos(disponiveis, { marca, modelo, categoria, cidade, cambio, combustivel });
      candidatos = limitarAlternativasPreferidas(alternativas, { cidade, limiteDiaria, limiteDiariaInformado });
    }
  }

  if (!candidatos.length) {
    usouAlternativas = true;
    const restricoes = descreverRestricoes({ marca, modelo, categoria, cidade, cambio, combustivel });
    const existentesNaFrota = payload.veiculos.filter((veiculo) => {
      const marcaModeloOk = veiculoBateMarcaModelo(veiculo, marca, modelo);
      const categoriaOk = veiculoBateCategoria(veiculo, categoria);
      return marcaModeloOk && categoriaOk;
    });
    const statusEncontrados = existentesNaFrota.slice(0, 5).map((veiculo) => `${veiculo.marca} ${veiculo.modelo}: ${statusLabelVeiculo(veiculo.status)}, ${veiculo.cambio}`);
    avisos.push(
      statusEncontrados.length
        ? `Existe carro parecido na frota, mas nenhum disponivel atende exatamente ${restricoes}. Encontrados: ${statusEncontrados.join("; ")}.`
        : `Nao ha carro cadastrado que atenda exatamente ${restricoes}.`,
    );
    candidatos = candidatosAlternativos(disponiveis, { marca, modelo, categoria, cidade, cambio, combustivel });
    candidatos = limitarAlternativasPreferidas(candidatos, { cidade, limiteDiaria, limiteDiariaInformado });
  }

  const ranqueados = candidatos
    .map((veiculo) => {
      const custoEstimado = Math.round(veiculo.diaria * dias * 1.12);
      const dentroDoOrcamento = veiculo.diaria <= limiteDiaria;
      const folga = limiteDiaria - veiculo.diaria;
      const scoreFinanceiro = orcamentoDefinido ? (dentroDoOrcamento ? 26 : Math.max(0, 26 - Math.ceil(Math.abs(folga) / 14))) : Math.max(0, 14 - Math.floor(veiculo.diaria / 120));
      const scoreMarca = pedidoMarcaModelo && veiculoBateMarcaModelo(veiculo, marca, modelo) ? 42 : 0;
      const scoreModelo = modelo && normalizarBusca(veiculo.modelo).includes(normalizarBusca(modelo).trim()) ? 24 : 0;
      const scoreCidade = cidade && veiculo.cidade === cidade ? 28 : 0;
      const scoreCategoria = categoria && veiculoBateCategoria(veiculo, categoria) ? 12 : 0;
      const score = Math.max(
        1,
        Math.min(
          100,
          Math.round(
            scoreMarca +
              scoreModelo +
              scoreCidade +
              scoreCategoria +
              scoreObjetivo(veiculo, objetivo) +
              scorePreferencias(veiculo, cambio, combustivel) +
              scoreFinanceiro +
              veiculo.avaliacao * 5 +
              Math.min(veiculo.disponibilidade * 3, 18),
          ),
        ),
      );

      return {
        veiculo,
        score,
        custoEstimado,
        dentroDoOrcamento,
      };
    })
    .sort((a, b) => b.score - a.score || (orcamentoDefinido ? a.veiculo.diaria - b.veiculo.diaria : b.veiculo.avaliacao - a.veiculo.avaliacao))
    .slice(0, 4);

  const sugestoes = ranqueados.map(({ veiculo, score, custoEstimado, dentroDoOrcamento }) => {
    const falhas = usouAlternativas ? falhasAlternativa(veiculo, { marca, modelo, categoria, cidade, cambio, combustivel }) : [];
    const alertaAlternativa = falhas.length ? `Alternativa: ${falhas.slice(0, 2).join("; ")}.` : undefined;

    return {
      veiculoId: veiculo.id,
      score,
      motivo: gerarMotivoPersonalizado(veiculo, { objetivo, marca, modelo, categoria, cidade, cambio, combustivel, rendaMensal, dias, limiteDiaria }),
      custoEstimado,
      adequacaoFinanceira: gerarAdequacaoFinanceira(veiculo, limiteDiaria, rendaMensal, custoEstimado, dentroDoOrcamento, orcamentoDefinido),
      alerta:
        elegibilidade.motivo ||
        alertaAlternativa ||
        (orcamentoDefinido && !dentroDoOrcamento ? `${veiculo.marca} ${veiculo.modelo} so vale se voce aceitar sair da faixa financeira recomendada.` : undefined),
      reservavel: elegibilidade.elegivel && veiculo.status === "disponivel" && (dentroDoOrcamento || !orcamentoDefinido),
    };
  });

  return {
    fonte: "integrada",
    resumo: resumoPedido({ marca, modelo, categoria, cidade, cambio, combustivel, objetivo, limiteDiaria, dias, orcamentoDefinido }, ranqueados.length, elegibilidade.elegivel, usouAlternativas),
    criterios: [
      marca ? `Marca solicitada: ${marca}.` : "",
      modelo ? `Modelo solicitado: ${modelo}.` : "",
      categoria ? `Categoria preferida: ${categoria}.` : "",
      `Objetivo identificado: ${objetivo}.`,
      rendaMensal ? `Renda informada: ${moeda.format(rendaMensal)} por mes.` : "Sem renda mensal explicita.",
      cidade ? `Cidade priorizada: ${cidade}.` : "Sem cidade explicita; considerei todas as cidades.",
      `Periodo: ${dias} diaria(s).`,
    ].filter(Boolean),
    avisos,
    perfilExtraido: {
      idade: (idadeInformada ?? idadeEmAnos(payload.usuario.nascimento)) || undefined,
      rendaMensal,
      cidade,
      objetivo,
      periodoDias: dias,
      limiteDiaria,
      elegivel: elegibilidade.elegivel,
      motivoElegibilidade: elegibilidade.motivo || undefined,
    },
    sugestoes,
  };
}

function payloadValido(payload: Partial<ConsultorPayload>): payload is ConsultorPayload {
  return (
    typeof payload.consulta === "string" &&
    typeof payload.retirada === "string" &&
    typeof payload.devolucao === "string" &&
    Boolean(payload.usuario) &&
    Array.isArray(payload.reservas) &&
    Array.isArray(payload.veiculos)
  );
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as Partial<ConsultorPayload>;
    if (!payloadValido(payload)) {
      return NextResponse.json({ erro: "Payload invalido para consultoria." }, { status: 400 });
    }

    return NextResponse.json(criarConsultoriaIntegrada(payload));
  } catch {
    return NextResponse.json({ erro: "Nao foi possivel processar a consultoria." }, { status: 500 });
  }
}

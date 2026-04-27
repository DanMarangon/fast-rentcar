/* eslint-disable @next/next/no-img-element */
"use client";

import { ChangeEvent, useEffect, useMemo, useState } from "react";
import styles from "@/app/page.module.css";

type Perfil = "cliente" | "locadora" | "administrador";
type StatusReserva = "pendente" | "confirmada" | "ativa" | "concluida" | "cancelada";
type StatusVeiculo = "disponivel" | "alugado" | "reservado" | "manutencao";
type StatusDocumento = "pendente" | "aprovado" | "reprovado";

type Veiculo = {
  id: string;
  locadora: string;
  marca: string;
  modelo: string;
  categoria: string;
  cidade: string;
  cambio: "Manual" | "Automatico";
  combustivel: "Flex" | "Gasolina" | "Diesel" | "Eletrico" | "Hibrido";
  diaria: number;
  precoMercado: number;
  disponibilidade: number;
  avaliacao: number;
  status: StatusVeiculo;
  placa: string;
  quilometragem: number;
  recursos: string[];
  imagem: string;
};

type Reserva = {
  id: string;
  cliente: string;
  veiculoId: string;
  retirada: string;
  devolucao: string;
  status: StatusReserva;
  total: number;
  multa: number;
  pagamento: "aguardando" | "aprovado" | "estornado";
  documentos: StatusDocumento;
  combustivelRetirada: number;
  combustivelDevolucao?: number;
  observacao: string;
};

type Usuario = {
  id: string;
  nome: string;
  email: string;
  senha?: string;
  perfil: Perfil;
  bloqueado: boolean;
  cnhEmitidaEm?: string;
  nascimento?: string;
  comprovante: StatusDocumento;
  pendenciaFinanceira: boolean;
};

type Mensagem = {
  id: string;
  publico: Perfil | "todos";
  texto: string;
  data: string;
};

type AppState = {
  veiculos: Veiculo[];
  reservas: Reserva[];
  usuarios: Usuario[];
  mensagens: Mensagem[];
};

type NovoVeiculo = {
  marca: string;
  modelo: string;
  categoria: string;
  cidade: string;
  diaria: number;
  precoMercado: number;
  status: StatusVeiculo;
  cambio: Veiculo["cambio"];
  combustivel: Veiculo["combustivel"];
  imagem: string;
};

type EtapaReserva = "detalhes" | "pagamento" | "confirmacao";

const hoje = new Date();
const amanha = new Date(hoje.getTime() + 24 * 60 * 60 * 1000);
const daquiQuatroDias = new Date(hoje.getTime() + 4 * 24 * 60 * 60 * 1000);
const ontem = new Date(hoje.getTime() - 24 * 60 * 60 * 1000);
const storageKey = "fast-rentcar:mvp:v5";
const moeda = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const numero = new Intl.NumberFormat("pt-BR");

const acessos = {
  locadora: { email: "locadora@fastrentcar.com", senha: "frota123" },
  administrador: { email: "admin@fastrentcar.com", senha: "admin123" },
};

const dateInput = (date: Date) => date.toISOString().slice(0, 10);

function imagemVeiculo(modelo: string, cor: string, tipo = "sedan") {
  const porta = tipo === "suv" ? "M 170 190 L 230 145 H 430 L 500 190" : "M 175 190 L 255 150 H 425 L 505 190";
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="960" height="540" viewBox="0 0 960 540">
      <defs>
        <linearGradient id="g" x1="0" x2="1" y1="0" y2="1">
          <stop stop-color="#f8fafc"/>
          <stop offset="1" stop-color="#d9e4ea"/>
        </linearGradient>
      </defs>
      <rect width="960" height="540" fill="url(#g)"/>
      <rect x="96" y="70" width="768" height="330" rx="18" fill="#ffffff" opacity=".86"/>
      <path d="${porta} H 685 Q 735 190 748 238 L 792 250 Q 820 258 828 286 L 840 330 H 135 L 150 250 Q 156 213 175 190 Z" fill="${cor}"/>
      <path d="M 255 162 H 420 L 468 192 H 215 Z" fill="#dbeafe" opacity=".95"/>
      <path d="M 476 192 L 430 162 H 536 Q 589 164 628 192 Z" fill="#dbeafe" opacity=".95"/>
      <rect x="198" y="252" width="515" height="42" rx="14" fill="#ffffff" opacity=".24"/>
      <circle cx="254" cy="333" r="52" fill="#172033"/>
      <circle cx="254" cy="333" r="24" fill="#d8dde6"/>
      <circle cx="684" cy="333" r="52" fill="#172033"/>
      <circle cx="684" cy="333" r="24" fill="#d8dde6"/>
      <text x="96" y="455" fill="#172033" font-family="Arial, sans-serif" font-size="42" font-weight="700">${modelo}</text>
      <text x="98" y="492" fill="#64748b" font-family="Arial, sans-serif" font-size="22">Imagem cadastrada do modelo na frota</text>
    </svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

const frotaBase: Veiculo[] = [
  ["v1", "Prime Drive Centro", "Honda", "Civic G10", "Sedan esportivo", "Sao Paulo", "Automatico", "Flex", 239, 98000, 7, 4.8, "disponivel", "CIV-0G10", 42100, ["ar condicionado", "piloto automatico", "porta-malas amplo"], "#1f6feb", "sedan"],
  ["v2", "Sul Motors", "Mitsubishi", "Lancer", "Esportivo", "Curitiba", "Automatico", "Gasolina", 269, 92000, 4, 4.7, "disponivel", "LAN-2018", 58700, ["bancos esportivos", "controle de estabilidade", "multimidia"], "#b42318", "sedan"],
  ["v3", "Moveloc Campinas", "Hyundai", "HB20S", "Sedan economico", "Campinas", "Automatico", "Flex", 159, 76000, 12, 4.6, "disponivel", "HB2-0S21", 33100, ["baixo consumo", "camera de re", "ar condicionado"], "#475569", "sedan"],
  ["v4", "Familia Rent", "Jeep", "Compass", "SUV familia", "Sao Paulo", "Automatico", "Flex", 319, 148000, 5, 4.9, "reservado", "CMP-2023", 26400, ["espaco interno", "isofix", "porta-malas grande"], "#0f766e", "suv"],
  ["v5", "EcoWay", "Toyota", "Corolla Hybrid", "Executivo economico", "Rio de Janeiro", "Automatico", "Hibrido", 289, 158000, 3, 4.9, "disponivel", "HYB-2024", 18100, ["hibrido", "baixo consumo", "assistente de faixa"], "#334155", "sedan"],
  ["v6", "Carga Facil", "Fiat", "Toro", "Picape", "Belo Horizonte", "Automatico", "Diesel", 299, 135000, 6, 4.5, "manutencao", "TOR-4X4", 61500, ["cacamba", "tracao", "sensor de estacionamento"], "#a16207", "suv"],
  ["v7", "Prime Drive Centro", "Volkswagen", "Virtus", "Sedan executivo", "Sao Paulo", "Automatico", "Flex", 189, 96000, 8, 4.7, "disponivel", "VRT-2024", 17200, ["porta-malas grande", "conectividade", "controle de cruzeiro"], "#2563eb", "sedan"],
  ["v8", "Fast Rent", "Chevrolet", "Onix Plus", "Sedan economico", "Sao Paulo", "Automatico", "Flex", 149, 82000, 11, 4.5, "disponivel", "ONX-2023", 38900, ["baixo consumo", "wifi", "camera de re"], "#dc2626", "sedan"],
  ["v9", "Familia Rent", "Nissan", "Kicks", "SUV compacto", "Campinas", "Automatico", "Flex", 229, 118000, 2, 4.6, "alugado", "KCK-2022", 45200, ["isofix", "visao 360", "bom porta-malas"], "#f97316", "suv"],
  ["v10", "EcoWay", "BYD", "Dolphin", "Eletrico urbano", "Rio de Janeiro", "Automatico", "Eletrico", 279, 149000, 4, 4.8, "disponivel", "ELT-2024", 9200, ["eletrico", "silencioso", "recarga rapida"], "#0891b2", "sedan"],
  ["v11", "Prime Drive Centro", "Renault", "Kwid", "Compacto economico", "Belo Horizonte", "Manual", "Flex", 99, 56000, 14, 4.2, "disponivel", "KWD-2022", 52100, ["baixo custo", "facil de estacionar", "ar condicionado"], "#16a34a", "sedan"],
  ["v12", "Sul Motors", "BMW", "320i", "Executivo premium", "Curitiba", "Automatico", "Gasolina", 499, 286000, 1, 4.9, "alugado", "BMW-320", 24000, ["premium", "teto solar", "assistente de faixa"], "#111827", "sedan"],
  ["v13", "Carga Facil", "Volkswagen", "Saveiro", "Utilitario leve", "Sao Paulo", "Manual", "Flex", 169, 89000, 5, 4.4, "manutencao", "SAV-2021", 76000, ["cacamba", "baixo consumo", "trabalho urbano"], "#64748b", "suv"],
  ["v14", "Fast Rent", "Toyota", "Hilux", "Picape premium", "Campinas", "Automatico", "Diesel", 459, 302000, 2, 4.8, "reservado", "HLX-2024", 19600, ["diesel", "tracao", "viagem longa"], "#78350f", "suv"],
  ["v15", "Prime Drive Centro", "Fiat", "Pulse", "SUV compacto", "Sao Paulo", "Automatico", "Flex", 209, 106000, 7, 4.5, "disponivel", "PLS-2024", 14600, ["altura elevada", "central multimidia", "bom consumo"], "#d97706", "suv"],
  ["v16", "EcoWay", "GWM", "Haval H6", "SUV hibrido", "Rio de Janeiro", "Automatico", "Hibrido", 389, 214000, 3, 4.8, "disponivel", "H6H-2024", 11200, ["hibrido", "assistentes avancados", "interior premium"], "#0f766e", "suv"],
  ["v17", "Fast Rent", "Peugeot", "208", "Hatch compacto", "Curitiba", "Automatico", "Flex", 139, 78000, 9, 4.4, "disponivel", "P208-23", 28700, ["compacto", "economico", "painel digital"], "#1d4ed8", "sedan"],
  ["v18", "Familia Rent", "Chevrolet", "Spin", "Minivan familia", "Belo Horizonte", "Automatico", "Flex", 249, 119000, 4, 4.6, "disponivel", "SPN-7L", 36100, ["7 lugares", "porta-malas amplo", "isofix"], "#475569", "suv"],
  ["v19", "Sul Motors", "Audi", "A3 Sedan", "Premium compacto", "Sao Paulo", "Automatico", "Gasolina", 429, 238000, 2, 4.9, "reservado", "AUD-A3", 19800, ["premium", "acabamento refinado", "motor turbo"], "#020617", "sedan"],
  ["v20", "Moveloc Campinas", "Citroen", "C3", "Hatch economico", "Campinas", "Manual", "Flex", 119, 69000, 10, 4.3, "disponivel", "CT3-2023", 31400, ["baixo custo", "ar condicionado", "uso urbano"], "#0ea5e9", "sedan"],
  ["v21", "Carga Facil", "Renault", "Oroch", "Picape intermediaria", "Curitiba", "Automatico", "Flex", 249, 124000, 3, 4.4, "manutencao", "ORC-2022", 68200, ["cacamba", "cabine dupla", "trabalho e lazer"], "#92400e", "suv"],
  ["v22", "Prime Drive Centro", "Mercedes-Benz", "C180", "Executivo luxo", "Sao Paulo", "Automatico", "Gasolina", 589, 318000, 1, 4.9, "disponivel", "MBC-180", 17200, ["luxo", "conforto acustico", "bancos eletricos"], "#374151", "sedan"],
].map(([id, locadora, marca, modelo, categoria, cidade, cambio, combustivel, diaria, precoMercado, disponibilidade, avaliacao, status, placa, quilometragem, recursos, cor, tipo]) => ({
  id: String(id),
  locadora: String(locadora),
  marca: String(marca),
  modelo: String(modelo),
  categoria: String(categoria),
  cidade: String(cidade),
  cambio: cambio as Veiculo["cambio"],
  combustivel: combustivel as Veiculo["combustivel"],
  diaria: Number(diaria),
  precoMercado: Number(precoMercado),
  disponibilidade: Number(disponibilidade),
  avaliacao: Number(avaliacao),
  status: status as StatusVeiculo,
  placa: String(placa),
  quilometragem: Number(quilometragem),
  recursos: recursos as string[],
  imagem: imagemVeiculo(`${marca} ${modelo}`, String(cor), String(tipo)),
}));

const modelosMundiais = [
  ["Toyota", "Yaris", "Hatch economico", "sedan"], ["Toyota", "Camry", "Sedan executivo", "sedan"], ["Toyota", "RAV4", "SUV familia", "suv"], ["Toyota", "Prius", "Hibrido urbano", "sedan"],
  ["Honda", "Fit", "Compacto versatil", "sedan"], ["Honda", "Accord", "Sedan premium", "sedan"], ["Honda", "HR-V", "SUV compacto", "suv"], ["Honda", "CR-V", "SUV familia", "suv"],
  ["Volkswagen", "Golf", "Hatch premium", "sedan"], ["Volkswagen", "Jetta", "Sedan executivo", "sedan"], ["Volkswagen", "T-Cross", "SUV compacto", "suv"], ["Volkswagen", "Tiguan", "SUV premium", "suv"],
  ["Chevrolet", "Tracker", "SUV compacto", "suv"], ["Chevrolet", "Cruze", "Sedan medio", "sedan"], ["Chevrolet", "Equinox", "SUV executivo", "suv"], ["Chevrolet", "Trailblazer", "SUV grande", "suv"],
  ["Ford", "Fiesta", "Hatch economico", "sedan"], ["Ford", "Focus", "Hatch medio", "sedan"], ["Ford", "Fusion", "Sedan executivo", "sedan"], ["Ford", "Bronco Sport", "SUV aventura", "suv"],
  ["Nissan", "Versa", "Sedan economico", "sedan"], ["Nissan", "Sentra", "Sedan medio", "sedan"], ["Nissan", "Frontier", "Picape", "suv"], ["Nissan", "Leaf", "Eletrico urbano", "sedan"],
  ["Hyundai", "Creta", "SUV compacto", "suv"], ["Hyundai", "Tucson", "SUV medio", "suv"], ["Hyundai", "Elantra", "Sedan medio", "sedan"], ["Hyundai", "Ioniq 5", "Eletrico premium", "suv"],
  ["Kia", "Cerato", "Sedan medio", "sedan"], ["Kia", "Sportage", "SUV medio", "suv"], ["Kia", "Sorento", "SUV grande", "suv"], ["Kia", "Niro", "Hibrido urbano", "suv"],
  ["BMW", "118i", "Hatch premium", "sedan"], ["BMW", "X1", "SUV premium", "suv"], ["BMW", "X3", "SUV executivo", "suv"], ["BMW", "530e", "Executivo hibrido", "sedan"],
  ["Mercedes-Benz", "A200", "Hatch luxo", "sedan"], ["Mercedes-Benz", "GLA 200", "SUV luxo", "suv"], ["Mercedes-Benz", "GLC 300", "SUV executivo", "suv"], ["Mercedes-Benz", "E300", "Sedan luxo", "sedan"],
  ["Audi", "A4", "Sedan premium", "sedan"], ["Audi", "Q3", "SUV premium", "suv"], ["Audi", "Q5", "SUV executivo", "suv"], ["Audi", "e-tron", "Eletrico luxo", "suv"],
  ["Volvo", "XC40", "SUV premium", "suv"], ["Volvo", "XC60", "SUV executivo", "suv"], ["Volvo", "S60", "Sedan premium", "sedan"], ["Volvo", "EX30", "Eletrico compacto", "suv"],
  ["Peugeot", "2008", "SUV compacto", "suv"], ["Peugeot", "3008", "SUV medio", "suv"], ["Peugeot", "408", "Fastback", "sedan"], ["Peugeot", "Partner", "Utilitario", "suv"],
  ["Citroen", "C4 Cactus", "SUV compacto", "suv"], ["Citroen", "C4 Lounge", "Sedan medio", "sedan"], ["Citroen", "Berlingo", "Utilitario", "suv"], ["Citroen", "Aircross", "SUV urbano", "suv"],
  ["Renault", "Sandero", "Hatch economico", "sedan"], ["Renault", "Logan", "Sedan economico", "sedan"], ["Renault", "Duster", "SUV compacto", "suv"], ["Renault", "Megane E-Tech", "Eletrico", "sedan"],
  ["Fiat", "Argo", "Hatch economico", "sedan"], ["Fiat", "Cronos", "Sedan economico", "sedan"], ["Fiat", "Fastback", "SUV coupe", "suv"], ["Fiat", "Strada", "Picape compacta", "suv"],
  ["Jeep", "Renegade", "SUV compacto", "suv"], ["Jeep", "Commander", "SUV 7 lugares", "suv"], ["Jeep", "Wrangler", "Off-road", "suv"], ["Jeep", "Grand Cherokee", "SUV luxo", "suv"],
  ["Land Rover", "Discovery Sport", "SUV luxo", "suv"], ["Land Rover", "Range Rover Evoque", "SUV premium", "suv"], ["Land Rover", "Defender", "Off-road premium", "suv"], ["Land Rover", "Velar", "SUV luxo", "suv"],
  ["Porsche", "Macan", "SUV esportivo", "suv"], ["Porsche", "Cayenne", "SUV luxo", "suv"], ["Porsche", "Panamera", "Sedan esportivo", "sedan"], ["Porsche", "Taycan", "Eletrico esportivo", "sedan"],
  ["Tesla", "Model 3", "Eletrico premium", "sedan"], ["Tesla", "Model Y", "SUV eletrico", "suv"], ["Tesla", "Model S", "Eletrico luxo", "sedan"], ["Tesla", "Model X", "SUV eletrico luxo", "suv"],
  ["BYD", "Seal", "Eletrico premium", "sedan"], ["BYD", "Song Plus", "SUV hibrido", "suv"], ["BYD", "Yuan Plus", "SUV eletrico", "suv"], ["BYD", "Han", "Sedan eletrico", "sedan"],
  ["GWM", "Ora 03", "Eletrico urbano", "sedan"], ["GWM", "Tank 300", "SUV off-road", "suv"], ["GWM", "Poer", "Picape", "suv"], ["GWM", "Haval Jolion", "SUV hibrido", "suv"],
  ["Mitsubishi", "Outlander", "SUV familia", "suv"], ["Mitsubishi", "Pajero Sport", "SUV off-road", "suv"], ["Mitsubishi", "ASX", "SUV compacto", "suv"], ["Mitsubishi", "Eclipse Cross", "SUV coupe", "suv"],
  ["Subaru", "Forester", "SUV aventura", "suv"], ["Subaru", "Outback", "Perua aventureira", "suv"], ["Subaru", "Impreza", "Hatch medio", "sedan"], ["Subaru", "WRX", "Esportivo", "sedan"],
  ["Mazda", "CX-30", "SUV compacto", "suv"], ["Mazda", "CX-5", "SUV medio", "suv"], ["Mazda", "Mazda3", "Hatch premium", "sedan"], ["Mazda", "MX-5", "Conversivel", "sedan"],
  ["Lexus", "UX 250h", "SUV hibrido luxo", "suv"], ["Lexus", "NX 350h", "SUV luxo", "suv"], ["Lexus", "ES 300h", "Sedan luxo", "sedan"], ["Lexus", "RX 500h", "SUV luxo grande", "suv"],
  ["Mini", "Cooper", "Compacto premium", "sedan"], ["Mini", "Countryman", "SUV compacto", "suv"], ["Mini", "Clubman", "Perua premium", "sedan"], ["Mini", "Cooper SE", "Eletrico compacto", "sedan"],
  ["Alfa Romeo", "Giulia", "Sedan esportivo", "sedan"], ["Alfa Romeo", "Stelvio", "SUV esportivo", "suv"], ["Genesis", "G70", "Sedan premium", "sedan"], ["Genesis", "GV70", "SUV premium", "suv"],
] as const;

const locadorasGlobais = ["Fast RentCar Centro", "Fast RentCar Premium", "Global Motors", "Euro Drive", "EcoWay", "Familia Rent", "Prime Drive Centro"];
const cidadesGlobais = ["Sao Paulo", "Rio de Janeiro", "Belo Horizonte", "Curitiba", "Campinas", "Porto Alegre", "Brasilia", "Salvador", "Recife", "Florianopolis"];
const coresGlobais = ["#1d4ed8", "#b42318", "#0f766e", "#a16207", "#334155", "#7c3aed", "#0891b2", "#be123c"];
const statusGlobais: StatusVeiculo[] = ["disponivel", "disponivel", "disponivel", "reservado", "alugado", "manutencao"];

const frotaGlobal: Veiculo[] = modelosMundiais.map(([marca, modelo, categoria, tipo], index) => {
  const isPremium = /BMW|Mercedes|Audi|Volvo|Porsche|Tesla|Land Rover|Lexus|Genesis|Alfa/.test(marca);
  const isEletrico = /Eletrico|Tesla|BYD|Ora|e-tron|Taycan|Ioniq|Leaf|E-Tech/.test(`${categoria} ${modelo}`);
  const diaria = isPremium ? 360 + (index % 9) * 38 : 118 + (index % 12) * 19;
  const precoMercado = isPremium ? 210000 + (index % 16) * 18000 : 62000 + (index % 20) * 7200;
  const combustivel: Veiculo["combustivel"] = isEletrico ? "Eletrico" : categoria.includes("hibrido") || categoria.includes("Hibrido") ? "Hibrido" : index % 7 === 0 ? "Diesel" : "Flex";
  const status = statusGlobais[index % statusGlobais.length];

  return {
    id: `vg${index + 1}`,
    locadora: locadorasGlobais[index % locadorasGlobais.length],
    marca,
    modelo,
    categoria,
    cidade: cidadesGlobais[index % cidadesGlobais.length],
    cambio: index % 11 === 0 ? "Manual" : "Automatico",
    combustivel,
    diaria,
    precoMercado,
    disponibilidade: status === "disponivel" ? 1 + (index % 9) : 0,
    avaliacao: Number((4.1 + (index % 9) * 0.1).toFixed(1)),
    status,
    placa: `${marca.slice(0, 3).toUpperCase()}-${String(1000 + index).slice(0, 4)}`,
    quilometragem: 8000 + index * 1370,
    recursos: isPremium
      ? ["acabamento premium", "assistentes de conducao", "conectividade"]
      : ["ar condicionado", "multimidia", index % 2 === 0 ? "baixo consumo" : "porta-malas versatil"],
    imagem: imagemVeiculo(`${marca} ${modelo}`, coresGlobais[index % coresGlobais.length], tipo),
  };
});

const estadoInicial: AppState = {
  veiculos: [...frotaBase, ...frotaGlobal],
  reservas: [
    { id: "R-1042", cliente: "Marina Alves", veiculoId: "v4", retirada: dateInput(amanha), devolucao: dateInput(daquiQuatroDias), status: "confirmada", total: 957, multa: 0, pagamento: "aprovado", documentos: "aprovado", combustivelRetirada: 80, observacao: "Retirada no balcao principal." },
    { id: "R-1039", cliente: "Rafael Lima", veiculoId: "v1", retirada: dateInput(ontem), devolucao: dateInput(amanha), status: "ativa", total: 717, multa: 0, pagamento: "aprovado", documentos: "aprovado", combustivelRetirada: 100, observacao: "Check-in realizado com vistoria digital." },
    { id: "R-1036", cliente: "Bianca Torres", veiculoId: "v9", retirada: dateInput(ontem), devolucao: dateInput(daquiQuatroDias), status: "ativa", total: 916, multa: 0, pagamento: "aprovado", documentos: "aprovado", combustivelRetirada: 75, observacao: "Cliente viaja com crianca; cadeirinha adicionada." },
    { id: "R-1031", cliente: "Otavio Mendes", veiculoId: "v12", retirada: dateInput(new Date(hoje.getTime() - 5 * 86400000)), devolucao: dateInput(ontem), status: "concluida", total: 1996, multa: 0, pagamento: "aprovado", documentos: "aprovado", combustivelRetirada: 100, combustivelDevolucao: 100, observacao: "Locacao concluida sem avarias." },
    { id: "R-1029", cliente: "Camila Rocha", veiculoId: "v14", retirada: dateInput(amanha), devolucao: dateInput(new Date(hoje.getTime() + 7 * 86400000)), status: "pendente", total: 2754, multa: 0, pagamento: "aguardando", documentos: "pendente", combustivelRetirada: 100, observacao: "Aguardando validacao documental." },
  ],
  usuarios: [
    { id: "u1", nome: "Marina Alves", email: "marina@email.com", senha: "cliente123", perfil: "cliente", bloqueado: false, nascimento: "1994-08-12", cnhEmitidaEm: "2018-05-11", comprovante: "aprovado", pendenciaFinanceira: false },
    { id: "u2", nome: "Rafael Lima", email: "rafael@email.com", senha: "cliente123", perfil: "cliente", bloqueado: false, nascimento: "1999-02-18", cnhEmitidaEm: "2021-03-02", comprovante: "aprovado", pendenciaFinanceira: false },
    { id: "u4", nome: "Bianca Torres", email: "bianca@email.com", senha: "cliente123", perfil: "cliente", bloqueado: false, nascimento: "1991-11-21", cnhEmitidaEm: "2015-09-18", comprovante: "aprovado", pendenciaFinanceira: false },
    { id: "u5", nome: "Lucas Ferraz", email: "lucas@email.com", senha: "cliente123", perfil: "cliente", bloqueado: false, nascimento: "2004-01-07", cnhEmitidaEm: "2025-02-10", comprovante: "pendente", pendenciaFinanceira: false },
    { id: "u6", nome: "Julia Nogueira", email: "julia@email.com", senha: "cliente123", perfil: "cliente", bloqueado: false, nascimento: "1996-04-19", cnhEmitidaEm: "2017-08-05", comprovante: "aprovado", pendenciaFinanceira: false },
    { id: "u3", nome: "Fast RentCar Centro", email: "locadora@fastrentcar.com", perfil: "locadora", bloqueado: false, comprovante: "aprovado", pendenciaFinanceira: false },
  ],
  mensagens: [
    { id: "m1", publico: "cliente", texto: "Reserva R-1042 confirmada. Leve CNH fisica no dia da retirada.", data: "hoje" },
    { id: "m2", publico: "locadora", texto: "Nova reserva recebida para Jeep Compass com pagamento aprovado.", data: "hoje" },
    { id: "m3", publico: "administrador", texto: "Acuracia da consultoria permanece acima da meta de 85%.", data: "ontem" },
  ],
};

function carregarEstado(): AppState {
  if (typeof window === "undefined") return estadoInicial;
  try {
    const raw = window.localStorage.getItem(storageKey);
    return raw ? (JSON.parse(raw) as AppState) : estadoInicial;
  } catch {
    return estadoInicial;
  }
}

function idadeEmAnos(data?: string) {
  if (!data) return 0;
  return Math.floor((Date.now() - new Date(data).getTime()) / (365.25 * 24 * 60 * 60 * 1000));
}

function diferencaDias(inicio: string, fim: string) {
  return Math.max(1, Math.round((new Date(`${fim}T12:00:00`).getTime() - new Date(`${inicio}T12:00:00`).getTime()) / 86400000));
}

function gerarId(prefixo: string) {
  return `${prefixo}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
}

function calcularAderencia(veiculo: Veiculo, consulta: string, precoMaximo: number) {
  const consultaNormalizada = consulta.toLowerCase().trim();
  const identidade = `${veiculo.marca} ${veiculo.modelo}`.toLowerCase();
  const texto = `${identidade} ${veiculo.categoria} ${veiculo.recursos.join(" ")} ${veiculo.combustivel}`.toLowerCase();
  const termos = consulta.toLowerCase().replace(/[^\w\s]/g, " ").split(/\s+/).filter((termo) => termo.length > 2);
  const matchIdentidade = consultaNormalizada.length >= 2 && identidade.includes(consultaNormalizada);
  const termoScore = termos.reduce((score, termo) => {
    if (identidade.includes(termo)) return score + 42;
    if (texto.includes(termo)) return score + 14;
    return score;
  }, matchIdentidade ? 55 : 0);
  const disponibilidadeScore = Math.min(veiculo.disponibilidade * 4, 28);
  const precoScore = veiculo.precoMercado <= precoMaximo ? 32 : Math.max(0, 32 - (veiculo.precoMercado - precoMaximo) / 3000);
  return Math.round(Math.min(100, termoScore + disponibilidadeScore + precoScore + veiculo.avaliacao * 4));
}

function consultaPareceMarcaOuModelo(consulta: string, veiculos: Veiculo[]) {
  const termo = consulta.trim().toLowerCase();
  if (termo.length < 2) return false;
  return veiculos.some((veiculo) => `${veiculo.marca} ${veiculo.modelo}`.toLowerCase().includes(termo));
}

function validarCliente(usuario: Usuario, reservas: Reserva[]) {
  const locacaoAtiva = reservas.some(
    (reserva) => reserva.cliente === usuario.nome && ["ativa", "confirmada", "pendente"].includes(reserva.status),
  );
  if (locacaoAtiva || usuario.pendenciaFinanceira) return "Cliente possui locacao ativa ou pendencia financeira.";
  if (idadeEmAnos(usuario.nascimento) < 21) return "Condutor precisa ter pelo menos 21 anos.";
  if (idadeEmAnos(usuario.cnhEmitidaEm) < 2) return "CNH precisa ter no minimo 2 anos de emissao.";
  if (usuario.comprovante !== "aprovado") return "Comprovante de residencia ainda nao foi aprovado.";
  return "";
}

function statusLabel(status: StatusVeiculo | StatusReserva) {
  return status === "manutencao" ? "em manutencao" : status;
}

export function Dashboard() {
  const [estado, setEstado] = useState<AppState>(estadoInicial);
  const [aba, setAba] = useState<Perfil>("cliente");
  const [logado, setLogado] = useState<Record<"locadora" | "administrador", boolean>>({ locadora: false, administrador: false });
  const [portalLoginAberto, setPortalLoginAberto] = useState<"locadora" | "administrador" | null>(null);
  const [credenciais, setCredenciais] = useState({ email: "", senha: "" });
  const [erroLogin, setErroLogin] = useState("");
  const [usuarioAtual, setUsuarioAtual] = useState("Julia Nogueira");
  const [clienteLogado, setClienteLogado] = useState(false);
  const [clienteModo, setClienteModo] = useState<"login" | "cadastro">("login");
  const [contaAberta, setContaAberta] = useState(false);
  const [clienteCredenciais, setClienteCredenciais] = useState({ email: "julia@email.com", senha: "cliente123" });
  const [cadastroCliente, setCadastroCliente] = useState({
    nome: "",
    email: "",
    senha: "",
    nascimento: "1995-01-01",
    cnhEmitidaEm: "2018-01-01",
  });
  const [clienteMensagem, setClienteMensagem] = useState("");
  const [cidade, setCidade] = useState("Todas");
  const [categoria, setCategoria] = useState("Todas");
  const [statusFiltro, setStatusFiltro] = useState<"Todos" | StatusVeiculo>("Todos");
  const [precoMaximo, setPrecoMaximo] = useState(520);
  const [retirada, setRetirada] = useState(dateInput(amanha));
  const [devolucao, setDevolucao] = useState(dateInput(daquiQuatroDias));
  const [consulta, setConsulta] = useState("carro esportivo ate R$100 mil");
  const [selecionado, setSelecionado] = useState("v2");
  const [feedback, setFeedback] = useState("Pronto para reservar.");
  const [checkoutError, setCheckoutError] = useState("");
  const [reservaAberta, setReservaAberta] = useState<string | null>(null);
  const [etapaReserva, setEtapaReserva] = useState<EtapaReserva>("detalhes");
  const [pagamento, setPagamento] = useState({
    nome: "Julia Nogueira",
    numero: "4111 1111 1111 1111",
    validade: "12/29",
    cvv: "123",
    cupom: "",
  });
  const [novoVeiculo, setNovoVeiculo] = useState<NovoVeiculo>({
    marca: "Volkswagen",
    modelo: "Virtus",
    categoria: "Sedan executivo",
    cidade: "Sao Paulo",
    diaria: 189,
    precoMercado: 96000,
    status: "disponivel",
    cambio: "Automatico",
    combustivel: "Flex",
    imagem: imagemVeiculo("Volkswagen Virtus", "#2563eb"),
  });

  useEffect(() => {
    const timer = window.setTimeout(() => setEstado(carregarEstado()), 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    window.localStorage.setItem(storageKey, JSON.stringify(estado));
  }, [estado]);

  const usuario = estado.usuarios.find((item) => item.nome === usuarioAtual) ?? estado.usuarios[0];
  const cidades = ["Todas", ...Array.from(new Set(estado.veiculos.map((veiculo) => veiculo.cidade)))];
  const categorias = ["Todas", ...Array.from(new Set(estado.veiculos.map((veiculo) => veiculo.categoria)))];
  const dias = diferencaDias(retirada, devolucao);

  const veiculosFiltrados = useMemo(
    () =>
      estado.veiculos.filter((veiculo) => {
        const cidadeOk = cidade === "Todas" || veiculo.cidade === cidade;
        const categoriaOk = categoria === "Todas" || veiculo.categoria === categoria;
        const statusOk = statusFiltro === "Todos" || veiculo.status === statusFiltro;
        return cidadeOk && categoriaOk && statusOk && veiculo.diaria <= precoMaximo;
      }),
    [estado.veiculos, cidade, categoria, statusFiltro, precoMaximo],
  );

  const sugestoes = useMemo(
    () => {
      const filtroDireto = consultaPareceMarcaOuModelo(consulta, estado.veiculos);
      const termo = consulta.trim().toLowerCase();

      return estado.veiculos
        .filter((veiculo) => veiculo.status === "disponivel")
        .filter((veiculo) => !filtroDireto || `${veiculo.marca} ${veiculo.modelo}`.toLowerCase().includes(termo))
        .map((veiculo) => ({ veiculo, score: calcularAderencia(veiculo, consulta, 100000) }))
        .sort((a, b) => b.score - a.score || b.veiculo.disponibilidade - a.veiculo.disponibilidade)
        .slice(0, 4);
    },
    [estado.veiculos, consulta],
  );

  const reservasEnriquecidas = estado.reservas.map((reserva) => ({
    ...reserva,
    veiculo: estado.veiculos.find((veiculo) => veiculo.id === reserva.veiculoId),
  }));
  const veiculoReserva = estado.veiculos.find((veiculo) => veiculo.id === reservaAberta);
  const subtotalReserva = veiculoReserva ? veiculoReserva.diaria * dias : 0;
  const protecaoReserva = Math.round(subtotalReserva * 0.12);
  const descontoReserva = pagamento.cupom.trim().toUpperCase() === "MOBI10" ? Math.round(subtotalReserva * 0.1) : 0;
  const totalReserva = subtotalReserva + protecaoReserva - descontoReserva;

  const receitaBruta = estado.reservas
    .filter((reserva) => reserva.pagamento === "aprovado" && reserva.status !== "cancelada")
    .reduce((total, reserva) => total + reserva.total, 0);
  const disponiveis = estado.veiculos.filter((veiculo) => veiculo.status === "disponivel").length;
  const alugados = estado.veiculos.filter((veiculo) => veiculo.status === "alugado" || veiculo.status === "reservado").length;
  const menorDiaria = Math.min(...estado.veiculos.filter((veiculo) => veiculo.status === "disponivel").map((veiculo) => veiculo.diaria));
  const cidadesAtendidas = new Set(estado.veiculos.map((veiculo) => veiculo.cidade)).size;
  const melhorAvaliacao = Math.max(...estado.veiculos.map((veiculo) => veiculo.avaliacao));

  function atualizarEstado(mutacao: (atual: AppState) => AppState) {
    setEstado((atual) => mutacao(atual));
  }

  function criarMensagem(publico: Perfil | "todos", texto: string): Mensagem {
    return { id: gerarId("M"), publico, texto, data: "agora" };
  }

  function entrar(perfil: "locadora" | "administrador") {
    const acesso = acessos[perfil];
    if (credenciais.email === acesso.email && credenciais.senha === acesso.senha) {
      setLogado((atual) => ({ ...atual, [perfil]: true }));
      setCredenciais({ email: "", senha: "" });
      setErroLogin("");
      setPortalLoginAberto(null);
      return;
    }
    setErroLogin("E-mail ou senha incorretos.");
  }

  function entrarCliente() {
    const cliente = estado.usuarios.find(
      (item) =>
        item.perfil === "cliente" &&
        item.email.toLowerCase() === clienteCredenciais.email.toLowerCase() &&
        item.senha === clienteCredenciais.senha &&
        !item.bloqueado,
    );

    if (!cliente) {
      setClienteMensagem("E-mail ou senha incorretos para cliente.");
      return;
    }

    setUsuarioAtual(cliente.nome);
    setPagamento((atual) => ({ ...atual, nome: cliente.nome }));
    setClienteLogado(true);
    setContaAberta(false);
    setClienteMensagem(`Login realizado como ${cliente.nome}.`);
  }

  function sairCliente() {
    setClienteLogado(false);
    setContaAberta(false);
    setClienteMensagem("Voce saiu da conta de cliente.");
  }

  function cadastrarCliente() {
    if (!cadastroCliente.nome.trim() || !cadastroCliente.email.includes("@") || cadastroCliente.senha.length < 4) {
      setClienteMensagem("Preencha nome, e-mail valido e uma senha com pelo menos 4 caracteres.");
      return;
    }

    if (estado.usuarios.some((item) => item.email.toLowerCase() === cadastroCliente.email.toLowerCase())) {
      setClienteMensagem("Ja existe uma conta com esse e-mail.");
      return;
    }

    const novoCliente: Usuario = {
      id: gerarId("U"),
      nome: cadastroCliente.nome.trim(),
      email: cadastroCliente.email.trim(),
      senha: cadastroCliente.senha,
      perfil: "cliente",
      bloqueado: false,
      nascimento: cadastroCliente.nascimento,
      cnhEmitidaEm: cadastroCliente.cnhEmitidaEm,
      comprovante: "aprovado",
      pendenciaFinanceira: false,
    };

    atualizarEstado((atual) => ({
      ...atual,
      usuarios: [...atual.usuarios, novoCliente],
      mensagens: [criarMensagem("administrador", `Novo cliente cadastrado: ${novoCliente.nome}.`), ...atual.mensagens],
    }));
    setUsuarioAtual(novoCliente.nome);
    setPagamento((atual) => ({ ...atual, nome: novoCliente.nome }));
    setClienteLogado(true);
    setContaAberta(false);
    setClienteMensagem("Cadastro criado e login realizado.");
    setClienteModo("login");
  }

  function abrirReserva(veiculoId: string) {
    const veiculo = estado.veiculos.find((item) => item.id === veiculoId);
    if (!veiculo) return;

    if (!clienteLogado) {
      setFeedback("Entre ou crie uma conta de cliente para reservar.");
      setClienteMensagem("Faca login ou cadastre-se antes de finalizar uma reserva.");
      setContaAberta(true);
      return;
    }

    if (veiculo.status !== "disponivel") {
      setFeedback("Veiculo indisponivel para reserva. Escolha outro modelo disponivel.");
      return;
    }

    setSelecionado(veiculoId);
    setReservaAberta(veiculoId);
    setEtapaReserva("detalhes");
    setCheckoutError("");
  }

  function finalizarReserva() {
    const veiculo = estado.veiculos.find((item) => item.id === reservaAberta);
    if (!veiculo) return;

    if (!clienteLogado) {
      setCheckoutError("Entre na sua conta de cliente antes de confirmar o pagamento.");
      return;
    }

    const impedimento = validarCliente(usuario, estado.reservas);
    if (impedimento) {
      setFeedback(impedimento);
      setCheckoutError(impedimento);
      return;
    }

    if (veiculo.status !== "disponivel") {
      setFeedback("Veiculo indisponivel para reserva. Escolha outro modelo disponivel.");
      setCheckoutError("Este veiculo deixou de estar disponivel. Escolha outro modelo na vitrine.");
      setReservaAberta(null);
      return;
    }

    if (pagamento.numero.replace(/\D/g, "").length < 12 || pagamento.cvv.trim().length < 3) {
      setCheckoutError("Confira os dados do pagamento simulado antes de confirmar.");
      return;
    }

    const id = gerarId("R");

    atualizarEstado((atual) => ({
      ...atual,
      veiculos: atual.veiculos.map((item) =>
        item.id === veiculo.id ? { ...item, status: "reservado", disponibilidade: Math.max(0, item.disponibilidade - 1) } : item,
      ),
      reservas: [
        { id, cliente: usuario.nome, veiculoId: veiculo.id, retirada, devolucao, status: "confirmada", total: totalReserva, multa: 0, pagamento: "aprovado", documentos: usuario.comprovante, combustivelRetirada: 100, observacao: "Pagamento simulado aprovado. Documentos conferidos automaticamente no MVP." },
        ...atual.reservas,
      ],
      mensagens: [
        criarMensagem("cliente", `Reserva ${id} criada para ${veiculo.marca} ${veiculo.modelo}.`),
        criarMensagem("locadora", `Nova reserva ${id} aguardando preparacao.`),
        ...atual.mensagens,
      ],
    }));

    setFeedback(`Reserva ${id} criada com pagamento aprovado.`);
    setCheckoutError("");
    setEtapaReserva("confirmacao");
  }

  function cancelarReserva(id: string) {
    const reserva = estado.reservas.find((item) => item.id === id);
    if (!reserva || reserva.status === "cancelada") return;
    const horasAteRetirada = (new Date(`${reserva.retirada}T10:00:00`).getTime() - Date.now()) / 3600000;
    const multa = horasAteRetirada < 24 ? reserva.total * 0.3 : 0;

    atualizarEstado((atual) => ({
      ...atual,
      reservas: atual.reservas.map((item) =>
        item.id === id ? { ...item, status: "cancelada", multa, pagamento: multa > 0 ? "aprovado" : "estornado" } : item,
      ),
      veiculos: atual.veiculos.map((veiculo) =>
        veiculo.id === reserva.veiculoId ? { ...veiculo, status: "disponivel", disponibilidade: veiculo.disponibilidade + 1 } : veiculo,
      ),
      mensagens: [criarMensagem("cliente", `Reserva ${id} cancelada. Multa aplicada: ${moeda.format(multa)}.`), ...atual.mensagens],
    }));
  }

  function mudarStatusReserva(id: string, status: StatusReserva) {
    const reserva = estado.reservas.find((item) => item.id === id);
    atualizarEstado((atual) => ({
      ...atual,
      reservas: atual.reservas.map((item) =>
        item.id === id
          ? {
              ...item,
              status,
              combustivelDevolucao: status === "concluida" ? 70 : item.combustivelDevolucao,
              observacao: status === "concluida" ? "Check-out concluido. Combustivel e vistoria registrados." : item.observacao,
            }
          : item,
      ),
      veiculos: atual.veiculos.map((veiculo) =>
        reserva?.veiculoId === veiculo.id
          ? { ...veiculo, status: status === "ativa" ? "alugado" : status === "concluida" ? "disponivel" : veiculo.status }
          : veiculo,
      ),
      mensagens: [criarMensagem("locadora", `Reserva ${id} atualizada para ${status}.`), ...atual.mensagens],
    }));
  }

  function alternarStatusVeiculo(id: string, status: StatusVeiculo) {
    atualizarEstado((atual) => ({
      ...atual,
      veiculos: atual.veiculos.map((veiculo) => (veiculo.id === id ? { ...veiculo, status } : veiculo)),
    }));
  }

  function bloquearUsuario(id: string) {
    atualizarEstado((atual) => ({
      ...atual,
      usuarios: atual.usuarios.map((item) => (item.id === id ? { ...item, bloqueado: !item.bloqueado } : item)),
    }));
  }

  function carregarImagem(event: ChangeEvent<HTMLInputElement>) {
    const arquivo = event.target.files?.[0];
    if (!arquivo) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setNovoVeiculo((atual) => ({ ...atual, imagem: reader.result as string }));
      }
    };
    reader.readAsDataURL(arquivo);
  }

  function adicionarVeiculo() {
    const id = gerarId("V");
    atualizarEstado((atual) => ({
      ...atual,
      veiculos: [
        {
          id,
          locadora: "Prime Drive Centro",
          marca: novoVeiculo.marca,
          modelo: novoVeiculo.modelo,
          categoria: novoVeiculo.categoria,
          cidade: novoVeiculo.cidade,
          cambio: novoVeiculo.cambio,
          combustivel: novoVeiculo.combustivel,
          diaria: Number(novoVeiculo.diaria) || 180,
          precoMercado: Number(novoVeiculo.precoMercado) || 90000,
          disponibilidade: 1,
          avaliacao: 4.5,
          status: novoVeiculo.status,
          placa: gerarId("PL"),
          quilometragem: 0,
          recursos: ["ar condicionado", "multimidia", "seguro incluso"],
          imagem: novoVeiculo.imagem || imagemVeiculo(`${novoVeiculo.marca} ${novoVeiculo.modelo}`, "#2563eb"),
        },
        ...atual.veiculos,
      ],
      mensagens: [criarMensagem("administrador", `${novoVeiculo.marca} ${novoVeiculo.modelo} incluido na frota.`), ...atual.mensagens],
    }));
    setFeedback("Veiculo cadastrado e visivel para clientes.");
  }

  function abrirAba(perfil: Perfil) {
    setAba(perfil);
    if (perfil === "locadora" && !logado.locadora) {
      setPortalLoginAberto("locadora");
    }
    if (perfil === "administrador" && !logado.administrador) {
      setPortalLoginAberto("administrador");
    }
  }

  function renderLoginGate(perfil: "locadora" | "administrador") {
    const titulo = perfil === "locadora" ? "Portal da locadora" : "Painel administrativo";
    const acesso = acessos[perfil];
    return (
      <section className={styles.modalOverlay} role="dialog" aria-modal="true" aria-label={titulo}>
        <div className={styles.accountModal}>
          <button className={styles.closeButton} onClick={() => setPortalLoginAberto(null)} type="button">Fechar</button>
          <span className={styles.kicker}>Acesso restrito</span>
          <h2>{titulo}</h2>
          <p className={styles.muted}>Use o login de demonstracao abaixo para entrar nesta area.</p>
          <div className={styles.credentialBox}>
            <span>E-mail: {acesso.email}</span>
            <span>Senha: {acesso.senha}</span>
          </div>
          <label className={styles.field}>
            E-mail
            <input value={credenciais.email} onChange={(event) => setCredenciais({ ...credenciais, email: event.target.value })} />
          </label>
          <label className={styles.field}>
            Senha
            <input type="password" value={credenciais.senha} onChange={(event) => setCredenciais({ ...credenciais, senha: event.target.value })} />
          </label>
          <button className={styles.primaryButton} onClick={() => entrar(perfil)} type="button">Entrar</button>
          {erroLogin ? <p className={styles.feedback}>{erroLogin}</p> : null}
        </div>
      </section>
    );
  }

  return (
    <main className={styles.pageShell}>
      <header className={styles.topbar}>
        <div>
          <span className={styles.kicker}>Plataforma Web de Locacao</span>
          <h1>Fast RentCar</h1>
        </div>
        <nav className={styles.tabs} aria-label="Modulos">
          {(["cliente", "locadora", "administrador"] as const).map((perfil) => (
            <button aria-pressed={aba === perfil} className={aba === perfil ? styles.tabActive : styles.tab} key={perfil} onClick={() => abrirAba(perfil)} type="button">
              {perfil === "cliente" ? "Aluguel" : perfil === "locadora" ? "Locadora" : "Admin"}
            </button>
          ))}
          {aba === "cliente" ? (
            <button className={styles.accountTopButton} onClick={() => setContaAberta(true)} type="button">
              {clienteLogado ? usuario.nome : "Entrar / Cadastrar"}
            </button>
          ) : null}
        </nav>
      </header>

      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <span className={styles.kicker}>Reserva digital com consultoria inteligente</span>
          <h2>Alugue o carro certo com uma jornada simples do inicio ao pagamento.</h2>
          <p>
            Compare modelos, veja detalhes reais da frota, confira documentos, escolha datas e finalize uma reserva
            com pagamento simulado em poucos passos.
          </p>
          <div className={styles.heroSearch}>
            <div>
              <span>Retirada</span>
              <strong>{retirada}</strong>
            </div>
            <div>
              <span>Devolucao</span>
              <strong>{devolucao}</strong>
            </div>
            <div>
              <span>Diaria ate</span>
              <strong>{moeda.format(precoMaximo)}</strong>
            </div>
          </div>
          <div className={styles.heroActions}>
            <a href="#busca">Ver frota</a>
            <a href="#consultoria">Consultar perfil ideal</a>
          </div>
        </div>
        <div className={styles.heroMedia} aria-label="Veiculo em destaque">
          <img alt={`${estado.veiculos[0].marca} ${estado.veiculos[0].modelo}`} src={estado.veiculos[0].imagem} />
          <aside className={styles.heroDeal}>
            <span>Destaque da semana</span>
            <strong>{estado.veiculos[0].avaliacao.toFixed(1)} / 5</strong>
            <small>{estado.veiculos[0].disponibilidade} unidades disponiveis</small>
          </aside>
          <div>
            <strong>{estado.veiculos[0].marca} {estado.veiculos[0].modelo}</strong>
            <span>{moeda.format(estado.veiculos[0].diaria)} por dia</span>
          </div>
        </div>
      </section>

      <section className={styles.metricGrid}>
        <article><span>Carros disponiveis</span><strong>{disponiveis}</strong><small>{estado.veiculos.length} modelos cadastrados na plataforma</small></article>
        <article><span>Menor diaria</span><strong>{moeda.format(menorDiaria)}</strong><small>Opcoes economicas para retirada rapida</small></article>
        <article><span>Cidades atendidas</span><strong>{cidadesAtendidas}</strong><small>Frota distribuida entre locadoras parceiras</small></article>
        <article><span>Melhor avaliacao</span><strong>{melhorAvaliacao.toFixed(1)} / 5</strong><small>{alugados} carros alugados ou reservados agora</small></article>
      </section>

      {aba === "cliente" ? (
        <section className={styles.workspace}>
          <div className={styles.mainColumn}>
            <section className={styles.panel} id="consultoria">
              <div className={styles.sectionTitle}><span className={styles.kicker}>Consultoria automotiva</span><h2>Sugestoes por necessidade e orcamento</h2></div>
              <textarea className={styles.textarea} onChange={(event) => setConsulta(event.target.value)} value={consulta} />
              <div className={styles.suggestionGrid}>
                {sugestoes.map(({ veiculo, score }) => (
                  <article className={styles.suggestionCard} key={veiculo.id}>
                    <img alt={`${veiculo.marca} ${veiculo.modelo}`} src={veiculo.imagem} />
                    <div><span>{score}% aderente</span><strong>{veiculo.marca} {veiculo.modelo}</strong><p>{veiculo.categoria}. {veiculo.recursos.join(", ")}. {veiculo.disponibilidade} unidade(s).</p><button onClick={() => abrirReserva(veiculo.id)} type="button">Ver e reservar</button></div>
                  </article>
                ))}
              </div>
            </section>

            <section className={styles.panel} id="busca">
              <div className={styles.sectionTitle}><span className={styles.kicker}>Busca e comparacao</span><h2>Vitrine de veiculos</h2></div>
              <div className={styles.filters}>
                <label>Cidade<select value={cidade} onChange={(event) => setCidade(event.target.value)}>{cidades.map((item) => <option key={item}>{item}</option>)}</select></label>
                <label>Categoria<select value={categoria} onChange={(event) => setCategoria(event.target.value)}>{categorias.map((item) => <option key={item}>{item}</option>)}</select></label>
                <label>Status<select value={statusFiltro} onChange={(event) => setStatusFiltro(event.target.value as typeof statusFiltro)}><option>Todos</option><option value="disponivel">Disponivel</option><option value="alugado">Alugado</option><option value="reservado">Reservado</option><option value="manutencao">Em manutencao</option></select></label>
                <label>Diaria maxima<input max="600" min="80" onChange={(event) => setPrecoMaximo(Number(event.target.value))} type="range" value={precoMaximo} /><span>{moeda.format(precoMaximo)}</span></label>
              </div>
              <div className={styles.vehicleGrid}>
                {veiculosFiltrados.map((veiculo) => (
                  <article className={styles.vehicleCard} key={veiculo.id}>
                    <img alt={`${veiculo.marca} ${veiculo.modelo}`} src={veiculo.imagem} />
                    <div className={styles.vehicleBody}>
                      <span className={styles.badge}>{statusLabel(veiculo.status)}</span>
                      <h3>{veiculo.marca} {veiculo.modelo}</h3>
                      <p>{veiculo.categoria} em {veiculo.cidade}. {veiculo.cambio}, {veiculo.combustivel}. Placa {veiculo.placa}, {numero.format(veiculo.quilometragem)} km.</p>
                      <div className={styles.cardFooter}><strong>{moeda.format(veiculo.diaria)}/dia</strong><button disabled={veiculo.status !== "disponivel"} onClick={() => abrirReserva(veiculo.id)} type="button">{veiculo.status === "disponivel" ? "Ver detalhes" : "Indisponivel"}</button></div>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          </div>

          <aside className={styles.sideColumn}>
            <section className={styles.panel}>
              <div className={styles.sectionTitle}><span className={styles.kicker}>Fluxo de reserva</span><h2>Dados da locacao</h2></div>
              <label className={styles.field}>Cliente<input value={clienteLogado ? usuario.nome : "Entre para reservar"} readOnly /></label>
              <label className={styles.field}>Retirada<input value={retirada} min={dateInput(hoje)} onChange={(event) => setRetirada(event.target.value)} type="date" /></label>
              <label className={styles.field}>Devolucao<input value={devolucao} min={retirada} onChange={(event) => setDevolucao(event.target.value)} type="date" /></label>
              <label className={styles.field}>Veiculo<select value={selecionado} onChange={(event) => setSelecionado(event.target.value)}>{estado.veiculos.map((veiculo) => <option value={veiculo.id} key={veiculo.id}>{veiculo.marca} {veiculo.modelo}</option>)}</select></label>
              <button className={styles.primaryButton} onClick={() => abrirReserva(selecionado)} type="button">Ver detalhes e reservar</button>
              <p className={styles.feedback}>{feedback}</p>
            </section>
            <section className={styles.panel}><div className={styles.sectionTitle}><span className={styles.kicker}>Perfil e documentos</span><h2>{usuario.nome}</h2></div><ul className={styles.checkList}><li>Idade: {idadeEmAnos(usuario.nascimento)} anos</li><li>CNH emitida ha {idadeEmAnos(usuario.cnhEmitidaEm)} anos</li><li>Comprovante: {usuario.comprovante}</li><li>Pendencia financeira: {usuario.pendenciaFinanceira ? "sim" : "nao"}</li></ul></section>
          </aside>
        </section>
      ) : null}

      {aba === "locadora" && logado.locadora ? (
        <section className={styles.workspace}>
          <div className={styles.mainColumn}>
            <section className={styles.panel}><div className={styles.sectionTitle}><span className={styles.kicker}>Gestao de reservas</span><h2>Check-in, check-out e cancelamentos</h2></div><div className={styles.tableList}>{reservasEnriquecidas.map((reserva) => <article key={reserva.id}><div><strong>{reserva.id} - {reserva.cliente}</strong><span>{reserva.veiculo?.marca} {reserva.veiculo?.modelo} | {reserva.retirada} a {reserva.devolucao} | {moeda.format(reserva.total)}</span><small>{reserva.observacao}</small></div><div className={styles.rowActions}><span className={styles.badge}>{reserva.status}</span><button onClick={() => mudarStatusReserva(reserva.id, "ativa")} type="button">Check-in</button><button onClick={() => mudarStatusReserva(reserva.id, "concluida")} type="button">Check-out</button><button onClick={() => cancelarReserva(reserva.id)} type="button">Cancelar</button></div></article>)}</div></section>
            <section className={styles.panel}><div className={styles.sectionTitle}><span className={styles.kicker}>Frota cadastrada</span><h2>Modelos, fotos e disponibilidade</h2></div><div className={styles.fleetRows}>{estado.veiculos.map((veiculo) => <article key={veiculo.id}><img alt={`${veiculo.marca} ${veiculo.modelo}`} src={veiculo.imagem} /><div><strong>{veiculo.marca} {veiculo.modelo}</strong><span>{veiculo.categoria} | {veiculo.cidade} | {moeda.format(veiculo.diaria)}/dia</span></div><select value={veiculo.status} onChange={(event) => alternarStatusVeiculo(veiculo.id, event.target.value as StatusVeiculo)}><option value="disponivel">Disponivel</option><option value="alugado">Alugado</option><option value="reservado">Reservado</option><option value="manutencao">Em manutencao</option></select></article>)}</div></section>
          </div>
          <aside className={styles.sideColumn}>
            <section className={styles.panel}><div className={styles.sectionTitle}><span className={styles.kicker}>Frota e precificacao</span><h2>Cadastrar veiculo</h2></div><div className={styles.imagePreview}><img alt="Previa do veiculo" src={novoVeiculo.imagem} /></div><div className={styles.formGrid}><label className={styles.field}>Marca<input placeholder="Ex: Volkswagen" value={novoVeiculo.marca} onChange={(event) => setNovoVeiculo({ ...novoVeiculo, marca: event.target.value })} /></label><label className={styles.field}>Modelo<input placeholder="Ex: Virtus" value={novoVeiculo.modelo} onChange={(event) => setNovoVeiculo({ ...novoVeiculo, modelo: event.target.value })} /></label><label className={styles.field}>Categoria<input placeholder="Ex: Sedan executivo" value={novoVeiculo.categoria} onChange={(event) => setNovoVeiculo({ ...novoVeiculo, categoria: event.target.value })} /></label><label className={styles.field}>Cidade<input placeholder="Ex: Sao Paulo" value={novoVeiculo.cidade} onChange={(event) => setNovoVeiculo({ ...novoVeiculo, cidade: event.target.value })} /></label><label className={styles.field}>Diaria<input value={novoVeiculo.diaria} onChange={(event) => setNovoVeiculo({ ...novoVeiculo, diaria: Number(event.target.value) })} type="number" /></label><label className={styles.field}>Preco de mercado<input value={novoVeiculo.precoMercado} onChange={(event) => setNovoVeiculo({ ...novoVeiculo, precoMercado: Number(event.target.value) })} type="number" /></label><label className={styles.field}>Status<select value={novoVeiculo.status} onChange={(event) => setNovoVeiculo({ ...novoVeiculo, status: event.target.value as StatusVeiculo })}><option value="disponivel">Disponivel</option><option value="reservado">Reservado</option><option value="alugado">Alugado</option><option value="manutencao">Em manutencao</option></select></label><label className={styles.field}>Imagem do veiculo<input accept="image/*" onChange={carregarImagem} type="file" /></label></div><button className={styles.primaryButton} onClick={adicionarVeiculo} type="button">Adicionar na frota</button></section>
          </aside>
        </section>
      ) : null}

      {aba === "administrador" && logado.administrador ? (
        <section className={styles.workspace}>
          <div className={styles.mainColumn}>
            <section className={styles.panel}><div className={styles.sectionTitle}><span className={styles.kicker}>Painel administrativo</span><h2>Usuarios, parceiros e transacoes</h2></div><div className={styles.tableList}>{estado.usuarios.map((item) => <article key={item.id}><div><strong>{item.nome}</strong><span>{item.email} | {item.perfil} | documentos: {item.comprovante}</span></div><div className={styles.rowActions}><span className={styles.badge}>{item.bloqueado ? "bloqueado" : "ativo"}</span><button onClick={() => bloquearUsuario(item.id)} type="button">{item.bloqueado ? "Desbloquear" : "Bloquear"}</button></div></article>)}</div></section>
            <section className={styles.panel}><div className={styles.sectionTitle}><span className={styles.kicker}>Relatorios estrategicos</span><h2>Indicadores do MVP</h2></div><div className={styles.reportGrid}><article><span>Volume de locacoes</span><strong>{estado.reservas.length}</strong></article><article><span>Faturamento total</span><strong>{moeda.format(receitaBruta)}</strong></article><article><span>Repasse as locadoras</span><strong>{moeda.format(receitaBruta * 0.9)}</strong></article><article><span>Tempo medio API</span><strong>312 ms</strong></article><article><span>Uptime monitorado</span><strong>99,95%</strong></article><article><span>Acuracia da IA</span><strong>87%</strong></article></div></section>
            <section className={styles.panel}><div className={styles.sectionTitle}><span className={styles.kicker}>Auditoria da frota</span><h2>Status por modelo</h2></div><div className={styles.auditGrid}>{estado.veiculos.map((veiculo) => <article key={veiculo.id}><strong>{veiculo.marca} {veiculo.modelo}</strong><span>{veiculo.locadora}</span><span>{statusLabel(veiculo.status)} | {veiculo.placa}</span></article>)}</div></section>
          </div>
          <aside className={styles.sideColumn}><section className={styles.panel}><div className={styles.sectionTitle}><span className={styles.kicker}>Monitoramento</span><h2>Alertas e conformidade</h2></div><ul className={styles.checkList}><li>Controle de acesso por login especifico.</li><li>Consentimento LGPD registrado no cadastro.</li><li>Dados de pagamento tratados por gateway seguro.</li><li>Logs de auditoria para reservas e transacoes.</li><li>Tempo de resposta da consultoria abaixo de 2 segundos.</li></ul></section><section className={styles.panel}><div className={styles.sectionTitle}><span className={styles.kicker}>Notificacoes</span><h2>Comunicacao proativa</h2></div><div className={styles.noticeList}>{estado.mensagens.slice(0, 8).map((mensagem) => <article key={mensagem.id}><span>{mensagem.publico} | {mensagem.data}</span><p>{mensagem.texto}</p></article>)}</div></section></aside>
        </section>
      ) : null}

      {veiculoReserva ? (
        <section className={styles.modalOverlay} role="dialog" aria-modal="true" aria-label="Finalizar reserva">
          <div className={styles.checkoutModal}>
            <button className={styles.closeButton} onClick={() => setReservaAberta(null)} type="button">Fechar</button>
            <div className={styles.checkoutHero}>
              <img alt={`${veiculoReserva.marca} ${veiculoReserva.modelo}`} src={veiculoReserva.imagem} />
              <div>
                <span className={styles.kicker}>{veiculoReserva.categoria}</span>
                <h2>{veiculoReserva.marca} {veiculoReserva.modelo}</h2>
                <p>{veiculoReserva.cidade} | {veiculoReserva.cambio} | {veiculoReserva.combustivel} | {numero.format(veiculoReserva.quilometragem)} km</p>
                <div className={styles.checkoutTags}>
                  {veiculoReserva.recursos.map((recurso) => <span key={recurso}>{recurso}</span>)}
                </div>
              </div>
            </div>

            <div className={styles.checkoutSteps}>
              <span className={etapaReserva === "detalhes" ? styles.stepActive : ""}>1. Detalhes</span>
              <span className={etapaReserva === "pagamento" ? styles.stepActive : ""}>2. Pagamento</span>
              <span className={etapaReserva === "confirmacao" ? styles.stepActive : ""}>3. Confirmacao</span>
            </div>

            {etapaReserva === "detalhes" ? (
              <div className={styles.checkoutGrid}>
                <article className={styles.checkoutPanel}>
                  <h3>Resumo da locacao</h3>
                  <dl className={styles.summaryList}>
                    <div><dt>Cliente</dt><dd>{usuario.nome}</dd></div>
                    <div><dt>Retirada</dt><dd>{retirada}</dd></div>
                    <div><dt>Devolucao</dt><dd>{devolucao}</dd></div>
                    <div><dt>Periodo</dt><dd>{dias} diaria(s)</dd></div>
                    <div><dt>Placa</dt><dd>{veiculoReserva.placa}</dd></div>
                    <div><dt>Avaliacao</dt><dd>{veiculoReserva.avaliacao.toFixed(1)} / 5</dd></div>
                  </dl>
                </article>
                <article className={styles.checkoutPanel}>
                  <h3>Regras antes de confirmar</h3>
                  <ul className={styles.checkList}>
                    <li>CNH com pelo menos 2 anos de emissao.</li>
                    <li>Cancelamento com menos de 24h aplica multa de 30%.</li>
                    <li>Devolucao com combustivel abaixo do nivel inicial gera taxa.</li>
                    <li>Pagamento abaixo e apenas uma simulacao do MVP.</li>
                  </ul>
                  <button className={styles.primaryButton} onClick={() => setEtapaReserva("pagamento")} type="button">Continuar para pagamento</button>
                </article>
              </div>
            ) : null}

            {etapaReserva === "pagamento" ? (
              <div className={styles.checkoutGrid}>
                <article className={styles.checkoutPanel}>
                  <h3>Pagamento simulado</h3>
                  <label className={styles.field}>Nome no cartao<input value={pagamento.nome} onChange={(event) => setPagamento({ ...pagamento, nome: event.target.value })} /></label>
                  <label className={styles.field}>Numero do cartao<input value={pagamento.numero} onChange={(event) => setPagamento({ ...pagamento, numero: event.target.value })} /></label>
                  <div className={styles.twoFields}>
                    <label className={styles.field}>Validade<input value={pagamento.validade} onChange={(event) => setPagamento({ ...pagamento, validade: event.target.value })} /></label>
                    <label className={styles.field}>CVV<input value={pagamento.cvv} onChange={(event) => setPagamento({ ...pagamento, cvv: event.target.value })} /></label>
                  </div>
                  <label className={styles.field}>Cupom<input placeholder="Experimente MOBI10" value={pagamento.cupom} onChange={(event) => setPagamento({ ...pagamento, cupom: event.target.value })} /></label>
                  {checkoutError ? <p className={styles.checkoutError}>{checkoutError}</p> : null}
                </article>
                <article className={styles.checkoutPanel}>
                  <h3>Total da reserva</h3>
                  <dl className={styles.priceList}>
                    <div><dt>{dias} diaria(s)</dt><dd>{moeda.format(subtotalReserva)}</dd></div>
                    <div><dt>Protecao basica</dt><dd>{moeda.format(protecaoReserva)}</dd></div>
                    <div><dt>Desconto</dt><dd>- {moeda.format(descontoReserva)}</dd></div>
                    <div><dt>Total</dt><dd>{moeda.format(totalReserva)}</dd></div>
                  </dl>
                  <button className={styles.primaryButton} onClick={finalizarReserva} type="button">Simular pagamento e confirmar</button>
                  <button className={styles.secondaryButton} onClick={() => setEtapaReserva("detalhes")} type="button">Voltar aos detalhes</button>
                </article>
              </div>
            ) : null}

            {etapaReserva === "confirmacao" ? (
              <div className={styles.successBox}>
                <span className={styles.kicker}>Reserva confirmada</span>
                <h3>Pagamento simulado aprovado</h3>
                <p>A locadora recebeu a notificacao e o cliente pode acompanhar a reserva no painel. Leve sua CNH no dia da retirada.</p>
                <button className={styles.primaryButton} onClick={() => setReservaAberta(null)} type="button">Fechar resumo</button>
              </div>
            ) : null}
          </div>
        </section>
      ) : null}

      {contaAberta ? (
        <section className={styles.modalOverlay} role="dialog" aria-modal="true" aria-label="Conta do cliente">
          <div className={styles.accountModal}>
            <button className={styles.closeButton} onClick={() => setContaAberta(false)} type="button">Fechar</button>
            <div className={styles.accountHeader}>
              <div>
                <span className={styles.kicker}>Conta do cliente</span>
                <h2>{clienteLogado ? `Ola, ${usuario.nome}` : "Entre ou crie sua conta"}</h2>
              </div>
              {clienteLogado ? <span className={styles.accountStatus}>Logado</span> : <span className={styles.accountStatusMuted}>Visitante</span>}
            </div>
            {clienteLogado ? (
              <div className={styles.accountSummary}>
                <div><span>E-mail</span><strong>{usuario.email}</strong></div>
                <div><span>Documento</span><strong>{usuario.comprovante}</strong></div>
                <div><span>Conta</span><strong>{usuario.bloqueado ? "bloqueada" : "ativa"}</strong></div>
                <button className={styles.logoutButton} onClick={sairCliente} type="button">Sair da conta</button>
              </div>
            ) : (
              <div className={styles.accountBox}>
                <div className={styles.accountTabs}>
                  <button className={clienteModo === "login" ? styles.accountTabActive : styles.accountTab} onClick={() => setClienteModo("login")} type="button">Entrar</button>
                  <button className={clienteModo === "cadastro" ? styles.accountTabActive : styles.accountTab} onClick={() => setClienteModo("cadastro")} type="button">Criar conta</button>
                </div>
                {clienteModo === "login" ? (
                  <>
                    <p className={styles.muted}>Conta demo: julia@email.com | senha: cliente123</p>
                    <label className={styles.field}>E-mail<input value={clienteCredenciais.email} onChange={(event) => setClienteCredenciais({ ...clienteCredenciais, email: event.target.value })} /></label>
                    <label className={styles.field}>Senha<input type="password" value={clienteCredenciais.senha} onChange={(event) => setClienteCredenciais({ ...clienteCredenciais, senha: event.target.value })} /></label>
                    <button className={styles.primaryButton} onClick={entrarCliente} type="button">Entrar e reservar</button>
                  </>
                ) : (
                  <>
                    <label className={styles.field}>Nome<input value={cadastroCliente.nome} onChange={(event) => setCadastroCliente({ ...cadastroCliente, nome: event.target.value })} /></label>
                    <label className={styles.field}>E-mail<input value={cadastroCliente.email} onChange={(event) => setCadastroCliente({ ...cadastroCliente, email: event.target.value })} /></label>
                    <label className={styles.field}>Senha<input type="password" value={cadastroCliente.senha} onChange={(event) => setCadastroCliente({ ...cadastroCliente, senha: event.target.value })} /></label>
                    <div className={styles.twoFields}>
                      <label className={styles.field}>Nascimento<input type="date" value={cadastroCliente.nascimento} onChange={(event) => setCadastroCliente({ ...cadastroCliente, nascimento: event.target.value })} /></label>
                      <label className={styles.field}>Emissao da CNH<input type="date" value={cadastroCliente.cnhEmitidaEm} onChange={(event) => setCadastroCliente({ ...cadastroCliente, cnhEmitidaEm: event.target.value })} /></label>
                    </div>
                    <button className={styles.primaryButton} onClick={cadastrarCliente} type="button">Criar conta e entrar</button>
                  </>
                )}
              </div>
            )}
            {clienteMensagem ? <p className={styles.feedback}>{clienteMensagem}</p> : null}
          </div>
        </section>
      ) : null}

      {portalLoginAberto ? renderLoginGate(portalLoginAberto) : null}
    </main>
  );
}

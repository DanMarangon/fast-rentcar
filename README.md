# Fast RentCar

Plataforma web de locacao de veiculos criada a partir dos requisitos do BRD e da ERS. O MVP inclui uma experiencia unica e responsiva para cliente, locadora parceira e administrador.

## Funcionalidades

- Busca de veiculos por cidade, categoria, cambio e diaria maxima.
- Consultoria automotiva inteligente por texto livre, priorizando disponibilidade, preco e aderencia ao perfil informado.
- Criacao de reserva com pagamento simulado, validacao documental e regras de condutor.
- Bloqueio de nova reserva quando o cliente possui locacao ativa ou pendencia financeira.
- Cancelamento com multa de 30% quando a retirada ocorre em menos de 24 horas.
- Portal da locadora com cadastro de frota, disponibilidade, check-in e check-out.
- Painel administrativo com usuarios, parceiros, transacoes, KPIs, CSAT, uptime, comissao de 10% e monitoramento da consultoria.
- Notificacoes operacionais para clientes e locadoras.
- Persistencia local no navegador para manter alteracoes durante o uso.

## Como executar

```bash
cd C:\Users\Dan\Desktop\.net\trabalho\perp-dex-cost-app
npm run dev
```

Abra `http://localhost:3000`.

## Validacao

```bash
npm run lint
npm run build
```

## Observacoes

O projeto foi estruturado como MVP funcional em Next.js e TypeScript, com dados locais no navegador para demonstrar os fluxos principais sem exigir banco de dados ou gateways reais. As integracoes de pagamento, validacao documental e notificacoes estao representadas por simulacoes de produto prontas para trocar por servicos externos.

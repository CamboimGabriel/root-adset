# Root ADSET — Competitive Draft & Root League

## 1. Competitive Draft

Código: `features/adset/competitive-draft.ts` (regras puras), `features/adset/draft.ts` (ADSET existente, estendido com `bannedIds`/`reservedIds`), `features/adset/use-adset-draft.ts` (estado da sessão).

### Ordem snake

`getSnakeOrder(players)` embaralha os jogadores uma vez e gera `ordem + ordem invertida`. Com 4 jogadores: `A B C D D C B A`. Funciona para qualquer quantidade suportada pelo sorteio.

### Ações

| Regra | Onde é validada |
|---|---|
| 2 ações por jogador, na ordem snake | `validateCompetitiveAction` (turno atual) |
| No máximo 1 FAVORITE por jogador | idem |
| Facção banida não pode ser banida nem favoritada | idem |
| Facção favoritada não pode ser banida nem favoritada de novo | idem |
| Banimento que torna impossível formar um ADSET válido é recusado com explicação | idem, usando as mesmas restrições de `createDraft` |

As ações ficam na sessão (`CompetitiveSession.actions`) e são persistidas pelo repositório de partidas já existente (`features/adset/match-repository.ts`), então atualizar a página não perde o draft.

### Resolução dos favoritos

1. Se houver até 2 favoritas distintas, todas entram.
2. Se houver N > 2, as favoritas são embaralhadas e as 2 primeiras são escolhidas. Cada uma tem probabilidade 2/N (3 → 66,7%, 4 → 50%).
3. As favoritas não selecionadas voltam ao conjunto normal e podem sair nas vagas aleatórias.
4. As selecionadas entram como `reservedIds` em `createDraft`, que completa o restante com o algoritmo original. As banidas entram como `bannedIds`.

**Por que qualquer par de favoritas é válido:** as restrições atuais do ADSET são ter a quantidade de jogadores + 1 facções jogáveis para aquela quantidade de jogadores e ter pelo menos uma militante, que não fica bloqueada. Só é possível favoritar facções jogáveis. Se uma favorita selecionada for militante, `createDraft` a usa como militante garantida; caso contrário, sorteia uma militante entre as restantes. A validação de banimentos impede que restem menos de quantidade de jogadores + 1 facções ou nenhuma militante, e favoritas nunca são banidas. Assim, nenhuma combinação de favoritas gera conflito, e nenhuma escolha é descartada silenciosamente. Se uma regra nova do ADSET criar incompatibilidade entre facções, o filtro deve ser feito em `resolveFavorites`.

O ADSET clássico chama `createDraft` sem restrições e se comporta exatamente como antes.

## 2. Root League — rating

Código: `features/league/rating.ts`, `features/league/recompute.ts`.

### Modelo

A liga usa **OpenSkill** (`openskill` v5, modelo **Plackett-Luce**). Não é Elo: o termo "Elo" aparece na interface só como nome amigável.

Cada jogador tem:

- `mu`: habilidade estimada (inicial 25);
- `sigma`: incerteza (inicial 25/3 ≈ 8,333).

### Conversão para a interface

| Valor | Fórmula | Inicial |
|---|---|---|
| Elo estimado | `1500 + (mu − 25) × 40` | 1500 |
| Incerteza exibida | `sigma × 40` | ±333 |
| Pontuação de ranking (conservadora) | `1500 + (mu − 3·sigma − 25) × 40` | 500 |

A tabela é ordenada pela pontuação conservadora: um Elo alto com poucas partidas, e portanto `sigma` alto, fica abaixo de um Elo alto confirmado. Jogar mais não dá bônus por si só; só reduz a incerteza. Ausência também não penaliza, já que `sigma` não aumenta com o tempo dentro de uma temporada.

**Provisório**: jogadores com menos de `minMatches` partidas no período (padrão 5, configurável por temporada) aparecem marcados e abaixo dos classificados.

### Como o resultado de Root é modelado

Root só define quem venceu. Cada jogador é um time de uma pessoa, e o rank vale:

- `1` para quem venceu;
- `2` para **todos** os derrotados.

O Plackett-Luce do OpenSkill trata ranks iguais como **empate**. Assim os derrotados não ganham ordem entre si, e não existe "2º lugar". Na prática:

- **Vencedor único**: o vencedor ganha contra todos, e os derrotados empatam entre si. As atualizações dos derrotados dependem apenas da força relativa de cada um.
- **Coalizão**: os dois (ou mais) vencedores recebem rank 1, e o OpenSkill os trata como empatados no topo. Eles não viram um time com habilidade somada, o que reflete que cada um conquistou a vitória dividida.
- **Dominância**: igual a vencedor único. O tipo de vitória fica registrado só como metadado.

Os pontos de vitória são opcionais e nunca entram no cálculo.

A força dos adversários influencia a atualização: vencer jogadores com `mu` alto rende mais, e perder para jogadores fracos custa mais. Isso é coberto por testes.

### Recalculo e histórico verificável

Nenhum rating é armazenado nem aceito do frontend. A partir das partidas persistidas, `computeLeague` sempre:

1. ordena as partidas por `data → createdAt → id` (determinístico);
2. reproduz todas as partidas do zero para o **histórico geral**;
3. para cada temporada, reproduz só as partidas daquela temporada a partir das sementes descritas abaixo.

Cada passo gera um `RatingHistoryEntry` (`before`/`after` de `mu` e `sigma` por jogador e partida). É isso que alimenta os gráficos e permite reproduzir o rating de qualquer jogador em qualquer ponto. Editar ou excluir uma partida antiga recalcula automaticamente todas as posteriores.

Mutações (jogadores, temporadas, partidas, importação) também ficam registradas no log de alterações (`audit`), visível só para administradores.

## 3. Temporadas

- Campos: nome, início, término, `minMatches` (padrão 5) e `carryOver` (padrão 0,75).
- O status (futura, ativa ou encerrada) é derivado das datas.
- O campeão é o 1º colocado **classificado** de uma temporada encerrada.
- Partidas com `seasonId = null` são **pré-temporada**: calibram o histórico geral, mas não contam em nenhum campeonato.

### Transição entre temporadas (regressão à média)

A semente de cada jogador numa temporada é o rating do histórico geral imediatamente antes da data de início, com regressão parcial:

```
mu'    = 25 + (mu − 25) × carryOver
sigma' = min(25/3, sqrt(sigma² + (25/3 × (1 − carryOver))²))
```

Com `carryOver = 0,75`, um jogador com Elo 1700 começa a temporada com 1650, e a incerteza aumenta um pouco. Assim, o conhecimento anterior é mantido sem engessar a temporada. Jogadores sem histórico começam em 1500. Com `carryOver = 1`, não há regressão; com `0`, todos reiniciam.

O histórico geral é permanente e nunca sofre regressão.

## 4. Importação histórica

Código: `features/league/import.ts`, `features/league/league-commands.ts#importMatches`.

1. Arquivo CSV (modelo para download no painel) ou JSON.
2. Prévia com erros por linha.
3. Mapeamento de nomes importados para jogadores existentes (sugestão automática por nome normalizado) ou criação de jogador novo.
4. Cada partida tem uma impressão digital `data|jogador:facção:V/D,...` (ordenada). Partidas já existentes ou repetidas no arquivo são marcadas como duplicadas e **não** são importadas. Importar o mesmo arquivo duas vezes não duplica nada.
5. Após confirmar, o histórico inteiro é recalculado cronologicamente.

As partidas importadas podem ser marcadas como pré-temporada para calibrar o rating sem contar no campeonato.

## 5. Persistência e segurança

- `features/shared/versioned-store.ts`: armazenamento versionado com compare-and-swap. Usa Upstash Redis (script Lua atômico) quando `KV_REST_API_URL`/`KV_REST_API_TOKEN` (ou `UPSTASH_REDIS_REST_*`) estão definidos e cai para memória em desenvolvimento e testes. É a mesma infraestrutura do sorteio.
- Todas as validações (`features/league/validators.ts`) rodam no servidor, nas rotas `app/api/league/**`.
- Escritas exigem sessão de administrador. A senha vem de `LEAGUE_ADMIN_PASSWORD`; em desenvolvimento local, sem a variável, a senha é `admin`. A sessão é um cookie `httpOnly` assinado com HMAC-SHA256, e a senha é comparada em tempo constante. Em produção, sem a variável, o login fica desativado.

## 6. Estatísticas das facções

`features/league/stats.ts#buildFactionStats` usa os identificadores do catálogo existente (`features/adset/factions.ts`) e separa facções oficiais e de fã. Se a partida registrar `factionVersion`, cada versão vira uma linha própria. Não existe "rating de facção": a página mostra partidas, vitórias, taxa de vitória, uso e distribuição por jogador, mapa e baralho, e sinaliza amostras com menos de 10 partidas.

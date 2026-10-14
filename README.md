# English OS

Aplicativo local-first para orientar 182 dias de estudo de inglês. A interface e o visual existente foram preservados; a segunda etapa acrescenta um plano diário detalhado, evidências de aprendizagem, biblioteca filtrável e arquitetura opcional de tutor. Stack: React, TypeScript, Vite, Supabase opcional.

## Rodar no macOS

Requer Node.js 20.19+ ou 22.12+.

```bash
npm install
npm test
npm run build
npm run dev
```

Abra o endereço local informado pelo Vite, normalmente `http://127.0.0.1:5173`. O servidor escuta no loopback. Use Ctrl+C no terminal para pará-lo. O workflow de Pages está preparado, mas só começa a publicar depois que este projeto for enviado à branch `main` de um repositório remoto.

O modo local mantém `base: /`, e a versão GitHub Pages usa `/english-os/` somente no workflow de publicação. O app pode ser favoritado como qualquer site. O manifest e service worker também permitem instalação/abertura pelo navegador compatível e cache do shell; o progresso continua salvo por origem e perfil do navegador.

`npm run seed` valida o plano/catálogo, confere a contagem e a sequência e regenera o seed SQL idempotente. Ele não acessa nem altera uma conta Supabase.

## Currículo, Udemy e calendário

- O arquivo `english_os_182_dias.json` fornece 182 datas, 26 semanas e 728 blocos originais. O app cria um guia de oito etapas por dia: fila Udemy, Input, conversação, revisão, escrita, vocabulário, teste objetivo e inglês para startups. Metas configuráveis vão de 30 a 180 minutos nos dias completos; o dia de descanso ativo mantém limite de até 45 minutos.
- `english_os_udemy_catalogo_545.json` contém 545 aulas sequenciais e 24 testes. Títulos, números, duração e status da origem são carregados no armazenamento inicial. Reimportar o mesmo JSON não cria duplicatas nem apaga o status local.
- O catálogo não tem nomes de seção, IDs internos ou links individuais das aulas. O app não inventa esses metadados nem sincroniza com a Udemy. A aula abre a página geral do curso. Cada dia recomenda a próxima sequência incompleta; aulas anteriores nunca são puladas por atraso.
- O status importado fica preservado separado da marcação local. Aulas/testes concluídos não são automaticamente considerados dominados; testes objetivos, respostas e avaliações são registrados à parte.
- Itens atrasados continuam associados ao dia original e podem ser retomados. Reagendar muda a data planejada, não o número, tema ou histórico do dia.

## Input, revisão e conversação

Input usa lições com título e página individual de fontes oficiais VOA Learning English e British Council LearnEnglish, filtráveis por nível, habilidade e tema. O app registra separadamente “assisti”, “compreendi” e “preciso repetir”. Tempos de fonte não informados não são apresentados como duração conhecida.

Os roteiros de conversação progridem de A0 até cenários de startup e negociação. O ChatGPT Voice gratuito é uma alternativa manual; o aplicativo copia um roteiro quando você pede. Gravação de microfone é opcional, permanece apenas na memória da página e é descartada ao recarregar.

Testes rápidos guardam acertos, erros e explicações por habilidade. Evidência baixa sugere revisão D+1; a estimativa de nível só avança depois de três datas diferentes com pelo menos 80% de acerto. O painel explica que resultados não são certificação e não mede pronúncia espontânea. Avaliações mensais e diagnóstico inicial ficam no histórico.

## Dados, backup e privacidade

No modo local, o progresso fica no IndexedDB do navegador com fallback em localStorage. Exportar backup baixa um JSON versionado; importar valida o arquivo e combina histórico/catalogo sem remover registros locais mais recentes. O backup é necessário para transferir dados entre `127.0.0.1`, GitHub Pages, Safari e Chrome: os navegadores e origens mantêm armazenamento separado. Salve o arquivo em local seguro e importe-o na outra origem. O usuário controla o backup e a sincronização. O app não envia áudio.

AI Tutor textual não responde sem configuração: mensagens e transcrições ficam locais e só são enviadas após clicar em Enviar, quando o endpoint protegido e login Supabase estiverem configurados. A função preparada exige JWT, limita cada conta a 20 requisições por dia, restringe tamanho do histórico e guarda a chave do provedor somente nos secrets do backend. Uma chave de provedor pode gerar cobrança na conta que você escolher. A alternativa por ChatGPT Voice não depende desta integração.

## Supabase opcional

O app funciona localmente sem Supabase. Para sincronizar os snapshots de estudo:

1. Crie seu projeto e habilite login por link de email em Authentication.
2. Na configuração de URLs de autenticação, inclua `http://127.0.0.1:5173` e `http://localhost:5173` (e a porta local efetivamente usada, se o Vite escolher outra).
3. Copie **Project URL** e a chave **anon/public** para um `.env` local baseado em `.env.example`:

   ```dotenv
   VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co
   VITE_SUPABASE_ANON_KEY=sua-chave-anon-publica
   ```

4. Nunca ponha senha do banco, `service_role` ou chave de provedor em variável `VITE_`. A chave anon é pública; RLS é que protege dados por usuário.
5. Confira o histórico remoto e migrations pendentes antes de qualquer aplicação. Em projeto local, com Docker Desktop iniciado, `supabase start` inicia um banco de desenvolvimento; `supabase db reset` apaga e recria esse banco local. Em projeto existente, revise o diff das migrations `001_init.sql` e `002_ai_tutor_usage_limits.sql`, confira `supabase migration list` e faça backup antes de decidir por `supabase db push`. O English OS não executou migrations remotas nesta etapa.
6. Reinicie `npm run dev`, solicite o link de login nas Configurações e, depois de autenticado, use “Sincronizar agora”. O fluxo em produção sincroniza um snapshot `user_state` protegido por `auth.uid()`; as tabelas relacionais existem, mas não são populadas pelo fluxo atual.

### Ativar o tutor textual (opcional)

É necessário Supabase Functions e um provedor compatível; o app não oferece serviço de IA próprio e não simula respostas. Após revisar/aplicar a migration `002_ai_tutor_usage_limits.sql` na instância desejada, publique com `supabase functions deploy english-tutor`. Cadastre `AI_PROVIDER_API_KEY` e, se necessário, `AI_PROVIDER_URL`, `AI_MODEL` e `APP_ORIGINS` pelo gerenciador de secrets do Supabase; não passe segredos por argumentos de terminal nem arquivos `.env` do frontend. Depois, preencha `VITE_AI_TUTOR_URL` com a URL da Edge Function no `.env`, reinicie o Vite e entre via magic link. A função exige JWT válido, aplica limite de uso por usuário e aceita histórico limitado. Nunca compartilhe esse endpoint sem compreender a cobrança e as políticas de acesso do seu projeto.

O `supabase/config.toml` habilita a verificação JWT da função. As políticas RLS das tabelas pessoais continuam limitadas ao próprio usuário. As migrations SQL são aditivas; não apague nem substitua o esquema existente. Para exercitar RLS de verdade, inicie o banco Supabase local e rode `supabase test db`; os testes da aplicação não substituem esse teste no PostgreSQL.

## Verificação

```bash
npm test
npm run seed
npm run build
GITHUB_PAGES=true npm run build
npm run verify:pages
```

Os testes cobrem calendário, geração das 182 rotinas, faixas de tempo, atrasos e retomada, questões objetivas e evidência espaçada, links/domínios curados, persistência/backup, importação Udemy repetida, interface de Input, diagnóstico, avaliação mensal, cliente tutor e guardas de configuração RLS. O teste real de RLS requer PostgreSQL/Supabase local; isso e a conectividade da sua conta não são afirmados como validados.

## Publicação gratuita no GitHub Pages

O workflow `.github/workflows/pages.yml` roda testes e build com `base: /english-os/`, valida o artefato e publica automaticamente quando há push na branch `main` (ou acionamento manual em Actions). O build local continua em `/`, sem alterar `npm run dev` ou `npm run preview`. A página 404 repassa rotas como `/english-os/hoje` para o React Router; manifest, ícone, assets e service worker usam caminhos relativos ao projeto.

Para habilitar: crie um repositório GitHub chamado **english-os**, coloque este projeto na branch `main` e envie o código. Em **Settings → Pages → Build and deployment**, escolha **GitHub Actions** como fonte. O primeiro workflow publica após passar nos testes. O endereço esperado será `https://SEU-USUARIO.github.io/english-os/`. Este diretório ainda precisa estar ligado a um repositório GitHub e receber o primeiro push; nenhuma conta remota ou publicação foi acionada nesta preparação.

O catálogo de 545 aulas e os 24 testes é incluído no build público junto com o currículo, portanto qualquer pessoa com acesso ao repositório/site pode ler esses metadados. Progresso individual não é incluído no build nem transmitido: continua no IndexedDB daquele navegador. Antes de sair de `localhost`, exporte o backup e importe-o na URL Pages. GitHub Pages não disponibiliza `.env` durante a navegação; a versão pública fica local-first sem Supabase e sem IA paga. Para recursos remotos opcionais, configure URL/chave anon pública como variáveis de build do workflow e mantenha chaves secretas somente em um backend. Sempre aplique RLS no Supabase.

## Limites atuais

- Sem API autorizada da Udemy: catálogo importado é estático e atualiza somente se você importar outro arquivo.
- Sem metadados individuais no catálogo: não há IDs/seções/links aula a aula.
- Sem Supabase conectado nesta pasta (`.env` ausente); login, sincronização e function endpoint dependem de configuração da sua conta.
- O tutor de IA não funcionará até você configurar e publicar uma Edge Function e um provedor. Serviços externos podem cobrar.
- Nenhum repositório remoto foi conectado ou deploy de produção foi feito; o workflow está preparado, mas depende do primeiro push e da opção Pages → GitHub Actions.

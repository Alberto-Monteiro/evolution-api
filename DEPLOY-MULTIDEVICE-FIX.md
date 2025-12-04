# 🚀 Evolution API - Multi-Device Fix

## 📋 Resumo da Alteração

**Problema:** A Evolution API estava caindo/desconectando quando o WhatsApp Android estava ativo, porque se identificava como "WebClient" (WhatsApp Web), ocupando o slot de sessão web.

**Solução:** Remover a identificação de browser para usar o modo Multi-Device nativo do Baileys 7.x, que não conflita com outras sessões.

---

## 🔧 Alteração no Código

### Arquivo: `src/api/integrations/channel/whatsapp/whatsapp.baileys.service.ts`

**ANTES (WebClient - CAI):**
```typescript
const session = this.configService.get<ConfigSessionPhone>('CONFIG_SESSION_PHONE');

let browserOptions = {};

if (number || this.phoneNumber) {
  this.phoneNumber = number;
  this.logger.info(`Phone number: ${number}`);
} else {
  const browser: WABrowserDescription = [session.CLIENT, session.NAME, release()];
  browserOptions = { browser };
  this.logger.info(`Browser: ${browser}`);
}

// ... no socketConfig:
...browserOptions,
```

**DEPOIS (Multi-Device nativo - NÃO CAI):**
```typescript
if (number || this.phoneNumber) {
  this.phoneNumber = number;
  this.logger.info(`Phone number: ${number}`);
}

// Multi-Device mode: não definimos browser para evitar ser tratado como WebClient
// Isso faz o Baileys usar o modo MD nativo, que não conflita com outras sessões
this.logger.info('Using Multi-Device native mode (no browser identification)');

// ... no socketConfig:
// Removido browserOptions para usar Multi-Device nativo (não WebClient)
```

### Imports removidos:
- `ConfigSessionPhone` do `@config/env.config`
- `WABrowserDescription` do `baileys`
- `release` do `os`

---

## 📦 Repositório Fork

**URL:** https://github.com/joinads/evolution-api

**Commit:** `5dbf3e93` - "fix: usar Multi-Device nativo para evitar desconexões"

---

## 🐳 Deploy na VPS com Docker Compose

### Pré-requisitos
- Docker e Docker Compose instalados
- Acesso SSH à VPS
- Volumes existentes com dados (PostgreSQL, Redis, Instances)

### Volumes Utilizados (externos)
```
evolution-clean_evolution_instances  # Dados das instâncias WhatsApp
evolution-clean_evolution_redis      # Cache Redis
evolution-clean_postgres_data        # Banco de dados PostgreSQL
```

---

## 📝 Comandos de Deploy

### 1. Clone o repositório
```bash
cd ~
git clone https://github.com/joinads/evolution-api.git evolution-api-custom
cd evolution-api-custom
```

### 2. Copie o .env existente
```bash
cp ~/evolution-clean/.env .
```

### 3. Crie o docker-compose.prod.yaml
```bash
cat > docker-compose.prod.yaml << 'EOF'
services:
  api:
    container_name: evolution_api
    build:
      context: .
      dockerfile: Dockerfile
    image: evolution-api:v2.3.4-multidevice
    restart: always
    depends_on:
      - redis
      - postgres
    ports:
      - 8080:8080
    volumes:
      - evolution-clean_evolution_instances:/evolution/instances
    networks:
      - evolution-net
    env_file:
      - .env
    expose:
      - 8080

  redis:
    image: redis:latest
    networks:
      - evolution-net
    container_name: redis
    command: >
      redis-server --port 6379 --appendonly yes
    volumes:
      - evolution-clean_evolution_redis:/data
    ports:
      - 6379:6379

  postgres:
    container_name: postgres
    image: postgres:15
    networks:
      - evolution-net
    command: ["postgres", "-c", "max_connections=1000", "-c", "listen_addresses=*"]
    restart: always
    ports:
      - 5432:5432
    environment:
      - POSTGRES_USER=caio
      - POSTGRES_PASSWORD=caio123
      - POSTGRES_DB=evolution
      - POSTGRES_HOST_AUTH_METHOD=trust
    volumes:
      - evolution-clean_postgres_data:/var/lib/postgresql/data
    expose:
      - 5432

volumes:
  evolution-clean_evolution_instances:
    external: true
  evolution-clean_evolution_redis:
    external: true
  evolution-clean_postgres_data:
    external: true

networks:
  evolution-net:
    name: evolution-net
    driver: bridge
EOF
```

### 4. Pare a Evolution antiga (se estiver rodando)
```bash
cd ~/evolution-clean
docker-compose down
```

### 5. Build da nova imagem
```bash
cd ~/evolution-api-custom
docker-compose -f docker-compose.prod.yaml build --no-cache
```

### 6. Suba os containers
```bash
docker-compose -f docker-compose.prod.yaml up -d
```

### 7. Verifique os logs
```bash
docker-compose -f docker-compose.prod.yaml logs -f api
```

---

## 🔄 Comandos Úteis

### Ver status dos containers
```bash
docker-compose -f docker-compose.prod.yaml ps
```

### Reiniciar a API
```bash
docker-compose -f docker-compose.prod.yaml restart api
```

### Ver logs em tempo real
```bash
docker-compose -f docker-compose.prod.yaml logs -f api
```

### Parar todos os containers
```bash
docker-compose -f docker-compose.prod.yaml down
```

### Rebuild após alterações no código
```bash
git pull origin main
docker-compose -f docker-compose.prod.yaml build --no-cache
docker-compose -f docker-compose.prod.yaml up -d
```

---

## 🔍 Verificar se o Fix está Funcionando

Nos logs da API, você deve ver:
```
Using Multi-Device native mode (no browser identification)
```

**NÃO deve mais aparecer:**
```
Browser: ['Evolution API', 'Chrome', ...]
```

---

## ⚠️ Notas Importantes

1. **Instâncias existentes:** Continuam funcionando normalmente. As credenciais salvas não dependem do parâmetro `browser`.

2. **Novas conexões:** Usarão o modo Multi-Device nativo automaticamente.

3. **Se uma sessão expirar:** Ao reconectar via QR Code, já usará o novo modo.

4. **Volumes externos:** O docker-compose usa `external: true` para apontar para os volumes existentes, preservando todos os dados.

---

## 📊 Comparação: Antes vs Depois

| Aspecto | Antes (v2.3.4 oficial) | Depois (com fix) |
|---------|------------------------|------------------|
| Identificação | `['Evolution API', 'Chrome', OS]` | Nenhuma (MD nativo) |
| Tipo de sessão | WebClient | Multi-Device |
| Aparece como | "WhatsApp Web" | Dispositivo vinculado |
| Conflita com Android | ✅ SIM | ❌ NÃO |
| Cai quando Android ativo | ✅ SIM | ❌ NÃO |

---

## 🆘 Rollback (Voltar para versão oficial)

Se precisar voltar para a versão oficial:

```bash
cd ~/evolution-api-custom
docker-compose -f docker-compose.prod.yaml down

cd ~/evolution-clean
docker-compose up -d
```

---

## 📅 Data da Alteração
**04 de Dezembro de 2025**

## 👤 Autor
Alteração realizada com auxílio de IA (Claude/Cursor)

## 🔗 Links
- Fork: https://github.com/joinads/evolution-api
- Original: https://github.com/EvolutionAPI/evolution-api
- Baileys: https://github.com/WhiskeySockets/Baileys


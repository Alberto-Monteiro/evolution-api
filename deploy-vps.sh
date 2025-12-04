#!/bin/bash

# ===========================================
# SCRIPT DE DEPLOY - Evolution API Multi-Device
# ===========================================

set -e

echo "🚀 Iniciando deploy da Evolution API com Multi-Device fix..."

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Verificar se está no diretório correto
if [ ! -f "docker-compose.prod.yaml" ]; then
    echo -e "${RED}❌ Erro: Execute este script no diretório da Evolution API${NC}"
    exit 1
fi

# Backup do docker-compose atual (se existir)
if [ -f "docker-compose.yaml" ]; then
    echo -e "${YELLOW}📦 Fazendo backup do docker-compose.yaml atual...${NC}"
    cp docker-compose.yaml docker-compose.yaml.backup.$(date +%Y%m%d_%H%M%S)
fi

# Parar containers existentes (mantém volumes)
echo -e "${YELLOW}⏹️  Parando containers existentes...${NC}"
docker compose -f docker-compose.prod.yaml down 2>/dev/null || docker-compose -f docker-compose.prod.yaml down 2>/dev/null || true

# Build da nova imagem
echo -e "${YELLOW}🔨 Buildando imagem com Multi-Device fix...${NC}"
docker compose -f docker-compose.prod.yaml build --no-cache api

# Subir containers
echo -e "${YELLOW}🚀 Iniciando containers...${NC}"
docker compose -f docker-compose.prod.yaml up -d

# Aguardar API iniciar
echo -e "${YELLOW}⏳ Aguardando API iniciar...${NC}"
sleep 10

# Verificar status
echo -e "${GREEN}✅ Deploy concluído!${NC}"
echo ""
echo "📊 Status dos containers:"
docker compose -f docker-compose.prod.yaml ps

echo ""
echo "📋 Últimos logs da API:"
docker compose -f docker-compose.prod.yaml logs api --tail 20

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}🎉 Evolution API Multi-Device está rodando!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "🔗 Acesse: http://SEU_IP:8080"
echo "📚 Docs: http://SEU_IP:8080/docs"
echo "🖥️  Manager: http://SEU_IP:8080/manager"
echo ""
echo "💡 Para ver logs em tempo real:"
echo "   docker compose -f docker-compose.prod.yaml logs -f api"


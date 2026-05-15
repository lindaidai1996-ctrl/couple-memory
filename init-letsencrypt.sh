#!/bin/bash
# 首次申请 Let's Encrypt SSL 证书
# 用法: 在 ECS 的 /opt/couple-memory/ 目录下执行
#   chmod +x init-letsencrypt.sh
#   ./init-letsencrypt.sh

DOMAIN=qinglv.life
EMAIL=13979318939@163.com  # ← 改成你的邮箱

echo ">>> 创建临时自签名证书（让 nginx 能先启动）..."
mkdir -p ./certbot/conf/live/$DOMAIN
openssl req -x509 -nodes -newkey rsa:2048 -days 1 \
  -keyout ./certbot/conf/live/$DOMAIN/privkey.pem \
  -out ./certbot/conf/live/$DOMAIN/fullchain.pem \
  -subj "/CN=$DOMAIN" 2>/dev/null

echo ">>> 启动 nginx..."
docker compose -f docker-compose.prod.yml up -d nginx

echo ">>> 删除临时证书..."
rm -rf ./certbot/conf/live/$DOMAIN

echo ">>> 申请 Let's Encrypt 真实证书..."
docker compose -f docker-compose.prod.yml run --rm --entrypoint "" certbot \
  certbot certonly --webroot -w /var/www/certbot \
  -d $DOMAIN -d www.$DOMAIN \
  --email $EMAIL --agree-tos --no-eff-email

echo ">>> 重新加载 nginx..."
docker compose -f docker-compose.prod.yml exec nginx nginx -s reload

echo ">>> 完成！HTTPS 已启用。"

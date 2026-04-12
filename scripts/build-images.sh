#!/bin/bash
# Bouw en tag alle Docker images voor gebruik in Docker Swarm
# Gebruik: ./scripts/build-images.sh [tag]
# Voorbeeld: ./scripts/build-images.sh latest
#            ./scripts/build-images.sh v1.2.0

TAG=${1:-latest}
SERVICES=(auth register target score mail clock read)

echo "Bouwen van images met tag: $TAG"

for svc in "${SERVICES[@]}"; do
  echo ">>> Bouwen: photoprestiges/$svc:$TAG"
  docker build -t "photoprestiges/$svc:$TAG" "./services/$svc"
  if [ $? -ne 0 ]; then
    echo "FOUT: Build mislukt voor $svc"
    exit 1
  fi
done

echo ""
echo "Alle images gebouwd:"
for svc in "${SERVICES[@]}"; do
  docker images "photoprestiges/$svc" --format "  {{.Repository}}:{{.Tag}} ({{.Size}})"
done

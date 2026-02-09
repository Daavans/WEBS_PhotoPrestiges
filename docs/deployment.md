# Deployment Guide - Photo Prestiges

## Overzicht

Dit document beschrijft hoe je Photo Prestiges kunt deployen naar verschillende cloud platforms.

## Vereisten

### Development
- Node.js 18+ of Python 3.9+
- Docker & Docker Compose
- Git
- PostgreSQL 15+
- Redis 7+

### Production
- Cloud provider account (AWS/GCP/Azure)
- Domain naam
- SSL certificaat (Let's Encrypt)
- API keys (Imagga, Google Vision, SendGrid)

## Local Development

### 1. Clone Repository
```bash
git clone https://github.com/Daavans/WEBS_PhotoPrestiges.git
cd WEBS_PhotoPrestiges
```

### 2. Configuratie
```bash
cp .env.example .env
# Edit .env with your configuration
```

### 3. Start Services met Docker Compose
```bash
docker-compose up -d
```

### 4. Verify Services
```bash
# Check all services are running
docker-compose ps

# Check logs
docker-compose logs -f

# Test Auth Service
curl http://localhost:3001/api/auth/status

# Test Read Service
curl http://localhost:3007/api/read/stats
```

### 5. Stop Services
```bash
docker-compose down
```

## Database Setup

### Initial Schema
```bash
# Connect to PostgreSQL
psql -h localhost -U photouser -d photoprestiges

# Run schema creation scripts
# (Create tables for each service)
```

### Migrations
```bash
# Run migrations for each service
cd services/auth && npm run migrate
cd services/register && npm run migrate
# etc.
```

## Cloud Deployment

## AWS Deployment

### Architecture op AWS
```
Route 53 (DNS)
    ↓
CloudFront (CDN)
    ↓
Application Load Balancer
    ↓
ECS Fargate (Services)
    ↓
RDS PostgreSQL + ElastiCache Redis
    ↓
S3 (Photo Storage)
```

### 1. Setup AWS Resources

#### RDS PostgreSQL
```bash
aws rds create-db-instance \
  --db-instance-identifier photoprestiges-db \
  --db-instance-class db.t3.medium \
  --engine postgres \
  --engine-version 15.3 \
  --master-username photouser \
  --master-user-password <password> \
  --allocated-storage 20 \
  --backup-retention-period 7 \
  --multi-az
```

#### ElastiCache Redis
```bash
aws elasticache create-cache-cluster \
  --cache-cluster-id photoprestiges-redis \
  --cache-node-type cache.t3.micro \
  --engine redis \
  --num-cache-nodes 1
```

#### S3 Bucket
```bash
aws s3 mb s3://photoprestiges-photos
aws s3 website s3://photoprestiges-photos --index-document index.html

# Setup CORS
aws s3api put-bucket-cors --bucket photoprestiges-photos --cors-configuration file://cors.json
```

#### ECR Repositories
```bash
# Create repository for each service
aws ecr create-repository --repository-name photoprestiges/auth-service
aws ecr create-repository --repository-name photoprestiges/register-service
aws ecr create-repository --repository-name photoprestiges/target-service
aws ecr create-repository --repository-name photoprestiges/score-service
aws ecr create-repository --repository-name photoprestiges/mail-service
aws ecr create-repository --repository-name photoprestiges/clock-service
aws ecr create-repository --repository-name photoprestiges/read-service
```

### 2. Build & Push Docker Images
```bash
# Login to ECR
aws ecr get-login-password --region eu-west-1 | docker login --username AWS --password-stdin <account-id>.dkr.ecr.eu-west-1.amazonaws.com

# Build and push each service
cd services/auth
docker build -t photoprestiges/auth-service .
docker tag photoprestiges/auth-service:latest <account-id>.dkr.ecr.eu-west-1.amazonaws.com/photoprestiges/auth-service:latest
docker push <account-id>.dkr.ecr.eu-west-1.amazonaws.com/photoprestiges/auth-service:latest

# Repeat for all services
```

### 3. Deploy to ECS Fargate
```bash
# Create ECS cluster
aws ecs create-cluster --cluster-name photoprestiges-cluster

# Create task definitions for each service
aws ecs register-task-definition --cli-input-json file://task-definitions/auth-service.json

# Create services
aws ecs create-service \
  --cluster photoprestiges-cluster \
  --service-name auth-service \
  --task-definition auth-service \
  --desired-count 2 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-xxx],securityGroups=[sg-xxx],assignPublicIp=ENABLED}"
```

### 4. Setup Application Load Balancer
```bash
# Create ALB
aws elbv2 create-load-balancer \
  --name photoprestiges-alb \
  --subnets subnet-xxx subnet-yyy \
  --security-groups sg-xxx

# Create target groups for each service
aws elbv2 create-target-group \
  --name auth-service-tg \
  --protocol HTTP \
  --port 3001 \
  --vpc-id vpc-xxx \
  --health-check-path /health

# Create listener rules
```

## Google Cloud Platform Deployment

### Architecture op GCP
```
Cloud DNS
    ↓
Cloud CDN
    ↓
Cloud Load Balancer
    ↓
Cloud Run (Services)
    ↓
Cloud SQL PostgreSQL + Memorystore Redis
    ↓
Cloud Storage (Photo Storage)
```

### 1. Setup GCP Resources

#### Cloud SQL
```bash
gcloud sql instances create photoprestiges-db \
  --database-version=POSTGRES_15 \
  --tier=db-g1-small \
  --region=europe-west1 \
  --backup
```

#### Memorystore Redis
```bash
gcloud redis instances create photoprestiges-redis \
  --size=1 \
  --region=europe-west1 \
  --tier=basic
```

#### Cloud Storage
```bash
gsutil mb -l europe-west1 gs://photoprestiges-photos
gsutil iam ch allUsers:objectViewer gs://photoprestiges-photos
```

### 2. Deploy to Cloud Run
```bash
# Build and deploy each service
gcloud builds submit --tag gcr.io/PROJECT_ID/auth-service services/auth
gcloud run deploy auth-service \
  --image gcr.io/PROJECT_ID/auth-service \
  --platform managed \
  --region europe-west1 \
  --allow-unauthenticated
```

## Azure Deployment

### Architecture op Azure
```
Azure DNS
    ↓
Azure CDN
    ↓
Azure Application Gateway
    ↓
Azure Container Instances
    ↓
Azure Database for PostgreSQL + Azure Cache for Redis
    ↓
Azure Blob Storage
```

### Setup via Azure Portal of CLI
Similar to AWS/GCP but using Azure services.

## Kubernetes Deployment

### 1. Create Kubernetes Manifests
```yaml
# deployment.yaml for each service
apiVersion: apps/v1
kind: Deployment
metadata:
  name: auth-service
spec:
  replicas: 2
  selector:
    matchLabels:
      app: auth-service
  template:
    metadata:
      labels:
        app: auth-service
    spec:
      containers:
      - name: auth-service
        image: photoprestiges/auth-service:latest
        ports:
        - containerPort: 3001
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: db-credentials
              key: url
```

### 2. Deploy to Kubernetes
```bash
# Apply configurations
kubectl apply -f k8s/

# Check deployments
kubectl get deployments
kubectl get pods
kubectl get services

# Check logs
kubectl logs -f deployment/auth-service
```

## Environment Variables

### Secrets Management

#### AWS Secrets Manager
```bash
aws secretsmanager create-secret \
  --name photoprestiges/database \
  --secret-string '{"url":"postgresql://..."}'
```

#### GCP Secret Manager
```bash
echo -n "postgresql://..." | gcloud secrets create database-url --data-file=-
```

#### Kubernetes Secrets
```bash
kubectl create secret generic db-credentials \
  --from-literal=url='postgresql://...'
```

## Monitoring Setup

### AWS CloudWatch
```bash
# Enable container insights
aws ecs update-cluster-settings \
  --cluster photoprestiges-cluster \
  --settings name=containerInsights,value=enabled
```

### GCP Cloud Monitoring
```bash
# Automatically enabled for Cloud Run
# View metrics in Cloud Console
```

### Prometheus + Grafana (Kubernetes)
```bash
# Install using Helm
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm install prometheus prometheus-community/kube-prometheus-stack
```

## SSL/TLS Setup

### Let's Encrypt (Certbot)
```bash
sudo certbot --nginx -d photoprestiges.com -d www.photoprestiges.com
```

### AWS Certificate Manager
```bash
aws acm request-certificate \
  --domain-name photoprestiges.com \
  --validation-method DNS
```

### GCP Managed SSL
Automatically handled by Cloud Load Balancer.

## CI/CD Pipeline

### GitHub Actions Example
```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Build Docker Images
        run: |
          docker build -t auth-service services/auth
          
      - name: Push to Registry
        run: |
          docker push registry/auth-service:latest
          
      - name: Deploy to Cloud
        run: |
          # Deploy commands
```

## Health Checks

### Endpoint per Service
```javascript
// health.js
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'auth-service',
    timestamp: new Date().toISOString()
  });
});
```

### Load Balancer Health Checks
Configure health check endpoints in load balancer:
- Path: `/health`
- Interval: 30 seconds
- Timeout: 5 seconds
- Healthy threshold: 2
- Unhealthy threshold: 3

## Rollback Strategie

### Blue-Green Deployment
1. Deploy new version (green)
2. Test green environment
3. Switch traffic from blue to green
4. Monitor for issues
5. Rollback to blue if needed

### Rolling Update
```bash
# Kubernetes
kubectl rollout undo deployment/auth-service

# ECS
aws ecs update-service --cluster photoprestiges-cluster --service auth-service --force-new-deployment
```

## Troubleshooting

### Common Issues

#### Service Can't Connect to Database
- Check security groups/firewall rules
- Verify DATABASE_URL is correct
- Ensure database is running

#### High Latency
- Check database query performance
- Verify cache is working (Redis)
- Check network latency between services

#### Out of Memory
- Increase container memory limits
- Check for memory leaks
- Optimize queries and caching

### Debug Commands
```bash
# Check service logs
docker-compose logs -f service-name

# Check service status
curl http://localhost:3001/health

# Check database connection
psql -h localhost -U photouser -d photoprestiges -c "SELECT 1;"

# Check Redis connection
redis-cli ping
```

## Performance Tuning

### Database Optimization
- Add indexes on frequently queried columns
- Use connection pooling
- Enable query caching
- Regular VACUUM and ANALYZE

### Caching Strategy
- Cache frequently accessed data
- Set appropriate TTL values
- Use cache warming for critical data
- Monitor cache hit ratio

### Load Balancing
- Use round-robin or least-connection
- Enable sticky sessions if needed
- Configure health checks
- Set connection timeouts

## Security Hardening

### Network Security
- Use VPC/Virtual Network
- Private subnets for databases
- Security groups/firewall rules
- No direct internet access to databases

### Application Security
- Use HTTPS only
- Implement rate limiting
- Input validation
- SQL injection prevention
- XSS protection

### Secrets Management
- Never commit secrets to code
- Use cloud secret managers
- Rotate credentials regularly
- Principle of least privilege

## Backup & Restore

### Automated Backups
```bash
# AWS RDS (automated)
aws rds modify-db-instance \
  --db-instance-identifier photoprestiges-db \
  --backup-retention-period 7

# Manual backup
pg_dump -h localhost -U photouser photoprestiges > backup.sql
```

### Restore from Backup
```bash
psql -h localhost -U photouser photoprestiges < backup.sql
```

## Scaling Guidelines

### When to Scale

**Scale Up (Vertical):**
- CPU constantly > 70%
- Memory constantly > 80%
- Database connections maxed out

**Scale Out (Horizontal):**
- Request queue growing
- Response time increasing
- High traffic periods

### Auto-Scaling Configuration
```yaml
# AWS ECS Auto Scaling
resource "aws_appautoscaling_target" "ecs_target" {
  max_capacity       = 10
  min_capacity       = 2
  resource_id        = "service/photoprestiges-cluster/auth-service"
  scalable_dimension = "ecs:service:DesiredCount"
  service_namespace  = "ecs"
}
```

## Cost Monitoring

### Set Budget Alerts
- Monitor monthly spend
- Alert at 50%, 80%, 100% of budget
- Review resource utilization
- Optimize unused resources

### Cost Optimization Tips
- Use reserved instances for baseline
- Auto-scale to match demand
- Archive old data
- Use appropriate instance sizes
- Enable S3 intelligent tiering

## Conclusie

Deze deployment guide biedt verschillende opties voor het deployen van Photo Prestiges naar production. Kies de methode die het beste past bij je behoeften en expertise. Voor beginners is Docker Compose voldoende voor development en kleine deployments. Voor production wordt een managed cloud platform (AWS/GCP/Azure) aanbevolen.
# Deployment Guide - Photo Prestiges

## Overzicht

Dit document beschrijft hoe je Photo Prestiges kunt deployen naar verschillende cloud platforms.

## Vereisten

### Development
- Node.js 18+ of Python 3.9+
- Docker & Docker Compose
- Git
- PostgreSQL 15+
- Redis 7+

### Production
- Cloud provider account (AWS/GCP/Azure)
- Domain naam
- SSL certificaat (Let's Encrypt)
- API keys (Imagga, Google Vision, SendGrid)

## Local Development

### 1. Clone Repository
```bash
git clone https://github.com/Daavans/WEBS_PhotoPrestiges.git
cd WEBS_PhotoPrestiges
```

### 2. Configuratie
```bash
cp .env.example .env
# Edit .env with your configuration
```

### 3. Start Services met Docker Compose
```bash
docker-compose up -d
```

### 4. Verify Services
```bash
# Check all services are running
docker-compose ps

# Check logs
docker-compose logs -f

# Test Auth Service
curl http://localhost:3001/api/auth/status

# Test Read Service
curl http://localhost:3007/api/read/stats
```

### 5. Stop Services
```bash
docker-compose down
```

## Database Setup

### Initial Schema
```bash
# Connect to PostgreSQL
psql -h localhost -U photouser -d photoprestiges

# Run schema creation scripts
# (Create tables for each service)
```

### Migrations
```bash
# Run migrations for each service
cd services/auth && npm run migrate
cd services/register && npm run migrate
# etc.
```

## Cloud Deployment

## AWS Deployment

### Architecture op AWS
```
Route 53 (DNS)
    ↓
CloudFront (CDN)
    ↓
Application Load Balancer
    ↓
ECS Fargate (Services)
    ↓
RDS PostgreSQL + ElastiCache Redis
    ↓
S3 (Photo Storage)
```

### 1. Setup AWS Resources

#### RDS PostgreSQL
```bash
aws rds create-db-instance \
  --db-instance-identifier photoprestiges-db \
  --db-instance-class db.t3.medium \
  --engine postgres \
  --engine-version 15.3 \
  --master-username photouser \
  --master-user-password <password> \
  --allocated-storage 20 \
  --backup-retention-period 7 \
  --multi-az
```

#### ElastiCache Redis
```bash
aws elasticache create-cache-cluster \
  --cache-cluster-id photoprestiges-redis \
  --cache-node-type cache.t3.micro \
  --engine redis \
  --num-cache-nodes 1
```

#### S3 Bucket
```bash
aws s3 mb s3://photoprestiges-photos
aws s3 website s3://photoprestiges-photos --index-document index.html

# Setup CORS
aws s3api put-bucket-cors --bucket photoprestiges-photos --cors-configuration file://cors.json
```

#### ECR Repositories
```bash
# Create repository for each service
aws ecr create-repository --repository-name photoprestiges/auth-service
aws ecr create-repository --repository-name photoprestiges/register-service
aws ecr create-repository --repository-name photoprestiges/target-service
aws ecr create-repository --repository-name photoprestiges/score-service
aws ecr create-repository --repository-name photoprestiges/mail-service
aws ecr create-repository --repository-name photoprestiges/clock-service
aws ecr create-repository --repository-name photoprestiges/read-service
```

### 2. Build & Push Docker Images
```bash
# Login to ECR
aws ecr get-login-password --region eu-west-1 | docker login --username AWS --password-stdin <account-id>.dkr.ecr.eu-west-1.amazonaws.com

# Build and push each service
cd services/auth
docker build -t photoprestiges/auth-service .
docker tag photoprestiges/auth-service:latest <account-id>.dkr.ecr.eu-west-1.amazonaws.com/photoprestiges/auth-service:latest
docker push <account-id>.dkr.ecr.eu-west-1.amazonaws.com/photoprestiges/auth-service:latest

# Repeat for all services
```

### 3. Deploy to ECS Fargate
```bash
# Create ECS cluster
aws ecs create-cluster --cluster-name photoprestiges-cluster

# Create task definitions for each service
aws ecs register-task-definition --cli-input-json file://task-definitions/auth-service.json

# Create services
aws ecs create-service \
  --cluster photoprestiges-cluster \
  --service-name auth-service \
  --task-definition auth-service \
  --desired-count 2 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-xxx],securityGroups=[sg-xxx],assignPublicIp=ENABLED}"
```

### 4. Setup Application Load Balancer
```bash
# Create ALB
aws elbv2 create-load-balancer \
  --name photoprestiges-alb \
  --subnets subnet-xxx subnet-yyy \
  --security-groups sg-xxx

# Create target groups for each service
aws elbv2 create-target-group \
  --name auth-service-tg \
  --protocol HTTP \
  --port 3001 \
  --vpc-id vpc-xxx \
  --health-check-path /health

# Create listener rules
```

## Google Cloud Platform Deployment

### Architecture op GCP
```
Cloud DNS
    ↓
Cloud CDN
    ↓
Cloud Load Balancer
    ↓
Cloud Run (Services)
    ↓
Cloud SQL PostgreSQL + Memorystore Redis
    ↓
Cloud Storage (Photo Storage)
```

### 1. Setup GCP Resources

#### Cloud SQL
```bash
gcloud sql instances create photoprestiges-db \
  --database-version=POSTGRES_15 \
  --tier=db-g1-small \
  --region=europe-west1 \
  --backup
```

#### Memorystore Redis
```bash
gcloud redis instances create photoprestiges-redis \
  --size=1 \
  --region=europe-west1 \
  --tier=basic
```

#### Cloud Storage
```bash
gsutil mb -l europe-west1 gs://photoprestiges-photos
gsutil iam ch allUsers:objectViewer gs://photoprestiges-photos
```

### 2. Deploy to Cloud Run
```bash
# Build and deploy each service
gcloud builds submit --tag gcr.io/PROJECT_ID/auth-service services/auth
gcloud run deploy auth-service \
  --image gcr.io/PROJECT_ID/auth-service \
  --platform managed \
  --region europe-west1 \
  --allow-unauthenticated
```

## Azure Deployment

### Architecture op Azure
```
Azure DNS
    ↓
Azure CDN
    ↓
Azure Application Gateway
    ↓
Azure Container Instances
    ↓
Azure Database for PostgreSQL + Azure Cache for Redis
    ↓
Azure Blob Storage
```

### Setup via Azure Portal of CLI
Similar to AWS/GCP but using Azure services.

## Kubernetes Deployment

### 1. Create Kubernetes Manifests
```yaml
# deployment.yaml for each service
apiVersion: apps/v1
kind: Deployment
metadata:
  name: auth-service
spec:
  replicas: 2
  selector:
    matchLabels:
      app: auth-service
  template:
    metadata:
      labels:
        app: auth-service
    spec:
      containers:
      - name: auth-service
        image: photoprestiges/auth-service:latest
        ports:
        - containerPort: 3001
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: db-credentials
              key: url
```

### 2. Deploy to Kubernetes
```bash
# Apply configurations
kubectl apply -f k8s/

# Check deployments
kubectl get deployments
kubectl get pods
kubectl get services

# Check logs
kubectl logs -f deployment/auth-service
```

## Environment Variables

### Secrets Management

#### AWS Secrets Manager
```bash
aws secretsmanager create-secret \
  --name photoprestiges/database \
  --secret-string '{"url":"postgresql://..."}'
```

#### GCP Secret Manager
```bash
echo -n "postgresql://..." | gcloud secrets create database-url --data-file=-
```

#### Kubernetes Secrets
```bash
kubectl create secret generic db-credentials \
  --from-literal=url='postgresql://...'
```

## Monitoring Setup

### AWS CloudWatch
```bash
# Enable container insights
aws ecs update-cluster-settings \
  --cluster photoprestiges-cluster \
  --settings name=containerInsights,value=enabled
```

### GCP Cloud Monitoring
```bash
# Automatically enabled for Cloud Run
# View metrics in Cloud Console
```

### Prometheus + Grafana (Kubernetes)
```bash
# Install using Helm
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm install prometheus prometheus-community/kube-prometheus-stack
```

## SSL/TLS Setup

### Let's Encrypt (Certbot)
```bash
sudo certbot --nginx -d photoprestiges.com -d www.photoprestiges.com
```

### AWS Certificate Manager
```bash
aws acm request-certificate \
  --domain-name photoprestiges.com \
  --validation-method DNS
```

### GCP Managed SSL
Automatically handled by Cloud Load Balancer.

## CI/CD Pipeline

### GitHub Actions Example
```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Build Docker Images
        run: |
          docker build -t auth-service services/auth
          
      - name: Push to Registry
        run: |
          docker push registry/auth-service:latest
          
      - name: Deploy to Cloud
        run: |
          # Deploy commands
```

## Health Checks

### Endpoint per Service
```javascript
// health.js
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'auth-service',
    timestamp: new Date().toISOString()
  });
});
```

### Load Balancer Health Checks
Configure health check endpoints in load balancer:
- Path: `/health`
- Interval: 30 seconds
- Timeout: 5 seconds
- Healthy threshold: 2
- Unhealthy threshold: 3

## Rollback Strategie

### Blue-Green Deployment
1. Deploy new version (green)
2. Test green environment
3. Switch traffic from blue to green
4. Monitor for issues
5. Rollback to blue if needed

### Rolling Update
```bash
# Kubernetes
kubectl rollout undo deployment/auth-service

# ECS
aws ecs update-service --cluster photoprestiges-cluster --service auth-service --force-new-deployment
```

## Troubleshooting

### Common Issues

#### Service Can't Connect to Database
- Check security groups/firewall rules
- Verify DATABASE_URL is correct
- Ensure database is running

#### High Latency
- Check database query performance
- Verify cache is working (Redis)
- Check network latency between services

#### Out of Memory
- Increase container memory limits
- Check for memory leaks
- Optimize queries and caching

### Debug Commands
```bash
# Check service logs
docker-compose logs -f service-name

# Check service status
curl http://localhost:3001/health

# Check database connection
psql -h localhost -U photouser -d photoprestiges -c "SELECT 1;"

# Check Redis connection
redis-cli ping
```

## Performance Tuning

### Database Optimization
- Add indexes on frequently queried columns
- Use connection pooling
- Enable query caching
- Regular VACUUM and ANALYZE

### Caching Strategy
- Cache frequently accessed data
- Set appropriate TTL values
- Use cache warming for critical data
- Monitor cache hit ratio

### Load Balancing
- Use round-robin or least-connection
- Enable sticky sessions if needed
- Configure health checks
- Set connection timeouts

## Security Hardening

### Network Security
- Use VPC/Virtual Network
- Private subnets for databases
- Security groups/firewall rules
- No direct internet access to databases

### Application Security
- Use HTTPS only
- Implement rate limiting
- Input validation
- SQL injection prevention
- XSS protection

### Secrets Management
- Never commit secrets to code
- Use cloud secret managers
- Rotate credentials regularly
- Principle of least privilege

## Backup & Restore

### Automated Backups
```bash
# AWS RDS (automated)
aws rds modify-db-instance \
  --db-instance-identifier photoprestiges-db \
  --backup-retention-period 7

# Manual backup
pg_dump -h localhost -U photouser photoprestiges > backup.sql
```

### Restore from Backup
```bash
psql -h localhost -U photouser photoprestiges < backup.sql
```

## Scaling Guidelines

### When to Scale

**Scale Up (Vertical):**
- CPU constantly > 70%
- Memory constantly > 80%
- Database connections maxed out

**Scale Out (Horizontal):**
- Request queue growing
- Response time increasing
- High traffic periods

### Auto-Scaling Configuration
```yaml
# AWS ECS Auto Scaling
resource "aws_appautoscaling_target" "ecs_target" {
  max_capacity       = 10
  min_capacity       = 2
  resource_id        = "service/photoprestiges-cluster/auth-service"
  scalable_dimension = "ecs:service:DesiredCount"
  service_namespace  = "ecs"
}
```

## Cost Monitoring

### Set Budget Alerts
- Monitor monthly spend
- Alert at 50%, 80%, 100% of budget
- Review resource utilization
- Optimize unused resources

### Cost Optimization Tips
- Use reserved instances for baseline
- Auto-scale to match demand
- Archive old data
- Use appropriate instance sizes
- Enable S3 intelligent tiering

## Conclusie

Deze deployment guide biedt verschillende opties voor het deployen van Photo Prestiges naar production. Kies de methode die het beste past bij je behoeften en expertise. Voor beginners is Docker Compose voldoende voor development en kleine deployments. Voor production wordt een managed cloud platform (AWS/GCP/Azure) aanbevolen.

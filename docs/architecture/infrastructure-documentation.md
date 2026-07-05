# SmartMove — Infrastructure Documentation

> **Version:** 1.0  
> **Last Updated:** 2026-05-31  
> **Scope:** Complete technical reference for everything inside `infrastructure/`

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Architecture Overview](#2-architecture-overview)
   - 2.1 [Server Inventory](#21-server-inventory)
   - 2.2 [Network Topology (Tailscale Mesh)](#22-network-topology-tailscale-mesh)
   - 2.3 [High-Level Architecture Diagram](#23-high-level-architecture-diagram)
3. [Folder Structure Map](#3-folder-structure-map)
4. [Terraform — Cloud Provisioning (IaC)](#4-terraform--cloud-provisioning-iac)
   - 4.1 [Main Servers](#41-main-servers)
   - 4.2 [Micro VMs](#42-micro-vms)
   - 4.3 [Shared Terraform Patterns](#43-shared-terraform-patterns)
5. [Ansible — Configuration Management](#5-ansible--configuration-management)
   - 5.1 [Configuration Files](#51-configuration-files)
   - 5.2 [Master Playbook Orchestration](#52-master-playbook-orchestration)
   - 5.3 [Roles — Detailed Breakdown](#53-roles--detailed-breakdown)
6. [Command Center — Security & Observability (SOC)](#6-command-center--security--observability-soc)
   - 6.1 [Docker Compose Stack](#61-docker-compose-stack)
   - 6.2 [Grafana — Dashboards & Datasources](#62-grafana--dashboards--datasources)
   - 6.3 [Prometheus — Metrics Pipeline](#63-prometheus--metrics-pipeline)
   - 6.4 [Mimir — Long-Term Metrics Storage](#64-mimir--long-term-metrics-storage)
   - 6.5 [Loki — Log Aggregation](#65-loki--log-aggregation)
   - 6.6 [Tempo — Distributed Tracing](#66-tempo--distributed-tracing)
   - 6.7 [Alertmanager — Alert Routing](#67-alertmanager--alert-routing)
   - 6.8 [Wazuh — SIEM & Intrusion Detection](#68-wazuh--siem--intrusion-detection)
   - 6.9 [ClamAV — Antivirus REST API](#69-clamav--antivirus-rest-api)
   - 6.10 [Cloudflare Exporter](#610-cloudflare-exporter)
   - 6.11 [Marquez — Data Lineage](#611-marquez--data-lineage)
   - 6.12 [Uptime Kuma & Status Page](#612-uptime-kuma--status-page)
7. [Database Node — Data Layer (Server 2)](#7-database-node--data-layer-server-2)
   - 7.1 [Docker Compose Stack](#71-docker-compose-stack)
   - 7.2 [PostgreSQL Configuration](#72-postgresql-configuration)
   - 7.3 [Automated Backup System](#73-automated-backup-system)
8. [K8s GitOps — Kubernetes Manifests](#8-k8s-gitops--kubernetes-manifests)
   - 8.1 [Namespaces](#81-namespaces)
   - 8.2 [Ingress & Edge Security](#82-ingress--edge-security)
   - 8.3 [SmartMove Application Plane](#83-smartmove-application-plane)
   - 8.4 [Server 4 Engine Plane](#84-server-4-engine-plane)
   - 8.5 [Admin Pipeline (Airflow)](#85-admin-pipeline-airflow)
   - 8.6 [Monitoring Agents (Alloy DaemonSet)](#86-monitoring-agents-alloy-daemonset)
   - 8.7 [ArgoCD — GitOps Engine](#87-argocd--gitops-engine)
   - 8.8 [Standalone Data Services (postgres.yaml / redis.yaml)](#88-standalone-data-services)
   - 8.9 [The 60% Spillover Strategy](#89-the-60-spillover-strategy)
9. [Deployment Workflow — End-to-End](#9-deployment-workflow--end-to-end)
10. [Data Flow Diagrams](#10-data-flow-diagrams)
11. [Security Architecture](#11-security-architecture)
12. [Environment Variables & Secrets Reference](#12-environment-variables--secrets-reference)
13. [Port Reference Map](#13-port-reference-map)

---

## 1. Executive Summary

The SmartMove infrastructure is a **multi-server, zero-trust, self-healing platform** deployed on **Oracle Cloud Infrastructure (OCI) Always Free Tier** resources. It uses a hybrid approach:

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Provisioning** | Terraform (OCI) | Creates VMs, VCNs, subnets, firewalls, object storage |
| **Configuration** | Ansible | Bootstraps OS, installs services, deploys agents |
| **Orchestration** | K3s (lightweight K8s) | Runs application workloads across servers |
| **GitOps** | ArgoCD | Auto-syncs K8s manifests from GitHub to the cluster |
| **Networking** | Tailscale (WireGuard) | Encrypted mesh VPN across all nodes |
| **Observability** | Grafana + Mimir + Loki + Tempo | Metrics, logs, and traces — the "three pillars" |
| **Security** | Wazuh + ClamAV + CrowdSec + Fail2ban | SIEM, antivirus, WAF, brute-force prevention |
| **Alerting** | Alertmanager + PagerDuty + Discord | Multi-tier fatigue-free incident notifications |

The infrastructure spans **4 ARM servers** (4 OCPU / 24 GB RAM each) and **8 AMD micro-VMs** (1 OCPU / 1 GB RAM each), all interconnected via Tailscale's private `100.x.x.x` mesh network.

---

## 2. Architecture Overview

### 2.1 Server Inventory

| Server | Hostname | Shape | CPU / RAM | Role |
|--------|----------|-------|-----------|------|
| **Server 1** | `server1_app` | ARM A1.Flex | 4 OCPU / 24 GB | K3s Control Plane, App traffic (Django + Next.js) |
| **Server 2** | `server2_support` | ARM A1.Flex | 4 OCPU / 24 GB | Database Node (PostgreSQL + Redis + PgBouncer) + K3s Overflow Worker |
| **Server 3** | `server3_security` | ARM A1.Flex | 4 OCPU / 24 GB | Command Center — SOC (Grafana, Mimir, Loki, Tempo, Wazuh, Prometheus, ClamAV) |
| **Server 4** | `server4_engine` | ARM A1.Flex | 4 OCPU / 24 GB | Analytics Pro Engine (heavy data processing + MinIO storage), K3s Worker |
| **VM 1** | `vm1_bastion` | AMD E2.1.Micro | 1 OCPU / 1 GB | SSH jump host / bastion entry point |
| **VM 2** | `vm2_log_forwarder` | AMD E2.1.Micro | 1 OCPU / 1 GB | Fluentd log relay to Loki |
| **VM 3** | `vm3_watchdog` | AMD E2.1.Micro | 1 OCPU / 1 GB | External network health watchdog |
| **VM 4** | `vm4_tempo_cache` | AMD E2.1.Micro | 1 OCPU / 1 GB | Redis cache for Tempo (traces) |
| **VM 5** | `vm5_mimir_cache` | AMD E2.1.Micro | 1 OCPU / 1 GB | Redis cache for Mimir (metrics) |
| **VM 6** | `vm6_loki_cache` | AMD E2.1.Micro | 1 OCPU / 1 GB | Redis cache for Loki (logs) |
| **VM 7** | `vm7_image_optimizer` | AMD E2.1.Micro | 1 OCPU / 1 GB | Image optimization / compression service |
| **VM 8** | `vm8_hot_spare` | AMD E2.1.Micro | 1 OCPU / 1 GB | Cold standby for disaster recovery |

### 2.2 Network Topology (Tailscale Mesh)

All inter-server communication flows through Tailscale's encrypted WireGuard tunnel. SSH is **only** accessible via the `100.x.x.x` private mesh — **not** over the public internet. Public-facing ports are limited to `80`, `443`, and `41641` (Tailscale WireGuard UDP).

```
┌─────────────────── Tailscale Mesh (100.x.x.x) ───────────────────┐
│                                                                    │
│  Server 1 ←──→ Server 2 ←──→ Server 3 ←──→ Server 4              │
│  (App)         (DB)          (SOC)          (Engine)               │
│    ↕              ↕              ↕              ↕                  │
│  VM1-VM8 ←──→ All nodes talk to each other over encrypted VPN    │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

### 2.3 High-Level Architecture Diagram

```
                    ┌──────────────────────┐
                    │   Cloudflare WAF      │ ← DDoS protection, DNS
                    │   (smartmove.me)      │
                    └─────────┬────────────┘
                              │ HTTPS (443)
                    ┌─────────▼────────────┐
                    │   Server 1 (App)      │
                    │   K3s Control Plane   │
                    │   ┌──────────────┐   │
                    │   │ Nginx Ingress │   │ ← CrowdSec Bouncer
                    │   └──────┬───────┘   │
                    │     ┌────┴────┐      │
                    │     ▼         ▼      │
                    │  Django    Next.js    │
                    │  Backend   Frontend   │
                    │  Celery    Workers    │
                    │  Airflow              │
                    └────────┬─────────────┘
                             │ Tailscale VPN
              ┌──────────────┼──────────────────┐
              ▼              ▼                   ▼
   ┌──────────────┐  ┌──────────────┐  ┌───────────────┐
   │  Server 2     │  │  Server 3     │  │  Server 4      │
   │  (Support)    │  │  (SOC)        │  │  (Engine)      │
   │               │  │               │  │                │
   │  PostgreSQL   │  │  Grafana      │  │  Analytics     │
   │  PgBouncer    │  │  Mimir        │  │  Engine        │
   │  Redis        │  │  Loki         │  │  MinIO (150GB) │
   │  Exporters    │  │  Tempo        │  │                │
   │  K3s Worker   │  │  Wazuh SIEM   │  │  K3s Worker    │
   │  (overflow)   │  │  Prometheus   │  │  (dedicated)   │
   │               │  │  ClamAV       │  │                │
   │               │  │  Alertmanager │  │                │
   └──────┬────────┘  │  Marquez      │  └────────────────┘
          │           │  Uptime Kuma  │
          │           │  Status Page  │
          │           └──────┬────────┘
          │                  │
          │    ┌─────────────┼───────────────────────┐
          │    ▼             ▼            ▼           ▼
          │  VM4           VM5          VM6         VM2
          │  Tempo         Mimir        Loki        Log
          │  Cache         Cache        Cache       Forwarder
          │  (Redis)       (Redis)      (Redis)     (Fluentd)
          │
          └──→ OCI Object Storage (nightly backups)
```

---

## 3. Folder Structure Map

```
infrastructure/
├── .gitkeep
├── ansible/                          # Configuration management
│   ├── ansible.cfg                   # Ansible global settings
│   ├── inventory.ini                 # Server/VM inventory with Tailscale IPs
│   ├── site.yml                      # Master orchestration playbook
│   ├── .vault_pass                   # Ansible Vault password (gitignored)
│   ├── secrets.yml.enc              # Encrypted secrets
│   ├── ssh_keys/
│   │   └── id_rsa_oracle            # OCI SSH private key
│   ├── playbooks/
│   │   ├── 01-bootstrap-network.yml  # Phase 1: OS + VPN + Firewall
│   │   ├── 02-deploy-utilities.yml   # Phase 2: Docker on utility nodes
│   │   ├── 03-deploy-caches.yml      # Phase 3: Redis on cache VMs
│   │   ├── 04-deploy-command.yml     # Phase 4: Wazuh + Alloy agents
│   │   └── 05-deploy-k3s.yml        # Phase 5: K3s master + workers
│   └── roles/
│       ├── common/                   # Base OS hardening (all nodes)
│       ├── stay_alive/              # Oracle keep-alive cron job
│       ├── tailscale_check/         # VPN health verification
│       ├── utility_node/            # Docker + Fluentd setup
│       ├── cache_node/              # Redis cache deployment
│       ├── k3s_master/              # K3s control plane install
│       ├── k3s_worker/              # K3s worker join logic
│       ├── wazuh_agent/             # SIEM agent deployment
│       └── alloy_monitor/           # Grafana Alloy telemetry agent
│
├── command-center/                   # Server 3 — SOC stack
│   ├── .env / .env.example           # Environment variables
│   ├── docker-compose.yml            # 14-service Docker Compose
│   ├── alertmanager/
│   │   └── alertmanager.yml          # Multi-tier alert routing
│   ├── clamav/
│   │   ├── clamd.conf                # ClamAV daemon config
│   │   ├── freshclam.conf            # Virus signature auto-updater
│   │   └── clamav-rest.yml           # REST API service definition
│   ├── cloudflare-exporter/
│   │   └── config.yml                # WAF/DDoS metrics scraper
│   ├── grafana/
│   │   └── provisioning/
│   │       ├── datasources/
│   │       │   └── datasources.yaml  # Auto-provision Mimir, Loki, Tempo
│   │       └── dashboards/
│   │           └── dashboards.yaml   # Dashboard folder config
│   ├── loki/
│   │   └── loki.yaml                 # Log aggregation config
│   ├── mimir/
│   │   └── mimir.yaml                # Metrics storage config
│   ├── prometheus/
│   │   ├── prometheus.yml            # Master scrape + remote-write config
│   │   ├── scrape_configs.yml        # All server scrape targets
│   │   └── alert_rules.yml           # 15+ alerting rules
│   ├── status-page/
│   │   └── index.html                # Public status dashboard
│   ├── tempo/
│   │   └── tempo.yaml                # Distributed tracing config
│   ├── uptime-kuma/
│   │   └── .gitkeep                  # Data persisted at runtime
│   └── wazuh/
│       ├── ossec.conf                # Wazuh Manager config
│       └── local_rules.xml           # Custom SmartMove detection rules
│
├── database-node/                    # Server 2 — data layer
│   ├── .env / .env.example           # Database credentials
│   ├── docker-compose.yml            # PostgreSQL + PgBouncer + Redis + Exporters
│   ├── postgresql.conf               # Enterprise-tuned Postgres config
│   └── backup.sh                     # Automated OCI backup script
│
├── k8s-gitops/                       # Kubernetes declarative manifests
│   ├── .gitkeep
│   ├── postgres.yaml                 # StatefulSet + PVC + Service
│   ├── redis.yaml                    # Deployment + Service
│   ├── 00-namespaces/
│   │   └── namespaces.yaml           # 4 namespace definitions
│   ├── 01-ingress-nginx/
│   │   ├── ingress-controller.yaml   # Nginx Helm chart
│   │   └── crowdsec-bouncer.yaml     # WAF bouncer deployment
│   ├── 02-smartmove-app/
│   │   ├── backend-django.yaml       # Django API (2 replicas + HPA)
│   │   ├── frontend-nextjs.yaml      # Next.js SSR (2 replicas + HPA)
│   │   ├── celery-workers.yaml       # Background task workers
│   │   ├── configmap.yaml            # Shared config (domains, DB host)
│   │   ├── secrets.yaml              # Base64-encoded credentials
│   │   ├── hpa-overflow.yaml         # 3× HPA at 60% CPU threshold
│   │   └── routing-ingress.yaml      # smartmove.me + api.smartmove.me
│   ├── 03-server4-engine/
│   │   ├── analytics-engine.yaml     # Data processing pods (pinned to Server 4)
│   │   ├── minio-storage.yaml        # 150GB object storage StatefulSet
│   │   └── routing-ingress.yaml      # engine.smartmove.me
│   ├── 04-admin-pipeline/
│   │   ├── airflow-webserver.yaml    # Airflow UI + secrets
│   │   ├── airflow-scheduler.yaml    # DAG scheduler
│   │   └── routing-ingress.yaml      # airflow.smartmove.me
│   ├── 05-monitoring-agents/
│   │   └── alloy-agent.yaml          # DaemonSet + RBAC + ConfigMap
│   └── 06-argocd/
│       ├── argocd-install.yaml       # ArgoCD Helm chart
│       ├── repo-credentials.yaml     # GitHub PAT secret
│       └── smartmove-root-app.yaml   # "App of Apps" root application
│
└── terraform/                        # OCI compute provisioning
    ├── .gitkeep
    ├── main-servers/
    │   ├── server1-app/              # 4 OCPU ARM — Control Plane
    │   ├── server2-support/          # 4 OCPU ARM — Database + Overflow
    │   ├── server3-security/         # 4 OCPU ARM — SOC Command Center
    │   └── server4-engine/           # 4 OCPU ARM — Analytics Engine
    └── micro-vms/
        ├── vm1-bastion/              # 1 OCPU AMD — SSH jump host
        ├── vm2-log-forwarder/        # 1 OCPU AMD — Fluentd relay
        ├── vm3-watchdog/             # 1 OCPU AMD — External health checks
        ├── vm4-tempo-cache/          # 1 OCPU AMD — Tempo Redis cache
        ├── vm5-mimir-cache/          # 1 OCPU AMD — Mimir Redis cache
        ├── vm6-loki-cache/           # 1 OCPU AMD — Loki Redis cache
        ├── vm7-image-optimizer/      # 1 OCPU AMD — Image compression
        └── vm8-hot-spare/            # 1 OCPU AMD — Cold standby
```

---

## 4. Terraform — Cloud Provisioning (IaC)

**Location:** `infrastructure/terraform/`

Terraform provisions the raw cloud infrastructure on **Oracle Cloud Infrastructure (OCI)**. Each server and micro-VM has its own isolated Terraform root module with independent state.

### 4.1 Main Servers

All four main servers follow an identical provisioning pattern. Each directory contains:

| File | Purpose |
|------|---------|
| `main.tf` | VCN, Internet Gateway, Route Table, Security List, Subnet, Compute Instance, Cloud-Init |
| `variables.tf` | Input variable declarations (OCI credentials, SSH keys, Tailscale auth key) |
| `secrets.tfvars` | **Sensitive** — actual credential values (gitignored in production) |

#### Server 1 — App (`server1-app/main.tf`)

**Purpose:** The K3s control plane and primary application server.

**Resources provisioned (7 total):**

1. **`oci_core_vcn`** — Virtual Cloud Network (`10.0.0.0/16` CIDR block)
2. **`oci_core_internet_gateway`** — Enables outbound/inbound internet traffic
3. **`oci_core_route_table`** — Routes all traffic (`0.0.0.0/0`) through the IGW
4. **`oci_core_security_list`** — Zero-Trust firewall:
   - **Egress:** All outbound traffic allowed
   - **Ingress Port 80:** HTTP traffic (Cloudflare proxy)
   - **Ingress Port 443:** HTTPS traffic (Cloudflare proxy)
   - **Ingress Port 41641/UDP:** Tailscale WireGuard tunnel
   - **Port 22 is intentionally absent** — SSH is only accessible via Tailscale
5. **`oci_core_subnet`** — Public subnet (`10.0.1.0/24`)
6. **`oci_core_instance`** — The ARM compute instance:
   - **Shape:** `VM.Standard.A1.Flex`
   - **CPU:** 4 OCPUs (ARM Ampere A1)
   - **Memory:** 24 GB
   - **Boot Volume:** 200 GB
   - **Image:** Ubuntu 22.04 ARM
   - **Cloud-Init script:** Automatically installs Tailscale and joins the mesh VPN on first boot
7. **Output:** `server1_public_ip` — The public IP for Cloudflare DNS configuration

**Cloud-Init Script Logic:**
```bash
#!/bin/bash
curl -fsSL https://tailscale.com/install.sh | sh
tailscale up --authkey=${var.tailscale_auth_key} --ssh
```
This ensures every server is automatically joined to the Tailscale mesh with SSH-over-Tailscale enabled on first boot.

#### Server 2 — Support (`server2-support/`)

Identical compute provisioning to Server 1, plus an additional file:

**`storage.tf`** — Provisions OCI Object Storage for database backups:
- **`oci_objectstorage_bucket`** — A private, versioned S3-compatible bucket named `smartmove-db-backups`
- **Access:** `NoPublicAccess` — strictly private
- **Versioning:** `Enabled` — protects against accidental overwrites
- **Output:** `s3_endpoint_url` — The S3-compatible endpoint URL for the backup script's `.env` file

#### Server 3 — Security (`server3-security/`)

Identical compute provisioning to Server 1. Hosts the Command Center SOC stack (Docker Compose).

#### Server 4 — Engine (`server4-engine/`)

Identical compute provisioning to Server 1. Hosts the Analytics Pro Engine workloads (K3s worker with `node-role: engine` label).

#### Variables (`variables.tf` — shared pattern)

All main servers declare the same 8 variables:

| Variable | Type | Purpose |
|----------|------|---------|
| `tenancy_ocid` | `string` | OCI tenancy identifier |
| `user_ocid` | `string` | OCI user identifier |
| `fingerprint` | `string` | API key fingerprint |
| `private_key_path` | `string` | Path to OCI API private key |
| `region` | `string` | OCI region (e.g., `eu-frankfurt-1`) |
| `compartment_ocid` | `string` | OCI compartment for resource isolation |
| `ssh_public_key` | `string` | SSH public key for instance access |
| `tailscale_auth_key` | `string` | Tailscale pre-auth key for auto-join |

### 4.2 Micro VMs

The 8 micro-VMs use a lighter Terraform pattern with **separated provider configuration**:

| File | Purpose |
|------|---------|
| `main.tf` | Compute instance only (no VCN — they share an existing subnet) |
| `providers.tf` | OCI provider declaration with version constraint `~> 5.0` |
| `variables.tf` | Same as main servers plus `subnet_ocid` (references Server 1's subnet) |
| `secrets.tfvars` | Sensitive values |

**Key differences from main servers:**
- **Shape:** `VM.Standard.E2.1.Micro` (AMD, 1 OCPU, 1 GB RAM)
- **No VCN/subnet/security list** — they reference an existing subnet via `var.subnet_ocid`
- **No Cloud-Init** — Tailscale is installed via Ansible after provisioning
- **No boot volume size specified** — uses OCI default (typically 47 GB)

#### VM 8 — Hot Spare (special case)

The `vm8-hot-spare/main.tf` contains a **duplicated resource block** (likely a copy-paste artifact). The VM is provisioned as a cold standby with no specific workload — it's available for manual failover if any other micro-VM fails.

### 4.3 Shared Terraform Patterns

**Deployment command (per server/VM):**
```bash
cd infrastructure/terraform/main-servers/server1-app/
terraform init
terraform plan -var-file="secrets.tfvars"
terraform apply -var-file="secrets.tfvars"
```

**State management:** Each directory has independent local state (`.terraform/` + `.terraform.lock.hcl`). There is no remote backend configured.

---

## 5. Ansible — Configuration Management

**Location:** `infrastructure/ansible/`

Ansible automates the post-provisioning configuration of all servers and VMs. It transforms raw Ubuntu VMs into fully configured, secured, and monitored infrastructure nodes.

### 5.1 Configuration Files

#### `ansible.cfg`

| Setting | Value | Purpose |
|---------|-------|---------|
| `inventory` | `inventory.ini` | Points to the server inventory |
| `host_key_checking` | `False` | Skips SSH host key verification (all connections are over Tailscale VPN) |
| `vault_password_file` | `.vault_pass` | Ansible Vault decryption key |
| `interpreter_python` | `auto_silent` | Auto-detects Python interpreter without warnings |
| `timeout` | `30` | SSH connection timeout in seconds |
| `forks` | `20` | Maximum parallel SSH connections (all 12 nodes simultaneously) |
| `callbacks_enabled` | `timer, profile_tasks` | Shows execution timing for performance analysis |
| `pipelining` | `True` | Reduces SSH round-trips for faster execution |
| `ssh_args` | ControlMaster + ControlPersist + ServerAliveInterval | Maintains persistent SSH connections |

#### `inventory.ini`

Defines **8 host groups** mapping to the server roles:

| Group | Members | Purpose |
|-------|---------|---------|
| `[control_plane]` | `server1_app` | K3s master node |
| `[k3s_workers]` | `server2_support` | K3s overflow worker (60% spillover) |
| `[database_nodes]` | `server2_support` | PostgreSQL/Redis host |
| `[command_center]` | `server3_security` | SOC stack host |
| `[engine_nodes]` | `server4_engine` | Analytics engine K3s worker |
| `[bastion_nodes]` | `vm1_bastion` | SSH jump host |
| `[utility_nodes]` | `vm2, vm3, vm7` | Docker utility workers |
| `[cache_nodes]` | `vm4, vm5, vm6` | Redis cache fleet |
| `[spare_nodes]` | `vm8_hot_spare` | Disaster recovery standby |

**Global variables (`[all:vars]`):**
- `ansible_user=ubuntu` — Default OCI Ubuntu user
- `ansible_ssh_private_key_file=./ssh_keys/id_rsa_oracle` — SSH private key
- `ansible_become=yes` — All tasks run with sudo
- `ansible_become_method=sudo` — Privilege escalation method

> **Note:** Server 2 appears in both `[k3s_workers]` and `[database_nodes]` — it serves a dual role.

### 5.2 Master Playbook Orchestration

#### `site.yml` — The Master Playbook

The master playbook defines a strict **5-phase deployment order**:

```
Phase 1: Bootstrap Network    →  ALL NODES     →  common + stay_alive
Phase 2: Deploy Utilities     →  UTILITY/BASTION →  utility_node
Phase 3: Deploy Caches        →  CACHE NODES    →  cache_node
Phase 4: Deploy Command Center →  ALL NODES     →  wazuh_agent + alloy_monitor
Phase 5: Deploy K3s           →  CONTROL + WORKERS → k3s_master + k3s_worker
```

**Execution command:**
```bash
cd infrastructure/ansible/
ansible-playbook site.yml
```

#### Playbook Details

**`01-bootstrap-network.yml`** — Phase 1
- **Hosts:** `all` (every server and VM)
- **Roles:** `common`, `stay_alive`
- **Logic:** Harden the OS, install security tools, set up Tailscale VPN, deploy keep-alive scripts

**`02-deploy-utilities.yml`** — Phase 2
- **Hosts:** `utility_nodes`, `bastion_nodes` (VMs 1, 2, 3, 7)
- **Roles:** `utility_node`
- **Logic:** Install Docker CE and deploy Fluentd log forwarding configuration

**`03-deploy-caches.yml`** — Phase 3
- **Hosts:** `cache_nodes` (VMs 4, 5, 6)
- **Roles:** `cache_node`
- **Logic:** Install Docker, deploy Redis containers with 700MB RAM cap

**`04-deploy-command.yml`** — Phase 4
- **Hosts:** `all`
- **Roles:** `wazuh_agent`, `alloy_monitor`
- **Logic:** Install Wazuh SIEM agent and Grafana Alloy telemetry agent on every node

**`05-deploy-k3s.yml`** — Phase 5 (3 sub-phases)
- **Phase 5A:** `control_plane` (Server 1) → `k3s_master` — Install K3s master, extract node token
- **Phase 5B:** `engine_nodes` (Server 4) → `k3s_worker` — Join as dedicated engine worker
- **Phase 5C:** `k3s_workers` (Server 2) → `k3s_worker` with label `tier=overflow` — Join as overflow worker

### 5.3 Roles — Detailed Breakdown

#### Role: `common`

**Files:**
- `tasks/main.yml` — 6 tasks
- `handlers/main.yml` — 1 handler
- `templates/jail.local.j2` — Fail2ban template

**Task Flow:**

| # | Task | Module | Logic |
|---|------|--------|-------|
| 1 | Update and upgrade packages | `apt` | Full `dist` upgrade, 1-hour cache validity |
| 2 | Set timezone to UTC | `timezone` | Standardizes all server clocks |
| 3 | Install baseline packages | `apt` | `curl`, `ufw`, `fail2ban`, `apt-transport-https`, `ca-certificates`, `software-properties-common` |
| 4 | Deploy Fail2ban config | `template` | Renders `jail.local.j2` → `/etc/fail2ban/jail.local`, triggers handler |
| 5 | Install Tailscale VPN | `shell` | Runs Tailscale install script (idempotent via `creates`) |
| 6 | Allow Tailscale in UFW | `ufw` | Permits all inbound traffic on the `tailscale0` interface |

**Fail2ban Template (`jail.local.j2`):**
- **Ban time:** 86,400 seconds (24 hours)
- **Find time:** 600 seconds (10 minutes)
- **Max retries:** 3 attempts before ban
- **Ban action:** UFW firewall rule insertion
- **SSH jail:** Enabled, monitors `/var/log/auth.log`

**Handler:** Restarts and enables `fail2ban` service when config changes

---

#### Role: `stay_alive`

**Purpose:** Prevents Oracle Cloud from reclaiming idle Always Free instances. Oracle may reclaim VMs with sustained low utilization; this role generates artificial CPU load during idle periods.

**Task Flow:**

| # | Task | Logic |
|---|------|-------|
| 1 | Install `stress-ng` | Prerequisite for CPU load generation |
| 2 | Deploy ARM script | For 4-OCPU servers: if CPU < 25%, run `stress-ng --cpu 4 --cpu-load 25` for 15 minutes |
| 3 | Deploy AMD script | For 1-OCPU micro-VMs: if CPU < 25%, run `stress-ng --cpu 1 --cpu-load 15` for 10 minutes |
| 4 | Schedule cron job | Runs hourly at minute 0, logs to `/var/log/smart-alive.log` |

**Context-aware logic:** The script reads `/proc/stat` to measure real CPU usage. If the server is already busy with real traffic (CPU ≥ 25%), it skips the artificial load entirely. This prevents crashing during actual usage spikes.

---

#### Role: `tailscale_check`

**Purpose:** Diagnostic role to verify Tailscale VPN connectivity.

**Tasks:**
1. Run `tailscale status` and capture output
2. Print the first line of status to the Ansible terminal

This role is not referenced in any playbook — it's used for manual ad-hoc verification:
```bash
ansible all -m include_role -a name=tailscale_check
```

---

#### Role: `utility_node`

**Purpose:** Installs Docker CE and configures Fluentd log forwarding on utility/bastion nodes.

**Task Flow (7 tasks):**

| # | Task | Logic |
|---|------|-------|
| 1 | Install Docker dependencies | `ca-certificates`, `curl`, `gnupg`, `lsb-release` |
| 2 | Add Docker GPG key | Official Docker signing key |
| 3 | Add Docker repository | Ubuntu Focal stable repo |
| 4 | Install Docker CE | `docker-ce`, `docker-ce-cli`, `containerd.io`, `docker-compose-plugin` |
| 5 | Start Docker service | Enabled on boot |
| 6 | Add user to docker group | Allows `ubuntu` user to run Docker without sudo |
| 7 | Deploy Fluentd config | Creates `/opt/fluentd/fluentd.conf` |

**Fluentd Configuration (`fluentd.conf`):**

```
Source → Forward protocol on port 24224
Filter → Record transformer (adds hostname and tag)
Match  → Push to Loki at http://100.100.100.13:3100
         Labels: container_name, namespace, host
         Buffer: memory, 5s flush, 2MB chunks, 30s retry
```

The Fluentd agent receives container logs from Docker's forward driver and ships them over Tailscale to Server 3's Loki instance for centralized log aggregation.

---

#### Role: `cache_node`

**Purpose:** Deploys lightweight Redis cache containers on micro-VMs 4, 5, and 6 to offload query caching from Server 3.

**Task Flow:**

| # | Task | Logic |
|---|------|-------|
| 1 | Install Docker CE | Docker engine (explicit declaration for node isolation) |
| 2 | Create Redis config directory | `/opt/redis/` |
| 3 | Deploy Redis config template | Renders `redis.conf.j2` → `/opt/redis/redis.conf` |
| 4 | Start Redis container | `redis:7-alpine`, host networking, auto-restart |

**Redis Configuration (`redis.conf.j2`):**

| Setting | Value | Rationale |
|---------|-------|-----------|
| `bind` | `0.0.0.0` | Listen on all interfaces (Tailscale handles auth) |
| `port` | `6379` | Standard Redis port |
| `daemonize` | `no` | Docker manages backgrounding |
| `maxmemory` | `700mb` | Hard cap for 1GB VM (leaves 300MB for OS) |
| `maxmemory-policy` | `allkeys-lru` | Evicts oldest entries when full |
| `save ""` | (disabled) | No disk persistence — pure RAM cache |
| `appendonly` | `no` | No AOF — cache data is ephemeral |

**Cache assignment:**
- **VM 4** (`100.100.100.24`) → Tempo trace query cache
- **VM 5** (`100.100.100.25`) → Mimir metric query cache
- **VM 6** (`100.100.100.26`) → Loki log query cache

---

#### Role: `k3s_master`

**Purpose:** Installs the K3s control plane on Server 1 and extracts the join token for workers.

**Task Flow:**

| # | Task | Logic |
|---|------|-------|
| 1 | Install K3s master | `curl -sfL https://get.k3s.io \| sh -s - server --disable traefik --node-ip {{ ansible_host }} --flannel-iface tailscale0` |
| 2 | Fetch node token | Reads `/var/lib/rancher/k3s/server/node-token` |
| 3 | Store token as fact | Makes `k3s_node_token` available to subsequent playbook phases |

**Key flags:**
- `--disable traefik` — Replaced by Nginx Ingress (deployed via K8s manifests)
- `--node-ip {{ ansible_host }}` — Advertises the Tailscale IP as the node address
- `--flannel-iface tailscale0` — Routes all pod-to-pod traffic through the Tailscale tunnel

---

#### Role: `k3s_worker`

**Purpose:** Joins a server to the K3s cluster as a worker node.

**Task Flow (1 task):**

```yaml
shell: curl -sfL https://get.k3s.io | sh -
environment:
  K3S_URL: "https://100.100.100.11:6443"           # Server 1 API endpoint
  K3S_TOKEN: "{{ hostvars['server1_app']['k3s_node_token'] }}"  # Token from master
  INSTALL_K3S_EXEC: "agent --node-ip {{ ansible_host }} --flannel-iface tailscale0"
```

**Overflow node labeling:** When called from playbook `05-deploy-k3s.yml` Phase 5C (Server 2), an extra variable `k3s_worker_node_labels: ["tier=overflow"]` is passed, enabling the HPA spillover strategy.

---

#### Role: `wazuh_agent`

**Purpose:** Installs and configures the Wazuh SIEM agent on every node, pointing it to Server 3's Wazuh Manager.

**Task Flow:**

| # | Task | Logic |
|---|------|-------|
| 1 | Install dependencies | `curl`, `apt-transport-https`, `lsb-release`, `gnupg2` |
| 2 | Add Wazuh GPG key | Official Wazuh signing key |
| 3 | Add Wazuh repository | Wazuh 4.x apt repo |
| 4 | Install Wazuh Agent | `wazuh-agent` package |
| 5 | Configure Manager IP | Replaces the `<address>` in `/var/ossec/etc/ossec.conf` with `100.100.100.13` (Server 3) |
| 6 | Start agent | Restarts and enables `wazuh-agent` systemd service |

---

#### Role: `alloy_monitor`

**Purpose:** Installs Grafana Alloy telemetry agent on every node to ship metrics to Server 3's Prometheus/Mimir.

**Task Flow:**

| # | Task | Logic |
|---|------|-------|
| 1 | Add Grafana GPG key | Official Grafana signing key |
| 2 | Add Grafana repository | Grafana stable apt repo |
| 3 | Install Alloy | `alloy` package |
| 4 | Configure Alloy | Writes inline config to `/etc/alloy/config.alloy` |
| 5 | Start Alloy | Enables and starts `alloy` systemd service |

**Alloy Configuration Logic:**
```
prometheus.exporter.unix "default" { }     → Collects node metrics (CPU, RAM, disk, network)
prometheus.scrape "default"                → Scrapes the local exporter
prometheus.remote_write "default"          → Pushes to http://100.100.100.13:9090/api/v1/write
```

---

## 6. Command Center — Security & Observability (SOC)

**Location:** `infrastructure/command-center/`  
**Target:** Server 3 (`server3_security`)  
**Network:** Docker bridge network `smartmove-soc`

### 6.1 Docker Compose Stack

The `docker-compose.yml` defines **14 services** with **8 named volumes** on a single bridge network:

| Service | Image | Port(s) | Purpose |
|---------|-------|---------|---------|
| `grafana` | `grafana/grafana-oss:11.1.0` | `3100→3000` | Unified dashboards & alerting UI |
| `mimir` | `grafana/mimir:2.13.0` | `9009` | Long-term metrics storage |
| `loki` | `grafana/loki:3.1.0` | `3101→3100` | Log aggregation engine |
| `tempo` | `grafana/tempo:2.5.0` | `3200`, `4317`, `4318` | Distributed tracing backend |
| `prometheus` | `prom/prometheus:latest` | `9090` | Metrics scraper & rule evaluator |
| `cloudflare-exporter` | `lablabs/cloudflare-exporter:latest` | `8080` | Cloudflare WAF/DDoS metrics |
| `clamav-rest` | `lokori/clamav-rest:latest` | `9000` | Antivirus REST API |
| `wazuh.manager` | `wazuh/wazuh-manager:4.7.2` | `1514`, `1515`, `514/udp`, `55000` | SIEM manager |
| `alertmanager` | `prom/alertmanager:v0.27.0` | `9093` | Alert routing & notification |
| `marquez-db` | `postgres:16-alpine` | (internal) | Marquez metadata database |
| `marquez-api` | `marquezproject/marquez:latest` | `5000`, `5001` | Data lineage API |
| `marquez-web` | `marquezproject/marquez-web:latest` | `3002→3000` | Data lineage UI |
| `uptime-kuma` | `louislam/uptime-kuma:1` | `3001` | Internal uptime monitoring |
| `status-page` | `nginx:alpine` | `8081→80` | Public status dashboard |

**Shared environment anchor (`x-common-env`):** S3-compatible storage credentials (endpoint, access key, secret key, bucket, region) — shared across Mimir, Loki, and Tempo via YAML anchors.

**Named volumes:**
`grafana_data`, `mimir_data`, `loki_data`, `tempo_data`, `alertmanager_data`, `marquez_db_data`, `prometheus_data`, `wazuh_manager_data`

### 6.2 Grafana — Dashboards & Datasources

**Datasource auto-provisioning (`datasources.yaml`):**

| Datasource | Type | URL | Features |
|------------|------|-----|----------|
| **Mimir** | `prometheus` | `http://mimir:9009/prometheus` | Default, POST queries, Mimir-type |
| **Loki** | `loki` | `http://loki:3100` | Trace ID extraction via regex → links to Tempo |
| **Tempo** | `tempo` | `http://tempo:3200` | Traces-to-logs (Loki), traces-to-metrics (Mimir), service graph, node graph |
| **Alertmanager** | `alertmanager` | `http://alertmanager:9093` | Prometheus implementation |

**Cross-linking logic:** Loki logs containing `"trace_id":"(\w+)"` automatically link to Tempo traces. Tempo traces link back to Loki logs and Mimir metrics, creating a fully correlated observability experience.

**Dashboard provisioning (`dashboards.yaml`):**
- Provider name: `SmartMove Infrastructure Dashboards`
- Folder: `Observability`
- Auto-refresh: every 10 seconds
- Path: `/etc/grafana/provisioning/dashboards`

### 6.3 Prometheus — Metrics Pipeline

#### `prometheus.yml` — Master Configuration

| Section | Configuration |
|---------|--------------|
| **Scrape interval** | 15s globally, individual overrides per job |
| **Evaluation interval** | 15s (alert rule evaluation) |
| **External labels** | `environment: production`, `cluster: smartmove-soc`, `region: frankfurt` |
| **Alertmanager** | HTTP scheme, API v2, target `alertmanager:9093` |
| **Rule files** | `/etc/prometheus/alert_rules.yml` |
| **Remote write** | Pushes all metrics to Mimir at `http://mimir:9009/api/v1/push` |

**Remote write queue tuning:**
- Capacity: 10,000 samples
- Max shards: 50 parallel writers
- Max samples per send: 2,000
- Batch deadline: 5 seconds

#### `scrape_configs.yml` — Scrape Targets

| Job Name | Target | Port | Interval | Description |
|----------|--------|------|----------|-------------|
| `django_backend` | `100.100.100.11:8000` | 8000 | 30s | Django `/metrics` endpoint |
| `redis` | `100.100.100.12:9121` | 9121 | 30s | Redis Exporter on Server 2 |
| `postgres` | `100.100.100.12:9187` | 9187 | 30s | Postgres Exporter on Server 2 |
| `analytics_pro_engine` | `100.100.100.14:8001` | 8001 | 30s | Analytics engine metrics |
| `minio_storage` | `100.100.100.14:9000` | 9000 | 30s | MinIO cluster metrics |
| `cloudflare_waf` | `cloudflare_exporter:8080` | 8080 | 30s | Cloudflare WAF events |
| `mimir` | `mimir:9009` | 9009 | 60s | Self-monitoring |
| `alertmanager` | `alertmanager:9093` | 9093 | 60s | Self-monitoring |

#### `alert_rules.yml` — 15 Alerting Rules

Organized into **6 groups**:

**Group 1: Infrastructure & Security (`smartmove_infra_security`)**

| Alert | Expression | For | Severity | Description |
|-------|-----------|-----|----------|-------------|
| `HostCompletelyDown` | `up{job!="django"} == 0` | 3m | `fatal` | Server unreachable |
| `DiskFillingUpFast` | `predict_linear(free_bytes[1h], 4h) < 0` | 10m | `fatal` | Disk full in < 4 hours |
| `MalwareDetected` | `increase(clamav_malware_detected_total[5m]) > 0` | 1m | `critical` | ClamAV intercepted malware |

**Group 2: Backend Health (`smartmove_backend`)**

| Alert | Expression | For | Severity |
|-------|-----------|-----|----------|
| `DjangoBackendDown` | `up{job="django"} == 0` | 2m | `fatal` |
| `HighRequestLatency` | P95 latency > 2s | 5m | `warning` |
| `HighErrorRate` | 5xx rate > 5% | 3m | `critical` |

**Group 3: Celery Workers (`smartmove_celery`)**

| Alert | Expression | For | Severity |
|-------|-----------|-----|----------|
| `CeleryWorkerDown` | `celery_workers_active == 0` | 3m | `critical` |
| `CeleryQueueBacklog` | Queue > 500 tasks | 5m | `warning` |

**Group 4: Redis (`smartmove_redis`)**

| Alert | Expression | For | Severity |
|-------|-----------|-----|----------|
| `RedisDown` | `redis_up == 0` | 1m | `fatal` |
| `RedisHighMemory` | Usage > 85% | 5m | `warning` |

**Group 5: PostgreSQL (`smartmove_postgres`)**

| Alert | Expression | For | Severity |
|-------|-----------|-----|----------|
| `PostgresDown` | `pg_up == 0` | 1m | `fatal` |
| `PostgresHighConnections` | Connections > 80% of max | 5m | `warning` |

**Group 6: FinOps (`smartmove_finops`)**

| Alert | Expression | For | Severity |
|-------|-----------|-----|----------|
| `OpenAITokenBudgetExceeded` | > 100k tokens in 1 hour | 0m | `warning` |

### 6.4 Mimir — Long-Term Metrics Storage

**Configuration (`mimir.yaml`):**
- **Mode:** Monolithic (all components in single process)
- **Multi-tenancy:** Disabled
- **HTTP port:** 9009
- **Storage:** Local filesystem (`/data/blocks`, `/data/tsdb`, `/data/bucket-sync`)
- **Replication factor:** 1 (single-node deployment)
- **KV store:** Memberlist (in-process consensus)

### 6.5 Loki — Log Aggregation

**Configuration (`loki.yaml`):**

| Setting | Value |
|---------|-------|
| HTTP port | 3100 |
| Storage backend | Filesystem (`/loki/chunks`, `/loki/rules`) |
| Schema | v13 TSDB, 24h index periods |
| Retention | 31 days (744h) |
| Ingestion rate | 10 MB/s (burst: 20 MB/s) |
| Max query series | 5,000 |
| Query cache | **Redis at VM 6 (`100.100.100.26:6379`)** |
| Compaction | Every 10 minutes, retention delete delay 2h |

### 6.6 Tempo — Distributed Tracing

**Configuration (`tempo.yaml`):**

| Setting | Value |
|---------|-------|
| HTTP port | 3200 |
| OTLP gRPC receiver | `0.0.0.0:4317` |
| OTLP HTTP receiver | `0.0.0.0:4318` |
| Max block duration | 5 minutes |
| Trace retention | 14 days (336h) |
| Storage | Local filesystem (`/var/tempo/traces`, `/var/tempo/wal`) |
| Trace cache | **Redis at VM 4 (`100.100.100.24:6379`)** |
| Metrics generator | Enabled — pushes span metrics + service graphs to Mimir |

### 6.7 Alertmanager — Alert Routing

**Configuration (`alertmanager.yml`):**

**Global settings:**
- Resolve timeout: 5 minutes
- SMTP via Gmail (587)

**Inhibition rules:** If a `fatal` or `critical` alert fires, suppress related `warning` and `info` alerts for the same `alertname` + `service`.

**Routing tree:**

```
Default Route → discord-warnings (group by alertname/service/severity)
├── severity=fatal  → wake-up-developer (10s wait, 1h repeat)
├── severity=critical → critical-no-page (10s wait, 1h repeat)
└── severity=warning → discord-warnings (1m wait, 6h repeat)
```

**Receivers:**

| Receiver | Channels | When Used |
|----------|----------|-----------|
| `wake-up-developer` | Webhook → Django backend, Discord, PagerDuty, Email | Fatal outages — server crashes |
| `critical-no-page` | Webhook → Django backend, Discord, Email | Critical issues — malware, app errors (no PagerDuty) |
| `discord-warnings` | Discord only | Warnings — high CPU, minor issues |

**Self-healing webhook:** Fatal and critical alerts post to `http://100.100.100.11:8000/api/monitoring/webhook/alertmanager/` — the Django backend's self-healing endpoint that can trigger automated runbooks.

### 6.8 Wazuh — SIEM & Intrusion Detection

#### Wazuh Manager (`ossec.conf`)

| Setting | Value |
|---------|-------|
| JSON output | Enabled |
| Alerts log | Enabled |
| Log all | Disabled (alerts only) |
| Remote connections | Secure TCP on port 1514, allowed IPs `100.64.0.0/10` (Tailscale CGNAT range) |
| Syslog receiver | UDP port 514, same IP range |
| Integration | `custom-alertmanager` — forwards level 7+ alerts as JSON to Alertmanager API |

#### Custom Detection Rules (`local_rules.xml`)

Six SmartMove-specific rules (IDs 100001–100006):

| Rule ID | Level | Trigger | Description |
|---------|-------|---------|-------------|
| **100001** | 10 | 5+ failed logins in 120s from same IP | Brute-force login detection |
| **100002** | 8 | 10+ HTTP 429 responses in 60s | API rate-limit abuse |
| **100003** | 12 | 403 on `/admin/` or `/api/users/.*role` | Privilege escalation attempt |
| **100004** | 10 | "Token is blacklisted" in logs | Blacklisted JWT token reuse |
| **100005** | 7 | FIM change in `/app/apps/` or `/app/config/` | Critical backend file modification |
| **100006** | 5 | 200 on `/api/monitoring/webhook/alertmanager/` | Self-healing runbook triggered (audit trail) |

### 6.9 ClamAV — Antivirus REST API

**Purpose:** Scans user-uploaded CSV files (from the Analytics Pro Engine on Server 4) for malware before they are persisted to MinIO.

#### `clamd.conf` — Daemon Configuration

| Setting | Value | Rationale |
|---------|-------|-----------|
| `TCPSocket` | 3310 | ClamAV daemon port |
| `ReadTimeout` | 300s | Extended for large 1GB dataset scans |
| `MaxThreads` | 4 | Limits CPU usage on Server 3 |
| `MaxFileSize` | 1500 MB | Handles SmartMove's 1GB uploads |
| `MaxScanSize` | 2000 MB | Total scan size per request |
| `StreamMaxLength` | 1500 MB | Maximum streaming upload size |
| `MaxDirectoryRecursion` | 15 | Deep archive extraction |
| `MaxFiles` | 50,000 | Files per archive scan |
| `HeuristicScanPrecedence` | Yes | Prioritizes heuristic detection |
| `AlertBrokenExecutables` | Yes | Flags malformed binaries |
| `AlertEncrypted` | Yes | Flags encrypted files |
| `PhishingSignatures` | Yes | Detects phishing patterns |

#### `freshclam.conf` — Signature Updates

- **Update frequency:** 24 checks/day (hourly)
- **Mirror:** `database.clamav.net`
- **Signature verification:** Enabled
- **Auto-reload:** Notifies `clamd` to load new signatures without restart

**REST API resource limits:**
- CPU: 0.5–2.0 cores
- Memory: 512 MB – 2048 MB

### 6.10 Cloudflare Exporter

**Configuration (`config.yml`):**
- Listen address: `:8080`
- Metrics path: `/metrics`
- Zone ID configured for `smartmove.me`
- Scrapes WAF events and bandwidth analytics
- API credentials injected via `.env` (`CF_API_EMAIL`, `CF_API_KEY`)

### 6.11 Marquez — Data Lineage

Three-container stack for tracking data pipeline lineage:
1. **`marquez-db`** — Dedicated PostgreSQL 16 Alpine with health checks
2. **`marquez-api`** — OpenLineage-compatible API (ports 5000/5001)
3. **`marquez-web`** — Visualization UI (port 3002)

### 6.12 Uptime Kuma & Status Page

**Uptime Kuma** — Self-hosted monitoring tool (port 3001) that pings all services and tracks uptime history. Data persists to `./uptime-kuma/` volume.

**Status Page** (`status-page/index.html`) — A public-facing HTML dashboard served by Nginx Alpine on port 8081. Key features:
- Displays operational status for all servers and VMs
- Fetches live data from Uptime Kuma's `/api/status-page/smartmove` endpoint
- Polls every 30 seconds
- Dynamically updates status badges (Operational/Degraded)
- Changes master banner between "All Systems Operational" and "System Disturbance Detected"
- Styled with Tailwind CSS and Inter font for premium enterprise appearance
- Three sections: Core Architecture, Data & Caching Fleet, Security Operations Center

---

## 7. Database Node — Data Layer (Server 2)

**Location:** `infrastructure/database-node/`  
**Target:** Server 2 (`server2_support`)

### 7.1 Docker Compose Stack

**5 services** on the `smartmove-db-net` bridge network:

| Service | Image | Port | Purpose |
|---------|-------|------|---------|
| `postgres` | `postgres:16` | 5432 (internal only) | Core relational database |
| `pgbouncer` | `edoburu/pgbouncer:latest` | 6432 (public) | Connection pooler — all apps connect here |
| `redis` | `redis:7-alpine` | 6379 | Application cache + Celery message broker |
| `postgres-exporter` | `prometheuscommunity/postgres-exporter` | 9187 | Ships PostgreSQL metrics to Prometheus |
| `redis-exporter` | `oliver006/redis_exporter` | 9121 | Ships Redis metrics to Prometheus |
| `backup-cron` | `minio/mc:latest` | — | Nightly automated backup to OCI Object Storage |

**Key design decisions:**
- PostgreSQL port 5432 is **NOT** mapped to the host — only PgBouncer (6432) is publicly accessible
- All application connections go through PgBouncer in **transaction pooling mode**
- PgBouncer handles up to 5,000 client connections, maintaining a pool of 100 backend connections
- Redis is password-protected, capped at 4 GB RAM with LRU eviction

### 7.2 PostgreSQL Configuration

**`postgresql.conf`** — Enterprise-tuned for 4 OCPU / 24 GB RAM:

| Category | Setting | Value | Rationale |
|----------|---------|-------|-----------|
| **Connections** | `max_connections` | 300 | Behind PgBouncer (5000 → 300) |
| | `superuser_reserved_connections` | 5 | Emergency admin access |
| **Memory** | `shared_buffers` | 6 GB | 25% of total RAM |
| | `work_mem` | 64 MB | Per-operation sort/join memory |
| | `maintenance_work_mem` | 1 GB | VACUUM and index creation |
| | `effective_cache_size` | 18 GB | Planner hint for OS cache |
| | `huge_pages` | `try` | Use if available |
| **WAL** | `wal_level` | `replica` | Enables replication readiness |
| | `max_wal_size` | 4 GB | Maximum WAL before checkpoint |
| | `checkpoint_completion_target` | 0.9 | Spread I/O over 90% of interval |
| | `wal_buffers` | 16 MB | WAL write buffer |
| **I/O Tuning** | `random_page_cost` | 1.1 | Optimized for NVMe SSDs |
| | `effective_io_concurrency` | 200 | Concurrent I/O for SSDs |
| **Logging** | `log_min_duration_statement` | 1000 ms | Log slow queries (> 1s) |
| | `log_checkpoints` | on | Log checkpoint activity |
| | `log_lock_waits` | on | Log lock contention |

### 7.3 Automated Backup System

**`backup.sh`** — Bash script for automated PostgreSQL backups to OCI Object Storage.

**Execution flow:**

```
1. Generate timestamped filename: smartmove_prod_YYYYMMDD_HHMMSS.sql.gz
2. pg_dump → gzip → /backups/
3. mc alias set → mc cp → OCI Object Storage bucket
4. Cleanup: delete local backups older than 3 days
```

**Scheduling:** The `backup-cron` container runs the script at **2:00 AM daily** via crontab. The container bootstraps by installing `postgresql` client tools, writing the cron schedule, and running `crond` in foreground.

**Environment variables:**

| Variable | Example |
|----------|---------|
| `POSTGRES_DB` | `smartmove_prod` |
| `POSTGRES_USER` | `smartmove_admin` |
| `POSTGRES_PASSWORD` | (from `.env`) |
| `S3_ENDPOINT` | `https://<namespace>.compat.objectstorage.eu-frankfurt-1.oraclecloud.com` |
| `S3_ACCESS_KEY` | OCI access key |
| `S3_SECRET_KEY` | OCI secret key |
| `S3_BUCKET` | `smartmove-db-backups` |

---

## 8. K8s GitOps — Kubernetes Manifests

**Location:** `infrastructure/k8s-gitops/`  
**Target:** K3s cluster spanning Server 1 (master), Server 4 (engine worker), Server 2 (overflow worker)

### 8.1 Namespaces

**File:** `00-namespaces/namespaces.yaml`

| Namespace | Tier | Target Servers | Purpose |
|-----------|------|----------------|---------|
| `smartmove-prod` | `application` | Server 1 + Server 2 (overflow) | Django, Next.js, Celery, Airflow |
| `smartmove-engine` | `analytics` | Server 4 (exclusively) | Analytics Pro Engine + MinIO |
| `smartmove-admin` | `data-pipeline` | Server 1 + Server 2 (overflow) | Airflow scheduler + webserver |
| `ingress-nginx` | `networking` | Server 1 | Nginx Ingress Controller + CrowdSec |

### 8.2 Ingress & Edge Security

#### Nginx Ingress Controller (`ingress-controller.yaml`)

Deployed via K3s `HelmChart` CRD:
- **Chart:** `ingress-nginx` from `https://kubernetes.github.io/ingress-nginx`
- **Target namespace:** `ingress-nginx`
- **External traffic policy:** `Local` — preserves source IP for CrowdSec
- **Metrics:** Enabled for Prometheus scraping
- **Pod security:** `runAsNonRoot: true`
- **Resources:** 100m–500m CPU, 90Mi–256Mi memory

#### CrowdSec Bouncer (`crowdsec-bouncer.yaml`)

Four Kubernetes resources:

1. **Secret** — CrowdSec LAPI bouncer API key + URL (points to `http://100.100.100.13:8080`)
2. **ConfigMap** — Bouncer configuration:
   - Cache expiration: 30s
   - Update frequency: 10s
   - Bouncing on type: `ban`
   - Fallback remediation: `ban`
3. **Deployment** — 2 replicas for HA, 50m–200m CPU, 64Mi–128Mi memory
4. **Service** — ClusterIP on port 8080

### 8.3 SmartMove Application Plane

**Namespace:** `smartmove-prod`

#### ConfigMap (`configmap.yaml`)

| Key | Value | Purpose |
|-----|-------|---------|
| `DJANGO_SETTINGS_MODULE` | `config.settings.production` | Production Django settings |
| `ALLOWED_HOSTS` | `localhost, smartmove.me, *.smartmove.me, 100.100.100.11, 100.100.100.12` | Django host validation |
| `CORS_ALLOWED_ORIGINS` | `https://smartmove.me, https://www.smartmove.me` | CORS policy |
| `DB_HOST` | `100.100.100.12` | Server 2 via Tailscale |
| `DB_PORT` | `6432` | PgBouncer (not raw Postgres) |
| `DB_NAME` | `smartmove_prod` | Database name |
| `REDIS_HOST` | `100.100.100.12` | Server 2 Redis |
| `REDIS_PORT` | `6379` | Redis port |
| `NEXT_PUBLIC_API_URL` | `https://api.smartmove.me` | Frontend API base URL |

#### Secrets (`secrets.yaml`)

Base64-encoded Opaque secret with keys: `SECRET_KEY`, `DB_USER`, `DB_PASSWORD`, `REDIS_PASSWORD`.

#### Backend Django (`backend-django.yaml`)

**Deployment:**
- Image: `smartmoveacr.azurecr.io/smartmove-backend:latest`
- Replicas: 2 (managed by HPA)
- Port: 8000
- Resources: 250m–1 CPU, 512Mi–1Gi memory
- Readiness probe: `GET /admin/login/:8000` (15s delay, 10s period)
- Liveness probe: `GET /admin/login/:8000` (30s delay, 15s period)
- **Node affinity:** `preferredDuringSchedulingIgnoredDuringExecution` — weight 100 preference for non-overflow nodes
- Service: `backend-service` ClusterIP on port 8000

#### Frontend Next.js (`frontend-nextjs.yaml`)

**Deployment:**
- Image: `smartmoveacr.azurecr.io/smartmove-frontend:latest`
- Replicas: 2 (managed by HPA)
- Port: 3000
- Resources: 100m–500m CPU, 128Mi–512Mi memory
- Readiness/liveness probes: `GET /:3000`
- Same spillover affinity as backend
- Service: `frontend-service` ClusterIP on port 3000

#### Celery Workers (`celery-workers.yaml`)

**Deployment:**
- Same backend image, different command: `celery -A config worker --loglevel=info`
- Replicas: 2 (managed by HPA)
- Resources: 150m–500m CPU, 256Mi–512Mi memory
- Same spillover affinity as backend
- No service (workers pull from Redis queue — no inbound traffic)

#### HPA — 60% Spillover Engine (`hpa-overflow.yaml`)

Three `HorizontalPodAutoscaler` resources:

| HPA Target | Min Replicas | Max Replicas | CPU Threshold |
|------------|-------------|-------------|---------------|
| `backend` | 2 | 6 | 60% average utilization |
| `frontend` | 2 | 6 | 60% average utilization |
| `celery-worker` | 2 | 6 | 60% average utilization |

#### Routing Ingress (`routing-ingress.yaml`)

Two host-based routing rules:

| Host | Path | Backend Service | Port |
|------|------|----------------|------|
| `smartmove.me` | `/` (Prefix) | `frontend-service` | 3000 |
| `api.smartmove.me` | `/` (Prefix) | `backend-service` | 8000 |

**Annotations:**
- Rate limiting: 50 RPS
- Proxy timeouts: 3600s (read/send), 60s (connect)
- HTTP version: 1.1
- Regex routing: enabled
- TLS: commented out (prepared for cert-manager + Let's Encrypt)

### 8.4 Server 4 Engine Plane

**Namespace:** `smartmove-engine`

#### Analytics Engine (`analytics-engine.yaml`)

**Deployment:**
- Image: Same backend image
- Replicas: 2
- **`nodeSelector: node-role: "engine"`** — Strictly pinned to Server 4
- Resources: 1–2 CPU, 2Gi–4Gi memory (heavy processing)
- Environment:
  - `DB_HOST` → Server 2 (`100.100.100.12:6432`)
  - `CLAMAV_REST_URL` → Server 3 (`http://100.100.100.13:9000/scan`)
  - `MINIO_ENDPOINT` → Local `minio-service:9000`
- Service: `analytics-engine-service` ClusterIP on port 8000

**Data processing flow:**
```
User uploads CSV → Analytics Engine → ClamAV scan (Server 3)
                                     → If clean: save to MinIO (Server 4)
                                     → If infected: quarantine + alert
```

#### MinIO Object Storage (`minio-storage.yaml`)

**StatefulSet:**
- Image: `minio/minio:latest`
- Replicas: 1
- Pinned to Server 4 (`nodeSelector: node-role: "engine"`)
- Ports: 9000 (API), 9001 (Console)
- Resources: 500m–2 CPU, 1Gi–4Gi memory
- **PVC template:** 150 GB `ReadWriteOnce` persistent volume
- Service: `minio-service` ClusterIP on ports 9000/9001

#### Engine Ingress (`routing-ingress.yaml`)

| Host | Path | Backend | Port | Special |
|------|------|---------|------|---------|
| `engine.smartmove.me` | `/` | `analytics-engine-service` | 8000 | `proxy-body-size: 100m`, rate limit 20 RPS |

### 8.5 Admin Pipeline (Airflow)

**Namespace:** `smartmove-admin`

#### Airflow Secrets (`airflow-webserver.yaml` — embedded)

Connection string: `postgresql+psycopg2://smartmove_admin:<password>@100.100.100.12:6432/airflow`  
(Points to a dedicated `airflow` database on Server 2, through PgBouncer)

#### Airflow Webserver

- Image: `apache/airflow:2.9.1-python3.10`
- Command: `airflow webserver`
- Port: 8080
- Executor: `LocalExecutor`
- Resources: 250m–500m CPU, 1Gi–2Gi memory
- Spillover affinity: same 60% logic
- Service: `airflow-webserver-service` ClusterIP on port 8080

#### Airflow Scheduler

- Same image and executor
- Command: `airflow scheduler`
- Resources: 500m–1 CPU, 1Gi–2Gi memory
- Spillover affinity: same 60% logic
- No service (scheduler is a background process)

#### Admin Ingress

| Host | Backend | Port |
|------|---------|------|
| `airflow.smartmove.me` | `airflow-webserver-service` | 8080 |

### 8.6 Monitoring Agents (Alloy DaemonSet)

**File:** `05-monitoring-agents/alloy-agent.yaml`

**Resources defined (6):**

1. **Namespace:** `monitoring`
2. **ServiceAccount:** `alloy-agent`
3. **ClusterRole:** `alloy-agent-role` — read access to nodes, services, endpoints, pods
4. **ClusterRoleBinding:** `alloy-agent-binding`
5. **ConfigMap:** `alloy-config` — Alloy routing configuration
6. **DaemonSet:** `alloy-agent` — runs one pod on every K8s node

**Alloy Configuration Logic:**
```
prometheus.remote_write "mimir"  → http://100.100.100.13:9009/api/v1/push
loki.write "loki"               → http://100.100.100.13:3100/loki/api/v1/push
discovery.kubernetes "pods"      → Auto-discovers all pods
loki.source.kubernetes "pod_logs" → Scrapes pod logs → forwards to Loki
prometheus.scrape "k8s_metrics"   → Scrapes pod metrics → forwards to Mimir
```

**DaemonSet configuration:**
- `hostNetwork: true` — shares host network stack for node-level metrics
- `tolerations: [Exists]` — runs on all nodes including tainted engine/overflow nodes
- Volume mounts: `/var/log`, `/var/lib/docker/containers` (read-only)
- Resources: 100m–250m CPU, 256Mi–512Mi memory

### 8.7 ArgoCD — GitOps Engine

**Purpose:** Watches the GitHub repository and automatically syncs all K8s manifests to the cluster.

#### ArgoCD Installation (`argocd-install.yaml`)

Deployed via K3s `HelmChart` CRD:
- **Chart:** `argo-cd` from `https://argoproj.github.io/argo-helm`
- **Target namespace:** `argocd`
- **Service type:** ClusterIP (accessed via Tailscale port-forward, not public internet)
- **TLS:** Disabled internally (Tailscale handles encryption)
- **Namespace restriction:** Prevents users from creating resources outside defined namespaces

#### Repository Credentials (`repo-credentials.yaml`)

Opaque secret providing:
- **URL:** `https://github.com/SmartMove-Organization/SmartMove.git`
- **Username:** `AhmedSherif3`
- **Password:** GitHub Personal Access Token (PAT)

#### Root Application (`smartmove-root-app.yaml`)

The "App of Apps" pattern — a single ArgoCD `Application` resource that watches the entire `infrastructure/k8s-gitops` directory:

| Setting | Value |
|---------|-------|
| Source repo | `https://github.com/SmartMove-Organization/SmartMove.git` |
| Target revision | `main` |
| Path | `infrastructure/k8s-gitops` |
| Directory recurse | `true` (processes all subdirectories 00–06) |
| Destination | `https://kubernetes.default.svc` |
| Auto-prune | `true` — deleting a file in GitHub deletes the K8s resource |
| Self-heal | `true` — if a resource drifts, ArgoCD restores it |
| Create namespace | `true` |

### 8.8 Standalone Data Services

Two standalone manifests at the root of `k8s-gitops/`:

#### `postgres.yaml` — K8s PostgreSQL

- **PVC:** 10Gi `ReadWriteOnce`
- **StatefulSet:** `postgres:16-alpine`, 1 replica
- Credentials from `smartmove-config` ConfigMap and `smartmove-secrets` Secret
- Resources: 250m–1 CPU, 256Mi–1Gi memory
- Readiness/liveness probes: `pg_isready`
- Service: `postgres-service` ClusterIP on 5432

> **Note:** This appears to be an earlier K8s-native PostgreSQL definition. The production deployment uses the external Docker Compose stack on Server 2.

#### `redis.yaml` — K8s Redis

- **Deployment:** `redis:7-alpine`, 1 replica
- AOF persistence enabled, 256MB memory limit, LRU eviction
- Resources: 100m–500m CPU, 128Mi–512Mi memory
- Readiness/liveness probes: `redis-cli ping`
- Service: `redis-service` ClusterIP on 6379

### 8.9 The 60% Spillover Strategy

The most distinctive architectural pattern in SmartMove's infrastructure is the **60% CPU spillover** mechanism. Here's how it works end-to-end:

```
                        Normal Load                     High Load (>60% CPU)
                    ┌─────────────────┐             ┌─────────────────┐
                    │   Server 1       │             │   Server 1       │
                    │   (2 pods each)  │             │   (full)         │
                    │   Backend: ██░░  │    HPA      │   Backend: ████  │
                    │   Frontend: ██░░ │  ──────►    │   Frontend: ████ │
                    │   Celery: ██░░   │  scales up  │   Celery: ████   │
                    └─────────────────┘             └────────┬────────┘
                                                             │
                                                    Overflow pods
                                                    scheduled on:
                                                             │
                                                    ┌────────▼────────┐
                                                    │   Server 2       │
                                                    │   (tier=overflow)│
                                                    │   Backend: ██░░  │
                                                    │   Frontend: ██░░ │
                                                    │   Celery: ██░░   │
                                                    └─────────────────┘
```

**Components involved:**

1. **K3s worker label** (`tier=overflow`) — Applied to Server 2 via Ansible playbook 05, Phase 5C
2. **Node affinity** — All deployments use `preferredDuringSchedulingIgnoredDuringExecution` with weight 100, preferring nodes where `tier` is NOT `overflow`
3. **HPA** — Scales deployments from 2→6 replicas when average CPU exceeds 60%
4. **Kubernetes scheduler** — When Server 1 is at capacity, new pods land on Server 2 (the only other available node)

**Result:** Server 2 serves dual duty — it's always running the database stack (Docker Compose), and it absorbs application overflow traffic when Server 1 is under heavy load.

---

## 9. Deployment Workflow — End-to-End

The complete deployment of SmartMove infrastructure follows this sequence:

### Stage 1: Provision Cloud Resources (Terraform)

```bash
# For each server and VM (12 total):
cd infrastructure/terraform/main-servers/server1-app/
terraform init
terraform plan -var-file="secrets.tfvars"
terraform apply -var-file="secrets.tfvars" -auto-approve

# Repeat for server2-support, server3-security, server4-engine
# Repeat for vm1-bastion through vm8-hot-spare
```

**Output:** 12 running Ubuntu 22.04 VMs with public IPs. Main servers auto-join Tailscale via cloud-init.

### Stage 2: Configure All Nodes (Ansible)

```bash
cd infrastructure/ansible/
ansible-playbook site.yml
```

**Phase execution:**

```
Phase 1 (all nodes) ──► OS updates, Fail2ban, Tailscale, UFW, keep-alive cron
Phase 2 (VMs 1,2,3,7) ──► Docker CE, Fluentd
Phase 3 (VMs 4,5,6) ──► Docker CE, Redis cache containers
Phase 4 (all nodes) ──► Wazuh agent, Grafana Alloy agent
Phase 5A (Server 1) ──► K3s master (extracts join token)
Phase 5B (Server 4) ──► K3s worker (engine node)
Phase 5C (Server 2) ──► K3s worker (overflow node, tier=overflow label)
```

### Stage 3: Deploy Command Center (Docker Compose)

```bash
ssh ubuntu@100.100.100.13   # Server 3 via Tailscale
cd /opt/command-center/      # (manual copy of infrastructure/command-center/)
cp .env.example .env         # Fill in real values
docker compose up -d
```

### Stage 4: Deploy Database Node (Docker Compose)

```bash
ssh ubuntu@100.100.100.12   # Server 2 via Tailscale
cd /opt/database-node/       # (manual copy of infrastructure/database-node/)
cp .env.example .env         # Fill in real values
docker compose up -d
```

### Stage 5: Deploy Application (ArgoCD Auto-Sync)

```bash
# On Server 1 (K3s master):
kubectl apply -f infrastructure/k8s-gitops/06-argocd/argocd-install.yaml
kubectl apply -f infrastructure/k8s-gitops/06-argocd/repo-credentials.yaml
kubectl apply -f infrastructure/k8s-gitops/06-argocd/smartmove-root-app.yaml
```

**From this point forward, ArgoCD watches the `main` branch of the GitHub repository and automatically deploys all changes to folders `00-namespaces/` through `05-monitoring-agents/`.** Any push to `main` that modifies K8s manifests triggers automatic reconciliation.

---

## 10. Data Flow Diagrams

### Observability Data Flow

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  Server 1     │     │  Server 4     │     │  VMs 1-8      │
│  Alloy Agent  │     │  Alloy Agent  │     │  Alloy Agent  │
└──────┬───────┘     └──────┬───────┘     └──────┬───────┘
       │                     │                     │
       │    Metrics (Prometheus remote_write)       │
       └─────────────────────┼─────────────────────┘
                             │
                    ┌────────▼────────┐
                    │   Server 3       │
                    │   ┌──────────┐  │
                    │   │Prometheus │──┤──► Mimir (long-term storage)
                    │   └──────────┘  │      ├── VM5 Redis (cache)
                    │   ┌──────────┐  │
                    │   │  Loki    │──┤──► Log queries
                    │   └──────────┘  │      ├── VM6 Redis (cache)
                    │   ┌──────────┐  │
                    │   │  Tempo   │──┤──► Trace queries
                    │   └──────────┘  │      ├── VM4 Redis (cache)
                    │   ┌──────────┐  │
                    │   │ Grafana  │──┤──► Visualizes ALL three
                    │   └──────────┘  │
                    └─────────────────┘
```

### Security Event Flow

```
All Nodes (Wazuh Agent) ──► Server 3 (Wazuh Manager)
                                  │
                      ┌───────────┼──────────────┐
                      ▼           ▼              ▼
                 Local Rules   Alertmanager   Audit Log
                 (100001-06)       │
                              ┌───┴───────────────┐
                              ▼        ▼          ▼
                           Discord  PagerDuty   Email
                              ▼
                    Django Backend Webhook
                    (self-healing runbooks)
```

### User Upload Data Flow

```
User ──► Cloudflare WAF ──► Nginx Ingress (Server 1)
                                │
                    ┌───────────▼──────────────┐
                    │ engine.smartmove.me        │
                    │ Analytics Engine (Server 4) │
                    │     │                       │
                    │     ▼                       │
                    │  ClamAV Scan (Server 3)     │
                    │     │                       │
                    │  ┌──┴──┐                    │
                    │  Clean  Infected            │
                    │  │      │                   │
                    │  ▼      ▼                   │
                    │ MinIO   Quarantine          │
                    │ (150GB) + Alert             │
                    └─────────────────────────────┘
```

---

## 11. Security Architecture

SmartMove implements **defense in depth** with 7 security layers:

| Layer | Technology | Location | Protection |
|-------|-----------|----------|------------|
| **1. Edge** | Cloudflare WAF | Cloud | DDoS mitigation, bot filtering, SSL termination |
| **2. Network** | Tailscale (WireGuard) | All nodes | Encrypted mesh VPN, zero-trust SSH access |
| **3. Firewall** | OCI Security Lists + UFW | Per server | Port-level ingress control (80, 443, 41641 only) |
| **4. Brute-force** | Fail2ban | All nodes | 24h ban after 3 failed SSH attempts |
| **5. WAF** | CrowdSec Bouncer | K3s Ingress | Threat intelligence-based IP blocking |
| **6. SIEM** | Wazuh Manager + Agents | All nodes → Server 3 | Intrusion detection, FIM, log analysis |
| **7. Antivirus** | ClamAV REST | Server 3 | File upload scanning before persistence |

**Zero-trust SSH access:** SSH port (22) is NOT exposed in any OCI Security List. All SSH access goes through Tailscale's `100.x.x.x` mesh, ensuring that only authenticated Tailscale users can reach any server.

---

## 12. Environment Variables & Secrets Reference

### Command Center (`.env.example`)

| Variable | Purpose | Example |
|----------|---------|---------|
| `S3_ENDPOINT` | Object storage endpoint | `http://minio:9000` |
| `S3_ACCESS_KEY` | Object storage access key | — |
| `S3_SECRET_KEY` | Object storage secret key | — |
| `S3_BUCKET_NAME` | Observability data bucket | `smartmove-observability` |
| `S3_REGION` | Storage region | `us-east-1` |
| `GF_ADMIN_USER` | Grafana admin username | `admin` |
| `GF_ADMIN_PASSWORD` | Grafana admin password | — |
| `GF_ROOT_URL` | Grafana external URL | `http://localhost:3100` |
| `CF_API_EMAIL` | Cloudflare account email | — |
| `CF_API_KEY` | Cloudflare global API key | — |
| `MARQUEZ_DB_PASSWORD` | Marquez database password | — |
| `WAZUH_INDEXER_PASSWORD` | Wazuh indexer password | — |
| `WAZUH_ADMIN_PASSWORD` | Wazuh dashboard password | — |
| `DISCORD_WEBHOOK_URL` | Discord notification webhook | — |
| `TEMPO_CACHE_IP` | VM4 Tailscale IP | `100.x.x.24` |
| `MIMIR_CACHE_IP` | VM5 Tailscale IP | `100.x.x.25` |
| `LOKI_CACHE_IP` | VM6 Tailscale IP | `100.x.x.26` |

### Database Node (`.env.example`)

| Variable | Purpose | Example |
|----------|---------|---------|
| `POSTGRES_DB` | Database name | `smartmove_prod` |
| `POSTGRES_USER` | Database user | `smartmove_admin` |
| `POSTGRES_PASSWORD` | Database password | — |
| `PGBOUNCER_ADMIN_USER` | PgBouncer admin user | `pgbouncer_admin` |
| `PGBOUNCER_ADMIN_PASSWORD` | PgBouncer admin password | — |
| `REDIS_PASSWORD` | Redis authentication password | — |
| `S3_ENDPOINT` | OCI Object Storage S3 endpoint | — |
| `S3_ACCESS_KEY` | OCI access key | — |
| `S3_SECRET_KEY` | OCI secret key | — |
| `S3_BUCKET` | Backup bucket name | `smartmove-db-backups` |

---

## 13. Port Reference Map

### Server 1 — App (Control Plane)

| Port | Protocol | Service | Access |
|------|----------|---------|--------|
| 80 | TCP | Nginx Ingress (HTTP) | Public (Cloudflare) |
| 443 | TCP | Nginx Ingress (HTTPS) | Public (Cloudflare) |
| 6443 | TCP | K3s API Server | Tailscale only |
| 8000 | TCP | Django Backend | Cluster-internal |
| 3000 | TCP | Next.js Frontend | Cluster-internal |
| 41641 | UDP | Tailscale WireGuard | Public |

### Server 2 — Support (Database)

| Port | Protocol | Service | Access |
|------|----------|---------|--------|
| 6432 | TCP | PgBouncer | Tailscale only |
| 6379 | TCP | Redis | Tailscale only |
| 9121 | TCP | Redis Exporter | Tailscale only (Prometheus scrape) |
| 9187 | TCP | Postgres Exporter | Tailscale only (Prometheus scrape) |
| 41641 | UDP | Tailscale WireGuard | Public |

### Server 3 — Security (SOC)

| Port | Protocol | Service | Access |
|------|----------|---------|--------|
| 3100 | TCP | Grafana UI | Tailscale only |
| 3101 | TCP | Loki API | Tailscale only |
| 3200 | TCP | Tempo HTTP API | Tailscale only |
| 4317 | TCP | OTLP gRPC (Tempo) | Tailscale only |
| 4318 | TCP | OTLP HTTP (Tempo) | Tailscale only |
| 9009 | TCP | Mimir API | Tailscale only |
| 9090 | TCP | Prometheus | Tailscale only |
| 9093 | TCP | Alertmanager | Tailscale only |
| 9000 | TCP | ClamAV REST API | Tailscale only |
| 8080 | TCP | Cloudflare Exporter / CrowdSec LAPI | Tailscale only |
| 1514 | TCP | Wazuh Agent Connection | Tailscale only |
| 1515 | TCP | Wazuh Agent Enrollment | Tailscale only |
| 514 | UDP | Syslog | Tailscale only |
| 55000 | TCP | Wazuh API | Tailscale only |
| 5000 | TCP | Marquez API | Tailscale only |
| 5001 | TCP | Marquez Admin | Tailscale only |
| 3001 | TCP | Uptime Kuma | Tailscale only |
| 3002 | TCP | Marquez Web UI | Tailscale only |
| 8081 | TCP | Status Page (Nginx) | Tailscale / Public |
| 41641 | UDP | Tailscale WireGuard | Public |

### Server 4 — Engine

| Port | Protocol | Service | Access |
|------|----------|---------|--------|
| 8000 | TCP | Analytics Engine | Cluster-internal |
| 8001 | TCP | Analytics Metrics | Tailscale only (Prometheus scrape) |
| 9000 | TCP | MinIO API | Cluster-internal |
| 9001 | TCP | MinIO Console | Cluster-internal |
| 41641 | UDP | Tailscale WireGuard | Public |

### Micro-VMs (4, 5, 6)

| Port | Protocol | Service | Access |
|------|----------|---------|--------|
| 6379 | TCP | Redis Cache | Tailscale only |
| 41641 | UDP | Tailscale WireGuard | Public |

---

> **End of Documentation**  
> This document covers every file, folder, configuration, code block, deployment flow, and architectural decision within the `infrastructure/` directory of the SmartMove project.

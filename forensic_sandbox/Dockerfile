FROM python:3.11-slim

# Install Volatility3 dependencies only — minimal surface
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

RUN pip install --no-cache-dir volatility3==2.7.0 pefile yara-python

# Create non-root user
RUN useradd -r -s /sbin/nologin forensic

# Make symbols directory writable by the forensic user (UID 65534 for nobody/docker-compose)
RUN chown -R 65534:65534 /usr/local/lib/python3.11/site-packages/volatility3/symbols \
    && chmod -R 777 /usr/local/lib/python3.11/site-packages/volatility3/symbols

USER forensic
WORKDIR /tmp
